export class SourceError extends Error {
  constructor(
    readonly source: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SourceError';
  }
}

/** Batas permintaan terlampaui (HTTP 429 atau galat kuota dari sumber). */
export class RateLimitError extends SourceError {
  constructor(
    source: string,
    readonly retryAfterSec?: number,
  ) {
    super(source, 'Batas permintaan terlampaui', 429);
    this.name = 'RateLimitError';
  }
}

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** detik cache data fetch Next.js; tanpa nilai = tidak di-cache */
  revalidate?: number;
  fetch?: typeof fetch;
}

/** GET JSON dengan batas waktu. Pesan galat sengaja generik: URL (yang bisa memuat kunci) tidak ikut terbawa. */
export async function getJson(source: string, url: string, o: FetchOptions = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 8000);
  try {
    const init = { headers: { accept: 'application/json', ...o.headers }, signal: ctrl.signal, ...(o.revalidate ? { next: { revalidate: o.revalidate } } : { cache: 'no-store' }) } as RequestInit;
    const res = await (o.fetch ?? fetch)(url, init);
    if (res.status === 429) throw new RateLimitError(source, Number(res.headers.get('retry-after')) || undefined);
    if (res.status === 404) throw new SourceError(source, 'Tidak ditemukan', 404);
    if (!res.ok) throw new SourceError(source, `HTTP ${res.status}`, res.status);
    return await res.json();
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError(source, e instanceof Error && e.name === 'AbortError' ? 'Waktu habis' : 'Gagal menghubungi sumber');
  } finally {
    clearTimeout(timer);
  }
}
