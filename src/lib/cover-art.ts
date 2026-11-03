import type { CSSProperties } from 'react';

// P0-05: disalin dari genArt() di reference/zmusic-fixed.html. Logika TIDAK boleh diubah;
// uji unit membandingkan keluarannya dengan kode asli HTML (src/tests/fixtures/reference.json).
const AC: Record<string, string> = {};
export function genArt(h: number, s: number): string {const key=h+'|'+s;if(AC[key])return AC[key];const c1=`hsl(${h},82%,52%)`,c2=`hsl(${(h+65)%360},72%,24%)`,c3=`hsl(${(h+25)%360},95%,80%)`,k=s%5;let o='';
if(k==0)o=`<circle cx="68" cy="34" r="24" fill="${c3}" opacity=".9"/><circle cx="26" cy="76" r="34" fill="${c1}" opacity=".65"/>`;
else if(k==1)o=[0,1,2,3,4].map(i=>`<rect x="${-10+i*24}" y="-20" width="12" height="140" fill="${i%2?c3:c1}" opacity=".5" transform="rotate(25 50 50)"/>`).join('');
else if(k==2)o=[44,32,20,8].map((r,i)=>`<circle cx="50" cy="50" r="${r}" fill="none" stroke="${i%2?c1:c3}" stroke-width="5" opacity=".8"/>`).join('');
else if(k==3)o=[0,1,2].map(i=>`<path d="M0 ${55+i*14} Q25 ${35+i*14} 50 ${55+i*14} T100 ${55+i*14} V100 H0Z" fill="${i%2?c1:c3}" opacity=".5"/>`).join('');
else o=`<path d="M50 12 88 80H12Z" fill="${c3}" opacity=".7"/><path d="M50 40 74 84H26Z" fill="${c1}" opacity=".8"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>${o}</svg>`;
return AC[key]="url('data:image/svg+xml,"+encodeURIComponent(svg)+"')"}

/** Padanan cv() di HTML: `i` (indeks lagu) atau `s` (benih) menentukan bentuk cover. */
export const coverStyle = (x: { h: number; i?: number; s?: number }): CSSProperties => ({
  backgroundImage: genArt(x.h, x.i != null ? x.i : x.s || 0),
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

/** Padanan ab() di HTML: latar gradien avatar dan banner artis. */
export const artistBg = (h: number): CSSProperties => ({
  background: `linear-gradient(135deg,hsl(${h} 80% 55%),hsl(${(h + 60) % 360} 70% 28%))`,
});
