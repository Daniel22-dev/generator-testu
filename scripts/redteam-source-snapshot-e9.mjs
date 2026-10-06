import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
// Bind executable sources and release/CI inputs, independently of a local git
// surrogate. Generated audit evidence and checksum ledgers are not inputs.
export function sourceSnapshot({root=process.cwd()}={}){
  const files=[];
  function walk(p){if(fs.lstatSync(path.join(root,p)).isSymbolicLink())throw new Error('Linked certification directory: '+p);for(const entry of fs.readdirSync(path.join(root,p),{withFileTypes:true})){const rel=p+'/'+entry.name;if(entry.isSymbolicLink())throw new Error('Linked certification input: '+rel);if(entry.isDirectory())walk(rel);else if(entry.isFile()&&entry.name!=='SHA256SUMS')files.push(rel);}}
  for(const dir of ['.github/workflows','src','public','scripts','tools','security','vendor'])walk(dir);
  if(fs.existsSync(path.join(root,'.github/actions')))walk('.github/actions');
  if(fs.existsSync(path.join(root,'.npmrc')))files.push('.npmrc');
  files.push('package.json','package-lock.json','ghrab-platform.consumer.json','reporter-test.config.json','eslint.config.mjs','eslint-globals.generated.mjs','qa/qa-manifest.json');
  const sha=createHash('sha256');
  for(const file of files.sort()){const stat=fs.lstatSync(path.join(root,file));if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Invalid certification input: '+file);const bytes=fs.readFileSync(path.join(root,file));sha.update(file+'\0'+createHash('sha256').update(bytes).digest('hex')+'\0'+bytes.length+'\n');}
  return {algorithm:'SHA256(path\\0sha256\\0size\\n)',fileCount:files.length,sha256:sha.digest('hex'),scope:'Executable source, public assets, security/vendor contracts, CI workflows/local actions, optional npm config and release inputs; audit outputs/checksum ledgers excluded'};
}
