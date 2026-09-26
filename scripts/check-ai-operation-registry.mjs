#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const fail = (message) => {
  console.error(`FAIL ai-operations registry: ${message}`);
  process.exitCode = 1;
};
const read = (file) => fs.readFileSync(file, 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const CORE_INPUT_TYPES = new Set(['text', 'image', 'document']);

const publicRegistry = JSON.parse(read('public/ai-operations.json'));
const integration = read('src/js/07z-ai-core-integration.js');
const start = integration.indexOf('const GEN_AI_OPERATIONS=');
const end = integration.indexOf('function genConfigurationError', start);
if (start < 0 || end < 0) throw new Error('GEN_AI_OPERATIONS block not found.');
const block = integration.slice(start, end);
const schemaId = String(publicRegistry.operations?.[0]?.schemaId || 'generator.object.v1');
const runtimeRegistry = vm.runInNewContext(`(()=>{const GEN_AI_APP={id:${JSON.stringify(publicRegistry.appId)}};const GEN_AI_SCHEMA_ID=${JSON.stringify(schemaId)};${block};return GEN_AI_OPERATIONS;})()`, { Object });

const publicOps = new Map((publicRegistry.operations || []).map((op) => [op.operation, op]));
const runtimeOps = new Map(Object.entries(runtimeRegistry.operations || {}));
const publicNames = [...publicOps.keys()].sort();
const runtimeNames = [...runtimeOps.keys()].sort();

if (!same(publicNames, runtimeNames)) {
  const missing = publicNames.filter((name) => !runtimeOps.has(name));
  const extra = runtimeNames.filter((name) => !publicOps.has(name));
  fail(`operation set drift; missing runtime=[${missing.join(', ')}], extra runtime=[${extra.join(', ')}]`);
}

for (const [name, pub] of publicOps) {
  const run = runtimeOps.get(name);
  if (!run) continue;
  const expected = {
    outputSchemaId: pub.schemaId,
    defaultModelProfile: pub.defaultModelProfile,
    allowedModelProfiles: pub.allowedModelProfiles || [],
    inputTypes: (pub.inputTypes || []).filter((type) => CORE_INPUT_TYPES.has(type)),
    streaming: Boolean(pub.streaming),
    expectedOutputs: Number(pub.expectedOutputs || 1),
    maxOutputTokensHint: Number(pub.maxOutputTokensHint || 0),
  };
  const actual = {
    outputSchemaId: run.outputSchemaId,
    defaultModelProfile: run.defaultModelProfile,
    allowedModelProfiles: run.allowedModelProfiles || [],
    inputTypes: run.inputTypes || [],
    streaming: Boolean(run.streaming),
    expectedOutputs: Number(run.expectedOutputs || 1),
    maxOutputTokensHint: Number(run.maxOutputTokensHint || 0),
  };
  if (!same(expected, actual)) fail(`${name} drift\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
}

if (runtimeRegistry.appId !== publicRegistry.appId) fail(`appId drift: ${runtimeRegistry.appId} != ${publicRegistry.appId}`);
if (!process.exitCode) console.log(`PASS ai-operations registry parity: ${runtimeNames.length} operations; runtime input types normalized to GHRAB AI Core 1.0.0.`);
