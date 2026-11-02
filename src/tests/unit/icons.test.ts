import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '@/components/icons/Icon';
import { IconSprite } from '@/components/icons/IconSprite';

// HTML menulis <path .../>, React menulis <path ...></path>: samakan dulu sebelum dibandingkan.
const norm = (s: string) => s.replace(/<\/(?:path|circle|rect)>/g, '').replace(/\s*\/>/g, '>');
const symbols = (s: string) => [...s.matchAll(/<symbol id="i-([\w-]+)"[\s\S]*?<\/symbol>/g)].map((m) => [m[1], norm(m[0])]);
const html = readFileSync('reference/zmusic-fixed.html', 'utf8');

describe('sprite ikon', () => {
  it('36 <symbol> sama persis dengan HTML', () => {
    const want = symbols(html);
    expect(want).toHaveLength(36);
    expect(symbols(renderToStaticMarkup(createElement(IconSprite)))).toEqual(want);
  });

  it('ICON_NAMES sama dengan id sprite', () => {
    expect([...ICON_NAMES]).toEqual(symbols(html).map(([id]) => id));
  });
});
