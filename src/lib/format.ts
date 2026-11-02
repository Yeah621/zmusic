/** Detik → m:ss. Padanan fmt() di reference/zmusic-fixed.html. */
export const fmt = (s: number): string => (s / 60 | 0) + ':' + String(s % 60 | 0).padStart(2, '0');
