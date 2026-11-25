import type { SourceId, SourceTrack } from '@/lib/sources/types';

/** Lagu dari akun: metadata (untuk dimasukkan ke katalog klien) + uuid baris tracks di database. */
export interface RemoteTrack {
  trackId: string;
  track: SourceTrack;
}
export interface RemoteArtist {
  artistId: string;
  name: string;
  source: SourceId;
}
export interface RemoteLibrary {
  /** terbaru dulu */
  likes: RemoteTrack[];
  /** terbaru dulu, maks 8 */
  history: RemoteTrack[];
  follows: RemoteArtist[];
  /** terbaru dulu, maks 6 */
  searches: string[];
}
/** uuid baris tracks dan artisnya di database; null = lagu tidak bisa disalin (galat atau tidak dikenal) */
export type EnsureMap = Record<string, { trackId: string; artistId: string } | null>;

/**
 * Batas antara logika koleksi dan penyimpanannya (Aturan Emas 6). Implementasi: Supabase (supabase-repo.ts, dengan sesi
 * pengguna sehingga RLS berlaku) dan memori (memory-repo.ts, mode contoh dan uji).
 */
export interface LibraryRepo {
  load(): Promise<RemoteLibrary>;
  /** Pastikan lagu sumber luar punya baris di database (lewat server, P3-07) dan kembalikan uuid-nya, kunci = id global. */
  ensure(tracks: readonly SourceTrack[]): Promise<EnsureMap>;
  like(trackId: string): Promise<void>;
  unlike(trackId: string): Promise<void>;
  follow(artistId: string): Promise<void>;
  unfollow(artistId: string): Promise<void>;
  /** Catat lagu diputar (upsert: lagu yang sama hanya satu baris, waktu diperbarui). */
  touchHistory(trackId: string): Promise<void>;
  addSearch(query: string): Promise<void>;
  removeSearch(query: string): Promise<void>;
}
