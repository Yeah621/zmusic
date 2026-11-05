'use client';
import Link from 'next/link';
import { SegTabs, Switch } from '@/components/forms/Switch';
import { QUALITIES, THEME_LABELS } from '@/lib/constants';
import { THEME_MODES } from '@/lib/theme';
import { useLibraryStore, type Quality, type Settings } from '@/stores/library';
import { toast, useUiStore } from '@/stores/ui';

/** Pengaturan (setV di HTML). Pengaturan tersimpan di akun pada P3-06. */
export function SettingsView() {
  const user = useLibraryStore((s) => s.user);
  const settings = useLibraryStore((s) => s.settings);
  const setSetting = useLibraryStore((s) => s.setSetting);
  const quality = useLibraryStore((s) => s.quality);
  const setQuality = useLibraryStore((s) => s.setQuality);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const openDialog = useUiStore((s) => s.openDialog);
  const sw = (k: keyof Settings, title: string, sub: string) => (
    <Switch
      on={settings[k]}
      title={title}
      sub={sub}
      onToggle={() => {
        setSetting(k, !settings[k]);
        toast(settings[k] ? 'Dinonaktifkan' : 'Diaktifkan');
      }}
    />
  );
  return (
    <>
      <h2>Pengaturan</h2>
      <h3 className="sh">Akun</h3>
      <div className="set">
        <div className="srow">
          <div>
            <h4>{user ? user.name : 'Belum masuk'}</h4>
            <p>{user ? `@${user.handle}` : 'Masuk untuk menyinkronkan koleksi'}</p>
          </div>
          {user ? (
            <button className="btn b3" onClick={() => openDialog({ kind: 'profile' })}>
              Ubah
            </button>
          ) : (
            <Link className="btn b1" href="/login">
              Masuk
            </Link>
          )}
        </div>
        <div className="srow">
          <div>
            <h4>Paket</h4>
            <p>ZMusic Premium</p>
          </div>
          <button className="btn b3" onClick={() => toast('Pengelolaan paket segera hadir')}>
            Kelola
          </button>
        </div>
      </div>
      <h3 className="sh">Pemutaran</h3>
      <div className="set">
        <div className="srow">
          <div>
            <h4>Kualitas Audio</h4>
            <p>{QUALITIES[quality]}</p>
          </div>
          <SegTabs
            labels={QUALITIES}
            current={quality}
            label="Kualitas audio"
            onPick={(i) => {
              setQuality(i as Quality);
              toast(`Kualitas audio: ${QUALITIES[i]}`);
            }}
          />
        </div>
        {sw('cf', 'Crossfade', 'Transisi mulus antar lagu')}
        {sw('nm', 'Normalisasi volume', 'Samakan kerasnya setiap lagu')}
        {sw('ap', 'Putar otomatis', 'Lanjut ke lagu serupa saat antrean habis')}
      </div>
      <h3 className="sh">Tampilan</h3>
      <div className="set">
        <div className="srow">
          <div>
            <h4>Tema</h4>
            <p>Ikuti sistem, terang, atau gelap</p>
          </div>
          <SegTabs labels={THEME_LABELS} current={THEME_MODES.indexOf(theme)} label="Tema" onPick={(i) => setTheme(THEME_MODES[i])} />
        </div>
      </div>
      <h3 className="sh">Privasi &amp; notifikasi</h3>
      <div className="set">
        {sw('pp', 'Profil publik', 'Orang lain bisa melihat profilmu')}
        {sw('sa', 'Tampilkan aktivitas', 'Bagikan apa yang sedang kamu putar')}
        {sw('nt', 'Notifikasi', 'Rilis baru dari artis yang diikuti')}
        {sw('ds', 'Hemat Data', 'Kurangi penggunaan data seluler')}
      </div>
      <h3 className="sh">Tentang</h3>
      <div className="set">
        <div className="srow">
          <div>
            <h4>ZMusic</h4>
            <p>Versi prototipe 2.0</p>
          </div>
        </div>
      </div>
    </>
  );
}
