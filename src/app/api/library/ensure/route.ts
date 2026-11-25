import { NextResponse, type NextRequest } from 'next/server';
import { ensureTracks, parseEnsureBody } from '@/lib/server/ensure';
import { createServiceTrackDb } from '@/lib/server/track-db';
import { getTrackById } from '@/lib/sources';
import { createClient } from '@/lib/supabase/server';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * POST /api/library/ensure  { ids: ["jamendo:123", ...] }  →  { tracks: { "jamendo:123": { trackId, artistId } | null } }
 * Menyalin metadata lagu sumber luar ke tabel tracks (hanya server yang boleh menulisnya) agar bisa disukai, dimasukkan ke
 * playlist, atau masuk riwayat. Hanya untuk pengguna masuk; metadata diambil dari adapter, bukan dari badan permintaan.
 */
export async function POST(request: NextRequest) {
  if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'Harus application/json' }, { status: 415, headers: NO_STORE });
  const ids = parseEnsureBody(await request.json().catch(() => null));
  if (!ids) return NextResponse.json({ error: 'Badan permintaan tidak valid' }, { status: 400, headers: NO_STORE });

  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    signedIn = typeof data?.claims?.sub === 'string';
  } catch {
    signedIn = false;
  }
  if (!signedIn) return NextResponse.json({ error: 'Belum masuk' }, { status: 401, headers: NO_STORE });

  let db;
  try {
    db = createServiceTrackDb();
  } catch {
    return NextResponse.json({ error: 'Server belum dikonfigurasi' }, { status: 503, headers: NO_STORE });
  }
  return NextResponse.json({ tracks: await ensureTracks(db, (gid) => getTrackById(gid), ids) }, { headers: NO_STORE });
}
