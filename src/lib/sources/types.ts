export type SourceId = 'upload' | 'audius' | 'jamendo' | 'deezer';
export type Playable = 'full' | 'preview';
export type StreamKind = 'mp3' | 'aac' | 'ogg' | 'flac' | 'hls';

/** Lagu dari sumber mana pun. `id` global = `<sumber>:<id di sumber>`. Kolom opsional dipakai untuk atribusi dan tautan balik. */
export interface SourceTrack {
  id: string;
  source: SourceId;
  title: string;
  artist: string;
  genre?: string;
  /** panjang lagu penuh (detik); lagu `preview` hanya terputar 30 detik */
  durationSec: number;
  artworkUrl?: string;
  hue: number;
  playable: Playable;
  license?: string;
  album?: string;
  artistId?: string;
  albumId?: string;
  /** halaman lagu di sumber (tautan balik/atribusi) */
  sourceUrl?: string;
  downloadAllowed?: boolean;
}

export interface Stream {
  url: string;
  kind: StreamKind;
  /** unix detik; URL harus diambil ulang sebelum ini */
  expiresAt?: number;
  /** 'preview' = hanya cuplikan 30 detik (Deezer); kosong = lagu penuh */
  playable?: Playable;
}

export interface TrendingOptions {
  genre?: string;
  limit: number;
  offset?: number;
}

/** Kontrak adapter. `id` pada getTrack/getStream = id di sumber (tanpa awalan). `quality`: 0 Normal, 1 Tinggi, 2 Hi-Fi. */
export interface MusicSource {
  id: SourceId;
  trending(o: TrendingOptions): Promise<SourceTrack[]>;
  search(q: string, o: { limit: number }): Promise<SourceTrack[]>;
  getTrack(id: string): Promise<SourceTrack | null>;
  getStream(id: string, o?: { quality?: 0 | 1 | 2 }): Promise<Stream>;
}

export interface SourceWarning {
  source: SourceId;
  message: string;
  rateLimited?: boolean;
}
