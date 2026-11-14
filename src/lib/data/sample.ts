import { useCatalog } from '@/stores/catalog';
import type { AlbumData, ArtistData, HomeData, SearchData } from './types';

/** Mode contoh (`?data=sample`): jawaban yang sama dengan HTML Fase 1, dihitung dari data/mock tanpa jaringan. */
function cat() {
  const s = useCatalog.getState();
  if (s.tracks[0]?.source !== 'sample') s.seedSample();
  return useCatalog.getState();
}

export function sampleHome(genre: string): HomeData {
  const { tracks, artists, albums } = cat();
  return { ids: tracks.filter((x) => genre === 'Semua' || x.g === genre).map((x) => x.i), artists: artists.map((a) => a.i), albums: albums.map((a) => a.i) };
}

/** Padanan srchV di HTML: lagu cocok pada judul+artis+genre, artis pada nama, album pada judul+artis. */
export function sampleSearch(q: string): SearchData {
  const { tracks, artists, albums } = cat();
  const ql = q.toLowerCase();
  return {
    ids: tracks.filter((x) => `${x.t} ${x.a} ${x.g}`.toLowerCase().includes(ql)).map((x) => x.i),
    artists: artists.filter((a) => a.n.toLowerCase().includes(ql)).map((a) => a.i),
    albums: albums.filter((a) => `${a.n} ${a.a}`.toLowerCase().includes(ql)).map((a) => a.i),
  };
}

const idx = (key: string): number | null => (/^\d+$/.test(key) ? Number(key) : null);

export function sampleArtist(key: string): ArtistData | null {
  const { artists, tracks } = cat();
  const k = idx(key);
  const a = k === null ? undefined : artists[k];
  if (!a) return null;
  return { artist: a.i, ids: a.ids, albums: [...new Set(a.ids.map((i) => tracks[i].bk).filter((b): b is number => b !== undefined))] };
}

export function sampleAlbum(key: string): AlbumData | null {
  const { albums } = cat();
  const k = idx(key);
  const al = k === null ? undefined : albums[k];
  return al ? { album: al.i, ids: al.ids } : null;
}
