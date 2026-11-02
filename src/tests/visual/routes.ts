export const MAX_DIFF = 0.005; // lulus bila ≤ 0,5% piksel berbeda
export const THEMES = ['dark', 'light'] as const;
export const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
] as const;

export interface VisualRoute {
  name: string;
  html: string; // hash di reference/zmusic-fixed.html
  next: string; // path di Next.js
  task: string; // task yang membangun halaman ini
  ready: boolean; // ubah ke true setelah halaman Next ada
}

const r = (name: string, html: string, next: string, task: string): VisualRoute => ({ name, html, next, task, ready: false });

export const ROUTES: VisualRoute[] = [
  r('beranda', '#/', '/', 'P1-03'),
  r('cari-kosong', '#/search', '/search', 'P1-04'),
  r('cari-hasil', '#/search/lo-fi', '/search/lo-fi', 'P1-04'),
  r('cari-tak-ada', '#/search/zzzz', '/search/zzzz', 'P1-04'),
  r('koleksi-playlist', '#/library/0', '/library/0', 'P1-05'),
  r('koleksi-artis', '#/library/1', '/library/1', 'P1-05'),
  r('koleksi-album', '#/library/2', '/library/2', 'P1-05'),
  r('koleksi-disukai', '#/library/3', '/library/3', 'P1-05'),
  r('artis', '#/artist/0', '/artist/0', 'P1-05'),
  r('album', '#/album/0', '/album/0', 'P1-05'),
  r('playlist', '#/playlist/0', '/playlist/0', 'P1-05'),
  r('profil', '#/profile', '/profile', 'P1-06'),
  r('pengaturan', '#/settings', '/settings', 'P1-06'),
  r('unggah', '#/upload', '/upload', 'P1-06'),
  r('masuk', '#/login', '/login', 'P1-06'),
  r('daftar', '#/register', '/register', 'P1-06'),
  r('tidak-ditemukan', '#/zzz', '/zzz', 'P1-07'),
];
