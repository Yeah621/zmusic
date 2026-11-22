import { toast } from '@/stores/ui';
import { useLibraryStore } from '@/stores/library';
import { getAuthPort } from './port';

/** Keluar: akhiri sesi di penyedia akun, lalu kosongkan pengguna di klien (tetap keluar walau jaringan gagal). */
export async function signOutAction(): Promise<void> {
  try {
    await getAuthPort()?.signOut();
  } catch {
    // sesi di server mungkin belum berakhir; pengguna tetap keluar di perangkat ini
  }
  useLibraryStore.getState().setUser(null);
  toast('Kamu telah keluar');
}
