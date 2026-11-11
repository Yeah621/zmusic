import { getJson, SourceError } from './http';
import { hueFrom } from './ids';
import { isRec, list, num, str, type Rec } from './parse';
import type { MusicSource, SourceTrack, Stream } from './types';

// Diverifikasi dari dokumentasi resmi: developer.jamendo.com/v3.0/tracks dan devportal.jamendo.com/api_terms_of_use.
const BASE = 'https://api.jamendo.com/v3.0';
/** genre aplikasi → tag Jamendo (tag diambil dari kosakata umum Jamendo; belum dicek satu per satu) */
const TAGS: Record<string, string> = { Pop: 'pop', 'Lo-fi': 'lofi', Electronic: 'electronic', 'Hip-hop': 'hiphop', Akustik: 'acoustic' };
const FORMATS = ['mp31', 'mp32', 'flac'] as const;

export interface JamendoConfig {
  clientId: string;
  fetch?: typeof fetch;
  revalidate?: number;
}

/** "http://creativecommons.org/licenses/by-nc-sa/3.0/" → "CC BY-NC-SA 3.0" */
export function licenseLabel(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/publicdomain\/zero/i.test(url)) return 'CC0 1.0';
  const m = /licenses\/([a-z-]+)\/([\d.]+)/i.exec(url);
  return m ? `CC ${m[1].toUpperCase()} ${m[2]}` : url;
}

function toTrack(r: Rec, genre?: string): SourceTrack | null {
  const id = str(r.id);
  const title = str(r.name);
  const artist = str(r.artist_name);
  const durationSec = num(r.duration);
  if (!id || !title || !artist || durationSec === undefined) return null;
  return {
    id: `jamendo:${id}`,
    source: 'jamendo',
    title,
    artist,
    genre,
    durationSec,
    artworkUrl: str(r.image) ?? str(r.album_image),
    hue: hueFrom(`${artist} ${title}`),
    playable: 'full',
    license: licenseLabel(str(r.license_ccurl)),
    album: str(r.album_name),
    artistId: str(r.artist_id),
    albumId: str(r.album_id),
    sourceUrl: str(r.shareurl) ?? `https://www.jamendo.com/track/${id}`,
    downloadAllowed: r.audiodownload_allowed === true,
  };
}

/** Jamendo membalas HTTP 200 dengan headers.status = "failed" untuk galat. */
function results(body: unknown): Rec[] {
  if (!isRec(body)) throw new SourceError('jamendo', 'Respons tidak dikenali');
  const h = isRec(body.headers) ? body.headers : {};
  if (str(h.status) === 'failed') throw new SourceError('jamendo', str(h.error_message) ?? 'Permintaan ditolak');
  return list(body.results).filter(isRec);
}

export function createJamendoSource(cfg: JamendoConfig): MusicSource {
  const opts = { fetch: cfg.fetch, revalidate: cfg.revalidate };
  const url = (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams({ client_id: cfg.clientId, format: 'json' });
    for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
    return `${BASE}/tracks/?${q}`;
  };
  const tracks = (rows: Rec[], genre?: string) => rows.map((r) => toTrack(r, genre)).filter((t): t is SourceTrack => t !== null);

  return {
    id: 'jamendo',
    async trending({ genre, limit, offset }) {
      const rows = results(await getJson('jamendo', url({ limit, offset, order: 'popularity_week', tags: genre ? TAGS[genre] : undefined, include: 'licenses', imagesize: 300 }), opts));
      return tracks(rows, genre);
    },
    async search(q, { limit }) {
      return tracks(results(await getJson('jamendo', url({ limit, search: q, order: 'relevance', include: 'licenses', imagesize: 300 }), opts)));
    },
    async getTrack(id) {
      return tracks(results(await getJson('jamendo', url({ id, include: 'licenses', imagesize: 300 }), opts)))[0] ?? null;
    },
    async getStream(id, o): Promise<Stream> {
      const quality = o?.quality ?? 1;
      const row = results(await getJson('jamendo', url({ id, audioformat: FORMATS[quality] }), { fetch: cfg.fetch }))[0];
      const audio = row ? str(row.audio) : undefined;
      if (!audio) throw new SourceError('jamendo', 'Tidak ada audio untuk lagu ini');
      return { url: audio, kind: quality === 2 ? 'flac' : 'mp3' };
    },
  };
}
