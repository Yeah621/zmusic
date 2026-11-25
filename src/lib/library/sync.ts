import type { SourceTrack } from '@/lib/sources/types';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { clearGuest, loadGuest } from './guest';
import { trackForStorage } from './map';
import type { LibraryRepo, RemoteLibrary, RemoteTrack } from './types';

const MAX_HISTORY = 8;
const MAX_RECENTS = 6;
const uniq = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

/**
 * P3-04: sinkronkan koleksi pengguna masuk (suka, ikuti, riwayat putar, riwayat cari) dengan akunnya, dengan pembaruan optimistis.
 * Store lokal tetap sumber kebenaran UI; setiap perubahan dibandingkan dengan keadaan sebelumnya (subscribe) lalu disimpan ke
 * `repo` secara berurutan. Gagal menyimpan suka atau ikuti = perubahan dibatalkan di UI dan pengguna diberi tahu; riwayat bersifat
 * terbaik-upaya. Saat mulai, koleksi akun dimuat dan DIGABUNG dengan data lokal (riwayat tamu dari localStorage ikut dipindah ke akun).
 * Lagu contoh (mode contoh) tidak pernah disimpan. Mengembalikan fungsi berhenti.
 */
export function startLibrarySync(repo: LibraryRepo, notify: (message: string) => void): () => void {
  let stopped = false;
  let suppress = false;
  const trackUuid = new Map<string, string>(); // id global -> uuid baris tracks
  const artistUuid = new Map<number, string>(); // indeks artis katalog -> uuid baris artists
  let chain: Promise<void> = Promise.resolve();
  const enqueue = (job: () => Promise<void>): void => {
    chain = chain.then(job).catch(() => {}); // job menangani galatnya sendiri
  };
  const quiet = (fn: () => void): void => {
    suppress = true;
    try {
      fn();
    } finally {
      suppress = false;
    }
  };

  /** Pastikan lagu ada di database; null = tidak untuk disimpan (lagu contoh), lempar galat bila gagal. `needArtist`: butuh uuid artisnya juga (ikuti). */
  async function ensure(i: number, needArtist = false): Promise<{ trackId: string; artistId: string } | null> {
    const x = useCatalog.getState().tracks[i];
    if (!x || x.source === 'sample') return null;
    const t = trackUuid.get(x.id);
    const a = artistUuid.get(x.ak);
    if (t && (a || !needArtist)) return { trackId: t, artistId: a ?? '' };
    const src = trackForStorage(x);
    if (!src) return null;
    const r = (await repo.ensure([src]))[x.id];
    if (!r) throw new Error('lagu tidak bisa disalin ke akun');
    trackUuid.set(x.id, r.trackId);
    artistUuid.set(x.ak, r.artistId);
    return r;
  }

  const persistLike = (i: number, liked: boolean): void =>
    enqueue(async () => {
      try {
        const r = await ensure(i);
        if (r) await (liked ? repo.like(r.trackId) : repo.unlike(r.trackId));
      } catch {
        quiet(() => useLibraryStore.setState((s) => ({ likes: liked ? s.likes.filter((x) => x !== i) : s.likes.includes(i) ? s.likes : [...s.likes, i] })));
        notify(liked ? 'Gagal menyimpan suka. Coba lagi.' : 'Gagal membatalkan suka. Coba lagi.');
      }
    });

  const persistFollow = (k: number, following: boolean): void =>
    enqueue(async () => {
      try {
        let id = artistUuid.get(k);
        if (!id) {
          const first = useCatalog.getState().artists[k]?.ids[0];
          const r = first === undefined ? null : await ensure(first, true);
          if (!r) return;
          id = r.artistId;
        }
        await (following ? repo.follow(id) : repo.unfollow(id));
      } catch {
        quiet(() => useLibraryStore.setState((s) => ({ follows: following ? s.follows.filter((x) => x !== k) : s.follows.includes(k) ? s.follows : [...s.follows, k] })));
        notify(following ? 'Gagal menyimpan ikutan. Coba lagi.' : 'Gagal berhenti mengikuti. Coba lagi.');
      }
    });

  const persistHistory = (i: number): void =>
    enqueue(async () => {
      try {
        const r = await ensure(i);
        if (r) await repo.touchHistory(r.trackId);
      } catch {
        // riwayat: terbaik-upaya
      }
    });

  const persistSearch = (q: string, add: boolean): void =>
    enqueue(async () => {
      try {
        await (add ? repo.addSearch(q) : repo.removeSearch(q));
      } catch {
        // riwayat cari: terbaik-upaya
      }
    });

  const offLibrary = useLibraryStore.subscribe((s, p) => {
    if (suppress || stopped) return;
    if (s.likes !== p.likes) {
      for (const i of s.likes) if (!p.likes.includes(i)) persistLike(i, true);
      for (const i of p.likes) if (!s.likes.includes(i)) persistLike(i, false);
    }
    if (s.follows !== p.follows) {
      for (const k of s.follows) if (!p.follows.includes(k)) persistFollow(k, true);
      for (const k of p.follows) if (!s.follows.includes(k)) persistFollow(k, false);
    }
    if (s.recents !== p.recents) {
      if (s.recents[0] !== undefined && s.recents[0] !== p.recents[0]) persistSearch(s.recents[0], true);
      for (const q of p.recents) if (!s.recents.includes(q)) persistSearch(q, false);
    }
  });
  const offPlayer = usePlayerStore.subscribe((s, p) => {
    if (suppress || stopped) return;
    if (s.hist[0] !== undefined && s.hist[0] !== p.hist[0]) persistHistory(s.hist[0]);
  });

  async function hydrate(): Promise<void> {
    let remote: RemoteLibrary;
    try {
      remote = await repo.load();
    } catch {
      notify('Gagal memuat koleksi dari akun. Coba muat ulang halaman.');
      return;
    }
    if (stopped) return;
    const intoCatalog = (rt: RemoteTrack): number => {
      trackUuid.set(rt.track.id, rt.trackId);
      return useCatalog.getState().ingest([rt.track])[0];
    };
    const remoteLikes = remote.likes.map(intoCatalog);
    const remoteHist = remote.history.map(intoCatalog);
    const remoteFollows = remote.follows.map((a) => {
      const i = useCatalog.getState().ingestArtist({ name: a.name, source: a.source });
      artistUuid.set(i, a.artistId);
      return i;
    });
    const guest = loadGuest();
    const guestHist = guest.history.map((t: SourceTrack) => useCatalog.getState().ingest([t])[0]);
    const lib = useLibraryStore.getState();
    const likes = uniq([...lib.likes, ...remoteLikes]);
    const follows = uniq([...lib.follows, ...remoteFollows]);
    const hist = uniq([...guestHist, ...usePlayerStore.getState().hist, ...remoteHist]).slice(0, MAX_HISTORY);
    const recents = uniq([...guest.recents, ...lib.recents, ...remote.searches]).slice(0, MAX_RECENTS);
    quiet(() => {
      useLibraryStore.setState({ likes, follows, recents });
      usePlayerStore.setState({ hist });
    });
    // yang hanya ada di klien (riwayat tamu, atau aksi pengguna saat koleksi dimuat) dipindah ke akun; terlama dulu
    for (const i of likes) if (!remoteLikes.includes(i)) persistLike(i, true);
    for (const k of follows) if (!remoteFollows.includes(k)) persistFollow(k, true);
    for (const i of [...hist].reverse()) if (!remoteHist.includes(i)) persistHistory(i);
    for (const q of [...recents].reverse()) if (!remote.searches.includes(q)) persistSearch(q, true);
    clearGuest();
  }
  void hydrate();

  return () => {
    stopped = true;
    offLibrary();
    offPlayer();
  };
}
