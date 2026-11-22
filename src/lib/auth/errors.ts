import type { AuthErrorCode } from './types';

export interface ErrorLike {
  code?: string | null;
  status?: number | null;
  name?: string | null;
}

const BY_CODE: Readonly<Record<string, AuthErrorCode>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  email_exists: 'email_exists',
  user_already_exists: 'email_exists',
  weak_password: 'weak_password',
  email_address_invalid: 'invalid_email',
  validation_failed: 'invalid_input',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  over_sms_send_rate_limit: 'rate_limited',
  email_address_not_authorized: 'email_not_allowed',
  signup_disabled: 'signup_disabled',
  email_provider_disabled: 'signup_disabled',
};

/**
 * Peta galat Supabase Auth ke kode kita. Memakai error.code, name, dan status, bukan mencocokkan teks pesan
 * (anjuran dokumentasi Supabase: teks pesan bisa berubah). null = tidak ada galat.
 */
export function mapAuthError(e: ErrorLike | null | undefined): AuthErrorCode | null {
  if (!e) return null;
  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];
  if (e.status === 429) return 'rate_limited';
  if (e.name === 'AuthRetryableFetchError' || e.status === 0) return 'network';
  return 'unknown';
}

/** Galat yang dilempar (bukan dikembalikan) pustaka: kegagalan jaringan, atau Supabase belum dikonfigurasi. */
export function thrownAuthError(e: unknown): AuthErrorCode {
  if (e instanceof TypeError) return 'network';
  if (e instanceof Error && e.message.startsWith('Supabase belum dikonfigurasi')) return 'unconfigured';
  return typeof e === 'object' && e !== null ? (mapAuthError(e as ErrorLike) ?? 'unknown') : 'unknown';
}

export interface AuthMessage {
  /** kolom formulir yang diberi pesan; null = tampilkan sebagai toast */
  field: 'name' | 'email' | 'pw' | null;
  message: string;
}

/** Pesan untuk pengguna (bahasa Indonesia, gaya sama dengan validasi di HTML). */
export function authMessage(code: AuthErrorCode): AuthMessage {
  switch (code) {
    case 'invalid_credentials':
      return { field: 'pw', message: 'Email atau kata sandi salah' };
    case 'email_not_confirmed':
      return { field: 'email', message: 'Email belum dikonfirmasi. Periksa kotak masukmu.' };
    case 'email_exists':
      return { field: 'email', message: 'Email sudah terdaftar. Coba masuk.' };
    case 'weak_password':
      return { field: 'pw', message: 'Kata sandi terlalu lemah. Coba yang lebih panjang atau lebih unik.' };
    case 'invalid_email':
      return { field: 'email', message: 'Alamat email ini tidak diterima. Gunakan email lain.' };
    case 'invalid_input':
      return { field: null, message: 'Data yang dikirim tidak valid. Periksa email dan kata sandi.' };
    case 'rate_limited':
      return { field: null, message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' };
    case 'email_not_allowed':
      return { field: null, message: 'Server email belum bisa mengirim ke alamat ini. Hubungi admin.' };
    case 'signup_disabled':
      return { field: null, message: 'Pendaftaran sedang ditutup.' };
    case 'network':
      return { field: null, message: 'Tidak ada koneksi. Periksa jaringanmu lalu coba lagi.' };
    case 'unconfigured':
      return { field: null, message: 'Akun belum aktif di server ini (Supabase belum dikonfigurasi).' };
    default:
      return { field: null, message: 'Terjadi galat. Coba lagi sebentar.' };
  }
}
