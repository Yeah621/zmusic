import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { diffRatio } from './diff';
import { MAX_DIFF, ROUTES, THEMES, VIEWPORTS } from './routes';

const REF = pathToFileURL(path.resolve('reference/zmusic-fixed.html')).href;
const FROZEN = new Date('2026-01-15T09:00:00+07:00'); // sapaan Beranda bergantung jam
const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

async function shot(page: Page, url: string): Promise<Buffer> {
  await page.goto(url);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForFunction(() => !document.getElementById('vw')?.hasAttribute('aria-busy') && !document.querySelector('#vw .sk:not(#sent)'));
  return page.screenshot({ animations: 'disabled', caret: 'hide' });
}

test('harness: referensi vs referensi = 0%', async ({ page, context }) => {
  await context.clock.setFixedTime(FROZEN);
  const a = await shot(page, `${REF}#/`);
  const b = await shot(await context.newPage(), `${REF}#/`);
  const n = await diffRatio(page, a, b);
  console.log(`[visual] harness → ${pct(n)}`);
  expect(n).toBe(0);
});

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    test.describe(`${theme} ${vp.width}px`, () => {
      test.use({ colorScheme: theme, viewport: vp });
      for (const r of ROUTES) {
        test(r.name, async ({ page, context }, info) => {
          test.skip(!r.ready, `menunggu ${r.task}`);
          await context.clock.setFixedTime(FROZEN);
          const a = await shot(page, REF + r.html);
          const b = await shot(page, r.next);
          const n = await diffRatio(page, a, b);
          console.log(`[visual] ${r.name} ${theme} ${vp.width}px → ${pct(n)}`);
          if (n > MAX_DIFF) {
            await info.attach('referensi', { body: a, contentType: 'image/png' });
            await info.attach('next', { body: b, contentType: 'image/png' });
          }
          expect(n, `${r.name}: ${pct(n)} piksel berbeda`).toBeLessThanOrEqual(MAX_DIFF);
        });
      }
    });
  }
}
