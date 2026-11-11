import { NextResponse, type NextRequest } from 'next/server';
import { cacheHeaders, clampInt, errorResponse } from '@/lib/api';
import { searchAll } from '@/lib/sources';

/** GET /api/search?q=&limit= : pencarian gabungan semua sumber (cache 5 menit). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = (p.get('q') ?? '').trim().slice(0, 100);
  if (!q) return NextResponse.json({ tracks: [], warnings: [] }, { headers: cacheHeaders(300) });
  try {
    return NextResponse.json(await searchAll(q, clampInt(p.get('limit'), 1, 50, 20)), { headers: cacheHeaders(300) });
  } catch (e) {
    return errorResponse(e);
  }
}
