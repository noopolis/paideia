import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { loadSpawnfileTraining } from '../../adapters/index.js';
import { createGrokSlotFreshnessStore, type NativeAdapterOptions } from '../../adapters/daimon-native/index.js';
import { loadTrialSlots } from '../../experiments/index.js';
import type { TrainingConfiguration } from '../../contracts/training-config.js';
import { one, parseArguments, type CliArguments } from '../arguments.js';
import { readCliText } from '../datasets.js';
import type { CliDependencies, CliIO, SpawnfileCliIntegration } from '../types.js';
import { readSpawnfileContext, type SpawnfileTrainingContext } from './context.js';
import { createSpawnfileSessionIntegration, type TrainingSessionOperations, type TrainingSessionMomentHook } from './session.js';

/** Domain authoring/reconstruction only. Generic session operations are never supplied here. */
export interface SpawnfileDeclarationIntegration extends Pick<SpawnfileCliIntegration,
  'id' | 'version' | 'subjectRoot' | 'inferenceExecutionIdentity' | 'judgeCacheRoot' |
  'preparations' | 'unlockedSetupPaths' | 'editPolicies' | 'executionIdentity'> {
  models: TrainingConfiguration['models'];
  prepareCase(input: { moment: unknown; momentRoot: string; example: unknown; role: 'train' | 'validation' | 'test';
    dataset: string; group: string; lineage: string }): Promise<Record<string, unknown>>;
  hooks: Readonly<Record<string, TrainingSessionMomentHook>>;
  /** Private delivery/continuation callbacks; public session operations retain ownership. */
  native?: Pick<NativeAdapterOptions, 'transportDelivery'> & {
    execution?: Pick<NonNullable<NativeAdapterOptions['execution']>, 'externalInputs'>;
  };
}

interface ActivatedExecution {
  identity: unknown;
  execution: { output: string; args: string[]; session?: { slots: number };
    optimizer: { method: string; model: string; variants: number; keep: number; budget: { rounds: number } } };
  args: string[];
  operations: TrainingSessionOperations;
  materializeTrainingCase(input: { moment: Parameters<TrainingSessionMomentHook>[4]; out: string }): Promise<unknown>;
}
interface CompilerApi {
  activateTrainingExecution(input: { execution: unknown; context: SpawnfileTrainingContext;
    prepareCase: SpawnfileDeclarationIntegration['prepareCase'] }): Promise<ActivatedExecution>;
}

/** Runs before dataset parsing: emitted authoring datasets are not Paideia datasets. */
export async function activateSpawnfileDeclaration(args: CliArguments, io: CliIO, dependencies: CliDependencies) {
  if (!args.flags['spawnfile-execution']) return { args, dependencies };
  if (args.command !== 'train' || !args.flags['spawnfile-context']) throw new Error('Spawnfile execution requires train and --spawnfile-context');
  if (args.flags['dry-run']) throw new Error('Spawnfile execution receipts are container-only; use the Spawnfile host dry-run');
  if (dependencies.spawnfile?.trainingSession) throw new Error('An execution receipt cannot be replaced by an injected trainingSession');
  const declaration = dependencies.spawnfileDeclaration;
  if (!declaration?.id.trim() || !declaration.version.trim()) throw new Error('Declared Spawnfile execution requires registered domain hooks');
  const raw = JSON.parse(readCliText(resolve(io.cwd, one(args, 'spawnfile-execution')), 2_000_000)) as unknown;
  const envelope = z.object({ version: z.literal('spawnfile.training-execution.v1'),
    session: z.object({ version: z.literal('spawnfile.training-session.v1'), slots: z.number().int().min(1).max(8) }).strict(),
    args: z.array(z.string()), authoring: z.object({ preparation: z.object({ hook: z.string().min(1) }).passthrough() }).passthrough(),
  }).passthrough().parse(raw);
  const hook = envelope.authoring.preparation.hook;
  if (!Object.hasOwn(declaration.hooks, hook)) throw new Error(`Undeclared training moment hook: ${hook}`);
  const declaredArgs = parseArguments(['train', ...envelope.args]);
  const received = { ...args.flags };
  delete received['spawnfile-context']; delete received['spawnfile-execution'];
  if (!isDeepStrictEqual(received, declaredArgs.flags)) throw new Error('CLI arguments differ from the Spawnfile execution receipt');
  const slots = await loadTrialSlots({ slotsFile: args.flags['slots-file'] ? resolve(io.cwd, one(args, 'slots-file')) : undefined });
  if (slots.slots?.length !== envelope.session.slots) throw new Error('Provisioned slots differ from the declared session');
  io.signal?.throwIfAborted();
  const context = readSpawnfileContext(resolve(io.cwd, one(args, 'spawnfile-context')));
  const api = await loadSpawnfileTraining() as CompilerApi;
  const activated = await api.activateTrainingExecution({ execution: raw, context, prepareCase: input => declaration.prepareCase(input) });
  io.signal?.throwIfAborted();
  if (activated.execution.optimizer.method !== 'gepa') throw new Error('Unsupported declared training optimizer');
  const identity = `sha256:${createHash('sha256').update(JSON.stringify(activated.identity)).digest('hex')}`;
  const { hooks, prepareCase: _prepareCase, models, executionIdentity, native, ...integration } = declaration;
  const session = createSpawnfileSessionIntegration({ integration: { ...integration,
    executionIdentity: async input => `${identity}:${await executionIdentity?.(input) ?? declaration.version}`,
    trainingOptimizer: async () => ({ ...activated.execution.optimizer, method: 'gepa' }),
  }, slots: envelope.session.slots, operations: activated.operations,
  native: { transportDelivery: native?.transportDelivery,
    execution: { externalInputs: native?.execution?.externalInputs } },
  freshness: createGrokSlotFreshnessStore(join(activated.execution.output, '.spawnfile-execution', 'slot-freshness.json')),
  hooks: { [hook]: async (paths, signal, trial, canonical, moment, preparation) => {
    signal.throwIfAborted();
    const momentRoot = join(paths.control, 'moment');
    await activated.materializeTrainingCase({ moment, out: momentRoot });
    signal.throwIfAborted();
    const result = await hooks[hook]!(paths, signal, trial, canonical, { ...moment, momentRoot }, preparation);
    return { ...result, momentReceipt: { version: 'paideia.training-moment-prepared.v1',
      trialId: trial.id, example: moment.example, momentRoot, at: moment.effectiveAt } };
  } } });
  const lowered = parseArguments(['train', ...activated.args]);
  return { args: { ...lowered, training: { models }, flags: { ...lowered.flags,
    'spawnfile-context': args.flags['spawnfile-context']!,
    'bridge-command': lowered.flags['bridge-command'] ?? ['paideia-dspy'],
  } }, dependencies: { ...dependencies, spawnfile: session } };
}
