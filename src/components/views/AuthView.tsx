'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Field } from '@/components/forms/Field';
import { Icon } from '@/components/icons/Icon';
import { Reveal } from '@/components/shell/Reveal';
import { runAuth } from '@/lib/auth/flow';
import { getAuthPort } from '@/lib/auth/port';
import { focusFirstInvalid, RULES, validate, type Rule } from '@/lib/validate';
import { useLibraryStore } from '@/stores/library';
import { toast } from '@/stores/ui';

/**
 * Masuk / Daftar (authV di HTML). Isian divalidasi di sini (pesan sama dengan HTML), lalu dikirim lewat port auth
 * (lib/auth): Supabase, atau tiruan di mode contoh. Galat dari server tampil di bawah kolom yang bersangkutan atau sebagai toast.
 */
export function AuthView({ register }: { register: boolean }) {
  const router = useRouter();
  const setUser = useLibraryStore((s) => s.setUser);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // /auth/confirm mengembalikan ke sini bila tautan konfirmasi email tidak valid atau sudah kedaluwarsa
    if (new URLSearchParams(location.search).get('galat') === 'konfirmasi') toast('Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Coba daftar atau masuk lagi.');
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const f = new FormData(e.currentTarget);
    const values = { name: String(f.get('name') ?? ''), email: String(f.get('email') ?? ''), pw: String(f.get('pw') ?? '') };
    const rules: Record<string, Rule> = { ...(register ? { name: RULES.name } : {}), email: RULES.email, pw: RULES.password };
    const errs = validate(values, rules);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstInvalid(errs, ['name', 'email', 'pw']);
    setPending(true);
    const step = await runAuth(getAuthPort(), register ? 'register' : 'login', values);
    setPending(false);
    if (step.kind === 'welcome') {
      setUser(step.user);
      toast(`Selamat datang, ${step.user.name}`);
      router.push('/profile');
    } else if (step.kind === 'confirm') {
      toast('Cek emailmu untuk mengonfirmasi akun, lalu masuk.');
      router.push('/login');
    } else if (step.field) {
      const err = { [step.field]: step.message };
      setErrors(err);
      focusFirstInvalid(err, ['name', 'email', 'pw']);
    } else toast(step.message);
  };

  return (
    <Reveal className="auth">
      <div className="logo" style={{ paddingLeft: 0 }}>
        <b>Z</b>ZMusic
      </div>
      <nav className="tabs" aria-label="Masuk atau daftar">
        <Link href="/login" className={register ? undefined : 'on'}>
          Masuk
        </Link>
        <Link href="/register" className={register ? 'on' : undefined}>
          Daftar
        </Link>
      </nav>
      <h3>{register ? 'Buat akun baru' : 'Selamat datang kembali'}</h3>
      <p style={{ margin: '6px 0 20px' }}>{register ? 'Gratis. Dengarkan dan unggah tanpa batas.' : 'Masuk untuk melanjutkan musikmu.'}</p>
      <form onSubmit={submit} noValidate>
        {register ? <Field name="name" label="Nama tampilan" type="text" autoComplete="name" error={errors.name} /> : null}
        <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
        <div className="fld">
          <label htmlFor="f-pw">Kata sandi</label>
          <div className="pwr">
            <input id="f-pw" name="pw" type={show ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} aria-describedby="e-pw" aria-invalid={errors.pw ? true : undefined} />
            <button type="button" className="lk" data-a="eye" aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShow(!show)}>
              <Icon name="eye" />
            </button>
          </div>
          <span className="er" id="e-pw" role="alert">
            {errors.pw}
          </span>
        </div>
        <button className="btn b1 full" type="submit" disabled={pending} aria-busy={pending || undefined}>
          {register ? 'Daftar' : 'Masuk'}
        </button>
      </form>
      <div className="or">
        <span>atau</span>
      </div>
      <div className="soc">
        <button className="btn b3" onClick={() => toast('Masuk dengan Google segera hadir (demo)')}>
          Google
        </button>
        <button className="btn b3" onClick={() => toast('Masuk dengan Apple segera hadir (demo)')}>
          Apple
        </button>
      </div>
      <p className="alt">
        {register ? (
          <>
            Sudah punya akun? <Link href="/login">Masuk</Link>
          </>
        ) : (
          <>
            Belum punya akun? <Link href="/register">Daftar gratis</Link>
          </>
        )}
      </p>
    </Reveal>
  );
}
