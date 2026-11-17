import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Uji statis atas migrasi dan uji pgTAP. Tidak menjalankan SQL (itu tugas `supabase test db`); ini menjaga bentuk skema dari
// regresi yang mudah luput: tabel tanpa RLS, grant berlebihan, policy tanpa `to`, auth.uid() tanpa (select ...), dsb.
const MIGRATION = 'supabase/migrations/0001_init.sql';
const TESTS = 'supabase/tests';
const TABLES = ['admins', 'profiles', 'settings', 'artists', 'albums', 'tracks', 'playlists', 'playlist_tracks', 'likes', 'follows', 'history', 'search_history', 'comments', 'plays', 'reports'];

const raw = readFileSync(MIGRATION, 'utf8');
const sql = raw.replace(/--[^\n]*/g, '');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Pecah per pernyataan; titik koma di dalam badan fungsi ($$ ... $$) tidak memecah. */
function statements(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let dollar = false;
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('$$', i)) {
      dollar = !dollar;
      cur += '$$';
      i++;
    } else if (text[i] === ';' && !dollar) {
      out.push(norm(cur));
      cur = '';
    } else cur += text[i];
  }
  if (norm(cur)) out.push(norm(cur));
  return out.filter(Boolean);
}
const ST = statements(sql);
const has = (s: string) => ST.includes(s);

interface Policy { name: string; table: string; op: string; roles: string[]; text: string }
const POLICIES: Policy[] = ST.filter((s) => s.startsWith('create policy')).map((s) => {
  const m = /^create policy "([^"]+)" on ([a-z_.]+) for (select|insert|update|delete) to ([a-z_, ]+?) (?:using|with check) /.exec(s);
  if (!m) throw new Error(`policy tidak sesuai pola: ${s.slice(0, 90)}`);
  return { name: m[1], table: m[2], op: m[3], roles: m[4].split(',').map((r) => r.trim()), text: s };
});
const policiesOf = (t: string) => POLICIES.filter((p) => p.table === t);

describe('migrasi 0001: bentuk skema', () => {
  it('membuat tepat tabel yang dirancang', () => {
    const created = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
    expect([...created].sort()).toEqual([...TABLES].sort());
  });

  it('tiap tabel: RLS aktif, hak klien dicabut dulu, service_role mendapat hak penuh', () => {
    for (const t of TABLES) {
      expect(has(`alter table public.${t} enable row level security`), `${t}: RLS`).toBe(true);
      expect(has(`revoke all on table public.${t} from anon, authenticated`), `${t}: revoke`).toBe(true);
      expect(has(`grant all on table public.${t} to service_role`), `${t}: service_role`).toBe(true);
    }
  });

  it('setiap tabel punya policy, kecuali admins yang sengaja tanpa policy dan tanpa hak klien', () => {
    for (const t of TABLES.filter((x) => x !== 'admins')) expect(policiesOf(`public.${t}`).length, t).toBeGreaterThan(0);
    expect(policiesOf('public.admins')).toHaveLength(0);
    expect(ST.filter((s) => /^grant .* on table public\.admins to (anon|authenticated)/.test(s))).toEqual([]);
  });
});

describe('migrasi 0001: policy', () => {
  it('satu policy per operasi, selalu dengan `to <peran>`, tanpa `for all`', () => {
    expect(sql).not.toMatch(/for all/i);
    for (const p of POLICIES) {
      expect(p.roles.every((r) => ['anon', 'authenticated'].includes(r)), p.name).toBe(true);
      const using = / using \(/.test(p.text);
      const check = / with check \(/.test(p.text);
      if (p.op === 'select' || p.op === 'delete') expect([using, check], p.name).toEqual([true, false]);
      if (p.op === 'insert') expect([using, check], p.name).toEqual([false, true]);
      if (p.op === 'update') expect([using, check], p.name).toEqual([true, true]);
    }
  });

  it('auth.uid() selalu dibungkus (select auth.uid()) agar dihitung sekali per kueri', () => {
    expect(sql.replace(/\(select auth\.uid\(\)\)/g, '')).not.toContain('auth.uid()');
  });

  it('`using (true)` hanya untuk data yang memang publik (artis dan album)', () => {
    const open = POLICIES.filter((p) => / using \(true\)/.test(p.text)).map((p) => p.table);
    expect(open.sort()).toEqual(['public.albums', 'public.artists']);
  });

  it('tamu (anon) hanya membaca data publik dan mencatat putaran; tidak pernah menulis yang lain', () => {
    const anon = ST.filter((s) => /^grant .* to anon/.test(s)).map((s) => /^grant (.+) on table public\.(\w+) to /.exec(s));
    const byTable = Object.fromEntries(anon.map((m) => [m?.[2], m?.[1]]));
    expect(Object.keys(byTable).sort()).toEqual(['albums', 'artists', 'comments', 'playlist_tracks', 'playlists', 'plays', 'profiles', 'tracks']);
    for (const [t, privs] of Object.entries(byTable)) {
      if (t === 'plays') expect(privs).toBe('insert (user_id, track_id, listened_sec)');
      else expect(privs, t).toBe('select');
    }
  });

  it('pengguna tidak pernah mendapat hak penuh; artists, albums, dan tracks tidak bisa di-insert klien', () => {
    for (const s of ST.filter((x) => /^grant .* to (anon, )?authenticated$/.test(x) && x.includes('on table'))) {
      expect(/^grant (all|truncate|references|trigger)\b/.test(s), s).toBe(false);
    }
    for (const t of ['artists', 'albums', 'tracks']) {
      expect(ST.filter((s) => new RegExp(`^grant insert .* on table public\\.${t} to`).test(s)), t).toEqual([]);
    }
  });

  it('pemilik hanya bisa mengubah kolom aman di tracks (bukan penghitung, moderasi, kepemilikan, atau jalur berkas)', () => {
    const g = ST.find((s) => s.startsWith('grant update (') && s.includes('on table public.tracks'));
    expect(g).toBe('grant update (title, description, genre, hue, visibility) on table public.tracks to authenticated');
    for (const col of ['hidden', 'like_count', 'play_count', 'owner_id', 'audio_path', 'source', 'source_id', 'id']) expect(g).not.toContain(col);
  });
});

describe('migrasi 0001: fungsi, trigger, dan storage', () => {
  it('fungsi security definer ada di skema private dengan search_path kosong', () => {
    const fns = ST.filter((s) => s.startsWith('create function'));
    expect(fns.length).toBe(3);
    for (const f of fns) {
      expect(f, f.slice(0, 60)).toMatch(/^create function private\./);
      expect(f).toContain('security definer');
      expect(f).toContain("set search_path = ''");
    }
    for (const n of ['is_admin()', 'handle_new_user()', 'bump_like_count()']) expect(has(`revoke all on function private.${n} from public`), n).toBe(true);
  });

  it('trigger: profil dan pengaturan saat akun dibuat, like_count dijaga trigger', () => {
    expect(has('create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user()')).toBe(true);
    expect(has('create trigger likes_count after insert or delete on public.likes for each row execute function private.bump_like_count()')).toBe(true);
  });

  it('bucket audio privat, 100 MB, hanya MP3/AAC', () => {
    const b = ST.find((s) => s.startsWith('insert into storage.buckets'));
    expect(b).toContain("values ('audio', 'audio', false, 104857600, array['audio/mpeg', 'audio/aac', 'audio/mp4', 'audio/x-m4a'])");
    expect(b).toContain('set public = false');
  });

  it('policy storage: empat operasi, hanya pengguna masuk, hanya bucket audio dan folder sendiri', () => {
    const ps = policiesOf('storage.objects');
    expect(ps.map((p) => p.op).sort()).toEqual(['delete', 'insert', 'select', 'update']);
    for (const p of ps) {
      expect(p.roles, p.name).toEqual(['authenticated']);
      expect(p.text, p.name).toContain("bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text");
    }
  });

  it('nilai constraint sumber lagu sama dengan SourceId di aplikasi', () => {
    const lists = [...sql.matchAll(/source in \(([^)]*)\)/g)].map((m) => m[1].replace(/\s/g, ''));
    expect(lists.length).toBe(3);
    for (const l of lists) expect(l).toBe("'upload','audius','jamendo','deezer'");
  });
});

describe('migrasi 0001: pemeriksaan sintaks kasar', () => {
  it('tanda kurung dan $$ seimbang di setiap pernyataan', () => {
    for (const s of ST) {
      const noStrings = s.replace(/'(?:[^']|'')*'/g, "''");
      const open = (noStrings.match(/\(/g) ?? []).length;
      const close = (noStrings.match(/\)/g) ?? []).length;
      expect(open, s.slice(0, 70)).toBe(close);
      expect((s.match(/\$\$/g) ?? []).length % 2, s.slice(0, 70)).toBe(0);
    }
  });
});

describe('tes pgTAP (supabase/tests)', () => {
  const files = readdirSync(TESTS).filter((f) => f.endsWith('_test.sql'));
  const body = (f: string) => readFileSync(`${TESTS}/${f}`, 'utf8');

  it('ada berkas uji untuk tiap area dan semuanya transaksional', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const t = body(f).replace(/--[^\n]*/g, '').trim();
      expect(t.startsWith('begin;'), f).toBe(true);
      expect(t.endsWith('rollback;'), f).toBe(true);
      expect(t, f).toContain('select * from finish();');
    }
  });

  it('jumlah rencana plan(N) sama dengan jumlah asersi (salah hitung = uji gagal)', () => {
    for (const f of files) {
      const t = body(f);
      const plan = Number(/^select plan\((\d+)\);/m.exec(t)?.[1]);
      const asserts = (t.match(/^select (ok|is|isnt|is_empty|isnt_empty|results_eq|results_ne|throws_ok|lives_ok|cmp_ok)\(/gm) ?? []).length;
      expect(asserts, f).toBe(plan);
    }
  });

  it('setiap tabel disebut di setidaknya satu berkas uji', () => {
    const all = files.map(body).join('\n');
    for (const t of TABLES) expect(all, t).toMatch(new RegExp(`public\\.${t}\\b`));
    expect(all).toContain('storage.objects');
  });

  it('peran ditiru dengan set local role + request.jwt.claim.sub, bukan peran tetap', () => {
    for (const f of files) {
      const t = body(f);
      if (/set local role (anon|authenticated)/.test(t)) expect(t, f).toContain('set local request.jwt.claim.sub');
    }
  });
});
