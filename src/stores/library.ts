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
export interface OwnPlaylist {
  n: string;
  h: number;
  /** indeks lagu */
  t: number[];
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
export type Quality = 0 | 1 | 2;

/** Komentar bawaan tiap lagu (padanan sd() di HTML). */
export const SEED_COMMENTS: readonly TrackComment[] = [
  { p: 0.18, t: 'Intro-nya bikin nagih' },
  { p: 0.42, t: 'Drop-nya mantap' },
  { p: 0.71, t: 'Bagian ini bikin merinding' },
];

const MAX_RECENTS = 6;

interface LibraryState {
  user: SessionUser | null;
  likes: number[];
  follows: number[];
  ownPlaylists: OwnPlaylist[];
  recents: string[];
  comments: Record<number, TrackComment[]>;
  settings: Settings;
  quality: Quality;
  /** true = kini disukai, false = batal suka, null = indeks tidak valid */
  toggleLike: (i: number) => boolean | null;
  /** true = kini mengikuti */
  toggleFollow: (k: number) => boolean;
  addPlaylist: (name: string, firstTrack?: number) => void;
  renamePlaylist: (own: number, name: string) => void;
  deletePlaylist: (own: number) => OwnPlaylist | undefined;
  restorePlaylist: (own: number, p: OwnPlaylist) => void;
  addToPlaylist: (own: number, track: number) => void;
  removeFromPlaylist: (own: number, track: number) => void;
  pushRecent: (v: string) => void;
  removeRecent: (k: number) => void;
  addComment: (i: number, p: number, t: string) => void;
  setSetting: (k: keyof Settings, v: boolean) => void;
  setQuality: (q: Quality) => void;
  setUser: (u: SessionUser | null) => void;
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  // Fase 1: pengguna contoh seperti keadaan awal HTML (U.in = 1). Akun nyata di P3-02.
  user: { name: 'Zee Pratama', handle: 'zee.music' },
  likes: [],
  follows: [],
  ownPlaylists: [],
  recents: ['lo-fi', 'kairo'],
  comments: {},
  settings: { cf: true, nm: true, ap: true, nt: true, ds: false, pp: true, sa: true },
  quality: 1,

  toggleLike: (i) => {
    if (!Number.isInteger(i) || !T[i]) return null;
    const { likes } = get();
    const had = likes.includes(i);
    set({ likes: had ? likes.filter((x) => x !== i) : [...likes, i] });
    return !had;
  },
  toggleFollow: (k) => {
    const { follows } = get();
    const had = follows.includes(k);
    set({ follows: had ? follows.filter((x) => x !== k) : [...follows, k] });
    return !had;
  },
  addPlaylist: (name, firstTrack) =>
    set((s) => ({ ownPlaylists: [...s.ownPlaylists, { n: name, h: Math.round(Math.random() * 360), t: firstTrack !== undefined ? [firstTrack] : [] }] })),
  renamePlaylist: (own, name) => set((s) => ({ ownPlaylists: s.ownPlaylists.map((p, k) => (k === own ? { ...p, n: name } : p)) })),
  deletePlaylist: (own) => {
    const p = get().ownPlaylists[own];
    if (!p) return undefined;
    set((s) => ({ ownPlaylists: s.ownPlaylists.filter((_, k) => k !== own) }));
    return p;
  },
  restorePlaylist: (own, p) =>
    set((s) => {
      const list = [...s.ownPlaylists];
      list.splice(own, 0, p);
      return { ownPlaylists: list };
    }),
  addToPlaylist: (own, track) =>
    set((s) => ({ ownPlaylists: s.ownPlaylists.map((p, k) => (k === own && !p.t.includes(track) ? { ...p, t: [...p.t, track] } : p)) })),
  removeFromPlaylist: (own, track) =>
    set((s) => ({ ownPlaylists: s.ownPlaylists.map((p, k) => (k === own ? { ...p, t: p.t.filter((j) => j !== track) } : p)) })),
  pushRecent: (v) => set((s) => ({ recents: [v, ...s.recents.filter((r) => r !== v)].slice(0, MAX_RECENTS) })),
  removeRecent: (k) => set((s) => ({ recents: s.recents.filter((_, i) => i !== k) })),
  addComment: (i, p, t) => set((s) => ({ comments: { ...s.comments, [i]: [...(s.comments[i] ?? SEED_COMMENTS), { p, t }] } })),
  setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
  setQuality: (quality) => set({ quality }),
  setUser: (user) => set({ user }),
}));
