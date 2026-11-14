'use client';
import { PB } from '@/data/mock';
import { loadAlbum, loadArtist, loadHome, loadSearch } from './client';
import { resolveResource, useResource, type Resource } from './resource';
import type { AlbumData, ArtistData, HomeData, SearchData } from './types';

export const homeKey = (genre: string): string => `home:${genre}`;
export const searchKey = (q: string): string => `search:${q.trim().toLowerCase()}`;

/** Lagu tren (genre "Semua" = tanpa filter) beserta rak artis dan album; `enabled` false = nonaktif. */
export const useHome = (genre: string, enabled = true): Resource<HomeData> => useResource(enabled ? homeKey(genre) : null, () => loadHome(genre));

/** Pencarian; `enabled` false atau kata kunci kosong = nonaktif. */
export const useSearch = (q: string, enabled = true): Resource<SearchData> =>
  useResource(enabled && q.trim() ? searchKey(q) : null, () => loadSearch(q.trim()), { keepPrevious: true });

/** Lagu tren satu genre (null = nonaktif); berbagi cache dengan useHome. */
export const useGenreList = (genre: string | null): Resource<HomeData> => useResource(genre ? homeKey(genre) : null, () => loadHome(genre ?? 'Semua'));

export const useArtist = (key: string): Resource<ArtistData | null> => useResource(`artist:${key}`, () => loadArtist(key));
export const useAlbum = (key: string): Resource<AlbumData | null> => useResource(`album:${key}`, () => loadAlbum(key));

/** Muat (dan simpan di cache) pencarian untuk saran; dipakai kolom cari. */
export const fetchSearch = (q: string): Promise<SearchData> => resolveResource(searchKey(q), () => loadSearch(q.trim()));
/** Muat lagu tren satu genre di luar React (playlist cepat). */
export const fetchGenre = (genre: string): Promise<HomeData> => resolveResource(homeKey(genre), () => loadHome(genre));

/** Isi playlist cepat bawaan (campuran genre): genre → indeks lagu. Genre yang gagal dimuat dianggap kosong. */
export function useGenreMixes(enabled = true): Resource<Record<string, number[]>> {
  return useResource(enabled ? 'mixes' : null, async () => {
    const genres = [...new Set(PB.map((p) => p.g))];
    const done = await Promise.allSettled(genres.map(fetchGenre));
    return Object.fromEntries(
      genres.map((g, k) => {
        const r = done[k];
        return [g, r.status === 'fulfilled' ? r.value.ids : []];
      }),
    );
  });
}
