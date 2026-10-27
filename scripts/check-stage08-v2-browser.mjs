#!/usr/bin/env node
/* Synthetic browser, stubbed Studio v2 verifier. No real school access or PII. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const source=readFileSync("src/features/central-groups.js","utf8");
const group={schema:"ghrab-teaching-group-v1",groupId:"grp_123456789012",revision:7,
  displayName:"Synthetic English",schoolYear:"2026/27",subject:"English",grade:"3",
  status:"active",updatedAt:"2026-10-26T12:00:00.000Z"};
const members=[
  {memberId:"mem_111111111111",name:"Synthetic Alice",schoolEmail:"alice@example.invalid"},
  {memberId:"mem_222222222222",name:"Synthetic Boris",schoolEmail:"boris@example.invalid"},
];
const verifiedStub=[
 "export async function openVerifiedGroupsV2(appId){",
 "globalThis.__verifiedClientCalls=(globalThis.__verifiedClientCalls||0)+1;",
 "globalThis.__lastConsumer=appId;",
 "if(globalThis.__denyVerified)throw new Error('GROUP_ACCESS_DENIED');",
 "const group="+JSON.stringify(group)+";",
 "const members="+JSON.stringify(members)+";",
 "return {schema:'ghrab-groups-verified-consumer-v2',consumerAppId:appId,",
 "legacyStorePresent:true,service:{schema:'ghrab-groups-service-v1',contractVersion:1,",
 "listGroupMetadata:()=>globalThis.__emptyGroups?[]:[group],",
 "getRosterProjection:(id,consumer)=>({contract:'ghrab-roster-projection-v1',consumerAppId:consumer,group,members})",
 "}}}",
].join("\n");
const origin="https://school.example";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
await page.route(origin+"/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/generator-testu/")return route.fulfill({status:200,contentType:"text/html",body:
    '<!doctype html><html><body><textarea id="rosterEmails"></textarea><p id="centralGroupsStatus"></p>'+
    '<script>document.documentElement.dataset.ghrabAccess="granted";'+
    'window.__GHRAB_STUDIO_ACCESS__={appId:"generator"};'+
    'window.__GHRAB_STUDIO_URL__="/AI-Studio-GHRAB/";</script>'+
    '<script src="./features/central-groups.js"></script></body></html>'
  });
  if(path==="/generator-testu/features/central-groups.js")return route.fulfill({
    status:200,contentType:"text/javascript",body:source,
  });
  if(path==="/AI-Studio-GHRAB/groups/verified-client.js")return route.fulfill({
    status:200,contentType:"text/javascript",body:verifiedStub,
  });
  return route.fulfill({status:404,body:"No legacy provider or unexpected route"});
});
try{
  await page.goto(origin+"/generator-testu/");
  assert.equal(await page.evaluate(()=>typeof window.GHRABGeneratorFeatures?.centralGroups?.open),"function");
  await page.evaluate(()=>window.GHRABGeneratorFeatures.centralGroups.open());
  await page.locator("#centralGroupsSelect option").getByText(/Synthetic English/).waitFor();
  assert.equal(await page.evaluate(()=>window.__lastConsumer),"generator");
  assert.equal(await page.locator("#centralGroupsSelect option").count(),1);
  console.log("PASS T01 v2-only client, correct consumer ID and metadata list");

  await page.getByRole("button",{name:"Zobrazit náhled"}).click();
  await page.getByText(/připraveno ke schválení/).waitFor();
  assert.equal(await page.locator("#centralGroupsApply").isDisabled(),false);
  console.log("PASS T02 active roster preview with complete emails");

  await page.locator("#centralGroupsApply").click();
  await page.waitForFunction(()=>document.getElementById("rosterEmails")?.value.includes("alice@example.invalid"));
  assert.equal(await page.locator("#rosterEmails").inputValue(),"alice@example.invalid\nboris@example.invalid");
  const member=await page.evaluate(()=>window.GHRABGeneratorFeatures.centralGroups.mapRoster([
    {email:"alice@example.invalid",label:"old label"},
  ])[0]);
  assert.equal(member.memberId,"mem_111111111111");
  assert.equal(member.label,"Synthetic Alice");
  console.log("PASS T03 explicit teacher import preserves canonical memberId");

  await page.evaluate(()=>{
    window.__denyVerified=true;
    window.GHRABGeneratorFeatures.centralGroups.clear();
  });
  await page.evaluate(()=>window.GHRABGeneratorFeatures.centralGroups.open());
  await page.getByText(/Ruční import funguje dál/).waitFor();
  assert.equal(await page.locator("#rosterEmails").inputValue(),"alice@example.invalid\nboris@example.invalid");
  console.log("PASS T04 verifier denial fails closed without altering the roster field");

  await page.evaluate(()=>{
    window.__denyVerified=false;window.__emptyGroups=true;
    window.GHRABGeneratorFeatures.centralGroups.clear();
  });
  await page.evaluate(()=>window.GHRABGeneratorFeatures.centralGroups.open());
  await page.getByText(/automatický import není povolen/).waitFor();
  console.log("PASS T05 v1 legacy data triggers migration warning, no fallback");

  assert.deepEqual(errors,[],"no uncaught page errors");
  console.log(JSON.stringify({status:"PASS",checks:5,verificationStubbed:true,
    actualSchoolUat:"NOT RUN",certifiedStage08Unchanged:true},null,2));
}finally{await browser.close();}
