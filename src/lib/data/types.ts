/** Hasil pemuatan data. Semua berisi INDEKS katalog (lihat stores/catalog.ts), bukan objek. */
export interface HomeData {
  /** indeks lagu, sesuai urutan dari server */
  ids: number[];
  /** indeks artis (urutan kemunculan) */
  artists: number[];
  /** indeks album (urutan kemunculan) */
  albums: number[];
}
export type SearchData = HomeData;
export interface ArtistData {
  artist: number;
  ids: number[];
  albums: number[];
}
export interface AlbumData {
  album: number;
  ids: number[];
}

/** Galat pemuatan data; `offline` = jaringan tidak bisa dijangkau. */
export class DataError extends Error {
  constructor(
    message: string,
    readonly offline = false,
  ) {
    super(message);
    this.name = 'DataError';
  }
}
