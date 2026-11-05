'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/forms/Field';
import { Icon } from '@/components/icons/Icon';
import { Reveal } from '@/components/shell/Reveal';
import { focusFirstInvalid, RULES, validate, type Rule } from '@/lib/validate';
import { useLibraryStore } from '@/stores/library';
import { toast } from '@/stores/ui';

/** Masuk / Daftar (authV di HTML). Validasi saja; autentikasi nyata di P3-02. */
export function AuthView({ register }: { register: boolean }) {
  const router = useRouter();
  const setUser = useLibraryStore((s) => s.setUser);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const values = { name: String(f.get('name') ?? ''), email: String(f.get('email') ?? ''), pw: String(f.get('pw') ?? '') };
    const rules: Record<string, Rule> = { ...(register ? { name: RULES.name } : {}), email: RULES.email, pw: RULES.password };
    const errs = validate(values, rules);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstInvalid(errs, ['name', 'email', 'pw']);
    const n = register ? values.name.trim() : values.email.split('@')[0];
    setUser({ name: n, handle: n.toLowerCase().replace(/\s+/g, '.') });
    toast(`Selamat datang, ${n}`);
    router.push('/profile');
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
        <button className="btn b1 full" type="submit">
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
