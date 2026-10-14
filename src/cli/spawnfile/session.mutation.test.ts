import { execFile } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const mutants = [
  { file: 'src/cli/spawnfile/declaration.ts', before: 'transportDelivery: native?.transportDelivery', after: 'transportDelivery: undefined',
    testFile: 'src/cli/spawnfile/declaration.unit.test.ts',
    title: 'passes registered private callbacks', assertion: 'declared private callback guarantee' },
  { file: 'src/cli/spawnfile/declaration.ts', before: 'externalInputs: native?.execution?.externalInputs', after: 'externalInputs: undefined',
    testFile: 'src/cli/spawnfile/declaration.unit.test.ts',
    title: 'passes registered private callbacks', assertion: 'declared private callback guarantee' },
  { file: 'src/cli/spawnfile/session.ts', before: 'result.nonce !== freshness.expectedNonce ||', after: '',
    title: 'rejects reset evidence mutation: nonce', assertion: 'reset nonce guarantee' },
  { file: 'src/cli/spawnfile/session.ts',
    before: "if (launch.taskClock?.origin !== moment.effectiveAt) throw new Error('Session task clock differs from the authored moment');",
    after: 'void moment.effectiveAt;', title: 'rejects preparation mutation: clock', assertion: 'prepared clock guarantee' },
  { file: 'src/cli/spawnfile/session.ts',
    before: "if (launch.sourceConfigSha256 !== compilation.native.configSha256.replace(/^sha256:/u, '')) throw new Error('Session native source config differs from candidate compilation');",
    after: 'void compilation.native.configSha256;', title: 'rejects preparation mutation: source-digest', assertion: 'prepared source-digest guarantee' },
  { file: 'src/experiments/trials/trial.ts',
    before: "await options.finalizeEnvironment?.(paths, structuredClone(report));\n    await persist('trial.completed', report);",
    after: "await persist('trial.completed', report);\n    await options.finalizeEnvironment?.(paths, structuredClone(report));",
    title: 'refuses unverified closure and does not reset or publish a completed trial when reset fails', assertion: 'reset-before-completion guarantee' },
  { file: 'src/experiments/trials/trial.ts', before: "await persist('trial.captured', report);", after: '',
    testFile: 'src/experiments/trials/stored.test.ts',
    title: 'capture persistence failure quarantines evidence before reset: blob', assertion: 'capture-failure-must-prevent-reset guarantee' },
  { file: 'src/experiments/trials/stored.ts',
    before: "await options.store.putBlob(options.id, JSON.stringify(event.payload), 'raw')", after: 'undefined',
    testFile: 'src/experiments/trials/stored.test.ts',
    title: 'capture persistence failure quarantines evidence before reset: blob', assertion: 'capture-failure-must-prevent-reset guarantee' },
  { file: 'src/cli/spawnfile/session.ts', before: 'slot: trial.slot.index, generation: recycled.generation, receipt: preflight,',
    after: 'slot: trial.slot.index, generation: recycled.generation, receipt: recycled.receipt,',
    title: 'runs simultaneous leased trials, persists preparation/reset evidence, then reuses a clean slot',
    assertion: 'original-preflight-survives-reset guarantee' },
];

it('kills nonce, clock, source-config and completion-order mutants using the real adjacent assertions', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'paideia-session-mutants-')), execute = promisify(execFile);
  try {
    for (const name of ['src', 'viewer', 'package.json', 'vitest.config.ts', 'tsconfig.json']) {
      await cp(join(root, name), join(sandbox, name), { recursive: true });
    }
    await symlink(join(root, 'node_modules'), join(sandbox, 'node_modules'));
    await mkdir(join(sandbox, 'tmp'));
    for (const mutant of mutants) {
      const file = join(sandbox, mutant.file), original = await readFile(file, 'utf8');
      expect(original.split(mutant.before)).toHaveLength(2);
      await writeFile(file, original.replace(mutant.before, mutant.after));
      const reportPath = join(sandbox, 'mutant.json');
      await rm(reportPath, { force: true });
      let exitCode: number | undefined, failureOutput = '';
      try {
        await execute(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--coverage.enabled=false',
          '--maxWorkers=1', mutant.testFile ?? 'src/cli/spawnfile/session.test.ts', '-t', mutant.title,
          '--reporter=json', '--outputFile', reportPath], {
          cwd: sandbox, timeout: 90_000, maxBuffer: 1024 * 1024, env: { ...process.env, TMPDIR: join(sandbox, 'tmp') },
        });
      } catch (error) { const failed = error as { code: number; stdout: string; stderr: string }; exitCode = failed.code; failureOutput = failed.stdout + failed.stderr; }
      const report = JSON.parse(await readFile(reportPath, 'utf8').catch(() => { throw new Error(failureOutput); })) as {
        testResults: { assertionResults: { status: string; failureMessages: string[] }[] }[];
      };
      expect(exitCode, `${mutant.title}: mutant survived`).toBe(1);
      const failures = report.testResults.flatMap(suite => suite.assertionResults).filter(assertion => assertion.status === 'failed');
      expect(failures, `${mutant.title}: ${failureOutput}`).toHaveLength(1);
      expect(failures[0]!.failureMessages.join('\n')).toContain(mutant.assertion);
      await writeFile(file, original);
    }
  } finally { await rm(sandbox, { recursive: true, force: true }); }
}, 300_000);
