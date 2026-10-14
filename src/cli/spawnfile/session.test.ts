import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { parseDatasetYaml, resolveDataset } from '../../cases/index.js';
import { snapshotCandidate, deriveCandidate, candidateComponents } from '../../candidates/index.js';
import { SlotPool, runStoredTrial, type NativePreparationContext } from '../../experiments/index.js';
import { createEvaluationRegistry } from '../../evaluation/index.js';
import { openExperimentStore } from '../../storage/index.js';
import type { TrialSlot } from '../../contracts/trial-slot.js';
import { prepareNative } from '../native.js';
import { parseArguments } from '../arguments.js';
import * as nativeAdapters from '../../adapters/daimon-native/index.js';
import { main } from '../commands.js';
import { cliFixture, fixtureAdapter } from '../fixture.js';
import { contextFixture } from './fixture.js';
import { spawnfileEnvironment, type TrainingMomentCase } from './moments.js';
import { createSpawnfileSessionIntegration, type SpawnfileSessionConfiguration, type TrainingSessionMomentHook } from './session.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const f = await contextFixture(); roots.push(f.root);
  const candidate = await snapshotCandidate({ sourceRoot: f.root, resources: [{ id: 'instructions', sourcePath: 'AGENTS.md',
    edit: 'whole-file', destinations: [{ kind: 'instructions', path: 'AGENTS.md' }] }] });
  const slots: TrialSlot[] = [];
  for (let index = 0; index < 2; index++) {
    const base = join(f.root, `slot-${index}`); await mkdir(base);
    const slot = { index, workerUid: 1100 + index, ports: { base: 4000 + index * 10, count: 10 }, roots: {
      workspace: join(base, 'workspace'), runtimeHome: join(base, 'home'), controlRoot: join(base, 'control') } };
    await Promise.all(Object.values(slot.roots).map(path => mkdir(path)));
    slots.push(slot);
  }
  const record = resolveDataset(parseDatasetYaml(JSON.stringify({ schema: 'paideia.dataset.v1', id: 'cases',
    checks: [{ id: 'done', eval: 'equals', input: 'output.text', value: 'OK' }], records: [
      { id: 'moment', group: 'family', lineage: ['original'], input: { prompt: 'Wake.' } }] }))).records[0]!;
  const moment: TrainingMomentCase = { version: 'spawnfile.training-moment-case.v1', projectRoot: f.root, agent: f.context.agent.id,
    example: 'train:moment', role: 'train', dataset: 'declared', at: '2026-01-01T12:00:00Z', effectiveAt: '2026-01-01T12:00:01Z',
    wake: { surface: 'moltnet', room: 'work', from: 'editor', text: 'Wake.' }, group: 'family', lineage: 'original',
    momentRoot: join(f.root, 'lowered'), hook: 'declared/reconstruct' };
  record.setup = { trainingMoment: moment };
  const generations = new Map<number, number>(), floors = new Map<number, number>(), pending = new Map<number, string>();
  let serial = 0;
  const operations: SpawnfileSessionConfiguration['operations'] = {
    compileTrainingCandidate: vi.fn<SpawnfileSessionConfiguration['operations']['compileTrainingCandidate']>(async input => ({ projectRoot: input.out, compiledRoot: join(input.out, 'native'),
      reportPath: join(input.out, 'report.json'), agent: { id: f.context.agent.id, outputDirectory: input.out },
      resources: input.resources.map(resource => ({ sourcePath: resource.sourcePath, sha256: `sha256:${createHash('sha256').update(resource.content).digest('hex')}` })),
      native: { configPath: join(input.out, 'config.json'), configSha256: 'sha256:compiled-config' } })),
    prepareTrainingSessionSlot: vi.fn<SpawnfileSessionConfiguration['operations']['prepareTrainingSessionSlot']>(async input => {
      for (const path of [input.slot.roots.workspace!, input.slot.roots.runtimeHome!]) {
        await rm(path, { recursive: true }); await mkdir(path);
      }
      const generation = (generations.get(input.slot.index) ?? 0) + 1; generations.set(input.slot.index, generation);
      const receipt = join(f.root, `receipt-${input.slot.index}.json`);
      await writeFile(receipt, JSON.stringify({ generation }));
      return { slot: input.slot, generation, nonce: input.expectedNonce, receipt, broker: {},
        declaration: { slots: 2, agentId: f.context.agent.id, engine: f.context.agent.engine!, model: f.context.agent.model!.name } };
    }),
  };
  const configuration: SpawnfileSessionConfiguration = { integration: { id: 'declared', version: '1' }, slots: 2, operations,
    freshness: { request: vi.fn(async slot => {
      const expectedNonce = String(++serial); pending.set(slot, expectedNonce);
      return { expectedNonce, minGeneration: (floors.get(slot) ?? 0) + 1 };
    }), accept: vi.fn(async (slot, receipt) => {
      expect(receipt.nonce).toBe(pending.get(slot)); expect(receipt.generation).toBeGreaterThan(floors.get(slot) ?? 0);
      floors.set(slot, receipt.generation); pending.delete(slot);
    }) },
    hooks: { 'declared/reconstruct': vi.fn<TrainingSessionMomentHook>(async (paths, _signal, trial, _context, moment, session) => {
      expect(await readFile(join(paths.workspace, 'AGENTS.md'), 'utf8')).toBe(trial.candidate.resources[0]!.content);
      expect(session.compilation.native?.configSha256).toBe('sha256:compiled-config');
      const momentRoot = join(paths.control, 'moment'); await mkdir(momentRoot);
      await writeFile(join(momentRoot, 'moment.json'), JSON.stringify({ version: 'spawnfile.materialized-moment.v1', status: 'materialized',
        agent: moment.agent, example: { id: trial.record.id, role: moment.role, dataset: moment.dataset }, at: moment.at,
        effectiveAt: moment.effectiveAt, leakCheck: { ok: true } }));
      await writeFile(join(momentRoot, 'leak-check.json'), JSON.stringify({ ok: true }));
      await writeFile(join(paths.runtimeHome, 'native-launch.json'), JSON.stringify({ sourceConfigSha256: 'compiled-config', agent: { id: f.context.agent.id, engine: f.context.agent.engine, model: f.context.agent.model!.name }, taskClock: { origin: moment.effectiveAt } }));
      return { momentReceipt: { version: 'paideia.training-moment-prepared.v1', trialId: trial.id, example: moment.example,
        momentRoot, at: moment.effectiveAt }, collect: async () => ({}) };
    }) },
  };
  const integration = createSpawnfileSessionIntegration(configuration);
  const storeRoot = join(f.root, 'store'), store = await openExperimentStore(storeRoot);
  const pool = new SlotPool(slots);
  const run = async (id: string, slot: TrialSlot, selected = candidate) => runStoredTrial({ id, phase: 'train', record,
    datasetId: 'cases', datasetDigest: 'dataset', planDigest: 'plan', candidate: selected, store, storeRoot, root: join(f.root, 'trials'),
    slot, model: 'model', timeoutMs: 2000, adapter: fixtureAdapter('fake-native', [], 'pass'), registry: createEvaluationRegistry(),
    evaluation: { judges: {}, embeddings: {}, readText: async () => '' },
    prepareEnvironment: spawnfileEnvironment(integration, f.context), closeEnvironment: async (...args) => {
      if (args[2].execution !== 'completed') throw new Error(`Unexpected fixture trial: ${args[2].error}`);
      return integration.closeEnvironment!(...args);
    } });
  const trial: NativePreparationContext = { id: 'trial', phase: 'train', record, candidate, resources: {}, slot: slots[0] };
  const paths = async () => {
    const root = await mkdtemp(join(tmpdir(), 'session-paths-')); roots.push(root);
    const paths = { root, workspace: join(root, 'workspace'), runtimeHome: join(root, 'runtime'), control: join(root, 'control') };
    await Promise.all([paths.workspace, paths.runtimeHome, paths.control].map(path => mkdir(path)));
    await writeFile(join(paths.workspace, 'AGENTS.md'), candidate.resources[0]!.content);
    return paths;
  };
  return { ...f, slots, integration, configuration, operations, candidate, trial, paths, run, store, pool, floors };
}

it('runs simultaneous leased trials, persists preparation/reset evidence, then reuses a clean slot', async () => {
  const f = await fixture();
  const leases = await Promise.all([f.pool.acquire(), f.pool.acquire()]);
  let waitingAdmitted = false;
  const waiting = f.pool.acquire().then(lease => { waitingAdmitted = true; return lease; });
  await Promise.resolve(); expect(waitingAdmitted).toBe(false);
  const reports = await Promise.all(leases.map((lease, index) => f.run(`trial-${index}`, lease.slot)));
  expect(reports.map(report => report.execution)).toEqual(['completed', 'completed']);
  expect(f.operations.compileTrainingCandidate).toHaveBeenCalledTimes(2);
  expect(f.operations.prepareTrainingSessionSlot).toHaveBeenCalledTimes(4);
  for (const [index, lease] of leases.entries()) {
    expect(await readFile(join(f.root, `receipt-${index}.json`), 'utf8')).toContain('2');
    const replay = await f.store.readReplay(`trial-${index}`, { audience: 'operator', phase: 'replay' });
    const events = replay.events.map(event => (event.payload as { type: string }).type);
    expect(events).toContain('environment.prepared'); expect(events).toContain('environment.closed');
    expect(events.indexOf('environment.closed')).toBeLessThan(events.indexOf('trial.completed'));
    const preparation = replay.events.find(event => (event.payload as { type: string }).type === 'environment.prepared')!;
    const evidence = (preparation.payload as { evidence: { receipt: { content: string; sourcePath: string } } }).evidence;
    expect(JSON.parse(Buffer.from(evidence.receipt.content ?? '', 'base64').toString() || '{}').generation,
      'original-preflight-survives-reset guarantee').toBe(1);
    lease.release(true);
  }
  const again = await waiting;
  expect(await f.run('again', again.slot)).toMatchObject({ execution: 'completed' });
  expect(f.floors.get(again.slot.index)).toBe(4); again.release(true);
  const original = await f.store.readReplay('trial-0', { audience: 'operator', phase: 'replay' });
  const preparation = original.events.find(event => (event.payload as { type: string }).type === 'environment.prepared')!;
  const receipt = (preparation.payload as { evidence: { receipt: { content: string } } }).evidence.receipt;
  expect(JSON.parse(Buffer.from(receipt.content, 'base64').toString()).generation).toBe(1);
  expect(f.integration.createAdapter(f.context, { model: 'model', timeoutMs: 2000 }).id).toBe('daimon-native');
});

it.each(['nonce', 'generation', 'slot', 'receipt'] as const)('rejects reset evidence mutation: %s before compilation', async mutation => {
  const f = await fixture(), original = f.operations.prepareTrainingSessionSlot;
  f.operations.prepareTrainingSessionSlot = async input => {
    const result = await original(input);
    if (mutation === 'nonce') result.nonce = 'stale';
    if (mutation === 'generation') result.generation = 0;
    if (mutation === 'slot') result.slot = { ...result.slot, workerUid: 9999 };
    if (mutation === 'receipt') result.receipt = '';
    return result;
  };
  const accepted = await spawnfileEnvironment(f.integration, f.context)(await f.paths(), new AbortController().signal, f.trial).then(() => true, () => false);
  expect(accepted, `reset ${mutation} guarantee`).toBe(false);
  expect(f.operations.compileTrainingCandidate).not.toHaveBeenCalled();
});

it('refuses missing leases, legacy cases, invalid slot counts and cleanup deadlines', async () => {
  const f = await fixture();
  for (const slots of [0, 9, 1.5]) expect(() => createSpawnfileSessionIntegration({ ...f.configuration, slots })).toThrow('slot count');
  for (const cleanupTimeoutMs of [0, 120001]) expect(() => createSpawnfileSessionIntegration({ ...f.configuration, cleanupTimeoutMs })).toThrow('cleanup deadline');
  await expect(spawnfileEnvironment(f.integration, f.context)(await f.paths(), new AbortController().signal,
    { ...f.trial, slot: undefined })).rejects.toThrow('exclusive lease');
  await expect(f.integration.prepareEnvironment(await f.paths(), new AbortController().signal, f.trial, f.context)).rejects.toThrow('authored');
  await expect(spawnfileEnvironment(f.integration, f.context)(await f.paths(), new AbortController().signal,
    { ...f.trial, slot: { ...f.slots[0]!, index: 2 } })).rejects.toThrow('exceeds');
});

it.each(['clock', 'missing-clock', 'native', 'agent', 'source-digest', 'resources'] as const)('rejects preparation mutation: %s before execution', async mutation => {
  const f = await fixture();
  if (mutation === 'native' || mutation === 'agent' || mutation === 'resources') {
    const original = f.operations.compileTrainingCandidate;
    f.operations.compileTrainingCandidate = async input => {
      const result = await original(input);
      if (mutation === 'native') delete result.native;
      else if (mutation === 'agent') result.agent.id = 'foreign';
      else result.resources = [];
      return result;
    };
  } else {
    const original = f.configuration.hooks['declared/reconstruct']!;
    f.configuration.hooks = { 'declared/reconstruct': async (...args) => {
      const prepared = await original(...args);
      await writeFile(join(args[0].runtimeHome, 'native-launch.json'), JSON.stringify({ sourceConfigSha256: mutation === 'source-digest' ? 'foreign' : 'compiled-config', agent: { id: f.context.agent.id, engine: f.context.agent.engine, model: f.context.agent.model!.name }, ...(mutation === 'missing-clock' ? {} : { taskClock: { origin: mutation === 'clock' ? 'wrong' : args[4].effectiveAt } }) }));
      return prepared;
    } };
    f.integration = createSpawnfileSessionIntegration(f.configuration);
  }
  const accepted = await spawnfileEnvironment(f.integration, f.context)(await f.paths(), new AbortController().signal, f.trial).then(() => true, () => false);
  expect(accepted, `prepared ${mutation} guarantee`).toBe(false);
});

it('refuses unverified closure and does not reset or publish a completed trial when reset fails', async () => {
  const f = await fixture();
  await expect(f.integration.closeEnvironment!(await f.paths(), f.trial, {} as never)).rejects.toThrow('closure unverified');
  const original = f.operations.prepareTrainingSessionSlot;
  let resets = 0;
  f.operations.prepareTrainingSessionSlot = async input => {
    if (++resets > 1) throw new Error('supervisor refused reset');
    return original(input);
  };
  const lease = await f.pool.acquire();
  await expect(f.run('failed', lease.slot)).rejects.toThrow('supervisor refused reset');
  lease.release(false);
  const replay = await f.store.readReplay('failed', { audience: 'operator', phase: 'replay' });
  expect(replay.evaluations).toEqual([]);
  expect(replay.events.some(event => (event.payload as { type: string }).type === 'trial.completed'), 'reset-before-completion guarantee').toBe(false);
  const remaining = await f.pool.acquire(); expect(remaining.slot.index).toBe(1); remaining.release(true);
});

it('compiles a derived AGENTS overlay for each trial while keeping canonical bytes pinned', async () => {
  const f = await fixture(), component = candidateComponents(f.candidate)[0]!;
  const variant = deriveCandidate(f.candidate, f.candidate, { [component.id]: 'IMPROVED instructions.' });
  const lease = await f.pool.acquire();
  await f.run('variant', lease.slot, variant);
  expect(f.operations.compileTrainingCandidate).toHaveBeenCalledWith(expect.objectContaining({ resources: [{
    sourcePath: 'AGENTS.md', sourceContent: 'Write clearly.\n', content: 'IMPROVED instructions.', edit: 'editable',
  }] }));
  expect(await readFile(join(f.root, 'AGENTS.md'), 'utf8')).toBe('Write clearly.\n');
  lease.release(true);
});

it('forwards private delivery and continuation callbacks to the native adapter while fixing child execution and public freshness', async () => {
  const f = await fixture();
  const transportDelivery = { prepare: vi.fn(async () => ({ source: {}, publish: vi.fn() })) };
  const externalInputs = { maxDeliveries: 1, next: vi.fn(async () => null) };
  f.configuration.native = { transportDelivery, execution: { externalInputs } } as unknown as SpawnfileSessionConfiguration['native'];
  const create = vi.spyOn(nativeAdapters, 'createDaimonNativeAdapter').mockReturnValue(fixtureAdapter('native-fake', []));
  try {
    createSpawnfileSessionIntegration(f.configuration).createAdapter!(f.context, { timeoutMs: 2000, model: 'model' });
    expect(create).toHaveBeenCalledWith({ transportDelivery, timeoutMs: 2000,
      execution: { externalInputs, kind: 'child-process', grokSlots: f.configuration.freshness } });
  } finally { create.mockRestore(); }
});

it('automatically composes a declared trainingSession in native CLI preparation without invoking legacy factories', async () => {
  const f = await fixture();
  const { integration: _base, ...trainingSession } = f.configuration;
  const legacyAdapter = vi.fn(() => { throw new Error('Legacy adapter must not execute'); });
  const legacyPreparation = vi.fn(async () => { throw new Error('Legacy preparation must not execute'); });
  const native = await prepareNative(parseArguments(['evaluate', 'cases.yaml', '--spawnfile-context', f.path, '--out', 'out']),
    { cwd: f.root, stdout() {}, stderr() {} }, { spawnfile: { id: 'declared', version: '1', trainingSession,
      createAdapter: legacyAdapter, prepareEnvironment: legacyPreparation } }, 2000);
  expect(native.adapter.id).toBe('daimon-native'); expect(native.closeEnvironment).toBeTypeOf('function');
  expect(legacyAdapter).not.toHaveBeenCalled(); expect(legacyPreparation).not.toHaveBeenCalled();
  const paths = await f.paths();
  expect(await native.prepareEnvironment!(paths, new AbortController().signal, f.trial)).toMatchObject({
    evidence: { schema: 'paideia.training-session-prepared.v1', example: 'train:moment', slot: 0 } });
  expect(f.operations.compileTrainingCandidate).toHaveBeenCalledOnce();
  await native.closeInference();
});

it.each(['slots', 'agentId', 'engine', 'model'] as const)('binds broker declaration to canonical context: %s', async field => {
  const f = await fixture(), original = f.operations.prepareTrainingSessionSlot;
  f.operations.prepareTrainingSessionSlot = async input => {
    const result = await original(input);
    if (field === 'slots') result.declaration.slots = 1;
    else result.declaration[field] = 'foreign';
    return result;
  };
  const accepted = await spawnfileEnvironment(f.integration, f.context)(await f.paths(), new AbortController().signal, f.trial)
    .then(() => true, () => false);
  expect(accepted, `broker ${field} mismatch must fail before compilation`).toBe(false);
  expect(f.operations.compileTrainingCandidate).not.toHaveBeenCalled();
});

it('runs the native CLI training path through the shared session with fake cognition and real DSPy scheduling', async () => {
  const f = await fixture(), cli = await cliFixture(); roots.push(cli.root);
  const observed: string[] = [];
  const create = vi.spyOn(nativeAdapters, 'createDaimonNativeAdapter').mockImplementation(() => {
    const adapter = fixtureAdapter('session-native-fake', observed);
    return { ...adapter, capabilities: { ...adapter.capabilities, resources: ['instructions', 'supporting-files', 'native-skills'] } };
  });
  try {
    const { integration: _base, ...trainingSession } = f.configuration;
    const dataset = (role: 'train' | 'test', ids: string[]) => JSON.stringify({ schema: 'paideia.dataset.v1', id: role,
      setup: { profile: 'declared/reconstruct' }, checks: [{ id: 'done', eval: 'equals', input: 'output.text', value: 'OK' }],
      records: ids.map(id => ({ id, group: id, lineage: [id], input: { prompt: 'Wake.' }, setup: { trainingMoment: {
        ...f.trial.record.setup!.trainingMoment as TrainingMomentCase, example: `${role}:${id}`, role,
        dataset: role, group: id, lineage: id,
      } } })) });
    await writeFile(join(f.root, 'train.yaml'), dataset('train', ['learning', 'selection']));
    await writeFile(join(f.root, 'test.yaml'), dataset('test', ['sealed']));
    const slotsFile = join(f.root, 'slots.json');
    await writeFile(slotsFile, JSON.stringify({ schema: 'spawnfile.training-slots.v1', slots: f.slots }), { mode: 0o400 });
    const stdout: string[] = [], stderr: string[] = [];
    const legacy = vi.fn(() => { throw new Error('No legacy execution'); });
    const integration = { id: 'declared', version: '1', trainingSession, executionIdentity: () => 'pinned-session',
      preparations: { 'declared/reconstruct': { version: '1', unlockedPaths: ['trainingMoment'], validate() {} } },
      unlockedSetupPaths: ['trainingMoment'], createAdapter: legacy, prepareEnvironment: async () => { throw new Error('No legacy preparation'); } };
    const code = await main(['train', '--spawnfile-context', f.path, '--train', 'train.yaml', '--test', 'test.yaml', '--editable', 'AGENTS.md',
      '--optimizer-model', 'fake-model', '--validation-group', 'selection', '--max-trials', '6', '--max-proposals', '1',
      '--bridge-command', cli.bridge, '--slots-file', slotsFile, '--out', 'command-output', '--timeout-ms', '15000'],
    { cwd: f.root, stdout: text => { stdout.push(text); }, stderr: text => { stderr.push(text); } }, { ...cli.dependencies, spawnfile: integration });
    expect(code, stderr.join('')).toBe(0);
    expect(JSON.parse(stdout.at(-1)!)).toMatchObject({ status: 'completed' });
    expect(observed).toHaveLength(6); expect(observed.some(text => text.includes('IMPROVED'))).toBe(true);
    expect(f.operations.compileTrainingCandidate).toHaveBeenCalledTimes(6);
    expect(f.operations.prepareTrainingSessionSlot).toHaveBeenCalledTimes(12);
    expect(legacy).not.toHaveBeenCalled();
  } finally { create.mockRestore(); }
});
