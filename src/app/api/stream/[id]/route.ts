import { NextResponse, type NextRequest } from 'next/server';
import { clampInt, errorResponse } from '@/lib/api';
import { getStreamById } from '@/lib/sources';

/** GET /api/stream/<id global>?q=0|1|2 : URL stream baru (tanpa cache; URL preview Deezer bisa kedaluwarsa). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const stream = await getStreamById(decodeURIComponent(id), clampInt(req.nextUrl.searchParams.get('q'), 0, 2, 1) as 0 | 1 | 2);
    if (!stream) return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json(stream, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
