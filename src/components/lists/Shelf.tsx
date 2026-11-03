import type { ReactNode } from 'react';

/** Judul bagian + baris kartu yang bisa digeser mendatar (h2 + .row di HTML). */
export function Shelf({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2>{title}</h2>
      <div className="row">{children}</div>
    </>
  );
}
