import type { QuickPlaylist } from '@/data/mock';
import { requireLogin } from '@/lib/auth/gate';
import { fetchGenre } from '@/lib/data/hooks';
import { trackAt, useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { toast } from '@/stores/ui';

/** Suka/batal suka + toast (dengan "Urungkan" saat dihapus). Padanan like() di HTML. */
export function toggleLikeWithToast(i: number, silent = false): void {
  if (!requireLogin('Masuk untuk menyukai lagu')) return;
  const liked = useLibraryStore.getState().toggleLike(i);
  if (liked === null || silent) return;
  toast(liked ? 'Ditambahkan ke Lagu Disukai' : 'Dihapus dari Lagu Disukai', liked ? undefined : () => toggleLikeWithToast(i, true));
}

export function playIds(ids: readonly number[], shuffle = false): void {
  if (!usePlayerStore.getState().playSet(ids, shuffle)) toast('Belum ada lagu');
}

/** Playlist cepat bawaan = lagu tren bergenre sama (padanan pls() di HTML); isinya dimuat dulu bila belum ada. */
export function playQuickPlaylist(p: QuickPlaylist): void {
  fetchGenre(p.g).then(
    (d) => {
      if (!d.ids.length) return toast('Playlist masih kosong');
      toast(`Memutar playlist ${p.n}`);
      playIds(d.ids);
    },
    () => toast('Gagal memuat playlist. Coba lagi.'),
  );
}

export function toggleMuteWithToast(): void {
  usePlayerStore.getState().toggleMute();
  toast(usePlayerStore.getState().muted ? 'Senyap' : 'Suara aktif');
}

export function shareTrack(): void {
  const { cur } = usePlayerStore.getState();
  const x = trackAt(cur < 0 ? 0 : cur);
  const url = location.href;
  if (navigator.share) {
    navigator.share(x ? { title: x.t, text: `${x.t} — ${x.a} di ZMusic`, url } : { url }).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(url).catch(() => {});
  toast('Tautan disalin');
}

let sleepTimer: ReturnType<typeof setTimeout> | undefined;
export function setSleepTimer(minutes: number): void {
  clearTimeout(sleepTimer);
  if (!minutes) return toast('Timer tidur dimatikan');
  sleepTimer = setTimeout(() => {
    usePlayerStore.getState().pause();
    toast('Timer tidur selesai');
  }, minutes * 60_000);
  toast(`Timer tidur: ${minutes} menit`);
}

export function toggleFollowWithToast(k: number): void {
  if (!requireLogin('Masuk untuk mengikuti artis')) return;
  const following = useLibraryStore.getState().toggleFollow(k);
  const name = useCatalog.getState().artists[k]?.n ?? 'artis';
  toast(following ? `Mulai mengikuti ${name}` : `Berhenti mengikuti ${name}`);
}
