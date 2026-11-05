export type Rule = readonly [ok: (v: string) => boolean, message: string];

const min2 = (what: string): Rule => [(v) => v.trim().length >= 2, `${what} minimal 2 karakter`];

/** Aturan validasi form, pesan sama dengan HTML. */
export const RULES = {
  name: min2('Nama'),
  title: min2('Judul'),
  email: [(v) => /^\S+@\S+\.\S+$/.test(v), 'Format email tidak valid'] as Rule,
  password: [(v) => v.length >= 8, 'Kata sandi minimal 8 karakter'] as Rule,
  handle: [(v) => /^[\w.]{3,24}$/.test(v), '3–24 karakter: huruf, angka, titik, garis bawah'] as Rule,
};

/** Padanan chk() di HTML: pesan galat per kolom yang gagal (kosong = valid). */
export function validate(values: Record<string, string>, rules: Record<string, Rule>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const name of Object.keys(rules)) {
    const [ok, message] = rules[name];
    if (!ok(values[name] ?? '')) errors[name] = message;
  }
  return errors;
}

/** Fokuskan kolom pertama yang gagal (id input = f-<nama>). */
export function focusFirstInvalid(errors: Record<string, string>, order: readonly string[]): void {
  const first = order.find((n) => errors[n]);
  if (first) document.getElementById(`f-${first}`)?.focus();
}
