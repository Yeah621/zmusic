import { PREVIEW_SECONDS, SOURCE_LABEL } from '@/lib/constants';
import type { Track } from '@/stores/catalog';

/** Baris kedua lagu: artis, ditambah penanda cuplikan untuk lagu preview (Deezer). */
export const subtitle = (x: Pick<Track, 'a' | 'playable'>): string => (x.playable === 'preview' ? `${x.a} · Preview ${PREVIEW_SECONDS} detik` : x.a);

/** Kolom genre di baris lagu; bila sumber tidak memberi genre, tampilkan nama sumbernya (atribusi). */
export const genreOrSource = (x: Pick<Track, 'g' | 'pv' | 'source'>): string => (x.pv === 'p' ? 'Pribadi' : x.g || SOURCE_LABEL[x.source]);
