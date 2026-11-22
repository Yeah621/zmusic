import { dataMode } from '@/lib/data/mode';
import { supabaseConfigured } from '@/lib/supabase/config';
import { createFakeAuthPort } from './fake-port';
import { createSupabasePort } from './supabase-port';
import type { AuthPort } from './types';

let fake: AuthPort | undefined;
let real: AuthPort | undefined;

/** Port auth yang berlaku: tiruan di mode contoh, Supabase bila dikonfigurasi, selain itu null (akun nonaktif, hanya tamu). */
export function getAuthPort(): AuthPort | null {
  if (dataMode() === 'sample') return (fake ??= createFakeAuthPort());
  if (!supabaseConfigured()) return null;
  return (real ??= createSupabasePort());
}
