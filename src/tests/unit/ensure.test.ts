import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { albumKeyOf, artistKeyOf } from '@/lib/keys';
import { dbKey, ensureTracks, MAX_ENSURE_IDS, parseEnsureBody, type DbTrack, type Ensured, type TrackDb } from '@/lib/server/ensure';
import type { SourceTrack } from '@/lib/sources/types';

/** Tiruan memori TrackDb dengan semantik upsert (unik pada source+source_id) dan catatan panggilan. */
function memoryDb() {
  const artists = new Map<string, string>();
  const albums = new Map<string, string>();
  const tracks = new Map<string, { id: string; artistId: string; row: DbTrack }>();
  const artistRows: { name: string; sourceId: string; hue: number }[] = [];
  const albumRows: { title: string; sourceId: string; artistId: string }[] = [];
  const log: string[] = [];
  let n = 0;
  const db: TrackDb = {
    async findTracks(keys) {
      log.push('find');
      const out = new Map<string, Ensured>();
      for (const k of keys) {
        const t = tracks.get(dbKey(k.source, k.sourceId));
        if (t) out.set(dbKey(k.source, k.sourceId), { trackId: t.id, artistId: t.artistId });
      }
      return out;
    },
    async ensureArtist(a) {
      const k = dbKey(a.source, a.sourceId);
      if (!artists.has(k)) {
        artists.set(k, `artist-${++n}`);
        artistRows.push({ name: a.name, sourceId: a.sourceId, hue: a.hue });
      }
      return artists.get(k) as string;
    },
    async ensureAlbum(a) {
      const k = dbKey(a.source, a.sourceId);
      if (!albums.has(k)) {
        albums.set(k, `album-${++n}`);
        albumRows.push({ title: a.title, sourceId: a.sourceId, artistId: a.artistId });
      }
      return albums.get(k) as string;
    },
    async ensureTrack(t) {
      const k = dbKey(t.source, t.sourceId);
      const prev = tracks.get(k);
      if (prev) {
        prev.row = t;
        return prev.id;
      }
      const id = `track-${++n}`;
      tracks.set(k, { id, artistId: t.artistId, row: t });
      log.push(`track:${t.title}`);
      return id;
    },
  };
  return { db, tracks, artistRows, albumRows, log };
}

const st = (id: string, o: Partial<SourceTrack> = {}): SourceTrack => ({ id, source: id.split(':')[0] as SourceTrack['source'], title: `Lagu ${id}`, artist: 'Zara Lune', durationSec: 200, hue: 40, playable: 'full', ...o });
const source = (list: SourceTrack[], seen: string[] = []) => async (gid: string) => {
  seen.push(gid);
  return list.find((x) => x.id === gid) ?? null;
};

describe('parseEnsureBody', () => {
  it('menerima 1..20 id global dan membuang duplikat', () => {
    expect(parseEnsureBody({ ids: ['jamendo:1', 'deezer:22', 'audius:D7KyD', 'jamendo:1'] })).toEqual(['jamendo:1', 'deezer:22', 'audius:D7KyD']);
    expect(parseEnsureBody({ ids: Array.from({ length: MAX_ENSURE_IDS }, (_, i) => `deezer:${i}`) })).toHaveLength(MAX_ENSURE_IDS);
  });
  it('menolak badan yang tidak valid', () => {
    const bad: unknown[] = [null, 'x', [], {}, { ids: 'jamendo:1' }, { ids: [] }, { ids: [1] }, { ids: ['JAMENDO:1'] }, { ids: ['jamendo 1'] }, { ids: ['jamendo:../x'] }, { ids: ['tanpa-titik-dua'] }, { ids: ['jamendo:' + 'x'.repeat(120)] }, { ids: Array.from({ length: MAX_ENSURE_IDS + 1 }, (_, i) => `deezer:${i}`) }];
    for (const b of bad) expect(parseEnsureBody(b), JSON.stringify(b)?.slice(0, 40)).toBeNull();
  });
});

describe('ensureTracks (P3-07)', () => {
  it('menyalin lagu, artis, dan album; panggilan berikutnya memakai baris yang ada tanpa memanggil sumber', async () => {
    const m = memoryDb();
    const seen: string[] = [];
    const get = source([st('jamendo:1', { album: 'Neon Mint', artistId: 'art-9', albumId: 'alb-3' })], seen);
    const first = await ensureTracks(m.db, get, ['jamendo:1']);
    expect(first['jamendo:1']).toEqual({ trackId: 'track-3', artistId: 'artist-1' });
    expect(m.artistRows).toEqual([{ name: 'Zara Lune', sourceId: 'art-9', hue: m.artistRows[0].hue }]);
    expect(m.albumRows).toEqual([{ title: 'Neon Mint', sourceId: 'alb-3', artistId: 'artist-1' }]);
    const again = await ensureTracks(m.db, get, ['jamendo:1']);
    expect(again).toEqual(first);
    expect(seen).toEqual(['jamendo:1']);
    expect(m.tracks.size).toBe(1);
  });

  it('artis yang sama pada beberapa lagu hanya satu baris, juga saat diproses serentak', async () => {
    const m = memoryDb();
    const list = [st('deezer:1'), st('deezer:2'), st('deezer:3', { artist: 'Raya & Senja' })];
    const r = await ensureTracks(m.db, source(list), ['deezer:1', 'deezer:2', 'deezer:3']);
    expect(Object.values(r).every((x) => x !== null)).toBe(true);
    expect(m.artistRows.map((a) => a.name).sort()).toEqual(['Raya & Senja', 'Zara Lune']);
    expect(r['deezer:1']?.artistId).toBe(r['deezer:2']?.artistId);
    expect(r['deezer:1']?.artistId).not.toBe(r['deezer:3']?.artistId);
  });

  it('id artis dan album yang tidak diberi sumber diturunkan dari nama (kunci stabil)', async () => {
    const m = memoryDb();
    await ensureTracks(m.db, source([st('audius:A1', { album: 'Fajar' })]), ['audius:A1']);
    expect(m.artistRows[0].sourceId).toBe(artistKeyOf('Zara Lune'));
    expect(m.albumRows[0].sourceId).toBe(albumKeyOf('Zara Lune', 'Fajar'));
  });

  it('lagu unggahan, contoh, sumber tak dikenal, dan id rusak tidak disalin dan tidak memanggil sumber', async () => {
    const m = memoryDb();
    const seen: string[] = [];
    const r = await ensureTracks(m.db, source([], seen), ['upload:abc', 'sample:3', 'spotify:1', 'rusak', 'jamendo:']);
    expect(Object.values(r)).toEqual([null, null, null, null, null]);
    expect(seen).toEqual([]);
    expect(m.log).toEqual([]);
  });

  it('satu lagu gagal tidak mengganggu yang lain; lagu yang tidak ditemukan sumber = null', async () => {
    const m = memoryDb();
    const get = async (gid: string) => {
      if (gid === 'deezer:2') throw new Error('sumber mati');
      return gid === 'deezer:3' ? null : st(gid);
    };
    const r = await ensureTracks(m.db, get, ['deezer:1', 'deezer:2', 'deezer:3']);
    expect(r['deezer:1']).not.toBeNull();
    expect(r['deezer:2']).toBeNull();
    expect(r['deezer:3']).toBeNull();
  });

  it('pencarian awal gagal: tetap menyalin (upsert menjaga keunikan)', async () => {
    const m = memoryDb();
    const db: TrackDb = { ...m.db, findTracks: async () => { throw new Error('db sibuk'); } };
    const r = await ensureTracks(db, source([st('jamendo:5')]), ['jamendo:5']);
    expect(r['jamendo:5']).not.toBeNull();
  });

  it('metadata dibersihkan: alamat selain http(s) dibuang, teks dipotong, hue dinormalkan, durasi minimal 1', async () => {
    const m = memoryDb();
    const dirty = st('jamendo:9', { title: ` ${'J'.repeat(300)} `, artist: 'A'.repeat(200), genre: 'g'.repeat(99), artworkUrl: 'javascript:alert(1)', sourceUrl: 'data:text/html,x', hue: -30, durationSec: 0.2, playable: 'preview', license: 'CC BY-NC-SA 3.0', album: '  ' });
    await ensureTracks(m.db, source([dirty]), ['jamendo:9']);
    const row = m.tracks.get('jamendo:9')?.row as DbTrack;
    expect([row.title.length, row.artworkUrl, row.sourceUrl, row.hue, row.durationSec, row.playable, row.genre?.length, row.license, row.albumId]).toEqual([160, null, null, 330, 1, 'preview', 40, 'CC BY-NC-SA 3.0', null]);
    expect(m.artistRows[0].name.length).toBe(120);
    expect(m.albumRows).toEqual([]);
  });

  it('judul atau artis kosong = tidak disalin', async () => {
    const m = memoryDb();
    const r = await ensureTracks(m.db, source([st('deezer:7', { title: '   ' })]), ['deezer:7']);
    expect(r['deezer:7']).toBeNull();
    expect(m.tracks.size).toBe(0);
  });
});

describe('batas server: rute ensure dan akses service_role', () => {
  const code = (p: string) => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const route = code('src/app/api/library/ensure/route.ts');

  it('rute: JSON saja, validasi badan, wajib masuk (getClaims) sebelum menyentuh service_role, tanpa cache', () => {
    expect(route).toContain("includes('application/json')");
    expect(route).toContain('parseEnsureBody(');
    expect(route).toContain('getClaims()');
    expect(route).not.toContain('getSession(');
    expect(route.indexOf('getClaims()')).toBeLessThan(route.indexOf('createServiceTrackDb()'));
    for (const status of ['415', '400', '401', '503']) expect(route, status).toContain(`status: ${status}`);
    expect(route.match(/'Cache-Control': 'no-store'/g)?.length).toBe(1);
  });

  it('metadata diambil dari adapter, bukan dari badan permintaan', () => {
    expect(route).toContain('ensureTracks(db, (gid) => getTrackById(gid), ids)');
    expect(route.match(/request\.json\(\)/g)?.length).toBe(1);
  });

  it('track-db (service_role) hanya diimpor oleh rute ensure', () => {
    const users: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(n) && /from\s+['"]@\/lib\/server\/track-db['"]/.test(readFileSync(p, 'utf8'))) users.push(p);
      }
    };
    walk('src');
    expect(users.map((u) => u.replace(/\\/g, '/'))).toEqual(['src/app/api/library/ensure/route.ts']);
  });
});
