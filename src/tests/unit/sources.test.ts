import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAudiusSource } from '@/lib/sources/audius';
import { createDeezerSource } from '@/lib/sources/deezer';
import { RateLimitError, SourceError } from '@/lib/sources/http';
import { dedupeKey, hueFrom, parseId } from '@/lib/sources/ids';
import { createJamendoSource, licenseLabel } from '@/lib/sources/jamendo';
import { deriveShelves } from '@/lib/sources/shelves';
import { enabledSources, getStreamById, mergeTracks, searchAll, trendingAll } from '@/lib/sources';
import type { MusicSource, SourceTrack } from '@/lib/sources/types';
import audiusTrending from '../fixtures/sources/audius-trending.json';
import deezerChart from '../fixtures/sources/deezer-chart.json';
import jamendoTracks from '../fixtures/sources/jamendo-tracks.json';

type Route = [match: (url: URL) => boolean, body: unknown, status?: number, headers?: Record<string, string>];

/** fetch palsu: balasan menurut URL; mencatat URL dan header tiap panggilan. */
function stub(routes: Route[]) {
  const calls: { url: URL; headers: Record<string, string> }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const hit = routes.find(([m]) => m(url));
    if (!hit) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(hit[1]), { status: hit[2] ?? 200, headers: { 'content-type': 'application/json', ...(hit[3] ?? {}) } });
  }) as typeof fetch;
  return { impl, calls };
}
const failure = async (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

const track = (id: string, source: SourceTrack['source'], title: string, artist: string, playable: SourceTrack['playable'] = 'full'): SourceTrack => ({ id: `${source}:${id}`, source, title, artist, durationSec: 100, hue: 1, playable });
const mock = (id: MusicSource['id'], result: SourceTrack[] | Error): MusicSource => ({
  id,
  trending: async () => (result instanceof Error ? Promise.reject(result) : result),
  search: async () => (result instanceof Error ? Promise.reject(result) : result),
  getTrack: async () => null,
  getStream: async () => ({ url: `https://example.invalid/${id}.mp3`, kind: 'mp3', playable: id === 'deezer' ? 'preview' : undefined }),
});

describe('id dan util', () => {
  it('parseId, hueFrom, dedupeKey', () => {
    expect(parseId('audius:D7KyD')).toEqual({ source: 'audius', rawId: 'D7KyD' });
    expect(parseId('jamendo:12:3')).toEqual({ source: 'jamendo', rawId: '12:3' });
    expect(parseId('x:1')).toBeNull();
    expect(parseId('audius:')).toBeNull();
    expect(hueFrom('Zara Lune Neon')).toBe(hueFrom('Zara Lune Neon'));
    expect(hueFrom('abc') < 360).toBe(true);
    expect(dedupeKey('Neon Mint!', 'Zara  Lune')).toBe(dedupeKey('neon mint', 'zara lune'));
  });
  it('licenseLabel', () => {
    expect(licenseLabel('http://creativecommons.org/licenses/by-nc-sa/3.0/')).toBe('CC BY-NC-SA 3.0');
    expect(licenseLabel('http://creativecommons.org/publicdomain/zero/1.0/')).toBe('CC0 1.0');
    expect(licenseLabel(undefined)).toBeUndefined();
  });
});

describe('adapter Jamendo', () => {
  const make = (routes: Route[]) => {
    const s = stub(routes);
    return { ...s, src: createJamendoSource({ clientId: 'TESTID', fetch: s.impl }) };
  };
  it('trending: parameter sesuai dokumentasi dan pemetaan lagu', async () => {
    const { src, calls } = make([[() => true, jamendoTracks]]);
    const out = await src.trending({ genre: 'Pop', limit: 5, offset: 10 });
    const u = calls[0].url;
    expect(u.pathname).toBe('/v3.0/tracks/');
    expect([u.searchParams.get('client_id'), u.searchParams.get('format'), u.searchParams.get('order'), u.searchParams.get('tags'), u.searchParams.get('limit'), u.searchParams.get('offset'), u.searchParams.get('include')]).toEqual(['TESTID', 'json', 'popularity_week', 'pop', '5', '10', 'licenses']);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ id: 'jamendo:1532771', source: 'jamendo', title: 'Hujan Terakhir', artist: 'Raya Senja', genre: 'Pop', durationSec: 216, artworkUrl: 'https://example.invalid/cover3.jpg', hue: hueFrom('Raya Senja Hujan Terakhir'), playable: 'full', license: 'CC BY-NC-SA 3.0', album: 'Senja di Kota', artistId: '11', albumId: '3', sourceUrl: 'https://www.jamendo.com/track/1532771', downloadAllowed: true });
    expect([out[1].license, out[1].downloadAllowed, out[1].artworkUrl, out[1].album]).toEqual(['CC BY 4.0', false, undefined, undefined]);
  });
  it('getStream memilih audioformat menurut kualitas', async () => {
    const { src, calls } = make([[() => true, jamendoTracks]]);
    expect((await src.getStream('1532771', { quality: 0 })).kind).toBe('mp3');
    expect(calls[0].url.searchParams.get('audioformat')).toBe('mp31');
    const hi = await src.getStream('1532771', { quality: 2 });
    expect([calls[1].url.searchParams.get('audioformat'), hi.kind, hi.url]).toEqual(['flac', 'flac', 'https://example.invalid/stream?trackid=1532771&format=mp31']);
  });
  it('galat: status failed, 429, dan tidak ditemukan', async () => {
    const failed = make([[() => true, { headers: { status: 'failed', code: 5, error_message: 'client_id tidak valid' }, results: [] }]]);
    const e1 = await failure(failed.src.search('x', { limit: 1 }));
    expect(e1 instanceof SourceError && !(e1 instanceof RateLimitError)).toBe(true);
    const limited = make([[() => true, {}, 429, { 'retry-after': '7' }]]);
    const e2 = await failure(limited.src.search('x', { limit: 1 }));
    expect(e2 instanceof RateLimitError && e2.retryAfterSec === 7).toBe(true);
    const empty = make([[() => true, { headers: { status: 'success' }, results: [] }]]);
    expect(await empty.src.getTrack('9')).toBeNull();
    expect(String((e1 as Error).message).includes('TESTID')).toBe(false);
  });
});

describe('adapter Audius', () => {
  const make = (routes: Route[]) => {
    const s = stub(routes);
    return { ...s, src: createAudiusSource({ bearerToken: 'TOKEN', fetch: s.impl }) };
  };
  it('trending: bearer di header, parameter, pemetaan, lagu tak bisa distream dibuang', async () => {
    const { src, calls } = make([[(u) => u.pathname === '/v1/tracks/trending', audiusTrending]]);
    const out = await src.trending({ genre: 'Hip-hop', limit: 20, offset: 0 });
    const c = calls[0];
    expect(c.headers.authorization).toBe('Bearer TOKEN');
    expect([c.url.searchParams.get('time'), c.url.searchParams.get('genre'), c.url.searchParams.get('app_name'), c.url.searchParams.get('limit')]).toEqual(['week', 'Hip-Hop/Rap', 'ZMusic', '20']);
    expect(out).toHaveLength(1);
    expect([out[0].id, out[0].artist, out[0].genre, out[0].artworkUrl, out[0].sourceUrl, out[0].playable]).toEqual(['audius:D7KyD', 'Zara Lune', 'Electronic', 'https://example.invalid/a480.jpg', 'https://audius.co/zaralune/neon-rooftop', 'full']);
  });
  it('search, getTrack (404 = null), getStream dengan no_redirect', async () => {
    const { src, calls } = make([
      [(u) => u.pathname === '/v1/tracks/search', audiusTrending],
      [(u) => u.pathname === '/v1/tracks/D7KyD/stream', { data: 'https://example.invalid/node/stream.mp3' }],
      [(u) => u.pathname === '/v1/tracks/D7KyD', { data: audiusTrending.data[0] }],
    ]);
    expect((await src.search('neon', { limit: 3 })).length).toBe(1);
    expect(calls[0].url.searchParams.get('query')).toBe('neon');
    expect((await src.getTrack('D7KyD'))?.title).toBe('Neon Rooftop');
    expect(await src.getTrack('nope')).toBeNull();
    expect(await src.getStream('D7KyD')).toEqual({ url: 'https://example.invalid/node/stream.mp3', kind: 'mp3' });
    expect(calls[calls.length - 1].url.searchParams.get('no_redirect')).toBe('true');
  });
});

describe('adapter Deezer', () => {
  const make = (routes: Route[]) => {
    const s = stub(routes);
    return { ...s, src: createDeezerSource({ fetch: s.impl }) };
  };
  it('trending per genre, pemetaan preview, lagu tanpa preview dibuang', async () => {
    const { src, calls } = make([[() => true, deezerChart]]);
    const out = await src.trending({ genre: 'Pop', limit: 5, offset: 10 });
    expect([calls[0].url.pathname, calls[0].url.searchParams.get('limit'), calls[0].url.searchParams.get('index')]).toEqual(['/chart/132/tracks', '5', '10']);
    await src.trending({ limit: 5 });
    expect(calls[1].url.pathname).toBe('/chart/0/tracks');
    expect(out).toHaveLength(1);
    expect([out[0].id, out[0].playable, out[0].artworkUrl, out[0].sourceUrl, out[0].album, out[0].durationSec]).toEqual(['deezer:3135556', 'preview', 'https://example.invalid/c500.jpg', 'https://www.deezer.com/track/3135556', 'Aurora', 221]);
  });
  it('search memakai parameter q', async () => {
    const { src, calls } = make([[() => true, deezerChart]]);
    await src.search('neon mint', { limit: 3 });
    expect([calls[0].url.pathname, calls[0].url.searchParams.get('q')]).toEqual(['/search', 'neon mint']);
  });
  it('getStream mengambil ulang /track/<id> dan membaca expiresAt dari URL', async () => {
    const { src, calls } = make([[(u) => u.pathname === '/track/3135556', deezerChart.data[0]]]);
    const s = await src.getStream('3135556');
    expect(calls[0].url.pathname).toBe('/track/3135556');
    expect([s.kind, s.expiresAt, s.playable, s.url.includes('abc.mp3')]).toEqual(['mp3', 1893456000, 'preview', true]);
  });
  it('kuota (kode 4) = RateLimitError; kode 800 = tidak ada data', async () => {
    const quota = make([[() => true, { error: { type: 'Exception', message: 'Quota limit exceeded', code: 4 } }]]);
    expect((await failure(quota.src.search('x', { limit: 1 }))) instanceof RateLimitError).toBe(true);
    const none = make([[() => true, { error: { type: 'DataException', message: 'no data', code: 800 } }]]);
    expect(await none.src.getTrack('1')).toBeNull();
  });
});

describe('agregator', () => {
  it('satu sumber gagal tidak merusak hasil: ada peringatan, sisanya tetap', async () => {
    const out = await searchAll('x', 10, [mock('audius', [track('1', 'audius', 'A', 'a')]), mock('jamendo', new RateLimitError('jamendo')), mock('deezer', new SourceError('deezer', 'Waktu habis'))]);
    expect(out.tracks.map((t) => t.id)).toEqual(['audius:1']);
    expect(out.warnings).toEqual([
      { source: 'jamendo', message: 'Batas permintaan terlampaui', rateLimited: true },
      { source: 'deezer', message: 'Waktu habis', rateLimited: undefined },
    ]);
  });
  it('lagu penuh lebih dulu, selang-seling antar sumber, lagu ganda dibuang (yang penuh menang)', () => {
    const a = [track('a1', 'audius', 'Satu', 'X'), track('a2', 'audius', 'Dua', 'X')];
    const b = [track('b1', 'jamendo', 'Tiga', 'Y'), track('b2', 'jamendo', 'Empat', 'Y')];
    const d = [track('d1', 'deezer', 'Satu', 'X', 'preview'), track('d2', 'deezer', 'Lima', 'Z', 'preview')];
    expect(mergeTracks([a, b, d], 10).map((t) => t.id)).toEqual(['audius:a1', 'jamendo:b1', 'audius:a2', 'jamendo:b2', 'deezer:d2']);
    expect(mergeTracks([a, b, d], 2)).toHaveLength(2);
  });
  it('trendingAll meneruskan opsi ke setiap sumber', async () => {
    const seen: unknown[] = [];
    const s: MusicSource = { ...mock('audius', []), trending: async (o) => (seen.push(o), []) };
    await trendingAll({ genre: 'Pop', limit: 7, offset: 3 }, [s]);
    expect(seen).toEqual([{ genre: 'Pop', limit: 7, offset: 3 }]);
  });
  it('getStreamById: preview untuk Deezer, null untuk id tak dikenal', async () => {
    const srcs = [mock('deezer', []), mock('audius', [])];
    expect((await getStreamById('deezer:9', 1, srcs))?.playable).toBe('preview');
    expect((await getStreamById('audius:9', 1, srcs))?.playable).toBe('full');
    expect(await getStreamById('jamendo:9', 1, srcs)).toBeNull();
    expect(await getStreamById('ngawur', 1, srcs)).toBeNull();
  });
  it('enabledSources mengikuti kunci dan bendera ENABLE_*', () => {
    const ids = (env: Record<string, string>) => enabledSources(env).map((s) => s.id);
    expect(ids({})).toEqual(['deezer']);
    expect(ids({ AUDIUS_API_KEY: 'k', JAMENDO_CLIENT_ID: 'c' })).toEqual(['audius', 'jamendo', 'deezer']);
    expect(ids({ AUDIUS_API_KEY: 'k', JAMENDO_CLIENT_ID: 'c', ENABLE_JAMENDO: 'false', ENABLE_DEEZER: 'FALSE' })).toEqual(['audius']);
  });
  it('deriveShelves: artis dan album unik', () => {
    const t = [{ ...track('1', 'jamendo', 'A', 'Raya'), album: 'Senja', albumId: '3', artistId: '11' }, { ...track('2', 'jamendo', 'B', 'Raya'), album: 'Senja', albumId: '3', artistId: '11' }, track('3', 'audius', 'C', 'Zara')];
    const s = deriveShelves(t);
    expect([s.artists.map((a) => a.name), s.albums.map((a) => a.title)]).toEqual([['Raya', 'Zara'], ['Senja']]);
  });
});

describe('pemindai rahasia (G2)', () => {
  it('menemukan nilai dan nama variabel rahasia di bundel', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zm-secret-'));
    writeFileSync(join(dir, 'a.js'), 'console.log("halo")');
    const run = () => spawnSync('node', ['scripts/check-secrets.mjs', dir], { env: { JAMENDO_CLIENT_ID: 'abcdef123456', PATH: process.env.PATH ?? '' }, encoding: 'utf8' });
    expect(run().status).toBe(0);
    writeFileSync(join(dir, 'b.js'), 'var x="abcdef123456"');
    expect(run().status).toBe(1);
    writeFileSync(join(dir, 'b.js'), 'process.env.AUDIUS_API_KEY');
    expect(run().status).toBe(1);
  });
});
