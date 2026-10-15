#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildAiAssuranceFingerprint } from './lib/ai-assurance-fingerprint.mjs';

const [outArg='security/evidence/ai-assurance-fingerprint.json', mode=''] = process.argv.slice(2);
let out;
try{out=buildAiAssuranceFingerprint();}
catch(error){console.error('❌ '+error.message);process.exit(1);}
const text=JSON.stringify(out,null,2)+'\n';
const target=path.resolve(outArg);
if(mode==='--check'){
  if(!fs.existsSync(target)){console.error(`❌ AI assurance fingerprint chybí: ${target}`);process.exit(1);}
  if(fs.readFileSync(target,'utf8')!==text){console.error('❌ AI assurance fingerprint je zastaralý: změnila se model/provider/system-instruction/operation/corpus evidence boundary.');process.exit(1);}
  console.log(`✅ AI assurance fingerprint current: ${out.fingerprint}`);
}else{
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,text,'utf8');
  console.log(`✅ AI assurance fingerprint vytvořen: ${out.fingerprint}`);
}
