import { expect, test, type Page } from '@playwright/test';

/** ?audio=demo memutar /demo.wav (4 detik) untuk semua lagu contoh; preview membatasi 2 detik; broken memicu galat. */
async function open(page: Page, mode: string) {
  await page.goto(`/?audio=${mode}`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#vw h2');
}
type MediaProp = 'paused' | 'currentTime' | 'muted' | 'volume' | 'duration';
const media = (page: Page, prop: MediaProp) => page.evaluate((p) => document.querySelector('audio')?.[p] ?? null, prop);
const barTitle = (page: Page) => page.locator('.pl .nt').textContent();
const barBox = async (page: Page) => {
  const box = await page.locator('.pl .bar').boundingBox();
  if (!box) throw new Error('bar posisi tidak terlihat');
  return box;
};

test('audio nyata: Spasi memutar, posisi dan durasi mengikuti elemen audio', async ({ page }) => {
  await open(page, 'demo');
  await page.keyboard.press('Space');
  await expect.poll(() => media(page, 'paused')).toBe(false);
  await expect.poll(async () => Number(await media(page, 'currentTime')) > 0.4).toBe(true);
  await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuemax')).toBe('4');
  await expect.poll(() => page.locator('.pl .tt').textContent()).toBe('0:04');
  await page.keyboard.press('Space');
  await expect.poll(() => media(page, 'paused')).toBe(true);
});

test('seek lewat bar, senyap, dan volume mengubah elemen audio', async ({ page }) => {
  await open(page, 'demo');
  await page.keyboard.press('Space');
  await expect.poll(() => media(page, 'paused')).toBe(false);
  await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuemax')).toBe('4');
  await page.keyboard.press('Space');
  await expect.poll(() => media(page, 'paused')).toBe(true);
  const box = await barBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(async () => Math.round(Number(await media(page, 'currentTime')))).toBe(2);
  // klik di bar memfokuskan slider; pintasan keyboard global tidak berlaku saat fokus di kontrol
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('m');
  await expect.poll(() => media(page, 'muted')).toBe(true);
  await page.keyboard.press('m');
  await expect.poll(() => media(page, 'muted')).toBe(false);
  await page.locator('#vol').focus();
  await page.keyboard.press('Home');
  await expect.poll(() => media(page, 'volume')).toBe(0);
  await page.keyboard.press('End');
  await expect.poll(() => media(page, 'volume')).toBe(1);
});

test('ulang: di akhir audio kembali ke awal dan terus memutar', async ({ page }) => {
  await open(page, 'demo');
  await page.keyboard.press('Space');
  await page.locator('#pctl .rb').click();
  const box = await barBox(page);
  await page.mouse.click(box.x + box.width * 0.96, box.y + box.height / 2);
  await expect.poll(async () => Number(await media(page, 'currentTime')) < 1.5 && (await media(page, 'paused')) === false).toBe(true);
  expect(await barTitle(page)).toBe('Neon Mint');
});

test('stream gagal: toast "Gagal memutar audio" dan pemutar berhenti', async ({ page }) => {
  await open(page, 'broken');
  await page.keyboard.press('Space');
  await expect.poll(() => page.locator('#toast.s').textContent()).toBe('Gagal memutar audio');
  await expect.poll(() => page.evaluate(() => document.body.classList.contains('ply'))).toBe(false);
});

test('preview: durasi dibatasi, berhenti di batas lalu lanjut otomatis', async ({ page }) => {
  await open(page, 'preview');
  await page.keyboard.press('Space');
  await expect.poll(() => barTitle(page)).toBe('Neon Mint');
  await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuemax')).toBe('2');
  await expect.poll(async () => (await barTitle(page)) !== 'Neon Mint').toBe(true);
  await expect.poll(() => media(page, 'paused')).toBe(false);
});
