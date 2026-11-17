# Supabase: skema, RLS, dan cara membuktikannya (P3-01)

Migrasi `supabase/migrations/0001_init.sql` membuat semua tabel, hak akses, RLS, trigger, dan bucket `audio`. Tes pgTAP ada di `supabase/tests/` (5 berkas, 153 asersi).

**Status jujur:** SQL dan tes pgTAP ditulis tanpa Postgres (sandbox pengembang tidak punya), jadi **belum pernah dijalankan**. Yang sudah diperiksa otomatis oleh `src/tests/unit/supabase-schema.test.ts` (ikut `npm run test`): bentuk skema (tiap tabel ber-RLS, grant dicabut dulu, satu policy per operasi dengan `to`, `auth.uid()` dibungkus `(select ...)`, tamu hanya membaca data publik, kolom lagu yang boleh diubah pemilik), kurung dan `$$` seimbang, dan jumlah `plan(N)` tiap berkas pgTAP sama dengan jumlah asersinya. Perilaku sebenarnya (siapa melihat apa) baru terbukti setelah `supabase test db` lulus.

## Langkah

1. **Buat proyek** di supabase.com/dashboard (paket gratis cukup).
2. **Terapkan migrasi**, pilih salah satu:
   - CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
   - SQL Editor: tempel seluruh isi `supabase/migrations/0001_init.sql`, jalankan sekali.
3. **Isi `.env.local`** dari Project Settings, API Keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (di dashboard disebut Publishable key), dan `SUPABASE_SERVICE_ROLE_KEY` (Secret key; **server saja**, jangan pernah di klien).
4. **Buktikan di database lokal** (butuh Docker): `npx supabase init` (sekali), `npx supabase start`, `npx supabase db reset` (menerapkan migrasi dari nol: inilah uji "migrasi berjalan bersih"), lalu `npx supabase test db`. Semua 153 asersi harus lulus. Bila muncul `function plan(integer) does not exist`, pgTAP belum aktif: jalankan `create extension if not exists pgtap with schema extensions;` sekali.
5. **Angkat admin** (SQL Editor): `insert into public.admins (user_id) select id from auth.users where email = 'kamu@contoh.com';`
6. Untuk P3-02 (Auth): Authentication, URL Configuration: Site URL `http://localhost:3000` dan Redirect URL `http://localhost:3000/**`.

Kirim hasil `db reset` dan `test db` (atau galatnya) ke agen; itu penentu gerbang G3.

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
