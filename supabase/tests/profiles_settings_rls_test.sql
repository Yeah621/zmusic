-- RLS dan hak akses: profiles, settings, admins, dan private.is_admin().
-- Jalankan: supabase test db   (butuh `supabase start`; lihat docs/supabase.md)
-- Sebagai pemilik database kita menyiapkan data (melewati RLS), lalu meniru tamu (anon) dan pengguna (authenticated)
-- dengan `set local role` + `set local request.jwt.claim.sub`, persis seperti permintaan lewat Data API.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ani@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'budi@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com');
insert into public.admins (user_id) values ('33333333-3333-3333-3333-333333333333');
update public.profiles set is_public = false where id = '22222222-2222-2222-2222-222222222222';

-- trigger on_auth_user_created
select is(
  (select count(*)::int from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')),
  3,
  'trigger membuat profil untuk tiap pengguna baru'
);
select is(
  (select count(*)::int from public.settings where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')),
  3,
  'trigger membuat pengaturan bawaan untuk tiap pengguna baru'
);
select is(
  (select handle from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'user11111111111111111111',
  'handle bawaan diturunkan dari id'
);
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'ani',
  'nama tampilan bawaan dari bagian email sebelum @'
);

-- hak akses tingkat tabel
select ok(
  not has_table_privilege('anon', 'public.settings', 'select,insert,update,delete'),
  'tamu tidak punya hak apa pun di settings'
);
select ok(
  not has_table_privilege('authenticated', 'public.admins', 'select,insert,update,delete'),
  'pengguna tidak punya hak apa pun di admins'
);

-- ===== tamu =====
set local role anon;
set local request.jwt.claim.sub = '';

select results_eq(
  $$select id from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') order by id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333333'::uuid],
  'tamu hanya melihat profil publik'
);
select throws_ok($$select * from public.settings$$, '42501', null, 'tamu tidak bisa membaca settings');
select throws_ok($$update public.profiles set display_name = 'Diretas'$$, '42501', null, 'tamu tidak bisa mengubah profil');
select throws_ok($$select * from public.admins$$, '42501', null, 'tamu tidak bisa membaca admins');
select throws_ok($$select private.is_admin()$$, '42501', null, 'tamu tidak bisa memanggil fungsi di skema private');

-- ===== Ani (pengguna biasa) =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select id from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333') order by id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333333'::uuid],
  'Ani melihat profilnya dan profil publik, bukan profil pribadi Budi'
);
select results_eq(
  $$update public.profiles set display_name = 'Ani Baru' where id = '11111111-1111-1111-1111-111111111111' returning display_name$$,
  array['Ani Baru'],
  'Ani mengubah profilnya sendiri'
);
select is_empty(
  $$update public.profiles set display_name = 'Diretas' where id = '22222222-2222-2222-2222-222222222222' returning id$$,
  'Ani tidak bisa mengubah profil pribadi Budi'
);
select is_empty(
  $$update public.profiles set display_name = 'Diretas' where id = '33333333-3333-3333-3333-333333333333' returning id$$,
  'Ani tidak bisa mengubah profil publik orang lain'
);
select throws_ok(
  $$update public.profiles set id = '22222222-2222-2222-2222-222222222222' where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'Ani tidak bisa mengganti id profil (tanpa hak kolom)'
);
select throws_ok(
  $$insert into public.profiles (id, handle, display_name) values ('22222222-2222-2222-2222-222222222222', 'palsu', 'Palsu')$$,
  '42501', null, 'pengguna tidak bisa membuat profil (hanya trigger)'
);
select throws_ok($$delete from public.profiles$$, '42501', null, 'pengguna tidak bisa menghapus profil');
select results_eq(
  $$update public.profiles set handle = 'Ani.Music' where id = '11111111-1111-1111-1111-111111111111' returning handle$$,
  array['Ani.Music'],
  'Ani mengganti handle-nya'
);
select throws_ok(
  $$update public.profiles set handle = 'x' where id = '11111111-1111-1111-1111-111111111111' returning id$$,
  '23514', null, 'handle yang tidak valid ditolak'
);
select results_eq(
  $$select user_id from public.settings where user_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'Ani hanya melihat pengaturannya sendiri'
);
select results_eq(
  $$update public.settings set quality = 2 where user_id = '11111111-1111-1111-1111-111111111111' returning quality$$,
  array[2::smallint],
  'Ani mengubah pengaturannya sendiri'
);
select is_empty(
  $$update public.settings set quality = 0 where user_id = '22222222-2222-2222-2222-222222222222' returning user_id$$,
  'Ani tidak bisa mengubah pengaturan Budi'
);
select throws_ok(
  $$insert into public.settings (user_id) values ('22222222-2222-2222-2222-222222222222')$$,
  '42501', null, 'Ani tidak bisa membuat pengaturan atas nama Budi'
);
select throws_ok(
  $$update public.settings set theme = 'neon' where user_id = '11111111-1111-1111-1111-111111111111' returning user_id$$,
  '23514', null, 'tema yang tidak dikenal ditolak'
);
select throws_ok($$select * from public.admins$$, '42501', null, 'pengguna biasa tidak bisa membaca admins');
select is((select private.is_admin()), false, 'pengguna biasa bukan admin');

-- ===== Budi =====
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select results_eq(
  $$select id from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  array['22222222-2222-2222-2222-222222222222'::uuid],
  'Budi tetap melihat profil pribadinya sendiri'
);
select throws_ok(
  $$update public.profiles set handle = 'ani.music' where id = '22222222-2222-2222-2222-222222222222' returning id$$,
  '23505', null, 'handle unik tanpa membedakan huruf besar dan kecil'
);

-- ===== admin =====
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select is((select private.is_admin()), true, 'admin dikenali dari tabel admins');

select * from finish();
rollback;
