import { describe, expect, it } from 'vitest';
import { confirmDestination, isOtpType } from '@/lib/auth/confirm';
import { authMessage, mapAuthError, thrownAuthError } from '@/lib/auth/errors';
import { createFakeAuthPort, DEMO_USER } from '@/lib/auth/fake-port';
import { runAuth } from '@/lib/auth/flow';
import { safeNext } from '@/lib/auth/redirect';
import type { AuthErrorCode, AuthOutcome, AuthPort, AuthUser } from '@/lib/auth/types';

const ALL_CODES: AuthErrorCode[] = ['invalid_credentials', 'email_not_confirmed', 'email_exists', 'weak_password', 'invalid_email', 'invalid_input', 'rate_limited', 'email_not_allowed', 'signup_disabled', 'network', 'unconfigured', 'unknown'];
const ANI: AuthUser = { id: 'u1', name: 'Ani', handle: 'ani' };

describe('mapAuthError: galat Supabase Auth ke kode kita (berdasarkan code, name, status; bukan teks pesan)', () => {
  it('kode yang dikenal', () => {
    const table: [string, AuthErrorCode][] = [
      ['invalid_credentials', 'invalid_credentials'],
      ['email_not_confirmed', 'email_not_confirmed'],
      ['email_exists', 'email_exists'],
      ['user_already_exists', 'email_exists'],
      ['weak_password', 'weak_password'],
      ['email_address_invalid', 'invalid_email'],
      ['validation_failed', 'invalid_input'],
      ['over_request_rate_limit', 'rate_limited'],
      ['over_email_send_rate_limit', 'rate_limited'],
      ['email_address_not_authorized', 'email_not_allowed'],
      ['signup_disabled', 'signup_disabled'],
      ['email_provider_disabled', 'signup_disabled'],
    ];
    for (const [code, want] of table) expect(mapAuthError({ code, status: 400 }), code).toBe(want);
  });
  it('tanpa galat = null; status 429 = dibatasi; gagal jaringan = network; selebihnya unknown', () => {
    expect(mapAuthError(null)).toBeNull();
    expect(mapAuthError(undefined)).toBeNull();
    expect(mapAuthError({ status: 429 })).toBe('rate_limited');
    expect(mapAuthError({ name: 'AuthRetryableFetchError', status: 0 })).toBe('network');
    expect(mapAuthError({ status: 0 })).toBe('network');
    expect(mapAuthError({ name: 'AuthApiError', status: 400 })).toBe('unknown');
    expect(mapAuthError({ code: 'kode_baru_dari_supabase', status: 400 })).toBe('unknown');
  });
  it('galat yang dilempar: jaringan, belum dikonfigurasi, objek berkode, atau tak dikenal', () => {
    expect(thrownAuthError(new TypeError('Failed to fetch'))).toBe('network');
    expect(thrownAuthError(new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL dan kunci publik)'))).toBe('unconfigured');
    expect(thrownAuthError({ code: 'invalid_credentials' })).toBe('invalid_credentials');
    expect(thrownAuthError(new Error('lain'))).toBe('unknown');
    expect(thrownAuthError('teks')).toBe('unknown');
    expect(thrownAuthError(null)).toBe('unknown');
  });
});

describe('authMessage: pesan untuk pengguna', () => {
  it('setiap kode punya pesan Indonesia', () => {
    for (const c of ALL_CODES) expect(authMessage(c).message.length, c).toBeGreaterThan(10);
  });
  it('galat kredensial dan email tampil di kolomnya; galat sistem sebagai toast (field null)', () => {
    expect(authMessage('invalid_credentials')).toEqual({ field: 'pw', message: 'Email atau kata sandi salah' });
    expect(authMessage('email_exists').field).toBe('email');
    expect(authMessage('email_not_confirmed').field).toBe('email');
    expect(authMessage('invalid_email').field).toBe('email');
    expect(authMessage('weak_password').field).toBe('pw');
    for (const c of ['rate_limited', 'network', 'unconfigured', 'unknown', 'signup_disabled', 'email_not_allowed', 'invalid_input'] as const) expect(authMessage(c).field, c).toBeNull();
  });
});

describe('runAuth: alur formulir Masuk dan Daftar', () => {
  const calls: { fn: string; arg: unknown }[] = [];
  const port = (result: AuthOutcome): AuthPort => ({
    signUp: async (a) => (calls.push({ fn: 'signUp', arg: a }), result),
    signIn: async (a) => (calls.push({ fn: 'signIn', arg: a }), result),
    signOut: async () => {},
    watch: () => () => {},
  });
  const input = { name: '  Ani Rahma ', email: ' ani@contoh.id ', pw: 'rahasia123' };

  it('tanpa port (Supabase belum dikonfigurasi) = galat yang jelas', async () => {
    const r = await runAuth(null, 'login', input);
    expect(r.kind).toBe('error');
    expect(r.kind === 'error' && r.message).toContain('Supabase belum dikonfigurasi');
  });
  it('daftar mengirim nama dan email yang dirapikan; masuk tidak mengirim nama', async () => {
    calls.length = 0;
    await runAuth(port({ ok: true, user: ANI, needsConfirmation: false }), 'register', input);
    await runAuth(port({ ok: true, user: ANI, needsConfirmation: false }), 'login', input);
    expect(calls).toEqual([
      { fn: 'signUp', arg: { name: 'Ani Rahma', email: 'ani@contoh.id', password: 'rahasia123' } },
      { fn: 'signIn', arg: { email: 'ani@contoh.id', password: 'rahasia123' } },
    ]);
  });
  it('sesi aktif = selamat datang; belum ada sesi = cek email; galat = pesan di kolom yang tepat', async () => {
    expect(await runAuth(port({ ok: true, user: ANI, needsConfirmation: false }), 'login', input)).toEqual({ kind: 'welcome', user: ANI });
    expect(await runAuth(port({ ok: true, user: null, needsConfirmation: true }), 'register', input)).toEqual({ kind: 'confirm' });
    expect(await runAuth(port({ ok: false, code: 'invalid_credentials' }), 'login', input)).toEqual({ kind: 'error', field: 'pw', message: 'Email atau kata sandi salah' });
    const net = await runAuth(port({ ok: false, code: 'network' }), 'login', input);
    expect(net.kind === 'error' && net.field).toBeNull();
  });
});

describe('port auth tiruan (mode contoh): perilaku sama dengan prototipe Fase 1', () => {
  it('mulai sebagai pengguna contoh dan memberi tahu pemantau segera', () => {
    const seen: (AuthUser | null)[] = [];
    createFakeAuthPort().watch((u) => seen.push(u));
    expect(seen).toEqual([DEMO_USER]);
    const guest: (AuthUser | null)[] = [];
    createFakeAuthPort(null).watch((u) => guest.push(u));
    expect(guest).toEqual([null]);
  });
  it('masuk memakai bagian email sebelum @ sebagai nama; daftar memakai nama; keluar mengosongkan', async () => {
    const p = createFakeAuthPort(null);
    const seen: (AuthUser | null)[] = [];
    p.watch((u) => seen.push(u));
    expect(await p.signIn({ email: 'ani.rahma@contoh.id', password: 'x' })).toEqual({ ok: true, user: { id: 'sample', name: 'ani.rahma', handle: 'ani.rahma' }, needsConfirmation: false });
    const r = await p.signUp({ name: 'Budi Santoso', email: 'b@c.id', password: 'x' });
    expect(r.ok && r.user?.handle).toBe('budi.santoso');
    await p.signOut();
    expect(seen.map((u) => u?.name ?? null)).toEqual([null, 'ani.rahma', 'Budi Santoso', null]);
  });
  it('berhenti memantau setelah fungsi berhenti dipanggil', async () => {
    const p = createFakeAuthPort(null);
    const seen: (AuthUser | null)[] = [];
    const stop = p.watch((u) => seen.push(u));
    stop();
    await p.signIn({ email: 'a@b.id', password: 'x' });
    expect(seen).toEqual([null]);
  });
});

describe('safeNext: tujuan setelah tautan email (anti open redirect)', () => {
  const origin = 'https://zmusic.test';
  it('menerima path relatif dan URL situs sendiri', () => {
    expect(safeNext('/library/3?x=1', origin)).toBe('/library/3?x=1');
    expect(safeNext('https://zmusic.test/profile', origin)).toBe('/profile');
    expect(safeNext('/', origin)).toBe('/');
  });
  it('menolak situs lain, //host, backslash, javascript:, data:, dan teks rusak', () => {
    for (const bad of ['https://evil.test/x', '//evil.test/x', '/\\evil.test', 'javascript:alert(1)', 'data:text/html,<b>x</b>', 'http://', 'https://zmusic.test.evil.test/']) expect(safeNext(bad, origin), bad).toBe('/profile');
  });
  it('kosong memakai cadangan, yang bisa diganti', () => {
    expect(safeNext(null, origin)).toBe('/profile');
    expect(safeNext('', origin, '/')).toBe('/');
    expect(safeNext('https://evil.test', origin, '/')).toBe('/');
  });
});

describe('confirmDestination: tautan konfirmasi email', () => {
  const base = { tokenHash: 'abc', type: 'email', next: '/profile', origin: 'https://zmusic.test' };
  it('token valid mengarah ke tujuan yang aman; hanya jenis OTP yang dikenal diterima', async () => {
    expect(await confirmDestination(base, async () => true)).toBe('/profile');
    expect(await confirmDestination({ ...base, next: 'https://evil.test' }, async () => true)).toBe('/profile');
    expect(await confirmDestination({ ...base, next: '/library' }, async () => true)).toBe('/library');
    expect(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'].every((t) => isOtpType(t))).toBe(true);
    expect(isOtpType('sms')).toBe(false);
    expect(isOtpType(null)).toBe(false);
  });
  it('token ditolak, galat, tidak lengkap, atau jenis tak dikenal = kembali ke /login dengan pesan', async () => {
    const fail = '/login?galat=konfirmasi';
    let called = 0;
    const verify = async () => (called++, false);
    expect(await confirmDestination(base, verify)).toBe(fail);
    expect(await confirmDestination(base, async () => { throw new Error('jaringan'); })).toBe(fail);
    const before = called;
    expect(await confirmDestination({ ...base, tokenHash: null }, verify)).toBe(fail);
    expect(await confirmDestination({ ...base, type: null }, verify)).toBe(fail);
    expect(await confirmDestination({ ...base, type: 'sms' }, verify)).toBe(fail);
    expect(called).toBe(before);
  });
});
