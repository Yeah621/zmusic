'use client';
import { createContext, useContext, type ReactNode } from 'react';

const Ctx = createContext<readonly number[] | undefined>(undefined);

/**
 * Daftar tempat baris dan kartu lagu berada (isi album, hasil cari, Top Chart, ...). Lagu yang diputar dari sini memakai
 * daftar ini untuk tombol berikutnya/sebelumnya, seperti "konteks" pemutaran di Spotify.
 */
export function TrackList({ ids, children }: { ids: readonly number[]; children: ReactNode }) {
  return <Ctx.Provider value={ids}>{children}</Ctx.Provider>;
}

export const useTrackList = (): readonly number[] | undefined => useContext(Ctx);
