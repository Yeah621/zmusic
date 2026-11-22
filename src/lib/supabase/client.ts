import { createBrowserClient } from '@supabase/ssr';
import { supabaseKey, supabaseUrl } from './config';

/** Klien Supabase untuk peramban (sesi disimpan di cookie oleh @supabase/ssr; createBrowserClient memakai satu instans). */
export function createClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL dan kunci publik)');
  return createBrowserClient(supabaseUrl, supabaseKey);
}
