#!/usr/bin/env node
import fs from 'node:fs'; import vm from 'node:vm';
const secure=fs.readFileSync('src/js/13e-secure-student-runtime.js','utf8');
const verifier=fs.readFileSync('src/js/13f-secure-teacher-verifier.js','utf8');
const instant=fs.readFileSync('src/js/14b-instant-test-runtime.js','utf8');
let failed=0; const need=(x,m)=>x?console.log('PASS '+m):(failed++,console.error('FAIL '+m));
const m=secure.match(/const SECURE_QUESTION_ORDER_JS=String\.raw`\n([\s\S]*?)`;\n/); need(!!m,'shared question-order source exists');
const body=m?m[1]:'';
need(/questionOrderBase\(CFG\.testId,currentAttemptId\(\),ACTIVE_KEY,STARTED_AT\)/.test(secure),'secure seed uses attempt identity');
need(/\.opts:not\(\.et-list\)/.test(secure),'secure error-tagging tokens stay ordered');
need(/\.mc-opts:not\(\.et-list\)/.test(instant),'instant error-tagging tokens stay ordered');
need(/displayOrder\(ei,\(ex\.items\|\|\[\]\)\.length\)/.test(instant),'instant feedback follows displayed order');
const ctx=vm.createContext({});vm.runInContext(body+';globalThis.q=questionOrderFor;globalThis.b=questionOrderBase;globalThis.s=questionOrderSeed;',ctx);
let ok=true,moved=0;for(let n=1;n<=12;n++)for(let t=0;t<40;t++){const seed=ctx.s(ctx.b('T'+t,'A'+n,'__default','2026-10-06T08:00:00.000Z'),t%5),ord=ctx.q(n,seed);if(ord.slice().sort((a,b)=>a-b).join(',')!==Array.from({length:n},(_,i)=>i).join(','))ok=false;if(ord.some((v,i)=>v!==i))moved++;if(JSON.stringify(ord)!==JSON.stringify(ctx.q(n,seed)))ok=false;}need(ok,'order is a deterministic permutation');need(moved>300,'order actually changes');
if(failed)process.exit(1);console.log('PASS randomization numbering contract');
