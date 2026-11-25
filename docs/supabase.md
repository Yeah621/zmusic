# Supabase: skema, RLS, dan cara membuktikannya (P3-01)

Migrasi `supabase/migrations/0001_init.sql` membuat semua tabel, hak akses, RLS, trigger, dan bucket `audio`. Tes pgTAP ada di `supabase/tests/` (5 berkas, 153 asersi).

**Status jujur:** SQL dan tes pgTAP ditulis tanpa Postgres (sandbox pengembang tidak punya), jadi **belum pernah dijalankan**. Yang sudah diperiksa otomatis oleh `src/tests/unit/supabase-schema.test.ts` (ikut `npm run test`): bentuk skema (tiap tabel ber-RLS, grant dicabut dulu, satu policy per operasi dengan `to`, `auth.uid()` dibungkus `(select ...)`, tamu hanya membaca data publik, kolom lagu yang boleh diubah pemilik), kurung dan `$$` seimbang, dan jumlah `plan(N)` tiap berkas pgTAP sama dengan jumlah asersinya. Perilaku sebenarnya (siapa melihat apa) baru terbukti setelah `supabase test db` lulus.

## Langkah

1. **Buat proyek** di supabase.com/dashboard (paket gratis cukup).
2. **Terapkan migrasi**, pilih salah satu:
   - CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
   - SQL Editor: tempel seluruh isi `supabase/migrations/0001_init.sql`, jalankan sekali.
3. **Isi `.env.local`** dari Project Settings, API Keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Publishable key; nama lama `NEXT_PUBLIC_SUPABASE_ANON_KEY` tetap didukung), dan `SUPABASE_SERVICE_ROLE_KEY` (Secret key; **server saja**, jangan pernah di klien). Tanpa URL dan kunci publik, fitur akun nonaktif dan aplikasi berjalan sebagai tamu.
4. **Buktikan di database lokal** (butuh Docker): `npx supabase init` (sekali), `npx supabase start`, `npx supabase db reset` (menerapkan migrasi dari nol: inilah uji "migrasi berjalan bersih"), lalu `npx supabase test db`. Semua 153 asersi harus lulus. Bila muncul `function plan(integer) does not exist`, pgTAP belum aktif: jalankan `create extension if not exists pgtap with schema extensions;` sekali.
5. **Angkat admin** (SQL Editor): `insert into public.admins (user_id) select id from auth.users where email = 'kamu@contoh.com';`
6. Pengaturan Auth untuk P3-02: lihat bagian berikut.

Kirim hasil `db reset` dan `test db` (atau galatnya) ke agen; itu penentu gerbang G3.

## Auth email dan kata sandi (P3-02)

Kode: `src/lib/auth` (port, alur, pemetaan galat), `src/lib/supabase` (klien peramban dan server, proxy sesi), `src/proxy.ts` (Next.js 16), `src/app/auth/confirm/route.ts`. Disusun dari dokumentasi Supabase per Nov 2026 (`@supabase/ssr` 0.12, `getClaims()` di proxy, tanpa `getSession()` di server). **Belum dijalankan dengan Supabase sungguhan** (pustakanya tidak terpasang di sandbox pengembang).

Pengaturan di dashboard (Authentication):

- **URL Configuration:** Site URL `http://localhost:3000`; Redirect URLs `http://localhost:3000/**` (tambahkan domain produksi nanti).
- **Sign In / Providers, Email:** aktif. **Confirm email** aktif secara bawaan. Saat mencoba pertama kali, **matikan** (maka Daftar langsung masuk) atau pakai SMTP sendiri. Penting: SMTP bawaan Supabase hanya mengirim ke anggota organisasi Supabase-mu dan dibatasi sekitar 2 email per jam; alamat lain gagal dengan "Server email belum bisa mengirim ke alamat ini". Untuk pengguna sungguhan, siapkan SMTP kustom (Resend, Postmark, dsb).
- **Email Templates, Confirm sign up:** ganti tautan dengan `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`. Alur `token_hash` berfungsi lintas perangkat (daftar di laptop, buka email di ponsel); tautan bawaan (PKCE) hanya bekerja di peramban yang sama. Tautan gagal membawa ke `/login?galat=konfirmasi`.
- Aplikasi memperlakukan email yang sudah terdaftar (dengan konfirmasi aktif) sama seperti pendaftaran baru ("cek emailmu"), mengikuti respons samaran Supabase agar keberadaan akun tidak bocor.

Daftar periksa manual (P3-02): (1) Daftar: dengan konfirmasi mati langsung masuk ke Profil; dengan konfirmasi aktif muncul "Cek emailmu", tautan di email membawa ke Profil sudah masuk. (2) Muat ulang: tetap masuk, tanpa kedipan tombol "Masuk" yang berkepanjangan. (3) Keluar: toast, avatar jadi "Masuk", Profil tertutup. (4) Masuk dengan kata sandi salah: "Email atau kata sandi salah" di bawah kolom kata sandi. (5) Tab kedua: keluar di satu tab ikut mengeluarkan tab lain. (6) Cookie `sb-…` ada, dan tidak ada `service_role` di bundel klien (`npm run check:secrets`).

Gerbang tamu (P3-03): tamu boleh mencari dan memutar; suka, ikuti, playlist, komentar, unggah, dan profil membawa ke `/login` dengan toast alasan (`src/lib/auth/gate.ts`). Berlaku di semua mode kecuali mode contoh, yang memakai pengguna contoh.

## Koleksi: suka, ikuti, riwayat putar, riwayat cari (P3-04) dan salinan metadata lagu (P3-07)

Kode: `src/lib/library` (sinkronisasi, repo Supabase dan memori, penyimpanan tamu), `src/lib/server` + `src/app/api/library/ensure/route.ts` (salin metadata lagu, hanya server). **Belum dijalankan dengan Supabase sungguhan.** Logika sinkronisasi (optimistis, batal bila gagal, urutan, gabung saat masuk, pindah data tamu) diuji penuh dengan repo memori; yang belum terbukti adalah kueri PostgREST dan route server.

- **Perilaku:** pengguna masuk menyimpan suka, ikuti, riwayat putar (8 terakhir), dan riwayat cari (6 terakhir) ke akunnya; muncul di perangkat lain setelah masuk. Perubahan langsung terlihat (optimistis); bila gagal disimpan, suka dan ikuti dibatalkan di layar dan muncul toast, riwayat bersifat terbaik-upaya. Tamu menyimpan riwayat cari dan putar di localStorage; saat masuk digabung ke akun lalu dihapus. Keluar atau berganti akun mengosongkan koleksi di klien.
- **Urutan tugas dibalik:** P3-07 dikerjakan lebih dulu karena `likes`, `follows`, dan `history` mereferensikan `tracks`/`artists`, dan klien tidak boleh menulis tabel itu. Route `POST /api/library/ensure` (hanya pengguna masuk, maks 20 id) mengambil metadata lagu dari adapter lalu menyalinnya dengan kunci service_role. **Wajib mengisi `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`** (server saja); tanpanya route membalas 503 dan suka/ikuti/riwayat gagal dengan toast.
- **Riwayat putar ikut menyalin metadata** lagu ke `tracks` (satu baris per lagu, dipakai bersama semua pengguna), bukan hanya saat suka atau masuk playlist seperti tertulis di PRD, supaya riwayat sinkron antar perangkat.
- Lagu contoh (mode contoh) tidak pernah disimpan. Playlist (P3-05), pengaturan (P3-06), dan profil (P3-08) masih lokal.

Daftar periksa manual (P3-04): (1) Masuk, sukai lagu Jamendo dan lagu Deezer: baris muncul di tabel `likes` dan `tracks` (Table Editor), `tracks.like_count` bertambah. (2) Muat ulang dan buka di peramban/perangkat lain: Koleksi, Disukai tetap ada. (3) Ikuti artis: baris di `follows`; tab Artis menampilkannya. (4) Putar beberapa lagu: Profil, Terakhir diputar sama di perangkat lain; lagu yang sama tidak muncul dua kali. (5) Cari beberapa kata: riwayat cari sama di perangkat lain, maks 6. (6) Sebagai tamu cari dan putar, lalu masuk: riwayat pindah ke akun dan `localStorage.zm-guest` hilang. (7) Matikan jaringan lalu sukai lagu: suka dibatalkan dan ada toast. (8) Bila Console menampilkan galat PostgREST "Could not find a relationship" saat memuat koleksi, kirim galatnya (kueri `tracks(...)` bergantung pada deteksi relasi).

## Siapa boleh apa

| Tabel | Membaca | Menulis |
| --- | --- | --- |
| `profiles` | profil publik: semua; profil sendiri: pemilik | pemilik mengubah handle, nama, warna, publik; baris dibuat trigger saat akun dibuat |
| `settings`, `likes`, `follows`, `history`, `search_history` | hanya pemilik | hanya pemilik |
| `playlists` | milik sendiri, atau yang publik oleh semua | pemilik |
| `playlist_tracks` | bila playlist-nya terbaca | pemilik playlist (lagu harus terlihat olehnya) |
| `artists`, `albums` | semua | hanya server (service_role) |
| `tracks` | publik dan tidak disembunyikan: semua; pribadi: pemilik | server menerbitkan; pemilik mengubah judul, deskripsi, genre, warna, privasi dan boleh menghapus |
| `comments` | semua, pada lagu yang terlihat | pengguna masuk atas nama sendiri; hapus: penulis atau admin |
| `plays` | pemilik membaca miliknya | tamu dan pengguna mencatat (user_id kosong atau milik sendiri) |
| `reports` | hanya admin | pengguna masuk melapor atas nama sendiri (status selalu `baru`); admin mengubah status |
| `admins` | tidak ada (tanpa hak klien) | SQL Editor atau service_role |
| Storage `audio` | pemilik, folder `{user_id}/` | pemilik, folder sendiri; maks 100 MB; hanya MP3/AAC |

Lagu orang lain diputar lewat signed URL berumur pendek dari server (tidak melewati policy Storage), jadi server yang memutuskan siapa boleh.

## Penyimpangan dari PRD (perlu persetujuan)

- **Tabel tambahan:** `admins` (PRD menyebut admin di aturan RLS tapi tidak punya tabelnya) dan `history` (riwayat putar butuh penyimpanan sendiri; `plays` hanya putaran 30 detik).
- **Kolom tambahan:** `tracks.description` (form unggah), `tracks.source_url` dan `tracks.playable` (atribusi sumber dan preview Deezer), `tracks.hidden` (moderasi), `profiles.created_at`. `settings.crossfade` dalam detik 0 sampai 12 (UI sekarang hanya on/off, dipetakan ke 4 atau 0).
- **Klien tidak menulis `artists`, `albums`, dan `tracks` baru.** Tabel itu dipakai bersama; bila klien boleh menulis, pengguna bisa meracuni metadata lagu sumber luar (judul, tautan sumber) yang dilihat semua orang. Server (service_role) menerbitkan lagu dan menyalin metadata setelah mengambilnya dari adapter terpercaya (P3-07, P4-01).
- **Moderasi** (sembunyikan atau hapus lagu oleh admin) lewat server setelah memeriksa `admins`. RLS untuk admin hanya pada komentar (hapus) dan laporan (baca dan ubah status), persis seperti PRD.
- **Hak akses eksplisit**: Supabase tidak lagi memberi hak otomatis ke tabel baru (mulai 30 Okt 2026), jadi tiap tabel `revoke all` lalu `grant` seperlunya, termasuk `service_role`. Fungsi `security definer` ada di skema `private` (tidak terpapar Data API).

## Batasan dan risiko yang diketahui

- Belum dijalankan (lihat Status jujur). Risiko terbesar: salah ketik SQL atau asumsi skema Supabase (mis. kolom `auth.users` yang wajib, trigger internal Storage). Tes pgTAP sengaja tidak menguji penghapusan langsung di `storage.objects` (ditolak Storage); berkas dihapus lewat API Storage di P4.
- `play_count` dan penghapusan duplikat putaran per sesi dikerjakan di P4-05; trigger `like_count` sudah ada.
- `reports.track_id` bersifat cascade: laporan ikut hilang bila lagunya dihapus. Bila butuh jejak takedown hak cipta, ubah di P4-06.
- Tamu boleh mencatat putaran (sengaja, PRD); penyalahgunaan dibatasi di P6-02 (batas laju).
- Pembuatan profil oleh trigger memakai handle `user<20 hex id>` yang unik; pengguna menggantinya di Pengaturan.

## Checklist G3

- [ ] `supabase db reset` bersih
- [ ] `supabase test db`: 5 berkas, 153 asersi lulus
- [ ] (setelah P3-02 sampai P3-05) dua akun nyata tidak saling melihat data privat lewat aplikasi
- [ ] (setelah P3-04) koleksi sinkron antar perangkat
