import { defineConfig } from 'vitest/config';

// Tool configuration requires a default export; product modules use named exports.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tooling/**/*.test.ts', 'viewer/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'tooling/**/*.ts', 'viewer/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { perFile: true, lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
