import { PB } from '@/data/mock';
import type { OwnPlaylist } from '@/stores/library';
import type { Track } from '@/stores/catalog';

export interface PlaylistInfo {
  n: string;
  h: number;
  own: boolean;
  /** isi playlist; null = playlist cepat yang isinya belum dimuat */
  tracks: Track[] | null;
}

/**
 * Playlist cepat bawaan (isi = lagu bergenre sama) diikuti playlist milik pengguna. Padanan pls() dan ptr() di HTML.
 * `byGenre` memberi lagu satu genre (null bila belum dimuat); `track` mengambil lagu katalog dari indeks.
 */
export function playlistsOf(own: readonly OwnPlaylist[], byGenre: (g: string) => Track[] | null, track: (i: number) => Track | undefined): PlaylistInfo[] {
  return [
    ...PB.map((p) => ({ n: p.n, h: p.h, own: false, tracks: byGenre(p.g) })),
    ...own.map((p) => ({ n: p.n, h: p.h, own: true, tracks: p.t.map(track).filter((x): x is Track => x !== undefined) })),
  ];
}
