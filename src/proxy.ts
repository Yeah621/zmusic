import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Next.js 16: proxy.ts menggantikan middleware.ts. Menyegarkan sesi Supabase; tidak mengalihkan tamu.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Lewati aset statis, berkas audio uji, dan route publik ber-cache CDN (/api/home, /api/search, /api/stream) yang tidak butuh sesi.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/home|api/search|api/stream|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wav|mp3)$).*)'],
};
