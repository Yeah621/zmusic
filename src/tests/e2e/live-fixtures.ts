import type { Page, Route } from '@playwright/test';

/** Lagu seperti yang dikembalikan /api/home dan /api/search (bentuk SourceTrack). Data SINTETIS untuk uji, bukan katalog nyata. */
export interface ApiTrack {
  id: string;
  source: 'jamendo' | 'audius' | 'deezer';
  title: string;
  artist: string;
  genre?: string;
  durationSec: number;
  artworkUrl?: string;
  hue: number;
  playable: 'full' | 'preview';
  license?: string;
  album?: string;
  sourceUrl?: string;
}

const art = (n: string) => `https://art.test/${n}.svg`;
const jm = (id: number, title: string, artist: string, o: Partial<ApiTrack> = {}): ApiTrack => ({ id: `jamendo:${id}`, source: 'jamendo', title, artist, durationSec: 200, hue: 40 + id, playable: 'full', license: 'CC BY-NC-SA 3.0', sourceUrl: `https://www.jamendo.com/track/${id}`, ...o });
const au = (id: string, title: string, artist: string, o: Partial<ApiTrack> = {}): ApiTrack => ({ id: `audius:${id}`, source: 'audius', title, artist, durationSec: 180, hue: 200, playable: 'full', sourceUrl: `https://audius.co/t/${id}`, ...o });
const dz = (id: number, title: string, artist: string, o: Partial<ApiTrack> = {}): ApiTrack => ({ id: `deezer:${id}`, source: 'deezer', title, artist, durationSec: 221, hue: 300, playable: 'preview', sourceUrl: `https://www.deezer.com/track/${id}`, ...o });

/** Urutan seperti agregator: lagu penuh (Jamendo dan Audius bergantian) lebih dulu, lalu preview Deezer. */
export const LIVE_TRACKS: ApiTrack[] = [
  jm(101, 'Fajar Pertama', 'Lintang', { genre: 'Akustik', album: 'Fajar', artworkUrl: art('fajar') }),
  au('a1', 'Midnight Drive', 'KAIRO', { genre: 'Electronic' }),
  jm(102, 'Embun Pagi', 'Lintang', { genre: 'Akustik', album: 'Fajar', artworkUrl: art('fajar') }),
  au('a2', 'Turbo', 'KAIRO', { genre: 'Electronic' }),
  jm(103, 'Kopi & Kamu', 'Bumi Akustik', { genre: 'Akustik', album: 'Akustik Pagi', artworkUrl: art('kopi') }),
  au('a3', 'Neon Mint', 'Zara Lune', { genre: 'Electronic' }),
  jm(104, 'Teduh', 'Raya & Senja', { genre: 'Lo-fi' }),
  dz(301, 'Aurora Kita', 'Nadin Skye', { genre: 'Pop', album: 'Aurora', artworkUrl: art('aurora') }),
  dz(302, 'Satu Semesta', 'Nadin Skye', { genre: 'Pop', album: 'Aurora', artworkUrl: art('aurora') }),
  dz(303, 'Gelombang', 'Oshi', { genre: 'Hip-hop', album: 'Gelombang', artworkUrl: art('gelombang') }),
  dz(304, 'Neon Rooftop', 'Zara Lune', { genre: 'Electronic', album: 'Neon Mint', artworkUrl: art('neon') }),
  dz(305, 'Langit Biru', 'Nadin Skye', { genre: 'Pop', album: 'Aurora', artworkUrl: art('aurora') }),
];

/** WAV 8-bit mono hening, `seconds` detik: cukup panjang untuk menguji batas preview 30 detik. */
export function silentWav(seconds: number, rate = 8000): Buffer {
  const n = seconds * rate;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36);
  b.writeUInt32LE(n, 40);
  return b;
}

export interface MockOptions {
  /** /api/home dan /api/search membalas "semua sumber gagal" selama true */
  failing?: { value: boolean };
  /** stream preview memakai WAV 35 detik (/long.wav) agar batas 30 detik teruji */
  longPreview?: boolean;
  /** tunda balasan /api/home dan /api/search (ms) menurut URL, untuk menguji keadaan memuat */
  slow?: (u: URL) => number;
}

/**
 * Palsukan /api/* dan gambar sampul di tingkat peramban. Server asli (route handler + adapter) diuji terpisah di
 * unit/api-routes.test.ts; di sini yang diuji adalah klien: pemuatan, katalog, tampilan, dan pemutaran.
 * Mengembalikan daftar permintaan API (path + query) untuk asersi.
 */
export async function mockApi(page: Page, o: MockOptions = {}): Promise<string[]> {
  const calls: string[] = [];
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('https://art.test/**', (r) => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#369"/></svg>' }));
  await page.context().route('https://www.jamendo.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<title>Jamendo</title>' }));
  await page.route('**/long.wav', (r) => r.fulfill({ contentType: 'audio/wav', body: silentWav(35) }));
  await page.route('**/api/**', async (route) => {
    const u = new URL(route.request().url());
    calls.push(u.pathname + u.search);
    const wait = o.slow?.(u) ?? 0;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (u.pathname === '/api/home' || u.pathname === '/api/search') {
      if (o.failing?.value) return json(route, { tracks: [], warnings: [{ source: 'deezer', message: 'Gagal' }] });
      const genre = u.searchParams.get('genre');
      const words = (u.searchParams.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
      const hit = u.pathname === '/api/home' ? LIVE_TRACKS.filter((t) => !genre || t.genre === genre) : LIVE_TRACKS.filter((t) => words.every((w) => `${t.title} ${t.artist} ${t.album ?? ''}`.toLowerCase().includes(w))); // seperti mesin cari: semua kata, urutan bebas
      return json(route, { tracks: hit, warnings: [] });
    }
    const m = /^\/api\/stream\/(.+)$/.exec(u.pathname);
    const t = m ? LIVE_TRACKS.find((x) => x.id === decodeURIComponent(m[1])) : undefined;
    if (!t) return json(route, { error: 'tidak ditemukan' }, 404);
    const url = t.playable === 'preview' && o.longPreview ? '/long.wav' : `/demo.wav?via=${t.source}`;
    return json(route, { url, kind: 'mp3', playable: t.playable });
  });
  return calls;
}
