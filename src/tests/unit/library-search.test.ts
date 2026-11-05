import { beforeEach, describe, expect, it } from 'vitest';
import { searchAll, searchQueryFromPath, suggest } from '@/lib/search';
import { RULES, validate } from '@/lib/validate';
import { useLibraryStore as store } from '@/stores/library';

const s = () => store.getState();

beforeEach(() => store.setState({ likes: [], follows: [], ownPlaylists: [], recents: ['lo-fi', 'kairo'] }));

describe('pencarian', () => {
  it('searchAll mencocokkan judul, artis, dan genre tanpa peduli huruf besar', () => {
    expect(searchAll('lo-fi').songs.map((x) => x.i)).toEqual([1, 7, 11]);
    expect(searchAll('ZARA').artists.map((a) => a.n)).toEqual(['Zara Lune']);
    expect(searchAll('midnight').albums.map((a) => a.n)).toEqual(['Midnight Drive']);
    const none = searchAll('zzzz');
    expect([none.songs.length, none.artists.length, none.albums.length]).toEqual([0, 0, 0]);
  });

  it('suggest: maks 3 lagu, 2 artis, 1 album, 1 genre; kosong bila input kosong', () => {
    expect(suggest('   ')).toEqual([]);
    expect(suggest('zara').map((x) => x.kind)).toEqual(['t', 't', 't', 'a']);
    expect(suggest('ele').map((x) => x.kind)).toEqual(['g']);
    expect(suggest('midnight').map((x) => `${x.kind}:${x.label}`)).toEqual(['t:Midnight Drive', 'al:Midnight Drive']);
  });

  it('kata kunci dari path, termasuk karakter terenkode', () => {
    expect(searchQueryFromPath('/search/lo-fi')).toBe('lo-fi');
    expect(searchQueryFromPath('/search/hujan%20di')).toBe('hujan di');
    expect(searchQueryFromPath('/library/1')).toBe('');
    expect(searchQueryFromPath(null)).toBe('');
  });
});

describe('library store', () => {
  it('suka, batal suka, dan indeks tidak valid', () => {
    expect(s().toggleLike(3)).toBe(true);
    expect(s().toggleLike(5)).toBe(true);
    expect(s().likes).toEqual([3, 5]);
    expect(s().toggleLike(3)).toBe(false);
    expect(s().likes).toEqual([5]);
    expect(s().toggleLike(99)).toBeNull();
  });

  it('riwayat cari: terbaru dulu, tanpa duplikat, maksimal 6, bisa dihapus', () => {
    s().pushRecent('kairo');
    expect(s().recents).toEqual(['kairo', 'lo-fi']);
    for (const w of ['a', 'b', 'c', 'd', 'e']) s().pushRecent(w);
    expect(s().recents).toEqual(['e', 'd', 'c', 'b', 'a', 'kairo']);
    s().removeRecent(0);
    expect(s().recents[0]).toBe('d');
  });

  it('playlist: buat, tambah tanpa duplikat, hapus lagu, ubah nama, hapus dan pulihkan', () => {
    s().addPlaylist('Santai', 4);
    s().addPlaylist('Kosong');
    expect(s().ownPlaylists.map((p) => [p.n, p.t])).toEqual([['Santai', [4]], ['Kosong', []]]);
    s().addToPlaylist(0, 4);
    s().addToPlaylist(0, 6);
    expect(s().ownPlaylists[0].t).toEqual([4, 6]);
    s().removeFromPlaylist(0, 4);
    expect(s().ownPlaylists[0].t).toEqual([6]);
    s().renamePlaylist(1, 'Baru');
    const removed = s().deletePlaylist(0);
    expect(s().ownPlaylists.map((p) => p.n)).toEqual(['Baru']);
    if (removed) s().restorePlaylist(0, removed);
    expect(s().ownPlaylists.map((p) => p.n)).toEqual(['Santai', 'Baru']);
  });

  it('ikuti artis', () => {
    expect(s().toggleFollow(2)).toBe(true);
    expect(s().toggleFollow(2)).toBe(false);
  });
});

describe('validasi form', () => {
  it('pesan sama dengan HTML', () => {
    const e = validate({ name: 'A', email: 'x@y', pw: '1234567' }, { name: RULES.name, email: RULES.email, pw: RULES.password });
    expect(e).toEqual({ name: 'Nama minimal 2 karakter', email: 'Format email tidak valid', pw: 'Kata sandi minimal 8 karakter' });
    expect(validate({ email: 'a@b.co', pw: '12345678' }, { email: RULES.email, pw: RULES.password })).toEqual({});
    expect(validate({ dh: 'ab' }, { dh: RULES.handle })).toEqual({ dh: '3–24 karakter: huruf, angka, titik, garis bawah' });
    expect(validate({ dh: 'zee.music_1' }, { dh: RULES.handle })).toEqual({});
  });
});
