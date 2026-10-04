import assert from 'node:assert/strict';
export const profileIds=['iphone-safari','ipad-safari','android-chrome','android-alt-chromium'];
export const taxonomy=['PREVENTED','DETECTED','HARDENED','BEST-EFFORT','CLIENT-CONTROLLED','ARCHITECTURAL LIMIT','SERVER REQUIRED','MIMO TECHNICKÝ DOSAH – POUZE DOZOR'];
const coverage=['keyboard','app-switch','screenshot','ocr-ai','siri','apple-intelligence','gemini','circle-to-search','split-screen','fullscreen','reload','bfcache','force-kill','lifecycle','timer','private-mode','alternative-browser','storage-reset','outbox','identity','client-edit','prestart','second-device','accessibility'];
export function validateMobileMatrix(m,version) {
  assert.equal(m.schema,'git-redteam-e7-mobile-matrix-v1');
  assert.equal(m.version,version);assert.equal(m.stage,'E7');
  assert.equal(m.stageStatus,'ANALYZED / NOT TESTED','E7 cannot claim mobile GREEN/PASS');
  assert.equal(m.readiness,'NOT READY – BLOCKING ISSUE');
  assert.equal(m.physicalDevicesTested,false,'Protocol cannot certify physical execution');
  assert.match(m.claimScope,/no physical mobile execution/i);
  assert.match(m.claimScope,/Headless\/desktop/);
  assert.equal(m.reportScope,'MANUALLY REPORTED / NOT VERIFIED');
  assert.deepEqual(m.categories,taxonomy);
  assert.deepEqual(m.profiles.map(p=>p.id),profileIds);
  assert.deepEqual(m.resultStatuses,['NOT RUN','PASS','FAIL','BLOCKED','NOT APPLICABLE']);
  assert.equal(m.cases.length,40);
  assert.equal(new Set(m.cases.map(c=>c.id)).size,40);
  for (const [i,c] of m.cases.entries()) {
    assert.equal(c.id,'M'+String(i+1).padStart(2,'0'));
    assert.equal(c.status,'NOT RUN','Authored cases are not executed evidence');
    assert.ok(c.profiles.length&&c.profiles.every(p=>profileIds.includes(p)));
    assert.ok(c.categories.length&&c.categories.every(cat=>taxonomy.includes(cat)));
    assert.ok(!c.categories.includes('PREVENTED'),'No advance mobile prevention claim');
    assert.ok(c.steps.length>=2&&c.steps.every(s=>typeof s==='string'&&s.length>20));
    for (const key of ['title','expected','limits','negativeControl']) assert.ok(typeof c[key]==='string'&&c[key].length>10,c.id+' missing '+key);
    assert.match(c.negativeControl,/^Kontrola:/);
    assert.ok(c.evidence.length>=3);
  }
  for (const key of coverage) assert.ok(m.cases.some(c=>c.coverage.includes(key)),'Missing coverage: '+key);
  for (const profile of profileIds) {
    const pc=m.cases.filter(c=>c.profiles.includes(profile));
    for (const key of ['keyboard','app-switch','screenshot','ocr-ai','fullscreen','reload','timer','private-mode','storage-reset','outbox','second-device']) {
      assert.ok(pc.some(c=>c.coverage.includes(key)),profile+' missing '+key);
    }
  }
  const second=m.cases.find(c=>c.coverage.includes('second-device'));
  assert.deepEqual(second.categories,['MIMO TECHNICKÝ DOSAH – POUZE DOZOR']);
  assert.match(second.limits,/Ani server/);
  const screenshot=m.cases.find(c=>c.id==='M10');
  assert.ok(screenshot.categories.includes('ARCHITECTURAL LIMIT'));
  assert.ok(!screenshot.categories.includes('SERVER REQUIRED'));
  assert.match(screenshot.expected,/bez web eventu/);
  const reset=m.cases.find(c=>c.id==='M30');
  assert.ok(reset.categories.includes('ARCHITECTURAL LIMIT')&&reset.categories.includes('SERVER REQUIRED'));
  const f7=m.cases.find(c=>c.id==='M37');assert.match(f7.expected,/nemá dokončené F7/);assert.match(f7.limits,/40bit/);
  assert.deepEqual(m.guardParameters,{blurDelayMs:900,ipadEditableWindowMs:2600,ipadViewportWindowMs:1800,awayHardThresholdMs:8000,splitRatio:0.60,splitSampleMs:2000,splitMinRunMs:10000});
  return true;
}
