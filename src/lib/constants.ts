export const QUALITIES = ['Normal', 'Tinggi', 'Hi-Fi'] as const;
export const THEME_LABELS = ['Sistem', 'Terang', 'Gelap'] as const;

/** Lagu Deezer hanya terputar sebagian: cuplikan 30 detik (badge "Preview 30 detik"). */
export const PREVIEW_SECONDS = 30;

/** Nama sumber untuk atribusi di UI (wajib menyebut penyedia; lihat docs/sources.md). */
export const SOURCE_LABEL = { upload: 'ZMusic', audius: 'Audius', jamendo: 'Jamendo', deezer: 'Deezer', sample: 'Contoh' } as const;
