let go: ((path: string) => void) | null = null;

/** Didaftarkan ShellEffects dengan router Next: memungkinkan kode di luar komponen (aksi, gerbang tamu) pindah halaman tanpa muat ulang. */
export function setNavigator(fn: ((path: string) => void) | null): void {
  go = fn;
}

/** Pindah halaman dari luar komponen. Tanpa navigator terdaftar, muat halaman tujuan. */
export function navigate(path: string): void {
  if (go) go(path);
  else if (typeof location !== 'undefined') location.assign(path);
}
