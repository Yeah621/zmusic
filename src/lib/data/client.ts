import { hueFrom } from '@/lib/sources/ids';
import { httpUrl } from '@/lib/url';
import type { SourceId, SourceTrack, SourceWarning } from '@/lib/sources/types';
import { albumByKey, artistByKey, useCatalog, wordsOfKey } from '@/stores/catalog';
import { dataMode } from './mode';
import { sampleAlbum, sampleArtist, sampleHome, sampleSearch } from './sample';
import { DataError, type AlbumData, type ArtistData, type HomeData, type SearchData } from './types';

/**
 * Layanan data untuk UI (Aturan Emas 6): komponen tidak memanggil API musik langsung. Fungsi di sini memanggil route handler
 * kita (/api/*, ber-cache), memasukkan hasilnya ke katalog, dan mengembalikan indeks. Jangan impor `@/lib/sources` (indeks).
 */
const SOURCES: ReadonlySet<string> = new Set<SourceId>(['upload', 'audius', 'jamendo', 'deezer']);
const rec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

/** Validasi satu lagu dari JSON API; lagu tanpa id, judul, artis, sumber, atau durasi dibuang, dan alamat selain http(s) diabaikan. */
export function toTrack(v: unknown): SourceTrack | null {
  if (!rec(v)) return null;
  const id = str(v.id);
  const title = str(v.title);
  const artist = str(v.artist);
  const source = str(v.source);
  const durationSec = typeof v.durationSec === 'number' && Number.isFinite(v.durationSec) ? Math.round(v.durationSec) : 0;
  if (!id || !title || !artist || !source || !SOURCES.has(source) || durationSec <= 0) return null;
  return {
    id,
    source: source as SourceId,
    title,
    artist,
    genre: str(v.genre),
    durationSec,
    artworkUrl: httpUrl(str(v.artworkUrl)) ?? undefined,
    hue: typeof v.hue === 'number' && Number.isFinite(v.hue) ? v.hue : hueFrom(title),
    playable: v.playable === 'preview' ? 'preview' : 'full',
    license: str(v.license),
    album: str(v.album),
    artistId: str(v.artistId),
    albumId: str(v.albumId),
    sourceUrl: httpUrl(str(v.sourceUrl)) ?? undefined,
  };
}

async function getJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new DataError('Tidak bisa terhubung ke server', true);
  }
  if (!res.ok) throw new DataError(res.status === 429 ? 'Terlalu banyak permintaan, coba lagi sebentar' : 'Gagal memuat dari sumber musik');
  try {
    return await res.json();
  } catch {
    throw new DataError('Jawaban server tidak terbaca');
  }
}

/** Ambil daftar lagu dari /api/home atau /api/search. Semua sumber gagal (kosong + peringatan) dianggap galat. */
async function fetchTracks(url: string): Promise<SourceTrack[]> {
  const j = await getJson(url);
  const tracks = rec(j) && Array.isArray(j.tracks) ? j.tracks.map(toTrack).filter((t): t is SourceTrack => t !== null) : [];
  const warnings = rec(j) && Array.isArray(j.warnings) ? (j.warnings as SourceWarning[]) : [];
  if (!tracks.length && warnings.length) throw new DataError('Sumber musik sedang tidak bisa dijangkau');
  return tracks;
}

const uniq = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

/** Artis dan album (urutan kemunculan) dari kumpulan lagu. */
function shelvesOf(ids: readonly number[]): { artists: number[]; albums: number[] } {
  const { tracks } = useCatalog.getState();
  return { artists: uniq(ids.map((i) => tracks[i].ak)), albums: uniq(ids.map((i) => tracks[i].bk).filter((b): b is number => b !== undefined)) };
}

/** Lagu tren (opsional per genre) beserta rak artis dan albumnya. */
export async function loadHome(genre: string): Promise<HomeData> {
  if (dataMode() === 'sample') return sampleHome(genre);
  const p = new URLSearchParams({ limit: '50' });
  if (genre && genre !== 'Semua') p.set('genre', genre);
  const ids = useCatalog.getState().ingest(await fetchTracks(`/api/home?${p}`));
  return { ids, ...shelvesOf(ids) };
}

/** Pencarian gabungan. Artis dan album = yang namanya cocok dengan kata kunci, seperti di HTML. */
export async function loadSearch(q: string): Promise<SearchData> {
  if (dataMode() === 'sample') return sampleSearch(q);
  const ids = useCatalog.getState().ingest(await fetchTracks(`/api/search?${new URLSearchParams({ q, limit: '30' })}`));
  const { artists, albums } = useCatalog.getState();
  const ql = q.toLowerCase();
  const shelves = shelvesOf(ids);
  return {
    ids,
    artists: shelves.artists.filter((a) => artists[a].n.toLowerCase().includes(ql)),
    albums: shelves.albums.filter((b) => `${albums[b].n} ${albums[b].a}`.toLowerCase().includes(ql)),
  };
}

/**
 * Halaman artis. Kontrak sumber tidak punya endpoint artis, jadi lagu artis diturunkan dari pencarian nama (kunci = slug nama)
 * lalu digabung dengan yang sudah ada di katalog. null = tidak ditemukan.
 */
export async function loadArtist(key: string): Promise<ArtistData | null> {
  if (dataMode() === 'sample') return sampleArtist(key);
  let failure: unknown;
  try {
    useCatalog.getState().ingest(await fetchTracks(`/api/search?${new URLSearchParams({ q: wordsOfKey(key), limit: '50' })}`));
  } catch (e) {
    failure = e;
  }
  const a = artistByKey(key);
  if (!a) {
    if (failure) throw failure;
    return null;
  }
  const { tracks } = useCatalog.getState();
  return { artist: a.i, ids: a.ids, albums: uniq(a.ids.map((i) => tracks[i].bk).filter((b): b is number => b !== undefined)) };
}

/** Halaman album (kunci `<slug artis>~<slug judul>`), diturunkan dari pencarian judul + artis. null = tidak ditemukan. */
export async function loadAlbum(key: string): Promise<AlbumData | null> {
  if (dataMode() === 'sample') return sampleAlbum(key);
  const [artist, title] = key.split('~');
  if (!artist || !title) return null;
  let failure: unknown;
  try {
    useCatalog.getState().ingest(await fetchTracks(`/api/search?${new URLSearchParams({ q: `${wordsOfKey(title)} ${wordsOfKey(artist)}`, limit: '50' })}`));
  } catch (e) {
    failure = e;
  }
  const al = albumByKey(key);
  if (!al) {
    if (failure) throw failure;
    return null;
  }
  return { album: al.i, ids: al.ids };
}
