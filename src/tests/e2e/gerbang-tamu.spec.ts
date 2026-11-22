import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './live-fixtures';

// Mode live tanpa sesi = tamu. Tamu boleh mencari dan memutar; suka, ikuti, playlist, komentar, unggah, dan profil
// membawa ke /login (padanan gate() di HTML). Berlaku juga bila Supabase sudah dikonfigurasi: konteks Playwright baru tidak punya sesi.
async function open(page: Page, url = '/') {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#vw h2, #vw .empty');
}
const toast = (page: Page) => page.locator('#toast');
const play = (page: Page, title: string) => page.locator('.card[data-a="play"] .tl b', { hasText: title }).click();

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('tamu: bilah atas menampilkan tombol Masuk; Profil dan Unggah tertutup', async ({ page }) => {
  await open(page);
  await expect(page.locator('#avt')).toHaveText('Masuk');
  await expect(page.locator('#avt')).toHaveAttribute('href', '/login');
  await open(page, '/profile');
  await expect(page.locator('#vw .empty h3')).toHaveText('Masuk untuk melihat profil');
  await open(page, '/upload');
  await expect(page.locator('#vw .empty h3')).toHaveText('Masuk untuk mengunggah');
});

test('tamu tetap bisa mencari dan memutar lagu', async ({ page }) => {
  await open(page);
  await play(page, 'Fajar Pertama');
  await expect(page.locator('.pl .nt')).toHaveText('Fajar Pertama');
});

test('suka lewat tombol hati dan pintasan L: ke /login, tidak ada yang tersimpan', async ({ page }) => {
  await open(page);
  const heart = page.locator('#list .tr').first().getByRole('button', { name: 'Suka' });
  await heart.click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(toast(page)).toHaveText('Masuk untuk menyukai lagu');
  await open(page);
  await expect(page.locator('#list .tr').first().getByRole('button', { name: 'Suka' })).toHaveAttribute('aria-pressed', 'false');
  await play(page, 'Fajar Pertama');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('l');
  await expect(page).toHaveURL(/\/login$/);
  await expect(toast(page)).toHaveText('Masuk untuk menyukai lagu');
});

test('Tambah ke playlist dan Playlist baru (sidebar): ke /login', async ({ page }) => {
  await open(page);
  await page.locator('#list .tr').first().click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Tambah ke playlist…' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(toast(page)).toHaveText('Masuk untuk menambahkan ke playlist');
  await open(page);
  await page.locator('.side').getByRole('button', { name: 'Playlist baru' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(toast(page)).toHaveText('Masuk untuk membuat playlist');
  await expect(page.locator('#dg')).not.toHaveAttribute('open', '');
});

test('komentar bertimestamp dan ikuti artis: ke /login', async ({ page }) => {
  await open(page);
  await play(page, 'Fajar Pertama');
  await expect(page.locator('.pl .nt')).toHaveText('Fajar Pertama');
  await page.locator('#cmt').fill('Intro-nya bagus');
  await page.getByRole('button', { name: 'Kirim komentar' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(toast(page)).toHaveText('Masuk untuk berkomentar');
  await open(page, '/artist/lintang');
  await page.locator('.ab .fol').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(toast(page)).toHaveText('Masuk untuk mengikuti artis');
});
