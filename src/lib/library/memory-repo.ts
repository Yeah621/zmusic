import type { SourceTrack } from '@/lib/sources/types';
import type { EnsureMap, LibraryRepo, RemoteArtist, RemoteLibrary, RemoteTrack } from './types';

/**
 * Penyimpanan koleksi di memori untuk mode contoh dan uji. `failNext` membuat n operasi tulis berikutnya gagal (uji rollback).
 * Perilakunya mengikuti database: suka/ikuti idempoten, riwayat dan riwayat cari unik dengan urutan terbaru dulu.
 */
export function createMemoryRepo(): LibraryRepo & { failNext: (n: number, only?: string) => void; calls: string[]; state: () => RemoteLibrary } {
  const tracks = new Map<string, RemoteTrack>();
  const artists = new Map<string, RemoteArtist>();
  const likes: string[] = [];
  const follows: string[] = [];
  const history: string[] = [];
  const searches: string[] = [];
  const calls: string[] = [];
  let fail = 0;
  let only: string | undefined;
  const maybeFail = (op: string) => {
    calls.push(op);
    if (fail > 0 && (!only || only === op)) {
      fail--;
      throw new Error(`gagal: ${op}`);
    }
  };
  const front = (list: string[], v: string) => {
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    list.unshift(v);
  };
  const track = (id: string): RemoteTrack[] => {
    const t = tracks.get(id);
    return t ? [t] : [];
  };
  return {
    calls,
    failNext(n, op) {
      fail = n;
      only = op;
    },
    state: () => ({ likes: likes.flatMap(track), history: history.flatMap(track), follows: follows.flatMap((id) => artists.get(id) ?? []), searches: [...searches] }),
    async load() {
      maybeFail('load');
      return { likes: likes.flatMap(track), history: history.slice(0, 8).flatMap(track), follows: follows.flatMap((id) => artists.get(id) ?? []), searches: searches.slice(0, 6) };
    },
    async ensure(list: readonly SourceTrack[]): Promise<EnsureMap> {
      maybeFail('ensure');
      const out: EnsureMap = {};
      for (const t of list) {
        const artistId = `a:${t.source}:${t.artist.toLowerCase()}`;
        const trackId = `t:${t.id}`;
        tracks.set(trackId, { trackId, track: t });
        artists.set(artistId, { artistId, name: t.artist, source: t.source });
        out[t.id] = { trackId, artistId };
      }
      return out;
    },
    async like(id) {
      maybeFail('like');
      if (!likes.includes(id)) likes.unshift(id);
    },
    async unlike(id) {
      maybeFail('unlike');
      const i = likes.indexOf(id);
      if (i >= 0) likes.splice(i, 1);
    },
    async follow(id) {
      maybeFail('follow');
      if (!follows.includes(id)) follows.unshift(id);
    },
    async unfollow(id) {
      maybeFail('unfollow');
      const i = follows.indexOf(id);
      if (i >= 0) follows.splice(i, 1);
    },
    async touchHistory(id) {
      maybeFail('touchHistory');
      front(history, id);
    },
    async addSearch(q) {
      maybeFail('addSearch');
      front(searches, q);
    },
    async removeSearch(q) {
      maybeFail('removeSearch');
      const i = searches.indexOf(q);
      if (i >= 0) searches.splice(i, 1);
    },
  };
}
