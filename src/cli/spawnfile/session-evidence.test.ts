import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { captureTrainingSessionReceipt } from './session-evidence.js';

it('retains exact preflight bytes and digest when the supervisor overwrites its pathname', async () => {
  const root = await mkdtemp(join(tmpdir(), 'session-evidence-'));
  try {
    const path = join(root, 'preflight.json'), content = Buffer.from('{"generation":1}\n');
    await writeFile(path, content);
    const captured = await captureTrainingSessionReceipt(path);
    await writeFile(path, '{"generation":2}');
    expect(Buffer.from(captured.content, 'base64')).toEqual(content);
    expect(captured.sha256).toBe(`sha256:${createHash('sha256').update(content).digest('hex')}`);
    expect(captured.sourcePath).toBe(path);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it.each(['symlink', 'directory', 'oversized', 'missing'] as const)('refuses untrustworthy preflight capture: %s', async kind => {
  const root = await mkdtemp(join(tmpdir(), 'session-evidence-invalid-'));
  try {
    const path = join(root, 'preflight.json');
    if (kind === 'symlink') { await writeFile(join(root, 'other'), '{}'); await symlink(join(root, 'other'), path); }
    if (kind === 'directory') await mkdir(path);
    if (kind === 'oversized') await writeFile(path, ' '.repeat(2_000_001));
    await expect(captureTrainingSessionReceipt(path)).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
