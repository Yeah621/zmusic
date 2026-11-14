export type DataMode = 'live' | 'sample';

const KEY = 'zm-data';

/**
 * Sumber data yang dipakai klien. `live` (bawaan) = API musik lewat /api/*.
 * `?data=sample` memakai data contoh Fase 1 (14 lagu, tanpa jaringan) untuk uji visual, uji e2e, dan kerja UI offline;
 * pilihan disimpan di sessionStorage seperti `?audio=` dan dicabut dengan `?data=live`. Di server selalu `live`.
 */
export function dataMode(): DataMode {
  if (typeof window === 'undefined') return 'live';
  try {
    const q = new URLSearchParams(location.search).get('data');
    if (q === 'sample') sessionStorage.setItem(KEY, 'sample');
    else if (q === 'live') sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === 'sample' ? 'sample' : 'live';
  } catch {
    return 'live';
  }
}
