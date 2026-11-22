import { safeNext } from './redirect';

export const OTP_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
export type OtpType = (typeof OTP_TYPES)[number];
export const isOtpType = (v: string | null): v is OtpType => v !== null && (OTP_TYPES as readonly string[]).includes(v);

export interface ConfirmInput {
  tokenHash: string | null;
  type: string | null;
  next: string | null;
  origin: string;
}

/**
 * Tujuan (path di situs ini) setelah tautan konfirmasi email dibuka. `verify` memeriksa token ke Supabase
 * (supabase.auth.verifyOtp di route handler) dan mengembalikan true bila berhasil. Gagal atau tak lengkap: /login?galat=konfirmasi.
 */
export async function confirmDestination(i: ConfirmInput, verify: (a: { type: OtpType; tokenHash: string }) => Promise<boolean>): Promise<string> {
  if (i.tokenHash && isOtpType(i.type)) {
    let ok = false;
    try {
      ok = await verify({ type: i.type, tokenHash: i.tokenHash });
    } catch {
      ok = false;
    }
    if (ok) return safeNext(i.next, i.origin);
  }
  return '/login?galat=konfirmasi';
}
