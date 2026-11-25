import { artistKeyOf, albumKeyOf } from '@/lib/keys';
import { hueFrom, parseId } from '@/lib/sources/ids';
import type { SourceId, SourceTrack } from '@/lib/sources/types';
import { httpUrl } from '@/lib/url';

/**
 * P3-07: salin metadata lagu sumber luar ke tabel `tracks` (beserta artis dan album) saat pengguna menyukai, memasukkan ke
 * playlist, atau memutarnya. Hanya SERVER yang menulis tabel itu (service_role): klien tidak boleh, agar metadata bersama
 * (judul, tautan sumber) tidak bisa diracuni. Metadata diambil dari adapter terpercaya, bukan dari badan permintaan.
 * Logika ini murni; akses database lewat port TrackDb (implementasi Supabase di track-db.ts, tiruan memori untuk uji).
 */
export const MAX_ENSURE_IDS = 20;

export interface Ensured {
  trackId: string;
  artistId: string;
}
/** id global lagu → uuid baris tracks dan artisnya; null = tidak bisa disalin (sumber tidak dikenal, lagu tak ditemukan, atau galat) */
export type EnsureResult = Record<string, Ensured | null>;

export interface DbArtist {
  name: string;
  source: SourceId;
  sourceId: string;
  hue: number;
}
export interface DbAlbum {
  title: string;
  artistId: string;
  source: SourceId;
  sourceId: string;
  hue: number;
}
export interface DbTrack {
  source: SourceId;
  sourceId: string;
  title: string;
  artistId: string;
  albumId: string | null;
  genre: string | null;
  durationSec: number;
  hue: number;
  artworkUrl: string | null;
  license: string | null;
  sourceUrl: string | null;
  playable: 'full' | 'preview';
}

export interface TrackDb {
  /** Baris tracks yang sudah ada menurut (source, source_id); kunci hasil dbKey(source, sourceId). */
  findTracks(keys: { source: SourceId; sourceId: string }[]): Promise<Map<string, Ensured>>;
  /** Buat atau ambil baris (unik pada source, source_id) dan kembalikan uuid-nya. Aman dipanggil serentak. */
  ensureArtist(a: DbArtist): Promise<string>;
  ensureAlbum(a: DbAlbum): Promise<string>;
  ensureTrack(t: DbTrack): Promise<string>;
}

export const dbKey = (source: SourceId, sourceId: string): string => `${source}:${sourceId}`;

/** Validasi badan POST /api/library/ensure: { ids: string[] } berisi 1..20 id global. null = tidak valid. */
export function parseEnsureBody(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_ENSURE_IDS) return null;
  if (!ids.every((x): x is string => typeof x === 'string' && x.length <= 120 && /^[a-z]+:[\w.~-]+$/.test(x))) return null;
  return [...new Set(ids)];
}

const clip = (s: string | undefined, n: number): string | null => {
  const t = s?.trim();
  return t ? t.slice(0, n) : null;
};
const hue = (n: number): number => ((Math.round(n) % 360) + 360) % 360;

async function create(db: TrackDb, source: SourceId, sourceId: string, t: SourceTrack): Promise<Ensured | null> {
  const name = clip(t.artist, 120);
  const title = clip(t.title, 160);
  if (!name || !title) return null;
  const artistId = await db.ensureArtist({ name, source, sourceId: t.artistId ?? artistKeyOf(name), hue: hueFrom(name) });
  const album = clip(t.album, 160);
  const albumId = album ? await db.ensureAlbum({ title: album, artistId, source, sourceId: t.albumId ?? albumKeyOf(name, album), hue: hueFrom(`${name}|${album}`) }) : null;
  const trackId = await db.ensureTrack({
    source,
    sourceId,
    title,
    artistId,
    albumId,
    genre: clip(t.genre, 40),
    durationSec: Math.max(1, Math.round(t.durationSec)),
    hue: hue(t.hue),
    artworkUrl: httpUrl(t.artworkUrl),
    license: clip(t.license, 80),
    sourceUrl: httpUrl(t.sourceUrl),
    playable: t.playable === 'preview' ? 'preview' : 'full',
  });
  return { trackId, artistId };
}

/**
 * Pastikan tiap lagu sumber luar punya baris di `tracks`. Yang sudah ada dipakai (tanpa memanggil sumber); yang belum diambil
 * lewat `getTrack` lalu disalin. Kegagalan satu lagu tidak mengganggu yang lain (hasilnya null). Lagu unggahan, contoh,
 * dan id tak dikenal tidak disalin (null).
 */
export async function ensureTracks(db: TrackDb, getTrack: (gid: string) => Promise<SourceTrack | null>, ids: readonly string[]): Promise<EnsureResult> {
  const out: EnsureResult = {};
  const todo: { gid: string; source: SourceId; sourceId: string }[] = [];
  for (const gid of new Set(ids)) {
    const p = parseId(gid);
    if (!p || p.source === 'upload') out[gid] = null;
    else todo.push({ gid, source: p.source, sourceId: p.rawId });
  }
  if (!todo.length) return out;

  let found = new Map<string, Ensured>();
  try {
    found = await db.findTracks(todo.map(({ source, sourceId }) => ({ source, sourceId })));
  } catch {
    // pencarian gagal: lanjut menyalin; upsert tetap menjaga keunikan
  }
  await Promise.all(
    todo.map(async (x) => {
      const hit = found.get(dbKey(x.source, x.sourceId));
      if (hit) {
        out[x.gid] = hit;
        return;
      }
      try {
        const t = await getTrack(x.gid);
        out[x.gid] = t ? await create(db, x.source, x.sourceId, t) : null;
      } catch {
        out[x.gid] = null;
      }
    }),
  );
  return out;
}
