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
| `npx supabase db reset`, `npx supabase test db` | Terapkan migrasi dari nol dan jalankan tes RLS pgTAP (butuh Docker; lihat [docs/supabase.md](docs/supabase.md)) |

## Status

Fase 0 dan Fase 1 selesai (gerbang G1 menunggu konfirmasi `npm run test:visual` dan `npm run test:e2e` pada build Next.js sungguhan).

Fase 2 selesai di kode (P2-01 sampai P2-08), gerbang G2 lulus di sandbox dan **menunggu konfirmasi pada build Next.js sungguhan dan API sungguhan**:

- P2-06: Beranda, Cari, Artis, dan Album memakai data dari `/api/*` dengan markup yang sama dengan HTML (uji `dados-nyata.spec.ts` membandingkan bentuk DOM dengan HTML). Lagu dimuat ke **katalog klien** (`src/stores/catalog.ts`) dan diberi indeks seperti `T[i]` di prototipe, jadi store lain (pemutar, suka, playlist) tetap memakai indeks. Pemutar punya **daftar pemutaran** (konteks): berikutnya/sebelumnya dan akhir lagu mengikuti daftar tempat lagu dimulai (album, hasil cari, Top Chart), seperti Spotify. Atribusi sumber, lisensi, dan badge "Preview 30 detik" ada di Now Playing dan menu lagu (`docs/sources.md`).
- Halaman Artis dan Album diturunkan dari pencarian (kontrak sumber tidak punya endpoint artis/album); URL-nya `/artist/<slug nama>` dan `/album/<slug artis>~<slug judul>`, jadi bisa dibuka langsung dan dibagikan.
- Komponen data memakai hook klien ke route handler yang sudah ber-cache (bukan komponen server seperti tertulis di tabel P2-06): indeks katalog hidup di klien dan data dimuat setelah hidrasi, jadi server hanya merender skeleton.
- **Mode contoh** (`?data=sample`, disimpan di sessionStorage seperti `?audio=`): 14 lagu Fase 1 tanpa jaringan. Dipakai uji visual dan e2e (`src/tests/support.ts`) agar gerbang G1 tetap bisa diverifikasi piksel demi piksel, dan untuk kerja UI offline. `?data=live` mencabutnya.
- Gerbang G2: lagu dari tiga sumber terputar (e2e dengan API dipalsukan di peramban), preview berhenti di 0:30 (e2e dengan audio 35 detik), dan `npm run check:secrets` pada bundel klien. **Belum:** adapter belum pernah menyentuh API sungguhan (`LIVE=1 npm run test:live`; sekarang juga memeriksa asumsi pencarian artis/album, lihat `docs/sources.md`).

Fase 3 (akun dan koleksi) dimulai: **P3-01 ditulis, belum dijalankan.** `supabase/migrations/0001_init.sql` (semua tabel, RLS, trigger, bucket `audio` privat) dan 5 berkas tes pgTAP di `supabase/tests/` (153 asersi) menunggu `supabase db reset` dan `supabase test db` di proyek Supabase nyata; langkah, tabel hak akses, dan penyimpangan dari PRD ada di [docs/supabase.md](docs/supabase.md). Uji statis skema ikut `npm run test`. **P3-02 (Masuk dan Daftar lewat Supabase Auth) dan P3-03 (gerbang tamu) ditulis**; logika, alur, dan UI-nya teruji di sandbox (uji unit, e2e mode contoh dan tamu), tetapi pustaka `@supabase/*`, cookie sesi, proxy, dan konfirmasi email **belum pernah dijalankan** (lihat daftar periksa di docs/supabase.md). `npm install` akan menambah `@supabase/ssr` dan `@supabase/supabase-js`. P3-04 sampai P3-08 menunggu hasil verifikasi ini.

Keputusan produk: ZMusic gratis dan tanpa iklan; Premium berbayar mungkin menyusul. Jamendo dan Deezer hanya non-komersial: matikan `ENABLE_JAMENDO` dan `ENABLE_DEEZER` sebelum ada pemasukan (`docs/sources.md`).

Peta kode: `src/stores` (player, ui, library, catalog), `src/components/{shell,player,cards,lists,dialogs,forms,views}`, `src/lib/sources` (adapter, hanya server), `src/lib/data` (layanan data klien: loader ke `/api/*`, cache, hook, mode contoh), `src/lib/actions.ts` (aksi + toast). Tampilan tiap halaman ada di `src/components/views/*View.tsx`; `app/**/page.tsx` hanya pembungkus tipis. `src/app/not-found.tsx` melayani semua URL tak dikenal.

Audio: lagu dari sumber musik memakai stream nyata (`/api/stream/[id]`, URL selalu diambil baru); lagu contoh tanpa stream memakai jam simulasi. Tambahkan `?audio=demo` ke URL untuk memutar nada uji `public/demo.wav` di semua lagu contoh (`?audio=preview` membatasi 2 detik, `?audio=broken` memicu galat).

Uji: `src/tests/unit` (Vitest), `src/tests/visual` (kesamaan piksel dengan HTML), `src/tests/e2e` (pintasan, antrean, menu, saran, toast, dialog, audio dengan data contoh; `dados-nyata.spec.ts` untuk data dari API: struktur DOM, pencarian, artis/album, tiga sumber, preview 30 detik, konteks, atribusi, galat), `src/tests/live` (API sungguhan, hanya dengan `LIVE=1`). Setelah `npm run build`, jalankan `npm run check:secrets` (gerbang G2: tidak ada kunci rahasia di bundel klien).

Variabel publik tambahan: tidak ada. `?data=sample` dibaca di klien dari URL/sessionStorage, bukan dari variabel lingkungan.

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

