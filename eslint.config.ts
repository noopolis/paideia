import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { generatedFilePatterns, structurePlugin } from './tooling/eslint/index.js';

// Configuration entry points are the sole default-export exception.
export default tseslint.config(
  { ignores: generatedFilePatterns },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    plugins: { structure: structurePlugin },
    rules: {
      'max-lines': ['error', { max: 600, skipBlankLines: false, skipComments: false }],
      'structure/line-target': 'warn',
      'structure/directory-structure': 'error',
      'structure/module-boundaries': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-syntax': ['error', {
        selector: 'ExportDefaultDeclaration', message: 'Use named exports in product modules.',
      }],
    },
  },
  { files: ['**/*.config.ts'], rules: { 'no-restricted-syntax': 'off' } },
);
