import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseKey, supabaseUrl } from './config';

/**
 * Klien Supabase untuk server (route handler dan Server Component), membaca sesi dari cookie permintaan.
 * Jangan simpan di variabel global: buat satu per permintaan. Kunci rahasia (service_role) TIDAK dipakai di sini.
 */
export async function createClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL dan kunci publik)');
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cookie tidak bisa ditulis di sini. Aman diabaikan karena proxy.ts menyegarkan sesi.
        }
      },
    },
  });
}
