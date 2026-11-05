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

Fase 0 dan Fase 1 (P1-01 … P1-08) selesai: 12 halaman, pemutar, Now Playing, menu, dialog, toast, dan pintasan keyboard. Gerbang G1 menunggu konfirmasi `npm run test:visual` dan `npm run test:e2e` pada build Next.js sungguhan. Berikutnya Fase 2 (audio nyata dan sumber musik); P2-03, P2-04, dan P2-05 butuh verifikasi syarat API resmi lebih dulu.

Peta kode: `src/stores` (player, ui, library), `src/components/{shell,player,cards,lists,dialogs,forms,views}`, `src/lib/actions.ts` (aksi + toast). Tampilan tiap halaman ada di `src/components/views/*View.tsx`; `app/**/page.tsx` hanya pembungkus tipis. `src/app/not-found.tsx` melayani semua URL tak dikenal.

Uji: `src/tests/unit` (Vitest), `src/tests/visual` (kesamaan piksel dengan HTML), `src/tests/e2e` (pintasan, antrean, menu, saran, toast, dialog).

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

