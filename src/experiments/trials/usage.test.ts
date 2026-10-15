import { afterEach, expect, it, vi } from 'vitest';
import type { Usage } from '../../contracts/execution.js';
import * as evaluation from '../../evaluation/index.js';
import { summarizeCosts } from '../costs/index.js';
import { runTrial } from './trial.js';
import { complete, setup } from './fixture.js';

const usage: Usage = { inputTokens: 2000, cachedInputTokens: 1000, cacheWriteInputTokens: 0,
  outputTokens: 20, reasoningTokens: null, source: 'synthetic-native-total' };
afterEach(() => { vi.restoreAllMocks(); });

it('retains and persists a returned native result before a post-turn collector fails', async () => {
  const native = { ...complete, usage, coverage: [...complete.coverage,
    { channel: 'usage' as const, completeness: 'complete' as const, ordering: 'source' as const }] };
  const task = await setup(async () => native);
  task.options.prepare = async () => ({ instructions: 'original instructions', collect: async () => { throw new Error('Receipt rejected'); } });
  const report = await runTrial(task.options);
  expect(report.execution).toBe('failed');
  expect(report.failureKind).toBe('measurement');
  expect(report.snapshot.subjectUsage).toEqual({ status: 'incomplete', usage });
  expect(report.turns).toHaveLength(1);
  expect(report.turns[0]!.native).toEqual(native);
  expect(task.journal.find(row => row.type === 'turn.native-result')?.payload).toEqual({ id: 'task', native });
  expect(report.snapshot.coverage).toContainEqual(native.coverage[2]);
  expect(summarizeCosts([report], { subjectModel: 'unknown-test-model' }).entries[0]!.usage).toEqual(usage);
});

it.each(['throw', 'failed-return'] as const)('preserves usage observed before collector rejection and native %s', async outcome => {
  const task = await setup(async (input, turn) => {
    try {
      await input.onObservation({ id: 'observed-total', source: 'synthetic-native', seq: 1, type: 'usage', usage,
        trialId: input.trialId, wakeId: turn.id, timestamp: new Date().toISOString() });
    } catch (error) {
      if (outcome === 'throw') throw error;
      return { ...complete, status: 'failed', usage: null, error: String(error) };
    }
    throw new Error('Collector must have rejected the observation');
  });
  task.options.prepare = async () => ({ instructions: 'original instructions', collect: async () => { throw new Error('Receipt rejected'); } });
  const report = await runTrial(task.options);
  expect(report.execution).toBe('failed');
  expect(report.failureKind).toBe('native-infrastructure');
  expect(report.snapshot.events).toHaveLength(1);
  expect(report.snapshot.subjectUsage).toEqual({ status: 'incomplete', usage: null });
  expect(report.snapshot.events[0]!.usage).toEqual(usage);
  expect(task.journal.some(row => row.type === 'observation')).toBe(true);
  const costs = summarizeCosts([report], { subjectModel: 'unknown-test-model' });
  expect(costs.entries).toHaveLength(1);
  expect(costs.entries[0]!.usage).toEqual(usage);
  expect(costs.completeness).toBe('incomplete');
  expect(costs.apiEquivalentUsd).toBeNull();
});

it.each(['cancelled', 'failed', 'completed', 'deferred'] as const)(
  'classifies final evaluation failure after a %s native turn by completed work', async outcome => {
    const task = await setup(async () => ({ ...complete, status: outcome === 'deferred' ? 'failed' : outcome,
      ...(outcome === 'deferred' ? { blocked: 'awaiting-external-input' as const } : {}) }));
    vi.spyOn(evaluation, 'evaluatePlan').mockRejectedValueOnce(new Error('evaluator unavailable'));
    const report = await runTrial(task.options);
    expect(report).toMatchObject({ execution: 'failed', error: 'Final evaluation failed: Error: evaluator unavailable',
      failureKind: outcome === 'completed' || outcome === 'deferred' ? 'measurement' : 'native-infrastructure' });
  });

it.each(['cancelled', 'failed', 'completed', 'deferred'] as const)(
  'classifies final collection failure after a %s native turn by completed work', async outcome => {
    const task = await setup(async () => ({ ...complete, status: outcome === 'deferred' ? 'failed' : outcome,
      ...(outcome === 'deferred' ? { blocked: 'awaiting-external-input' as const } : {}) }));
    let collections = 0;
    task.options.prepare = async () => ({ instructions: 'Write', collect: async () => {
      if (++collections === 2) throw new Error('executionId absent');
      return {};
    } });
    const report = await runTrial(task.options);
    expect(report).toMatchObject({ execution: 'failed', error: 'Final collection failed: Error: executionId absent',
      failureKind: outcome === 'completed' || outcome === 'deferred' ? 'measurement' : 'native-infrastructure' });
  });
