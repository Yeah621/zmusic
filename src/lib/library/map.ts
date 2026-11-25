import { hueFrom } from '@/lib/sources/ids';
import type { SourceId, SourceTrack } from '@/lib/sources/types';
import { httpUrl } from '@/lib/url';
import type { RemoteArtist, RemoteTrack } from './types';

/** Kolom tracks (dengan artis dan album tertanam) yang dibaca dari database untuk membentuk SourceTrack. */
export const TRACK_COLUMNS = 'id, source, source_id, title, genre, duration_sec, hue, artwork_url, license, source_url, playable, artists(name), albums(title)';

const SOURCES: ReadonlySet<string> = new Set<SourceId>(['upload', 'audius', 'jamendo', 'deezer']);
const rec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
/** Relasi tertanam PostgREST berupa objek (banyak-ke-satu), atau larik satu elemen bila relasi terdeteksi sebaliknya. */
const one = (v: unknown): Record<string, unknown> | undefined => (Array.isArray(v) ? (rec(v[0]) ? v[0] : undefined) : rec(v) ? v : undefined);

/** Baris tracks (join artists dan albums) → lagu di katalog klien. null bila baris tidak lengkap atau tidak valid. */
export function rowToRemoteTrack(row: unknown): RemoteTrack | null {
  const r = one(row);
  if (!r) return null;
  const trackId = str(r.id);
  const source = str(r.source);
  const title = str(r.title);
  const artist = str(one(r.artists)?.name);
  const duration = typeof r.duration_sec === 'number' && r.duration_sec > 0 ? r.duration_sec : 0;
  if (!trackId || !source || !SOURCES.has(source) || !title || !artist || !duration) return null;
  const sourceId = str(r.source_id);
  const gid = source === 'upload' ? `upload:${trackId}` : sourceId ? `${source}:${sourceId}` : undefined;
  if (!gid) return null;
  return {
    trackId,
    track: {
      id: gid,
      source: source as SourceId,
      title,
      artist,
      genre: str(r.genre),
      durationSec: duration,
      artworkUrl: httpUrl(str(r.artwork_url)) ?? undefined,
      hue: typeof r.hue === 'number' ? r.hue : hueFrom(title),
      playable: r.playable === 'preview' ? 'preview' : 'full',
      license: str(r.license),
      album: str(one(r.albums)?.title),
      sourceUrl: httpUrl(str(r.source_url)) ?? undefined,
    },
  };
}

/** Baris follows (join artists) → artis yang diikuti. */
export function rowToRemoteArtist(row: unknown): RemoteArtist | null {
  const r = one(row);
  const a = one(r?.artists);
  const artistId = str(r?.artist_id);
  const name = str(a?.name);
  const source = str(a?.source);
  if (!artistId || !name || !source || !SOURCES.has(source)) return null;
  return { artistId, name, source: source as SourceId };
}

/** Lagu katalog (bentuk SourceTrack) untuk disimpan sebagai riwayat tamu di localStorage. */
export function trackForStorage(x: { id: string; source: string; t: string; a: string; g: string; d: number; h: number; playable: 'full' | 'preview'; art?: string; lic?: string; album?: string; url?: string }): SourceTrack | null {
  if (!SOURCES.has(x.source)) return null; // lagu contoh tidak disimpan
  return { id: x.id, source: x.source as SourceId, title: x.t, artist: x.a, genre: x.g || undefined, durationSec: x.d, artworkUrl: x.art, hue: x.h, playable: x.playable, license: x.lic, album: x.album, sourceUrl: x.url };
}
