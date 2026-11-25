import { createClient } from '@supabase/supabase-js';
import { dbKey, type Ensured, type TrackDb } from './ensure';

/**
 * Implementasi Supabase untuk TrackDb, memakai kunci service_role (melewati RLS). KHUSUS SERVER: jangan diimpor dari kode klien
 * (dijaga uji client-bundle dan npm run check:secrets). Dibuat per permintaan; tanpa sesi tersimpan.
 */
export function createServiceTrackDb(): TrackDb {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase service_role belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY)');
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const idOf = (r: { data: { id: string } | null; error: { message: string } | null }): string => {
    if (r.error || !r.data) throw new Error(r.error?.message ?? 'baris tidak dikembalikan');
    return r.data.id;
  };

  return {
    async findTracks(keys) {
      const bySource = new Map<string, string[]>();
      for (const k of keys) bySource.set(k.source, [...(bySource.get(k.source) ?? []), k.sourceId]);
      const out = new Map<string, Ensured>();
      for (const [source, ids] of bySource) {
        const { data, error } = await sb.from('tracks').select('id, source, source_id, artist_id').eq('source', source).in('source_id', ids);
        if (error) throw new Error(error.message);
        for (const r of (data ?? []) as { id: string; source: string; source_id: string; artist_id: string }[]) out.set(dbKey(r.source as never, r.source_id), { trackId: r.id, artistId: r.artist_id });
      }
      return out;
    },

    async ensureArtist(a) {
      return idOf(await sb.from('artists').upsert({ name: a.name, source: a.source, source_id: a.sourceId, hue: a.hue }, { onConflict: 'source,source_id' }).select('id').single());
    },

    async ensureAlbum(a) {
      return idOf(await sb.from('albums').upsert({ title: a.title, artist_id: a.artistId, source: a.source, source_id: a.sourceId, hue: a.hue }, { onConflict: 'source,source_id' }).select('id').single());
    },

    async ensureTrack(t) {
      return idOf(
        await sb
          .from('tracks')
          .upsert(
            {
              source: t.source,
              source_id: t.sourceId,
              title: t.title,
              artist_id: t.artistId,
              album_id: t.albumId,
              genre: t.genre,
              duration_sec: t.durationSec,
              hue: t.hue,
              artwork_url: t.artworkUrl,
              license: t.license,
              source_url: t.sourceUrl,
              playable: t.playable,
            },
            { onConflict: 'source,source_id' },
          )
          .select('id')
          .single(),
      );
    },
  };
}
