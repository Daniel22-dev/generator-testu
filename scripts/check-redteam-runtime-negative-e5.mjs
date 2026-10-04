// Each security capability must fail on actual older generated output.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const baselines=JSON.parse(process.env.GIT_REDTEAM_E5_BASELINES||'[]');
assert.ok(Array.isArray(baselines)&&baselines.length,'GIT_REDTEAM_E5_BASELINES must contain historical generator paths');
const dest=process.env.GIT_REDTEAM_E5_NEGATIVE_DIR||'qa-results/e5-negative-controls',selectedKind=process.env.GIT_REDTEAM_E5_NEGATIVE_KIND||'all';fs.mkdirSync(dest,{recursive:true});const controls=selectedKind==='all'?[]:(JSON.parse(fs.readFileSync(path.join(dest,'negative-controls.json'),'utf8')).controls.map(c=>({...c,kind:c.kind||'runtime'})).filter(c=>c.kind!==selectedKind));
for(const baseline of baselines){
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(baseline)).digest('hex');
  for(const [kind,script,envName,cases] of [['runtime','scripts/check-redteam-runtime-e5.mjs','GIT_REDTEAM_E5_CASE',['away-during-lock','beforeunload-lock','locked-responses','clipboard-block','split-reload','unlock-race','lifecycle-lock','submitted-responses','verifier-audit']],['browser','scripts/check-redteam-runtime-browser-e5.mjs','GIT_REDTEAM_E5_BROWSER_CASE',['native-reload','native-fullscreen-exit','native-history','controlled-freeze-resume','native-inert-keyboard','native-split-persistence','controlled-pageshow-reconciliation','controlled-fullscreen-rejection']]]){
    if(selectedKind!=='all'&&selectedKind!==kind)continue;
    for(const id of cases){
    const r=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:120000,env:{...process.env,GIT_REDTEAM_GENERATOR_HTML:baseline,[envName]:id}});const log=(r.stdout||'')+(r.stderr||'');
    const expectedRejected=r.status===1&&/AssertionError/.test(log)&&!/(ReferenceError|SyntaxError|TypeError)/.test(log);const name=path.basename(baseline).replace(/[^a-z0-9.-]/gi,'_')+'-'+id+'.log';fs.writeFileSync(path.join(dest,name),log);controls.push({baseline:path.basename(baseline),sha256,kind,id,exitCode:r.status,expectedRejected,log:name});console.log(expectedRejected?'PASS negative E5':'FAIL negative E5',path.basename(baseline),id);
    }
  }
}
const report={stage:'E5',status:controls.every(c=>c.expectedRejected)?'PASS':'FAIL',controls,scope:'Nine generated-runtime and eight Chromium guard/audit groups against real historical exports. Native/controlled scope is retained in the browser gate. iPad keyboard exception is an unchanged-regression test.'};fs.writeFileSync(path.join(dest,'negative-controls.json'),JSON.stringify(report,null,2)+'\n');if(report.status!=='PASS')process.exitCode=1;
