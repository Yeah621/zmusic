import { getJson, RateLimitError, SourceError } from './http';
import { hueFrom } from './ids';
import { isRec, list, num, str, type Rec } from './parse';
import type { MusicSource, SourceTrack, Stream } from './types';
import { PREVIEW_SECONDS } from '@/lib/constants';

// Diverifikasi: developers.deezer.com/termsofuse (non-komersial, atribusi, pedoman merek) dan FAQ resmi
// (API hanya memberi preview 30 detik). Nama endpoint dan field dari dokumentasi API Deezer; id genre dari memori, cek lewat GET /genre.
const BASE = 'https://api.deezer.com';
/** genre aplikasi → id genre chart Deezer (Lo-fi tidak punya genre sendiri: pakai chart umum) */
const GENRE_IDS: Record<string, number> = { Pop: 132, Electronic: 106, 'Hip-hop': 116, Akustik: 466 };

export interface DeezerConfig {
  fetch?: typeof fetch;
  revalidate?: number;
}

/** Deezer membalas HTTP 200 dengan { error: { type, message, code } }; kode 4 = kuota terlampaui, 800 = tidak ada data. */
function check(body: unknown): Rec {
  if (!isRec(body)) throw new SourceError('deezer', 'Respons tidak dikenali');
  if (isRec(body.error)) {
    const code = num(body.error.code);
    if (code === 4) throw new RateLimitError('deezer');
    throw new SourceError('deezer', str(body.error.message) ?? 'Permintaan ditolak', code === 800 ? 404 : undefined);
  }
  return body;
}

function toTrack(r: Rec, genre?: string): SourceTrack | null {
  const id = str(r.id);
  const title = str(r.title);
  const artistRec = isRec(r.artist) ? r.artist : {};
  const album = isRec(r.album) ? r.album : {};
  const artist = str(artistRec.name);
  const durationSec = num(r.duration);
  if (!id || !title || !artist || durationSec === undefined || !str(r.preview)) return null;
  return {
    id: `deezer:${id}`,
    source: 'deezer',
    title,
    artist,
    genre,
    durationSec,
    artworkUrl: str(album.cover_big) ?? str(album.cover_medium) ?? str(album.cover),
    hue: hueFrom(`${artist} ${title}`),
    playable: 'preview',
    album: str(album.title),
    artistId: str(artistRec.id),
    albumId: str(album.id),
    sourceUrl: str(r.link) ?? `https://www.deezer.com/track/${id}`,
  };
}

export function createDeezerSource(cfg: DeezerConfig = {}): MusicSource {
  const opts = { fetch: cfg.fetch, revalidate: cfg.revalidate };
  const url = (path: string, params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
    const s = q.toString();
    return `${BASE}${path}${s ? `?${s}` : ''}`;
  };
  const tracks = (body: Rec, genre?: string) =>
    list(body.data)
      .filter(isRec)
      .map((r) => toTrack(r, genre))
      .filter((t): t is SourceTrack => t !== null);

  return {
    id: 'deezer',
    async trending({ genre, limit, offset }) {
      const id = genre ? (GENRE_IDS[genre] ?? 0) : 0;
      return tracks(check(await getJson('deezer', url(`/chart/${id}/tracks`, { limit, index: offset }), opts)), genre);
    },
    async search(q, { limit }) {
      return tracks(check(await getJson('deezer', url('/search', { q, limit }), opts)));
    },
    async getTrack(id) {
      try {
        return toTrack(check(await getJson('deezer', url(`/track/${encodeURIComponent(id)}`), opts)));
      } catch (e) {
        if (e instanceof SourceError && e.status === 404) return null;
        throw e;
      }
    },
    /** URL preview bersifat sementara: selalu diambil ulang dari /track/<id> (tanpa cache); `exp=` di URL jadi expiresAt. */
    async getStream(id): Promise<Stream> {
      const preview = str(check(await getJson('deezer', url(`/track/${encodeURIComponent(id)}`), { fetch: cfg.fetch })).preview);
      if (!preview) throw new SourceError('deezer', 'Tidak ada preview untuk lagu ini');
      const exp = /[?&~=]exp=(\d+)/.exec(preview);
      return { url: preview, kind: 'mp3', expiresAt: exp ? Number(exp[1]) : undefined, playable: 'preview' };
    },
  };
}
