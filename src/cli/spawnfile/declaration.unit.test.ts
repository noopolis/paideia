import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { activateSpawnfileDeclaration } from './declaration.js';
import { contextFixture } from './fixture.js';
import { parseArguments } from '../arguments.js';
import { loadSpawnfileTraining } from '../../adapters/index.js';
import { createSpawnfileSessionIntegration, type TrainingSessionMomentHook, type SpawnfileSessionConfiguration } from './session.js';
import type { SpawnfileDeclarationIntegration } from './declaration.js';

vi.mock('../../adapters/index.js', () => ({ loadSpawnfileTraining: vi.fn() }));
vi.mock('./session.js', () => ({ createSpawnfileSessionIntegration: vi.fn(config => config.integration) }));
const roots: string[] = [];
afterEach(async () => { vi.clearAllMocks(); await Promise.all(roots.splice(0).map(root => rm(root, {recursive:true,force:true}))); });
async function fixture() {
  const f = await contextFixture(); roots.push(f.root);
  const out = join(f.root,'output'); await mkdir(out); await mkdir(join(out,'.spawnfile-execution'));
  const args = ['--out',out,'--train','authored.yaml','--test','sealed.yaml','--optimizer-model','reflection'];
  const execution = { version:'spawnfile.training-execution.v1',session:{version:'spawnfile.training-session.v1',slots:1},
    authoring:{preparation:{hook:'fixture/reconstruct'}},args,output:out,
    optimizer:{method:'gepa',model:'reflection',variants:2,keep:1,budget:{rounds:1}} };
  const receipt = join(f.root,'execution.json'), slots = join(f.root,'slots.json');
  await writeFile(receipt,JSON.stringify(execution));
  await writeFile(slots,JSON.stringify({schema:'spawnfile.training-slots.v1',slots:[{
    index:0,workerUid:2200,roots:{workspace:join(f.root,'workspace')},ports:{base:18000,count:5}}]}),{mode:0o400});
  execution.args.push('--slots-file',slots); await writeFile(receipt,JSON.stringify(execution));
  const argv = ['train','--spawnfile-context',f.path,'--spawnfile-execution',receipt,...execution.args];
  const prepareCase = vi.fn<SpawnfileDeclarationIntegration['prepareCase']>(async()=>({checks:[]}));
  const hook = vi.fn<TrainingSessionMomentHook>(async()=>({momentReceipt:undefined as never}));
  const declaration: SpawnfileDeclarationIntegration = {id:'fixture',version:'1',models:{reflect:{provider:'ollama',model:'reflection'}},
    prepareCase,hooks:{'fixture/reconstruct':hook}};
  const operations = {compileTrainingCandidate:vi.fn(),prepareTrainingSessionSlot:vi.fn()};
  const materializeTrainingCase = vi.fn();
  const activateTrainingExecution = vi.fn(async (input: {prepareCase: typeof prepareCase}) => {
    await input.prepareCase({} as never);
    return {execution,args:[...execution.args],identity:'immutable-receipt',operations,materializeTrainingCase};
  });
  vi.mocked(loadSpawnfileTraining).mockResolvedValue({activateTrainingExecution});
  return {...f,argv,execution,declaration,operations,hook,materializeTrainingCase,activateTrainingExecution,
    io:{cwd:f.root,stdout(){},stderr(){}}};
}
it('wires receipt-owned operations, one persisted freshness store and generic fresh rewind before domain reconstruction', async()=>{
  const f=await fixture();
  const result=await activateSpawnfileDeclaration(parseArguments(f.argv),f.io,{spawnfileDeclaration:f.declaration});
  expect(result.args.training).toEqual({models:f.declaration.models});
  expect(result.args.flags['bridge-command']).toEqual(['paideia-dspy']);
  const config=vi.mocked(createSpawnfileSessionIntegration).mock.calls[0]![0] as SpawnfileSessionConfiguration;
  expect(config.operations).toBe(f.operations);
  expect(config.slots).toBe(1);
  expect(await config.freshness.request(0)).toMatchObject({minGeneration:1});
  expect(await config.integration.trainingOptimizer!(f.context)).toEqual(f.execution.optimizer);
  expect(await config.integration.executionIdentity!({})).toContain(':1');
  const paths={control:join(f.root,'trial-control')} as never;
  const trial={id:'trial-1'} as never;
  const moment={example:'train:first',effectiveAt:'2026-10-10T00:00:00Z',momentRoot:'archive'} as never;
  await config.hooks['fixture/reconstruct']!(paths,new AbortController().signal,trial,f.context,moment,{} as never);
  const destination=join(f.root,'trial-control','moment');
  expect(f.materializeTrainingCase).toHaveBeenCalledWith({moment,out:destination});
  expect(f.materializeTrainingCase.mock.invocationCallOrder[0]!).toBeLessThan(f.hook.mock.invocationCallOrder[0]!);
  expect(f.hook.mock.calls[0]![4]).toMatchObject({momentRoot:destination});
  const stopped=AbortSignal.abort();
  await expect(config.hooks['fixture/reconstruct']!(paths,stopped,trial,f.context,moment,{} as never)).rejects.toThrow();
  f.materializeTrainingCase.mockRejectedValueOnce(Error('Rewind refused'));
  await expect(config.hooks['fixture/reconstruct']!(paths,new AbortController().signal,trial,f.context,moment,{} as never)).rejects.toThrow('Rewind refused');
  expect(f.hook).toHaveBeenCalledOnce();
});
it('preserves an explicit bridge and bound integration identity',async()=>{
  const f=await fixture(); f.execution.args.push('--bridge-command','explicit-bridge');
  await writeFile(join(f.root,'execution.json'),JSON.stringify(f.execution));
  const declaration={...f.declaration,executionIdentity:async()=> 'image-policy'};
  const result=await activateSpawnfileDeclaration(parseArguments([...f.argv,'--bridge-command','explicit-bridge']),f.io,{spawnfileDeclaration:declaration});
  expect(result.args.flags['bridge-command']).toEqual(['explicit-bridge']);
  const config=vi.mocked(createSpawnfileSessionIntegration).mock.calls[0]![0];
  expect(await config.integration.executionIdentity!({})).toContain(':image-policy');
});
it('passes registered private callbacks while retaining public compiler, lease and reset ownership', async () => {
  const f = await fixture();
  const transportDelivery = { prepare: vi.fn(async () => ({ source: {}, publish: vi.fn() })) };
  const externalInputs = { maxDeliveries: 1, next: vi.fn(async () => null) };
  const native = { transportDelivery, execution: { externalInputs, kind: 'docker', grokSlots: {}, prepare: vi.fn() }, docker: vi.fn() };
  // Untyped JS registrations must not replace the public execution/reset seams either.
  const declaration = { ...f.declaration, native } as unknown as SpawnfileDeclarationIntegration;
  await activateSpawnfileDeclaration(parseArguments(f.argv), f.io, { spawnfileDeclaration: declaration });
  const config = vi.mocked(createSpawnfileSessionIntegration).mock.calls[0]![0];
  expect(config.native, 'declared private callback guarantee').toEqual({ transportDelivery, execution: { externalInputs } });
  expect(config.operations).toBe(f.operations);
  expect(config.integration).not.toHaveProperty('native');
  expect(transportDelivery.prepare).not.toHaveBeenCalled();
  expect(externalInputs.next).not.toHaveBeenCalled();
});
it.each(['command','context','dry-run','injected','registration','hook','arguments','slots','optimizer','cancel'])('fails closed before native work: %s',async kind=>{
  const f=await fixture(), args=parseArguments(f.argv);
  const dependencies={spawnfileDeclaration:f.declaration};
  if(kind==='command') args.command='evaluate';
  if(kind==='context') delete (args.flags as Record<string,unknown>)['spawnfile-context'];
  if(kind==='dry-run') args.flags={...args.flags,'dry-run':['true']};
  if(kind==='injected') Object.assign(dependencies,{spawnfile:{trainingSession:{}}});
  if(kind==='registration') Object.assign(dependencies,{spawnfileDeclaration:undefined});
  if(kind==='hook') f.declaration.hooks={};
  if(kind==='arguments') args.flags={...args.flags,'optimizer-model':['changed']};
  if(kind==='slots') {f.execution.session.slots=2;await writeFile(join(f.root,'execution.json'),JSON.stringify(f.execution));}
  if(kind==='optimizer') f.execution.optimizer.method='unsupported';
  const io=kind==='cancel'?{...f.io,signal:AbortSignal.abort()}:f.io;
  await expect(activateSpawnfileDeclaration(args,io,dependencies)).rejects.toThrow();
  expect(createSpawnfileSessionIntegration).not.toHaveBeenCalled();
});
it('leaves ordinary CLI commands unchanged',async()=>{
 const args=parseArguments(['help']), dependencies={};
 expect(await activateSpawnfileDeclaration(args,{cwd:'.',stdout(){},stderr(){}},dependencies)).toEqual({args,dependencies});
 expect(loadSpawnfileTraining).not.toHaveBeenCalled();
});
