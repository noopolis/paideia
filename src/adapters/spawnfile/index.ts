/** Optional public compiler interface, loaded only for declared Spawnfile execution. */
export async function loadSpawnfileTraining(): Promise<unknown> {
  const module = await import('spawnfile/training');
  if (typeof module.activateTrainingExecution !== 'function') {
    throw new Error('Installed Spawnfile lacks the training execution receiver');
  }
  return module;
}
