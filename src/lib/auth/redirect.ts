/**
 * Tujuan setelah masuk lewat tautan email: hanya alamat di situs ini (path relatif, atau URL bersitus sama) yang diterima.
 * Selain itu (situs lain, //host, javascript:, rusak) kembali ke `fallback`: mencegah open redirect lewat parameter `next`.
 */
export function safeNext(raw: string | null | undefined, origin: string, fallback = '/profile'): string {
  if (!raw) return fallback;
  try {
    const u = new URL(raw, origin);
    return u.origin === origin ? u.pathname + u.search : fallback;
  } catch {
    return fallback;
  }
}
