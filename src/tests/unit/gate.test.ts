import { beforeEach, describe, expect, it } from 'vitest';
import { toggleFollowWithToast, toggleLikeWithToast } from '@/lib/actions';
import { requireLogin } from '@/lib/auth/gate';
import { navigate, setNavigator } from '@/lib/navigate';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { useUiStore } from '@/stores/ui';

const visited: string[] = [];
const ANI = { id: 'u1', name: 'Ani', handle: 'ani' };
const toastText = () => useUiStore.getState().toast?.message ?? null;

beforeEach(() => {
  visited.length = 0;
  setNavigator((p) => void visited.push(p));
  useCatalog.getState().reset();
  useCatalog.getState().seedSample();
  useLibraryStore.setState({ user: null, authReady: true, likes: [], follows: [] });
  useUiStore.setState({ toast: null, toastShown: false });
});

describe('requireLogin: gerbang tamu', () => {
  it('pengguna masuk lolos tanpa pesan dan tanpa pindah halaman', () => {
    useLibraryStore.setState({ user: ANI });
    expect(requireLogin('Masuk untuk apa saja')).toBe(true);
    expect(toastText()).toBeNull();
    expect(visited).toEqual([]);
  });
  it('tamu: toast alasan lalu dibawa ke /login', () => {
    expect(requireLogin('Masuk untuk menyukai lagu')).toBe(false);
    expect(toastText()).toBe('Masuk untuk menyukai lagu');
    expect(visited).toEqual(['/login']);
  });
  it('selama status masuk belum diketahui aksi diabaikan tanpa pesan (tidak menolak pengguna yang sudah masuk)', () => {
    useLibraryStore.setState({ authReady: false });
    expect(requireLogin('Masuk untuk apa saja')).toBe(false);
    expect(toastText()).toBeNull();
    expect(visited).toEqual([]);
  });
  it('navigate tanpa navigator terdaftar tidak melempar galat', () => {
    setNavigator(null);
    expect(() => navigate('/login')).not.toThrow();
  });
});

describe('aksi yang butuh akun', () => {
  it('tamu tidak bisa menyukai atau mengikuti: tidak ada yang tersimpan, diarahkan ke /login', () => {
    toggleLikeWithToast(3);
    expect(useLibraryStore.getState().likes).toEqual([]);
    expect(toastText()).toBe('Masuk untuk menyukai lagu');
    toggleFollowWithToast(1);
    expect(useLibraryStore.getState().follows).toEqual([]);
    expect(toastText()).toBe('Masuk untuk mengikuti artis');
    expect(visited).toEqual(['/login', '/login']);
  });
  it('pengguna masuk menyukai dan mengikuti seperti biasa', () => {
    useLibraryStore.setState({ user: ANI });
    toggleLikeWithToast(3);
    expect(useLibraryStore.getState().likes).toEqual([3]);
    expect(toastText()).toBe('Ditambahkan ke Lagu Disukai');
    toggleFollowWithToast(1);
    expect(useLibraryStore.getState().follows).toEqual([1]);
    expect(visited).toEqual([]);
  });
});
