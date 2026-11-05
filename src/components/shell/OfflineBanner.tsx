'use client';
import { useOnline } from '@/lib/use-online';

export function OfflineBanner() {
  const online = useOnline();
  return (
    <div className="ofl" id="ofl" role="status" hidden={online}>
      Kamu sedang offline. Beberapa fitur mungkin tidak tersedia.
    </div>
  );
}
