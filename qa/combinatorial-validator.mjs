import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { webcrypto } from "node:crypto";

let runtimePromise;
async function runtime(root) {
  if (!runtimePromise) runtimePromise = (async () => {
    const protectedHtml = fs.readFileSync(path.join(root, "dist/index.html"), "utf8");
    const html = protectedHtml
      .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, "")
      .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, "")
      .replace("<body>", '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"PAIRWISE",displayName:"Pairwise QA",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"pairwise"}};<\/script>');
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      url: "https://qa.local/generator-testu/",
      pretendToBeVisual: true,
      beforeParse(w) {
        if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, "crypto", { value: webcrypto });
        w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
        w.scrollTo = () => {};
        w.HTMLElement.prototype.scrollIntoView = () => {};
        if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
        w.URL.createObjectURL = () => "blob:pairwise";
        w.URL.revokeObjectURL = () => {};
        w.fetch = async () => { throw new Error("network disabled in pairwise QA"); };
      },
    });
    await new Promise(resolve => setTimeout(resolve, 1300));
    return dom;
  })();
  return runtimePromise;
}
function setField(w, id, value) { const el = w.document.getElementById(id); if (el) el.value = value; }
export async function validateScenario(s, { root }) {
  const dom = await runtime(root);
  const w = dom.window;
  setField(w, "nazev", `Pairwise ${s.language}`);
  setField(w, "proKoho", "QA třída");
  setField(w, "latka", "Referenční látka");
  w.eval(`state=JSON.parse(JSON.stringify(DEFAULT));Object.assign(state,{
    appMode:${JSON.stringify(s.appMode)}, jazyk:${JSON.stringify(s.language)},
    uroven:${JSON.stringify(s.language === "čeština" ? [] : ["B1"])},
    typyCviceni:['multiple choice'], pocet:2, cas:15, odevzdavani:'B',
    testMode:${JSON.stringify(s.testMode)}, resultMode:${JSON.stringify(s.resultMode)},
    identityMode:${JSON.stringify(s.identityMode)}, anonymizace:'ANO', feedbackMode:'brief'
  });rosterEntries=[{email:'student@example.com',label:'QA',code:'ABC234'}];`);
  w.enforceModeConstraints();
  w.applyVisualState();
  w.validate();
  const actual = w.eval("({appMode:state.appMode,jazyk:state.jazyk,testMode:state.testMode,resultMode:state.resultMode,identityMode:state.identityMode,anonymizace:state.anonymizace})");
  const prompt = w.buildPrompt();
  const appModeSafe = s.appMode === "advanced" ? actual.appMode === "advanced" : ["simple", "advanced"].includes(actual.appMode);
  const resultSafe = s.testMode === "prisny"
    ? actual.resultMode === "secureOffline"
    : s.testMode === "procviceci"
      ? actual.resultMode === "instant"
      : actual.resultMode === s.resultMode;
  const simpleSafe = actual.appMode !== "simple" || (actual.testMode === "bezny" && actual.resultMode === "instant" && actual.identityMode === "name");
  const identitySafe = actual.appMode === "simple" || actual.identityMode === s.identityMode;
  const pass = prompt.length > 500 && actual.anonymizace === "ANO" && actual.jazyk === s.language && appModeSafe && resultSafe && simpleSafe && identitySafe;
  return {
    pass,
    message: pass ? "" : "Nesedí bezpečný normalizační invariant konfigurace nebo promptu.",
    evidence: `requested=${JSON.stringify(s)}; actual=${JSON.stringify(actual)}; prompt=${prompt.length}; appModeSafe=${appModeSafe}; resultSafe=${resultSafe}; simpleSafe=${simpleSafe}; identitySafe=${identitySafe}`,
  };
}
