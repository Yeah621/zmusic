-- Storage: bucket audio privat (batas ukuran dan tipe) dan policy folder per pengguna.
-- Penghapusan langsung dari storage.objects tidak diuji: Storage menolaknya (hapus lewat API Storage).
-- Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ani@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'budi@example.com');
insert into storage.objects (bucket_id, name) values ('audio', '22222222-2222-2222-2222-222222222222/tb.mp3');

select is((select public from storage.buckets where id = 'audio'), false, 'bucket audio privat');
select is((select file_size_limit from storage.buckets where id = 'audio'), 104857600::bigint, 'bucket audio dibatasi 100 MB');
select is(
  (select allowed_mime_types from storage.buckets where id = 'audio'),
  array['audio/mpeg', 'audio/aac', 'audio/mp4', 'audio/x-m4a'],
  'bucket audio hanya menerima MP3 dan AAC'
);

-- ===== tamu =====
set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('audio', 'x/anon.mp3')$$,
  '42501', null, 'tamu tidak bisa mengunggah'
);

-- ===== Ani =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$insert into storage.objects (bucket_id, name) values ('audio', '11111111-1111-1111-1111-111111111111/t1.mp3') returning name$$,
  array['11111111-1111-1111-1111-111111111111/t1.mp3'],
  'Ani mengunggah ke foldernya sendiri'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('audio', '22222222-2222-2222-2222-222222222222/curang.mp3')$$,
  '42501', null, 'Ani tidak bisa mengunggah ke folder Budi'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('audio', 'root.mp3')$$,
  '42501', null, 'unggahan tanpa folder pengguna ditolak'
);
select results_eq(
  $$select name from storage.objects where bucket_id = 'audio' and name in ('11111111-1111-1111-1111-111111111111/t1.mp3', '22222222-2222-2222-2222-222222222222/tb.mp3') order by name$$,
  array['11111111-1111-1111-1111-111111111111/t1.mp3'],
  'Ani hanya melihat berkasnya sendiri'
);
select is_empty(
  $$update storage.objects set metadata = '{}'::jsonb where bucket_id = 'audio' and name = '22222222-2222-2222-2222-222222222222/tb.mp3' returning name$$,
  'Ani tidak bisa mengubah berkas Budi'
);

-- ===== Budi =====
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select name from storage.objects where bucket_id = 'audio' and name in ('11111111-1111-1111-1111-111111111111/t1.mp3', '22222222-2222-2222-2222-222222222222/tb.mp3') order by name$$,
  array['22222222-2222-2222-2222-222222222222/tb.mp3'],
  'Budi hanya melihat berkasnya sendiri'
);

select * from finish();
rollback;
