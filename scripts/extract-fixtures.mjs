// Menjalankan kode ASLI di reference/zmusic-fixed.html (DATA, genArt, fmt) dan menulis
// src/tests/fixtures/reference.json sebagai acuan uji. Jalankan: npm run fixtures
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const OUT = 'src/tests/fixtures/reference.json';

export function loadReference(file = 'reference/zmusic-fixed.html') {
  const html = readFileSync(file, 'utf8');
  const cut = (from, to) => {
    const i = html.indexOf(from);
    const j = html.indexOf(to, i);
    if (i < 0 || j < 0) throw new Error(`Penanda tidak ditemukan: ${from}`);
    return html.slice(i, j);
  };
  const fmtLine = /const fmt=[^\n]*;/.exec(html);
  if (!fmtLine) throw new Error('fmt tidak ditemukan');
  const code = [
    cut('/* ---------- DATA ---------- */', '/* ---------- STATE ---------- */'),
    cut('const AC={};', 'const cv=x=>'),
    fmtLine[0],
    'result={T,AL,A,PB,TL,G,genArt,fmt};',
  ].join('\n');
  const ctx = {};
  runInNewContext(code, ctx);
  return ctx.result;
}

function main() {
  const { T, AL, A, PB, TL, G, genArt, fmt } = loadReference();
  const pairs = Array.from({ length: 20 }, (_, n) => [(n * 47 + 13) % 360, n]);
  const data = {
    T, AL, A, PB, TL, G,
    genArt: pairs.map(([h, s]) => ({ h, s, out: genArt(h, s) })),
    fmt: [0, 1, 9, 59, 59.9, 60, 61, 125.5, 204, 3599, 3600, 7325].map((v) => ({ v, out: fmt(v) })),
  };
  mkdirSync('src/tests/fixtures', { recursive: true });
  writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log(`${OUT}: ${T.length} lagu, ${AL.length} album, ${A.length} artis, ${data.genArt.length} cover`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
