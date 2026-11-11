import { describe, expect, it } from 'vitest';
import { createAudiusSource } from '@/lib/sources/audius';
import { createDeezerSource } from '@/lib/sources/deezer';
import { createJamendoSource } from '@/lib/sources/jamendo';
import type { MusicSource } from '@/lib/sources/types';

// Uji ke API sungguhan untuk memastikan asumsi di docs/sources.md. Hanya jalan dengan LIVE=1:
//   LIVE=1 JAMENDO_CLIENT_ID=... AUDIUS_API_KEY=... npm run test:live
// Jamendo dan Audius dilewati bila kuncinya tidak ada; Deezer tanpa kunci. Tidak ikut `npm test` biasa.
const live = process.env.LIVE === '1';

async function checkSource(src: MusicSource, genre: string) {
  const trending = await src.trending({ genre, limit: 3 });
  expect(trending.length > 0).toBe(true);
  const t = trending[0];
  expect([typeof t.title, typeof t.artist, t.durationSec > 0, t.id.startsWith(`${src.id}:`)]).toEqual(['string', 'string', true, true]);
  expect((await src.search(t.title.slice(0, 20), { limit: 3 })).length > 0).toBe(true);
  const stream = await src.getStream(t.id.slice(src.id.length + 1));
  const res = await fetch(stream.url, { headers: { range: 'bytes=0-1' } });
  expect([res.status === 200 || res.status === 206, (res.headers.get('content-type') ?? '').includes('audio')]).toEqual([true, true]);
  // semua genre aplikasi harus diterima sumber (hasil boleh kosong, galat tidak)
  for (const g of ['Pop', 'Lo-fi', 'Electronic', 'Hip-hop', 'Akustik']) expect(Array.isArray(await src.trending({ genre: g, limit: 3 }))).toBe(true);
}

describe.skipIf(!live)('API sungguhan', () => {
  it('Deezer: chart per genre, pencarian, preview 30 detik', () => checkSource(createDeezerSource(), 'Pop'), 60000);
  it.skipIf(!process.env.JAMENDO_CLIENT_ID)('Jamendo: tren, pencarian, stream', () => checkSource(createJamendoSource({ clientId: process.env.JAMENDO_CLIENT_ID ?? '' }), 'Electronic'), 60000);
  it.skipIf(!process.env.AUDIUS_API_KEY)('Audius: tren, pencarian, stream', () => checkSource(createAudiusSource({ bearerToken: process.env.AUDIUS_API_KEY ?? '' }), 'Electronic'), 60000);
});
