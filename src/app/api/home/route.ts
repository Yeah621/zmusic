import { NextResponse, type NextRequest } from 'next/server';
import { cacheHeaders, clampInt, errorResponse } from '@/lib/api';
import { trendingAll } from '@/lib/sources';
import { deriveShelves } from '@/lib/sources/shelves';

/** GET /api/home?genre=&limit=&offset= : lagu tren gabungan + rak artis dan album turunannya (cache 10 menit). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  try {
    const { tracks, warnings } = await trendingAll({ genre: p.get('genre') ?? undefined, limit: clampInt(p.get('limit'), 1, 50, 20), offset: clampInt(p.get('offset'), 0, 1000, 0) });
    return NextResponse.json({ tracks, ...deriveShelves(tracks), warnings }, { headers: cacheHeaders(600) });
  } catch (e) {
    return errorResponse(e);
  }
}
