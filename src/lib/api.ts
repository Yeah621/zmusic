import { NextResponse } from 'next/server';
import { RateLimitError, SourceError } from '@/lib/sources';

export const clampInt = (v: string | null, min: number, max: number, fallback: number): number => {
  const n = Number(v);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Cache CDN: s-maxage detik, boleh basi selama 2x itu. */
export const cacheHeaders = (seconds: number): HeadersInit => ({ 'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}` });

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof RateLimitError) return NextResponse.json({ error: 'Terlalu banyak permintaan ke sumber musik' }, { status: 429, headers: { 'Retry-After': String(e.retryAfterSec ?? 5), 'Cache-Control': 'no-store' } });
  if (e instanceof SourceError) return NextResponse.json({ error: e.message }, { status: e.status === 404 ? 404 : 502, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ error: 'Galat server' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}
