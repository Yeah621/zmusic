import { create } from 'zustand';
import { T } from '@/data/mock';

export interface SessionUser {
  name: string;
  handle: string;
}
export interface TrackComment {
  /** posisi 0..1 dari durasi lagu */
  p: number;
  t: string;
}
export interface Settings {
  cf: boolean;
  nm: boolean;
  ap: boolean;
  nt: boolean;
  ds: boolean;
  pp: boolean;
  sa: boolean;
}

/** Komentar bawaan tiap lagu (padanan sd() di HTML). */
export const SEED_COMMENTS: readonly TrackComment[] = [
  { p: 0.18, t: 'Intro-nya bikin nagih' },
  { p: 0.42, t: 'Drop-nya mantap' },
  { p: 0.71, t: 'Bagian ini bikin merinding' },
];

interface LibraryState {
  user: SessionUser | null;
  likes: number[];
  comments: Record<number, TrackComment[]>;
  settings: Settings;
  /** true = kini disukai, false = batal suka, null = indeks tidak valid */
  toggleLike: (i: number) => boolean | null;
  addComment: (i: number, p: number, t: string) => void;
  setSetting: (k: keyof Settings, v: boolean) => void;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  // Fase 1: pengguna contoh seperti keadaan awal HTML (U.in = 1). Akun nyata di P3-02.
  user: { name: 'Zee Pratama', handle: 'zee.music' },
  likes: [],
  comments: {},
  settings: { cf: true, nm: true, ap: true, nt: true, ds: false, pp: true, sa: true },
  toggleLike: (i) => {
    if (!Number.isInteger(i) || !T[i]) return null;
    const { likes } = get();
    const had = likes.includes(i);
    set({ likes: had ? likes.filter((x) => x !== i) : [...likes, i] });
    return !had;
  },
  addComment: (i, p, t) => set((s) => ({ comments: { ...s.comments, [i]: [...(s.comments[i] ?? SEED_COMMENTS), { p, t }] } })),
  setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
}));
