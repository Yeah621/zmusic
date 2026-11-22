import { expect, test, type Page } from '@playwright/test';
import { useSampleData } from '../support';

// Alur akun di mode contoh (port auth tiruan, tanpa jaringan): perilaku sama dengan prototipe. Alur Supabase sungguhan
// (pustaka, cookie, konfirmasi email) tidak bisa diuji tanpa proyek Supabase; lihat daftar periksa di docs/supabase.md.
test.beforeEach(({ context }) => useSampleData(context));

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#vw h2, #vw h3, #vw .empty, #vw .auth');
}
const submit = (page: Page, label: 'Masuk' | 'Daftar') => page.getByRole('button', { name: label, exact: true }).click();

test('pengguna contoh langsung aktif di mode contoh; avatar dan sapaan memakai namanya', async ({ page }) => {
  await open(page, '/');
  await expect(page.locator('#avt')).toHaveText('Z');
  await expect(page.locator('h2.gr')).toContainText('Zee');
});

test('Daftar: kolom kosong ditolak dengan pesan yang sama seperti HTML, fokus ke kolom pertama yang salah', async ({ page }) => {
  await open(page, '/register');
  await submit(page, 'Daftar');
  await expect(page.locator('#e-name')).toHaveText('Nama minimal 2 karakter');
  await expect(page.locator('#e-email')).toHaveText('Format email tidak valid');
  await expect(page.locator('#e-pw')).toHaveText('Kata sandi minimal 8 karakter');
  await expect(page.locator('#f-name')).toBeFocused();
  await expect(page).toHaveURL(/\/register$/);
});

test('Daftar: berhasil membuka Profil dengan nama baru dan menyapa di toast', async ({ page }) => {
  await open(page, '/register');
  await page.locator('#f-name').fill('Ani Rahma');
  await page.locator('#f-email').fill('ani@contoh.id');
  await page.locator('#f-pw').fill('rahasia123');
  await submit(page, 'Daftar');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('#toast')).toHaveText('Selamat datang, Ani Rahma');
  await expect(page.locator('.pbn h1')).toHaveText('Ani Rahma');
  await expect(page.locator('.pbn')).toContainText('@ani.rahma');
  await expect(page.locator('#avt')).toHaveText('A');
});

test('Masuk memakai bagian email sebelum @ sebagai nama', async ({ page }) => {
  await open(page, '/login');
  await page.locator('#f-email').fill('budi.santoso@contoh.id');
  await page.locator('#f-pw').fill('rahasia123');
  await submit(page, 'Masuk');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('.pbn h1')).toHaveText('budi.santoso');
});

test('Keluar: toast, tombol Masuk di bilah atas, dan Profil kembali tertutup untuk tamu', async ({ page }) => {
  await open(page, '/profile');
  await expect(page.locator('.pbn h1')).toHaveText('Zee Pratama');
  await page.getByRole('button', { name: 'Keluar' }).click();
  await expect(page.locator('#toast')).toHaveText('Kamu telah keluar');
  await expect(page.locator('#avt')).toHaveText('Masuk');
  await expect(page.locator('#avt')).toHaveAttribute('href', '/login');
  await expect(page.locator('#vw .empty h3')).toHaveText('Masuk untuk melihat profil');
  await open(page, '/upload'); // muat ulang: tamu di mode contoh kembali jadi pengguna contoh (tiruan tidak menyimpan sesi)
  await expect(page.locator('#avt')).toHaveText('Z');
});

test('tautan konfirmasi email yang gagal mengembalikan ke Masuk dengan pesan', async ({ page }) => {
  await open(page, '/login?galat=konfirmasi');
  await expect(page.locator('#toast')).toHaveText('Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Coba daftar atau masuk lagi.');
});
