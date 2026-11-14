import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlbum, loadArtist, loadHome, loadSearch, toTrack } from '@/lib/data/client';
import { clearResources, resolveResource } from '@/lib/data/resource';
import { DataError } from '@/lib/data/types';
import { resolveStream } from '@/lib/stream-resolver';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';

const cat = () => useCatalog.getState();
const row = (id: string, title: string, artist: string, o: Record<string, unknown> = {}) => ({ id: `jamendo:${id}`, source: 'jamendo', title, artist, durationSec: 120, hue: 5, playable: 'full', ...o });

/** fetch palsu: `handler` memberi isi JSON (atau Response); semua URL tercatat. */
function stubFetch(handler: (url: URL) => unknown) {
  const urls: URL[] = [];
  vi.stubGlobal('fetch', async (input: string) => {
    const url = new URL(input, 'http://localhost');
    urls.push(url);
    const r = handler(url);
    return r instanceof Response ? r : new Response(JSON.stringify(r), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return urls;
}
/** Meniru peramban: `?data=sample` dan sessionStorage. */
function browser(search: string, stored: Record<string, string> = {}) {
  const mem = new Map(Object.entries(stored));
  vi.stubGlobal('window', {});
  vi.stubGlobal('location', { search });
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
}

beforeEach(() => {
  cat().reset();
  clearResources();
  useLibraryStore.setState({ quality: 1 });
});
afterEach(() => vi.unstubAllGlobals());

describe('toTrack: validasi JSON dari API', () => {
  it('menerima lagu valid dan memberi nilai bawaan', () => {
    const t = toTrack({ id: 'deezer:1', source: 'deezer', title: 'A', artist: 'B', durationSec: 100.4, playable: 'preview', artworkUrl: 'https://x.test/a.jpg', album: 'C', sourceUrl: 'https://www.deezer.com/track/1' });
    expect([t?.id, t?.durationSec, t?.playable, t?.album, t?.artworkUrl]).toEqual(['deezer:1', 100, 'preview', 'C', 'https://x.test/a.jpg']);
    expect(typeof t?.hue).toBe('number');
    expect(toTrack(row('2', 'T', 'A', { playable: 'apa saja' }))?.playable).toBe('full');
  });
  it('alamat selain http(s) di artwork dan tautan sumber diabaikan (mencegah javascript: di href)', () => {
    const t = toTrack(row('1', 'T', 'A', { artworkUrl: 'javascript:alert(1)', sourceUrl: 'data:text/html,<b>x</b>' }));
    expect([t?.artworkUrl, t?.sourceUrl]).toEqual([undefined, undefined]);
    expect(toTrack(row('1', 'T', 'A', { sourceUrl: 'https://www.jamendo.com/track/1' }))?.sourceUrl).toBe('https://www.jamendo.com/track/1');
  });
  it('membuang lagu tanpa id, judul, artis, sumber dikenal, atau durasi', () => {
    for (const bad of [null, 'x', [], {}, row('1', '', 'A'), row('1', 'T', ''), row('1', 'T', 'A', { source: 'spotify' }), row('1', 'T', 'A', { durationSec: 0 }), row('1', 'T', 'A', { durationSec: 'x' }), { ...row('1', 'T', 'A'), id: '' }]) expect(toTrack(bad)).toBeNull();
  });
});

describe('loadHome', () => {
  it('meminta 50 lagu, memasukkannya ke katalog, dan menurunkan rak artis dan album', async () => {
    const urls = stubFetch(() => ({ tracks: [row('1', 'Neon', 'Zara Lune', { album: 'Neon Mint' }), row('2', 'Pixel', 'Zara Lune', { album: 'Neon Mint' }), row('3', 'Teduh', 'Raya & Senja'), { rusak: true }], warnings: [] }));
    const d = await loadHome('Semua');
    expect(urls.map((u) => u.pathname + u.search)).toEqual(['/api/home?limit=50']);
    expect(d).toEqual({ ids: [0, 1, 2], artists: [0, 1], albums: [0] });
    expect(cat().tracks).toHaveLength(3);
  });
  it('genre dikirim sebagai parameter; hasil kedua tidak menggandakan indeks', async () => {
    const urls = stubFetch(() => ({ tracks: [row('1', 'Neon', 'Zara Lune')], warnings: [] }));
    await loadHome('Semua');
    const pop = await loadHome('Pop');
    expect(urls[1].searchParams.get('genre')).toBe('Pop');
    expect(pop.ids).toEqual([0]);
    expect(cat().tracks).toHaveLength(1);
  });
  it('semua sumber gagal (kosong + peringatan) = galat; satu sumber gagal = tetap berhasil', async () => {
    stubFetch(() => ({ tracks: [], warnings: [{ source: 'deezer', message: 'Gagal' }] }));
    await expect(loadHome('Semua')).rejects.toThrow('Sumber musik sedang tidak bisa dijangkau');
    stubFetch(() => ({ tracks: [row('1', 'Neon', 'Zara Lune')], warnings: [{ source: 'deezer', message: 'Gagal' }] }));
    expect((await loadHome('Semua')).ids).toEqual([0]);
  });
  it('jaringan putus = DataError offline; 429 dan 5xx punya pesan sendiri; JSON rusak ditolak', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('gagal');
    });
    const off = await loadHome('Semua').catch((e: unknown) => e);
    expect(off instanceof DataError && off.offline).toBe(true);
    stubFetch(() => new Response('{}', { status: 429 }));
    await expect(loadHome('Semua')).rejects.toThrow('Terlalu banyak permintaan');
    stubFetch(() => new Response('{}', { status: 502 }));
    await expect(loadHome('Semua')).rejects.toThrow('Gagal memuat dari sumber musik');
    stubFetch(() => new Response('bukan json', { status: 200 }));
    await expect(loadHome('Semua')).rejects.toThrow('tidak terbaca');
  });
});

describe('loadSearch', () => {
  it('artis dan album hanya yang namanya cocok dengan kata kunci (seperti HTML)', async () => {
    const urls = stubFetch(() => ({ tracks: [row('1', 'Neon Mint', 'Zara Lune', { album: 'Neon Mint' }), row('2', 'Zara', 'Kairo', { album: 'Garasi' })], warnings: [] }));
    const d = await loadSearch('zara');
    expect(urls[0].searchParams.get('q')).toBe('zara');
    expect(urls[0].searchParams.get('limit')).toBe('30');
    expect(d.ids).toEqual([0, 1]);
    expect(d.artists.map((i) => cat().artists[i].n)).toEqual(['Zara Lune']);
    expect(d.albums.map((i) => cat().albums[i].n)).toEqual(['Neon Mint']);
  });
});

describe('loadArtist dan loadAlbum (diturunkan dari pencarian)', () => {
  const tracks = [row('1', 'Neon Mint', 'Zara Lune', { album: 'Neon Mint' }), row('2', 'Pixel Rain', 'Zara Lune', { album: 'Neon Mint' }), row('3', 'Teduh', 'Raya & Senja', { album: 'Senja di Kota' })];
  it('artis: mencari nama dari kunci lalu mengembalikan lagu dan albumnya', async () => {
    const urls = stubFetch(() => ({ tracks, warnings: [] }));
    const d = await loadArtist('zara-lune');
    expect(urls[0].searchParams.get('q')).toBe('zara lune');
    expect(d?.ids).toEqual([0, 1]);
    expect(d?.albums).toEqual([0]);
    expect(cat().artists[d?.artist ?? -1].n).toBe('Zara Lune');
  });
  it('artis tidak dikenal = null; gagal memuat + tidak dikenal = galat; gagal memuat + sudah ada di katalog = tetap tampil', async () => {
    stubFetch(() => ({ tracks, warnings: [] }));
    expect(await loadArtist('tidak-ada')).toBeNull();
    stubFetch(() => new Response('{}', { status: 502 }));
    await expect(loadArtist('orang-baru')).rejects.toThrow();
    expect((await loadArtist('zara-lune'))?.ids).toEqual([0, 1]);
  });
  it('album: kunci artis~judul, mencari judul + artis', async () => {
    const urls = stubFetch(() => ({ tracks, warnings: [] }));
    const d = await loadAlbum('zara-lune~neon-mint');
    expect(urls[0].searchParams.get('q')).toBe('neon mint zara lune');
    expect(d?.ids).toEqual([0, 1]);
    expect(await loadAlbum('zara-lune~album-lain')).toBeNull();
    expect(await loadAlbum('rusak')).toBeNull();
  });
});

describe('mode contoh (?data=sample): tanpa jaringan, sama dengan HTML Fase 1', () => {
  it('beranda, pencarian, artis, dan album dijawab dari data contoh', async () => {
    browser('?data=sample');
    const urls = stubFetch(() => ({}));
    expect((await loadHome('Pop')).ids).toEqual([2, 8, 12]);
    expect((await loadHome('Semua')).artists).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect((await loadSearch('lo-fi')).ids).toEqual([1, 7, 11]);
    expect((await loadArtist('0'))?.ids).toEqual([0, 7, 10]);
    expect((await loadArtist('0'))?.albums).toEqual([0]);
    expect((await loadAlbum('3'))?.ids).toEqual([3, 9, 13]);
    expect(await loadArtist('99')).toBeNull();
    expect(await loadArtist('zara-lune')).toBeNull();
    expect(await loadAlbum('abc')).toBeNull();
    expect(urls).toHaveLength(0);
  });
  it('pilihan bertahan di sessionStorage dan dicabut dengan ?data=live', async () => {
    browser('?data=sample');
    expect((await loadHome('Pop')).ids).toEqual([2, 8, 12]);
    vi.unstubAllGlobals();
    browser('', { 'zm-data': 'sample' });
    expect((await loadHome('Pop')).ids).toEqual([2, 8, 12]);
    vi.unstubAllGlobals();
    browser('?data=live', { 'zm-data': 'sample' });
    cat().reset();
    stubFetch(() => ({ tracks: [row('1', 'Neon', 'Zara Lune')], warnings: [] }));
    expect((await loadHome('Semua')).ids).toEqual([0]);
  });
});

describe('cache pemuatan (resolveResource)', () => {
  it('satu permintaan untuk pemanggil serentak; hasil dipakai ulang; galat tidak di-cache', async () => {
    let n = 0;
    const ok = async () => ++n;
    const [a, b] = await Promise.all([resolveResource('k', ok), resolveResource('k', ok)]);
    expect([a, b, n]).toEqual([1, 1, 1]);
    expect(await resolveResource('k', ok)).toBe(1);
    expect(n).toBe(1);
    let tries = 0;
    const flaky = async () => {
      if (++tries === 1) throw new Error('gagal');
      return 'ok';
    };
    await expect(resolveResource('x', flaky)).rejects.toThrow('gagal');
    expect(await resolveResource('x', flaky)).toBe('ok');
    expect(tries).toBe(2);
  });
});

describe('resolveStream: stream nyata untuk lagu sumber luar', () => {
  const ingest = (source: 'deezer' | 'jamendo', playable: 'full' | 'preview') => cat().ingest([{ id: `${source}:7`, source, title: 'T', artist: 'A', durationSec: 200, hue: 1, playable }])[0];

  it('lagu penuh: URL dari server, tanpa batas; kualitas ikut pengaturan', async () => {
    const i = ingest('jamendo', 'full');
    const urls = stubFetch(() => ({ url: 'https://cdn.test/a.mp3', kind: 'mp3', playable: 'full' }));
    useLibraryStore.setState({ quality: 2 });
    expect(await resolveStream(i)).toEqual({ url: 'https://cdn.test/a.mp3', kind: 'mp3', limitSec: undefined });
    expect(urls[0].pathname).toBe('/api/stream/jamendo%3A7');
    expect(urls[0].searchParams.get('q')).toBe('2');
  });
  it('lagu preview dibatasi 30 detik (juga bila server hanya mengirim playable)', async () => {
    const i = ingest('deezer', 'preview');
    stubFetch(() => ({ url: 'https://cdn.test/p.mp3', kind: 'mp3', playable: 'preview' }));
    expect((await resolveStream(i))?.limitSec).toBe(30);
    stubFetch(() => ({ url: 'https://cdn.test/p.mp3', kind: 'mp3' }));
    expect((await resolveStream(i))?.limitSec).toBe(30);
  });
  it('lagu contoh dan indeks tak dikenal = null (jam simulasi); galat server dan jawaban rusak dilempar', async () => {
    cat().seedSample();
    stubFetch(() => ({}));
    expect(await resolveStream(0)).toBeNull();
    expect(await resolveStream(999)).toBeNull();
    cat().reset();
    const i = ingest('jamendo', 'full');
    stubFetch(() => new Response('{}', { status: 404 }));
    await expect(resolveStream(i)).rejects.toThrow('404');
    stubFetch(() => ({ url: 'https://cdn.test/a.mp3', kind: 'wav-aneh' }));
    await expect(resolveStream(i)).rejects.toThrow('tidak valid');
    stubFetch(() => ({ kind: 'mp3' }));
    await expect(resolveStream(i)).rejects.toThrow('tidak valid');
  });
  it('mode demo (?audio=) menggantikan stream untuk semua lagu dan tidak memanggil server', async () => {
    const i = ingest('jamendo', 'full');
    browser('?audio=preview');
    const urls = stubFetch(() => ({}));
    expect(await resolveStream(i)).toEqual({ url: '/demo.wav', kind: 'mp3', limitSec: 2 });
    expect(urls).toHaveLength(0);
  });
});
