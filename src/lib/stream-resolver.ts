export type ResolvedKind = 'mp3' | 'aac' | 'ogg' | 'flac' | 'hls';

export interface ResolvedStream {
  url: string;
  kind: ResolvedKind;
  /** batas putar (detik) untuk lagu preview */
  limitSec?: number;
}

/** Mengembalikan stream untuk lagu di indeks katalog, atau null = tanpa audio nyata (jam simulasi). */
export type StreamResolver = (index: number) => Promise<ResolvedStream | null>;

/**
 * Mode demo untuk lagu contoh (sampai data nyata di P2-06): ?audio=demo memutar nada uji /demo.wav,
 * ?audio=preview membatasi 2 detik (meniru preview Deezer), ?audio=broken memicu galat. Disimpan di sessionStorage.
 */
function demoMode(): string | null {
  try {
    const q = new URLSearchParams(location.search).get('audio');
    if (q) sessionStorage.setItem('zm-audio', q);
    return sessionStorage.getItem('zm-audio');
  } catch {
    return null;
  }
}

const demoResolver: StreamResolver = async () => {
  const mode = demoMode();
  if (!mode) return null;
  if (mode === 'broken') return { url: '/tidak-ada.mp3', kind: 'mp3' };
  return { url: '/demo.wav', kind: 'mp3', limitSec: mode === 'preview' ? 2 : undefined };
};

let resolver: StreamResolver = demoResolver;
export const setStreamResolver = (r: StreamResolver): void => {
  resolver = r;
};
export const resolveStream: StreamResolver = (i) => resolver(i);
