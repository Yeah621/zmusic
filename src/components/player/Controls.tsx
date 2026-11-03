'use client';
import { Icon } from '@/components/icons/Icon';
import { usePlayerStore } from '@/stores/player';

/** Acak, sebelumnya, putar/jeda, berikutnya, ulang (CT di HTML). Dipakai di #pctl dan #nctl. */
export function Controls() {
  const sh = usePlayerStore((s) => s.sh);
  const rp = usePlayerStore((s) => s.rp);
  const on = usePlayerStore((s) => s.on);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  // data-a dipertahankan: CSS memakainya (mis. tombol sebelumnya disembunyikan di mobile)
  return (
    <>
      <button className={`sb${sh ? ' on' : ''}`} data-a="sh" aria-label="Acak" aria-pressed={sh} onClick={toggleShuffle}>
        <Icon name="shuffle" />
      </button>
      <button data-a="prev" aria-label="Sebelumnya" onClick={() => next(-1)}>
        <Icon name="prev" />
      </button>
      <button className="pp" data-a="toggle" aria-label={on ? 'Jeda' : 'Putar'} onClick={toggle}>
        <Icon name={on ? 'pause' : 'play'} />
      </button>
      <button data-a="next" aria-label="Berikutnya" onClick={() => next(1)}>
        <Icon name="next" />
      </button>
      <button className={`rb${rp ? ' on' : ''}`} data-a="rp" aria-label="Ulang" aria-pressed={rp} onClick={toggleRepeat}>
        <Icon name="repeat" />
      </button>
    </>
  );
}
