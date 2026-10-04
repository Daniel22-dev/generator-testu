// Owner-side preflight. Never execute a public HTML file or emit secret values.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
import * as acorn from 'acorn';

export const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
export function readUtf8(file) {
  const bytes=fs.readFileSync(file);
  try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new Error('Invalid UTF-8 artifact');}
}
const normalize = key => String(key).replace(/[^a-z0-9]/gi,'').toLowerCase();
const privateNames = new Set(['startcode','ucitelpin','ucitelpinhash','uciteljmeno','teachersecret','teachersecrethash','teacherpin','teacherpinhash','teacherconfig','teacherconfiguration','recoverycode','recoverycodehash','hasrecoveryunlock','identitycodehashes','studenthashes','diffrostersalt','diffrosterscheme','privatekey','privatejwk','roster','rosterentries','variantsfull','answerkey','encryptedanswerkey','answerhash','answerhashes','answerchecksum','normalizedanswer','normalizedanswers','correcthash','correctchecksum','correctposition','originalcorrectposition','shuffleseed','answerseed','debugconfig']);
const answerNames = new Set(['answer','answers','ans','acceptedanswers','correctanswer','correctindex','altanswers','correct','correctorder','correctcategory','correctsentence','modelanswer','right','transcript','explanation','errortokenindex','errortype','correction']);
const publicFields = new Set('v mode resultMode generatorVersion buildHash releaseDate releaseStatus formsSubmissionUrl formsMetadata formsPayloadSafeChars creatorId creatorRole appMode testId manifestHash nazev proKoho jazyk uiLang cefr cefrLevels cefrCombined labels secureLabels identityMode isCzech csScoringPolicy cas tema testMode screenGuard lockOnLeave layout odevzdavani fuzzyTolerance randomizace zolicek unlockCodeHash hasUnlockCode identityValidation diffGroups publicKey'.split(' '));
const teacherFunctions = new Set('teacherLogin teacherSecretMatches openTeacherModal closeTeacherModal teacherLogout clearSubmittedLocked clearSealedJokerUi rosterHash identityCodeHash'.split(' '));

export function literal(node) {
  if (!node) throw new Error('Missing static value');
  if (node.type==='Literal' && !node.regex && typeof node.value!=='bigint') return node.value;
  if (node.type==='TemplateLiteral'&&!node.expressions.length)return node.quasis[0].value.cooked;
  if (node.type==='UnaryExpression' && node.operator==='-' && node.argument.type==='Literal' && typeof node.argument.value==='number') return -node.argument.value;
  if (node.type==='ArrayExpression') return node.elements.map(literal);
  if (node.type==='ObjectExpression') {
    const out=Object.create(null);
    for (const p of node.properties) {
      if(p.type!=='Property'||p.computed||p.method||p.kind!=='init')throw new Error('Non-static property');
      const key=p.key.type==='Identifier'?p.key.name:p.key.value;
      if(typeof key!=='string'||Object.hasOwn(out,key)||['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe property');
      out[key]=literal(p.value);
    }
    return out;
  }
  throw new Error('Non-static value');
}
function visit(node,fn) {
  if(!node||typeof node!=='object')return;
  if(typeof node.type==='string')fn(node);
  for(const [key,value] of Object.entries(node)) {
    if(key==='start'||key==='end')continue;
    if(Array.isArray(value))value.forEach(x=>visit(x,fn));
    else if(value&&typeof value==='object')visit(value,fn);
  }
}
function walk(value,fn) {
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){fn(key,child,value);walk(child,fn);}
}
function declarations(ast,name) {
  return ast.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations:[]).filter(n=>n.id.type==='Identifier'&&n.id.name===name);
}
export function readStaticConfig(html,name) {
  const dom=new JSDOM(html); // Default: scripts and external resources are disabled.
  try {
    const found=[];
    for(const s of dom.window.document.querySelectorAll('script:not([src])')) {
      if(s.type && !['text/javascript','application/javascript'].includes(s.type))continue;
      const ast=acorn.parse(s.textContent,{ecmaVersion:'latest'});
      found.push(...declarations(ast,name));
    }
    if(found.length!==1)throw new Error('Expected one static configuration');
    return literal(found[0].init);
  } finally {dom.window.close();}
}
export function scanStudentHtml(html) {
  const findings=new Set();const add=id=>findings.add(id);
  if(Buffer.byteLength(html)>4*1024*1024)return {status:'FAIL',findings:['artifact-size-limit']};
  const rawPatterns=[
    ['private-key-pem',/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/i],
    ['source-map',/(?:sourceMappingURL\s*=|sourceURL\s*=|"sourcesContent"\s*:)/i],
    ['teacher-or-roster-data',/(?:["']?(?:ucitelPinHash|teacher[_ -]?secret(?:[_ -]?hash)?|teacher[_ -]?pin[_ -]?hash|recovery[_ -]?code[_ -]?hash|identityCodeHashes|studentHashes|diffRosterSalt|diffRosterScheme|rosterEntries)["']?\s*[:=])/i],
    ['answer-derived-data',/(?:["']?(?:answer[_-]?(?:key|hash(?:es)?|checksum|seed)|correct[_-]?(?:hash|checksum|position)|shuffle[_-]?seed|normalized[_-]?answers?)["']?\s*[:=])/i],
    ['private-jwk',/["']kty["']\s*:\s*["']RSA["'][\s\S]{0,6000}["']d["']\s*:\s*["'][A-Za-z0-9_-]{16,}/],
    ['provider-or-access-secret',/\b(?:AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{30,}|sk-[0-9A-Za-z_-]{30,})\b/]
  ];
  rawPatterns.forEach(([id,re])=>{if(re.test(html))add(id);});
  const dom=new JSDOM(html);
  let cfg,variants;
  try {
    const d=dom.window.document,scripts=[...d.querySelectorAll('script')];
    if(scripts.length!==1||scripts[0]?.src||scripts[0]?.type)add('unexpected-script-or-hidden-json');
    if(d.querySelector('iframe,object,embed,template,link[rel="preload"],link[rel="modulepreload"]'))add('external-or-embedded-artifact');
    for(const e of d.querySelectorAll('*'))for(const a of e.attributes) {
      if(/data-(?:answer|correct|teacher|private|recovery|roster|debug)/i.test(a.name))add('secret-bearing-attribute');
    }
    for(const s of scripts) {
      if(s.src)continue;
      let ast;
      try{ast=acorn.parse(s.textContent,{ecmaVersion:'latest'});}catch{add('script-not-statically-parsable');continue;}
      const configNode=declarations(ast,'CFG')[0]?.init;
      visit(ast,node=>{
        if(node.type==='FunctionDeclaration'&&teacherFunctions.has(node.id?.name))add('teacher-runtime-capability');
        if(node.type==='Property'&&!node.computed) {
          const key=node.key.type==='Identifier'?node.key.name:node.key.value;
          if(privateNames.has(normalize(key)))add('private-or-answer-derived-property');
          if(answerNames.has(normalize(key))&&(!configNode||node.start<configNode.start||node.end>configNode.end))try{literal(node.value);add('hidden-answer-property');}catch{/* Dynamic response fields are not static answer keys. */}
        }
        if(node.type==='ObjectExpression') {
          try{
            const obj=literal(node);
            if(obj.kty==='RSA'&&['d','p','q','dp','dq','qi','oth'].some(k=>Object.hasOwn(obj,k)))add('private-jwk');
            if(!configNode||node.start<configNode.start||node.end>configNode.end)walk(obj,key=>{if(answerNames.has(normalize(key)))add('hidden-answer-property');});
          }catch{/* Runtime expressions are not evaluated. */}
        }
      });
    }
    try{cfg=readStaticConfig(html,'CFG');variants=readStaticConfig(html,'STUDENT_VARIANTS');}catch{add('secure-student-format-required');}
    if(cfg) {
      if(cfg.mode!=='secureOffline'||cfg.resultMode!=='secureOffline'||cfg.identityValidation!=='teacher-verifier-only')add('secure-student-mode-required');
      for(const key of Object.keys(cfg))if(!publicFields.has(key))add('unexpected-public-config-field');
      walk(cfg,key=>{if(privateNames.has(normalize(key)))add('private-public-config');});
      if(!cfg.testId||!/^[A-Za-z0-9_-]{43}$/.test(cfg.manifestHash||''))add('invalid-test-identity');
      if(!cfg.publicKey||cfg.publicKey.kty!=='RSA'||!cfg.publicKey.n||!cfg.publicKey.e)add('invalid-public-key');
      if(cfg.publicKey&&Object.keys(cfg.publicKey).some(k=>!['kty','n','e','alg','ext','key_ops'].includes(k)))add('private-or-unknown-jwk-parameter');
      for(const g of cfg.diffGroups||[]) {
        if(Object.keys(g).some(k=>!['key','name','a11y'].includes(k)))add('unexpected-public-group-field');
        if(g.a11y&&Object.entries(g.a11y).some(([k,v])=>!['time','font','dys'].includes(k)||!['string','boolean'].includes(typeof v)))add('unexpected-public-a11y-field');
      }
      for(const name of ['labels','secureLabels'])if(!cfg[name]||Object.entries(cfg[name]).some(([k,v])=>typeof v!=='string'&&!(name==='secureLabels'&&['androidTips','appleTips','desktopTips','autoTips'].includes(k)&&Array.isArray(v)&&v.every(x=>typeof x==='string'))))add('invalid-public-labels');
      const policyFields='enabled domain phenomenon correctionMode difficulty diacritics punctuation capitalization exactShape requireTeacherReview'.split(' ');
      if(!cfg.csScoringPolicy||Object.entries(cfg.csScoringPolicy).some(([k,v])=>!policyFields.includes(k)||!['string','boolean'].includes(typeof v)))add('unexpected-scoring-policy-field');
      if(cfg.formsMetadata&&(Object.keys(cfg.formsMetadata).some(k=>!['v','responderUrl','entries'].includes(k))||Object.entries(cfg.formsMetadata.entries||{}).some(([k,v])=>!['testId','testName','group','generatorVersion','generatedAt'].includes(k)||!/^\d{1,20}$/.test(v))))add('unexpected-forms-metadata-field');
      if(cfg.unlockCodeHash&&!/^pbkdf2-v1\$[A-Za-z0-9_-]{43}$/.test(cfg.unlockCodeHash))add('invalid-classroom-unlock-hash');
    }
    if(variants&&(Array.isArray(variants)||typeof variants!=='object'||Object.keys(variants).length))add('plaintext-student-content');
    try{
      const cipher=readStaticConfig(html,'ENCRYPTED_CONTENT');
      if(cipher.v!==1||cipher.alg!=='PBKDF2-SHA256+AES-256-GCM'||cipher.iterations!==210000||Object.keys(cipher).sort().join(',')!=='alg,data,iterations,iv,salt,v'||!/^[-_A-Za-z0-9]{22}$/.test(cipher.salt)||!/^[-_A-Za-z0-9]{16}$/.test(cipher.iv)||!/^[-_A-Za-z0-9]{23,}$/.test(cipher.data))add('invalid-content-cipher');
    }catch{add('encrypted-content-required');}

  } catch {add('invalid-artifact-structure');}
  finally {dom.window.close();}
  return {status:findings.size?'FAIL':'PASS',findings:[...findings].sort(),sha256:sha256(html),bytes:Buffer.byteLength(html),...(cfg&&/^\d+\.\d+\.\d+$/.test(cfg.generatorVersion)?{generatorVersion:cfg.generatorVersion}:{}),secretValuesOmitted:true,limits:['Static schema and known secret indicators; arbitrary encoded secrets or answer hints inside legitimate prose are not provably detectable.','Opaque AES-GCM content is required. Static preflight cannot prove encrypted data contains no teacher material; generation checks the stripped plaintext first. No runtime authentication or release approval.']};
}
export function validatePrivatePair(studentHtml,teacherHtml) {
  const report=scanStudentHtml(studentHtml);if(report.status!=='PASS')throw new Error('Student preflight failed: '+report.findings.join(', '));
  const cfg=readStaticConfig(studentHtml,'CFG'),privateCfg=readStaticConfig(teacherHtml,'CONFIG');
  if(privateCfg.mode!=='secureOfflineVerifier'||privateCfg.studentHtmlSha256!==sha256(studentHtml)||privateCfg.testId!==cfg.testId||privateCfg.manifestHash!==cfg.manifestHash||privateCfg.generatorVersion!==cfg.generatorVersion)throw new Error('Private verifier does not match exact student artifact');
  const key=privateCfg.privateKey;
  if(!key||key.kty!=='RSA'||!key.d||key.n!==cfg.publicKey.n||key.e!==cfg.publicKey.e)throw new Error('Private verifier key does not match student public key');
  return report;
}
export function scanPublicationDirectory(dir) {
  const findings=[],files=[];
  function walkDir(root,rel='') {
    for(const entry of fs.readdirSync(root,{withFileTypes:true})) {
      const name=rel?rel+'/'+entry.name:entry.name,p=path.join(root,entry.name);
      if(entry.isSymbolicLink()||!entry.isFile()){findings.push({path:name,findings:['unexpected-directory-symlink-or-special-file']});continue;}
      if(!/^(?:[A-Za-z0-9_-]+\.html|student-publication\.json|\.nojekyll)$/.test(name)){findings.push({path:name,findings:['unapproved-publication-file']});continue;}
      if(entry.name.endsWith('.html')){const r=scanStudentHtml(readUtf8(p));files.push({path:name,...r});if(r.status!=='PASS')findings.push({path:name,findings:r.findings});}
      else if(entry.name==='.nojekyll'&&fs.statSync(p).size!==0)findings.push({path:name,findings:['nonempty-nojekyll']});
    }
  }
  walkDir(dir);
  if(!files.length)findings.push({path:'.',findings:['student-html-required']});
  try {
    const m=JSON.parse(fs.readFileSync(path.join(dir,'student-publication.json'),'utf8'));
    if(Object.keys(m).sort().join(',')!=='files,readiness,schema'||m.schema!=='git-student-publication-v1'||m.readiness!=='NOT READY – BLOCKING ISSUE'||!Array.isArray(m.files)||m.files.length!==files.length)throw new Error();
    for(const f of files) {
      const item=m.files.find(x=>x.path===f.path);
      if(!item||Object.keys(item).sort().join(',')!=='path,sha256'||item.sha256!==f.sha256)throw new Error();
    }
  }catch{findings.push({path:'student-publication.json',findings:['missing-invalid-or-mismatched-public-manifest']});}
  return {status:findings.length?'FAIL':'PASS',files,findings,secretValuesOmitted:true};
}
export function preparePublication(studentPath,privatePath,destination) {
  const s=fs.lstatSync(studentPath),t=fs.lstatSync(privatePath);
  if(!s.isFile()||!t.isFile()||s.isSymbolicLink()||t.isSymbolicLink())throw new Error('Regular local input files required');
  const student=readUtf8(studentPath),teacher=readUtf8(privatePath);
  validatePrivatePair(student,teacher);
  if(fs.existsSync(destination))throw new Error('Destination must not already exist');
  fs.mkdirSync(destination,{recursive:true});
  try {
    fs.writeFileSync(path.join(destination,'index.html'),student,{flag:'wx'});
    fs.writeFileSync(path.join(destination,'.nojekyll'),'',{flag:'wx'});
    fs.writeFileSync(path.join(destination,'student-publication.json'),JSON.stringify({schema:'git-student-publication-v1',readiness:'NOT READY – BLOCKING ISSUE',files:[{path:'index.html',sha256:sha256(student)}]},null,2)+'\n',{flag:'wx'});
    const result=scanPublicationDirectory(destination);if(result.status!=='PASS')throw new Error('Prepared publication failed preflight');
    return result;
  }catch(e){fs.rmSync(destination,{recursive:true,force:true});throw e;}
}
export function scanGitHistory(gitDir) {
  const git=(...args)=>execFileSync('git',['--git-dir='+gitDir,...args],{maxBuffer:32*1024*1024});
  const refs=git('for-each-ref','--format=%(refname) %(objectname)').toString().trim().split('\n').filter(Boolean);
  if(!refs.length)throw new Error('Advertised/local refs required');
  const commits=git('rev-list','--all').toString().trim().split('\n').filter(Boolean),blobs=new Map();
  for(const commit of commits)for(const row of git('ls-tree','-rz',commit).toString().split('\0').filter(Boolean)) {
    const m=/^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(row);if(!m)continue;
    if(!blobs.has(m[1]))blobs.set(m[1],new Set());blobs.get(m[1]).add(m[2]);
  }
  const findings=[],inventory=[];
  for(const [blob,paths] of blobs) {
    const bytes=git('cat-file','blob',blob),names=[...paths].sort(),issues=new Set();
    if(bytes.includes(0))issues.add('binary-blob-requires-private-review');
    const text=bytes.toString('utf8');
    if(names.some(p=>/\.html?$/i.test(p)))scanStudentHtml(text).findings.forEach(x=>issues.add(x));
    else {
      if(/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----|["']privateKey["']\s*:|["']ucitelPinHash["']\s*:|["']answer[_-]?key["']\s*:/i.test(text))issues.add('private-or-answer-material');
      if(/sourceMappingURL\s*=|"sourcesContent"\s*:/i.test(text))issues.add('source-map');
      if(/(?:[\"']kty[\"']\s*:\s*[\"']RSA[\"'][\s\S]{0,6000}[\"']d[\"']\s*:\s*[\"'][A-Za-z0-9_-]{16,}|[\"']d[\"']\s*:\s*[\"'][A-Za-z0-9_-]{16,}[\s\S]{0,6000}[\"']kty[\"']\s*:\s*[\"']RSA[\"'])/.test(text))issues.add('private-jwk');
      if(/(?:ucitelPinHash|teacher[_ -]?secret(?:[_ -]?hash)?|teacherPinHash|recoveryCodeHash|identityCodeHashes|studentHashes|diffRosterSalt|answer[_ -]?(?:key|hash(?:es)?|checksum|seed)|shuffle[_ -]?seed)[\"']?\s*[:=]/i.test(text))issues.add('private-or-answer-derived-data');
    }
    if(names.some(p=>/(?:^|\/)(?:teacher|verifier|roster|recovery|backup|debug)|\.(?:map|zip|pem|key|p12|pfx|bak|old)$/i.test(p)||(/\.json$/i.test(p)&&p!=='student-publication.json')))issues.add('private-backup-or-data-file-requires-review');
    if(names.includes('student-publication.json'))try{const m=JSON.parse(text);if(Object.keys(m).sort().join(',')!=='files,readiness,schema'||m.schema!=='git-student-publication-v1'||m.readiness!=='NOT READY – BLOCKING ISSUE'||!Array.isArray(m.files)||m.files.some(f=>Object.keys(f).sort().join(',')!=='path,sha256'||!/^[A-Za-z0-9_-]+\.html$/.test(f.path)||!/^[0-9a-f]{64}$/.test(f.sha256)))throw new Error();}catch{issues.add('private-or-invalid-public-manifest');}
    inventory.push({blob,paths:names,bytes:bytes.length,sha256:sha256(bytes)});
    if(issues.size)findings.push({blob,paths:names,findings:[...issues].sort()});
  }
  return {schema:'git-student-history-scan-v1',status:findings.length?'FAIL':'PASS',refs,reachableCommits:commits.length,reachableBlobs:blobs.size,inventory,findings,secretValuesOmitted:true,scope:'All unique blobs reachable from available refs, including deleted files in older commits. Deleted/unadvertised refs, unreachable objects, caches, forks and detached Actions artifacts are outside this scan.'};
}
