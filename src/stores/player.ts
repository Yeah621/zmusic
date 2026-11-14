import { create } from 'zustand';
import { allIndices, effectiveDuration, trackAt, useCatalog } from '@/stores/catalog';

const MAX_HISTORY = 8;

let rand: () => number = Math.random;
/** Hanya untuk uji: ganti sumber angka acak. */
export function setRandomSource(f: () => number): void {
  rand = f;
}

function shuffled(ids: readonly number[]): number[] {
  const a = [...ids];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

/** Lagu acak dari `list` selain `cur` (seragam), jadi acak tidak pernah mengulang lagu yang sedang diputar. */
function randomOther(list: readonly number[], cur: number): number {
  const others = list.filter((i) => i !== cur);
  return others.length ? others[Math.floor(rand() * others.length)] : cur;
}

/** Daftar pemutaran saat ini: konteks yang dipilih (mis. isi album) atau, bila tidak ada, seluruh katalog seperti di HTML Fase 1. */
export const contextOf = (s: Pick<PlayerState, 'ctx'>): readonly number[] => s.ctx ?? allIndices();

/** `n` lagu berikutnya dalam daftar pemutaran setelah `cur` (melingkar), untuk panel "Selanjutnya". */
export function upcoming(list: readonly number[], cur: number, n: number): number[] {
  const at = list.indexOf(cur);
  const count = Math.min(n, Math.max(0, list.length - 1));
  return Array.from({ length: count }, (_, k) => list[(at + 1 + k + list.length) % list.length]);
}

/** Durasi efektif lagu aktif (detik): dari audio nyata bila sudah diketahui, jika tidak dari data lagu. */
export const durationOf = (s: Pick<PlayerState, 'cur' | 'duration'>): number => {
  if (s.cur < 0) return 0;
  const x = trackAt(s.cur);
  return s.duration ?? (x ? effectiveDuration(x) : 0);
};

export interface PlayerState {
  /** indeks lagu aktif di katalog (-1 = belum ada) */
  cur: number;
  /** daftar pemutaran untuk berikutnya/sebelumnya (indeks katalog); null = seluruh katalog */
  ctx: number[] | null;
  /** posisi dalam detik */
  pos: number;
  on: boolean;
  sh: boolean;
  rp: boolean;
  /** "Dalam antrean": indeks lagu */
  queue: number[];
  /** terakhir diputar, terbaru dulu, maksimal 8 */
  hist: number[];
  volume: number;
  muted: boolean;
  /** durasi dari elemen audio (null = pakai data lagu) */
  duration: number | null;
  /** true = audio nyata yang menggerakkan posisi (jam simulasi berhenti) */
  engine: boolean;
  /** `ctx` = daftar tempat lagu ini diputar (album, hasil cari, ...) untuk berikutnya/sebelumnya; tanpa `ctx` daftar lama dipertahankan. */
  play: (i: number, force?: boolean, ctx?: readonly number[]) => void;
  playSet: (ids: readonly number[], shuffle?: boolean) => boolean;
  toggle: () => void;
  pause: () => void;
  next: (d: 1 | -1) => void;
  seek: (sec: number) => void;
  setPosition: (sec: number) => void;
  setDuration: (d: number | null) => void;
  setEngine: (on: boolean) => void;
  /** Lagu selesai (padanan endT() di HTML): dipanggil jam simulasi dan AudioEngine. */
  finish: (autoplay: boolean) => void;
  /** Maju `dt` detik (jam simulasi Fase 1; diganti AudioEngine di P2-01). `autoplay` = pengaturan `ap`. */
  tick: (dt: number, autoplay: boolean) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addNext: (i: number) => void;
  addToQueue: (i: number) => void;
  removeFromQueue: (j: number) => void;
  setQueue: (q: number[]) => void;
  moveInQueue: (from: number, to: number) => void;
  swapInQueue: (i: number, j: number) => void;
  /** Mengosongkan antrean dan mengembalikan isi sebelumnya (untuk "Urungkan"). */
  clearQueue: () => number[];
  startRadio: (i: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

export const usePlayerStore = create<PlayerState>()((set, get) => {
  /** Mulai memutar lagu `cur` dari awal dan catat di riwayat. */
  const begin = (cur: number, o: { queue?: number[]; ctx?: number[] | null } = {}) => {
    const { hist } = get();
    set({ cur, pos: 0, duration: null, on: true, hist: [cur, ...hist.filter((i) => i !== cur)].slice(0, MAX_HISTORY), ...(o.queue ? { queue: o.queue } : {}), ...(o.ctx !== undefined ? { ctx: o.ctx } : {}) });
  };

  return {
    cur: -1,
    ctx: null,
    pos: 0,
    on: false,
    sh: false,
    rp: false,
    queue: [],
    hist: [],
    volume: 0.7,
    muted: false,
    duration: null,
    engine: false,

    play: (i, force = false, ctx) => {
      if (!trackAt(i)) return;
      const s = get();
      if (i === s.cur && !force) return s.toggle();
      begin(i, { ctx: ctx ? [...ctx] : undefined });
    },
    playSet: (ids, shuffle = false) => {
      const list = shuffle ? shuffled(ids) : [...ids];
      if (!list.length || !trackAt(list[0])) return false;
      begin(list[0], { queue: list.slice(1), ctx: list });
      return true;
    },
    toggle: () => {
      const s = get();
      if (s.cur < 0) return s.play(0);
      set({ on: !s.on });
    },
    pause: () => set({ on: false }),
    next: (d) => {
      const s = get();
      if (s.cur < 0) return s.play(0);
      if (d < 0 && s.pos > 3) return set({ pos: 0 });
      if (d > 0 && s.queue.length) return begin(s.queue[0], { queue: s.queue.slice(1) });
      const list = contextOf(s);
      if (!list.length) return;
      if (s.sh) return begin(randomOther(list, s.cur));
      const at = list.indexOf(s.cur);
      begin(list[at < 0 ? (d > 0 ? 0 : list.length - 1) : (at + d + list.length) % list.length]);
    },
    seek: (sec) => {
      const { cur } = get();
      if (cur < 0) return;
      set((s) => ({ pos: Math.max(0, Math.min(durationOf(s), sec)) }));
    },
    setPosition: (pos) => set({ pos }),
    setDuration: (duration) => set({ duration }),
    setEngine: (engine) => set({ engine }),
    tick: (dt, autoplay) => {
      const s = get();
      if (!s.on || s.cur < 0 || s.engine) return;
      const pos = s.pos + dt;
      if (pos < durationOf(s)) return set({ pos });
      s.finish(autoplay);
    },
    finish: (autoplay) => {
      const s = get();
      if (s.cur < 0) return;
      if (s.rp) return set({ pos: 0 });
      if (s.queue.length) return s.next(1);
      // daftar yang dipilih (album, hasil cari, ...) dilanjutkan sampai habis; putar otomatis baru bekerja setelah itu
      if (s.ctx && !s.sh) {
        const at = s.ctx.indexOf(s.cur);
        if (at >= 0 && at < s.ctx.length - 1) return s.next(1);
      }
      if (autoplay && !s.sh) {
        const all = useCatalog.getState().tracks;
        const x = all[s.cur];
        const recent = s.hist.slice(0, 3);
        const c = all.filter((y) => y.g === x.g && y.i !== s.cur && !recent.includes(y.i));
        return s.play(c.length ? c[Math.floor(rand() * c.length)].i : (s.cur + 1) % all.length, true);
      }
      if (s.sh) return s.next(1);
      set({ on: false, pos: 0 });
    },
    toggleShuffle: () => set((s) => ({ sh: !s.sh })),
    toggleRepeat: () => set((s) => ({ rp: !s.rp })),

    addNext: (i) => set((s) => ({ queue: [i, ...s.queue] })),
    addToQueue: (i) => set((s) => ({ queue: [...s.queue, i] })),
    removeFromQueue: (j) => set((s) => ({ queue: s.queue.filter((_, k) => k !== j) })),
    setQueue: (queue) => set({ queue }),
    moveInQueue: (from, to) =>
      set((s) => {
        const n = s.queue.length;
        if (from === to || from < 0 || to < 0 || from >= n || to >= n) return {};
        const q = [...s.queue];
        q.splice(to, 0, ...q.splice(from, 1));
        return { queue: q };
      }),
    swapInQueue: (i, j) =>
      set((s) => {
        const n = s.queue.length;
        if (i < 0 || j < 0 || i >= n || j >= n) return {};
        const q = [...s.queue];
        [q[i], q[j]] = [q[j], q[i]];
        return { queue: q };
      }),
    clearQueue: () => {
      const prev = get().queue;
      set({ queue: [] });
      return prev;
    },
    startRadio: (i) => {
      const x = trackAt(i);
      if (!x) return;
      begin(i, { queue: shuffled(useCatalog.getState().tracks.filter((y) => y.g === x.g && y.i !== i).map((y) => y.i)) });
    },

    setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
    toggleMute: () => set((s) => ({ muted: !s.muted })),
  };
});

export const useDuration = (): number => usePlayerStore(durationOf);
