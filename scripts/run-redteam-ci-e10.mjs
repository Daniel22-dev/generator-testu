// One fail-fast chain for local execution and GitHub Actions. P5 runs last:
// foundation builds dist, so running it afterwards would delete P5 evidence.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sourceSnapshot} from './redteam-source-snapshot-e9.mjs';
const steps=['npm test','npm run qa:garp27:foundation','npm run qa:p5:ci','node scripts/check-redteam-evidence-e10.mjs'];
const version=JSON.parse(fs.readFileSync('package.json')).version,startedAt=new Date().toISOString();
const sourceBefore=sourceSnapshot();
fs.rmSync('qa-results',{recursive:true,force:true});const dir='qa-results/redteam-e10-ci';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/source-start.json',JSON.stringify({version,startedAt,sourceBefore},null,2)+'\n');
const results=[];
for(const [index,command] of steps.entries()){
  const parts=command.split(' '),run=spawnSync(parts[0],parts.slice(1),{encoding:'utf8',timeout:30*60*1000,maxBuffer:64*1024*1024,env:{...process.env,GIT_REDTEAM_E9_RUN_STARTED_AT:startedAt}});
  const log=(run.stdout||'')+(run.stderr||''),file=(index+1)+'-'+parts.join('-').replace(/[^a-zA-Z0-9._-]/g,'-')+'.log';fs.writeFileSync(dir+'/'+file,log);
  const pass=run.status===0&&!run.error;
  results.push({command,exitCode:run.status,pass,log:file,logBytes:Buffer.byteLength(log),logSha256:createHash('sha256').update(log).digest('hex'),completedAt:new Date().toISOString()});
  console.log(pass?'PASS':'FAIL',command);if(!pass){console.error(log.slice(-6000));break;}
}
const sourceAfter=sourceSnapshot(),sourceUnchanged=sourceBefore.sha256===sourceAfter.sha256;
const pass=results.length===steps.length&&results.every(x=>x.pass)&&sourceUnchanged;
if(!sourceUnchanged)console.error('FAIL executable source changed during regression chain');
const report={stage:'E10',version,status:pass?'PASS':'FAIL',startedAt,completedAt:new Date().toISOString(),environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local-equivalent',sourceCommit:process.env.GITHUB_SHA||null,node:process.version,syntheticOnly:true,sourceBefore,sourceAfter,sourceUnchanged,results,limits:['Local execution is not a GitHub Actions run','Physical E7 mobile remains ANALYZED / NOT TESTED','Passing regressions does not authorize classroom release']};
fs.writeFileSync('qa-results/redteam-e10-ci-run.json',JSON.stringify(report,null,2)+'\n');if(!pass)process.exitCode=1;
