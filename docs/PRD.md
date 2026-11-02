# PRD & Task: Migrasi ZMusic ke Next.js

Nov 2, 2026 · @Rei

## Ringkasan dan keputusan kunci

Dokumen ini menyuruh AI agen memindahkan prototipe ZMusic v2 (satu file HTML) ke Next.js dengan tampilan yang sama persis, lalu menambahkan logika ala Spotify dan SoundCloud dengan data dari API musik. Tampilan dikunci lebih dulu, baru logika dan data nyata ditambahkan, sehingga tampilan tidak bergeser selama pengerjaan.

| Keputusan | Pilihan | Alasan |
| --- | --- | --- |
| Acuan tampilan | `zmusic-fixed.html` (tiga zona player bar) | Sudah teruji di desktop, tablet, dan mobile |
| Cara memindah CSS | Disalin utuh, tanpa Tailwind | Satu-satunya cara menjamin kemiripan 100% |
| Stack | Next.js 16, TypeScript strict, Zustand, Supabase (Auth, Postgres, Storage) | Satu proyek tanpa server terpisah |
| Sumber lagu | Unggahan sendiri, Audius, Jamendo, Deezer (preview 30 detik) | Hanya sumber yang memberi lagu penuh secara legal, ditambah chart populer |
| Tidak dipakai | Spotify (batas ketat sejak Februari 2026); SoundCloud ditunda | Tidak cocok untuk aplikasi publik tanpa iklan |
| Audio | Elemen audio nyata (hls.js bila perlu), bukan sintesis WebAudio | Memutar lagu sungguhan |
| Urutan kerja | Fase 1 mengunci UI dengan data contoh, Fase 2 dan seterusnya menambah data nyata | Uji visual tetap adil |
| Ukuran pekerjaan | 47 task dalam 7 fase dengan 6 gerbang | Bisa dikerjakan AI satu per satu |

Syarat penggunaan Audius dan Deezer belum saya verifikasi langsung dari dokumentasi resminya (halamannya tidak bisa saya buka), jadi verifikasi itu dijadikan task P2-03, P2-04, dan P6-03 sebelum rilis publik.

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

## Inventaris ZMusic v2 dan peta pemindahan

ZMusic v2 adalah satu file sekitar 690 baris: 12 tampilan, router berbasis hash, dan semua state di variabel global. Pemindahan berarti memecahnya menjadi route, komponen, dan store tanpa mengubah markup maupun CSS.

**Route**

| Route HTML | Route Next.js | Fungsi di HTML | Isi tampilan |
| --- | --- | --- | --- |
| `#/` | `/` | `homeV` | Sapaan, 6 pintasan cepat, hero dengan vinyl, Artis Populer, Album Terbaru, chip genre, Sedang Tren, Top Chart dengan scroll tak hingga |
| `#/search/<q>` | `/search/[[...q]]` | `srchV` | Riwayat pencarian, ubin genre; hasil: Hasil teratas, Lagu, Artis, Album; keadaan kosong dan offline |
| `#/library/0..3` | `/library/[[...tab]]` | `libV` | Tab Playlist, Artis, Album, Disukai |
| `#/artist/<i>` | `/artist/[id]` | `artV` | Banner, Putar, Ikuti, Populer, Diskografi, Tentang, Penggemar juga suka |
| `#/album/<i>` | `/album/[id]` | `albV` | Cover, Putar, Acak, Bagikan, daftar lagu |
| `#/playlist/<k>` | `/playlist/[id]` | `plV` | Putar, Acak, Ubah nama, Hapus (playlist milik sendiri) |
| `#/profile` | `/profile` | `profV` | Statistik, unggahan, terakhir diputar (perlu masuk) |
| `#/settings` | `/settings` | `setV` | Akun, Pemutaran, Tampilan, Privasi dan notifikasi, Tentang |
| `#/upload` | `/upload` | `uplV` | Dropzone, form, pratinjau waveform (perlu masuk) |
| `#/login`, `#/register` | `/login`, `/register` | `authV` | Form masuk dan daftar |
| selain itu | `not-found.tsx` | `nfV` | Halaman tidak ditemukan |

**Komponen global**

| Area di HTML | Komponen Next.js | Perilaku yang wajib sama |
| --- | --- | --- |
| `.app` grid 3 kolom (240px, fleksibel, 320px) | `AppShell` | Di bawah 1180px panel kanan jadi sheet layar penuh; di bawah 860px sidebar hilang |
| `.side` | `Sidebar` | Link aktif, 4 playlist cepat, kartu promo |
| `.top` | `Topbar` | Kolom cari bergaya combobox dengan saran dan navigasi panah, tombol tema, avatar |
| `.pl` | `PlayerBar` | Tiga zona (info + suka, kontrol + progres, timer tidur + volume); di mobile menjadi mini player |
| `.np` | `NowPlaying` | Waveform, komentar bertimestamp, timer tidur, bagikan, tab Antrean dan Lirik, geser ke bawah untuk menutup |
| `.bn` | `BottomNav` | 5 tab, tampil di bawah 860px |
| `.menu`, `<dialog>`, `.toast`, `.ofl` | `ContextMenu`, `Dialog`, `Toast`, `OfflineBanner` | Menu klik kanan, dialog playlist dan profil, banner offline |
| `.rv` (IntersectionObserver), skeleton rute 240-420ms | `Reveal`, `RouteSkeleton` | Animasi muncul bertahap |
| sprite `<symbol id="i-...">` | `IconSprite`, `Icon` | Dipertahankan apa adanya |
| `genArt(h, s)` | `lib/cover-art.ts` | Cover SVG generatif sama persis; dipakai sebagai cadangan bila lagu tidak punya artwork |

**State dan penyimpanan**

| Variabel di HTML | Arti | Di Next.js |
| --- | --- | --- |
| `cur`, `pos`, `on`, `sh`, `rp`, `Qu`, `H` | Lagu aktif, posisi, status putar, acak, ulang, antrean, riwayat | `usePlayerStore` (Zustand) |
| `L`, `F`, `Cm`, `UPL`, `UPT`, `R` | Disukai, diikuti, komentar, playlist dan unggahan sendiri, riwayat cari | Tabel Supabase (setelah masuk) dengan cadangan localStorage untuk tamu |
| `S` (`cf`, `nm`, `ap`, `nt`, `ds`, `pp`, `sa`), `qa`, `TM`, `U` | Pengaturan, kualitas audio, tema, profil | Tabel `profiles` dan `settings`; tema lewat skrip awal agar tidak berkedip |

**Pintasan dan perilaku yang dipertahankan:** `/` fokus ke pencarian, Spasi putar/jeda, panah kiri/kanan lagu sebelumnya/berikutnya, `L` suka, `M` senyap, `Q` buka Now Playing, `Esc` menutup. Pada slider: panah geser 5 detik, Home dan End. Antrean bisa diurutkan dengan drag dan dengan panah atas/bawah. Juga Media Session, banner offline, skip link, dan `prefers-reduced-motion`.

**Tidak ikut dipindah:** sintesis WebAudio (`snd`, `note`) diganti pemutaran audio nyata, dan lirik contoh (`LB`) diganti lirik dari sumber bila tersedia atau pesan "Lirik belum tersedia".

## Pilihan API musik

Gunakan empat sumber: lagu unggahan sendiri, Audius dan Jamendo untuk lagu penuh, dan Deezer untuk trending dengan preview 30 detik. Spotify tidak dipakai, dan SoundCloud ditunda.

| Sumber | Isi | Putar penuh | Akses dan batas | Syarat yang harus dipenuhi | Keputusan |
| --- | --- | --- | --- | --- | --- |
| Unggahan sendiri (Supabase Storage) | Lagu artis di ZMusic | Ya | Tanpa API pihak ketiga; biaya storage dan bandwidth | Pernyataan hak, tombol laporan, hapus cepat | **Utama** |
| [Audius](https://cdn.jsdelivr.net/npm/@audius/sdk@15.3.1/README.md) | Lagu artis independen mirip SoundCloud | Ya | API key; paket gratis 10 request/detik dan 500.000 request/bulan; bearer token tidak boleh ada di kode browser | Syarat resmi dan titik akhir stream belum saya verifikasi, jadi dicek di task P2-03 | **Dipakai** |
| [Jamendo](https://developer.jamendo.com/v3.0/tracks) | Musik Creative Commons | Ya (`audio` = MP3 bitrate rendah; format lain lewat `audioformat`) | `client_id` wajib; maksimal 200 hasil per permintaan; [35.000 request/bulan untuk aplikasi non-komersial](https://freeapihub.com/apis/jamendo-api) | Periksa `audiodownload_allowed` dan lisensi tiap lagu (`include=licenses`); penggunaan komersial butuh lisensi terpisah | **Dipakai** (non-komersial) |
| [Deezer](https://apify.com/jungle_synthesizer/deezer-music-catalog-api-scraper.md) | Chart per genre, pencarian, metadata, ISRC | Tidak, hanya preview 30 detik | Publik tanpa login; sekitar 50 request per 5 detik; pencarian dibatasi 2.000 hasil | [URL preview sementara dan bisa kedaluwarsa](https://apify.com/zerobreak/deezer-music-scraper.md); syarat resmi Deezer belum saya verifikasi (halaman resminya tidak bisa saya buka), jadi dicek di task P2-04 | **Dipakai** untuk trending dan preview |
| [SoundCloud](https://developers.soundcloud.com/docs/api) | Katalog besar, pencarian dan putar lagu publik lewat Client Credentials | Ya, untuk lagu yang tidak diblokir (`access` bukan `blocked`) | Token Client Credentials dibatasi 50 per 12 jam per aplikasi; stream sekarang [AAC HLS](https://developers.soundcloud.com/blog/api-streaming-urls) (MP3 progresif dan HLS MP3/Opus dihentikan 31 Des 2025) | Pemutar wajib menyebut pengunggah dan SoundCloud (dengan logo) serta menautkan ke halaman aslinya; belum jelas apakah aplikasi baru otomatis mendapat akses | **Ditunda** ke fase lanjutan |
| [Spotify](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) | Metadata dan kontrol pemutaran | Hanya untuk pengguna Premium lewat SDK mereka | Sejak Februari 2026, aplikasi mode pengembangan hanya 5 pengguna, pemilik harus Premium, pencarian maksimal 10 hasil, dan banyak endpoint dihapus (mis. top-tracks artis, browse) | Tidak cocok untuk aplikasi publik tanpa iklan | **Tidak dipakai** |

**Aturan pemakaian**

- Semua sumber dibungkus adapter dengan antarmuka sama (`MusicSource`), jadi UI tidak tahu lagu berasal dari mana. Setiap lagu membawa `source` dan `playable: 'full' | 'preview'`.
- Semua panggilan API musik berjalan di server (route handler) dengan cache. Kunci dan token tidak pernah dikirim ke browser.
- Lagu preview Deezer ditandai badge "Preview 30 detik" dan berhenti di 0:30. URL preview diambil ulang dari server saat lagu diputar karena bisa kedaluwarsa.
- Pencarian menggabungkan hasil dari semua sumber, dengan lagu penuh diurutkan lebih dulu.
- Jamendo hanya boleh aktif selama aplikasi non-komersial. Sediakan bendera konfigurasi `ENABLE_JAMENDO` agar bisa dimatikan.
- Tampilkan nama sumber dan lisensi (mis. CC BY) di halaman lagu dan di menu lagu.

## Logika produk ala Spotify dan SoundCloud

Spotify memberi pola pemutaran, pencarian, dan koleksi; SoundCloud memberi pola unggahan, waveform, dan komentar bertimestamp. Tampilannya tetap dari HTML.

**Pola Spotify**

| Fitur | Aturan | Kriteria diterima |
| --- | --- | --- |
| Pemutaran dan antrean | Putar/jeda, berikutnya, sebelumnya (jika posisi lebih dari 3 detik, ulangi lagu), acak, ulang (mati, semua, satu), tambah ke antrean, putar berikutnya, hapus, urutkan dengan drag atau panah | Tombol dan pintasan keyboard bekerja; urutan antrean bertahan saat pindah halaman |
| Lagu preview | Lagu Deezer berhenti di 0:30, badge "Preview 30 detik", lanjut otomatis ke lagu berikutnya | Progres tidak melewati 0:30 untuk lagu preview |
| Putar otomatis | Saat antrean habis dan pengaturan `ap` aktif, putar lagu serupa: genre sama, bukan 3 lagu terakhir diputar; bila sumber punya fitur "serupa" (mis. Jamendo `tracks/similar`), pakai itu | Tidak pernah mengulang lagu yang baru diputar |
| Crossfade, normalisasi, kualitas | Pengaturan `cf` (0-12 detik), `nm`, dan `qa` (Normal, Tinggi, Hi-Fi) memengaruhi pemutaran; kualitas dipetakan ke bitrate yang tersedia dari sumber | Pengaturan tersimpan dan berlaku pada lagu berikutnya |
| Pencarian | Gabungan semua sumber, jeda ketik 250ms, saran saat mengetik, riwayat pencarian (hapus satu atau semua), Hasil teratas | Hasil muncul dalam 1 detik pada koneksi normal; tidak ada hasil menampilkan keadaan kosong |
| Beranda | Sapaan sesuai jam, 6 pintasan, Sedang Tren (chart Deezer digabung jumlah putar sendiri), Artis Populer, Album Terbaru, chip genre, Top Chart dengan scroll tak hingga | Chip genre menyaring tanpa memuat ulang halaman |
| Koleksi | Suka, playlist (buat, ubah nama, hapus, tambah dan hapus lagu), ikuti artis, tab Album | Semua tersimpan di akun dan muncul di perangkat lain |
| Riwayat | Simpan lagu terakhir diputar (tampilkan 8 teratas di Profil) | Lagu yang sama tidak muncul dua kali berurutan |
| Sistem | Media Session, timer tidur, bagikan (salin tautan, toast), menu klik kanan, banner offline | Kontrol layar kunci bekerja; offline menampilkan banner dan pesan di halaman cari |

**Pola SoundCloud**

| Fitur | Aturan | Kriteria diterima |
| --- | --- | --- |
| Unggah lagu | Pengguna masuk bisa mengunggah file audio (maksimal 100 MB, MP3 atau AAC), judul, genre, deskripsi (maks 300 karakter), privasi Publik atau Pribadi, warna sampul seperti di HTML; wajib mencentang bahwa ia pemilik hak | Progres unggah tampil, validasi format dan ukuran, lagu terbit dan muncul di Profil dan pencarian |
| Waveform | Puncak amplitudo dihitung dari audio saat unggah dan disimpan; klik atau geser waveform untuk seek | Waveform lagu unggahan sesuai audio; lagu sumber lain memakai waveform generatif dari HTML |
| Komentar bertimestamp | Komentar pada detik yang sedang diputar, penanda di waveform, daftar komentar, maksimal 60 karakter seperti di HTML | Komentar tampil sebagai titik pada waveform di posisi yang benar |
| Profil dan ikuti | Profil publik (bisa disembunyikan lewat `pp`), statistik Disukai, Mengikuti, Unggahan; tombol Ikuti/Mengikuti | Mengikuti artis menambah pengikut dan muncul di tab Artis |
| Jumlah putar dan suka | Satu putaran dihitung setelah 30 detik didengar; suka bisa dibatalkan | Jumlah tidak naik dua kali untuk sesi yang sama |
| Privasi lagu | Lagu Pribadi hanya terlihat dan terputar oleh pemiliknya | Pengguna lain mendapat halaman tidak ditemukan |
| Moderasi | Tombol Laporkan (hak cipta, tidak pantas, spam, lainnya), antrean laporan, hapus konten oleh admin | Laporan tersimpan dengan status; konten yang dihapus tidak lagi terputar |

**Akun**

- Daftar dan masuk dengan email dan kata sandi lewat Supabase Auth. Tombol Google dibuat sungguhan di fase akhir; tombol Apple tetap menampilkan toast "segera hadir".
- Mode tamu boleh mencari dan memutar. Suka, playlist, komentar, unggah, dan profil mengarahkan ke halaman masuk, sama seperti `gate()` di HTML.
- Semua pengguna yang masuk boleh mengunggah (tidak ada peran terpisah), sesuai HTML.

## Arsitektur dan data model

Semua data lewat server Next.js; browser hanya memutar audio dari URL stream yang diberikan server.

&#91;embedded content: arsitektur · browser, server Next.js, Supabase, 3 API musik\]

Lagu dari API eksternal tidak disalin ke database. Baris di `tracks` dibuat saat pengguna berinteraksi (suka, tambah ke playlist, komentar) sebagai salinan metadata, sedangkan lagu unggahan disimpan penuh.

**Tabel Supabase**

| Tabel | Kolom utama |
| --- | --- |
| `profiles` | id (= auth.users), handle unik, display\_name, avatar\_hue, is\_public |
| `settings` | user\_id, crossfade, normalize, autoplay, notifications, data\_saver, show\_activity, quality (0-2), theme |
| `artists` | id, name, source, source\_id, owner\_id (kosong untuk artis eksternal), verified, hue |
| `albums` | id, title, artist\_id, year, hue, source, source\_id |
| `tracks` | id, source (`upload`, `audius`, `jamendo`, `deezer`), source\_id, owner\_id, title, artist\_id, album\_id, genre, duration\_sec, hue, artwork\_url, audio\_path, waveform (jsonb), license, visibility (`public` atau `private`), play\_count, like\_count, created\_at; unik pada (source, source\_id) |
| `playlists`, `playlist_tracks` | Playlist per pengguna (name, hue, is\_public) dan isinya dengan position |
| `likes`, `follows` | (user\_id, track\_id) dan (user\_id, artist\_id) |
| `comments` | id, track\_id, user\_id, at\_sec, body (maks 60 karakter), created\_at |
| `plays` | id, user\_id (boleh kosong), track\_id, listened\_sec, created\_at |
| `search_history` | user\_id, query, created\_at |
| `reports` | id, track\_id, reporter\_id, reason, note, status (`baru`, `ditinjau`, `selesai`), created\_at |

**Aturan akses (RLS)**

- `playlists`, `likes`, `follows`, `settings`, `search_history`: hanya pemilik yang boleh baca dan tulis; playlist publik boleh dibaca semua.
- `tracks`: lagu publik terbaca semua; lagu privat hanya pemilik; hanya pemilik yang boleh mengubah dan menghapus lagu unggahannya.
- `comments`: semua boleh baca pada lagu yang terlihat; hanya pengguna masuk yang boleh menulis; hanya penulis atau admin yang boleh menghapus.
- `reports`: pengguna masuk boleh menulis; hanya admin yang boleh membaca dan mengubah status.
- Storage: bucket `audio` privat dengan jalur `{user_id}/{track_id}.{ext}`, diakses lewat signed URL berumur pendek dari server; hanya pemilik yang boleh mengunggah ke folder miliknya.

**Route handler (server)**

| Route | Fungsi | Cache (usulan) |
| --- | --- | --- |
| `GET /api/home` | Data beranda: trending, artis, album, top chart (paginasi) | 10 menit |
| `GET /api/search?q=&type=` | Pencarian gabungan semua sumber dan saran | 5 menit |
| `GET /api/tracks/[id]` | Detail lagu, lisensi, jumlah putar dan suka | 1 menit |
| `GET /api/stream/[id]` | Mengembalikan URL stream (signed URL, URL sumber, atau URL preview baru) | tanpa cache |
| `POST /api/uploads/sign` | Signed URL unggah ke Storage setelah validasi ukuran dan tipe | tanpa cache |
| `POST /api/tracks` | Menerbitkan lagu unggahan dan menyimpan waveform | tanpa cache |
| `POST /api/plays` | Mencatat putaran setelah 30 detik | tanpa cache |
| `POST /api/comments`, `POST /api/reports` | Komentar bertimestamp dan laporan konten | tanpa cache |
| `GET/POST /api/library/*` | Suka, playlist, ikuti, riwayat (atau Server Action) | tanpa cache |

## Struktur proyek dan konvensi

Satu repositori Next.js dengan CSS HTML yang dipindah utuh, tanpa Tailwind dan tanpa pustaka komponen.

```text
zmusic/
  reference/zmusic-fixed.html        sumber kebenaran visual (jangan diubah)
  supabase/migrations/               skema SQL dan RLS
  src/
    app/
      layout.tsx                     skrip tema awal, IconSprite, AppShell
      (app)/                         semua halaman memakai shell yang sama
        page.tsx                     /
        search/[[...q]]/page.tsx
        library/[[...tab]]/page.tsx
        artist/[id]/page.tsx
        album/[id]/page.tsx
        playlist/[id]/page.tsx
        profile/page.tsx
        settings/page.tsx
        upload/page.tsx
        login/page.tsx
        register/page.tsx
        loading.tsx                  skeleton rute (dari skel())
        not-found.tsx
      api/                           route handler (lihat Arsitektur)
    components/
      shell/                         AppShell, Sidebar, Topbar, BottomNav, OfflineBanner
      player/                        PlayerBar, NowPlaying, Waveform, QueueList, AudioEngine
      cards/                         TrackCard, ArtistCard, AlbumCard, GenreTile
      lists/                         TrackRow, Shelf, TopChart
      dialogs/                       ContextMenu, Dialog, Toast
      icons/                         IconSprite, Icon
    stores/                          player.ts, ui.ts, library.ts
    lib/
      cover-art.ts                   genArt dari HTML, tanpa perubahan
      format.ts                      fmt waktu dan util
      supabase/                      klien server dan browser
      sources/                       types.ts, audius.ts, jamendo.ts, deezer.ts, upload.ts, index.ts
    styles/zmusic.css                CSS dari HTML, disalin utuh
    tests/                           Vitest dan Playwright
```

**Kontrak adapter sumber musik** (`src/lib/sources/types.ts`)

```ts
export type SourceId = 'upload' | 'audius' | 'jamendo' | 'deezer';
export interface SourceTrack {
  id: string; source: SourceId; title: string; artist: string;
  genre?: string; durationSec: number; artworkUrl?: string; hue: number;
  playable: 'full' | 'preview'; license?: string;
}
export interface MusicSource {
  id: SourceId;
  trending(o: { genre?: string; limit: number; offset?: number }): Promise<SourceTrack[]>;
  search(q: string, o: { limit: number }): Promise<SourceTrack[]>;
  getTrack(id: string): Promise<SourceTrack | null>;
  getStream(id: string): Promise<{ url: string; kind: 'mp3' | 'aac' | 'hls'; expiresAt?: number }>;
}
```

**Konvensi**

- Next.js 16 versi stabil terbaru dengan patch keamanan terakhir; Next.js mengumumkan [rilis keamanan terjadwal 3 November 2026](https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026.md), jadi pasang versi setelah tanggal itu dan jangan menyematkan versi lama. TypeScript strict, tanpa `any`.
- Komponen server secara default; `'use client'` hanya untuk bagian yang interaktif (pemutar, menu, form, drag).
- Dependensi yang diizinkan: `next`, `react`, `zustand`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `hls.js` (hanya bila stream HLS dibutuhkan), `vitest`, `@playwright/test`. Dependensi lain butuh alasan tertulis di PR.
- Tidak ada Tailwind, shadcn, atau Framer Motion: semua animasi sudah ada di CSS HTML.
- Variabel lingkungan hanya di server (`AUDIUS_API_KEY`, `JAMENDO_CLIENT_ID`, `SUPABASE_SERVICE_ROLE_KEY`); satu-satunya variabel publik adalah URL dan anon key Supabase. Sediakan `.env.example`.

## Rencana task untuk AI

47 task dalam 7 fase, dengan enam gerbang (G1 sampai G5 dan gerbang rilis) yang harus lulus sebelum fase berikutnya. Tampilan dikunci lebih dulu di Fase 1, baru logika dan data nyata ditambahkan.

**Cara mengerjakan tiap task:** satu task satu cabang dan satu PR; jangan mulai bila kolom Bergantung belum selesai; patuhi Aturan Emas; setelah selesai jalankan `npm run lint`, `npm run test`, dan `npm run test:visual`, lalu laporkan hasilnya dengan menyebut ID task.

### Fase 0: Persiapan dan dasar

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P0-01 | Buat proyek Next.js 16 (App Router, TypeScript strict, ESLint). Letakkan `zmusic-fixed.html` di `reference/`, buat `.env.example` dan README berisi Aturan Emas | `npm run dev` berjalan; folder sesuai bagian Struktur proyek | - |
| P0-02 | Buat uji kesamaan visual: skrip Playwright membuka `reference/zmusic-fixed.html` (rute hash) dan halaman Next.js pada lebar 1440, 1024, dan 390 px, tema gelap dan terang, lalu membandingkan screenshot | `npm run test:visual` melaporkan persen piksel berbeda per halaman; lulus bila 0,5% atau kurang | P0-01 |
| P0-03 | Salin isi tag `<style>` HTML tanpa perubahan ke `src/styles/zmusic.css`, impor di `layout.tsx`, pindahkan skrip tema awal ke `<head>` | Tema tidak berkedip saat dimuat; semua class sama | P0-01 |
| P0-04 | Pindahkan sprite ikon menjadi `IconSprite` dan komponen `Icon` | Semua ikon tampil sama | P0-01 |
| P0-05 | Pindahkan `genArt` ke `lib/cover-art.ts` dan `fmt` ke `lib/format.ts` tanpa mengubah logika; tulis unit test | Keluaran `genArt` identik dengan HTML untuk 20 pasangan (h, s) yang disimpan sebagai snapshot | P0-01 |
| P0-06 | Pindahkan data contoh (`T`, `AL`, `A`, `PB`, `TL`, `G`) ke `src/data/mock.ts` dengan tipe | 14 lagu dan 7 album sama persis dengan HTML | P0-01 |

### Fase 1: Port tampilan 1:1 dengan data contoh

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P1-01 | Bangun `AppShell`, `Sidebar`, `Topbar`, `PlayerBar`, `NowPlaying`, `BottomNav` dari markup HTML | Kerangka halaman sama dengan HTML pada 3 lebar | P0-03, P0-04 |
| P1-02 | Buat `usePlayerStore` (Zustand): lagu aktif, posisi, status, acak, ulang, antrean, riwayat; aksi putar, jeda, berikutnya, sebelumnya, seek, tambah, hapus, urutkan antrean, putar set. Waktu disimulasikan dengan timer | Unit test untuk berikutnya, sebelumnya, acak, ulang, urutan antrean | P0-06 |
| P1-03 | Halaman Beranda `/` dari `homeV`, termasuk scroll tak hingga Top Chart | Parity visual gelap dan terang | P1-01, P1-02 |
| P1-04 | Halaman Cari `/search` dengan combobox saran, riwayat, hasil teratas, keadaan kosong dan offline | Parity; panah, Enter, dan Esc bekerja pada saran | P1-01 |
| P1-05 | Halaman Koleksi (4 tab), Artis, Album, Playlist | Parity pada semua tab dan halaman detail | P1-03 |
| P1-06 | Halaman Profil, Pengaturan, Unggah (form saja), Masuk dan Daftar (validasi saja) | Parity; pesan validasi sama | P1-01 |
| P1-07 | Komponen global: `ContextMenu`, `Dialog` (playlist baru, tambah ke playlist, edit profil), `Toast`, `OfflineBanner`, `Reveal`, `RouteSkeleton`, `not-found` | Parity | P1-01 |
| P1-08 | Perilaku: pintasan keyboard, urut antrean dengan drag dan panah, geser ke bawah menutup Now Playing, focus trap, Media Session, timer tidur | Semua pintasan di HTML bekerja (uji Playwright) | P1-02 sampai P1-07 |

**Gerbang G1:** semua halaman dan lebar lulus uji visual, dan semua interaksi sama dengan HTML.

### Fase 2: Audio nyata dan sumber musik

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P2-01 | `AudioEngine`: satu elemen audio yang sinkron dengan store (putar, jeda, seek, volume, senyap), crossfade (`cf`), normalisasi opsional, galat memicu toast "Gagal memutar audio" | File MP3 kecil di `public/` terputar; seek bekerja | P1-02 |
| P2-02 | Kontrak `MusicSource`, `sources/index.ts` (gabungan, urutan lagu penuh dulu, hapus duplikat), route `/api/search`, `/api/home`, `/api/stream/[id]` | Test dengan sumber tiruan | P0-01 |
| P2-03 | Adapter Audius: trending, search, getTrack, getStream. Verifikasi titik akhir dan syarat resmi di dokumentasi mereka dan catat di `docs/sources.md` | Lagu Audius terputar penuh; kunci tidak ada di bundle klien | P2-02 |
| P2-04 | Adapter Deezer: chart per genre, search, getTrack, URL preview baru saat diputar. Verifikasi syarat resmi dan catat | Lagu Deezer terputar 30 detik berlabel "Preview 30 detik" lalu lanjut | P2-01, P2-02 |
| P2-05 | Adapter Jamendo: `order`, `tags`, `search`, `limit`, `include=licenses`, `audioformat`, cek `audiodownload_allowed`; bendera `ENABLE_JAMENDO` | Lagu Jamendo terputar penuh; lisensi tampil | P2-02 |
| P2-06 | Ganti data contoh dengan data nyata di Beranda, Cari, Artis, dan Album (komponen server) dengan markup sama; artwork asli di `.cv` dengan cadangan `genArt` | Struktur DOM sama; data nyata muncul | P2-03, P2-04, P2-05, P1-05 |
| P2-07 | Cache per route, penanganan 429, dan `Promise.allSettled` agar satu sumber gagal tidak merusak halaman | Mematikan satu sumber hanya mengurangi hasil; ada test | P2-06 |
| P2-08 | Dukungan HLS dengan hls.js yang dimuat dinamis; lainnya MP3 atau AAC | Stream HLS terputar di Chrome dan Safari | P2-01 |

**Gerbang G2:** lagu dari tiga sumber terputar, preview berhenti di 0:30, dan pemeriksaan bundle membuktikan tidak ada kunci rahasia di kode klien.

### Fase 3: Akun dan koleksi (Supabase)

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P3-01 | Proyek Supabase dan `supabase/migrations/0001_init.sql`: semua tabel dan RLS dari bagian Arsitektur, serta bucket `audio` privat | Migrasi berjalan bersih; test RLS membuktikan pengguna A tidak bisa membaca playlist privat pengguna B | P0-01 |
| P3-02 | Auth email dan kata sandi lewat `@supabase/ssr`; halaman `/login` dan `/register` memakai markup HTML; Keluar dari Profil | Daftar, masuk, keluar bekerja; pesan galat sama dengan HTML | P3-01, P1-06 |
| P3-03 | Gerbang tamu: Unggah dan Profil menampilkan `gate()`; Suka, Playlist, dan Komentar mengarah ke `/login` untuk tamu | Perilaku sesuai bagian Logika produk | P3-02 |
| P3-04 | Suka, ikuti, riwayat putar, dan riwayat cari dengan pembaruan optimistis; data localStorage tamu dipindah ke akun saat masuk | Data muncul di perangkat lain | P3-02 |
| P3-05 | CRUD playlist (buat, ubah nama, hapus, tambah dan hapus lagu, urutkan) lewat dialog yang sama | Parity dialog; data tersimpan | P3-04, P1-07 |
| P3-06 | Simpan pengaturan di `settings`; `qa`, `cf`, `nm`, `ap` memengaruhi `AudioEngine` | Perubahan berlaku pada lagu berikutnya | P3-02, P2-01 |
| P3-07 | Salin metadata lagu eksternal ke `tracks` saat disukai atau dimasukkan ke playlist (upsert unik source dan source\_id) | Tidak ada baris ganda | P3-04 |
| P3-08 | Profil publik, pengaturan `pp`, dan statistik | Profil terbaca anonim hanya bila `pp` aktif | P3-04 |

**Gerbang G3:** dua akun uji tidak bisa saling melihat data privat, dan koleksi sinkron antar perangkat.

### Fase 4: Unggah, waveform, komentar, dan moderasi

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P4-01 | Unggah: dropzone, validasi (audio, maksimal 100 MB, MP3 atau AAC), signed URL, progres nyata, kotak hak wajib, `POST /api/tracks` | Lagu terbit dan muncul di Profil dan pencarian | P3-02, P1-06 |
| P4-02 | Waveform: hitung sekitar 200 puncak amplitudo dengan Web Audio di klien saat unggah dan simpan; tampilkan di `Waveform` | Waveform unggahan sesuai audio; lagu eksternal memakai waveform generatif dari HTML | P4-01 |
| P4-03 | Privasi lagu Publik dan Pribadi dengan RLS | Pengguna lain mendapat halaman tidak ditemukan | P4-01 |
| P4-04 | Komentar bertimestamp: API, penanda di waveform, daftar, hapus komentar sendiri | Penanda berada di posisi detik yang benar | P3-02, P4-02 |
| P4-05 | Hitung putaran setelah 30 detik didengar, dan jumlah suka | Jumlah tidak naik dua kali dalam satu sesi | P2-01, P3-04 |
| P4-06 | Laporan konten: dialog, tabel `reports`, halaman `/admin/reports` khusus admin untuk menyembunyikan atau menghapus lagu | Laporan tersimpan; lagu yang disembunyikan tidak lagi terputar | P4-01 |
| P4-07 | Halaman syarat penggunaan dan kebijakan hak cipta, ditautkan dari form unggah | Tautan tampil di form | P4-01 |

**Gerbang G4:** alur unggah, putar, komentar, laporkan, hapus berjalan dari ujung ke ujung.

### Fase 5: Poles

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P5-01 | Trending gabungan (chart Deezer dan jumlah putar sendiri) | Urutan konsisten; ada test unit | P2-07, P4-05 |
| P5-02 | Putar otomatis lagu serupa (genre sama, bukan 3 lagu terakhir; pakai fitur serupa dari sumber bila ada) | Tidak mengulang lagu yang baru diputar | P2-07, P3-06 |
| P5-03 | Audit aksesibilitas dengan axe dan navigasi keyboard penuh | Nol pelanggaran serius; semua kontrol bisa dijangkau keyboard | G4 |
| P5-04 | Performa: LCP di bawah 2,5 detik pada Beranda (Lighthouse mobile), gambar artwork malas dimuat, bundle klien dipantau | Skor tercatat di README | G4 |
| P5-05 | Keadaan galat dan offline per sumber (satu sumber gagal tidak merusak halaman) | Pesan jelas dan tombol Coba lagi | P2-07 |
| P5-06 | Tombol Masuk dengan Google sungguhan; tombol Apple tetap menampilkan toast "segera hadir" | Masuk dengan Google berhasil | P3-02 |

**Gerbang G5:** uji visual, uji fungsi, axe, dan Lighthouse semuanya lulus.

### Fase 6: Rilis

| ID | Tugas | Kriteria selesai | Bergantung |
| --- | --- | --- | --- |
| P6-01 | Deploy ke Vercel dengan Supabase produksi dan variabel lingkungan | Situs publik berjalan; tidak ada kunci di klien | G5 |
| P6-02 | Batas laju per IP untuk `/api/*` dan log galat server | Permintaan berlebih mendapat 429 | P6-01 |
| P6-03 | Lengkapi `docs/sources.md` (syarat dan atribusi tiap API) dan checklist rilis | Setiap sumber punya syarat dan atribusi tertulis | P2-03, P2-04, P2-05 |
| P6-04 | Uji akhir: parity penuh dan alur end-to-end Playwright (daftar, unggah, putar, suka, playlist, komentar, laporkan) | Semua lulus pada build produksi | P6-01 |

**Gerbang rilis:** semua uji lulus di produksi dan syarat tiap API sudah diverifikasi sebelum aplikasi dibuka untuk umum.

## Pengujian dan Definition of Done

Kesamaan dengan HTML dibuktikan oleh uji screenshot otomatis, bukan oleh penilaian mata; sisanya diperiksa oleh uji fungsi, keamanan, dan performa.

| Uji | Alat | Cakupan | Lulus bila |
| --- | --- | --- | --- |
| Kesamaan visual | Playwright | 12 tampilan, lebar 1440, 1024, dan 390 px, tema terang dan gelap | Selisih piksel 0,5% atau kurang per tangkapan |
| Unit | Vitest | `usePlayerStore`, `genArt`, `fmt`, adapter sumber (dengan data rekaman), logika cache dan gabungan hasil | Semua lulus |
| Integrasi sumber | Vitest dengan fixture respons | Audius, Jamendo, Deezer; uji ke API langsung dilewati bila kunci tidak ada | Semua lulus; satu sumber gagal tidak merusak hasil |
| Keamanan akses | Tes SQL | RLS tiap tabel dengan dua akun dan tamu | Tidak ada data privat yang bocor |
| End-to-end | Playwright pada build produksi | Daftar, unggah, putar, suka, playlist, komentar, laporkan, hapus | Semua lulus |
| Aksesibilitas | axe lewat Playwright | Semua rute | Nol pelanggaran serius |
| Performa | Lighthouse (mobile) | Beranda dan halaman lagu | LCP di bawah 2,5 detik |
| Kebocoran kunci | Pencarian teks pada `.next/static` | Nama dan nilai variabel rahasia | Tidak ditemukan |

**Agar uji visual adil**

- Bekukan jam (sapaan di Beranda bergantung pada jam) dan muat data contoh yang sama pada kedua sisi.
- Jalankan dengan `reducedMotion: 'reduce'` di kedua sisi supaya animasi tidak mengacaukan tangkapan. CSS HTML sudah mematikan animasi pada pengaturan itu.
- Tunggu font Plus Jakarta Sans (400, 600, 800) selesai dimuat sebelum mengambil tangkapan.
- Uji visual memakai data contoh (Fase 1). Setelah data nyata masuk (Fase 2), bandingkan struktur DOM dan class, bukan piksel.

**Definition of Done tiap task**

- [ ] Kriteria selesai di tabel task terpenuhi
- [ ] `npm run lint` dan `npm run test` lulus
- [ ] `npm run test:visual` lulus (untuk task yang menyentuh tampilan)
- [ ] Tidak ada perubahan pada `reference/` dan tidak ada CSS baru di luar `zmusic.css` kecuali task menyebutnya
- [ ] Tidak ada kunci rahasia di kode klien, tidak ada `any`, tidak ada dependensi baru tanpa alasan tertulis
- [ ] Laporan PR menyebut ID task, apa yang berubah, dan hasil semua pemeriksaan

**Definition of Done proyek**

- [ ] Semua gerbang G1 sampai G5 dan gerbang rilis lulus
- [ ] Lagu dari upload, Audius, Jamendo, dan Deezer terputar sesuai aturan (penuh atau preview)
- [ ] Syarat dan atribusi tiap API tercatat di `docs/sources.md` dan sudah diverifikasi

## Risiko, pertanyaan terbuka, dan prompt untuk AI

Risiko terbesar ada pada hak cipta unggahan dan syarat API yang belum diverifikasi; keduanya sudah punya task penanganan.

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Syarat Audius dan Deezer belum diverifikasi | Fitur bisa dilarang atau berubah | Task P2-03, P2-04, P6-03; tiap adapter bisa dimatikan lewat bendera konfigurasi |
| Jamendo hanya untuk aplikasi non-komersial | Tidak boleh dimonetisasi | Bendera `ENABLE_JAMENDO`; tinjau lisensi komersial sebelum ada pemasukan |
| Pengguna mengunggah lagu orang lain | Gugatan atau penghapusan layanan | Kotak hak wajib, laporan, hapus cepat, syarat penggunaan (P4-06, P4-07) |
| URL preview Deezer kedaluwarsa | Preview gagal diputar | Ambil URL baru setiap kali diputar |
| Data nyata mengubah tampilan (judul panjang, artwork) | Uji piksel gagal | Uji piksel hanya di Fase 1; setelah itu uji struktur DOM |
| AI mendesain ulang tampilan | Tampilan melenceng dari HTML | Aturan Emas dan uji visual di setiap task |
| Kerentanan Next.js | Aplikasi bisa diretas | Pakai patch terbaru; Next.js merilis pembaruan keamanan berkala |
| RLS salah | Data pengguna bocor | Tes RLS di gerbang G3 |
| Biaya storage dan bandwidth naik | Anggaran jebol | Batas 100 MB per file, CDN, bitrate wajar |

**Pertanyaan terbuka untukmu**

1. Apakah aplikasi ini untuk pemakaian pribadi atau dibuka untuk umum? Ini menentukan lisensi Jamendo dan seberapa ketat moderasinya.
2. Kartu "ZMusic Premium: Tanpa iklan" di sidebar menyiratkan versi gratis beriklan. Default dokumen ini: dipertahankan persis agar tampilan identik. Mau diganti menjadi "Dukung ZMusic"?
3. Apakah nama ZMusic sudah final?
4. Apakah SoundCloud ingin ditambahkan di fase lanjutan (butuh atribusi dan logo mereka di pemutar)?

**Prompt pembuka untuk AI agen**

Simpan dokumen ini sebagai `docs/PRD.md` (ekspor ke Markdown), taruh `zmusic-fixed.html` di `reference/`, lalu tempel prompt berikut ke agen pengkode.

```text
Kamu adalah AI agen pengembang. Tugasmu: memigrasikan prototipe HTML ZMusic ke Next.js dengan tampilan IDENTIK, lalu menambahkan logika dan data nyata.

Berkas:
- reference/zmusic-fixed.html = sumber kebenaran visual. Jangan diubah.
- docs/PRD.md = PRD dan daftar task. Baca seluruhnya sebelum menulis kode.

Aturan:
1. Patuhi bagian 'Aturan Emas untuk AI Agen' tanpa pengecualian. Jangan mendesain ulang, jangan menerjemahkan CSS ke Tailwind, pertahankan class dan struktur DOM.
2. Kerjakan task berurutan mulai dari P0-01. Jangan mulai task yang kolom Bergantung-nya belum selesai.
3. Satu task = satu cabang dan satu PR. Setelah tiap task jalankan npm run lint, npm run test, dan npm run test:visual, lalu laporkan hasilnya dengan menyebut ID task.
4. Berhenti dan laporkan di setiap gerbang (G1 sampai G5 dan gerbang rilis) sebelum lanjut.
5. Jangan menebak syarat atau titik akhir API. Bila dokumentasi tidak bisa dipastikan, berhenti dan tanya.
6. Kunci rahasia hanya di server. Jangan menambah dependensi di luar daftar tanpa alasan tertulis.

Mulai dengan ringkasan rencana (maks. 20 baris), lalu kerjakan P0-01.
```
