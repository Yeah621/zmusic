import { beforeEach, describe, expect, it } from 'vitest';
import { A, AL, T } from '@/data/mock';
import { coverStyle, genArt, safeArtUrl } from '@/lib/cover-art';
import type { SourceTrack } from '@/lib/sources/types';
import { albumKeyOf, artistKeyOf, effectiveDuration, slug, useCatalog, wordsOfKey } from '@/stores/catalog';

const cat = () => useCatalog.getState();
const tk = (id: string, title: string, artist: string, o: Partial<SourceTrack> = {}): SourceTrack => ({ id: `jamendo:${id}`, source: 'jamendo', title, artist, durationSec: 100, hue: 7, playable: 'full', ...o });

beforeEach(() => cat().reset());

describe('katalog: ingest', () => {
  it('memberi indeks berurutan, membuang id ganda, dan menurunkan artis dan album', () => {
    const ids = cat().ingest([
      tk('1', 'Neon', 'Zara Lune', { album: 'Neon Mint', artworkUrl: 'https://x.test/a.jpg', genre: 'Pop', license: 'CC BY 3.0', sourceUrl: 'https://www.jamendo.com/track/1' }),
      tk('2', 'Pixel', 'Zara Lune', { album: 'Neon Mint' }),
      tk('3', 'Teduh', 'Raya & Senja'),
    ]);
    expect(ids).toEqual([0, 1, 2]);
    expect(cat().ingest([tk('2', 'Pixel', 'Zara Lune')])).toEqual([1]);
    expect(cat().tracks).toHaveLength(3);
    expect(cat().artists.map((a) => [a.n, a.ids])).toEqual([['Zara Lune', [0, 1]], ['Raya & Senja', [2]]]);
    expect(cat().albums.map((a) => [a.n, a.a, a.ids])).toEqual([['Neon Mint', 'Zara Lune', [0, 1]]]);
    expect(cat().albums[0].art).toBe('https://x.test/a.jpg');
    const x = cat().tracks[0];
    expect([x.i, x.id, x.t, x.a, x.g, x.d, x.source, x.playable, x.lic, x.url, x.album, x.ak, x.bk]).toEqual([0, 'jamendo:1', 'Neon', 'Zara Lune', 'Pop', 100, 'jamendo', 'full', 'CC BY 3.0', 'https://www.jamendo.com/track/1', 'Neon Mint', 0, 0]);
    expect(cat().tracks[2].bk).toBeUndefined();
    expect(cat().artists[0].g).toBe('Pop');
  });

  it('artis sama dari sumber berbeda digabung dan sumbernya dicatat; indeks lama tidak berubah', () => {
    cat().ingest([tk('1', 'Neon', 'Zara Lune')]);
    const before = cat().tracks;
    const [j] = cat().ingest([{ ...tk('9', 'Neon Rooftop', 'zara  lune'), id: 'deezer:9', source: 'deezer', playable: 'preview' }]);
    expect(j).toBe(1);
    expect(cat().artists).toHaveLength(1);
    expect(cat().artists[0].src).toEqual(['jamendo', 'deezer']);
    expect(cat().artists[0].ids).toEqual([0, 1]);
    expect(cat().tracks[0]).toBe(before[0]);
  });

  it('ingest tanpa lagu baru tidak mengubah state (tidak memicu render ulang)', () => {
    cat().ingest([tk('1', 'Neon', 'Zara Lune')]);
    const before = cat().tracks;
    cat().ingest([tk('1', 'Neon', 'Zara Lune')]);
    expect(cat().tracks).toBe(before);
  });
});

describe('katalog: kunci URL', () => {
  it('slug: huruf kecil, tanpa tanda baca dan %, huruf non-Latin dipertahankan', () => {
    expect(slug('Raya & Senja')).toBe('raya-senja');
    expect(slug('  AC/DC!! ')).toBe('ac-dc');
    expect(slug('東京事変')).toBe('東京事変');
    expect(artistKeyOf('100% Pure')).toBe('100-pure');
    expect(artistKeyOf('!!!')).toMatch(/^a\d+$/);
    expect(albumKeyOf('Zara Lune', 'Neon Mint')).toBe('zara-lune~neon-mint');
    expect(wordsOfKey('zara-lune')).toBe('zara lune');
    expect(artistKeyOf('Zara Lune').includes('%')).toBe(false);
  });
});

describe('katalog: data contoh', () => {
  it('seedSample sama dengan T, A, dan AL di HTML (indeks, kunci, pendengar, tahun)', () => {
    cat().seedSample();
    expect(cat().tracks.map((x) => [x.i, x.t, x.a, x.g, x.h, x.d])).toEqual(T.map((x) => [x.i, x.t, x.a, x.g, x.h, x.d]));
    expect(cat().artists.map((a) => [a.k, a.n, a.f])).toEqual(A.map((a, i) => [String(i), a.n, a.f]));
    expect(cat().albums.map((a) => [a.k, a.n, a.a, a.y, a.ids])).toEqual(AL.map((a, i) => [String(i), a.n, a.a, a.y, a.t]));
    expect(cat().tracks.every((x) => x.source === 'sample' && x.playable === 'full')).toBe(true);
    expect(cat().tracks[0].ak).toBe(0);
    expect(cat().tracks[7].bk).toBe(0);
    expect(cat().albums[2].ak).toBe(2);
  });

  it('aman dipanggil berulang (tidak menggandakan)', () => {
    cat().seedSample();
    const first = cat().tracks;
    cat().seedSample();
    expect(cat().tracks).toBe(first);
  });
});

describe('cover dan durasi', () => {
  it('artwork asli dilapiskan di atas cover generatif; tanpa artwork hanya generatif', () => {
    const gen = genArt(10, 2);
    expect(coverStyle({ h: 10, i: 2 }).backgroundImage).toBe(gen);
    expect(coverStyle({ h: 10, i: 2, art: 'https://x.test/a.jpg' }).backgroundImage).toBe(`url("https://x.test/a.jpg"), ${gen}`);
  });

  it('URL artwork tidak aman diabaikan atau dinetralkan', () => {
    expect(safeArtUrl('javascript:alert(1)')).toBeNull();
    expect(safeArtUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(safeArtUrl('bukan url')).toBeNull();
    expect(safeArtUrl(undefined)).toBeNull();
    const quoted = safeArtUrl('https://x.test/a".jpg');
    expect(quoted?.includes('"')).toBe(false);
    // tanda kutip di dalam URL dienkode, jadi tidak bisa keluar dari string url("...")
    const css = String(coverStyle({ h: 1, i: 1, art: 'https://x.test/a") ,url("https://jahat.test' }).backgroundImage);
    expect(/^url\("([^"]*)"\), /.exec(css)?.[1]).toBe('https://x.test/a%22)%20,url(%22https://jahat.test');
  });

  it('effectiveDuration: preview dibatasi 30 detik, lagu penuh apa adanya, preview pendek tidak dipanjangkan', () => {
    expect(effectiveDuration({ d: 204, playable: 'preview' })).toBe(30);
    expect(effectiveDuration({ d: 204, playable: 'full' })).toBe(204);
    expect(effectiveDuration({ d: 20, playable: 'preview' })).toBe(20);
  });
});
