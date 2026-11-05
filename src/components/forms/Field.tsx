import type { InputHTMLAttributes } from 'react';

/** Kolom form berlabel dengan pesan galat (fld() di HTML). id input = f-<name>, galat = e-<name>. */
export function Field({ name, label, error, ...input }: { name: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="fld">
      <label htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} aria-describedby={`e-${name}`} aria-invalid={error ? true : undefined} {...input} />
      <span className="er" id={`e-${name}`} role="alert">
        {error}
      </span>
    </div>
  );
}
