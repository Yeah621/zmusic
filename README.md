# ZMusic (Next.js)

Migrasi prototipe `reference/zmusic-fixed.html` ke Next.js 16: tampilan identik, lalu logika dan data nyata. Rencana lengkap dan 47 task: [docs/PRD.md](docs/PRD.md).

## Mulai

```bash
npm install   # pasang setelah rilis keamanan Next.js 3 Nov 2026 (atau jalankan `npm i next@latest` sesudahnya)
npx playwright install chromium
cp .env.example .env.local
npm run dev
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run lint`, `npm run typecheck` | ESLint, TypeScript strict |
| `npm run test` | Unit (Vitest), termasuk uji kesamaan CSS, ikon, cover, dan data dengan HTML |
| `npm run test:visual` | Screenshot HTML vs Next (Playwright; 1440/1024/390 px; gelap/terang). Lulus bila ≤ 0,5% piksel berbeda. Aktifkan rute baru dengan `ready: true` di `src/tests/visual/routes.ts` |
| `npm run fixtures` | Bangkitkan ulang `src/tests/fixtures/reference.json` dari kode asli di HTML |

## Status

Fase 0 dan Fase 1 selesai (gerbang G1 menunggu konfirmasi `npm run test:visual` dan `npm run test:e2e` pada build Next.js sungguhan).

Fase 2 sebagian: P2-01 (AudioEngine), P2-02 (kontrak sumber, agregator, `/api/search`, `/api/home`, `/api/stream/[id]`), P2-03/04/05 (adapter Audius, Deezer, Jamendo), P2-07 (cache, 429, `Promise.allSettled`), P2-08 (HLS lewat hls.js dinamis) sudah ditulis dan diuji dengan fixture. **Belum:** P2-06 (data nyata di halaman) dan gerbang G2; adapter belum pernah menyentuh API sungguhan (jalankan `LIVE=1 npm run test:live`, lihat `docs/sources.md`). Syarat resmi tiap sumber ada di `docs/sources.md`; Jamendo dan Deezer hanya untuk aplikasi non-komersial.

Peta kode: `src/stores` (player, ui, library), `src/components/{shell,player,cards,lists,dialogs,forms,views}`, `src/lib/sources` (adapter), `src/lib/actions.ts` (aksi + toast). Tampilan tiap halaman ada di `src/components/views/*View.tsx`; `app/**/page.tsx` hanya pembungkus tipis. `src/app/not-found.tsx` melayani semua URL tak dikenal.

Audio: tanpa stream nyata, pemutar memakai jam simulasi. Tambahkan `?audio=demo` ke URL untuk memutar nada uji `public/demo.wav` di semua lagu contoh (`?audio=preview` membatasi 2 detik, `?audio=broken` memicu galat).

Uji: `src/tests/unit` (Vitest), `src/tests/visual` (kesamaan piksel dengan HTML), `src/tests/e2e` (pintasan, antrean, menu, saran, toast, dialog, audio), `src/tests/live` (API sungguhan, hanya dengan `LIVE=1`). Setelah `npm run build`, jalankan `npm run check:secrets` (gerbang G2: tidak ada kunci rahasia di bundel klien).

Dependensi di luar daftar PRD: `hls.js` (daftar PRD mengizinkan hanya bila stream HLS dibutuhkan; kode memuatnya dinamis dan hanya untuk `kind: 'hls'`, jadi tidak membebani bundel awal). Respons sumber divalidasi dengan pemeriksa tipe kecil buatan sendiri (`src/lib/sources/parse.ts`), bukan zod, agar bisa diuji tanpa jaringan.

## Aturan Emas untuk AI Agen

Tampilan harus identik dengan file HTML; hanya logika yang berubah. Aturan ini berlaku untuk setiap task di bagian Rencana Task.

1. **File sumber kebenaran visual** adalah `zmusic-fixed.html` (ZMusic v2 dengan player bar tiga zona). Setiap pemindahan dimulai dengan menyalin markup dan CSS apa adanya.
2. **Jangan mendesain ulang.** Dilarang mengubah warna, ukuran, jarak, font, radius, bayangan, nama class, urutan elemen, teks Indonesia, maupun animasi, kecuali task secara eksplisit menyebutnya.
3. **CSS dipindah utuh** ke `src/styles/zmusic.css` dan diimpor sekali di layout. Jangan menerjemahkan CSS ke Tailwind dan jangan memecahnya per komponen. Class seperti `.card`, `.tr`, `.pl`, `.np`, `.bn` dipertahankan.
4. **Markup dipindah apa adanya ke JSX** (class menjadi className, atribut `data-a` diganti handler React, tetapi struktur DOM dan urutan elemen sama). Ikon SVG sprite (`#i-home` dan lainnya) dipertahankan sebagai satu komponen `<IconSprite/>` dan `<Icon name="..."/>`.
5. **Logika mengikuti pola Spotify dan SoundCloud**, tetapi tampilannya tetap dari HTML. Fitur baru yang belum punya tampilan (mis. kartu sumber lagu) memakai class yang sudah ada dan gaya yang paling mirip.
6. **Pemisahan lapisan:** UI tidak boleh memanggil API musik langsung. UI hanya memakai hook dan service; service memakai adapter sumber (Audius, Jamendo, Deezer, upload sendiri).
7. **Pemutaran audio nyata** memakai elemen `<audio>` dan hls.js bila perlu. Sintesis WebAudio dari HTML tidak dibawa.
8. **Kunci rahasia** hanya di server (route handler). Tidak ada kunci di kode klien.
9. **Aksesibilitas dan reduced-motion** yang sudah ada di HTML wajib dipertahankan (skip link, aria-label, focus ring, `prefers-reduced-motion`).
10. **Satu task, satu perubahan kecil, satu pemeriksaan:** setelah tiap task jalankan uji kesamaan visual dan lint sebelum lanjut.

