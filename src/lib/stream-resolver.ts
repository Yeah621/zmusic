import { PREVIEW_SECONDS } from '@/lib/constants';
import { trackAt } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';

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
 * Mode demo untuk uji: ?audio=demo memutar nada uji /demo.wav untuk SEMUA lagu, ?audio=preview membatasi 2 detik
 * (meniru preview Deezer), ?audio=broken memicu galat. Disimpan di sessionStorage. Tanpa mode demo, lagu contoh memakai
 * jam simulasi (tanpa audio) dan lagu dari sumber musik memakai stream nyata dari /api/stream.
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

const KINDS: readonly string[] = ['mp3', 'aac', 'ogg', 'flac', 'hls'];

/**
 * Stream nyata lagu sumber luar lewat /api/stream/<id> (URL selalu diambil baru: preview Deezer cepat kedaluwarsa).
 * Lagu preview dibatasi PREVIEW_SECONDS detik. Galat jaringan/server dilempar; AudioEngine menampilkannya sebagai toast.
 */
const liveResolver: StreamResolver = async (i) => {
  const x = trackAt(i);
  if (!x || x.source === 'sample') return null;
  const res = await fetch(`/api/stream/${encodeURIComponent(x.id)}?q=${useLibraryStore.getState().quality}`);
  if (!res.ok) throw new Error(`stream ${res.status}`);
  const j: unknown = await res.json();
  const o = typeof j === 'object' && j !== null ? (j as { url?: unknown; kind?: unknown; playable?: unknown }) : {};
  if (typeof o.url !== 'string' || !o.url || typeof o.kind !== 'string' || !KINDS.includes(o.kind)) throw new Error('stream tidak valid');
  return { url: o.url, kind: o.kind as ResolvedKind, limitSec: (o.playable ?? x.playable) === 'preview' ? PREVIEW_SECONDS : undefined };
};

const defaultResolver: StreamResolver = async (i) => (await demoResolver(i)) ?? liveResolver(i);

let resolver: StreamResolver = defaultResolver;
export const setStreamResolver = (r: StreamResolver): void => {
  resolver = r;
};
export const resolveStream: StreamResolver = (i) => resolver(i);
