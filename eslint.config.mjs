import { fileURLToPath, URL } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url))),
  {
    name: 'internradar/javascript',
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
  },
  {
    name: 'internradar/typescript',
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    name: 'internradar/api-type-aware',
    files: ['apps/api/src/**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
      },
    },
  },
  ...nextVitals.map((config) => ({ ...config, files: ['apps/web/**/*.{js,mjs,ts,tsx}'] })),
  { settings: { next: { rootDir: fileURLToPath(new URL('./apps/web/', import.meta.url)) } } },
  prettier,
]);
