import { cp, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export async function declarationSandbox() {
  const configured = process.env.SPAWNFILE_TEST_SOURCE_ROOT;
  if (!configured) throw new Error('Provision the paired compiler explicitly via SPAWNFILE_TEST_SOURCE_ROOT; no sibling checkout is assumed');
  const compiler = resolve(configured);
  const sandbox = await mkdtemp(join(tmpdir(), 'paideia-declaration-'));
  for (const name of ['src', 'viewer', 'package.json']) await cp(join(root, name), join(sandbox, name), { recursive: true });
  const modules = join(sandbox, 'node_modules'); await mkdir(modules);
  for (const name of await readdir(join(root, 'node_modules'))) {
    await symlink(join(root, 'node_modules', name), join(modules, name));
  }
  await rm(join(modules, 'spawnfile'), { force: true });
  await mkdir(join(modules, 'spawnfile'));
  await writeFile(join(modules, 'spawnfile/package.json'), JSON.stringify({ type: 'module', exports: { './training': './training.mjs' } }));
  await writeFile(join(modules, 'spawnfile/training.mjs'), `export * from ${JSON.stringify(pathToFileURL(join(compiler, 'src/compiler/training/index.ts')).href)};`);
  const program = `
import assert from 'node:assert/strict';
import {chmod, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {activationFixture} from ${JSON.stringify(pathToFileURL(join(compiler, 'src/compiler/training/session/activation.test-helper.ts')).href)};
import {trainingSlotsDocument,activateTrainingExecution} from 'spawnfile/training';
import {activateSpawnfileDeclaration} from './src/cli/spawnfile/declaration.ts';
import {parseArguments} from './src/cli/arguments.ts';
import {prepareNative} from './src/cli/native.ts';
import {main} from './src/cli/commands.ts';
const f = await activationFixture(), mode=process.argv[2];
const path=join(f.root,'context.json'), receipt=join(f.root,'execution.json'), slots=join(f.root,'slots.json');
await writeFile(path,JSON.stringify(f.context));
await writeFile(slots,JSON.stringify(trainingSlotsDocument(2)),{mode:0o400});
f.execution.args.push('--slots-file',slots);
await writeFile(receipt,JSON.stringify(f.execution));
const argv=['train','--spawnfile-context',path,'--spawnfile-execution',receipt,...f.execution.args];
const io={cwd:f.root,stdout(){},stderr(){}};
const declaration={id:'fixture',version:'1',models:{reflect:{provider:'ollama',model:f.execution.optimizer.model}},
  prepareCase:f.prepareCase,hooks:{'fixture/prepare':async()=>{throw Error('No trial launched in construction test');}}};
if(mode==='happy') {
 const activated=await activateSpawnfileDeclaration(parseArguments(argv),io,{spawnfileDeclaration:declaration});
 assert.equal(activated.dependencies.spawnfile.trainingSession,undefined);
 assert.equal(activated.dependencies.spawnfileDeclaration.prepareCase,declaration.prepareCase);
 assert.notEqual(activated.args.flags.train[0],parseArguments(f.execution.args.length?['train',...f.execution.args]:[]).flags.train[0],'lowered dataset guarantee');
 const native=await prepareNative(activated.args,io,activated.dependencies,1000);
 assert.equal(native.adapter.id,'daimon-native','declared native activation guarantee');
 assert.equal(typeof native.closeEnvironment,'function');
 await native.closeInference();
 const resumed=await activateTrainingExecution({...f,execution:{...f.execution,args:[...f.execution.args,'--resume']}});
 const compilation=await resumed.operations.compileTrainingCandidate({context:f.context,resources:[{
   sourcePath:'AGENTS.md',sourceContent:'Write precisely.\\n',content:'Use verified evidence.\\n',edit:'editable'}],out:join(f.root,'compiled')});
 assert.match(await readFile(compilation.native.configPath,'utf8'),/Use verified evidence/,'real compiler guarantee');
 await writeFile(receipt,JSON.stringify({...f.execution,args:[...f.execution.args,'--resume']}));
 const again=await activateSpawnfileDeclaration(parseArguments([...argv,'--resume']),io,{spawnfileDeclaration:declaration});
 assert.equal(await again.dependencies.spawnfile.executionIdentity({}),await activated.dependencies.spawnfile.executionIdentity({}),'resume identity guarantee');
 const lowering=JSON.parse(await readFile(join(f.execution.output,'.spawnfile-execution/moments/lowering.json'),'utf8'));
 assert.equal(lowering.entries.filter(row=>row.status==='materialized').length,3);
} else if(mode==='main') {
 const errors=[];
 const code=await main(argv,{...io,stderr:text=>errors.push(text)}, {spawnfileDeclaration:{...declaration,
   prepareCase:async()=>{throw Error('RECEIVER_SENTINEL');}}});
 assert.equal(code,2);
 const report=JSON.parse(await readFile(join(f.execution.output,'.spawnfile-execution/moments/lowering.json'),'utf8').catch(()=>assert.fail('entrypoint activation guarantee')));
 assert.ok(report.entries.every(row=>row.reason==='RECEIVER_SENTINEL'),'entrypoint activation guarantee');
} else {
 const args=parseArguments(argv), deps={spawnfileDeclaration:declaration};
 let expected;
 if(mode==='slots') {await chmod(slots,0o600);await writeFile(slots,JSON.stringify(trainingSlotsDocument(1)));await chmod(slots,0o400);expected=/Provisioned slots/;}
 if(mode==='arguments') {args.flags={...args.flags,'optimizer-model':['changed']};expected=/CLI arguments differ/;}
 if(mode==='hooks') {deps.spawnfileDeclaration={...declaration,hooks:{}};expected=/Undeclared training moment hook/;}
 if(mode==='injected') {deps.spawnfile={trainingSession:{}};expected=/injected trainingSession/;}
 if(mode==='context') {delete args.flags['spawnfile-context'];expected=/requires train/;}
 if(mode==='dry-run') {args.flags={...args.flags,'dry-run':['true']};expected=/container-only/;}
 if(mode==='registration') {delete deps.spawnfileDeclaration;expected=/registered domain hooks/;}
 if(mode==='cancel') {io.signal=AbortSignal.abort();expected=/aborted/;}
 await assert.rejects(activateSpawnfileDeclaration(args,io,deps),expected);
}
console.log('DECLARATION VERIFIED '+mode);
`;
  await writeFile(join(sandbox, 'verify.mjs'), program);
  return { sandbox, loader: join(root, 'node_modules/tsx/dist/loader.mjs') };
}
