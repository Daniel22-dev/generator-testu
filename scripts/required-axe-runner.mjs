#!/usr/bin/env node

const target=process.argv[2];
const targets={
  runtime:'./qa-p5-axe-runtime.mjs',
  release:'./qa-p5-release.mjs'
};
if(!Object.hasOwn(targets,target)){
  console.error('Unknown required-axe target.');
  process.exit(2);
}
process.env.AXE_REQUIRED='1';
await import(targets[target]);
