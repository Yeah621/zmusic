import type { AuthOutcome, AuthPort, AuthUser } from './types';

/** Pengguna contoh Fase 1 (U di HTML): keadaan awal mode contoh (`?data=sample`). */
export const DEMO_USER: AuthUser = { id: 'sample', name: 'Zee Pratama', handle: 'zee.music' };

const handleOf = (name: string): string => name.toLowerCase().replace(/\s+/g, '.');

/**
 * Port auth tiruan untuk mode contoh dan uji: tanpa jaringan, menerima kredensial apa pun, perilakunya sama dengan
 * prototipe Fase 1 (Masuk memakai bagian email sebelum @ sebagai nama).
 */
export function createFakeAuthPort(initial: AuthUser | null = DEMO_USER): AuthPort {
  let current = initial;
  const watchers = new Set<(u: AuthUser | null) => void>();
  const set = (u: AuthUser | null): void => {
    current = u;
    watchers.forEach((w) => w(u));
  };
  const signedIn = (name: string): AuthOutcome => {
    const user: AuthUser = { id: 'sample', name, handle: handleOf(name) };
    set(user);
    return { ok: true, user, needsConfirmation: false };
  };
  return {
    signUp: async ({ name }) => signedIn(name),
    signIn: async ({ email }) => signedIn(email.split('@')[0]),
    signOut: async () => set(null),
    watch(cb) {
      watchers.add(cb);
      cb(current);
      return () => void watchers.delete(cb);
    },
  };
}
