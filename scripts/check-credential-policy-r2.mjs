import fs from 'node:fs';
import vm from 'node:vm';

const form=fs.readFileSync(new URL('../src/js/05-form-fields.js',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../src/js/01-core.js',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../src/js/08a-output-workflow.js',import.meta.url),'utf8');
const assembly=fs.readFileSync(new URL('../src/js/13g-assemble-test-html.js',import.meta.url),'utf8');

function ok(c,m){if(!c){console.error('FAIL R2:',m);process.exitCode=1}else console.log('PASS R2:',m)}
function sliceBetween(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw new Error('marker missing: '+a+' -> '+b);return src.slice(i,j)}

const normalize=core.match(/function normalizeCredentialInput\(value\)\{[^\n]+\}/)?.[0];
const policyBlock=sliceBetween(form,'const WEAK_SECRET_LIST = [','\n\nfunction workflowTypeStats()');
if(!normalize) throw new Error('normalizeCredentialInput missing');
const ctx={};
vm.createContext(ctx);
vm.runInContext(`${normalize}\n${policyBlock}\nglobalThis.__policy=credentialPolicyErrors;`,ctx);
const policy=ctx.__policy;

ok(Array.isArray(policy('TEACH-ABCDEF-123456','REC-AB12-CD34',true,'Daniel Teacher')) && policy('TEACH-ABCDEF-123456','REC-AB12-CD34',true,'Daniel Teacher').length===0,'valid distinct credentials pass');
ok(policy('REC-AB12-CD34','REC-AB12-CD34',true,'Daniel Teacher').some(x=>/stejny|stejn/i.test(x.normalize('NFD').replace(/[\u0300-\u036f]/g,''))),'same plaintext is rejected');
ok(policy('111111111111','REC-AB12-CD34',true,'Daniel Teacher').length>0,'weak Teacher/Admin secret is rejected');
ok(policy('TEACH-ABCDEF-123456','',true,'Daniel Teacher').length>0,'missing required Recovery Code is rejected');
ok(policy('TEACH-ABCDEF-123456','12345678',true,'Daniel Teacher').length>0,'weak Recovery Code is rejected');
ok(policy('TEACH-ABCDEF-123456','',false,'Daniel Teacher').length===0,'Recovery Code may be absent when not required');

ok((form.match(/credentialPolicyErrors\(/g)||[]).length>=2,'UI validation uses shared credential policy');
ok((workflow.match(/credentialPolicyErrors\(/g)||[]).length>=2,'settings drift/apply path uses shared credential policy');
ok(assembly.includes('credentialPolicyErrors(teacherAccessCode,classroomRecoveryCode,configForHash.lockOnLeave'),'assembleTestHtml enforces shared credential policy');
ok(/if\(credentialErrors\.length\)\{\s*throw new Error\('Test nebyl sestaven: '/.test(assembly),'assembleTestHtml fails closed on credential policy errors');

if(process.exitCode)process.exit(process.exitCode);
console.log('PASS R2 credential policy gate');
