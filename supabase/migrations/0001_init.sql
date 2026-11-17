-- ZMusic 0001_init (P3-01): skema, RLS, trigger, dan bucket audio.
-- Aturan akses mengikuti PRD (bagian Arsitektur dan data model); penyimpangan dan tambahan dijelaskan di docs/supabase.md.
--
-- Prinsip (sesuai panduan RLS resmi Supabase, Nov 2026):
--  * Hak (grant) dan RLS satu migrasi, per tabel: enable RLS -> revoke all -> grant seperlunya -> satu policy per operasi.
--    Proyek Supabase baru tidak lagi memberi hak otomatis ke anon/authenticated/service_role, jadi grant eksplisit wajib;
--    pada proyek lama revoke mencabut hak bawaan. Tanpa grant, permintaan gagal dengan 42501 sebelum policy dijalankan.
--  * Setiap policy memakai `to <peran>` dan `(select auth.uid())`; tidak ada `for all`.
--  * Klien (anon/authenticated) tidak menulis artists, albums, dan tracks baru: server (service_role) menerbitkan lagu setelah
--    validasi. Pemilik hanya boleh mengubah kolom tertentu lagunya (grant per kolom) dan menghapusnya. Moderasi (sembunyikan
--    lagu) juga lewat server setelah memeriksa tabel admins.
--  * Fungsi security definer ada di skema `private` (tidak terpapar Data API) dengan search_path kosong.

create schema if not exists private;
grant usage on schema private to authenticated;

-- =====================================================================================================================
-- Tabel
-- =====================================================================================================================

-- Admin moderasi. Tanpa policy: tidak terbaca dan tidak bisa diubah klien. Diangkat lewat SQL editor atau service_role.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null check (handle ~ '^[A-Za-z0-9_.]{3,24}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 30),
  avatar_hue smallint not null default 165 check (avatar_hue between 0 and 359),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index profiles_handle_key on public.profiles (lower(handle));

-- Pengaturan pemutaran dan tampilan. `crossfade` dalam detik (0 = mati); UI saat ini hanya on/off = 0 atau 4.
-- Pengaturan "Profil publik" (pp) ada di profiles.is_public, bukan di sini.
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  crossfade smallint not null default 4 check (crossfade between 0 and 12),
  normalize boolean not null default true,
  autoplay boolean not null default true,
  notifications boolean not null default true,
  data_saver boolean not null default false,
  show_activity boolean not null default true,
  quality smallint not null default 1 check (quality between 0 and 2),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark'))
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  source text not null check (source in ('upload', 'audius', 'jamendo', 'deezer')),
  source_id text,
  owner_id uuid references auth.users (id) on delete cascade,
  verified boolean not null default false,
  hue smallint not null default 165 check (hue between 0 and 359),
  created_at timestamptz not null default now(),
  constraint artists_source_key unique (source, source_id),
  constraint artists_origin_ck check (
    (source = 'upload' and owner_id is not null and source_id is null)
    or (source <> 'upload' and owner_id is null and source_id is not null)
  )
);
-- satu identitas artis per pengguna untuk lagu unggahan
create unique index artists_owner_key on public.artists (owner_id) where source = 'upload';

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  artist_id uuid not null references public.artists (id) on delete cascade,
  year smallint check (year between 1900 and 2100),
  hue smallint not null default 165 check (hue between 0 and 359),
  source text not null check (source in ('upload', 'audius', 'jamendo', 'deezer')),
  source_id text,
  created_at timestamptz not null default now(),
  constraint albums_source_key unique (source, source_id)
);
create index albums_artist_idx on public.albums (artist_id);

-- Lagu unggahan (source = upload, ada pemilik dan berkas di Storage) dan salinan metadata lagu sumber luar
-- (owner_id kosong, selalu publik, tidak ada berkas; diisi server saat lagu disukai atau masuk playlist).
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('upload', 'audius', 'jamendo', 'deezer')),
  source_id text,
  owner_id uuid references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (char_length(description) <= 300),
  artist_id uuid not null references public.artists (id) on delete cascade,
  album_id uuid references public.albums (id) on delete set null,
  genre text check (char_length(genre) <= 40),
  duration_sec integer not null check (duration_sec > 0),
  hue smallint not null default 165 check (hue between 0 and 359),
  artwork_url text,
  audio_path text,
  waveform jsonb,
  license text,
  source_url text,
  playable text not null default 'full' check (playable in ('full', 'preview')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  hidden boolean not null default false,
  play_count integer not null default 0 check (play_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  constraint tracks_source_key unique (source, source_id),
  constraint tracks_origin_ck check (
    (source = 'upload' and owner_id is not null and source_id is null and audio_path is not null and audio_path like (owner_id::text || '/%'))
    or (source <> 'upload' and owner_id is null and source_id is not null and audio_path is null)
  ),
  constraint tracks_external_public_ck check (source = 'upload' or visibility = 'public')
);
create index tracks_owner_idx on public.tracks (owner_id) where owner_id is not null;
create index tracks_artist_idx on public.tracks (artist_id);
create index tracks_album_idx on public.tracks (album_id) where album_id is not null;
create index tracks_created_idx on public.tracks (created_at desc);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  hue smallint not null default 165 check (hue between 0 and 359),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index playlists_user_idx on public.playlists (user_id);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);
create index playlist_tracks_order_idx on public.playlist_tracks (playlist_id, position);
create index playlist_tracks_track_idx on public.playlist_tracks (track_id);

create table public.likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index likes_track_idx on public.likes (track_id);

create table public.follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
create index follows_artist_idx on public.follows (artist_id);

-- Riwayat putar (tambahan di luar daftar tabel PRD): satu baris per lagu, played_at diperbarui saat diputar lagi,
-- jadi lagu yang sama tidak muncul dua kali. `plays` khusus putaran yang dihitung (30 detik).
create table public.history (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  played_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index history_track_idx on public.history (track_id);

create table public.search_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null check (char_length(btrim(query)) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, query)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at_sec double precision not null check (at_sec >= 0),
  body text not null check (char_length(btrim(body)) between 1 and 60),
  created_at timestamptz not null default now()
);
create index comments_track_idx on public.comments (track_id, at_sec);
create index comments_user_idx on public.comments (user_id);

-- Putaran yang dihitung (setelah 30 detik didengar). user_id kosong untuk tamu atau pengguna yang tidak mau dicatat.
-- Penghitung play_count dan penghapusan duplikat per sesi dikerjakan di P4-05.
create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  track_id uuid not null references public.tracks (id) on delete cascade,
  listened_sec integer not null check (listened_sec >= 0),
  created_at timestamptz not null default now()
);
create index plays_track_idx on public.plays (track_id);
create index plays_user_idx on public.plays (user_id) where user_id is not null;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (reason in ('hak_cipta', 'tidak_pantas', 'spam', 'lainnya')),
  note text check (char_length(note) <= 500),
  status text not null default 'baru' check (status in ('baru', 'ditinjau', 'selesai')),
  created_at timestamptz not null default now()
);
create index reports_track_idx on public.reports (track_id);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id) where reporter_id is not null;

-- =====================================================================================================================
-- Fungsi dan trigger (skema private; security definer; search_path kosong)
-- =====================================================================================================================

-- Apakah pengguna yang sedang masuk adalah admin. Dipakai policy comments dan reports.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Pengguna baru: buat profil dan pengaturan bawaan. Handle bawaan diturunkan dari id (selalu unik dan valid); pengguna
-- bisa menggantinya. Nama tampilan: display_name atau name dari metadata, atau bagian email sebelum @.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  )), 30);
  if char_length(v_name) < 2 then
    v_name := 'Pengguna';
  end if;
  insert into public.profiles (id, handle, display_name)
  values (new.id, 'user' || substr(replace(new.id::text, '-', ''), 1, 20), v_name);
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Jumlah suka dijaga trigger, bukan klien (kolom like_count tidak bisa ditulis klien).
create function private.bump_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.tracks set like_count = like_count + 1 where id = new.track_id;
  elsif tg_op = 'DELETE' then
    update public.tracks set like_count = greatest(like_count - 1, 0) where id = old.track_id;
  end if;
  return null;
end;
$$;
revoke all on function private.bump_like_count() from public;

create trigger likes_count
  after insert or delete on public.likes
  for each row execute function private.bump_like_count();

-- =====================================================================================================================
-- RLS, hak akses, dan policy per tabel
-- =====================================================================================================================

-- admins: tanpa policy dan tanpa hak untuk klien
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
grant all on table public.admins to service_role;

-- profiles: profil publik terbaca semua, profil sendiri selalu terbaca; hanya pemilik yang mengubah kolom tertentu.
-- Baris dibuat trigger handle_new_user dan dihapus bersama akun (cascade), jadi klien tidak punya insert/delete.
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (handle, display_name, avatar_hue, is_public) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated
  using (is_public);
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- settings: hanya pemilik
alter table public.settings enable row level security;
revoke all on table public.settings from anon, authenticated;
grant select, insert, update on table public.settings to authenticated;
grant all on table public.settings to service_role;

create policy "settings_select_own" on public.settings
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "settings_insert_own" on public.settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "settings_update_own" on public.settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- artists dan albums: terbaca semua (hanya nama dan metadata); ditulis server (service_role) saat lagu diterbitkan/disalin
alter table public.artists enable row level security;
revoke all on table public.artists from anon, authenticated;
grant select on table public.artists to anon, authenticated;
grant all on table public.artists to service_role;
create policy "artists_select_all" on public.artists
  for select to anon, authenticated
  using (true);

alter table public.albums enable row level security;
revoke all on table public.albums from anon, authenticated;
grant select on table public.albums to anon, authenticated;
grant all on table public.albums to service_role;
create policy "albums_select_all" on public.albums
  for select to anon, authenticated
  using (true);

-- tracks: lagu publik (tidak disembunyikan) terbaca semua; lagu pribadi hanya pemilik. Klien tidak punya insert; pemilik
-- mengubah hanya judul, deskripsi, genre, warna, dan privasi lagu unggahannya, dan boleh menghapusnya.
alter table public.tracks enable row level security;
revoke all on table public.tracks from anon, authenticated;
grant select on table public.tracks to anon, authenticated;
grant update (title, description, genre, hue, visibility) on table public.tracks to authenticated;
grant delete on table public.tracks to authenticated;
grant all on table public.tracks to service_role;

create policy "tracks_select_public" on public.tracks
  for select to anon, authenticated
  using (visibility = 'public' and not hidden);
create policy "tracks_select_own" on public.tracks
  for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "tracks_update_own" on public.tracks
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "tracks_delete_own" on public.tracks
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- playlists: milik sendiri, atau publik terbaca semua
alter table public.playlists enable row level security;
revoke all on table public.playlists from anon, authenticated;
grant select on table public.playlists to anon, authenticated;
grant insert (user_id, name, hue, is_public) on table public.playlists to authenticated;
grant update (name, hue, is_public) on table public.playlists to authenticated;
grant delete on table public.playlists to authenticated;
grant all on table public.playlists to service_role;

create policy "playlists_select_public" on public.playlists
  for select to anon, authenticated
  using (is_public);
create policy "playlists_select_own" on public.playlists
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "playlists_insert_own" on public.playlists
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "playlists_update_own" on public.playlists
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "playlists_delete_own" on public.playlists
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- playlist_tracks: terbaca bila playlist-nya terbaca (subquery tunduk pada RLS playlists); ditulis hanya pemilik playlist,
-- dan lagu yang ditambahkan harus terlihat oleh pemilik
alter table public.playlist_tracks enable row level security;
revoke all on table public.playlist_tracks from anon, authenticated;
grant select on table public.playlist_tracks to anon, authenticated;
grant insert (playlist_id, track_id, position) on table public.playlist_tracks to authenticated;
grant update (position) on table public.playlist_tracks to authenticated;
grant delete on table public.playlist_tracks to authenticated;
grant all on table public.playlist_tracks to service_role;

create policy "playlist_tracks_select" on public.playlist_tracks
  for select to anon, authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_tracks.playlist_id));
create policy "playlist_tracks_insert_own" on public.playlist_tracks
  for insert to authenticated
  with check (
    exists (select 1 from public.playlists p where p.id = playlist_tracks.playlist_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.tracks t where t.id = playlist_tracks.track_id)
  );
create policy "playlist_tracks_update_own" on public.playlist_tracks
  for update to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_tracks.playlist_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.playlists p where p.id = playlist_tracks.playlist_id and p.user_id = (select auth.uid())));
create policy "playlist_tracks_delete_own" on public.playlist_tracks
  for delete to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_tracks.playlist_id and p.user_id = (select auth.uid())));

-- likes: hanya pemilik; hanya lagu yang terlihat yang bisa disukai
alter table public.likes enable row level security;
revoke all on table public.likes from anon, authenticated;
grant select, delete on table public.likes to authenticated;
grant insert (user_id, track_id) on table public.likes to authenticated;
grant all on table public.likes to service_role;

create policy "likes_select_own" on public.likes
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "likes_insert_own" on public.likes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tracks t where t.id = likes.track_id)
  );
create policy "likes_delete_own" on public.likes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- follows: hanya pemilik
alter table public.follows enable row level security;
revoke all on table public.follows from anon, authenticated;
grant select, delete on table public.follows to authenticated;
grant insert (user_id, artist_id) on table public.follows to authenticated;
grant all on table public.follows to service_role;

create policy "follows_select_own" on public.follows
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "follows_insert_own" on public.follows
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "follows_delete_own" on public.follows
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- history: hanya pemilik; upsert (insert + update played_at) dan hapus semua
alter table public.history enable row level security;
revoke all on table public.history from anon, authenticated;
grant select, delete on table public.history to authenticated;
grant insert (user_id, track_id, played_at) on table public.history to authenticated;
grant update (played_at) on table public.history to authenticated;
grant all on table public.history to service_role;

create policy "history_select_own" on public.history
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "history_insert_own" on public.history
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tracks t where t.id = history.track_id)
  );
create policy "history_update_own" on public.history
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "history_delete_own" on public.history
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- search_history: hanya pemilik; upsert dan hapus satu atau semua
alter table public.search_history enable row level security;
revoke all on table public.search_history from anon, authenticated;
grant select, delete on table public.search_history to authenticated;
grant insert (user_id, query, created_at) on table public.search_history to authenticated;
grant update (created_at) on table public.search_history to authenticated;
grant all on table public.search_history to service_role;

create policy "search_history_select_own" on public.search_history
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "search_history_insert_own" on public.search_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "search_history_update_own" on public.search_history
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "search_history_delete_own" on public.search_history
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- comments: terbaca semua pada lagu yang terlihat; ditulis pengguna masuk atas nama sendiri; dihapus penulis atau admin
alter table public.comments enable row level security;
revoke all on table public.comments from anon, authenticated;
grant select on table public.comments to anon, authenticated;
grant insert (track_id, user_id, at_sec, body) on table public.comments to authenticated;
grant delete on table public.comments to authenticated;
grant all on table public.comments to service_role;

create policy "comments_select_visible" on public.comments
  for select to anon, authenticated
  using (exists (select 1 from public.tracks t where t.id = comments.track_id));
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.tracks t where t.id = comments.track_id)
  );
create policy "comments_delete_own" on public.comments
  for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "comments_delete_admin" on public.comments
  for delete to authenticated
  using ((select private.is_admin()));

-- plays: tamu dan pengguna boleh mencatat putaran (user_id kosong atau milik sendiri); hanya pemilik yang membaca miliknya
alter table public.plays enable row level security;
revoke all on table public.plays from anon, authenticated;
grant insert (user_id, track_id, listened_sec) on table public.plays to anon, authenticated;
grant select on table public.plays to authenticated;
grant all on table public.plays to service_role;

create policy "plays_insert_guest" on public.plays
  for insert to anon
  with check (user_id is null and exists (select 1 from public.tracks t where t.id = plays.track_id));
create policy "plays_insert_user" on public.plays
  for insert to authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and exists (select 1 from public.tracks t where t.id = plays.track_id)
  );
create policy "plays_select_own" on public.plays
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- reports: pengguna masuk melapor atas nama sendiri (status selalu 'baru'); hanya admin yang membaca dan mengubah status
alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;
grant select on table public.reports to authenticated;
grant insert (track_id, reporter_id, reason, note) on table public.reports to authenticated;
grant update (status) on table public.reports to authenticated;
grant all on table public.reports to service_role;

create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and exists (select 1 from public.tracks t where t.id = reports.track_id)
  );
create policy "reports_select_admin" on public.reports
  for select to authenticated
  using ((select private.is_admin()));
create policy "reports_update_admin" on public.reports
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- =====================================================================================================================
-- Storage: bucket audio privat, jalur {user_id}/{track_id}.{ext}
-- =====================================================================================================================

-- Batas 100 MB dan tipe MP3/AAC dipaksa Storage di tingkat bucket, jadi unggahan langsung dengan kunci anon pun ditolak.
-- (Tipe konten adalah klaim klien, bukan bukti; server tetap memeriksa saat menerbitkan lagu.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 104857600, array['audio/mpeg', 'audio/aac', 'audio/mp4', 'audio/x-m4a'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Hanya pemilik yang mengakses folder miliknya. Pemutaran lagu orang lain lewat signed URL berumur pendek dari server
-- (signed URL tidak melewati policy ini, jadi server yang memutuskan siapa boleh).
create policy "audio_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "audio_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "audio_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "audio_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
