export { main } from './commands.js';
export type { CliIO, CliDependencies, InvocationIndex, SpawnfileCliIntegration, CliExecutionIdentityContext } from './types.js';
export type { SpawnfileTrainingContext } from './spawnfile/index.js';
export { launch } from './launch.js';

export type { TrainingMomentCase, TrainingMomentReceipt, TrainingMomentPreparation } from './spawnfile/index.js';
export { spawnfileEnvironment } from './spawnfile/index.js';
export { createSpawnfileSessionIntegration } from './spawnfile/index.js';
export type { SpawnfileSessionConfiguration, TrainingSessionOperations, TrainingSessionMomentHook,
  TrainingSessionPreparation, TrainingSlotReset, TrainingCandidateCompilation } from './spawnfile/index.js';
export type { SpawnfileDeclarationIntegration } from './spawnfile/index.js';
