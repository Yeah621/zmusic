-- RLS dan hak akses: comments, reports (admin), plays.
-- Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ani@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'budi@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com');
insert into public.admins (user_id) values ('33333333-3333-3333-3333-333333333333');
insert into public.artists (id, name, source, owner_id) values
  ('a0000000-0000-0000-0000-00000000000a', 'Ani', 'upload', '11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-00000000000b', 'Budi', 'upload', '22222222-2222-2222-2222-222222222222');
insert into public.tracks (id, source, owner_id, title, artist_id, duration_sec, audio_path, visibility) values
  ('c0000000-0000-0000-0000-000000000001', 'upload', '11111111-1111-1111-1111-111111111111', 'Lagu Ani Publik', 'a0000000-0000-0000-0000-00000000000a', 100, '11111111-1111-1111-1111-111111111111/t1.mp3', 'public'),
  ('c0000000-0000-0000-0000-000000000002', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Publik', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t2.mp3', 'public'),
  ('c0000000-0000-0000-0000-000000000003', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Pribadi', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t3.mp3', 'private');
insert into public.comments (id, track_id, user_id, at_sec, body) values
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 10, 'Intro mantap'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 5, 'Catatan pribadi');
insert into public.reports (id, track_id, reporter_id, reason) values
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'spam');

-- ===== tamu =====
set local role anon;
set local request.jwt.claim.sub = '';

select results_eq(
  $$select id from public.comments where id in ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002') order by id$$,
  array['e0000000-0000-0000-0000-000000000001'::uuid],
  'tamu hanya melihat komentar pada lagu yang terlihat'
);
select throws_ok(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, 'Halo')$$,
  '42501', null, 'tamu tidak bisa berkomentar'
);
select throws_ok($$select * from public.reports$$, '42501', null, 'tamu tidak bisa membaca laporan');
select throws_ok(
  $$insert into public.reports (track_id, reporter_id, reason) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'spam')$$,
  '42501', null, 'tamu tidak bisa melapor'
);
select lives_ok(
  $$insert into public.plays (track_id, listened_sec) values ('c0000000-0000-0000-0000-000000000002', 31)$$,
  'tamu mencatat putaran tanpa identitas'
);
select throws_ok(
  $$insert into public.plays (user_id, track_id, listened_sec) values ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002', 31)$$,
  '42501', null, 'tamu tidak bisa mencatat putaran atas nama pengguna'
);
select throws_ok(
  $$insert into public.plays (track_id, listened_sec) values ('c0000000-0000-0000-0000-000000000003', 31)$$,
  '42501', null, 'putaran lagu yang tidak terlihat ditolak'
);
select throws_ok($$select * from public.plays$$, '42501', null, 'tamu tidak bisa membaca plays');

-- ===== Ani =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select id from public.comments where id in ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002') order by id$$,
  array['e0000000-0000-0000-0000-000000000001'::uuid],
  'Ani hanya melihat komentar pada lagu yang terlihat'
);
select results_eq(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 12.5, 'Bagian ini mantap') returning body$$,
  array['Bagian ini mantap'],
  'Ani berkomentar atas nama sendiri'
);
select throws_ok(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 1, 'Palsu')$$,
  '42501', null, 'Ani tidak bisa berkomentar atas nama Budi'
);
select throws_ok(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 1, 'Mengintip')$$,
  '42501', null, 'Ani tidak bisa berkomentar pada lagu pribadi Budi'
);
select throws_ok(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, repeat('x', 61))$$,
  '23514', null, 'komentar maksimal 60 karakter'
);
select throws_ok(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 1, '   ')$$,
  '23514', null, 'komentar kosong ditolak'
);
select throws_ok(
  $$insert into public.comments (track_id, user_id, at_sec, body) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', -1, 'Waktu negatif')$$,
  '23514', null, 'titik waktu komentar tidak boleh negatif'
);
select is_empty(
  $$delete from public.comments where id = 'e0000000-0000-0000-0000-000000000001' returning id$$,
  'Ani tidak bisa menghapus komentar Budi'
);
select results_eq(
  $$delete from public.comments where user_id = '11111111-1111-1111-1111-111111111111' returning body$$,
  array['Bagian ini mantap'],
  'Ani menghapus komentarnya sendiri'
);

-- laporan
select lives_ok(
  $$insert into public.reports (track_id, reporter_id, reason, note) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'hak_cipta', 'Ini bukan karya pengunggah')$$,
  'Ani melaporkan lagu atas nama sendiri'
);
select throws_ok(
  $$insert into public.reports (track_id, reporter_id, reason) values ('c0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'spam')$$,
  '42501', null, 'Ani tidak bisa melapor atas nama Budi'
);
select throws_ok(
  $$insert into public.reports (track_id, reporter_id, reason, status) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'spam', 'selesai')$$,
  '42501', null, 'pelapor tidak bisa menentukan status laporannya'
);
select throws_ok(
  $$insert into public.reports (track_id, reporter_id, reason) values ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'bukan-alasan')$$,
  '23514', null, 'alasan laporan yang tidak dikenal ditolak'
);
select is_empty($$select id from public.reports$$, 'pengguna biasa tidak membaca laporan, termasuk miliknya sendiri');
select is_empty(
  $$update public.reports set status = 'selesai' returning id$$,
  'pengguna biasa tidak bisa mengubah status laporan'
);

-- plays
select lives_ok(
  $$insert into public.plays (user_id, track_id, listened_sec) values ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002', 45)$$,
  'Ani mencatat putarannya'
);
select throws_ok(
  $$insert into public.plays (user_id, track_id, listened_sec) values ('22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000002', 45)$$,
  '42501', null, 'Ani tidak bisa mencatat putaran atas nama Budi'
);
select results_eq(
  $$select listened_sec from public.plays where track_id = 'c0000000-0000-0000-0000-000000000002'$$,
  array[45],
  'Ani hanya membaca putarannya sendiri, bukan putaran tamu'
);
select throws_ok(
  $$insert into public.plays (track_id, listened_sec) values ('c0000000-0000-0000-0000-000000000002', -1)$$,
  '23514', null, 'durasi putaran negatif ditolak'
);

-- ===== Budi =====
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty($$select id from public.reports$$, 'pelapor tidak membaca laporan, termasuk laporannya sendiri');

-- ===== admin =====
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is(
  (select count(*)::int from public.reports where track_id in ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002')),
  2,
  'admin membaca semua laporan'
);
select results_eq(
  $$update public.reports set status = 'ditinjau' where id = 'f0000000-0000-0000-0000-000000000001' returning status$$,
  array['ditinjau'],
  'admin mengubah status laporan'
);
select throws_ok(
  $$update public.reports set status = 'beres' where id = 'f0000000-0000-0000-0000-000000000001' returning id$$,
  '23514', null, 'status laporan yang tidak dikenal ditolak'
);
select results_eq(
  $$delete from public.comments where id = 'e0000000-0000-0000-0000-000000000001' returning id$$,
  array['e0000000-0000-0000-0000-000000000001'::uuid],
  'admin menghapus komentar siapa pun'
);

-- ===== pemilik database: bukti data tersimpan =====
reset role;

select is(
  (select status from public.reports where reporter_id = '11111111-1111-1111-1111-111111111111'),
  'baru',
  'laporan baru selalu berstatus baru'
);
select is(
  (select count(*)::int from public.plays where user_id is null and track_id = 'c0000000-0000-0000-0000-000000000002'),
  1,
  'putaran tamu tersimpan tanpa identitas'
);

select * from finish();
rollback;
