import { rowToRemoteArtist, rowToRemoteTrack, TRACK_COLUMNS } from './map';
import type { EnsureMap, LibraryRepo } from './types';

/**
 * LibraryRepo di atas Supabase, memakai sesi pengguna (klien peramban) sehingga RLS berlaku: pengguna hanya menyentuh barisnya
 * sendiri. Penyalinan metadata lagu ke tabel tracks lewat server (/api/library/ensure; hanya server yang boleh menulisnya).
 * Klien dimuat dinamis. Suka dan ikuti memakai upsert agar idempoten (mengulang tidak melanggar kunci unik).
 */
async function loadClient() {
  const { createClient } = await import('@/lib/supabase/client');
  return createClient();
}

async function run<T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export function createSupabaseRepo(userId: string): LibraryRepo {
  return {
    async load() {
      const sb = await loadClient();
      const [likes, history, follows, searches] = await Promise.all([
        run(sb.from('likes').select(`created_at, tracks(${TRACK_COLUMNS})`).order('created_at', { ascending: false })),
        run(sb.from('history').select(`played_at, tracks(${TRACK_COLUMNS})`).order('played_at', { ascending: false }).limit(8)),
        run(sb.from('follows').select('artist_id, artists(name, source)').order('created_at', { ascending: false })),
        run(sb.from('search_history').select('query').order('created_at', { ascending: false }).limit(6)),
      ]);
      return {
        likes: ((likes ?? []) as { tracks?: unknown }[]).flatMap((r) => rowToRemoteTrack(r.tracks) ?? []),
        history: ((history ?? []) as { tracks?: unknown }[]).flatMap((r) => rowToRemoteTrack(r.tracks) ?? []),
        follows: ((follows ?? []) as unknown[]).flatMap((r) => rowToRemoteArtist(r) ?? []),
        searches: ((searches ?? []) as { query: string }[]).map((r) => r.query),
      };
    },

    async ensure(tracks) {
      const ids = tracks.map((t) => t.id).filter((id) => !id.startsWith('upload:') && !id.startsWith('sample:'));
      const out: EnsureMap = {};
      if (!ids.length) return out;
      const res = await fetch('/api/library/ensure', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });
      if (!res.ok) throw new Error(`ensure ${res.status}`);
      const j = (await res.json()) as { tracks?: EnsureMap };
      for (const id of ids) out[id] = j.tracks?.[id] ?? null;
      return out;
    },

    async like(trackId) {
      const sb = await loadClient();
      await run(sb.from('likes').upsert({ user_id: userId, track_id: trackId }, { onConflict: 'user_id,track_id', ignoreDuplicates: true }));
    },
    async unlike(trackId) {
      const sb = await loadClient();
      await run(sb.from('likes').delete().eq('user_id', userId).eq('track_id', trackId));
    },
    async follow(artistId) {
      const sb = await loadClient();
      await run(sb.from('follows').upsert({ user_id: userId, artist_id: artistId }, { onConflict: 'user_id,artist_id', ignoreDuplicates: true }));
    },
    async unfollow(artistId) {
      const sb = await loadClient();
      await run(sb.from('follows').delete().eq('user_id', userId).eq('artist_id', artistId));
    },
    async touchHistory(trackId) {
      const sb = await loadClient();
      await run(sb.from('history').upsert({ user_id: userId, track_id: trackId, played_at: new Date().toISOString() }, { onConflict: 'user_id,track_id' }));
    },
    async addSearch(query) {
      const sb = await loadClient();
      await run(sb.from('search_history').upsert({ user_id: userId, query, created_at: new Date().toISOString() }, { onConflict: 'user_id,query' }));
    },
    async removeSearch(query) {
      const sb = await loadClient();
      await run(sb.from('search_history').delete().eq('user_id', userId).eq('query', query));
    },
  };
}
