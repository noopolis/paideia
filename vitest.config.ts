import { configDefaults, defineConfig } from 'vitest/config';

// Tool configuration requires a default export; product modules use named exports.

/**
 * These files drive the real DSPy/GEPA Python bridge as a child process. Under full
 * file parallelism every worker starts its own interpreter, the machine is
 * oversubscribed and the bridge handshake misses the ordinary 15s test budget even
 * though each file passes on its own. They therefore run in one serialized project
 * scheduled after the rest of the suite, with the same timeouts as everything else,
 * instead of raising the global budget or deleting the tests.
 */
const realBridgeTests = [
  'src/cli/commands.test.ts',
  'src/cli/measurement-fork.test.ts',
  'src/cli/proposal.test.ts',
  'src/cli/spawnfile/integration.test.ts',
  'src/cli/training/configuration.test.ts',
  'src/cli/training/protocol.test.ts',
  'src/cli/training/resume.test.ts',
  'src/experiments/training/routing.test.ts',
  'src/inference/codex/strict-schema-proposal.test.ts',
  'src/optimization/checkpoint.test.ts',
  'src/optimization/population.test.ts',
  'src/optimization/runner-home.test.ts',
  'src/optimization/runner.test.ts',
];

export default defineConfig({
  test: {
    testTimeout: 15_000,
    hookTimeout: 15_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'suite',
          include: ['src/**/*.test.ts', 'tooling/**/*.test.ts', '.github/scripts/ci/*.test.mts', 'viewer/**/*.test.ts'],
          exclude: [...configDefaults.exclude, ...realBridgeTests],
          sequence: { groupOrder: 0 },
        },
      },
      {
        extends: true,
        test: {
          name: 'real-bridge',
          include: realBridgeTests,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'tooling/**/*.ts', 'viewer/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: { perFile: true, lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
