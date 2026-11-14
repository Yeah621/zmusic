import { safeArtUrl } from '@/lib/cover-art';
import { trackAt } from '@/stores/catalog';
import { usePlayerStore } from '@/stores/player';

function artwork(h: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const k = c.getContext('2d');
  if (!k) return '';
  const gr = k.createLinearGradient(0, 0, 256, 256);
  gr.addColorStop(0, `hsl(${h},80%,52%)`);
  gr.addColorStop(1, `hsl(${(h + 65) % 360},70%,22%)`);
  k.fillStyle = gr;
  k.fillRect(0, 0, 256, 256);
  return c.toDataURL();
}

/** Kontrol layar kunci dan tombol media (setActionHandler di HTML). */
export function registerMediaSession(): void {
  if (!('mediaSession' in navigator)) return;
  const p = () => usePlayerStore.getState();
  try {
    navigator.mediaSession.setActionHandler('play', () => !p().on && p().toggle());
    navigator.mediaSession.setActionHandler('pause', () => p().on && p().toggle());
    navigator.mediaSession.setActionHandler('previoustrack', () => p().next(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => p().next(1));
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (typeof d.seekTime === 'number') p().seek(d.seekTime);
    });
  } catch {
    /* aksi tidak didukung peramban */
  }
}

export function setMediaMetadata(cur: number): void {
  const x = trackAt(cur);
  if (!x || !('mediaSession' in navigator)) return;
  const art = safeArtUrl(x.art);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: x.t,
      artist: x.a,
      album: x.album ?? 'Single',
      artwork: art ? [{ src: art }] : [{ src: artwork(x.h), sizes: '256x256', type: 'image/png' }],
    });
  } catch {
    /* abaikan */
  }
}

export function setPlaybackState(on: boolean): void {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
  } catch {
    /* abaikan */
  }
}
