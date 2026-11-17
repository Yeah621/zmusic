-- RLS dan hak akses: artists, albums, tracks (lagu publik/pribadi/disembunyikan, kolom yang boleh diubah pemilik, constraint).
-- Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ani@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'budi@example.com');
insert into public.artists (id, name, source, owner_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'Ani', 'upload', '11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-00000000000b', 'Budi', 'upload', '22222222-2222-2222-2222-222222222222');
insert into public.artists (id, name, source, source_id) values
  ('a0000000-0000-0000-0000-00000000000c', 'Zara Lune', 'jamendo', 'j-1');
insert into public.albums (id, title, artist_id, source, source_id) values
  ('b0000000-0000-0000-0000-000000000001', 'Neon Mint', 'a0000000-0000-0000-0000-00000000000c', 'jamendo', 'ja-1');
insert into public.tracks (id, source, owner_id, title, artist_id, duration_sec, audio_path, visibility, hidden) values
  ('c0000000-0000-0000-0000-000000000001', 'upload', '11111111-1111-1111-1111-111111111111', 'Lagu Ani Publik', 'a0000000-0000-0000-0000-00000000000a', 100, '11111111-1111-1111-1111-111111111111/t1.mp3', 'public', false),
  ('c0000000-0000-0000-0000-000000000002', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Publik', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t2.mp3', 'public', false),
  ('c0000000-0000-0000-0000-000000000003', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Pribadi', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t3.mp3', 'private', false),
  ('c0000000-0000-0000-0000-000000000004', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Disembunyikan', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t4.mp3', 'public', true),
  ('c0000000-0000-0000-0000-000000000006', 'upload', '11111111-1111-1111-1111-111111111111', 'Lagu Ani Pribadi', 'a0000000-0000-0000-0000-00000000000a', 100, '11111111-1111-1111-1111-111111111111/t6.mp3', 'private', false);
insert into public.tracks (id, source, source_id, title, artist_id, duration_sec, playable) values
  ('c0000000-0000-0000-0000-000000000005', 'deezer', 'd-1', 'Lagu Deezer', 'a0000000-0000-0000-0000-00000000000c', 200, 'preview');

-- ===== tamu =====
set local role anon;
set local request.jwt.claim.sub = '';

select is(
  (select count(*)::int from public.artists where id in ('a0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000c')),
  3,
  'tamu membaca artis'
);
select is(
  (select count(*)::int from public.albums where id = 'b0000000-0000-0000-0000-000000000001'),
  1,
  'tamu membaca album'
);
select throws_ok($$insert into public.artists (name, source, source_id) values ('X', 'jamendo', 'j-9')$$, '42501', null, 'tamu tidak bisa membuat artis');
select throws_ok($$update public.artists set name = 'Diretas'$$, '42501', null, 'tamu tidak bisa mengubah artis');
select throws_ok($$delete from public.albums$$, '42501', null, 'tamu tidak bisa menghapus album');
select results_eq(
  $$select id from public.tracks where id in ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006') order by id$$,
  array['c0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000005'::uuid],
  'tamu hanya melihat lagu publik yang tidak disembunyikan'
);
select throws_ok(
  $$insert into public.tracks (source, owner_id, title, artist_id, duration_sec, audio_path) values ('upload', '11111111-1111-1111-1111-111111111111', 'X', 'a0000000-0000-0000-0000-00000000000a', 10, '11111111-1111-1111-1111-111111111111/x.mp3')$$,
  '42501', null, 'tamu tidak bisa membuat lagu'
);
select throws_ok($$update public.tracks set title = 'Diretas'$$, '42501', null, 'tamu tidak bisa mengubah lagu');
select throws_ok($$delete from public.tracks$$, '42501', null, 'tamu tidak bisa menghapus lagu');

-- ===== Ani =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select id from public.tracks where id in ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006') order by id$$,
  array['c0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-000000000006'::uuid],
  'Ani melihat lagu publik dan lagu pribadinya sendiri'
);
select is_empty(
  $$select id from public.tracks where id in ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004')$$,
  'Ani tidak melihat lagu pribadi dan lagu yang disembunyikan milik Budi'
);
select throws_ok($$insert into public.artists (name, source, source_id) values ('X', 'jamendo', 'j-9')$$, '42501', null, 'pengguna tidak bisa membuat artis (hanya server)');
select throws_ok(
  $$insert into public.tracks (source, owner_id, title, artist_id, duration_sec, audio_path) values ('upload', '11111111-1111-1111-1111-111111111111', 'X', 'a0000000-0000-0000-0000-00000000000a', 10, '11111111-1111-1111-1111-111111111111/x.mp3')$$,
  '42501', null, 'pengguna tidak bisa membuat lagu (hanya server yang menerbitkan)'
);
select is_empty(
  $$update public.tracks set title = 'Diretas' where id = 'c0000000-0000-0000-0000-000000000002' returning id$$,
  'Ani tidak bisa mengubah lagu Budi'
);
select is_empty(
  $$delete from public.tracks where id = 'c0000000-0000-0000-0000-000000000002' returning id$$,
  'Ani tidak bisa menghapus lagu Budi'
);
select throws_ok($$update public.tracks set like_count = 999 where id = 'c0000000-0000-0000-0000-000000000001'$$, '42501', null, 'pemilik tidak bisa menulis like_count');
select throws_ok($$update public.tracks set hidden = true where id = 'c0000000-0000-0000-0000-000000000001'$$, '42501', null, 'pemilik tidak bisa menulis hidden (moderasi lewat server)');
select throws_ok($$update public.tracks set owner_id = '22222222-2222-2222-2222-222222222222' where id = 'c0000000-0000-0000-0000-000000000001'$$, '42501', null, 'pemilik tidak bisa memindahkan kepemilikan');
select throws_ok($$update public.tracks set audio_path = '22222222-2222-2222-2222-222222222222/t2.mp3' where id = 'c0000000-0000-0000-0000-000000000001'$$, '42501', null, 'pemilik tidak bisa mengganti jalur berkas');
select results_eq(
  $$update public.tracks set title = 'Judul Baru', visibility = 'private' where id = 'c0000000-0000-0000-0000-000000000001' returning title$$,
  array['Judul Baru'],
  'pemilik mengubah judul dan privasi lagunya'
);
select throws_ok(
  $$update public.tracks set visibility = 'rahasia' where id = 'c0000000-0000-0000-0000-000000000001' returning id$$,
  '23514', null, 'nilai privasi yang tidak dikenal ditolak'
);
select results_eq(
  $$delete from public.tracks where id = 'c0000000-0000-0000-0000-000000000006' returning id$$,
  array['c0000000-0000-0000-0000-000000000006'::uuid],
  'pemilik menghapus lagunya'
);

-- ===== Budi =====
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select results_eq(
  $$select id from public.tracks where id in ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006') order by id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000005'::uuid],
  'Budi melihat lagunya sendiri (termasuk pribadi dan disembunyikan) dan lagu publik, bukan lagu Ani yang kini pribadi'
);

-- ===== pemilik database: bukti baris utuh dan constraint =====
reset role;

select is(
  (select title from public.tracks where id = 'c0000000-0000-0000-0000-000000000002'),
  'Lagu Budi Publik',
  'lagu Budi utuh setelah percobaan ubah dan hapus oleh Ani'
);
select throws_ok(
  $$insert into public.tracks (source, source_id, title, artist_id, duration_sec, visibility) values ('deezer', 'd-2', 'X', 'a0000000-0000-0000-0000-00000000000c', 10, 'private')$$,
  '23514', null, 'lagu sumber luar tidak boleh pribadi'
);
select throws_ok(
  $$insert into public.tracks (source, source_id, title, artist_id, duration_sec) values ('deezer', 'd-1', 'Ganda', 'a0000000-0000-0000-0000-00000000000c', 10)$$,
  '23505', null, 'pasangan (source, source_id) unik'
);
select throws_ok(
  $$insert into public.tracks (source, title, artist_id, duration_sec) values ('upload', 'Tanpa pemilik', 'a0000000-0000-0000-0000-00000000000a', 10)$$,
  '23514', null, 'lagu unggahan wajib punya pemilik dan jalur berkas'
);
select throws_ok(
  $$insert into public.tracks (source, owner_id, title, artist_id, duration_sec, audio_path) values ('upload', '11111111-1111-1111-1111-111111111111', 'Jalur salah', 'a0000000-0000-0000-0000-00000000000a', 10, '22222222-2222-2222-2222-222222222222/curian.mp3')$$,
  '23514', null, 'jalur berkas harus di folder pemilik'
);
select throws_ok(
  $$insert into public.artists (name, source, owner_id) values ('Ani Kedua', 'upload', '11111111-1111-1111-1111-111111111111')$$,
  '23505', null, 'satu identitas artis unggahan per pengguna'
);
select throws_ok(
  $$insert into public.artists (name, source, source_id, owner_id) values ('Campuran', 'jamendo', 'j-9', '11111111-1111-1111-1111-111111111111')$$,
  '23514', null, 'artis sumber luar tidak boleh punya pemilik'
);

delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.tracks where owner_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'menghapus akun ikut menghapus lagunya'
);
select is(
  (select count(*)::int from public.artists where owner_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'menghapus akun ikut menghapus identitas artisnya'
);

select * from finish();
rollback;
