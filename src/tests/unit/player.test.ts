import { beforeEach, describe, expect, it } from 'vitest';
import { T } from '@/data/mock';
import { gainAt } from '@/lib/crossfade';
import { useCatalog } from '@/stores/catalog';
import { contextOf, durationOf, setRandomSource, upcoming, usePlayerStore as store } from '@/stores/player';

const s = () => store.getState();

beforeEach(() => {
  useCatalog.getState().reset();
  useCatalog.getState().seedSample();
  store.setState({ cur: -1, ctx: null, pos: 0, on: false, sh: false, rp: false, queue: [], hist: [], volume: 0.7, muted: false, duration: null, engine: false });
  setRandomSource(Math.random);
});

describe('putar dan jeda', () => {
  it('play memulai lagu, riwayat tanpa duplikat dan maksimal 8', () => {
    for (let i = 0; i < 10; i++) s().play(i);
    expect(s().cur).toBe(9);
    expect(s().on).toBe(true);
    expect(s().hist).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
    s().play(5, true);
    expect(s().hist).toEqual([5, 9, 8, 7, 6, 4, 3, 2]);
  });

  it('lagu yang sama = jeda/putar; tanpa lagu aktif mulai dari lagu pertama', () => {
    s().toggle();
    expect(s().cur).toBe(0);
    expect(s().on).toBe(true);
    s().play(0);
    expect(s().on).toBe(false);
    s().play(0);
    expect(s().on).toBe(true);
  });

  it('indeks tidak valid diabaikan', () => {
    s().play(99);
    expect(s().cur).toBe(-1);
  });

  it('seek dibatasi 0 sampai durasi; jam hanya berjalan saat memutar', () => {
    s().play(0);
    s().seek(9999);
    expect(s().pos).toBe(T[0].d);
    s().seek(-5);
    expect(s().pos).toBe(0);
    s().tick(0.1, true);
    expect(Math.round(s().pos * 10)).toBe(1);
    s().pause();
    s().tick(0.1, true);
    expect(Math.round(s().pos * 10)).toBe(1);
  });
});

describe('berikutnya dan sebelumnya', () => {
  it('berurutan dan kembali ke awal', () => {
    s().play(12);
    s().next(1);
    expect(s().cur).toBe(13);
    s().next(1);
    expect(s().cur).toBe(0);
    s().next(-1);
    expect(s().cur).toBe(13);
  });

  it('sebelumnya: lebih dari 3 detik mengulang lagu, selain itu mundur', () => {
    s().play(4);
    s().seek(10);
    s().next(-1);
    expect(s().cur).toBe(4);
    expect(s().pos).toBe(0);
    s().next(-1);
    expect(s().cur).toBe(3);
  });

  it('berikutnya memulai pemutaran walau sedang jeda', () => {
    s().play(2);
    s().pause();
    s().next(1);
    expect(s().on).toBe(true);
  });

  it('antrean didahulukan, lalu lanjut berurutan dari lagu terakhir', () => {
    s().play(0);
    s().addToQueue(5);
    s().addNext(7);
    expect(s().queue).toEqual([7, 5]);
    s().next(1);
    expect(s().cur).toBe(7);
    s().next(1);
    expect(s().cur).toBe(5);
    s().next(1);
    expect(s().cur).toBe(6);
  });
});

describe('acak', () => {
  it('berikutnya tidak pernah memilih lagu yang sama', () => {
    for (const r of [0, 0.2, 0.5, 0.99]) {
      for (const c of [0, 5, 13]) {
        setRandomSource(() => r);
        store.setState({ cur: c, sh: true, queue: [] });
        s().next(1);
        expect(s().cur).not.toBe(c);
      }
    }
  });

  it('playSet: urutan asli, dan acak tetap memuat semua lagu', () => {
    expect(s().playSet([4, 5, 6])).toBe(true);
    expect([s().cur, ...s().queue]).toEqual([4, 5, 6]);
    setRandomSource(() => 0.3);
    s().playSet([1, 2, 3, 4], true);
    expect([s().cur, ...s().queue].sort()).toEqual([1, 2, 3, 4]);
    expect(s().playSet([])).toBe(false);
  });

  it('radio: antrean berisi lagu sejenis tanpa lagu awal', () => {
    s().startRadio(0);
    expect(s().cur).toBe(0);
    expect([...s().queue].sort((a, b) => a - b)).toEqual([3, 10, 13]);
  });
});

describe('ulang dan putar otomatis', () => {
  it('ulang: di akhir lagu posisi kembali 0 dan tetap memutar', () => {
    s().play(1);
    s().toggleRepeat();
    s().seek(T[1].d - 0.05);
    s().tick(0.1, true);
    expect(s().cur).toBe(1);
    expect(s().pos).toBe(0);
    expect(s().on).toBe(true);
  });

  it('putar otomatis: genre sama, bukan 3 lagu terakhir, bukan lagu saat ini', () => {
    s().play(0);
    s().play(3);
    s().play(10);
    s().seek(T[10].d - 0.05);
    s().tick(0.1, true);
    expect(s().cur).toBe(13);
  });

  it('putar otomatis mati: berhenti di akhir lagu', () => {
    s().play(2);
    s().seek(T[2].d - 0.05);
    s().tick(0.1, false);
    expect(s().cur).toBe(2);
    expect(s().on).toBe(false);
    expect(s().pos).toBe(0);
  });

  it('antrean berisi: di akhir lagu lanjut ke antrean', () => {
    s().play(2);
    s().addToQueue(9);
    s().seek(T[2].d - 0.05);
    s().tick(0.1, true);
    expect(s().cur).toBe(9);
  });
});

describe('antrean', () => {
  it('tambah, hapus, pindah, tukar, kosongkan', () => {
    s().addToQueue(5);
    s().addToQueue(6);
    s().addNext(7);
    expect(s().queue).toEqual([7, 5, 6]);
    s().removeFromQueue(1);
    expect(s().queue).toEqual([7, 6]);
    s().addToQueue(8);
    s().moveInQueue(0, 2);
    expect(s().queue).toEqual([6, 8, 7]);
    s().swapInQueue(0, 1);
    expect(s().queue).toEqual([8, 6, 7]);
    s().swapInQueue(0, 9);
    expect(s().queue).toEqual([8, 6, 7]);
    expect(s().clearQueue()).toEqual([8, 6, 7]);
    expect(s().queue).toEqual([]);
  });

  it('volume dibatasi 0..1 dan membatalkan senyap', () => {
    s().toggleMute();
    expect(s().muted).toBe(true);
    s().setVolume(2);
    expect(s().volume).toBe(1);
    expect(s().muted).toBe(false);
  });
});

describe('audio nyata (engine)', () => {
  it('jam simulasi berhenti; posisi dan durasi dari audio dipakai dan seek dibatasi durasinya', () => {
    s().play(0);
    expect(durationOf(s())).toBe(T[0].d);
    store.setState({ engine: true });
    s().setDuration(4);
    expect(durationOf(s())).toBe(4);
    s().tick(1, true);
    expect(s().pos).toBe(0);
    s().setPosition(3);
    expect(s().pos).toBe(3);
    s().seek(99);
    expect(s().pos).toBe(4);
    s().play(1);
    expect(s().duration).toBeNull();
  });

  it('finish: ulang, antrean, berhenti', () => {
    s().play(2);
    store.setState({ engine: true, pos: 50 });
    s().toggleRepeat();
    s().finish(true);
    expect([s().cur, s().pos, s().on]).toEqual([2, 0, true]);
    s().toggleRepeat();
    s().addToQueue(7);
    s().finish(true);
    expect(s().cur).toBe(7);
    store.setState({ queue: [] });
    s().finish(false);
    expect([s().cur, s().on, s().pos]).toEqual([7, false, 0]);
  });

  it('gainAt: naik di awal, turun di akhir, 1 di tengah, 1 bila crossfade mati', () => {
    expect([gainAt(0, 100, 4), gainAt(2, 100, 4), gainAt(50, 100, 4), gainAt(98, 100, 4), gainAt(100, 100, 4)]).toEqual([0, 0.5, 1, 0.5, 0]);
    expect([gainAt(1, 100, 0), gainAt(1, 0, 4)]).toEqual([1, 1]);
  });
});

describe('daftar pemutaran (konteks)', () => {
  it('berikutnya dan sebelumnya mengikuti daftar yang dipilih, melingkar', () => {
    s().play(3, false, [3, 7, 10]);
    s().next(1);
    expect(s().cur).toBe(7);
    s().next(1);
    expect(s().cur).toBe(10);
    s().next(1);
    expect(s().cur).toBe(3);
    s().next(-1);
    expect(s().cur).toBe(10);
  });

  it('tanpa daftar baru, daftar lama dipertahankan; tanpa daftar sama sekali = seluruh katalog', () => {
    s().play(3, false, [3, 7, 10]);
    s().play(7);
    expect(s().ctx).toEqual([3, 7, 10]);
    store.setState({ ctx: null, cur: -1 });
    s().play(2);
    expect(s().ctx).toBeNull();
    s().next(1);
    expect(s().cur).toBe(3);
  });

  it('acak memilih dari daftar, bukan dari seluruh katalog', () => {
    s().toggleShuffle();
    s().play(3, false, [3, 7, 10]);
    setRandomSource(() => 0);
    s().next(1);
    expect(s().cur).toBe(7);
    setRandomSource(() => 0.99);
    s().next(1);
    expect(s().cur).toBe(10);
  });

  it('playSet menjadikan set sebagai daftar pemutaran; antrean dan daftar terpisah', () => {
    s().playSet([4, 6, 9]);
    expect(s().ctx).toEqual([4, 6, 9]);
    expect(s().queue).toEqual([6, 9]);
    expect(contextOf(s())).toEqual([4, 6, 9]);
    store.setState({ ctx: null });
    expect(contextOf(s())).toHaveLength(14);
  });

  it('akhir lagu melanjutkan daftar yang dipilih; setelah habis baru putar otomatis, atau berhenti bila dimatikan', () => {
    setRandomSource(() => 0);
    s().play(3, false, [3, 7]);
    s().seek(T[3].d - 0.05);
    s().tick(0.1, true);
    expect(s().cur).toBe(7);
    s().seek(T[7].d - 0.05);
    s().tick(0.1, true);
    expect(s().cur).toBe(1);
    s().play(3, true, [3, 7]);
    s().play(7);
    s().seek(T[7].d - 0.05);
    s().tick(0.1, false);
    expect(s().cur).toBe(7);
    expect(s().on).toBe(false);
  });

  it('upcoming: lagu berikutnya melingkar; daftar pendek tidak mengulang lagu yang sedang diputar', () => {
    expect(upcoming([1, 2, 3, 4, 5, 6], 5, 4)).toEqual([6, 1, 2, 3]);
    expect(upcoming([9], 9, 4)).toEqual([]);
    expect(upcoming([9, 8], 9, 4)).toEqual([8]);
  });

  it('lagu preview: durasi efektif dibatasi 30 detik, sebelum dan sesudah metadata audio', () => {
    const [i] = useCatalog.getState().ingest([{ id: 'deezer:1', source: 'deezer', title: 'Cuplikan', artist: 'Tester', durationSec: 204, hue: 10, playable: 'preview' }]);
    s().play(i);
    expect(durationOf(s())).toBe(30);
    s().setDuration(12);
    expect(durationOf(s())).toBe(12);
  });
});
