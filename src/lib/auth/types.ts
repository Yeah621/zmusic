/** Pengguna yang sedang masuk, seperti yang ditampilkan UI. */
export interface AuthUser {
  id: string;
  name: string;
  handle: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'email_exists'
  | 'weak_password'
  | 'invalid_email'
  | 'invalid_input'
  | 'rate_limited'
  | 'email_not_allowed'
  | 'signup_disabled'
  | 'network'
  | 'unconfigured'
  | 'unknown';

/** user terisi = sesi aktif. user null + needsConfirmation = email konfirmasi terkirim, belum ada sesi. */
export type AuthOutcome = { ok: true; user: AuthUser | null; needsConfirmation: boolean } | { ok: false; code: AuthErrorCode };

/**
 * Batas antara UI dan penyedia akun. UI hanya bicara dengan port ini (Aturan Emas 6); implementasinya: Supabase (supabase-port.ts)
 * atau tiruan tanpa jaringan untuk mode contoh dan uji (fake-port.ts).
 */
export interface AuthPort {
  signUp(i: { name: string; email: string; password: string }): Promise<AuthOutcome>;
  signIn(i: { email: string; password: string }): Promise<AuthOutcome>;
  signOut(): Promise<void>;
  /** Pantau sesi: `cb` dipanggil sekali di awal dengan pengguna saat ini (null = tamu) dan tiap sesi berubah. Mengembalikan fungsi berhenti. */
  watch(cb: (user: AuthUser | null) => void): () => void;
}
