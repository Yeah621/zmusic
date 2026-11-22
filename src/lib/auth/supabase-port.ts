import { mapAuthError, thrownAuthError } from './errors';
import type { AuthPort, AuthUser } from './types';

/**
 * Port auth Supabase. Klien dimuat dinamis (@supabase/supabase-js cukup besar): tidak masuk bundel mode contoh atau tamu
 * di server tanpa konfigurasi. Halaman Masuk dan Daftar memakai email + kata sandi (P3-02); Google di P5-06.
 */
async function loadClient() {
  const { createClient } = await import('@/lib/supabase/client');
  return createClient();
}
type Client = Awaited<ReturnType<typeof loadClient>>;

interface UserLike {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
}

const handleOf = (name: string): string => name.toLowerCase().replace(/[^\w.]+/g, '.').slice(0, 24) || 'pengguna';

/** Nama dan handle dari tabel profiles (diisi trigger saat akun dibuat); cadangan: metadata akun atau bagian email. */
async function toUser(sb: Client, u: UserLike): Promise<AuthUser> {
  const meta = u.user_metadata ?? {};
  const metaName = typeof meta.display_name === 'string' ? meta.display_name : typeof meta.name === 'string' ? meta.name : '';
  let name = metaName.trim() || (u.email ?? '').split('@')[0] || 'Pengguna';
  let handle = handleOf(name);
  try {
    const { data } = await sb.from('profiles').select('handle, display_name').eq('id', u.id).maybeSingle();
    const row = data as { handle?: unknown; display_name?: unknown } | null;
    if (row && typeof row.display_name === 'string' && row.display_name) name = row.display_name;
    if (row && typeof row.handle === 'string' && row.handle) handle = row.handle;
  } catch {
    // profil belum terbaca (jaringan atau RLS): pakai cadangan, akun tetap dianggap masuk
  }
  return { id: u.id, name, handle };
}

export function createSupabasePort(): AuthPort {
  return {
    async signUp({ name, email, password }) {
      try {
        const sb = await loadClient();
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/profile` } });
        const code = mapAuthError(error);
        if (code) return { ok: false, code };
        // Dengan konfirmasi email aktif tidak ada sesi sampai tautan dibuka. Email yang sudah terdaftar menghasilkan respons
        // samaran (identities kosong) agar keberadaan akun tidak bocor: perlakukan sama, "cek emailmu".
        if (data.session && data.user) return { ok: true, user: await toUser(sb, data.user), needsConfirmation: false };
        return { ok: true, user: null, needsConfirmation: true };
      } catch (e) {
        return { ok: false, code: thrownAuthError(e) };
      }
    },

    async signIn({ email, password }) {
      try {
        const sb = await loadClient();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        const code = mapAuthError(error);
        if (code) return { ok: false, code };
        if (data.session && data.user) return { ok: true, user: await toUser(sb, data.user), needsConfirmation: false };
        return { ok: false, code: 'unknown' };
      } catch (e) {
        return { ok: false, code: thrownAuthError(e) };
      }
    },

    async signOut() {
      const sb = await loadClient();
      await sb.auth.signOut();
    },

    watch(cb) {
      let off: () => void = () => {};
      let stopped = false;
      loadClient().then(
        (sb) => {
          if (stopped) return;
          const { data } = sb.auth.onAuthStateChange((_event, session) => {
            // Dokumentasi Supabase: jangan menunggu fungsi Supabase lain langsung di dalam callback ini (bisa deadlock); tunda.
            setTimeout(() => {
              const u = session?.user;
              (u ? toUser(sb, u) : Promise.resolve(null)).then(
                (user) => {
                  if (!stopped) cb(user);
                },
                () => {
                  if (!stopped) cb(null);
                },
              );
            }, 0);
          });
          off = () => data.subscription.unsubscribe();
        },
        () => {
          if (!stopped) cb(null);
        },
      );
      return () => {
        stopped = true;
        off();
      };
    },
  };
}
