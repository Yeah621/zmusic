import { expect, test, type Page } from '@playwright/test';

/** Buka halaman dan tunggu hidrasi + konten rute siap. */
async function open(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#vw h2, #vw .empty');
}
const barTitle = (page: Page) => page.locator('.pl .nt').textContent();
const hasClass = (page: Page, sel: string, cls: string) => page.evaluate(([s, c]) => document.querySelector(s)?.classList.contains(c) ?? false, [sel, cls]);
const count = (page: Page, sel: string) => page.locator(sel).count();
const queueTitles = (page: Page) => page.locator('#qq .tl b').allTextContents();

test('Spasi memutar/jeda; panah kanan dan kiri berpindah lagu', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Space');
  await expect.poll(() => barTitle(page)).toBe('Neon Mint');
  await expect.poll(() => hasClass(page, 'body', 'ply')).toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(() => hasClass(page, 'body', 'ply')).toBe(false);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => barTitle(page)).toBe('Hujan di Jakarta');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => barTitle(page)).toBe('Neon Mint');
});

test('L menyukai, M senyap, / memfokuskan pencarian', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('l');
  await expect.poll(() => page.locator('.pl .ph').getAttribute('aria-pressed')).toBe('true');
  await page.keyboard.press('m');
  await expect.poll(() => page.locator('#mt use').getAttribute('href')).toBe('#i-mute');
  await page.keyboard.press('/');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('q');
});

test('Q membuka Now Playing (sheet), Esc menutup, Tab terkurung di panel', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await open(page);
  await page.keyboard.press('q');
  await expect.poll(() => count(page, '#np.open')).toBe(1);
  const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#np button,#np input,#np [tabindex="0"]')].filter((x) => x.offsetParent !== null).length);
  for (let i = 0; i < n + 3; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('#np'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => count(page, '#np.open')).toBe(0);
});

test('slider posisi: panah geser 5 detik, Home dan End', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.locator('.pl .bar').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuenow')).toBe('5');
  await page.keyboard.press('End');
  await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuenow')).toBe('203');
  await page.keyboard.press('Home');
  await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuenow')).toBe('0');
});

test('menu lagu: antre, urutkan dengan panah dan seret, hapus', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Space');
  for (const row of [3, 4, 5]) {
    await page.locator(`#list .tr:nth-child(${row}) [data-a=more]`).click();
    await page.locator('#menu button', { hasText: 'Tambah ke antrean' }).click();
  }
  await expect.poll(() => queueTitles(page)).toEqual(['Aurora Kita', 'Midnight Drive', 'Kopi & Kamu']);
  await page.locator('#qq .tr:nth-child(1) .gp').focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => queueTitles(page)).toEqual(['Midnight Drive', 'Aurora Kita', 'Kopi & Kamu']);
  // panel Now Playing bisa digulir: pusatkan baris antrean agar tidak tertutup bar pemutar saat diseret
  await page.evaluate(() => document.querySelector('#qq .tr:nth-child(2)')?.scrollIntoView({ block: 'center' }));
  const g = await page.locator('#qq .tr:nth-child(1) .gp').boundingBox();
  const r = await page.locator('#qq .tr:nth-child(2)').boundingBox();
  if (!g || !r) throw new Error('baris antrean tidak terlihat');
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, r.y + r.height * 0.85, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => queueTitles(page)).toEqual(['Aurora Kita', 'Midnight Drive', 'Kopi & Kamu']);
  await page.locator('#qq .tr:nth-child(1) [data-a=rq]').click();
  await expect.poll(() => queueTitles(page)).toEqual(['Midnight Drive', 'Kopi & Kamu']);
});

test('klik kanan membuka menu lagu; Esc menutupnya', async ({ page }) => {
  await open(page);
  await page.locator('#list .tr:nth-child(2)').click({ button: 'right' });
  await expect.poll(() => count(page, '#menu.s')).toBe(1);
  expect(await page.locator('#menu.s button').first().textContent()).toBe('Putar berikutnya');
  await page.keyboard.press('Escape');
  await expect.poll(() => count(page, '#menu.s')).toBe(0);
});

test('saran pencarian: ketik, panah memilih, Esc menutup', async ({ page }) => {
  await open(page, '/search');
  await page.locator('#q').fill('zara');
  await expect.poll(() => count(page, '#sg.s [role=option]')).toBe(4);
  await expect.poll(() => count(page, '#vw .tr')).toBe(3);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => count(page, '#sg [aria-selected=true]')).toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(() => count(page, '#sg.s')).toBe(0);
});

test('saran pencarian: Enter pada saran lagu memutarnya', async ({ page }) => {
  await open(page, '/search');
  await page.locator('#q').fill('zara');
  await expect.poll(() => count(page, '#sg.s [role=option]')).toBe(4);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => barTitle(page)).toBe('Neon Mint');
  await expect.poll(() => count(page, '#sg.s')).toBe(0);
});

test('tema, toast suka (dengan Urungkan), timer tidur', async ({ page }) => {
  await open(page);
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const before = await theme();
  await page.locator('#th').click();
  await expect.poll(theme).toBe(before === 'dark' ? 'light' : 'dark');
  const like = '#list .tr:nth-child(1) button.lk:not([data-a=more])';
  await page.locator(like).click();
  await expect.poll(() => page.locator('#toast.s').textContent()).toBe('Ditambahkan ke Lagu Disukai');
  await page.locator(like).click();
  await expect.poll(() => page.locator('#toast.s').textContent()).toBe('Dihapus dari Lagu DisukaiUrungkan');
  await page.locator('#toast .ud').click();
  await expect.poll(() => page.locator(like).getAttribute('aria-pressed')).toBe('true');
  await page.locator('.pl [data-a=slp]').click();
  await page.locator('#menu button', { hasText: '15 menit' }).click();
  await expect.poll(() => page.locator('#toast.s').textContent()).toBe('Timer tidur: 15 menit');
});

test('dialog playlist baru: validasi lalu berhasil', async ({ page }) => {
  await open(page);
  await page.locator('.side button.nv').click();
  await expect.poll(() => count(page, '#dg[open]')).toBe(1);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('#e-pln').textContent()).toBe('Nama minimal 2 karakter');
  await page.locator('#f-pln').fill('Santai');
  await page.keyboard.press('Enter');
  await expect.poll(() => count(page, '#dg[open]')).toBe(0);
  await expect.poll(() => page.locator('#toast.s').textContent()).toBe('Playlist dibuat');
});
