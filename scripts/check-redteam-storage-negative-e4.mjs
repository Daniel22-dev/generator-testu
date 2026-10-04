// Supply independently built historical generator HTML paths as a JSON array.
// Each actual-build control must reach an assertion failure, not a harness error.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baselines=JSON.parse(process.env.GIT_REDTEAM_E4_BASELINES||'[]');
if(!Array.isArray(baselines)||!baselines.length)throw new Error('GIT_REDTEAM_E4_BASELINES must be a JSON array of historical generator HTML paths.');
const dest=process.env.GIT_REDTEAM_E4_NEGATIVE_DIR||'qa-results/e4-negative-controls';fs.mkdirSync(dest,{recursive:true});const controls=[];
for(const [index,file] of baselines.entries()){
  const bytes=fs.readFileSync(file),sha256=createHash('sha256').update(bytes).digest('hex');
  for(const [kind,script,envName,cases] of [['browser','scripts/check-redteam-storage-browser-e4.mjs','GIT_REDTEAM_E4_CASE',['restart-outbox','parallel-tabs','integrity','interrupted-submit','private-replay-restart']],['fault','scripts/check-redteam-storage-faults-e4.mjs','GIT_REDTEAM_E4_FAULT',['guard-write-failure','crypto-failure','outbox-local-quota','active-write-failure','unavailable-idb']]]){
    for(const test of cases){const result=spawnSync(process.execPath,[script],{env:{...process.env,GIT_REDTEAM_GENERATOR_HTML:path.resolve(file),[envName]:test},encoding:'utf8',timeout:120000});
      const log=String(result.stdout||'')+String(result.stderr||''),expectedRejected=result.status===1&&log.includes('AssertionError');const logFile='negative-'+index+'-'+kind+'-'+test+'.log';fs.writeFileSync(path.join(dest,logFile),log);
      controls.push({baseline:path.basename(file),sha256,kind,test,exitCode:result.status,expectedRejected,logFile});console.log(expectedRejected?'PASS':'FAIL',path.basename(file),kind,test);if(!expectedRejected)console.error(log.slice(-1800));
    }
  }
}
const report={stage:'E4',status:controls.every(c=>c.expectedRejected)?'PASS':'FAIL',controls};fs.writeFileSync(path.join(dest,'negative-controls.json'),JSON.stringify(report,null,2)+'\n');if(report.status!=='PASS')process.exitCode=1;
