import type { BrowserContext } from '@playwright/test';

/** Pakai data contoh Fase 1 (`?data=sample`, 14 lagu tanpa jaringan) di semua halaman konteks ini. */
export async function useSampleData(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('zm-data', 'sample');
    } catch {
      /* halaman file:// tanpa sessionStorage: abaikan */
    }
  });
}
