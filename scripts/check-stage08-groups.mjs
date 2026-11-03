#!/usr/bin/env node
// Stage08A portable contract test. No browser credentials or genuine pupils.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const code=fs.readFileSync('src/features/central-groups.js','utf8');
const loader=fs.readFileSync('src/js/18-central-groups.js','utf8');
const test=fs.readFileSync('src/js/10-testlab.js','utf8');
const shell=fs.readFileSync('src/shell.html','utf8');
assert.ok(!/\blocalStorage\b/.test(code+loader),'Do not read Studio raw storage');
assert.ok(code.includes("mod.openVerifiedGroupsV2('generator')"),'GIT must request independently verified v2 teacher principal');
assert.ok(!code.includes('mod.createGroupsService()'),'No legacy unscoped v1 service fallback');
assert.ok(code.includes("verified?.schema !== 'ghrab-groups-verified-consumer-v2'"),'Validate trusted v2 transport contract');
assert.ok(code.includes("pendingLegacyMigration"),'Show pending migration without reading shared legacy storage');

assert.ok(loader.includes("load(featureName,'./features/central-groups.js')"),'Reuse canonical lazy loader');
assert.ok(loader.includes('CENTRAL_ACCESS_DENIED'),'Do not load on denied school access');
assert.ok(!/ghrab\.handoff\.|ghrab-material-v1|studentSubmissions|teacherPin|__roster\s*=/.test(code),'No material, secrets or result transport');
assert.ok(code.includes("service.listGroupMetadata(META_CONSUMER,{status:'active'})"),'Metadata-only list');
assert.ok(code.includes('service.getRosterProjection(id,ROSTER_CONSUMER)'),'Explicit teacher import');
assert.ok(code.includes('selected.fingerprint'),'Required fresh-read preview equality');
assert.ok(code.includes('CENTRAL_REVISION_ROLLBACK'),'Reject stale service revision');
assert.ok(code.includes('CENTRAL_REVISION_CONTENT_CONFLICT'),'Reject content drift within same revision');
assert.ok(code.includes('rosterIssuedCodes.clear()'),'Must invalidate stale local codes on changed group');
assert.ok(test.includes('GHRAB_GENERATOR_GROUPS?.mapRoster?.(parsed)'),'Uses mapped canonical labels');
assert.ok(test.includes('GHRAB_GENERATOR_GROUPS?.onRosterInput?.'),'Manual edit removes link');
assert.ok(test.includes("globalThis.GHRAB_GENERATOR_GROUPS?.onRosterInput?.(raw)"),'Recheck manual field even after programmatic changes');
assert.match(test, /function rosterForVerifier\(\)\{return rosterEntries\.map\(e=>\(\{code:e\.code,label:e\.label,email:e\.email\}\)\);\}/, 'Canonical IDs stay outside secured verifier payload');
assert.equal((code.match(/service\.getRosterProjection\(selected\.id,ROSTER_CONSUMER\)/g)||[]).length,2,'Recheck group after async teacher confirmation');
assert.ok(code.includes("dialog.addEventListener('close'"),'Closing modal invalidates pending previews');
assert.ok(shell.includes('onclick="GHRAB_GENERATOR_GROUPS.open()"'),'Action wired');

const inject='  globalThis.GHRABGeneratorFeatures.centralGroups=Object.freeze({open,mapRoster,onRosterInput,clear,displayMemberName,';
assert.equal(code.split(inject).length,2,'Single registration anchor');
const instrumented=code.replace(inject, `  globalThis.__E8_TEST__={checkMetadata,checkList,checkProjection,planImport,currentStudioBase,permitted,
    setLink(data,rows,txt){linked=data;expectedInput=txt;memberByEmail=new Map(rows.map(row=>[row.email,{memberId:row.memberId,name:row.name}]));}};\n`+inject);
const stub={
  console, URL, Date, Set, Map, Object, JSON,
  location:{href:'https://school.example/generator-testu/',origin:'https://school.example'},
  document:{documentElement:{dataset:{ghrabAccess:'granted'}},getElementById(){return null;}},
  __GHRAB_STUDIO_ACCESS__:{appId:'generator'},
};
stub.globalThis=stub;
vm.createContext(stub);
vm.runInContext(instrumented,stub,{filename:'18-central-groups.js'});
const a=stub.__E8_TEST__;
const group={schema:'ghrab-teaching-group-v1',groupId:'grp_123456789012',revision:7,
  displayName:'3A4 AJ',schoolYear:'2026/27',subject:'AJ',grade:'3',status:'active',updatedAt:'2026-10-26T12:00:00.000Z'};
const members=[{memberId:'mem_111111111111',name:'Alice Novak',schoolEmail:'alice@example.edu'},
  {memberId:'mem_222222222222',name:'Boris Svoboda',schoolEmail:'boris@example.edu'}];
const projection=(list=members,g=group)=>({contract:'ghrab-roster-projection-v1',consumerAppId:'generator-forms',group:g,members:list});
const r=a.checkProjection(projection(),group.groupId);
assert.equal(r.members.length,2);
const plan=a.planImport(r);
assert.equal(plan.total,2);assert.equal(plan.withEmail,2);assert.equal(plan.missing,0);
assert.equal(plan.rows[0].memberId,members[0].memberId);
assert.equal(plan.rows[0].name,'Alice Novak');
assert.equal(plan.rows[0].email,'alice@example.edu');
assert.equal(a.planImport(projection([{...members[0],schoolEmail:null}])).missing,1);
assert.equal(a.checkList([group]).length,1);
assert.throws(()=>a.checkList([{...group,members}]),/CENTRAL_METADATA_INVALID/);
assert.throws(()=>a.checkList([group,group]),/CENTRAL_DUPLICATE_GROUP/);
assert.throws(()=>a.checkProjection({...projection(),consumerAppId:'essay-evaluator'},group.groupId),/CENTRAL_PROJECTION_INVALID/);
assert.throws(()=>a.checkProjection(projection(), 'grp_999999999999'),/CENTRAL_GROUP_MISMATCH/);
assert.throws(()=>a.checkProjection(projection(),group.groupId+'x'),/CENTRAL_GROUP_MISMATCH/);
assert.throws(()=>a.checkProjection(projection([...members,members[0]]),group.groupId),/CENTRAL_MEMBER_INVALID/);
assert.throws(()=>a.checkProjection(projection([members[0],{...members[1],schoolEmail:members[0].schoolEmail}]),group.groupId),/CENTRAL_EMAIL_INVALID/);
assert.throws(()=>a.checkProjection(projection([{...members[0],name:'<img onerror=alert(1)>'}]),group.groupId),/CENTRAL_MEMBER_INVALID/);
assert.throws(()=>a.checkProjection(projection([{...members[0],code:'secret'}]),group.groupId),/CENTRAL_MEMBER_INVALID/);
assert.throws(()=>a.checkProjection(projection(members,{...group,status:'archived'}),group.groupId),/CENTRAL_GROUP_MISMATCH/);
assert.throws(()=>a.checkProjection(projection(members,{...group,revision:0}),group.groupId),/CENTRAL_METADATA_INVALID/);
assert.throws(()=>a.checkProjection(projection(Array.from({length:501},(_,i)=>({memberId:'mem_'+String(i).padStart(12,'0'),name:'Fake '+i,schoolEmail:'fake'+i+'@example.edu'}))),group.groupId),/CENTRAL_PROJECTION_INVALID/);
assert.throws(()=>a.checkProjection(projection([{...members[0],schoolEmail:'notanemail'}]),group.groupId),/CENTRAL_EMAIL_INVALID/);
assert.throws(()=>a.checkProjection(projection(members,{...group,members:[]} ),group.groupId),/CENTRAL_METADATA_INVALID/);
const api=stub.GHRABGeneratorFeatures.centralGroups;
assert.equal(api.getLinkMetadata(),null);
a.setLink({groupId:group.groupId,revision:7,memberCount:2},plan.rows,'alice@example.edu\nboris@example.edu');
assert.equal(api.mapRoster([{email:'alice@example.edu',label:'alice'}])[0].label,'Alice Novak');
assert.equal(api.getLinkMetadata().revision,7);
api.onRosterInput('modified@example.edu');
assert.equal(api.getLinkMetadata(),null);
assert.equal(api.mapRoster([{email:'alice@example.edu',label:'alice'}])[0].label,'alice');
assert.equal(a.currentStudioBase(),'https://school.example/AI-Studio-GHRAB/groups/verified-client.js');
stub.__GHRAB_STUDIO_URL__='https://other.example/AI-Studio-GHRAB/';
assert.throws(()=>a.currentStudioBase(),/CENTRAL_ORIGIN_DENIED/);
stub.__GHRAB_STUDIO_URL__=undefined;
stub.document.documentElement.dataset.ghrabAccess='denied';
assert.throws(()=>a.permitted(),/CENTRAL_ACCESS_DENIED/);
console.log('STAGE08A PORTABLE CHECKS: PASS (contracts, privacy, revocation, UI wiring)');

// Stage08 trust-anchor/workflow binding: a new signed release must never
// retain a prior version's GARP2.7 external trust SHA in promotion workflows.
const expectedTrustHash=crypto.createHash('sha256')
  .update(fs.readFileSync('security/garp27/trust-anchor.json')).digest('hex');
let trustBindingCount=0;
for(const filename of fs.readdirSync('.github/workflows').filter(x=>/\.ya?ml$/.test(x))){
  const content=fs.readFileSync('.github/workflows/'+filename,'utf8');
  for(const match of content.matchAll(/GARP27_EXTERNAL_TRUST_SHA256:\s*([a-f0-9]{64})/g)){
    assert.equal(match[1],expectedTrustHash,
      filename+' has a stale GARP2.7 external trust binding');
    trustBindingCount++;
  }
}
assert.ok(trustBindingCount>=7,'Required release workflows must bind the GARP trust anchor');
console.log('Stage08 GARP trust bindings verified: '+trustBindingCount);


// R20: teacher approval is asynchronous and may outlive a local edit.
// Synthetic browser state only: no actual pupil data, Google Forms or network.
assert.ok(code.includes('assertLocalImportUnchanged(localBefore,ticket,selected.id)'),
  'Central revision check must be combined with the local draft recheck');
const r20Source=code.replace(inject,
  "  globalThis.__R20__={apply:applySelection,init(p,svc,d){preview=p;servicePromise=Promise.resolve(svc);dialog=d},current:()=>linked};\n"+inject);
async function runR20(mutate=()=>{}) {
  const nodes={
    centralGroupsApply:{disabled:false},
    centralGroupsSelect:{value:group.groupId},
    rosterEmails:{value:'old@example.invalid'},
    centralGroupsPreview:{textContent:''},
    centralGroupsStatus:{textContent:''}
  };
  const modal={open:true,close(){this.open=false}};
  const current=projection();
  const service={getRosterProjection:()=>current};
  const ctx={
    console,URL,Date,Set,Map,Object,JSON,
    location:{href:'https://school.example/generator-testu/',origin:'https://school.example'},
    document:{documentElement:{dataset:{ghrabAccess:'granted'}},
      getElementById:key=>nodes[key]||null},
    rosterIssuedCodes:new Set(['ABCDEF']),
    rosterEntries:[{code:'ABCDEF',email:'old@example.invalid'}],
    lastAssembled:{sourceState:{__roster:[]}},
    rosterRefreshParticipants(){},
    __GHRAB_STUDIO_ACCESS__:{appId:'generator'}
  };
  ctx.uiConfirm=async()=>{mutate({nodes,modal,ctx});return true};
  ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(r20Source,ctx,{filename:'central-groups-r20-synthetic.js'});
  ctx.__R20__.init({id:group.groupId,revision:7,fingerprint:JSON.stringify(current)},service,modal);
  await ctx.__R20__.apply();
  return{nodes,modal,ctx,link:ctx.__R20__.current()};
}
const r20Healthy=await runR20();
assert.equal(r20Healthy.nodes.rosterEmails.value,'alice@example.edu\nboris@example.edu');
assert.equal(r20Healthy.ctx.rosterIssuedCodes.size,0);
assert.equal(r20Healthy.link?.groupId,group.groupId);
assert.equal(r20Healthy.modal.open,false);
for(const [name,edit] of [
  ['teacher changed input',({nodes})=>{nodes.rosterEmails.value='new@example.invalid'}],
  ['issued codes changed',({ctx})=>{ctx.rosterIssuedCodes.add('GHJKMN')}],
  ['local roster changed',({ctx})=>{ctx.rosterEntries.push({code:'GHJKMN',email:'new@example.invalid'})}],
  ['selection changed',({nodes})=>{nodes.centralGroupsSelect.value='grp_999999999999'}],
  ['dialog closed',({modal})=>{modal.open=false}],
  ['access revoked',({ctx})=>{ctx.document.documentElement.dataset.ghrabAccess='denied'}],
  ['test assembled',({ctx})=>{ctx.lastAssembled.sourceState.__roster.push({code:'GHJKMN'})}]
]) {
  const outcome=await runR20(edit);
  assert.equal(outcome.link,null,name+' cannot attach a stale group');
  assert.notEqual(outcome.nodes.rosterEmails.value,'alice@example.edu\nboris@example.edu',
    name+' cannot overwrite a local teacher field');
  assert.ok(outcome.ctx.rosterIssuedCodes.size>0,name+' cannot clear issued codes');
  assert.ok(outcome.ctx.rosterEntries.length>0,name+' cannot clear local rows');
  console.log('PASS Stage08 R20 - '+name+' fails closed');
}
console.log('PASS Stage08 R20 - async local draft integrity and teacher identity');
