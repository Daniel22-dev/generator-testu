#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const anchorPath=path.join(ROOT,'security/garp27/trust-anchor.json');
const expected=crypto.createHash('sha256').update(fs.readFileSync(anchorPath)).digest('hex');
const workflowDir=path.join(ROOT,'.github/workflows');
const files=fs.readdirSync(workflowDir).filter(n=>/\.ya?ml$/i.test(n)).sort();
const refs=[];
for(const name of files){
  const text=fs.readFileSync(path.join(workflowDir,name),'utf8');
  for(const m of text.matchAll(/GARP27_EXTERNAL_TRUST_SHA256:\s*([0-9a-fA-F]{64})/g)){
    refs.push({file:`.github/workflows/${name}`,pin:m[1].toLowerCase()});
  }
}
if(!refs.length){
  console.error('FAIL F0 CI trust pin gate: no GARP27_EXTERNAL_TRUST_SHA256 references found');
  process.exit(1);
}
const bad=refs.filter(x=>x.pin!==expected);
if(bad.length){
  console.error(`FAIL F0 CI trust pin gate: expected ${expected}`);
  for(const x of bad)console.error(` - ${x.file}: ${x.pin}`);
  process.exit(1);
}
console.log(`PASS F0 CI trust pin gate: ${refs.length} workflow pin(s) match ${expected}`);
