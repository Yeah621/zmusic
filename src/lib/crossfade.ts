export const CROSSFADE_SECONDS = 4;

/**
 * Pengali volume (0–1) untuk fade-in di awal dan fade-out di akhir lagu. Dengan satu elemen audio ini
 * "crossfade" berbentuk lekukan turun-naik antar lagu, bukan tumpang tindih dua lagu.
 */
export function gainAt(pos: number, duration: number, fade: number): number {
  if (fade <= 0 || duration <= 0) return 1;
  return Math.max(0, Math.min(1, pos / fade, (duration - pos) / fade));
}
