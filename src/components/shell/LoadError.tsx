'use client';
import { DataError } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

/** Galat pemuatan data: pesan dan tombol "Coba lagi" (pola sama dengan keadaan offline di halaman Cari). */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const offline = error instanceof DataError && error.offline;
  return (
    <>
      <EmptyState icon="alert" title={offline ? 'Tidak ada koneksi' : 'Gagal memuat'} text={error instanceof DataError ? error.message : 'Terjadi galat. Coba lagi sebentar.'} />
      <div style={{ textAlign: 'center' }}>
        <button className="btn b1" onClick={onRetry}>
          Coba lagi
        </button>
      </div>
    </>
  );
}
