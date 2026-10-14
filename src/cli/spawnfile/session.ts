import { join } from 'node:path';
import { lstat, readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { createDaimonNativeAdapter, type GrokSlotFreshnessStore, type NativeAdapterOptions } from '../../adapters/daimon-native/index.js';
import type { TrialSlot } from '../../contracts/trial-slot.js';
import type { NativePreparationContext, TrialPaths } from '../../experiments/index.js';
import type { SpawnfileCliIntegration } from '../types.js';
import type { SpawnfileTrainingContext } from './context.js';
import type { TrainingMomentCase, TrainingMomentPreparation } from './moments.js';
import { bindTrainingSessionPaths } from './session-paths.js';
import { captureTrainingSessionReceipt } from './session-evidence.js';

export interface TrainingCandidateCompilation {
  projectRoot: string; compiledRoot: string; reportPath: string;
  agent: { id: string; outputDirectory: string };
  resources: { sourcePath: string; sha256: string }[];
  native?: { configPath: string; configSha256: string };
}
export interface TrainingSlotReset {
  slot: TrialSlot; generation: number; nonce: string; receipt: string;
  declaration: { slots: number; agentId: string; engine: string; model: string };
  broker: Readonly<Record<string, unknown>>;
}
export interface TrainingSessionOperations {
  /** Public Spawnfile compiler; no alternate agent definition or credential copy. */
  compileTrainingCandidate(input: { context: SpawnfileTrainingContext;
    resources: readonly { sourcePath: string; sourceContent: string; content: string; edit: 'editable' | 'locked' }[];
    out: string; signal?: AbortSignal }): Promise<TrainingCandidateCompilation>;
  /** Public supervisor recycle operation; one authority covers every leased slot. */
  prepareTrainingSessionSlot(input: { slot: TrialSlot; slots: number; signal: AbortSignal;
    expectedNonce: string; minGeneration: number }): Promise<TrainingSlotReset>;
}
export interface TrainingSessionPreparation {
  compilation: TrainingCandidateCompilation;
  reset: TrainingSlotReset;
}
export type TrainingSessionMomentHook = (
  paths: TrialPaths, signal: AbortSignal, trial: NativePreparationContext,
  context: SpawnfileTrainingContext, moment: TrainingMomentCase, session: TrainingSessionPreparation,
) => ReturnType<TrainingMomentPreparation>;
export interface SpawnfileSessionConfiguration {
  integration: Omit<SpawnfileCliIntegration, 'createAdapter' | 'prepareEnvironment' | 'momentPreparations' | 'closeEnvironment'>;
  slots: number;
  operations: TrainingSessionOperations;
  freshness: GrokSlotFreshnessStore;
  hooks: Readonly<Record<string, TrainingSessionMomentHook>>;
  native?: Omit<NativeAdapterOptions, 'execution' | 'docker'> & {
    execution?: Omit<NonNullable<NativeAdapterOptions['execution']>, 'grokSlots' | 'kind'>;
  };
  cleanupTimeoutMs?: number;
}

/** One container owns the broker; Paideia owns leases and the native child lifecycle. */
export function createSpawnfileSessionIntegration(configuration: SpawnfileSessionConfiguration): SpawnfileCliIntegration {
  if (!Number.isInteger(configuration.slots) || configuration.slots < 1 || configuration.slots > 8) throw new Error('Invalid session slot count');
  const cleanupTimeoutMs = configuration.cleanupTimeoutMs ?? 30_000;
  if (!Number.isSafeInteger(cleanupTimeoutMs) || cleanupTimeoutMs < 1 || cleanupTimeoutMs > 120_000) throw new Error('Invalid session cleanup deadline');
  const active = new Map<string, TrainingSlotReset>();
  const reset = async (slot: TrialSlot, signal: AbortSignal, expected: { agentId: string; engine: string; model: string }): Promise<TrainingSlotReset> => {
    if (slot.index >= configuration.slots) throw new Error('Lease exceeds declared session slots');
    signal.throwIfAborted();
    const freshness = await configuration.freshness.request(slot.index);
    const result = await configuration.operations.prepareTrainingSessionSlot({ slot, slots: configuration.slots, signal, ...freshness });
    signal.throwIfAborted();
    if (!isDeepStrictEqual(result.slot, slot) || result.nonce !== freshness.expectedNonce ||
        !Number.isSafeInteger(result.generation) || result.generation < freshness.minGeneration || !result.receipt) {
      throw new Error('Session reset receipt does not bind the fresh leased slot');
    }
    if (result.declaration.slots !== configuration.slots || result.declaration.agentId !== expected.agentId ||
        result.declaration.engine !== expected.engine || result.declaration.model !== expected.model) throw new Error('Session broker differs from the canonical agent');
    return result;
  };
  const momentPreparations = Object.fromEntries(Object.entries(configuration.hooks).map(([name, hook]) => [name,
    async (paths: TrialPaths, signal: AbortSignal, trial: NativePreparationContext, context: SpawnfileTrainingContext, moment: TrainingMomentCase) => {
      if (!trial.slot || active.has(trial.id)) throw new Error('Session trial requires one exclusive lease');
      const recycled = await reset(trial.slot, signal, { agentId: context.agent.id, engine: context.agent.engine ?? '', model: context.agent.model?.name ?? '' });
      const preflight = await captureTrainingSessionReceipt(recycled.receipt);
      active.set(trial.id, recycled);
      await bindTrainingSessionPaths(paths, trial.slot, configuration.integration.subjectRoot);
      const compilation = await configuration.operations.compileTrainingCandidate({ context,
        resources: trial.candidate.resources.map(({ sourcePath, sourceContent, content, edit }) => ({ sourcePath, sourceContent, content,
          edit: edit === 'locked' ? 'locked' : 'editable' })), out: join(paths.control, 'compiled'), signal });
      if (!compilation.native || compilation.agent.id !== context.agent.id) throw new Error('Session compilation lacks the selected native agent');
      const compiledResources = compilation.resources.map(resource => [resource.sourcePath, resource.sha256]).sort();
      const candidateResources = trial.candidate.resources.map(resource => [resource.sourcePath, resource.digest]).sort();
      if (!isDeepStrictEqual(compiledResources, candidateResources)) throw new Error('Session compilation differs from candidate resources');
      signal.throwIfAborted();
      const prepared = await hook(paths, signal, trial, context, moment, { compilation, reset: recycled });
      const launchFile = join(paths.runtimeHome, 'native-launch.json');
      const info = await lstat(launchFile);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 65536) throw new Error('Session native launch must be a bounded regular file');
      const launch = JSON.parse(await readFile(launchFile, 'utf8')) as { sourceConfigSha256?: string; taskClock?: { origin?: string }; agent?: { id?: string; engine?: string; model?: string } };
      if (launch.sourceConfigSha256 !== compilation.native.configSha256.replace(/^sha256:/u, '')) throw new Error('Session native source config differs from candidate compilation');
      if (launch.agent?.id !== context.agent.id || launch.agent.engine !== context.agent.engine || launch.agent.model !== context.agent.model?.name) throw new Error('Session native launch differs from the canonical agent');
      if (launch.taskClock?.origin !== moment.effectiveAt) throw new Error('Session task clock differs from the authored moment');
      return { ...prepared, evidence: { schema: 'paideia.training-session-prepared.v1', trialId: trial.id,
        candidateId: trial.candidate.id, example: moment.example, at: moment.effectiveAt,
        slot: trial.slot.index, generation: recycled.generation, receipt: preflight,
        ...(prepared.evidence === undefined ? {} : { domain: prepared.evidence }),
        compilation: { reportPath: compilation.reportPath, configSha256: compilation.native.configSha256, resources: compilation.resources } } };
    }]));
  return { ...configuration.integration, momentPreparations,
    createAdapter(_context, options) {
      const { execution, ...native } = configuration.native ?? {};
      return createDaimonNativeAdapter({ ...native, timeoutMs: options.timeoutMs,
        execution: { ...execution, kind: 'child-process', grokSlots: configuration.freshness } });
    },
    async prepareEnvironment() { throw new Error('Session trials require an authored training moment'); },
    closeEnvironment: async (_paths, trial, report) => {
      const previous = active.get(trial.id);
      if (!previous || !trial.slot || report.hostWork !== 'settled' || report.stop?.state !== 'acknowledged' || report.stop.quiescence !== 'confirmed') {
        throw new Error('Session native closure unverified; leased slot remains quarantined');
      }
      const recycled = await reset(trial.slot, AbortSignal.timeout(cleanupTimeoutMs), previous.declaration);
      if (recycled.generation <= previous.generation) throw new Error('Session post-trial reset did not advance generation');
      const preflight = await captureTrainingSessionReceipt(recycled.receipt);
      await configuration.freshness.accept(trial.slot.index, { nonce: recycled.nonce, generation: recycled.generation });
      active.delete(trial.id);
      return { schema: 'paideia.training-session-closed.v1', trialId: trial.id, slot: trial.slot.index,
        generation: recycled.generation, receipt: preflight, closure: report.stop };
    },
  };
}
