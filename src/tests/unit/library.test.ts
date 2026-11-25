import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGuest, loadGuest, saveGuest } from '@/lib/library/guest';
import { rowToRemoteArtist, rowToRemoteTrack, trackForStorage } from '@/lib/library/map';
import { createMemoryRepo } from '@/lib/library/memory-repo';
import { bindLibrary, unbindLibrary } from '@/lib/library/session';
import { startLibrarySync } from '@/lib/library/sync';
import type { SourceTrack } from '@/lib/sources/types';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';

const st = (id: string, artist: string, o: Partial<SourceTrack> = {}): SourceTrack => ({ id, source: id.split(':')[0] as SourceTrack['source'], title: `Lagu ${id}`, artist, durationSec: 200, hue: 40, playable: 'full', ...o });
const TRACKS = [st('jamendo:1', 'Zara Lune', { album: 'Neon Mint', license: 'CC BY 3.0' }), st('deezer:2', 'Nadin Skye', { playable: 'preview' }), st('audius:A3', 'KAIRO')];
const settle = () => new Promise<void>((r) => setTimeout(r, 15));
const lib = () => useLibraryStore.getState();

function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), has: (k: string) => m.has(k) };
}
function browser(sample: boolean, ls = fakeStorage()) {
  const mem = new Map(sample ? [['zm-data', 'sample']] : []);
  vi.stubGlobal('window', {});
  vi.stubGlobal('location', { search: '' });
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  vi.stubGlobal('localStorage', ls);
  return ls;
}

beforeEach(() => {
  unbindLibrary();
  useCatalog.getState().reset();
  useCatalog.getState().ingest(TRACKS); // indeks 0, 1, 2 (artis 0, 1, 2)
  useLibraryStore.setState({ likes: [], follows: [], recents: [] });
  usePlayerStore.setState({ hist: [], cur: -1 });
});
afterEach(() => vi.unstubAllGlobals());

describe('pemetaan baris database', () => {
  const row = { id: 'u-1', source: 'jamendo', source_id: '1', title: 'Neon', genre: 'Pop', duration_sec: 200, hue: 40, artwork_url: 'https://x.test/a.jpg', license: 'CC BY 3.0', source_url: 'https://www.jamendo.com/track/1', playable: 'full', artists: { name: 'Zara Lune' }, albums: { title: 'Neon Mint' } };
  it('baris tracks (join artis dan album) menjadi lagu katalog dengan id global', () => {
    const r = rowToRemoteTrack(row);
    expect(r?.trackId).toBe('u-1');
    expect([r?.track.id, r?.track.artist, r?.track.album, r?.track.durationSec, r?.track.license]).toEqual(['jamendo:1', 'Zara Lune', 'Neon Mint', 200, 'CC BY 3.0']);
    expect(rowToRemoteTrack({ ...row, artists: [{ name: 'Zara Lune' }], albums: [] })?.track.album).toBeUndefined(); // bentuk larik
    expect(rowToRemoteTrack({ ...row, source: 'upload', source_id: null })?.track.id).toBe('upload:u-1');
  });
  it('baris rusak atau tidak lengkap ditolak; alamat tidak aman dibuang', () => {
    for (const bad of [null, 'x', {}, { ...row, title: '' }, { ...row, artists: null }, { ...row, duration_sec: 0 }, { ...row, source: 'spotify' }, { ...row, source_id: null }]) expect(rowToRemoteTrack(bad)).toBeNull();
    const r = rowToRemoteTrack({ ...row, artwork_url: 'javascript:alert(1)', source_url: 'data:text/html,x' });
    expect([r?.track.artworkUrl, r?.track.sourceUrl]).toEqual([undefined, undefined]);
  });
  it('baris follows menjadi artis; lagu contoh tidak disimpan', () => {
    expect(rowToRemoteArtist({ artist_id: 'a-1', artists: { name: 'Zara Lune', source: 'jamendo' } })).toEqual({ artistId: 'a-1', name: 'Zara Lune', source: 'jamendo' });
    expect(rowToRemoteArtist({ artist_id: 'a-1', artists: null })).toBeNull();
    expect(trackForStorage({ id: 'sample:0', source: 'sample', t: 'x', a: 'y', g: '', d: 1, h: 1, playable: 'full' })).toBeNull();
    expect(trackForStorage({ id: 'jamendo:1', source: 'jamendo', t: 'x', a: 'y', g: 'Pop', d: 9, h: 1, playable: 'full' })?.genre).toBe('Pop');
  });
});

describe('sinkronisasi koleksi (P3-04)', () => {
  it('suka dan batal suka tersimpan di akun; uuid lagu di-cache sehingga ensure hanya sekali', async () => {
    const repo = createMemoryRepo();
    const stop = startLibrarySync(repo, () => {});
    await settle();
    lib().toggleLike(0);
    await settle();
    expect(repo.state().likes.map((l) => l.track.id)).toEqual(['jamendo:1']);
    lib().toggleLike(0);
    await settle();
    expect(repo.state().likes).toEqual([]);
    expect(repo.calls.filter((c) => c === 'ensure')).toHaveLength(1);
    stop();
  });

  it('gagal menyimpan suka: dibatalkan di UI dan pengguna diberi tahu', async () => {
    const repo = createMemoryRepo();
    const msgs: string[] = [];
    startLibrarySync(repo, (m) => msgs.push(m));
    await settle();
    repo.failNext(1, 'like');
    lib().toggleLike(1);
    await settle();
    expect(lib().likes).toEqual([]);
    expect(msgs).toEqual(['Gagal menyimpan suka. Coba lagi.']);
    expect(repo.calls.filter((c) => c === 'like')).toHaveLength(1); // pembatalan tidak memicu penyimpanan lagi
  });

  it('gagal membatalkan suka: suka dikembalikan di UI', async () => {
    const repo = createMemoryRepo();
    const msgs: string[] = [];
    startLibrarySync(repo, (m) => msgs.push(m));
    await settle();
    lib().toggleLike(0);
    await settle();
    repo.failNext(1, 'unlike');
    lib().toggleLike(0);
    await settle();
    expect(lib().likes).toEqual([0]);
    expect(msgs).toEqual(['Gagal membatalkan suka. Coba lagi.']);
  });

  it('ikuti dan berhenti mengikuti artis; gagal = dibatalkan', async () => {
    const repo = createMemoryRepo();
    const msgs: string[] = [];
    startLibrarySync(repo, (m) => msgs.push(m));
    await settle();
    lib().toggleFollow(0);
    await settle();
    expect(repo.state().follows.map((a) => a.name)).toEqual(['Zara Lune']);
    lib().toggleFollow(0);
    await settle();
    expect(repo.state().follows).toEqual([]);
    repo.failNext(1, 'follow');
    lib().toggleFollow(2);
    await settle();
    expect(lib().follows).toEqual([]);
    expect(msgs).toEqual(['Gagal menyimpan ikutan. Coba lagi.']);
  });

  it('riwayat putar: lagu yang sama hanya satu baris dan pindah ke depan', async () => {
    const repo = createMemoryRepo();
    startLibrarySync(repo, () => {});
    await settle();
    const p = usePlayerStore.getState();
    p.play(0);
    p.play(1, true);
    p.play(0, true);
    await settle();
    expect(repo.state().history.map((h) => h.track.id)).toEqual(['jamendo:1', 'deezer:2']);
  });

  it('riwayat cari: tersimpan, terhapus, dan batas 6 ikut ke akun', async () => {
    const repo = createMemoryRepo();
    startLibrarySync(repo, () => {});
    await settle();
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) lib().pushRecent(q);
    await settle();
    expect(lib().recents).toEqual(['g', 'f', 'e', 'd', 'c', 'b']);
    expect(repo.state().searches).toEqual(['g', 'f', 'e', 'd', 'c', 'b']);
    lib().removeRecent(0);
    await settle();
    expect(repo.state().searches).toEqual(['f', 'e', 'd', 'c', 'b']);
  });

  it('urutan dijaga: suka lalu batal suka cepat-cepat berakhir tidak disukai', async () => {
    const repo = createMemoryRepo();
    startLibrarySync(repo, () => {});
    await settle();
    lib().toggleLike(2);
    lib().toggleLike(2);
    await settle();
    expect(repo.state().likes).toEqual([]);
    expect(repo.calls.filter((c) => ['like', 'unlike'].includes(c))).toEqual(['like', 'unlike']);
  });

  it('memuat koleksi akun saat mulai (perangkat lain): suka, ikuti, riwayat, dan riwayat cari muncul', async () => {
    const repo = createMemoryRepo();
    const e = await repo.ensure([TRACKS[0], TRACKS[1]]);
    await repo.like(e['jamendo:1']?.trackId as string);
    await repo.follow(e['deezer:2']?.artistId as string);
    await repo.touchHistory(e['deezer:2']?.trackId as string);
    await repo.addSearch('akustik');
    useCatalog.getState().reset(); // perangkat baru: katalog kosong
    startLibrarySync(repo, () => {});
    await settle();
    const cat = useCatalog.getState();
    expect(lib().likes.map((i) => cat.tracks[i].id)).toEqual(['jamendo:1']);
    expect(lib().follows.map((i) => cat.artists[i].n)).toEqual(['Nadin Skye']);
    expect(usePlayerStore.getState().hist.map((i) => cat.tracks[i].id)).toEqual(['deezer:2']);
    expect(lib().recents).toEqual(['akustik']);
    const before = repo.calls.length;
    lib().toggleLike(lib().likes[0]); // batal suka lagu yang dimuat: tanpa ensure ulang
    await settle();
    expect(repo.calls.slice(before)).toEqual(['unlike']);
  });

  it('data tamu di localStorage dipindah ke akun lalu dihapus', async () => {
    const ls = browser(false, fakeStorage());
    saveGuest({ recents: ['lo-fi', 'kairo'], history: [TRACKS[0]] });
    expect(ls.has('zm-guest')).toBe(true);
    const repo = createMemoryRepo();
    startLibrarySync(repo, () => {});
    await settle();
    expect(repo.state().searches.sort()).toEqual(['kairo', 'lo-fi']);
    expect(repo.state().history.map((h) => h.track.id)).toEqual(['jamendo:1']);
    expect(lib().recents).toEqual(['lo-fi', 'kairo']);
    expect(ls.has('zm-guest')).toBe(false);
  });

  it('lagu contoh (mode contoh) tidak pernah disimpan', async () => {
    useCatalog.getState().reset();
    useCatalog.getState().seedSample();
    const repo = createMemoryRepo();
    startLibrarySync(repo, () => {});
    await settle();
    lib().toggleLike(3);
    lib().toggleFollow(1);
    usePlayerStore.getState().play(3);
    await settle();
    expect(lib().likes).toEqual([3]);
    expect(repo.calls).toEqual(['load']);
  });

  it('gagal memuat: pengguna diberi tahu, aksi berikutnya tetap tersimpan', async () => {
    const repo = createMemoryRepo();
    repo.failNext(1, 'load');
    const msgs: string[] = [];
    startLibrarySync(repo, (m) => msgs.push(m));
    await settle();
    expect(msgs).toEqual(['Gagal memuat koleksi dari akun. Coba muat ulang halaman.']);
    lib().toggleLike(0);
    await settle();
    expect(repo.state().likes).toHaveLength(1);
  });

  it('setelah berhenti, perubahan tidak disimpan lagi', async () => {
    const repo = createMemoryRepo();
    const stop = startLibrarySync(repo, () => {});
    await settle();
    stop();
    lib().toggleLike(0);
    await settle();
    expect(repo.state().likes).toEqual([]);
  });
});

describe('koleksi per status masuk (bindLibrary) dan penyimpanan tamu', () => {
  it('tamu: riwayat cari dan putar tersimpan di localStorage; data pengguna sebelumnya tidak terbawa', async () => {
    const ls = browser(false);
    bindLibrary({ id: 'user-1' });
    await settle();
    lib().pushRecent('rahasia pengguna 1');
    bindLibrary(null); // keluar: koleksi dikosongkan
    expect(lib().recents).toEqual([]);
    expect(lib().likes).toEqual([]);
    lib().pushRecent('lo-fi');
    usePlayerStore.getState().play(0);
    await new Promise((r) => setTimeout(r, 450)); // jeda simpan 400 ms
    expect(JSON.parse(ls.getItem('zm-guest') ?? 'null')).toEqual({ recents: ['lo-fi'], history: [{ ...TRACKS[0], genre: undefined, artworkUrl: undefined, license: 'CC BY 3.0', sourceUrl: undefined }] });
  });

  it('berpindah akun langsung tidak membawa data akun pertama ke akun kedua', async () => {
    browser(false);
    bindLibrary({ id: 'user-1' });
    await settle();
    lib().pushRecent('milik satu');
    bindLibrary({ id: 'user-2' });
    expect(lib().recents).toEqual([]);
  });

  it('memanggil bindLibrary dengan pengguna yang sama tidak mengulang sinkronisasi', async () => {
    browser(true);
    bindLibrary({ id: 'sample' });
    lib().pushRecent('x');
    bindLibrary({ id: 'sample' });
    expect(lib().recents).toEqual(['x']);
  });

  it('data tamu rusak atau tidak ada tidak melempar galat', () => {
    browser(false, fakeStorage({ 'zm-guest': '{rusak' }));
    expect(loadGuest()).toEqual({ recents: [], history: [] });
    clearGuest();
    expect(loadGuest()).toEqual({ recents: [], history: [] });
  });
});
