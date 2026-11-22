import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseKey, supabaseUrl } from './config';

/**
 * Menyegarkan token sesi Supabase pada tiap permintaan (Server Component tidak bisa menulis cookie), lalu meneruskan
 * cookie baru ke peramban dan ke render berikutnya. Aturan dari dokumentasi Supabase: tidak ada kode di antara
 * createServerClient dan getClaims(), dan respons yang dikembalikan harus `supabaseResponse` ini.
 * Berbeda dari contoh resminya, tamu TIDAK dialihkan ke /login: ZMusic boleh dijelajahi tanpa masuk (gerbang tamu ada di UI).
 * Tanpa konfigurasi Supabase: tidak berbuat apa-apa.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });
  if (!supabaseUrl || !supabaseKey) return supabaseResponse;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        // Header cache dari Supabase mencegah CDN menyimpan respons yang membawa cookie sesi
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  await supabase.auth.getClaims();
  return supabaseResponse;
}
