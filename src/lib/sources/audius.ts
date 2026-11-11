import { getJson, SourceError } from './http';
import { hueFrom } from './ids';
import { isRec, list, num, str, type Rec } from './parse';
import type { MusicSource, SourceTrack, Stream } from './types';

// Diverifikasi dari README @audius/sdk 15.3.1 dan docs.audius.org (trending, stream track, REST guide).
// Pencarian (GET /tracks/search?query=) berasal dari SDK dan implementasi pihak ketiga, bukan halaman dokumentasi resmi.
const BASE = 'https://api.audius.co/v1';
/** genre aplikasi → nama genre Audius (belum dicocokkan dengan daftar genre resmi) */
const GENRES: Record<string, string> = { Pop: 'Pop', 'Lo-fi': 'Lo-Fi', Electronic: 'Electronic', 'Hip-hop': 'Hip-Hop/Rap', Akustik: 'Acoustic' };

export interface AudiusConfig {
  /** Bearer Token dari api.audius.co/plans. Rahasia: hanya di server. */
  bearerToken: string;
  appName?: string;
  fetch?: typeof fetch;
  revalidate?: number;
}

function toTrack(r: Rec, genre?: string): SourceTrack | null {
  const id = str(r.id);
  const title = str(r.title);
  const user = isRec(r.user) ? r.user : {};
  const artist = str(user.name);
  const durationSec = num(r.duration);
  if (!id || !title || !artist || durationSec === undefined || r.is_streamable === false) return null;
  const art = isRec(r.artwork) ? r.artwork : {};
  const permalink = str(r.permalink);
  return {
    id: `audius:${id}`,
    source: 'audius',
    title,
    artist,
    genre: str(r.genre) ?? genre,
    durationSec,
    artworkUrl: str(art['480x480']) ?? str(art['1000x1000']) ?? str(art['150x150']),
    hue: hueFrom(`${artist} ${title}`),
    playable: 'full',
    artistId: str(user.id),
    sourceUrl: permalink ? `https://audius.co${permalink}` : undefined,
  };
}

export function createAudiusSource(cfg: AudiusConfig): MusicSource {
  const headers = { authorization: `Bearer ${cfg.bearerToken}` };
  const opts = { headers, fetch: cfg.fetch, revalidate: cfg.revalidate };
  const url = (path: string, params: Record<string, string | number | boolean | undefined> = {}) => {
    const q = new URLSearchParams({ app_name: cfg.appName ?? 'ZMusic' });
    for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
    return `${BASE}${path}?${q}`;
  };
  const data = (body: unknown): unknown => {
    if (!isRec(body)) throw new SourceError('audius', 'Respons tidak dikenali');
    return body.data;
  };
  const tracks = (rows: unknown, genre?: string) =>
    list(rows)
      .filter(isRec)
      .map((r) => toTrack(r, genre))
      .filter((t): t is SourceTrack => t !== null);

  return {
    id: 'audius',
    async trending({ genre, limit, offset }) {
      const body = await getJson('audius', url('/tracks/trending', { time: 'week', genre: genre ? GENRES[genre] : undefined, limit, offset }), opts);
      return tracks(data(body), genre);
    },
    async search(q, { limit }) {
      return tracks(data(await getJson('audius', url('/tracks/search', { query: q, limit }), opts)));
    },
    async getTrack(id) {
      try {
        const row = data(await getJson('audius', url(`/tracks/${encodeURIComponent(id)}`), opts));
        return isRec(row) ? toTrack(row) : null;
      } catch (e) {
        if (e instanceof SourceError && e.status === 404) return null;
        throw e;
      }
    },
    /** no_redirect=true: Audius membalas JSON berisi URL stream (tanpa 302), jadi bearer token tidak ikut ke browser. */
    async getStream(id): Promise<Stream> {
      const streamUrl = str(data(await getJson('audius', url(`/tracks/${encodeURIComponent(id)}/stream`, { no_redirect: true }), { headers, fetch: cfg.fetch })));
      if (!streamUrl) throw new SourceError('audius', 'Tidak ada URL stream');
      return { url: streamUrl, kind: 'mp3' };
    },
  };
}
