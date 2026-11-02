import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_INIT } from '@/lib/theme-init';

const html = readFileSync('reference/zmusic-fixed.html', 'utf8');
const lf = (s: string) => s.replace(/\r\n/g, '\n').trim();

describe('Aturan Emas #3: CSS dan skrip tema dipindah utuh', () => {
  it('src/styles/zmusic.css sama dengan <style> di HTML', () => {
    const css = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
    expect(css.length).toBeGreaterThan(10000);
    expect(lf(readFileSync('src/styles/zmusic.css', 'utf8'))).toBe(lf(css));
  });

  it('skrip tema awal sama dengan HTML', () => {
    expect(THEME_INIT).toBe(/<script>(try\{var s=localStorage[\s\S]*?)<\/script>/.exec(html)?.[1]);
  });
});
