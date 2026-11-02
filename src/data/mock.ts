// P0-06: data contoh disalin dari bagian DATA di reference/zmusic-fixed.html (uji: src/tests/unit/mock.test.ts).
// Nama properti sengaja sama dengan HTML agar markup dipindah 1:1.
// Track: t judul, a artis, g genre, h hue, b bpm, d durasi (detik), i indeks | Album: n judul, a artis, y tahun, h hue, t indeks lagu
// Artist: n nama, h hue, f pendengar (rb), g genre

export type Genre = 'Electronic' | 'Lo-fi' | 'Pop' | 'Hip-hop' | 'Akustik';
export interface Track { t: string; a: string; g: Genre; h: number; b: number; d: number; i: number; pv?: 'u' | 'p' }
export interface Album { n: string; a: string; y: number; h: number; t: number[] }
export interface Artist { n: string; h: number; f: number; g: Genre }
export interface QuickPlaylist { n: string; g: Genre; h: number }
export type GenreTile = readonly [label: string, slug: string, hue: number];

const RAW: Omit<Track, 'i'>[] = [
  { t: 'Neon Mint', a: 'Zara Lune', g: 'Electronic', h: 165, b: 118, d: 204 },
  { t: 'Hujan di Jakarta', a: 'Raya & Senja', g: 'Lo-fi', h: 210, b: 78, d: 187 },
  { t: 'Aurora Kita', a: 'Nadin Skye', g: 'Pop', h: 290, b: 104, d: 221 },
  { t: 'Midnight Drive', a: 'KAIRO', g: 'Electronic', h: 250, b: 124, d: 198 },
  { t: 'Kopi & Kamu', a: 'Bumi Akustik', g: 'Akustik', h: 30, b: 86, d: 176 },
  { t: 'Gelombang', a: 'Oshi', g: 'Hip-hop', h: 340, b: 92, d: 195 },
  { t: 'Fajar Pertama', a: 'Lintang', g: 'Akustik', h: 50, b: 72, d: 214 },
  { t: 'Pixel Rain', a: 'Zara Lune', g: 'Lo-fi', h: 185, b: 80, d: 169 },
  { t: 'Satu Semesta', a: 'Nadin Skye', g: 'Pop', h: 320, b: 110, d: 208 },
  { t: 'Bass Garden', a: 'KAIRO', g: 'Hip-hop', h: 140, b: 96, d: 183 },
  { t: 'Neon Rooftop', a: 'Zara Lune', g: 'Electronic', h: 175, b: 122, d: 192 },
  { t: 'Teduh', a: 'Raya & Senja', g: 'Lo-fi', h: 220, b: 74, d: 201 },
  { t: 'Langit Biru', a: 'Nadin Skye', g: 'Pop', h: 270, b: 100, d: 189 },
  { t: 'Turbo', a: 'KAIRO', g: 'Electronic', h: 260, b: 128, d: 178 },
];

export const T: Track[] = RAW.map((x, i) => ({ ...x, i }));

export const AL: Album[] = [
  { n: 'Neon Mint', a: 'Zara Lune', y: 2025, h: 165, t: [0, 7, 10] },
  { n: 'Senja di Kota', a: 'Raya & Senja', y: 2024, h: 210, t: [1, 11] },
  { n: 'Aurora', a: 'Nadin Skye', y: 2025, h: 290, t: [2, 8, 12] },
  { n: 'Midnight Drive', a: 'KAIRO', y: 2026, h: 250, t: [3, 9, 13] },
  { n: 'Akustik Pagi', a: 'Bumi Akustik', y: 2023, h: 30, t: [4] },
  { n: 'Gelombang', a: 'Oshi', y: 2025, h: 340, t: [5] },
  { n: 'Fajar', a: 'Lintang', y: 2024, h: 50, t: [6] },
];

export const G: string[] = ['Semua', 'Pop', 'Lo-fi', 'Electronic', 'Hip-hop', 'Akustik'];

export const PB: QuickPlaylist[] = [
  { n: 'Chill Mint', g: 'Lo-fi', h: 165 },
  { n: 'Fokus Kerja', g: 'Akustik', h: 45 },
  { n: 'Gym Boost', g: 'Hip-hop', h: 340 },
  { n: 'Late Night', g: 'Electronic', h: 250 },
  { n: 'Pop Hari Ini', g: 'Pop', h: 300 },
  { n: 'Santai Sore', g: 'Akustik', h: 25 },
];

export const TL: GenreTile[] = [
  ['Pop', 'pop', 320],
  ['Santai', 'lo-fi', 200],
  ['Elektronik', 'electronic', 250],
  ['Hip-hop', 'hip-hop', 345],
  ['Akustik', 'akustik', 40],
  ['Malam', 'midnight', 270],
];

/** Padanan mkA() di HTML. `owner` = nama pengguna yang sedang masuk (artisnya selalu "1 rb pendengar"). */
export function makeArtist(n: string, tracks: readonly Track[] = T, owner = ''): Artist {
  const x = tracks.find((y) => y.a === n);
  if (!x) throw new Error(`Tidak ada lagu oleh ${n}`);
  return { n, h: x.h, f: n === owner ? 1 : ((n.length * 37 + 23) % 90) + 10, g: x.g };
}

export const A: Artist[] = [...new Set(T.map((x) => x.a))].map((n) => makeArtist(n));
