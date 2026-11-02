import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Font dimuat lewat <link> agar CSS HTML ('Plus Jakarta Sans') tetap utuh
  { files: ['src/app/layout.tsx'], rules: { '@next/next/no-page-custom-font': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'reference/**', 'scripts/**', 'test-results/**', 'playwright-report/**']),
]);
