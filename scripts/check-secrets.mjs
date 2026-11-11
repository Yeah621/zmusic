// Memeriksa bundel klien: tidak boleh memuat NAMA maupun NILAI variabel rahasia (gerbang G2).
// Pakai: node scripts/check-secrets.mjs [folder=.next/static]   (nilai dibaca dari lingkungan dan .env.local)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SECRET_NAMES = ['SUPABASE_SERVICE_ROLE_KEY', 'AUDIUS_API_KEY', 'JAMENDO_CLIENT_ID'];

function* files(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}

function dotenv() {
  const out = {};
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

export function scan(dir, env = { ...dotenv(), ...process.env }) {
  const found = [];
  for (const file of files(dir)) {
    const text = readFileSync(file, 'utf8');
    for (const name of SECRET_NAMES) {
      if (text.includes(name)) found.push(`${file}: memuat nama ${name}`);
      const value = env[name];
      if (value && value.length >= 8 && text.includes(value)) found.push(`${file}: memuat nilai ${name}`);
    }
  }
  return found;
}

if (process.argv[1]?.endsWith('check-secrets.mjs')) {
  const dir = process.argv[2] ?? '.next/static';
  if (!existsSync(dir)) {
    console.error(`Folder ${dir} tidak ada. Jalankan npm run build lebih dulu.`);
    process.exit(2);
  }
  const found = scan(dir);
  console.log(found.length ? found.join('\n') : `Bersih: tidak ada nama atau nilai rahasia di ${dir}`);
  process.exit(found.length ? 1 : 0);
}
