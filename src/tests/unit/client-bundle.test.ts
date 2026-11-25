import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// G2: kunci rahasia tidak boleh masuk kode klien. Selain memindai bundel (npm run check:secrets), uji ini mencegah
// penyebabnya: modul klien mengimpor kode server (agregator sumber membawa nama variabel rahasia).
const CLIENT = ['src/components', 'src/stores', 'src/lib/data', 'src/lib/auth', 'src/data'];
const CLIENT_LIB = readdirSync('src/lib')
  .filter((f) => /\.tsx?$/.test(f) && f !== 'api.ts')
  .map((f) => join('src/lib', f))
  .concat(['src/lib/supabase/client.ts', 'src/lib/supabase/config.ts']); // server.ts dan proxy.ts khusus server
const FORBIDDEN: [RegExp, string][] = [
  [/from\s+['"]@\/lib\/sources['"]/, "@/lib/sources (indeks; pakai ids.ts atau types.ts)"],
  [/from\s+['"]@\/lib\/sources\/(audius|deezer|jamendo|http|parse|shelves)['"]/, 'adapter sumber'],
  [/from\s+['"]@\/lib\/api['"]/, '@/lib/api (khusus route handler)'],
  [/from\s+['"]next\/server['"]/, 'next/server'],
  [/from\s+['"]next\/headers['"]/, 'next/headers (khusus server)'],
  [/from\s+['"]@\/lib\/server\//, '@/lib/server (khusus server)'],
  [/from\s+['"]@\/lib\/supabase\/(server|proxy)['"]/, 'klien Supabase untuk server (cookies, proxy)'],
  [/(SERVICE_ROLE|SECRET_KEY)/, 'kunci rahasia Supabase'],
  [/process\.env\.(AUDIUS|JAMENDO|SUPABASE_SERVICE)/, 'variabel rahasia'],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('batas klien dan server', () => {
  it('kode klien tidak mengimpor kode server atau membaca variabel rahasia', () => {
    const all = [...CLIENT.flatMap(files), ...CLIENT_LIB, 'src/app/layout.tsx'];
    expect(all.length).toBeGreaterThan(40);
    const hits = all.flatMap((f) => {
      const src = readFileSync(f, 'utf8');
      return FORBIDDEN.filter(([re]) => re.test(src)).map(([, why]) => `${f}: ${why}`);
    });
    expect(hits).toEqual([]);
  });
});
