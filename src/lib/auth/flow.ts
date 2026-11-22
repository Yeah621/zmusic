import { authMessage } from './errors';
import type { AuthPort, AuthUser } from './types';

export type AuthMode = 'login' | 'register';
export interface AuthInput {
  name: string;
  email: string;
  pw: string;
}

/** Apa yang harus dilakukan UI setelah formulir dikirim. */
export type AuthStep =
  | { kind: 'welcome'; user: AuthUser }
  | { kind: 'confirm' }
  | { kind: 'error'; field: 'name' | 'email' | 'pw' | null; message: string };

/**
 * Kirim formulir Masuk atau Daftar lewat port. Validasi isian (RULES) dikerjakan UI sebelum memanggil ini.
 * port null = akun tidak aktif (Supabase belum dikonfigurasi).
 */
export async function runAuth(port: AuthPort | null, mode: AuthMode, v: AuthInput): Promise<AuthStep> {
  if (!port) return { kind: 'error', ...authMessage('unconfigured') };
  const email = v.email.trim();
  const r = mode === 'register' ? await port.signUp({ name: v.name.trim(), email, password: v.pw }) : await port.signIn({ email, password: v.pw });
  if (!r.ok) return { kind: 'error', ...authMessage(r.code) };
  return r.user ? { kind: 'welcome', user: r.user } : { kind: 'confirm' };
}
