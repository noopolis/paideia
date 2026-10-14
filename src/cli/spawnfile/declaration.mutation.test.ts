import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { declarationSandbox } from './declaration.test-helper.js';

const execute=promisify(execFile);
const mutants=[
  {file:'src/cli/arguments.ts',before:"train: [...common, 'spawnfile-execution',",after:'train: [...common,',mode:'happy',failure:'Unsupported option --spawnfile-execution'},
  {file:'src/cli/commands.ts',before:'await activateSpawnfileDeclaration(parseArguments(argv), io, dependencies)',
    after:'{ args: parseArguments(argv), dependencies }',mode:'main',failure:'entrypoint activation guarantee'},
  {file:'src/cli/spawnfile/declaration.ts',before:"if (slots.slots?.length !== envelope.session.slots) throw new Error('Provisioned slots differ from the declared session');",
    after:'void slots;',mode:'slots',failure:'Missing expected rejection'},
  {file:'src/cli/spawnfile/declaration.ts',before:"if (!isDeepStrictEqual(received, declaredArgs.flags)) throw new Error('CLI arguments differ from the Spawnfile execution receipt');",
    after:'void received;',mode:'arguments',failure:'Missing expected rejection'},
];
it('kills parser, entrypoint activation, slot binding and argument binding mutants with actual public receiver tests',async()=>{
  for(const mutant of mutants){
    const f=await declarationSandbox();
    try{
      const file=join(f.sandbox,mutant.file),original=await readFile(file,'utf8');
      expect(original.split(mutant.before)).toHaveLength(2);
      await writeFile(file,original.replace(mutant.before,mutant.after));
      let failure: {code?:unknown;stderr?:string}|undefined;
      try{await execute(process.execPath,['--import',f.loader,'verify.mjs',mutant.mode],{
        cwd:f.sandbox,env:process.env,timeout:30_000,maxBuffer:1024*1024});}
      catch(error){failure=error as typeof failure;}
      expect(failure?.code,`${mutant.mode} mutant survived`).toBe(1);
      expect(failure?.stderr).toContain(mutant.failure);
    }finally{await rm(f.sandbox,{recursive:true,force:true});}
  }
},60_000);
