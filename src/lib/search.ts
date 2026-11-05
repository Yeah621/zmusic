import { A, AL, G, T, type Album, type Artist, type Track } from '@/data/mock';

export interface Suggestion {
  kind: 't' | 'a' | 'al' | 'g';
  /** indeks lagu/artis/album (tidak ada untuk genre) */
  i?: number;
  label: string;
  sub: string;
}

/** Saran saat mengetik: maks 3 lagu, 2 artis, 1 album, 1 genre (padanan sug() di HTML). */
export function suggest(v: string): Suggestion[] {
  const l = v.trim().toLowerCase();
  if (!l) return [];
  return [
    ...T.filter((x) => `${x.t} ${x.a}`.toLowerCase().includes(l)).slice(0, 3).map((x): Suggestion => ({ kind: 't', i: x.i, label: x.t, sub: `Lagu · ${x.a}` })),
    ...A.filter((a) => a.n.toLowerCase().includes(l)).slice(0, 2).map((a): Suggestion => ({ kind: 'a', i: A.indexOf(a), label: a.n, sub: 'Artis' })),
    ...AL.filter((a) => a.n.toLowerCase().includes(l)).slice(0, 1).map((a): Suggestion => ({ kind: 'al', i: AL.indexOf(a), label: a.n, sub: `Album · ${a.a}` })),
    ...G.slice(1).filter((x) => x.toLowerCase().includes(l)).slice(0, 1).map((x): Suggestion => ({ kind: 'g', label: x, sub: 'Genre' })),
  ];
}

export interface SearchResults {
  songs: Track[];
  artists: Artist[];
  albums: Album[];
}

/** Hasil pencarian lengkap (padanan srchV di HTML). */
export function searchAll(q: string): SearchResults {
  const ql = q.toLowerCase();
  return {
    songs: T.filter((x) => `${x.t} ${x.a} ${x.g}`.toLowerCase().includes(ql)),
    artists: A.filter((a) => a.n.toLowerCase().includes(ql)),
    albums: AL.filter((a) => `${a.n} ${a.a}`.toLowerCase().includes(ql)),
  };
}

/** Kata kunci dari rute /search/<q> (kosong bila bukan halaman cari). */
export function searchQueryFromPath(pathname: string | null): string {
  const seg = (pathname ?? '').split('/').filter(Boolean);
  if (seg[0] !== 'search') return '';
  return seg
    .slice(1)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join('/');
}
