/** Detik → m:ss. Padanan fmt() di reference/zmusic-fixed.html. */
export const fmt = (s: number): string => (s / 60 | 0) + ':' + String(s % 60 | 0).padStart(2, '0');

/** Sapaan menurut jam (0–23). Padanan greet() di HTML. */
export const greet = (h: number): string => (h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam');
