import { PB, T, type Track } from '@/data/mock';
import type { OwnPlaylist } from '@/stores/library';

export interface PlaylistInfo {
  n: string;
  h: number;
  own: boolean;
  tracks: Track[];
}

/** Playlist cepat bawaan (isi = lagu bergenre sama) diikuti playlist milik pengguna. Padanan pls() dan ptr() di HTML. */
export function playlistsOf(own: readonly OwnPlaylist[]): PlaylistInfo[] {
  return [
    ...PB.map((p) => ({ n: p.n, h: p.h, own: false, tracks: T.filter((x) => x.g === p.g) })),
    ...own.map((p) => ({ n: p.n, h: p.h, own: true, tracks: p.t.filter((i) => T[i]).map((i) => T[i]) })),
  ];
}
