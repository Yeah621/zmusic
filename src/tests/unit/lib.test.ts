import { describe, expect, it } from 'vitest';
import { genArt } from '@/lib/cover-art';
import { fmt, greet } from '@/lib/format';
import { waveHeights } from '@/lib/waveform';
import ref from '../fixtures/reference.json';

describe('genArt', () => {
  it('identik dengan HTML untuk 20 pasangan (h, s)', () => {
    expect(ref.genArt).toHaveLength(20);
    for (const { h, s, out } of ref.genArt) expect(genArt(h, s)).toBe(out);
  });

  it('hasil konsisten saat dipanggil ulang (cache)', () => {
    const { h, s, out } = ref.genArt[3];
    expect(genArt(h, s)).toBe(out);
    expect(genArt(h, s)).toBe(out);
  });
});

describe('fmt', () => {
  it('sama dengan HTML', () => {
    for (const { v, out } of ref.fmt) expect(fmt(v)).toBe(out);
  });
});

describe('greet', () => {
  it('sapaan menurut jam', () => {
    expect([0, 10, 11, 14, 15, 17, 18, 23].map((h) => greet(h))).toEqual(['Selamat pagi', 'Selamat pagi', 'Selamat siang', 'Selamat siang', 'Selamat sore', 'Selamat sore', 'Selamat malam', 'Selamat malam']);
  });
});

describe('waveHeights', () => {
  it('sama dengan bars() di HTML', () => {
    for (const { seed, heights } of ref.waveHeights) {
      expect(heights).toHaveLength(56);
      expect(waveHeights(seed)).toEqual(heights);
    }
  });
});
