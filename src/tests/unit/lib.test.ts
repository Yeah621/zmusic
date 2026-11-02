import { describe, expect, it } from 'vitest';
import { genArt } from '@/lib/cover-art';
import { fmt } from '@/lib/format';
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
