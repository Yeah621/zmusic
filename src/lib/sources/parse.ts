export type Rec = Record<string, unknown>;

export const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
/** String tak kosong; angka diubah ke string (beberapa API mengirim id sebagai angka). */
export const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : typeof v === 'number' ? String(v) : undefined);
/** Angka dari number atau string numerik (Jamendo mengirim durasi sebagai string). */
export const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
