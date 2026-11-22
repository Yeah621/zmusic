import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Uji statis atas berkas auth sisi server (proxy sesi, klien server, rute konfirmasi). Pustaka Supabase tidak dijalankan di sini;
// ini menjaga aturan dari dokumentasi Supabase dan Next.js 16 supaya tidak berubah tanpa sengaja.
const read = (p: string) => readFileSync(p, 'utf8');
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('proxy.ts (Next.js 16) dan penyegaran sesi', () => {
  const proxy = code('src/proxy.ts');
  const update = code('src/lib/supabase/proxy.ts');

  it('mengekspor proxy dan matcher yang melewati aset statis dan route publik ber-cache, tetapi tidak /auth', () => {
    expect(proxy).toContain('export async function proxy(');
    const matcher = /matcher:\s*\[\s*'([^']+)'/.exec(proxy)?.[1] ?? '';
    for (const skip of ['_next/static', '_next/image', 'favicon.ico', 'api/home', 'api/search', 'api/stream', 'wav', 'mp3']) expect(matcher, skip).toContain(skip);
    expect(matcher).not.toContain('auth');
  });

  it('memakai getClaims() tepat setelah createServerClient, tanpa kode di antaranya', () => {
    const at = update.indexOf('await supabase.auth.getClaims()');
    expect(at).toBeGreaterThan(0);
    expect(update.slice(0, at).trimEnd().endsWith('});')).toBe(true);
    expect(update.slice(update.indexOf('createServerClient(supabaseUrl'), at)).not.toMatch(/await /);
  });

  it('mengembalikan respons yang membawa cookie baru dan tidak pernah mengalihkan tamu', () => {
    expect(update).toContain('return supabaseResponse;');
    expect(update).not.toMatch(/redirect\(/);
    expect(update).toContain('Object.entries(headers)'); // header cache dari Supabase agar CDN tidak menyimpan cookie sesi
  });

  it('tanpa konfigurasi Supabase tidak berbuat apa-apa', () => {
    expect(update).toMatch(/if \(!supabaseUrl \|\| !supabaseKey\) return supabaseResponse;/);
  });
});

describe('berkas server Supabase', () => {
  const files = ['src/proxy.ts', 'src/lib/supabase/proxy.ts', 'src/lib/supabase/server.ts', 'src/app/auth/confirm/route.ts'];

  it('tidak memakai getSession() di server (tidak boleh dipercaya; pakai getClaims atau getUser)', () => {
    for (const f of files) expect(code(f), f).not.toContain('getSession(');
  });

  it('tidak memakai kunci rahasia (service_role) dan variabel publik dirujuk secara literal', () => {
    for (const f of [...files, 'src/lib/supabase/client.ts', 'src/lib/supabase/config.ts']) expect(code(f), f).not.toMatch(/SERVICE_ROLE|SECRET_KEY|SUPABASE_SECRET/);
    const cfg = code('src/lib/supabase/config.ts');
    expect(cfg).toContain('process.env.NEXT_PUBLIC_SUPABASE_URL');
    expect(cfg).toContain('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('klien server dibuat per permintaan (tidak ada instans global) dan membaca cookie permintaan', () => {
    const s = code('src/lib/supabase/server.ts');
    expect(s).toContain('export async function createClient()');
    expect(s).toContain('await cookies()');
    expect(s).not.toMatch(/^(const|let) supabase\b/m);
  });

  it('rute konfirmasi: memverifikasi token_hash lewat verifyOtp dan memakai tujuan yang sudah divalidasi', () => {
    const r = code('src/app/auth/confirm/route.ts');
    expect(r).toContain('verifyOtp(');
    expect(r).toContain('confirmDestination(');
    expect(r).toContain('NextResponse.redirect(new URL(path, origin))');
    expect(r).not.toMatch(/searchParams\.get\('next'\)\s*\)\s*;?\s*\n\s*NextResponse\.redirect/);
  });
});
