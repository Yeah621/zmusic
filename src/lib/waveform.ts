/** Tinggi batang waveform (%): padanan bars() di HTML. `seed` = indeks lagu (pratinjau unggah memakai hue). */
export function waveHeights(seed: number): number[] {
  let s = seed * 7919 + 13;
  const out: number[] = [];
  for (let k = 0; k < 56; k++) {
    s = (s * 9301 + 49297) % 233280;
    const env = 0.55 + 0.45 * Math.sin((k / 56) * Math.PI);
    out.push(Math.round((14 + s / 2845) * env));
  }
  return out;
}
