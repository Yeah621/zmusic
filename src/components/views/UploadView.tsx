'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Field } from '@/components/forms/Field';
import { Bars } from '@/components/player/Waveform';
import { Icon } from '@/components/icons/Icon';
import { GateEmpty } from '@/components/shell/EmptyState';
import { G } from '@/data/mock';
import { coverStyle } from '@/lib/cover-art';
import { fmt } from '@/lib/format';
import { useReveal } from '@/lib/use-reveal';
import { focusFirstInvalid, RULES, validate } from '@/lib/validate';
import { waveHeights } from '@/lib/waveform';
import { useLibraryStore } from '@/stores/library';
import { toast } from '@/stores/ui';

const HUES = [165, 210, 290, 340, 30];
const MAX_BYTES = 104857600;

interface PickedFile {
  n: string;
  s: number;
  d: number;
}

/** Form unggah lagu (uplV di HTML). Hanya formulir dan pratinjau; unggah sungguhan di P4-01. */
export function UploadView() {
  const user = useLibraryStore((s) => s.user);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [hue, setHue] = useState(165);
  const [title, setTitle] = useState('');
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState('');
  const { ref, cls } = useReveal<HTMLLabelElement>();

  useEffect(() => {
    if (!file || progress >= 100) return;
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 8 + Math.random() * 12)), 250);
    return () => clearInterval(id);
  }, [file, progress]);

  if (!user) return <GateEmpty title="Masuk untuk mengunggah" text="Bagikan karyamu ke pendengar ZMusic." />;

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/^audio\//.test(f.type) && !/\.(mp3|wav|flac|m4a|ogg)$/i.test(f.name)) return setFileError('Format tidak didukung. Gunakan file audio.');
    if (f.size > MAX_BYTES) return setFileError('Ukuran file melebihi 100 MB.');
    setFileError('');
    setProgress(0);
    setFile({ n: f.name, s: f.size, d: 180 });
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    const a = new Audio();
    a.preload = 'metadata';
    a.src = URL.createObjectURL(f);
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration)) setFile((prev) => (prev ? { ...prev, d: a.duration } : prev));
      URL.revokeObjectURL(a.src);
    };
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate({ t: title }, { t: RULES.title });
    setErrors(errs);
    if (errs.t) return focusFirstInvalid(errs, ['t']);
    if (!file) return setFileError('Pilih file audio terlebih dahulu');
    if (progress < 100) return toast('Tunggu unggahan selesai');
    toast('Unggah sungguhan aktif di Fase 4');
  };

  return (
    <>
      <h2>Unggah lagu</h2>
      <form className="g2" onSubmit={submit} noValidate>
        <div>
          <label
            ref={ref}
            className={`dz rv${cls}${over ? ' over' : ''}`}
            htmlFor="uf"
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              pick(e.dataTransfer.files[0]);
            }}
          >
            <input className="vh" type="file" id="uf" accept="audio/*" onChange={(e) => pick(e.target.files?.[0])} />
            <div id="upz">
              {file ? (
                <>
                  <Icon name={progress >= 100 ? 'check' : 'music'} />
                  <h4>{file.n}</h4>
                  <p>{`${(file.s / 1048576).toFixed(1)} MB · ${fmt(file.d)} · ${progress >= 100 ? 'Siap diterbitkan' : `Mengunggah ${Math.round(progress)}%`}`}</p>
                  <div className="pgb" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <Icon name="upload" />
                  <h4>Tarik file audio ke sini</h4>
                  <p>atau ketuk untuk memilih (MP3, WAV, FLAC · maks 100 MB)</p>
                </>
              )}
            </div>
          </label>
          <span className="er" id="e-file" role="alert">
            {fileError}
          </span>
          <Field name="t" label="Judul lagu" maxLength={60} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.t} />
          <div className="fld">
            <label htmlFor="f-g">Genre</label>
            <select id="f-g" name="g">
              {G.slice(1).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="f-d">Deskripsi (opsional)</label>
            <textarea id="f-d" name="d" maxLength={300} />
          </div>
          <div className="fld">
            <label htmlFor="f-p">Privasi</label>
            <select id="f-p" name="p">
              <option value="u">Publik</option>
              <option value="p">Pribadi</option>
            </select>
          </div>
          <fieldset className="fld" style={{ border: 0 }}>
            <legend>Warna sampul</legend>
            <div className="sws">
              {HUES.map((h) => (
                <button key={h} type="button" aria-pressed={h === hue} aria-label={`Warna ${h}`} style={{ background: `hsl(${h} 75% 45%)` }} onClick={() => setHue(h)}>
                  {h === hue ? <Icon name="check" /> : null}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn b1" type="submit">
            <Icon name="upload" />
            Terbitkan
          </button>
        </div>
        <aside className="upv" aria-label="Pratinjau">
          <p>Pratinjau</p>
          <div className="cv" id="upc" style={coverStyle({ h: hue, s: 3 })} />
          <h4 id="upt">{title || 'Judul lagu'}</h4>
          <p>{user.name}</p>
          <div className="wv" id="upw" aria-hidden="true">
            <Bars heights={waveHeights(hue)} />
          </div>
        </aside>
      </form>
    </>
  );
}
