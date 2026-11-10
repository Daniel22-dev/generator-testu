// One fail-fast chain for local execution and GitHub Actions. Foundation runs
// before P5, but its generated tracked evidence is archived and restored to
// HEAD before browser provenance asserts a clean source tree.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {resolveNpmCommand} from './lib/npm-command.mjs';
import {sourceSnapshot} from './redteam-source-snapshot-e9.mjs';
const steps=['npm test','npm run qa:garp27:foundation','node scripts/preserve-foundation-evidence-e10.mjs','npm run qa:p5:ci','node scripts/check-redteam-evidence-e10.mjs'];

export function sanitizeSpawnError(error){
  if(!error)return null;
  return {name:error.name||'Error',message:String(error.message||error),code:error.code??null,errno:error.errno??null,syscall:error.syscall??null,path:error.path??null,spawnargs:Array.isArray(error.spawnargs)?error.spawnargs:[]};
}

export function resolveStepCommand(command,options={}){
  const parts=command.split(' '),program=parts[0],args=parts.slice(1);
  if(program==='npm')return (options.resolveNpmCommand||resolveNpmCommand)(args,options.npmOptions);
  if(program==='node')return {program:options.execPath||process.execPath,args};
  throw new Error(`Unsupported E10 command: ${program}`);
}

export function executeStep(command,options={}){
  let resolved;
  try{resolved=resolveStepCommand(command,options);}catch(error){return {status:null,signal:null,stdout:'',stderr:'',error:sanitizeSpawnError(error)};}
  const run=(options.spawnSync||spawnSync)(resolved.program,resolved.args,{encoding:'utf8',timeout:options.timeout??30*60*1000,maxBuffer:options.maxBuffer??64*1024*1024,env:options.env||process.env,windowsHide:true});
  return {status:run.status,signal:run.signal??null,stdout:run.stdout||'',stderr:run.stderr||'',error:sanitizeSpawnError(run.error),resolved};
}

export function regressionChainPasses(results,requiredSteps,sourceBefore,sourceAfter){
  const sourceUnchanged=sourceBefore.sha256===sourceAfter.sha256;
  return results.length===requiredSteps&&results.every(x=>x.pass)&&sourceUnchanged;
}

export function run(){
  const version=JSON.parse(fs.readFileSync('package.json')).version,startedAt=new Date().toISOString();
  const sourceBefore=sourceSnapshot();
  fs.rmSync('qa-results',{recursive:true,force:true});const dir='qa-results/redteam-e10-ci';fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(dir+'/source-start.json',JSON.stringify({version,startedAt,sourceBefore},null,2)+'\n');
  const results=[];
  for(const [index,command] of steps.entries()){
    const stepStartedAt=new Date().toISOString(),stepClock=performance.now(),parts=command.split(' ');
    const run=executeStep(command,{env:{...process.env,GIT_REDTEAM_E9_RUN_STARTED_AT:startedAt}});
    const spawnDiagnostic=run.error?'\n--- SPAWN ERROR ---\n'+JSON.stringify(run.error,null,2)+'\n':'';
    const log=(run.stdout||'')+(run.stderr||'')+spawnDiagnostic,file=(index+1)+'-'+parts.join('-').replace(/[^a-zA-Z0-9._-]/g,'-')+'.log';fs.writeFileSync(dir+'/'+file,log);
    const pass=run.status===0&&!run.error;
    results.push({command,startedAt:stepStartedAt,durationMs:Math.round(performance.now()-stepClock),exitCode:run.status,signal:run.signal,spawnError:run.error,pass,log:file,logBytes:Buffer.byteLength(log),logSha256:createHash('sha256').update(log).digest('hex'),completedAt:new Date().toISOString()});
    console.log(pass?'PASS':'FAIL',command);if(!pass){console.error(log.slice(-6000));break;}
  }
  const sourceAfter=sourceSnapshot(),sourceUnchanged=sourceBefore.sha256===sourceAfter.sha256;
  const pass=regressionChainPasses(results,steps.length,sourceBefore,sourceAfter);
  if(!sourceUnchanged)console.error('FAIL executable source changed during regression chain');
  const report={stage:'E10',version,status:pass?'PASS':'FAIL',startedAt,completedAt:new Date().toISOString(),environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local-equivalent',sourceCommit:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,runAttempt:process.env.GITHUB_RUN_ATTEMPT||null,job:process.env.GITHUB_JOB||null,node:process.version,syntheticOnly:true,sourceBefore,sourceAfter,sourceUnchanged,results,limits:['Local execution is not a GitHub Actions run','Physical E7 mobile remains ANALYZED / NOT TESTED','Passing regressions does not authorize classroom release']};
  fs.writeFileSync('qa-results/redteam-e10-ci-run.json',JSON.stringify(report,null,2)+'\n');if(!pass)process.exitCode=1;
  return report;
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain)run();
