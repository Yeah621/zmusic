import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as home } from '@/app/api/home/route';
import { GET as search } from '@/app/api/search/route';
import { GET as stream } from '@/app/api/stream/[id]/route';
import deezerChart from '../fixtures/sources/deezer-chart.json';

// Route handler diuji ujung ke ujung (route → agregator → adapter Deezer) dengan fetch palsu berisi fixture sintetis.
const KEYS = ['AUDIUS_API_KEY', 'JAMENDO_CLIENT_ID', 'ENABLE_AUDIUS', 'ENABLE_JAMENDO', 'ENABLE_DEEZER'];
let saved: Record<string, string | undefined> = {};
const urls: URL[] = [];

function upstream(status = 200) {
  urls.length = 0;
  vi.stubGlobal('fetch', async (input: string) => {
    const url = new URL(String(input));
    urls.push(url);
    if (status !== 200) return new Response('{}', { status });
    const track = /^\/track\/(\d+)/.exec(url.pathname);
    const body = track ? (deezerChart.data.find((d) => String(d.id) === track[1]) ?? { error: { code: 800, message: 'no data' } }) : deezerChart;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}
const req = (path: string) => new NextRequest(`http://localhost${path}`);

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k]; // tanpa kunci: hanya Deezer yang aktif
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

describe('GET /api/home', () => {
  it('lagu tren Deezer berlabel preview + rak artis dan album, cache CDN 10 menit', async () => {
    upstream();
    const res = await home(req('/api/home?limit=5'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=600');
    const j = (await res.json()) as { tracks: { source: string; playable: string; id: string }[]; artists: unknown[]; albums: unknown[]; warnings: unknown[] };
    expect(j.tracks.length).toBeGreaterThan(0);
    expect(j.tracks.every((t) => t.source === 'deezer' && t.playable === 'preview' && t.id.startsWith('deezer:'))).toBe(true);
    expect(j.artists.length).toBeGreaterThan(0);
    expect(j.warnings).toEqual([]);
  });
  it('genre dipetakan ke chart genre Deezer; limit dibatasi 1..50', async () => {
    upstream();
    await home(req('/api/home?genre=Pop&limit=999'));
    expect(urls[0].pathname).toBe('/chart/132/tracks');
    expect(urls[0].searchParams.get('limit')).toBe('50');
  });
  it('semua sumber gagal: tetap 200 dengan daftar kosong dan peringatan (klien menampilkan galat)', async () => {
    upstream(500);
    const j = (await (await home(req('/api/home'))).json()) as { tracks: unknown[]; warnings: { source: string }[] };
    expect(j.tracks).toEqual([]);
    expect(j.warnings.map((w) => w.source)).toEqual(['deezer']);
  });
});

describe('GET /api/search', () => {
  it('kata kunci kosong tidak memanggil sumber', async () => {
    upstream();
    expect(await (await search(req('/api/search?q=%20'))).json()).toEqual({ tracks: [], warnings: [] });
    expect(urls).toHaveLength(0);
  });
  it('mencari di sumber dan meneruskan kata kunci', async () => {
    upstream();
    const j = (await (await search(req('/api/search?q=aurora&limit=3'))).json()) as { tracks: unknown[] };
    expect(urls[0].pathname).toBe('/search');
    expect(urls[0].searchParams.get('q')).toBe('aurora');
    expect(j.tracks.length).toBeGreaterThan(0);
  });
});

describe('GET /api/stream/[id]', () => {
  const call = (id: string, q = '') => stream(req(`/api/stream/${id}${q}`), { params: Promise.resolve({ id }) });
  it('id global terenkode (jamendo%3A1 gaya Next): URL preview baru, tanpa cache', async () => {
    upstream();
    const res = await call(encodeURIComponent('deezer:3135556'), '?q=2');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const j = (await res.json()) as { url: string; kind: string; playable: string; expiresAt?: number };
    expect([j.kind, j.playable, j.expiresAt]).toEqual(['mp3', 'preview', 1893456000]);
    expect(j.url).toContain('example.invalid/preview');
    expect(urls[0].pathname).toBe('/track/3135556');
  });
  it('sumber tidak dikenal atau sumber mati = 404; galat sumber = 502', async () => {
    upstream();
    expect((await call('xyz')).status).toBe(404);
    expect((await call('jamendo:1')).status).toBe(404);
    upstream(500);
    expect((await call('deezer:3135556')).status).toBe(502);
  });
});
