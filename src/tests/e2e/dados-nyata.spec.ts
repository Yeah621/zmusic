import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { LIVE_TRACKS, mockApi } from './live-fixtures';

// Mode live (bawaan): data lewat /api/*, dipalsukan di peramban dengan lagu sintetis dari 3 sumber (lihat live-fixtures.ts).
const REF = pathToFileURL(path.resolve('reference/zmusic-fixed.html')).href;

async function open(page: Page, url = '/') {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#vw h2, #vw .empty');
}
const barTitle = (page: Page) => page.locator('.pl .nt').textContent();
const audio = <K extends 'paused' | 'currentTime' | 'src'>(page: Page, prop: K) => page.evaluate((p) => document.querySelector('audio')?.[p] ?? null, prop);
const titles = (page: Page, sel: string) => page.locator(sel).allTextContents();

/** Bentuk DOM tanpa teks, gaya, dan kelas sementara: tag + kelas + anak (anak beruntun yang sama dilipat), rekursif. */
const SKIP = ['rv', 'in', 'on', 'cur', 'q', 'dq', 'drag', 's'];
const shapes = (page: Page, selector: string) =>
  page.evaluate(
    ([sel, skip]) => {
      const sig = (el: Element): string => `${el.tagName.toLowerCase()}${[...el.classList].filter((c) => !skip.includes(c)).sort().map((c) => `.${c}`).join('')}[${[...el.children].map(sig).filter((x, i, a) => x !== a[i - 1]).join(',')}]`;
      return [...new Set([...document.querySelectorAll(sel)].map(sig))];
    },
    [selector, SKIP] as const,
  );
/** Urutan jenis elemen tingkat atas #vw (baris beruntun yang sama dilipat jadi satu). */
const layout = (page: Page) =>
  page.evaluate((skip) => {
    const seq = [...document.querySelectorAll('#vw > *')].map((e) => `${e.tagName.toLowerCase()}${[...e.classList].filter((c) => !skip.includes(c)).sort().map((c) => `.${c}`).join('')}`);
    return seq.filter((x, i) => x !== seq[i - 1]);
  }, SKIP);

test.describe('beranda', () => {
  test('lagu, artis, dan album dari API; artwork asli berlapis cover generatif', async ({ page }) => {
    const calls = await mockApi(page);
    await open(page);
    await expect(page.locator('#vw h2:not(.gr)')).toHaveText(['Artis Populer', 'Album Terbaru', 'Sedang Tren', 'Top Chart']);
    await expect(page.locator('.card[data-a="play"]')).toHaveCount(LIVE_TRACKS.length);
    await expect(page.locator('.ar')).toHaveCount(7);
    await expect(page.locator('a.card[href^="/album/"]')).toHaveCount(5);
    await expect(page.locator('#list .tr')).toHaveCount(6); // scroll tak hingga: 6 awal
    expect((await titles(page, '#list .tr .tl b'))[0]).toBe('Fajar Pertama');
    // artis: baris kedua = pendengar hanya di data contoh; data nyata menyebut sumbernya, tidak pernah angka karangan
    await expect(page.locator('.ar', { hasText: 'Lintang' }).locator('p')).toHaveText('Jamendo');
    await expect(page.locator('.ar', { hasText: 'Zara Lune' }).locator('p')).toHaveText('Audius · Deezer');
    const bg = await page.locator('.card[data-a="play"] .cv').first().evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(bg).toContain('https://art.test/fajar.svg');
    expect(bg).toContain('data:image/svg+xml'); // cadangan generatif tetap di bawahnya
    expect(calls.filter((c) => c.startsWith('/api/home'))).toEqual(['/api/home?limit=50']); // satu permintaan untuk semua bagian
  });

  test('lagu preview ditandai di baris dan kartu; lagu penuh tidak', async ({ page }) => {
    await mockApi(page);
    await open(page);
    await expect(page.locator('.card', { hasText: 'Aurora Kita' }).locator('.tl span')).toHaveText('Nadin Skye · Preview 30 detik');
    await expect(page.locator('.card', { hasText: 'Fajar Pertama' }).locator('.tl span')).toHaveText('Lintang');
  });

  test('chip genre menyaring lewat API tanpa memuat ulang halaman', async ({ page }) => {
    const calls = await mockApi(page);
    await open(page);
    await page.evaluate(() => ((window as unknown as { __keep: number }).__keep = 1));
    await page.getByRole('button', { name: 'Akustik', exact: true }).click();
    await expect(page.locator('.card[data-a="play"]')).toHaveCount(3);
    expect(calls).toContain('/api/home?limit=50&genre=Akustik');
    expect(await page.evaluate(() => (window as unknown as { __keep?: number }).__keep)).toBe(1);
    await page.getByRole('button', { name: 'Semua', exact: true }).click();
    await expect(page.locator('.card[data-a="play"]')).toHaveCount(LIVE_TRACKS.length);
  });

  test('galat: semua sumber gagal menampilkan "Coba lagi" yang berhasil setelah pulih', async ({ page }) => {
    const failing = { value: true };
    await mockApi(page, { failing });
    await open(page);
    await expect(page.locator('#vw .empty h3')).toHaveText('Gagal memuat');
    await expect(page.locator('#vw .empty p')).toHaveText('Sumber musik sedang tidak bisa dijangkau');
    failing.value = false;
    await page.getByRole('button', { name: 'Coba lagi' }).click();
    await expect(page.locator('#vw h2', { hasText: 'Sedang Tren' })).toBeVisible();
  });
});

test.describe('struktur DOM sama dengan HTML (data nyata tidak mengubah markup)', () => {
  const same = async (page: Page, ref: Page, selectors: string[]) => {
    for (const sel of selectors) {
      const live = await shapes(page, sel);
      const html = await shapes(ref, sel);
      expect(live.length, `${sel}: tidak ada elemen di data nyata`).toBeGreaterThan(0);
      for (const s of live) expect(html, `${sel}: bentuk tidak ada di HTML`).toContain(s);
    }
  };

  test('beranda', async ({ page, context }) => {
    await mockApi(page);
    const ref = await context.newPage();
    await ref.goto(`${REF}#/`);
    await ref.waitForSelector('#vw h2.gr');
    await open(page);
    expect(await layout(page)).toEqual(await layout(ref));
    await same(page, ref, ['.qa .qt', '.hero', '.card', '.ar', '.row', '.tr', '.chips', '.chips button']);
  });

  test('hasil cari, artis, dan album', async ({ page, context }) => {
    await mockApi(page);
    const ref = await context.newPage();
    await ref.goto(`${REF}#/search/lintang`);
    await ref.waitForSelector('#vw .top1');
    await open(page, '/search/lintang');
    expect(await layout(page)).toEqual(await layout(ref));
    await same(page, ref, ['.top1', '.tr', '.ar', '.card']);
    // artis dan album dibuka dari kartu (katalog sudah berisi artis lain, jadi "Penggemar juga suka" ada seperti di HTML)
    await open(page);
    await page.locator('.ar', { hasText: 'Lintang' }).click();
    await expect(page.locator('.ab h1')).toHaveText('Lintang');
    await ref.goto(`${REF}#/artist/6`);
    await ref.waitForSelector('#vw .ab');
    expect(await layout(page)).toEqual(await layout(ref));
    await same(page, ref, ['.ab', '.ab .cta', '.tr', '.row', '.bio']);
    await page.locator('#vw .card').first().click();
    await expect(page.locator('.dh h1')).toHaveText('Fajar');
    await ref.goto(`${REF}#/album/6`);
    await ref.waitForSelector('#vw .dh');
    expect(await layout(page)).toEqual(await layout(ref));
    await same(page, ref, ['.dh', '.dh .cta', '.tr']);
  });
});

test.describe('pencarian', () => {
  test('saran saat mengetik, lalu hasil: lagu teratas, daftar lagu, artis, album', async ({ page }) => {
    const calls = await mockApi(page);
    await open(page);
    await page.locator('#q').fill('lintang');
    await expect(page.locator('#sg [role=option]')).toHaveCount(3);
    expect(await titles(page, '#sg [role=option] span:last-child')).toEqual(['Lagu · Lintang', 'Lagu · Lintang', 'Artis']);
    await expect(page).toHaveURL(/\/search\/lintang$/);
    await expect(page.locator('#vw h2')).toHaveText(['Hasil teratas', 'Lagu', 'Artis', 'Album']);
    await expect(page.locator('.top1 h3')).toHaveText('Fajar Pertama');
    await expect(page.locator('#vw > .tr')).toHaveCount(2);
    await expect(page.locator('.ar h4')).toHaveText('Lintang');
    await expect(page.locator('a.card h4')).toHaveText('Fajar');
    expect(calls.filter((c) => c.startsWith('/api/search'))).toEqual(['/api/search?q=lintang&limit=30']); // saran dan hasil berbagi satu permintaan
  });

  test('tanpa hasil: keadaan kosong', async ({ page }) => {
    await mockApi(page);
    await open(page, '/search/lintang');
    await page.locator('#q').fill('zzzz');
    await expect(page.locator('#vw .empty h3')).toHaveText('Tidak ada hasil untuk “zzzz”');
  });

  test('hasil lama tetap tampil selama kata kunci baru dimuat (tanpa kedipan skeleton)', async ({ page }) => {
    await mockApi(page, { slow: (u) => (u.searchParams.get('q') === 'kairo' ? 1500 : 0) });
    await open(page, '/search/lintang');
    await expect(page.locator('.top1 h3')).toHaveText('Fajar Pertama');
    await page.locator('#q').fill('kairo');
    await page.waitForTimeout(900); // lewat jeda ketik dan permintaan sudah berjalan
    await expect(page.locator('.top1 h3')).toHaveText('Fajar Pertama');
    await expect(page.locator('#vw .sk')).toHaveCount(0);
    await expect(page.locator('.top1 h3')).toHaveText('Midnight Drive');
  });
});

test.describe('artis dan album diturunkan dari pencarian', () => {
  test('dibuka dari kartu dan langsung lewat URL (muat dingin); kunci tidak dikenal = tidak ditemukan', async ({ page }) => {
    const calls = await mockApi(page);
    await open(page);
    await page.locator('.ar', { hasText: 'Lintang' }).click();
    await expect(page).toHaveURL(/\/artist\/lintang$/);
    await expect(page.locator('.ab p').nth(1)).toHaveText('2 lagu · Jamendo');
    await expect(page.locator('.bio')).toHaveText('2 lagu dari Lintang tersedia di ZMusic lewat Jamendo.');
    await expect(page.locator('#vw > .tr')).toHaveCount(2);
    await open(page, '/artist/lintang'); // muat dingin: katalog kosong, lagu diambil lewat pencarian nama
    await expect(page.locator('.ab h1')).toHaveText('Lintang');
    expect(calls).toContain('/api/search?q=lintang&limit=50');
    await open(page, '/artist/tidak-ada');
    await expect(page.locator('#vw .empty h3')).toHaveText('Halaman tidak ditemukan');
    await open(page, '/album/lintang~fajar');
    await expect(page.locator('.dh h1')).toHaveText('Fajar');
    await expect(page.locator('.dh a.lkx')).toHaveAttribute('href', '/artist/lintang');
    await expect(page.locator('#vw > .tr')).toHaveCount(2);
    await open(page, '/album/lintang~tidak-ada');
    await expect(page.locator('#vw .empty h3')).toHaveText('Halaman tidak ditemukan');
  });
});

test.describe('pemutaran', () => {
  test('lagu dari tiga sumber terputar dengan stream dari /api/stream', async ({ page }) => {
    const calls = await mockApi(page);
    await open(page);
    for (const [title, via] of [['Fajar Pertama', 'jamendo'], ['Midnight Drive', 'audius'], ['Aurora Kita', 'deezer']] as const) {
      await page.locator('.card[data-a="play"] .tl b', { hasText: title }).click();
      await expect.poll(() => barTitle(page)).toBe(title);
      await expect.poll(() => audio(page, 'paused')).toBe(false);
      expect(String(await audio(page, 'src'))).toContain(`via=${via}`);
    }
    expect(calls.filter((c) => c.startsWith('/api/stream/'))).toEqual(['/api/stream/jamendo%3A101?q=1', '/api/stream/audius%3Aa1?q=1', '/api/stream/deezer%3A301?q=1']);
    await expect(page.locator('.pl .na')).toHaveText('Nadin Skye · Preview 30 detik');
  });

  test('preview berhenti di 0:30 lalu lanjut ke lagu berikutnya di daftar', async ({ page }) => {
    await mockApi(page, { longPreview: true });
    await open(page);
    await page.locator('.card[data-a="play"] .tl b', { hasText: 'Aurora Kita' }).click();
    await expect.poll(() => audio(page, 'paused')).toBe(false);
    await expect.poll(() => page.locator('.pl .bar').getAttribute('aria-valuemax')).toBe('30'); // audio 35 detik, pemutar membatasi 30
    await expect(page.locator('.pl .tt')).toHaveText('0:30');
    await page.evaluate(() => {
      const a = document.querySelector('audio') as HTMLAudioElement;
      const w = window as unknown as { __max: number };
      w.__max = 0;
      setInterval(() => {
        // posisi yang tampil di pemutar (bukan currentTime mentah, yang pada 16x melompat ±4 detik per timeupdate)
        if (document.querySelector('.pl .nt')?.textContent === 'Aurora Kita') w.__max = Math.max(w.__max, Number(document.querySelector('.pl .bar')?.getAttribute('aria-valuenow')));
      }, 20);
      a.defaultPlaybackRate = a.playbackRate = 16; // 30 detik terlampaui dalam ±2 detik
    });
    await expect.poll(() => barTitle(page), { timeout: 20_000 }).toBe('Satu Semesta');
    const max = await page.evaluate(() => (window as unknown as { __max: number }).__max);
    expect(max).toBeGreaterThan(20);
    expect(max).toBeLessThanOrEqual(30);
  });

  test('berikutnya dan sebelumnya mengikuti daftar tempat lagu dimulai (isi album), bukan urutan katalog', async ({ page }) => {
    await mockApi(page);
    await open(page, '/album/lintang~fajar');
    await page.locator('#vw > .tr .tl').first().click();
    await expect.poll(() => barTitle(page)).toBe('Fajar Pertama');
    const next = page.getByRole('button', { name: 'Berikutnya' }).first();
    await next.click();
    await expect.poll(() => barTitle(page)).toBe('Embun Pagi'); // urutan katalog akan memberi "Midnight Drive"
    await next.click();
    await expect.poll(() => barTitle(page)).toBe('Fajar Pertama'); // melingkar di dalam album
    await page.getByRole('button', { name: 'Sebelumnya' }).first().click();
    await expect.poll(() => barTitle(page)).toBe('Embun Pagi');
  });

  test('klik baris di Top Chart: akhir lagu melanjutkan daftar yang sama', async ({ page }) => {
    await mockApi(page);
    await open(page, '/search/lintang');
    await page.locator('#vw > .tr .tl').first().click();
    await expect.poll(() => barTitle(page)).toBe('Fajar Pertama');
    await expect(page.locator('#que .tr .tl b').first()).toHaveText('Embun Pagi'); // "Selanjutnya" = isi hasil cari
  });
});

test.describe('atribusi sumber', () => {
  test('Now Playing: sumber bertautan, lisensi, dan penanda preview', async ({ page }) => {
    await mockApi(page);
    await open(page);
    await page.locator('.card[data-a="play"] .tl b', { hasText: 'Fajar Pertama' }).click();
    await expect.poll(() => barTitle(page)).toBe('Fajar Pertama');
    await expect(page.locator('#src')).toHaveText('via Jamendo · CC BY-NC-SA 3.0');
    await expect(page.locator('#src a')).toHaveAttribute('href', 'https://www.jamendo.com/track/101');
    await expect(page.locator('#src a')).toHaveAttribute('rel', 'noopener noreferrer');
    await page.locator('.card[data-a="play"] .tl b', { hasText: 'Aurora Kita' }).click();
    await expect(page.locator('#src')).toHaveText('Preview 30 detik via Deezer');
    await expect(page.locator('#src .bdg')).toHaveText('Preview 30 detik');
  });

  test('menu lagu: "Buka di <sumber>" dengan lisensi, membuka halaman lagu di sumbernya', async ({ page }) => {
    await mockApi(page);
    await open(page);
    await page.locator('#list .tr').first().click({ button: 'right' });
    const item = page.getByRole('menuitem', { name: 'Buka di Jamendo · CC BY-NC-SA 3.0' });
    await expect(item).toBeVisible();
    const popup = page.waitForEvent('popup');
    await item.click();
    expect((await popup).url()).toBe('https://www.jamendo.com/track/101');
  });
});

test.describe('playlist cepat dan koleksi memakai lagu tren per genre', () => {
  test('ubin cepat memutar playlist genre; Koleksi menghitung isinya', async ({ page }) => {
    const calls = await mockApi(page);
    await open(page);
    await page.locator('.qt', { hasText: 'Fokus Kerja' }).click(); // Akustik
    await expect(page.locator('#toast')).toHaveText('Memutar playlist Fokus Kerja');
    await expect.poll(() => barTitle(page)).toBe('Fajar Pertama');
    calls.length = 0;
    await open(page, '/library');
    await expect(page.locator('.card', { hasText: 'Fokus Kerja' }).locator('p')).toHaveText('3 lagu');
    await expect(page.locator('.card', { hasText: 'Late Night' }).locator('p')).toHaveText('4 lagu'); // Electronic
    expect(calls.filter((c) => c.includes('genre=Akustik')).length).toBe(1); // dua playlist Akustik berbagi satu permintaan
    await open(page, '/playlist/0'); // Chill Mint (Lo-fi)
    await expect(page.locator('.dh h1')).toHaveText('Chill Mint');
    await expect(page.locator('#vw > .tr')).toHaveCount(1);
  });
});
