import { expect, it, vi } from 'vitest';
import { loadSpawnfileTraining } from './index.js';

const external = vi.hoisted(() => ({ activateTrainingExecution: undefined as unknown }));
vi.mock('spawnfile/training', () => external);
it('requires the installed public execution receiver capability', async () => {
  await expect(loadSpawnfileTraining()).rejects.toThrow('lacks the training execution receiver');
  external.activateTrainingExecution = () => undefined;
  expect((await loadSpawnfileTraining() as typeof external).activateTrainingExecution).toBe(external.activateTrainingExecution);
});
