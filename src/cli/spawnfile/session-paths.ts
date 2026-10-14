import { cp, lstat, readdir, realpath, rm, symlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import type { TrialSlot } from '../../contracts/trial-slot.js';
import type { TrialPaths } from '../../experiments/index.js';

const contains = (root: string, path: string): boolean => {
  const child = relative(root, path);
  return child === '' || !isAbsolute(child) && child !== '..' && !child.startsWith(`..${sep}`);
};

/** Replace only evaluator-allocated scratch; slots have just been reset by their supervisor. */
export async function bindTrainingSessionPaths(paths: TrialPaths, slot: TrialSlot, subjectRoot?: string): Promise<void> {
  const allocated = dirname(paths.workspace);
  if (await realpath(paths.root) !== paths.root || paths.control !== join(paths.root, 'control') ||
      paths.runtimeHome !== join(paths.root, 'runtime') || basename(paths.workspace) !== 'workspace' ||
      (subjectRoot === undefined ? allocated !== paths.root : dirname(allocated) !== subjectRoot || !basename(allocated).startsWith('trial-'))) {
    throw new Error('Session scratch paths escape the allocated trial');
  }
  const workspace = slot.roots.workspace, home = slot.roots.runtimeHome;
  if (!workspace || !home || contains(workspace, home) || contains(home, workspace)) throw new Error('Session slot needs disjoint workspace and runtimeHome');
  for (const target of [workspace, home]) {
    if (!isAbsolute(target) || await realpath(target) !== target || !(await lstat(target)).isDirectory()) throw new Error('Session slot roots must be canonical real directories');
    if (contains(target, paths.control) || contains(paths.control, target)) throw new Error('Session slot overlaps evaluator control');
    const entries = await readdir(target);
    if (target === workspace ? entries.length !== 0 : entries.some(entry => entry !== 'tool-output')) throw new Error('Session slot reset left writable state');
    if (target === home && entries.length) {
      const spill = join(home, 'tool-output');
      if (await realpath(spill) !== spill || !(await lstat(spill)).isDirectory() || (await readdir(spill)).length) throw new Error('Session slot reset left tool output state');
    }
  }
  for (const scratch of [paths.workspace, paths.runtimeHome]) {
    if (scratch === workspace || scratch === home || await realpath(scratch) !== scratch || !(await lstat(scratch)).isDirectory()) throw new Error('Session scratch must be an allocated real directory');
  }
  if ((await readdir(paths.runtimeHome)).length) throw new Error('Session runtime scratch contains unexpected state');
  for (const name of await readdir(paths.workspace)) {
    await cp(join(paths.workspace, name), join(workspace, name), { recursive: true, errorOnExist: true, force: false });
  }
  await rm(paths.workspace, { recursive: true });
  await symlink(workspace, paths.workspace);
  await rm(paths.runtimeHome, { recursive: true });
  await symlink(home, paths.runtimeHome);
}
