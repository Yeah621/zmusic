import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Cache pemuatan data di klien (stale-while-revalidate): satu permintaan per kunci, hasil dipakai ulang saat pindah halaman,
 * dimuat ulang di latar bila lebih dari 10 menit. Server juga memberi cache CDN (lihat route handler), jadi ini hanya
 * mencegah kedipan skeleton saat kembali ke halaman yang sudah dimuat.
 */
interface Entry<T> {
  status: 'loading' | 'ready' | 'error';
  data?: T;
  error?: unknown;
  at: number;
}

const TTL = 10 * 60_000;
const cache = new Map<string, Entry<unknown>>();
const subs = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<unknown>>();

function put<T>(key: string, e: Entry<T>): void {
  cache.set(key, e as Entry<unknown>);
  subs.get(key)?.forEach((f) => f());
}

/** Muat (atau pakai cache) lalu kembalikan datanya. Pemanggil serentak berbagi satu permintaan. */
export function resolveResource<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit?.status === 'ready' && Date.now() - hit.at < TTL) return Promise.resolve(hit.data as T);
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  if (!hit || hit.status === 'error') put(key, { status: 'loading', at: Date.now() });
  const p: Promise<T> = load().then(
    (data) => {
      inflight.delete(key);
      put(key, { status: 'ready', data, at: Date.now() });
      return data;
    },
    (error: unknown) => {
      inflight.delete(key);
      put(key, hit?.status === 'ready' ? hit : { status: 'error', error, at: Date.now() });
      throw error;
    },
  );
  inflight.set(key, p);
  return p;
}

/** Hanya untuk uji. */
export function clearResources(): void {
  cache.clear();
  inflight.clear();
}

export interface Resource<T> {
  /** idle = tidak aktif (kunci null) */
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | undefined;
  error: unknown;
  /** true = `data` adalah hasil kunci sebelumnya yang dipertahankan selama kunci baru dimuat (opsi keepPrevious) */
  stale: boolean;
  /** Buang cache kunci ini lalu muat ulang (tombol "Coba lagi"). */
  reload: () => void;
}

/**
 * Hook pemuatan data per kunci. Kunci `null` = nonaktif. Render pertama di server dan hidrasi selalu `loading`.
 * `keepPrevious`: selama kunci baru dimuat, `data` tetap berisi hasil kunci sebelumnya (mis. hasil cari tidak berkedip saat mengetik).
 */
export function useResource<T>(key: string | null, load: () => Promise<T>, opts: { keepPrevious?: boolean } = {}): Resource<T> {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {};
      let set = subs.get(key);
      if (!set) subs.set(key, (set = new Set()));
      set.add(cb);
      return () => {
        set.delete(cb);
      };
    },
    [key],
  );
  const entry = useSyncExternalStore(
    subscribe,
    () => (key ? (cache.get(key) as Entry<T> | undefined) : undefined),
    () => undefined,
  );
  // Pola React "menyimpan informasi dari render sebelumnya": setState bersyarat saat render, bukan di efek.
  const fresh = entry?.status === 'ready' ? entry.data : undefined;
  if (opts.keepPrevious && fresh !== undefined && fresh !== prev) setPrev(fresh);
  useEffect(() => {
    if (key) resolveResource(key, load).catch(() => {});
    // `load` sengaja tidak jadi dependensi: kunci sudah mewakili semua masukannya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const reload = useCallback(() => {
    if (!key) return;
    cache.delete(key);
    resolveResource(key, load).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const data = entry?.data ?? (opts.keepPrevious && key ? prev : undefined);
  return { status: key ? (entry?.status ?? 'loading') : 'idle', data, error: entry?.error, stale: data !== undefined && entry?.data === undefined, reload };
}
