import { createAudiusSource } from './audius';
import { createDeezerSource } from './deezer';
import { RateLimitError } from './http';
import { dedupeKey, parseId } from './ids';
import { createJamendoSource } from './jamendo';
import type { MusicSource, Playable, SourceTrack, SourceWarning, Stream } from './types';

export { RateLimitError, SourceError } from './http';
export { makeId, parseId } from './ids';
export type { MusicSource, SourceId, SourceTrack, SourceWarning, Stream } from './types';

type Env = Record<string, string | undefined>;

/**
 * Sumber aktif menurut variabel lingkungan: Audius butuh AUDIUS_API_KEY (Bearer Token), Jamendo butuh JAMENDO_CLIENT_ID,
 * Deezer tanpa kunci. Setiap sumber bisa dimatikan dengan ENABLE_<SUMBER>=false (Jamendo dan Deezer hanya untuk aplikasi non-komersial).
 */
export function enabledSources(env: Env = process.env, fetchImpl?: typeof fetch): MusicSource[] {
  const on = (name: string) => (env[name] ?? 'true').toLowerCase() !== 'false';
  const out: MusicSource[] = [];
  if (on('ENABLE_AUDIUS') && env.AUDIUS_API_KEY) out.push(createAudiusSource({ bearerToken: env.AUDIUS_API_KEY, appName: env.AUDIUS_APP_NAME, fetch: fetchImpl, revalidate: 300 }));
  if (on('ENABLE_JAMENDO') && env.JAMENDO_CLIENT_ID) out.push(createJamendoSource({ clientId: env.JAMENDO_CLIENT_ID, fetch: fetchImpl, revalidate: 300 }));
  if (on('ENABLE_DEEZER')) out.push(createDeezerSource({ fetch: fetchImpl, revalidate: 300 }));
  return out;
}

export interface Gathered {
  tracks: SourceTrack[];
  warnings: SourceWarning[];
}

/** Bergiliran dari tiap sumber agar peringkat masing-masing terjaga. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

/** Gabungkan hasil: selang-seling antar sumber, lagu penuh lebih dulu, buang lagu ganda (yang penuh menang), batasi jumlah. */
export function mergeTracks(lists: SourceTrack[][], limit: number): SourceTrack[] {
  const ordered = interleave(lists);
  const sorted = [...ordered.filter((t) => t.playable === 'full'), ...ordered.filter((t) => t.playable !== 'full')];
  const seen = new Set<string>();
  const out: SourceTrack[] = [];
  for (const t of sorted) {
    const key = dedupeKey(t.title, t.artist);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, limit);
}

/** Jalankan `fn` di semua sumber; satu sumber gagal hanya menambah peringatan (Promise.allSettled). */
async function gather(sources: MusicSource[], limit: number, fn: (s: MusicSource) => Promise<SourceTrack[]>): Promise<Gathered> {
  const settled = await Promise.allSettled(sources.map(fn));
  const lists: SourceTrack[][] = [];
  const warnings: SourceWarning[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') lists.push(r.value);
    else warnings.push({ source: sources[i].id, message: r.reason instanceof Error ? r.reason.message : 'Gagal', rateLimited: r.reason instanceof RateLimitError || undefined });
  });
  return { tracks: mergeTracks(lists, limit), warnings };
}

export const searchAll = (q: string, limit: number, sources: MusicSource[] = enabledSources()): Promise<Gathered> => gather(sources, limit, (s) => s.search(q, { limit }));

export const trendingAll = (o: { genre?: string; limit: number; offset?: number }, sources: MusicSource[] = enabledSources()): Promise<Gathered> => gather(sources, o.limit, (s) => s.trending(o));

export async function getTrackById(id: string, sources: MusicSource[] = enabledSources()): Promise<SourceTrack | null> {
  const p = parseId(id);
  const src = p && sources.find((s) => s.id === p.source);
  return src && p ? src.getTrack(p.rawId) : null;
}

/** URL stream baru untuk lagu (id global). Mengembalikan juga `playable` agar pemutar membatasi preview 30 detik. */
export async function getStreamById(id: string, quality: 0 | 1 | 2 = 1, sources: MusicSource[] = enabledSources()): Promise<(Stream & { playable: Playable }) | null> {
  const p = parseId(id);
  const src = p && sources.find((s) => s.id === p.source);
  if (!src || !p) return null;
  const stream = await src.getStream(p.rawId, { quality });
  return { ...stream, playable: stream.playable ?? 'full' };
}
