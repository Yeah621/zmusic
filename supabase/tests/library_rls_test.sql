-- RLS dan hak akses: playlists, playlist_tracks, likes (dan trigger like_count), follows, history, search_history.
-- Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ani@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'budi@example.com');
insert into public.artists (id, name, source, owner_id) values
  ('a0000000-0000-0000-0000-00000000000b', 'Budi', 'upload', '22222222-2222-2222-2222-222222222222');
insert into public.artists (id, name, source, source_id) values
  ('a0000000-0000-0000-0000-00000000000c', 'Zara Lune', 'jamendo', 'j-1');
insert into public.tracks (id, source, owner_id, title, artist_id, duration_sec, audio_path, visibility) values
  ('c0000000-0000-0000-0000-000000000002', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Publik', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t2.mp3', 'public'),
  ('c0000000-0000-0000-0000-000000000003', 'upload', '22222222-2222-2222-2222-222222222222', 'Lagu Budi Pribadi', 'a0000000-0000-0000-0000-00000000000b', 100, '22222222-2222-2222-2222-222222222222/t3.mp3', 'private');
insert into public.tracks (id, source, source_id, title, artist_id, duration_sec, playable) values
  ('c0000000-0000-0000-0000-000000000005', 'deezer', 'd-1', 'Lagu Deezer', 'a0000000-0000-0000-0000-00000000000c', 200, 'preview');
insert into public.playlists (id, user_id, name, is_public) values
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Playlist Ani', false),
  ('d0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Playlist Pribadi Budi', false),
  ('d0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Playlist Publik Budi', true);
insert into public.playlist_tracks (playlist_id, track_id, position) values
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 0),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 0);
insert into public.likes (user_id, track_id) values ('22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000005');
insert into public.follows (user_id, artist_id) values ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000c');
insert into public.history (user_id, track_id) values ('22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000002');
insert into public.search_history (user_id, query) values ('22222222-2222-2222-2222-222222222222', 'rahasia budi');

-- ===== tamu =====
set local role anon;
set local request.jwt.claim.sub = '';

select results_eq(
  $$select id from public.playlists where id in ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003') order by id$$,
  array['d0000000-0000-0000-0000-000000000003'::uuid],
  'tamu hanya melihat playlist publik'
);
select results_eq(
  $$select playlist_id from public.playlist_tracks where playlist_id in ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003')$$,
  array['d0000000-0000-0000-0000-000000000003'::uuid],
  'tamu hanya melihat isi playlist publik'
);
select throws_ok($$select * from public.likes$$, '42501', null, 'tamu tidak bisa membaca likes');
select throws_ok($$select * from public.follows$$, '42501', null, 'tamu tidak bisa membaca follows');
select throws_ok($$select * from public.history$$, '42501', null, 'tamu tidak bisa membaca history');
select throws_ok($$select * from public.search_history$$, '42501', null, 'tamu tidak bisa membaca search_history');
select throws_ok($$insert into public.playlists (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Palsu')$$, '42501', null, 'tamu tidak bisa membuat playlist');

-- ===== Ani =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select id from public.playlists where id in ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003') order by id$$,
  array['d0000000-0000-0000-0000-000000000001'::uuid, 'd0000000-0000-0000-0000-000000000003'::uuid],
  'Ani melihat playlistnya dan playlist publik Budi'
);
select is_empty(
  $$select id from public.playlists where id = 'd0000000-0000-0000-0000-000000000002'$$,
  'Ani tidak melihat playlist pribadi Budi'
);
select results_eq(
  $$select playlist_id from public.playlist_tracks where playlist_id in ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003')$$,
  array['d0000000-0000-0000-0000-000000000003'::uuid],
  'Ani melihat isi playlist publik, bukan isi playlist pribadi Budi'
);
select is_empty(
  $$update public.playlists set name = 'Diretas' where id = 'd0000000-0000-0000-0000-000000000003' returning id$$,
  'Ani tidak bisa mengubah playlist publik Budi'
);
select is_empty(
  $$delete from public.playlists where id = 'd0000000-0000-0000-0000-000000000003' returning id$$,
  'Ani tidak bisa menghapus playlist publik Budi'
);
select throws_ok(
  $$insert into public.playlists (user_id, name) values ('22222222-2222-2222-2222-222222222222', 'Palsu')$$,
  '42501', null, 'Ani tidak bisa membuat playlist atas nama Budi'
);
select results_eq(
  $$insert into public.playlists (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Favorit') returning name$$,
  array['Favorit'],
  'Ani membuat playlist'
);
select throws_ok(
  $$insert into public.playlists (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'x')$$,
  '23514', null, 'nama playlist minimal 2 karakter'
);
select throws_ok(
  $$insert into public.playlist_tracks (playlist_id, track_id, position) values ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 5)$$,
  '42501', null, 'Ani tidak bisa menambah lagu ke playlist Budi'
);
select results_eq(
  $$insert into public.playlist_tracks (playlist_id, track_id, position) values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 0) returning position$$,
  array[0],
  'Ani menambah lagu yang terlihat ke playlistnya'
);
select throws_ok(
  $$insert into public.playlist_tracks (playlist_id, track_id, position) values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 1)$$,
  '42501', null, 'Ani tidak bisa menambah lagu pribadi Budi (tidak terlihat) ke playlistnya'
);
select results_eq(
  $$update public.playlist_tracks set position = 3 where playlist_id = 'd0000000-0000-0000-0000-000000000001' and track_id = 'c0000000-0000-0000-0000-000000000002' returning position$$,
  array[3],
  'Ani mengurutkan ulang lagu di playlistnya'
);
select is_empty(
  $$update public.playlist_tracks set position = 9 where playlist_id = 'd0000000-0000-0000-0000-000000000003' returning track_id$$,
  'Ani tidak bisa mengurutkan ulang playlist Budi'
);
select is_empty(
  $$delete from public.playlist_tracks where playlist_id = 'd0000000-0000-0000-0000-000000000003' returning track_id$$,
  'Ani tidak bisa menghapus lagu dari playlist Budi'
);
select results_eq(
  $$delete from public.playlist_tracks where playlist_id = 'd0000000-0000-0000-0000-000000000001' returning track_id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid],
  'Ani menghapus lagu dari playlistnya'
);

-- likes
select is_empty(
  $$select track_id from public.likes where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Ani tidak membaca likes Budi'
);
select results_eq(
  $$insert into public.likes (user_id, track_id) values ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002') returning track_id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid],
  'Ani menyukai lagu yang terlihat'
);
select throws_ok(
  $$insert into public.likes (user_id, track_id) values ('22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000005')$$,
  '42501', null, 'Ani tidak bisa menyukai atas nama Budi'
);
select throws_ok(
  $$insert into public.likes (user_id, track_id) values ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'Ani tidak bisa menyukai lagu yang tidak terlihat'
);
select is_empty(
  $$delete from public.likes where user_id = '22222222-2222-2222-2222-222222222222' returning track_id$$,
  'Ani tidak bisa membatalkan suka Budi'
);

reset role;
select is((select like_count from public.tracks where id = 'c0000000-0000-0000-0000-000000000002'), 1, 'trigger menaikkan like_count saat disukai');
select is((select like_count from public.tracks where id = 'c0000000-0000-0000-0000-000000000005'), 1, 'like_count juga menghitung suka dari pengguna lain');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$delete from public.likes where user_id = '11111111-1111-1111-1111-111111111111' and track_id = 'c0000000-0000-0000-0000-000000000002' returning track_id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid],
  'Ani membatalkan sukanya'
);
reset role;
select is((select like_count from public.tracks where id = 'c0000000-0000-0000-0000-000000000002'), 0, 'trigger menurunkan like_count saat suka dibatalkan');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- follows
select results_eq(
  $$insert into public.follows (user_id, artist_id) values ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000c') returning artist_id$$,
  array['a0000000-0000-0000-0000-00000000000c'::uuid],
  'Ani mengikuti artis'
);
select throws_ok(
  $$insert into public.follows (user_id, artist_id) values ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'Ani tidak bisa mengikuti atas nama Budi'
);
select is_empty(
  $$select artist_id from public.follows where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Ani tidak membaca follows Budi'
);
select results_eq(
  $$delete from public.follows where user_id = '11111111-1111-1111-1111-111111111111' returning artist_id$$,
  array['a0000000-0000-0000-0000-00000000000c'::uuid],
  'Ani berhenti mengikuti'
);

-- history (upsert)
select results_eq(
  $$insert into public.history (user_id, track_id) values ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002') on conflict (user_id, track_id) do update set played_at = now() returning track_id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid],
  'Ani mencatat riwayat putar'
);
select results_eq(
  $$insert into public.history (user_id, track_id) values ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002') on conflict (user_id, track_id) do update set played_at = now() returning track_id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid],
  'memutar lagu yang sama lagi memperbarui baris riwayat (upsert)'
);
select is(
  (select count(*)::int from public.history where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'lagu yang sama tidak muncul dua kali di riwayat'
);
select is_empty(
  $$select track_id from public.history where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Ani tidak membaca riwayat Budi'
);
select throws_ok(
  $$insert into public.history (user_id, track_id) values ('22222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000005')$$,
  '42501', null, 'Ani tidak bisa menulis riwayat atas nama Budi'
);
select results_eq(
  $$delete from public.history where user_id = '11111111-1111-1111-1111-111111111111' returning track_id$$,
  array['c0000000-0000-0000-0000-000000000002'::uuid],
  'Ani menghapus riwayatnya'
);

-- search_history (upsert)
select results_eq(
  $$insert into public.search_history (user_id, query) values ('11111111-1111-1111-1111-111111111111', 'lo-fi') on conflict (user_id, query) do update set created_at = now() returning query$$,
  array['lo-fi'],
  'Ani menyimpan riwayat cari'
);
select results_eq(
  $$insert into public.search_history (user_id, query) values ('11111111-1111-1111-1111-111111111111', 'lo-fi') on conflict (user_id, query) do update set created_at = now() returning query$$,
  array['lo-fi'],
  'mencari kata yang sama lagi memperbarui baris riwayat (upsert)'
);
select is_empty(
  $$select query from public.search_history where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'Ani tidak membaca riwayat cari Budi'
);
select throws_ok(
  $$insert into public.search_history (user_id, query) values ('22222222-2222-2222-2222-222222222222', 'curang')$$,
  '42501', null, 'Ani tidak bisa menulis riwayat cari atas nama Budi'
);
select results_eq(
  $$delete from public.search_history where user_id = '11111111-1111-1111-1111-111111111111' returning query$$,
  array['lo-fi'],
  'Ani menghapus riwayat carinya'
);

-- ===== bukti data Budi utuh =====
reset role;
select is(
  (select (select count(*) from public.playlists where user_id = '22222222-2222-2222-2222-222222222222')
        + (select count(*) from public.likes where user_id = '22222222-2222-2222-2222-222222222222')
        + (select count(*) from public.follows where user_id = '22222222-2222-2222-2222-222222222222')
        + (select count(*) from public.history where user_id = '22222222-2222-2222-2222-222222222222')
        + (select count(*) from public.search_history where user_id = '22222222-2222-2222-2222-222222222222'))::int,
  6,
  'semua data Budi utuh setelah semua percobaan Ani'
);

select * from finish();
rollback;
