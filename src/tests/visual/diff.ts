import type { Page } from '@playwright/test';

/** Rasio piksel berbeda (0–1) antara dua PNG. Dihitung di browser agar tanpa dependensi tambahan. */
export async function diffRatio(page: Page, a: Buffer, b: Buffer): Promise<number> {
  await page.goto('about:blank');
  return page.evaluate(
    async ([x, y]) => {
      const load = async (b64: string) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d');
        if (!ctx) throw new Error('Canvas 2D tidak tersedia');
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, bmp.width, bmp.height);
      };
      const [p, q] = await Promise.all([load(x), load(y)]);
      if (p.width !== q.width || p.height !== q.height) return 1;
      let n = 0;
      for (let i = 0; i < p.data.length; i += 4) {
        const d = Math.max(Math.abs(p.data[i] - q.data[i]), Math.abs(p.data[i + 1] - q.data[i + 1]), Math.abs(p.data[i + 2] - q.data[i + 2]));
        if (d > 12) n++;
      }
      return n / (p.width * p.height);
    },
    [a.toString('base64'), b.toString('base64')],
  );
}
