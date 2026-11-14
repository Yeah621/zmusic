'use client';
import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { TrackList } from '@/components/lists/TrackList';
import { TrackRow } from '@/components/lists/TrackRow';
import { GateEmpty } from '@/components/shell/EmptyState';
import { Reveal } from '@/components/shell/Reveal';
import { useCatalog } from '@/stores/catalog';
import { useLibraryStore } from '@/stores/library';
import { usePlayerStore } from '@/stores/player';
import { toast, useUiStore } from '@/stores/ui';

/** Profil (profV di HTML): statistik dan terakhir diputar. Unggahan menyusul di P4-01. */
export function ProfileView() {
  const user = useLibraryStore((s) => s.user);
  const likes = useLibraryStore((s) => s.likes.length);
  const follows = useLibraryStore((s) => s.follows.length);
  const setUser = useLibraryStore((s) => s.setUser);
  const hist = usePlayerStore((s) => s.hist);
  const tracks = useCatalog((s) => s.tracks);
  const openDialog = useUiStore((s) => s.openDialog);
  if (!user) return <GateEmpty title="Masuk untuk melihat profil" text="Simpan lagu favorit dan unggah karyamu." />;
  return (
    <>
      <Reveal className="pbn">
        <div className="pav" aria-hidden="true">
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <p>Profil</p>
          <h1>{user.name}</h1>
          <p>
            {`@${user.handle} · `}
            <span className="bdg">PREMIUM</span>
          </p>
        </div>
        <button className="btn b1" onClick={() => openDialog({ kind: 'profile' })}>
          <Icon name="edit" />
          Edit Profil
        </button>
      </Reveal>
      <div className="stats">
        <Reveal className="stat">
          <b>{likes}</b>
          <p>Disukai</p>
        </Reveal>
        <Reveal className="stat" delay={80}>
          <b>{follows}</b>
          <p>Mengikuti</p>
        </Reveal>
        <Reveal className="stat" delay={160}>
          <b>0</b>
          <p>Unggahan</p>
        </Reveal>
      </div>
      <h2>Terakhir diputar</h2>
      {hist.length ? (
        <TrackList ids={hist}>
          {hist.map((i, k) => (
            <TrackRow key={i} track={tracks[i]} k={k} />
          ))}
        </TrackList>
      ) : (
        <p>Belum ada riwayat. Putar lagu untuk memulai.</p>
      )}
      <div className="cta">
        <Link className="btn b3" href="/settings">
          <Icon name="settings" />
          Pengaturan
        </Link>
        <button
          className="btn b3"
          onClick={() => {
            setUser(null);
            toast('Kamu telah keluar');
          }}
        >
          <Icon name="logout" />
          Keluar
        </button>
      </div>
    </>
  );
}
