/**
 * Penanda "navigasi senyap": mengetik di kolom cari mengganti URL (replaceState/push) tanpa boleh
 * menggulir ke atas atau memindahkan fokus dari kolom cari. Berisi pathname tujuan (sudah ternormalisasi).
 */
export const routeFlag: { silentPath: string | null } = { silentPath: null };

export const silentPathOf = (path: string): string => new URL(path, location.origin).pathname;
