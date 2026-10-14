import { expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotCandidate } from '../../candidates/index.js';
import { openExperimentStore } from '../../storage/index.js';
import { parseDatasetYaml, resolveDataset, resolveDatasetForCost } from '../../cases/index.js';
import { createEvaluationRegistry } from '../../evaluation/index.js';
import type { SubjectAdapter } from '../../contracts/execution.js';
import { runStoredTrial, type StoredTrialOptions } from './stored.js';
import type { BlobReference } from '../../storage/index.js';

it('runs candidate bytes in a native workspace and persists a protected replayable report', async () => {
  const root = await mkdtemp(join(tmpdir(), 'paideia-stored-'));
  try {
    const source = join(root, 'source'); await mkdir(source);
    await writeFile(join(source, 'AGENTS.md'), 'Write DONE.');
    const candidate = await snapshotCandidate({ sourceRoot: source, resources: [{ id: 'instructions', sourcePath: 'AGENTS.md',
      destinations: [{ kind: 'instructions', path: 'AGENTS.md' }], edit: 'whole-file' }] });
    const storeRoot = join(root, 'store'); const store = await openExperimentStore(storeRoot);
    const record = resolveDataset(parseDatasetYaml(`schema: paideia.dataset.v1
id: suite
checks: [{id: complete, eval: equals, input: output.text, value: DONE}]
records: [{id: case, group: evidence, input: {prompt: complete it}}]
`)).records[0]!;
    let paid = 0;
    const adapter: SubjectAdapter = { id: 'test', capabilities: { toolTrace: 'none', liveObservations: true,
      cancellation: 'process-group', multiTurn: false, resources: ['instructions'], isolation: 'test facade', readIsolation: 'declared-paths', protectedPaths: true },
      async start(input) {
        paid++; expect(input.instructions).toBe('Write DONE.');
        expect(await readFile(join(input.workspacePath, 'AGENTS.md'), 'utf8')).toBe(input.instructions);
        return { async run() { return { status: 'completed', text: 'DONE', usage: null,
          coverage: [{ channel: 'output', completeness: 'complete', ordering: 'source' }] }; },
        async stop(reason) { return { state: 'acknowledged', scope: 'process-group', quiescence: 'confirmed', remoteWork: 'unknown', reason, detail: 'fixture' }; } };
      } };
    const options: StoredTrialOptions = { id: 'run', phase: 'train', datasetId: 'suite', record, candidate, store, storeRoot,
      datasetDigest: 'digest', planDigest: 'plan', adapter, model: 'model', root: join(root, 'trials'), timeoutMs: 2_000,
      registry: createEvaluationRegistry(), evaluation: { judges: {}, embeddings: {}, readText: async () => '' } };
    const costRecord = resolveDatasetForCost(parseDatasetYaml(JSON.stringify({ schema: 'paideia.dataset.v1', id: 'cost',
      checks: [{ id: 'ok', eval: 'equals', input: 'output.text', value: 'DONE' }],
      records: [{ id: 'estimate', input: { prompt: 'Never execute an estimate' } }] }))).records[0]!;
    const createRun = vi.spyOn(store, 'createRun');
    await expect(runStoredTrial({ ...options, record: costRecord as unknown as StoredTrialOptions['record'] })).rejects.toThrow('Cost-only records');
    expect(createRun).not.toHaveBeenCalled(); expect(paid).toBe(0); createRun.mockRestore();
    const report = await runStoredTrial({ ...options, prepareEnvironment: async (paths, signal) => {
      expect(signal.aborted).toBe(false);
      expect(await readFile(join(paths.workspace, 'AGENTS.md'), 'utf8')).toBe('Write DONE.');
      return {};
    } });
    expect(report.status).toBe('pass'); expect(paid).toBe(1);
    const replay = await store.readReplay('run', { audience: 'operator', phase: 'replay' });
    expect(replay.completeness).toBe('complete'); expect(replay.evaluations[0]!.report).toMatchObject({ id: 'run', status: 'pass' });
    expect(replay.events.some(event => (event.payload as { type: string }).type === 'candidate.installed')).toBe(true);
    expect((await store.readReplay('run', { audience: 'viewer', phase: 'replay' })).evaluations).toEqual([]);
    record.setup = { profile: 'native' };
    await expect(runStoredTrial({ ...options, id: 'missing' })).rejects.toThrow('preparation');
    const prepared = await runStoredTrial({ ...options, id: 'prepared', prepareEnvironment: async (paths, _signal, context) => {
      expect(context).toMatchObject({ id: 'prepared', phase: 'train',
        record: { id: 'case', setup: { profile: 'native' } }, candidate: { id: candidate.id }, resources: {} });
      expect(context.candidate.resources[0]!.content).toBe('Write DONE.');
      context.record.context = { leaked: true };
      context.candidate.resources[0]!.content = 'Do something else.';
      await writeFile(join(paths.workspace, 'fixture.txt'), 'environment'); return { tools: [] };
    } });
    expect(prepared.status).toBe('pass');
    expect(prepared.snapshot.context).toEqual({});
    expect(record.context).toEqual({});
    expect(candidate.resources[0]!.content).toBe('Write DONE.');
    const resourcePaths = { archive: source };
    const second = { ...record, id: 'second', context: { edition: '2000-01-02' } };
    const next = await runStoredTrial({ ...options, id: 'next', phase: 'validation', record: second,
      resources: resourcePaths, prepareEnvironment: async (paths, signal, context) => {
        expect(signal.aborted).toBe(false);
        expect(context).toMatchObject({ id: 'next', phase: 'validation',
          record: { id: 'second', context: { edition: '2000-01-02' } }, resources: resourcePaths });
        await writeFile(join(paths.workspace, 'assignment.txt'), context.record.id);
        context.resources.archive = '/changed-only-in-preparer';
        return { tools: [] };
      } });
    expect(next.status).toBe('pass');
    expect(await readFile(join(next.paths.workspace, 'assignment.txt'), 'utf8')).toBe('second');
    expect(resourcePaths.archive).toBe(source);
    const unsupported = await snapshotCandidate({ sourceRoot: source, resources: [{ id: 'support', sourcePath: 'AGENTS.md',
      destinations: [{ kind: 'supporting-files', path: 'support.md' }], edit: 'locked' }] });
    await expect(runStoredTrial({ ...options, id: 'no-instructions', candidate: unsupported })).rejects.toThrow('no native instruction');
    const skills = await snapshotCandidate({ sourceRoot: source, resources: [{ id: 'instruction', sourcePath: 'AGENTS.md',
      destinations: [{ kind: 'instructions', path: 'AGENTS.md' }, { kind: 'native-skills', path: 'skills/write/SKILL.md' }], edit: 'whole-file' }] });
    await expect(runStoredTrial({ ...options, id: 'unsupported', candidate: skills })).rejects.toThrow('does not support');
    expect(paid).toBe(3); expect(await readFile(join(source, 'AGENTS.md'), 'utf8')).toBe('Write DONE.');
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function captureFixture() {
  const root = await mkdtemp(join(tmpdir(), 'paideia-capture-'));
  const source = join(root, 'source'); await mkdir(source);
  await writeFile(join(source, 'AGENTS.md'), 'Write DONE.');
  const candidate = await snapshotCandidate({ sourceRoot: source, resources: [{ id: 'instructions', sourcePath: 'AGENTS.md',
    destinations: [{ kind: 'instructions', path: 'AGENTS.md' }], edit: 'whole-file' }] });
  const storeRoot = join(root, 'store'), store = await openExperimentStore(storeRoot);
  const record = resolveDataset(parseDatasetYaml(JSON.stringify({ schema: 'paideia.dataset.v1', id: 'suite',
    checks: [{ id: 'complete', eval: 'equals', input: 'output.text', value: 'DONE' }],
    records: [{ id: 'case', group: 'evidence', outputs: { proof: 'proof.txt' }, input: { prompt: 'Complete it.' } }] }))).records[0]!;
  let scratch = '';
  const adapter: SubjectAdapter = { id: 'capture-test', capabilities: { toolTrace: 'none', liveObservations: true,
    cancellation: 'process-group', multiTurn: false, resources: ['instructions'], isolation: 'test facade',
    readIsolation: 'declared-paths', protectedPaths: true },
    async start(input) {
      scratch = input.workspacePath;
      return { async run() {
        await writeFile(join(input.workspacePath, 'proof.txt'), 'original proof');
        return { status: 'completed', text: 'DONE', usage: null,
          coverage: [{ channel: 'output', completeness: 'complete', ordering: 'source' }] };
      }, async stop(reason) { return { state: 'acknowledged', scope: 'process-group', quiescence: 'confirmed',
        remoteWork: 'unknown', reason, detail: 'fixture' }; } };
    } };
  const options: StoredTrialOptions = { id: 'capture', phase: 'train', datasetId: 'suite', record, candidate, store, storeRoot,
    datasetDigest: 'digest', planDigest: 'plan', adapter, model: 'model', root: join(root, 'trials'),
    subjectRoot: join(root, 'subject'), timeoutMs: 2_000, registry: createEvaluationRegistry(),
    evaluation: { judges: {}, embeddings: {}, readText: async () => '' } };
  return { root, options, store, scratch: () => scratch };
}

it('durably captures original artifacts before destructive reset, without declaring completion', async () => {
  const f = await captureFixture();
  try {
    const closeEnvironment = vi.fn<NonNullable<StoredTrialOptions['closeEnvironment']>>(async paths => {
      const replay = await f.store.readReplay('capture', { audience: 'operator', phase: 'replay' });
      const capture = replay.events.find(event => (event.payload as { type: string }).type === 'trial.captured');
      expect(capture, 'capture-before-reset guarantee').toBeDefined();
      expect(replay.events.some(event => (event.payload as { type: string }).type === 'trial.completed')).toBe(false);
      const reference = (capture!.payload as { payload: { report: BlobReference } }).payload.report;
      const saved = JSON.parse((await f.store.readBlob(reference, { audience: 'operator', phase: 'replay' })).toString());
      expect(saved.snapshot.artifacts.proof.bytes, 'immutable-capture guarantee').toBe('original proof');
      await writeFile(join(paths.workspace, 'proof.txt'), 'next generation');
      return { generation: 2 };
    });
    await runStoredTrial({ ...f.options, closeEnvironment });
    expect(closeEnvironment).toHaveBeenCalledOnce();
    const replay = await f.store.readReplay('capture', { audience: 'operator', phase: 'replay' });
    const types = replay.events.map(event => (event.payload as { type: string }).type);
    expect(types.indexOf('trial.captured')).toBeLessThan(types.indexOf('environment.closed'));
    expect(types.indexOf('environment.closed')).toBeLessThan(types.indexOf('trial.completed'));
    const capture = replay.events.find(event => (event.payload as { type: string }).type === 'trial.captured')!;
    const reference = (capture.payload as { payload: { report: BlobReference } }).payload.report;
    expect(JSON.parse((await f.store.readBlob(reference, { audience: 'operator', phase: 'replay' })).toString())
      .snapshot.artifacts.proof.bytes).toBe('original proof');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

it.each(['blob', 'capture-event'] as const)('capture persistence failure quarantines evidence before reset: %s', async failure => {
  const f = await captureFixture();
  try {
    if (failure === 'blob') {
      const putBlob = f.store.putBlob;
      vi.spyOn(f.store, 'putBlob').mockImplementation(async (...args) => {
        if (args[2] === 'raw') throw new Error('capture disk failure');
        return putBlob(...args);
      });
    } else {
      const appendEvent = f.store.appendEvent;
      vi.spyOn(f.store, 'appendEvent').mockImplementation(async (...args) => {
        if ((args[1].payload as { type: string }).type === 'trial.captured') throw new Error('capture disk failure');
        return appendEvent(...args);
      });
    }
    const closeEnvironment = vi.fn(async () => ({}));
    const outcome = await runStoredTrial({ ...f.options, closeEnvironment }).then(() => 'completed', () => 'refused');
    expect(closeEnvironment, 'capture-failure-must-prevent-reset guarantee').not.toHaveBeenCalled();
    expect(outcome).toBe('refused');
    expect(await readFile(join(f.scratch(), 'proof.txt'), 'utf8'), 'failed-capture-retains-scratch guarantee').toBe('original proof');
    const replay = await f.store.readReplay('capture', { audience: 'operator', phase: 'replay' });
    expect(replay.events.some(event => (event.payload as { type: string }).type === 'trial.completed')).toBe(false);
    expect(replay.evaluations).toEqual([]);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

it.each(['reset', 'closed-event'] as const)('keeps durable capture without completion when finalization fails: %s', async failure => {
  const f = await captureFixture();
  try {
    if (failure === 'closed-event') {
      const appendEvent = f.store.appendEvent;
      vi.spyOn(f.store, 'appendEvent').mockImplementation(async (...args) => {
        if ((args[1].payload as { type: string }).type === 'environment.closed') throw new Error('closure disk failure');
        return appendEvent(...args);
      });
    }
    await expect(runStoredTrial({ ...f.options, closeEnvironment: async paths => {
      if (failure === 'reset') throw new Error('reset failure');
      await rm(paths.workspace, { recursive: true });
      return { generation: 2 };
    } })).rejects.toThrow('failure');
    const replay = await f.store.readReplay('capture', { audience: 'operator', phase: 'replay' });
    const capture = replay.events.find(event => (event.payload as { type: string }).type === 'trial.captured')!;
    const reference = (capture.payload as { payload: { report: BlobReference } }).payload.report;
    expect(JSON.parse((await f.store.readBlob(reference, { audience: 'operator', phase: 'replay' })).toString())
      .snapshot.artifacts.proof.bytes).toBe('original proof');
    expect(replay.events.some(event => (event.payload as { type: string }).type === 'trial.completed')).toBe(false);
    expect(replay.evaluations).toEqual([]);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
