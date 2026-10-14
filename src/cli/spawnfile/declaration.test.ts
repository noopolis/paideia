import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { declarationSandbox } from './declaration.test-helper.js';

const execute = promisify(execFile);
it.each(['happy', 'main', 'slots', 'arguments', 'hooks', 'injected', 'context', 'dry-run', 'registration', 'cancel'])('receives the real emitted declaration: %s', async mode => {
  const f = await declarationSandbox();
  try {
    const result = await execute(process.execPath, ['--import', f.loader, 'verify.mjs', mode], {
      cwd: f.sandbox, env: process.env, timeout: 30_000, maxBuffer: 1024 * 1024,
    });
    expect(result.stdout).toContain(`DECLARATION VERIFIED ${mode}`);
  } finally { await rm(f.sandbox, { recursive: true, force: true }); }
}, 40_000);

it('refuses an unprovisioned compiler instead of discovering a developer sibling checkout', async () => {
  const previous = process.env.SPAWNFILE_TEST_SOURCE_ROOT;
  delete process.env.SPAWNFILE_TEST_SOURCE_ROOT;
  try {
    await expect(declarationSandbox()).rejects.toThrow('Provision the paired compiler explicitly');
  } finally {
    if (previous === undefined) delete process.env.SPAWNFILE_TEST_SOURCE_ROOT;
    else process.env.SPAWNFILE_TEST_SOURCE_ROOT = previous;
  }
}, 40_000);
