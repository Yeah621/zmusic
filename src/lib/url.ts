/** decodeURIComponent yang tidak melempar: nilai yang tidak valid dikembalikan apa adanya. */
export const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Alamat http(s) yang aman untuk href dan url(): skema lain (javascript:, data:, ...) ditolak. Mengembalikan bentuk ternormalisasi atau null. */
export function httpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}
