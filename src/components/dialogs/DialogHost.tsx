'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Field } from '@/components/forms/Field';
import { PB } from '@/data/mock';
import { focusFirstInvalid, RULES, validate } from '@/lib/validate';
import { useLibraryStore } from '@/stores/library';
import { toast, useUiStore } from '@/stores/ui';

/** Dialog "Playlist baru" / "Ubah nama playlist" (plDlg di HTML). `track` = lagu yang langsung dimasukkan, `edit` = indeks gabungan. */
function PlaylistForm({ track, edit }: { track?: number; edit?: number }) {
  const own = useLibraryStore((s) => s.ownPlaylists);
  const addPlaylist = useLibraryStore((s) => s.addPlaylist);
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const [error, setError] = useState('');
  const idx = edit !== undefined ? edit - PB.length : -1;
  const current = idx >= 0 ? own[idx] : undefined;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('pln') ?? '');
    const errs = validate({ pln: name }, { pln: RULES.name });
    setError(errs.pln ?? '');
    if (errs.pln) return focusFirstInvalid(errs, ['pln']);
    if (current) {
      renamePlaylist(idx, name.trim());
      toast('Nama playlist diperbarui');
    } else {
      addPlaylist(name.trim(), track);
      toast(track !== undefined ? `Ditambahkan ke ${name.trim()}` : 'Playlist dibuat');
    }
    closeDialog();
  };

  return (
    <form onSubmit={submit} noValidate>
      <h3 id="dgt">{current ? 'Ubah nama playlist' : 'Playlist baru'}</h3>
      <Field name="pln" label="Nama playlist" type="text" autoComplete="off" maxLength={40} defaultValue={current?.n ?? ''} error={error} />
      <div className="cta2">
        <button type="button" className="btn b3" onClick={closeDialog}>
          Batal
        </button>
        <button className="btn b1" type="submit">
          {current ? 'Simpan' : 'Buat'}
        </button>
      </div>
    </form>
  );
}

/** Dialog "Edit profil" (profDlg di HTML). */
function ProfileForm() {
  const user = useLibraryStore((s) => s.user);
  const setUser = useLibraryStore((s) => s.setUser);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const values = { dn: String(f.get('dn') ?? ''), dh: String(f.get('dh') ?? '') };
    const errs = validate(values, { dn: RULES.name, dh: RULES.handle });
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstInvalid(errs, ['dn', 'dh']);
    setUser({ name: values.dn.trim(), handle: values.dh.trim() });
    closeDialog();
    toast('Profil diperbarui');
  };

  return (
    <form onSubmit={submit} noValidate>
      <h3 id="dgt">Edit profil</h3>
      <Field name="dn" label="Nama tampilan" type="text" autoComplete="name" maxLength={30} defaultValue={user?.name ?? ''} error={errors.dn} />
      <Field name="dh" label="Nama pengguna" type="text" autoComplete="username" maxLength={24} defaultValue={user?.handle ?? ''} error={errors.dh} />
      <div className="cta2">
        <button type="button" className="btn b3" onClick={closeDialog}>
          Batal
        </button>
        <button className="btn b1" type="submit">
          Simpan
        </button>
      </div>
    </form>
  );
}

/** <dialog> modal tunggal; isinya mengikuti state `dialog` di store ui. Esc dan klik latar menutup. */
export function DialogHost() {
  const dialog = useUiStore((s) => s.dialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (dialog && !d.open) d.showModal();
    else if (!dialog && d.open) d.close();
  }, [dialog]);

  return (
    <dialog
      ref={ref}
      id="dg"
      className="dl"
      aria-labelledby="dgt"
      onClose={closeDialog}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDialog();
      }}
    >
      {dialog?.kind === 'playlist' ? <PlaylistForm key={`pl-${dialog.edit ?? 'baru'}-${dialog.track ?? ''}`} track={dialog.track} edit={dialog.edit} /> : null}
      {dialog?.kind === 'profile' ? <ProfileForm key="profil" /> : null}
    </dialog>
  );
}
