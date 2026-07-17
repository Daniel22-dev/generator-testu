import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync("dist/index.html", "utf8");
const executable = source
  .replace(
    /<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,
    "",
  )
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, "")
  .replace(
    "<body>",
    '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"QA-FIXTURE",displayName:"QA správce",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"qa-fixture"}};<\/script>',
  );

const dom = new JSDOM(executable, {
  runScripts: "dangerously",
  url: "https://qa.local/generator-testu/",
  pretendToBeVisual: true,
  beforeParse(w) {
    if (!w.crypto || !w.crypto.subtle)
      Object.defineProperty(w, "crypto", { value: webcrypto });
    w.matchMedia =
      w.matchMedia ||
      ((q) => ({
        matches: false,
        media: q,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
      }));
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
    w.URL.createObjectURL = () => "blob:qa-fixture";
    w.URL.revokeObjectURL = () => {};
    w.fetch = async (u) => {
      throw new Error(`network disabled in QA fixture: ${u}`);
    };
  },
});
const w = dom.window;
await new Promise((resolve) => setTimeout(resolve, 1500));
if (w.__errors?.length)
  throw new Error(`Generator runtime failed: ${w.__errors.join(" | ")}`);

function setField(id, value) {
  const el = w.document.getElementById(id);
  if (el) el.value = value;
}
function configure(name, secure) {
  setField("nazev", name);
  setField("proKoho", "2.A – QA");
  setField("latka", "Present Perfect a čtení s porozuměním");
  setField("ucitelJmeno", "QA učitel");
  setField("ucitelPin", "482915");
  setField("heslo", "QA-LOCK-2026");
  setField("bezpKod", "QA-SCHOOL-SECURITY-CODE");
  w.eval(`Object.assign(state, {
    appMode:'advanced', jazyk:'angličtina', instrJazyk:'cs', uroven:['B1'], kombinovat:false,
    pocet:1, typyCviceni:['multiple choice'], cas:15, odevzdavani:'B', randomizace:'NE',
    testMode:${JSON.stringify(secure ? "prisny" : "procviceci")}, layout:'classic',
    resultMode:${JSON.stringify(secure ? "secureOffline" : "instant")},
    identityMode:${JSON.stringify(secure ? "oneTimeCode" : "name")}, body:2,
    feedbackMode:${JSON.stringify(secure ? "none" : "brief")}, screenGuard:${secure ? "true" : "false"},
    tema:'default', zolicek:'NE', diferencovany:'NE', overeni:'NE', anonymizace:'ANO'
  });`);
  w.eval(
    "rosterEntries=[{email:'student@example.com',label:'QA student',code:'ABC234'}];",
  );
}
const generated = {
  exercises: [
    {
      title: "Multiple choice",
      type: "multiple choice",
      points_total: 2,
      points_each: 1,
      items: [
        {
          question: "Choose the correct sentence.",
          options: ["I have finished.", "I has finished."],
          correct: 0,
        },
        {
          question: "Choose the correct form.",
          options: ["She has gone.", "She have gone."],
          correct: 0,
        },
        {
          question: "Choose the correct question.",
          options: ["Have you seen it?", "Has you seen it?"],
          correct: 0,
        },
        {
          question: "Choose the correct negative.",
          options: ["They have not arrived.", "They has not arrived."],
          correct: 0,
        },
        {
          question: "Choose the correct participle.",
          options: ["written", "writed"],
          correct: 0,
        },
      ],
    },
  ],
};
const out = path.resolve("qa-results/qa-fixtures");
fs.mkdirSync(out, { recursive: true });
configure("QA referenční test", false);
const instant = await w.assembleTestHtml(
  w.eval("state"),
  w.JSON.parse(JSON.stringify(generated)),
);
if (typeof instant !== "string" || !instant.includes("QA referenční test"))
  throw new Error("Instant fixture nebyla vytvořena.");
fs.writeFileSync(path.join(out, "instant_test.html"), instant, "utf8");

configure("QA bezpečný test", true);
const secure = await w.assembleTestHtml(
  w.eval("state"),
  w.JSON.parse(JSON.stringify(generated)),
);
if (!secure?.studentHtml || !secure?.teacherHtml)
  throw new Error("Secure fixture neobsahuje student/verifier HTML.");
if (/ABC234|student@example\.invalid/.test(secure.studentHtml))
  throw new Error("Studentský fixture obsahuje čitelný roster.");
fs.writeFileSync(
  path.join(out, "student_test.html"),
  secure.studentHtml,
  "utf8",
);
fs.writeFileSync(
  path.join(out, "teacher_verifier.html"),
  secure.teacherHtml,
  "utf8",
);
fs.writeFileSync(
  path.join(out, "fixture-metadata.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      generatorVersion: w.eval("RELEASE.version"),
      instantBytes: Buffer.byteLength(instant),
      studentBytes: Buffer.byteLength(secure.studentHtml),
      teacherBytes: Buffer.byteLength(secure.teacherHtml),
      studentHtmlSha256: secure.studentHtmlSha256,
      teacherHtmlSha256: secure.teacherHtmlSha256,
    },
    null,
    2,
  ) + "\n",
);
w.close();
console.log(
  "✅ QA exportní fixtures vytvořeny: instant, student, teacher verifier",
);
