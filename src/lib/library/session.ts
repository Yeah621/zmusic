import { dataMode } from '@/lib/data/mode';
import { supabaseConfigured } from '@/lib/supabase/config';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { toast } from '@/stores/ui';
import { loadGuest, saveGuest } from './guest';
import { trackForStorage } from './map';
import { createMemoryRepo } from './memory-repo';
import { startLibrarySync } from './sync';
import { createSupabaseRepo } from './supabase-repo';

/** Data koleksi milik pengguna sebelumnya tidak boleh terbawa ke tamu atau akun berikutnya. */
function resetUserState(): void {
  useLibraryStore.setState({ likes: [], follows: [], recents: [] });
  usePlayerStore.setState({ hist: [] });
}

/** Tamu: riwayat cari dan riwayat putar disimpan di localStorage (dipindah ke akun saat masuk). Mengembalikan fungsi berhenti. */
export function startGuestPersistence(): () => void {
  const g = loadGuest();
  useLibraryStore.setState({ recents: g.recents });
  usePlayerStore.setState({ hist: g.history.map((t) => useCatalog.getState().ingest([t])[0]) });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const tracks = useCatalog.getState().tracks;
      saveGuest({
        recents: useLibraryStore.getState().recents,
        history: usePlayerStore.getState().hist.flatMap((i) => {
          const x = tracks[i];
          const t = x ? trackForStorage(x) : null;
          return t ? [t] : [];
        }),
      });
    }, 400);
  };
  const offA = useLibraryStore.subscribe((s, p) => {
    if (s.recents !== p.recents) save();
  });
  const offB = usePlayerStore.subscribe((s, p) => {
    if (s.hist !== p.hist) save();
  });
  return () => {
    clearTimeout(timer);
    offA();
    offB();
  };
}

let stop: (() => void) | null = null;
let current: string | null | undefined;

/**
 * Hubungkan koleksi ke status masuk: pengguna masuk = sinkron dengan akun (Supabase, atau memori di mode contoh); tamu = riwayat di
 * localStorage. Dipanggil tiap status masuk berubah (ShellEffects); memanggilnya lagi dengan pengguna yang sama tidak berbuat apa-apa.
 */
export function bindLibrary(user: { id?: string } | null): void {
  const key = user ? (user.id ?? 'anon') : null;
  if (key === current) return;
  const had = current !== undefined && current !== null;
  current = key;
  stop?.();
  stop = null;
  if (had) resetUserState();
  if (!user) {
    useLibraryStore.setState({ likes: [], follows: [] });
    stop = startGuestPersistence();
    return;
  }
  const repo = dataMode() === 'sample' ? createMemoryRepo() : user.id && supabaseConfigured() ? createSupabaseRepo(user.id) : null;
  if (repo) stop = startLibrarySync(repo, (m) => toast(m));
}

/** Lepaskan sinkronisasi dan lupakan pengguna terakhir (dipakai uji). */
export function unbindLibrary(): void {
  stop?.();
  stop = null;
  current = undefined;
}
