#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve('.');
const read=file=>fs.readFileSync(path.join(root,...file.split('/')),'utf8');
const checks=[];
function check(condition,id,detail){assert.ok(condition,`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}

const core=read('src/js/01-core.js');
const loader=read('src/js/10-testlab.js');
const build=read('scripts/build.mjs');
const pkg=JSON.parse(read('package.json'));

check(core.includes('function generatorAssistantEvidenceSymbolExists(bare, sourceOverride)')&&core.includes("if(typeof sourceOverride==='string') return false"),'S83A-SRC-01','KB diagnostics distinguish an explicit negative corpus from the built application catalog');
check(core.includes("window.__GHRAB_GENERATOR_SOURCE_SYMBOLS__")&&build.includes("coreWithoutAssistant")&&build.includes("evidenceCorpus"),'S83A-SRC-02','build derives assistant evidence from application modules outside the KB itself');
check(build.includes("Object.defineProperty(window,'__GHRAB_GENERATOR_SOURCE_SYMBOLS__'")&&build.includes('writable:false,configurable:false'),'S83A-SRC-03','generated source-symbol catalog is immutable at runtime');
check(build.includes("error.message==='ASSISTANT_OFFLINE_FIRST_LOAD'")&&/bez připojení k internetu/.test(build),'S83A-SRC-04','first offline open has an explicit non-destructive explanation');
check(build.includes('Generátor a studentské testy zůstávají plně funkční')&&build.includes('return null;'),'S83A-SRC-05','assistant load failure is contained without an unhandled UI promise rejection');
check(loader.includes('loaded.get(absoluteUrl)===load')&&loader.includes('loaded.delete(absoluteUrl)'),'S83A-SRC-06','retry clears only the matching rejected GHRAB Platform module promise');
check(loader.includes("delete window.__GHRAB_GENERATOR_FEATURE_PROMISES[name]")&&loader.includes("!window.GHRABGeneratorFeatures[name]"),'S83A-SRC-07','failed feature promise and partial script are removed without evicting a registered feature');
const student=read('src/js/13d-secure-student-shell.js')+read('src/js/13e-secure-student-runtime.js')+read('src/js/14b-instant-test-runtime.js');
check(!/generator-assistant\.js|openGeneratorAssistant|GENERATOR_ASSISTANT_KB/.test(student),'S83A-SRC-08','optional teacher assistant remains absent from student runtimes');
check(pkg.scripts['check:s83a-assistant-remediation']==='node scripts/check-s83a-assistant-remediation.mjs'&&pkg.scripts['check:s83a-assistant-remediation-browser']==='node scripts/check-s83a-assistant-remediation-browser.mjs','S83A-SRC-09','source and Chromium remediation commands are registered');
check(pkg.scripts.postbuild.includes('check:s83a-assistant-remediation')&&pkg.scripts['preqa:p5'].includes('check:s83a-assistant-remediation-browser')&&pkg.scripts['preqa:p5:ci'].includes('check:s83a-assistant-remediation-browser')&&pkg.scripts['check:ci-orchestration'].includes('check-s83a-ci-wiring.mjs'),'S83A-SRC-10','assistant source/browser gates and their negative wiring controls are mandatory build/release prerequisites');

const result={schema:'git-s83a-assistant-remediation-source-v1',status:'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results','s83a-assistant-remediation-source.json'),JSON.stringify(result,null,2)+'\n');
console.log(`PASS Sprint 08.3a assistant source gate (${checks.length} checks)`);
