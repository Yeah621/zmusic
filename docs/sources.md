# Sumber musik: syarat, atribusi, dan status verifikasi

Diperiksa 8 Nov 2026 dari dokumentasi resmi lewat pencarian web. "Terverifikasi" = tertulis di halaman resmi yang dibaca; "belum" = berasal dari memori, kode pihak ketiga, atau PRD. Uji integrasi di repo memakai fixture sintetis (`src/tests/fixtures/sources`); belum ada uji ke API langsung.

| Sumber | Putar | Kunci | Syarat utama | Flag |
| --- | --- | --- | --- | --- |
| Jamendo | penuh (MP3 96 kbps, `mp32`, `flac`) | `JAMENDO_CLIENT_ID` | **non-komersial**, atribusi + tautan balik per lagu | `ENABLE_JAMENDO` |
| Audius | penuh (MP3) | `AUDIUS_API_KEY` = Bearer Token | gratis, **selalu cantumkan artis**, token hanya di server | `ENABLE_AUDIUS` |
| Deezer | **preview 30 detik** | tanpa kunci | **non-komersial**, atribusi Deezer, pedoman merek | `ENABLE_DEEZER` |

## Dampak bagi produk (perlu keputusan)

Jamendo dan Deezer hanya untuk pemakaian non-komersial. Kartu sidebar "ZMusic Premium" (tanpa iklan, paket berbayar) menyiratkan produk komersial. Bila ZMusic menarik bayaran atau menayangkan iklan, matikan `ENABLE_JAMENDO` dan `ENABLE_DEEZER` atau minta lisensi komersial. Ini pertanyaan terbuka no. 1 dan 2 di PRD.

## Jamendo

Terverifikasi ([developer.jamendo.com/v3.0/tracks](https://developer.jamendo.com/v3.0/tracks), [devportal.jamendo.com/api_terms_of_use](https://devportal.jamendo.com/api_terms_of_use)):
- `GET https://api.jamendo.com/v3.0/tracks/` dengan `client_id` wajib. Parameter: `format`, `limit` (maks 200), `offset`, `order` (`popularity_week`, `relevance`, ...), `tags`, `search`, `id`, `include` (`licenses`, ...), `audioformat` (`mp31` bawaan 96 kbps, `mp32`, `ogg`, `flac`), `imagesize`.
- Respons `{ headers: { status, code, error_message, ... }, results: [...] }`. Nilai berupa string (mis. `duration: "216"`). Field: `id`, `name`, `duration`, `artist_id`, `artist_name`, `album_id`, `album_name`, `album_image`, `image`, `license_ccurl`, `audio`, `audiodownload`, `audiodownload_allowed`.
- Syarat: gratis hanya non-komersial (iklan dan komisi afiliasi dihitung komersial); wajib mencantumkan pencipta dan Jamendo sebagai penyedia serta **tautan langsung ke halaman tiap konten di Jamendo**; cache hanya sejauh perlu untuk operasi aplikasi dan **tidak boleh dirancang untuk akses offline**; aplikasi harus mengikuti perubahan konten secepatnya; wajib ada kebijakan privasi; nama aplikasi tidak boleh memuat "jamendo"; Client ID per aplikasi dan tidak dibagi.

Belum: kuota 35.000 permintaan/bulan (hanya dari situs pihak ketiga, tidak ada di syarat resmi); kosakata tag (`lofi`, `hiphop`); field `shareurl` pada lagu (adapter membuat `https://www.jamendo.com/track/<id>` bila kosong); apakah URL `audio` kedaluwarsa. Salinan metadata lagu Jamendo di tabel `tracks` (PRD P3-07) perlu dikonfirmasi ke Jamendo karena syarat cache.

## Audius

Terverifikasi (README `@audius/sdk` 15.3.1, [docs.audius.org](https://docs.audius.org/developers/guides/rest-api)):
- Paket gratis: 10 permintaan/detik dan 500.000/bulan. API Key (aman di frontend) dan **Bearer Token (hanya backend)** dari `api.audius.co/plans`; akses langsung memakai `Authorization: Bearer <token>`.
- Basis `https://api.audius.co/v1`. `GET /tracks/trending` (`time`, `genre`, `limit`, `offset`). `GET /tracks/:id/stream` mengembalikan MP3 dan mendukung header Range; `no_redirect=true` membuatnya membalas JSON berisi URL stream tanpa 302. Parameter `app_name` dianjurkan.
- Pedoman: API gratis, **selalu cantumkan artis**.
- Field lagu: `id`, `title`, `duration`, `genre`, `permalink`, `is_streamable`, `artwork` (`150x150`, `480x480`, `1000x1000`), `user.name`.

Belum: Terms of Use di audius.co (belum dibaca); `GET /tracks/search?query=` (dari SDK dan kode pihak ketiga, bukan halaman API resmi); nama genre (`Lo-Fi`, `Hip-Hop/Rap`, `Acoustic`); masa berlaku URL stream; field lisensi lagu (belum dipetakan).

## Deezer

Terverifikasi ([developers.deezer.com/termsofuse](https://developers.deezer.com/termsofuse), FAQ pengembang Deezer):
- Akses gratis untuk halaman web dan aplikasi pribadi, **non-komersial**; logo dan merek hanya sesuai Trademark Guidelines.
- Lewat API hanya tersedia **preview 30 detik**; audio penuh hanya lewat SDK Deezer.
- Data publik (lagu, album, artis, URL preview) tanpa token; pedoman komunitas resmi menganjurkan menyebut bahwa informasi dan audio berasal dari Deezer.

Belum: batas 50 permintaan per 5 detik; id genre chart (Pop 132, Rap/Hip Hop 116, Electro 106, Folk 466 dari memori, cek `GET /genre`); apakah `exp=` di URL preview sama dengan masa berlaku sebenarnya (adapter selalu mengambil URL baru saat diputar); teks syarat resmi yang terbaca berumur sekitar empat tahun.

## Atribusi di UI (dikerjakan di P2-06)

- Tiap lagu: nama sumber dan lisensi (Jamendo: CC dari `license_ccurl`) di halaman lagu dan menu lagu.
- Tautan balik ke halaman lagu di sumber (`sourceUrl`): wajib untuk Jamendo, dianjurkan untuk Audius dan Deezer.
- Lagu Deezer berlabel "Preview 30 detik" dan berhenti di 0:30.
- Sebut Jamendo, Audius, dan Deezer sebagai penyedia; logo hanya sesuai pedoman masing-masing.
- Halaman kebijakan privasi (P4-07) sebelum Jamendo dibuka untuk umum.
