import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  addEventListener('online', cb);
  addEventListener('offline', cb);
  return () => {
    removeEventListener('online', cb);
    removeEventListener('offline', cb);
  };
};

/** Status koneksi (navigator.onLine); server dan hidrasi dianggap online. */
export const useOnline = (): boolean => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
