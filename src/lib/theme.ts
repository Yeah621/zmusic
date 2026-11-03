export type ThemeMode = 'system' | 'light' | 'dark';
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  return matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
}

/** Padanan applyTheme() di HTML: atribut data-theme dan meta theme-color. */
export function applyTheme(mode: ThemeMode): void {
  const t = resolveTheme(mode);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#050908' : '#eef8f5');
}
