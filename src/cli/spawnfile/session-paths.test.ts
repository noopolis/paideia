import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { TrialSlot } from '../../contracts/trial-slot.js';
import { bindTrainingSessionPaths } from './session-paths.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'session-bind-')); roots.push(root);
  const paths = { root, workspace: join(root, 'workspace'), runtimeHome: join(root, 'runtime'), control: join(root, 'control') };
  const slot: TrialSlot = { index: 0, workerUid: 1001, ports: { base: 4000, count: 10 }, roots: {
    workspace: join(root, 'slot-workspace'), runtimeHome: join(root, 'slot-home') } };
  await Promise.all([paths.workspace, paths.runtimeHome, paths.control, ...Object.values(slot.roots)].map(path => mkdir(path)));
  await writeFile(join(paths.workspace, 'AGENTS.md'), 'candidate');
  return { root, paths, slot };
}
it('preserves candidate files and binds only the leased writable roots', async () => {
  const f = await fixture(); await bindTrainingSessionPaths(f.paths, f.slot);
  expect(await readFile(join(f.paths.workspace, 'AGENTS.md'), 'utf8')).toBe('candidate');
  expect(await readdir(f.paths.control)).toEqual([]);
  expect(await readdir(f.slot.roots.runtimeHome!)).toEqual([]);
});
it.each(['missing', 'overlap', 'relative', 'link', 'file', 'control-ancestor', 'control-child', 'dirty-slot',
  'scratch-target', 'scratch-link', 'scratch-file', 'dirty-runtime'] as const)('rejects unsafe path mapping: %s', async mode => {
  const f = await fixture(), roots = { ...f.slot.roots };
  if (mode === 'missing') delete roots.workspace;
  if (mode === 'overlap') roots.runtimeHome = roots.workspace!;
  if (mode === 'relative') roots.workspace = 'relative';
  if (mode === 'link') { await rm(roots.workspace!, { recursive: true }); await symlink(roots.runtimeHome!, roots.workspace!); }
  if (mode === 'file') { await rm(roots.workspace!, { recursive: true }); await writeFile(roots.workspace!, 'file'); }
  if (mode === 'control-ancestor') { roots.workspace = f.root; }
  if (mode === 'control-child') { roots.workspace = join(f.paths.control, 'nested'); await mkdir(roots.workspace); }
  if (mode === 'dirty-slot') await writeFile(join(roots.runtimeHome!, 'stale'), 'old trial');
  if (mode === 'scratch-target') f.paths.runtimeHome = roots.runtimeHome!;
  if (mode === 'scratch-link') { await rm(f.paths.runtimeHome, { recursive: true }); await symlink(roots.runtimeHome!, f.paths.runtimeHome); }
  if (mode === 'scratch-file') { await rm(f.paths.runtimeHome, { recursive: true }); await writeFile(f.paths.runtimeHome, 'file'); }
  if (mode === 'dirty-runtime') await writeFile(join(f.paths.runtimeHome, 'credentials'), 'unexpected');
  await expect(bindTrainingSessionPaths(f.paths, { ...f.slot, roots })).rejects.toThrow();
  expect(await readFile(join(f.paths.workspace, 'AGENTS.md'), 'utf8')).toBe('candidate');
});

it('accepts the supervisor-created empty spill directory and isolated subject scratch', async () => {
  const f = await fixture(); await mkdir(join(f.slot.roots.runtimeHome!, 'tool-output'));
  const subjectRoot = join(f.root, 'subjects'); await mkdir(subjectRoot);
  const trial = join(subjectRoot, 'trial-fresh'); await mkdir(trial);
  await rm(f.paths.workspace, { recursive: true }); f.paths.workspace = join(trial, 'workspace');
  await mkdir(f.paths.workspace); await writeFile(join(f.paths.workspace, 'AGENTS.md'), 'candidate');
  await bindTrainingSessionPaths(f.paths, f.slot, subjectRoot);
  expect(await readFile(join(f.paths.workspace, 'AGENTS.md'), 'utf8')).toBe('candidate');
});
it.each(['escape', 'control', 'spill-link', 'spill-file', 'spill-dirty'])('refuses allocation/provisioning mutation %s', async mode => {
  const f = await fixture();
  if (mode === 'escape') { f.paths.workspace = join(f.root, 'unowned'); await mkdir(f.paths.workspace); }
  if (mode === 'control') f.paths.control = f.root;
  const spill = join(f.slot.roots.runtimeHome!, 'tool-output');
  if (mode === 'spill-link') await symlink(f.paths.control, spill);
  if (mode === 'spill-file') await writeFile(spill, 'stale');
  if (mode === 'spill-dirty') { await mkdir(spill); await writeFile(join(spill, 'old'), 'stale'); }
  await expect(bindTrainingSessionPaths(f.paths, f.slot)).rejects.toThrow();
});
