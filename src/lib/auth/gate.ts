import { navigate } from '@/lib/navigate';
import { useLibraryStore } from '@/stores/library';
import { toast } from '@/stores/ui';

/**
 * Gerbang tamu (padanan gate() di HTML) untuk aksi yang butuh akun: suka, ikuti, playlist, komentar, unggah.
 * Pengguna masuk: true. Tamu: toast alasan, bawa ke /login, false. Selama status masuk belum diketahui (sesi sedang dibaca)
 * aksi diabaikan tanpa pesan, supaya pengguna yang sebenarnya sudah masuk tidak ditolak.
 */
export function requireLogin(reason: string): boolean {
  const { user, authReady } = useLibraryStore.getState();
  if (user) return true;
  if (!authReady) return false;
  toast(reason);
  navigate('/login');
  return false;
}
