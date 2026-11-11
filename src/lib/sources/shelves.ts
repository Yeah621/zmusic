import type { SourceId, SourceTrack } from './types';

export interface ShelfArtist {
  name: string;
  source: SourceId;
  artistId?: string;
  artworkUrl?: string;
  hue: number;
}
export interface ShelfAlbum {
  title: string;
  artist: string;
  source: SourceId;
  albumId?: string;
  artworkUrl?: string;
  hue: number;
}

/** Rak "Artis Populer" dan "Album Terbaru" diturunkan dari lagu (kontrak sumber hanya berisi lagu). */
export function deriveShelves(tracks: readonly SourceTrack[]): { artists: ShelfArtist[]; albums: ShelfAlbum[] } {
  const artists = new Map<string, ShelfArtist>();
  const albums = new Map<string, ShelfAlbum>();
  for (const t of tracks) {
    const ak = `${t.source}|${t.artistId ?? t.artist}`;
    if (!artists.has(ak)) artists.set(ak, { name: t.artist, source: t.source, artistId: t.artistId, artworkUrl: t.artworkUrl, hue: t.hue });
    if (t.album) {
      const bk = `${t.source}|${t.albumId ?? `${t.artist}|${t.album}`}`;
      if (!albums.has(bk)) albums.set(bk, { title: t.album, artist: t.artist, source: t.source, albumId: t.albumId, artworkUrl: t.artworkUrl, hue: t.hue });
    }
  }
  return { artists: [...artists.values()], albums: [...albums.values()] };
}
