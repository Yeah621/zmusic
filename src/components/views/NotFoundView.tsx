import { EmptyState } from '@/components/shell/EmptyState';

export function NotFoundView() {
  return <EmptyState icon="alert" title="Halaman tidak ditemukan" text="Tautan yang kamu buka mungkin sudah dipindahkan." href="/" cta="Kembali ke Beranda" />;
}
