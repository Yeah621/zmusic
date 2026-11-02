import { describe, expect, it } from 'vitest';
import { A, AL, G, PB, T, TL } from '@/data/mock';
import ref from '../fixtures/reference.json';

describe('data contoh = HTML', () => {
  it('14 lagu dan 7 album', () => {
    expect(T).toHaveLength(14);
    expect(AL).toHaveLength(7);
  });

  it('semua koleksi sama persis dengan hasil kode asli HTML', () => {
    expect(T).toEqual(ref.T);
    expect(AL).toEqual(ref.AL);
    expect(A).toEqual(ref.A);
    expect(PB).toEqual(ref.PB);
    expect(TL).toEqual(ref.TL);
    expect(G).toEqual(ref.G);
  });
});
