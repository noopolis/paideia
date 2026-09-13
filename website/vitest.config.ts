import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/references/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text'],
      thresholds: { perFile: true, statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
