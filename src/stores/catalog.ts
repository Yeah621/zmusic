import { create } from 'zustand';
import { A as SAMPLE_ARTISTS, AL as SAMPLE_ALBUMS, T as SAMPLE_TRACKS } from '@/data/mock';
import { PREVIEW_SECONDS } from '@/lib/constants';
import { hueFrom } from '@/lib/sources/ids';
import type { SourceId, SourceTrack } from '@/lib/sources/types';

/**
 * Katalog klien: semua lagu, artis, dan album yang pernah dimuat pada sesi ini, diberi indeks seperti prototipe HTML
 * (T[i], A[k], AL[k]). Store lain (player, koleksi) menyimpan indeks ini. Indeks hanya bertambah dan stabil selama sesi.
 * Lagu dari API dimasukkan lewat `ingest`; mode contoh (`?data=sample`) mengisi katalog dari data/mock lewat `seedSample`.
 *
 * Jangan impor `@/lib/sources` (indeks) di sini: modul itu membawa nama variabel rahasia server. Tipe dan ids.ts aman.
 */
export type CatalogSource = SourceId | 'sample';

/** Nama properti pendek sama dengan HTML: t judul, a artis, g genre, h hue, d durasi (detik), i indeks. */
export interface Track {
  i: number;
  /** id global `<sumber>:<id>` (sample: `sample:<i>`) */
  id: string;
  t: string;
  a: string;
  /** genre; kosong bila sumber tidak memberi */
  g: string;
  h: number;
  /** durasi lagu penuh; cuplikan 30 detik lihat effectiveDuration */
  d: number;
  source: CatalogSource;
  playable: 'full' | 'preview';
  /** 'u' publik, 'p' pribadi (unggahan, Fase 4) */
  pv?: 'u' | 'p';
  /** artwork asli (cadangan: genArt) */
  art?: string;
  /** lisensi, mis. "CC BY-NC-SA 3.0" */
  lic?: string;
  /** halaman lagu di sumber (tautan balik wajib untuk Jamendo) */
  url?: string;
  album?: string;
  /** indeks artis di katalog */
  ak: number;
  /** indeks album di katalog */
  bk?: number;
}

export interface Artist {
  i: number;
  /** kunci untuk URL /artist/<k>: slug nama (mode contoh: indeks) */
  k: string;
  n: string;
  h: number;
  g: string;
  /** pendengar (rb): hanya ada di data contoh, tidak pernah dikarang untuk data nyata */
  f?: number;
  src: CatalogSource[];
  /** indeks lagu yang diketahui */
  ids: number[];
}

export interface Album {
  i: number;
  /** kunci untuk URL /album/<k>: `<slug artis>~<slug judul>` (mode contoh: indeks) */
  k: string;
  n: string;
  a: string;
  ak: number;
  y?: number;
  h: number;
  art?: string;
  ids: number[];
}

export const slug = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
export const artistKeyOf = (name: string): string => slug(name) || `a${hueFrom(name)}`;
export const albumKeyOf = (artist: string, title: string): string => `${artistKeyOf(artist)}~${slug(title) || `a${hueFrom(title)}`}`;
/** Tebakan nama dari kunci (untuk memuat artis/album saat dibuka langsung lewat URL). */
export const wordsOfKey = (k: string): string => k.replace(/-/g, ' ').trim();

/** Durasi yang benar-benar terputar: lagu preview berhenti di 30 detik. */
export const effectiveDuration = (x: Pick<Track, 'd' | 'playable'>): number => (x.playable === 'preview' ? Math.min(x.d, PREVIEW_SECONDS) : x.d);

interface CatalogState {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  /** Masukkan lagu (id yang sudah ada dilewati); mengembalikan indeks katalog sesuai urutan masukan. */
  ingest: (list: readonly SourceTrack[]) => number[];
  /** Isi katalog dengan data contoh Fase 1 (indeks sama dengan T/A/AL di HTML). Aman dipanggil berulang. */
  seedSample: () => void;
  /** Hanya untuk uji. */
  reset: () => void;
}

const trackIdx = new Map<string, number>();
const artistIdx = new Map<string, number>();
const albumIdx = new Map<string, number>();

export const useCatalog = create<CatalogState>()((set, get) => ({
  tracks: [],
  artists: [],
  albums: [],

  ingest: (list) => {
    const s = get();
    const tracks = [...s.tracks];
    const artists = [...s.artists];
    const albums = [...s.albums];
    const out: number[] = [];
    let dirty = false;
    for (const x of list) {
      let i = trackIdx.get(x.id);
      if (i === undefined) {
        const ak = artistKeyOf(x.artist);
        let a = artistIdx.get(ak);
        if (a === undefined) {
          a = artists.length;
          artistIdx.set(ak, a);
          artists.push({ i: a, k: ak, n: x.artist, h: hueFrom(x.artist), g: '', src: [], ids: [] });
        }
        let b: number | undefined;
        if (x.album) {
          const bk = albumKeyOf(x.artist, x.album);
          b = albumIdx.get(bk);
          if (b === undefined) {
            b = albums.length;
            albumIdx.set(bk, b);
            albums.push({ i: b, k: bk, n: x.album, a: x.artist, ak: a, h: hueFrom(`${x.artist}|${x.album}`), art: x.artworkUrl, ids: [] });
          }
        }
        i = tracks.length;
        trackIdx.set(x.id, i);
        tracks.push({ i, id: x.id, t: x.title, a: x.artist, g: x.genre ?? '', h: x.hue, d: x.durationSec, source: x.source, playable: x.playable, art: x.artworkUrl, lic: x.license, url: x.sourceUrl, album: x.album, ak: a, bk: b });
        const art = artists[a];
        artists[a] = { ...art, g: art.g || x.genre || '', src: art.src.includes(x.source) ? art.src : [...art.src, x.source], ids: [...art.ids, i] };
        if (b !== undefined) albums[b] = { ...albums[b], art: albums[b].art ?? x.artworkUrl, ids: [...albums[b].ids, i] };
        dirty = true;
      }
      out.push(i);
    }
    if (dirty) set({ tracks, artists, albums });
    return out;
  },

  seedSample: () => {
    if (get().tracks[0]?.source === 'sample') return;
    trackIdx.clear();
    artistIdx.clear();
    albumIdx.clear();
    const artists: Artist[] = SAMPLE_ARTISTS.map((a, i) => ({ i, k: String(i), n: a.n, h: a.h, g: a.g, f: a.f, src: ['sample'], ids: SAMPLE_TRACKS.filter((x) => x.a === a.n).map((x) => x.i) }));
    const albums: Album[] = SAMPLE_ALBUMS.map((al, i) => ({ i, k: String(i), n: al.n, a: al.a, ak: artists.findIndex((x) => x.n === al.a), y: al.y, h: al.h, ids: [...al.t] }));
    const tracks: Track[] = SAMPLE_TRACKS.map((x) => {
      const bk = albums.findIndex((al) => al.ids.includes(x.i));
      return { i: x.i, id: `sample:${x.i}`, t: x.t, a: x.a, g: x.g, h: x.h, d: x.d, source: 'sample', playable: 'full', pv: x.pv, album: bk >= 0 ? albums[bk].n : undefined, ak: artists.findIndex((a) => a.n === x.a), bk: bk >= 0 ? bk : undefined };
    });
    tracks.forEach((x) => trackIdx.set(x.id, x.i));
    artists.forEach((a) => artistIdx.set(a.k, a.i));
    albums.forEach((a) => albumIdx.set(a.k, a.i));
    set({ tracks, artists, albums });
  },

  reset: () => {
    trackIdx.clear();
    artistIdx.clear();
    albumIdx.clear();
    set({ tracks: [], artists: [], albums: [] });
  },
}));

/** Pembacaan di luar React (store, aksi). */
export const trackAt = (i: number): Track | undefined => useCatalog.getState().tracks[i];
export const allIndices = (): number[] => useCatalog.getState().tracks.map((x) => x.i);
export const artistByKey = (k: string): Artist | undefined => {
  const i = artistIdx.get(k);
  return i === undefined ? undefined : useCatalog.getState().artists[i];
};
export const albumByKey = (k: string): Album | undefined => {
  const i = albumIdx.get(k);
  return i === undefined ? undefined : useCatalog.getState().albums[i];
};

/** Hook: lagu pada indeks (undefined bila belum ada, mis. -1). */
export const useTrack = (i: number): Track | undefined => useCatalog((s) => s.tracks[i]);
