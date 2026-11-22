/**
 * Variabel publik Supabase. Nama baru (Publishable key) diutamakan; nama lama ANON_KEY tetap didukung.
 * Dirujuk secara literal supaya Next menyisipkan nilainya saat build; `||` agar nilai kosong di .env.example diabaikan.
 * Tanpa keduanya, fitur akun nonaktif (aplikasi tetap bisa dipakai sebagai tamu).
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;

export const supabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseKey);
