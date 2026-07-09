# PLÁN MODULARIZACE — Generátor interaktivních testů

**Výchozí verze:** 6.11.70 (po hloubkovém auditu, 2026-07-09)
**Repo:** `Daniel22-dev/generator-testu` · **Nasazení:** GitHub Pages přes Actions (`scripts/build.mjs` → `dist/`)
**Stav plánu:** Celá mechanika (rozřez → složení → byte-identita → headless kontrola) byla **reálně ověřena** na verzi 6.11.70. Skripty níže nejsou návrh — proběhly a fungují.

---

## 0. Proč a co se NEMĚNÍ

Jediný `src/index.html` má 1,6 MB / ~17 000 řádků. GitHub web editor (tužtička) se s ním už trápí a každé vlákno Claude/ChatGPT musí polykat celý soubor. Modularizace = rozdělit **zdroj** do souborů po doménách; **výstup zůstává jeden offline HTML soubor** složený buildem, přesně jako u LUDUS.

### Neporušitelné invarianty (platí pro každé vlákno)

1. `dist/index.html` je jeden offline soubor — žádné CDN, žádné externí knihovny, žádné fonty zvenku.
2. Fáze F1 je **čistá konkatenace** — žádné ES moduly, žádné `import/export`, žádné přejmenovávání funkcí. Chování musí být identické.
3. Po každé změně: `node scripts/build.mjs` → `node tools/headless-check.mjs dist/index.html` → **✅ Vše prošlo** (Test Lab 25 pass / 0 fail).
4. SemVer bump v `const RELEASE` (v `src/js/01-core.js` po rozřezu) + záznam do `RELEASE.changes` (newest first, max 10) + stejná verze v `package.json`, `public/sw.js` (CACHE_NAME) a `public/manifest.webmanifest` (start_url).
5. Jedno vlákno = jeden modul (výjimka: explicitně povolené průřezové session). Builder pravidlo z LUDUS platí i tady.

---

## 1. Cílová struktura repozitáře

```
generator-testu/
├── .github/workflows/deploy.yml      (beze změny — volá node scripts/build.mjs)
├── package.json                      (přidá se "test": "node tools/headless-check.mjs dist/index.html")
├── scripts/
│   └── build.mjs                     (v2 — skládání z modulů, kód níže)
├── tools/
│   └── headless-check.mjs            (jsdom harness — definition of done)
├── public/                           (PWA: manifest, sw.js, icons — beze změny)
└── src/
    ├── access-manifest.json          (beze změny)
    ├── shell.html                    (kostra: doctype, <head>, placeholdery {{STYLES}} {{JS_MAIN}} {{JS_CS}} {{JS_PWA}})
    ├── styles.css                    (119,8 kB — celé CSS)
    └── js/                           (18 modulů, skládají se abecedně podle prefixu)
        ├── 01-core.js … 16-access.js
        ├── 50-cs-module.js
        └── 60-pwa.js
```

> `src/index.html` po fázi F1 **zaniká** (přesune se do `archive/index-v6.11.70.html` nebo se smaže — git historie ho drží). Statické HTML těla stránky zůstává uvnitř `shell.html` mezi `</style>` a prvním `<script>` — je to ~170 kB a dělit ho dál v F1 nemá smysl (edituje se zřídka).

## 2. Ověřená mapa modulů (kotvy platné pro 6.11.70)

| Soubor | kB | Obsah | Otevři vlákno, když… |
|---|---|---|---|
| `01-core.js` | 165 | Konstanty, TYPE_MIN, RELEASE + changelog, BUILD_HASH, RELEASE_CS, výchozí `state`, DOM helpery `$`/`esc`, modal/toast vrstva, bezpečnostní kód školy, skupiny, roster | měníš verzi, changelog, výchozí stav, toasty/modaly |
| `02-state-persistence.js` | 38 | Normalizace načteného stavu, křížové závislosti polí, light/dark, snapshot (SAVE_KEY), šablony učitele (TPL), přenos zadání, historie | bugy „po obnovení relace“, import/export zadání |
| `03-ui-render.js` | 35 | `applyVisualState`, navigace kroků, pickery, AI návrhy poslech/čtení, věková skupina, pedagogická vrstva | cokoli „nezobrazuje se správně aktivní tlačítko“ |
| `04-templates.js` | 22 | SIMPLE_TEMPLATES, SIMPLE_LOCK_LABELS, výběr/odepnutí/detail šablony, zamykání voleb (.tpl-locked), feedbackMode/diferenciace poznámky, měřič zdroje | přidáváš/měníš šablonu, zamykání voleb |
| `05-form-fields.js` | 108 | CEFR, čas, taby, upload souborů, URL, skupiny UI, tooltips, validace, žolík, detailní config cvičení, hybrid banner | formulářová pole kroku 1–3 |
| `06-result-didactics.js` | 25 | Výsledková obrazovka, didaktická kontrola, copy, a11y, fullscreen, init() | krok 4, didaktická kontrola |
| `07-gemini.js` | 65 | Gemini klient, klíč/model, docx extrakce, smoke-test pomocníci | API, modely, limity |
| `08-manual-editor.js` | 72 | Manuální editor cvičení (mf*), formy pro složité typy, generování s manuálními, hybrid split/batch | ruční tvorba cvičení |
| `09-selftest-keycheck.js` | 58 | Self-testy bodování (offline i instant), „dvojí klíč“ AI ověření, SecretScanner | self-test, ověření klíče, scanner |
| `10-testlab.js` | 71 | Admin Test Lab (tl*), E2E starter export | diagnostika, nové tl kontroly |
| `11-preview-editor.js` | 42 | Náhled testu, vizuální editor otázek (ed*), alt_answers | editor po vygenerování |
| `12-prompt-builder.js` | 51 | Content Prompt Builder, ochrana proti prompt injection | znění promptu pro AI |
| `13-secure-export.js` | 223 | Test Template Engine, tvrdá brána ostrého režimu, secure offline balíček (student + verifier), split-screen indikátor | **největší modul** — bezpečný export |
| `14-test-html-builders.js` | 142 | HTML buildery, embedded test JS (string šablony), test CSS | vzhled/chování vygenerovaného testu |
| `15-welcome-onboarding.js` | 15 | Uvítací modaly, vokativ, first-run 4 kroky | onboarding |
| `16-access.js` | 68 | Přístupový a auditní systém (PIN, role, access-manifest) | přístupy kolegů |
| `50-cs-module.js` | 93 | Modul Český jazyk V16+ (IIFE, monkey-patchuje core funkce — **musí se skládat až po 01–16**) | cokoli českého |
| `60-pwa.js` | 0,3 | Registrace service workeru | PWA |

**Volitelné dozdělení později (F4):** `13-secure-export.js` na `13a-template-engine` + `13b-secure-package` (kotva `// ─── Secure offline package`), `01-core.js` na konstanty vs. UI helpery. Nedělej v F1.

---

## 3. Fáze a kopírovatelné prompty

### F0 — Záloha (bez vlákna, 2 minuty)

V repu vytvoř tag/release `v6.11.70-pre-modular` (GitHub → Releases → Draft new release → tag `v6.11.70-pre-modular` z main). Tím je návrat vždy možný.

---

### F1 — Rozřez + build v2 (JEDNO vlákno)

Vlákno dostane: aktuální `src/index.html` (v6.11.70) + tento plán. Zkopíruj tento prompt:

```
KONTEXT: Repo Daniel22-dev/generator-testu, aplikace „Generátor interaktivních testů"
v6.11.70 — jeden soubor src/index.html (1,6 MB), build scripts/build.mjs jen kopíruje
do dist/, GitHub Actions nasazuje dist/ na Pages. Provádím fázi F1 plánu modularizace:
mechanický rozřez na moduly + build v2. ŽÁDNÝ refaktoring, žádné ES moduly, žádné
přejmenování — čistá konkatenace, výstup musí být byte-identický (kromě BUILD komentáře).

ÚKOL:
1. Vytvoř scripts/split.mjs a nový scripts/build.mjs přesně podle kódu v příloze
   plánu (sekce 4 a 5) — kód je ověřený na v6.11.70, neupravuj kotvy.
2. Spusť: node scripts/split.mjs  → vznikne src/shell.html, src/styles.css, src/js/ (18 souborů).
3. Spusť: node scripts/build.mjs  → dist/index.html.
4. OVĚŘ BYTE-IDENTITU: dist/index.html po odstranění řádku „<!-- BUILD: … -->" se musí
   rovnat původnímu src/index.html. Pokud ne, STOP a reportuj rozdíl, nic nenahrávej.
5. Spusť tools/headless-check.mjs dist/index.html (potřebuje npm i -D jsdom) —
   musí skončit „✅ Vše prošlo" a Test Lab 25 pass / 0 fail.
6. Přesuň src/index.html do archive/index-v6.11.70.html, smaž scripts/split.mjs
   (jednorázový), přidej do package.json: "test": "node tools/headless-check.mjs dist/index.html".
7. Bump verze na 6.12.0 (minor — změna struktury zdroje, chování beze změny):
   const RELEASE v src/js/01-core.js, package.json, public/sw.js CACHE_NAME,
   public/manifest.webmanifest start_url. Changelog záznam „MODULARIZACE ZDROJE (6.12.0): …"
   (newest first, max 10 záznamů — nejstarší vyřaď).
8. Výstup: seznam souborů k nahrání na GitHub + obsah každého NOVÉHO malého souboru
   (shell.html, build.mjs, package.json). Velké moduly src/js/* mi dej jako soubory
   ke stažení, ne do chatu.

PRAVIDLA: jeden offline dist soubor, žádné CDN. Neměň nic uvnitř modulů. Pokud kotva
selže (soubor se od 6.11.70 posunul), zastav se a vypiš, která.
```

### F2 — Ověření nasazení (krátké vlákno nebo ručně)

Po pushi F1: (1) zelený běh v Actions, (2) otevřít Pages URL, hard-refresh, ověřit v changelog modalu verzi 6.12.0, (3) vygenerovat jeden reálný test s Gemini a projet self-test + verifier, (4) na mobilu ověřit, že PWA po aktualizaci natáhla novou verzi (CACHE_NAME bump). Teprve pak smazat starý tag z hlavy.

### F3 — Běžný vývoj v modulárním režimu (šablona pro každé budoucí vlákno)

```
KONTEXT: Repo Daniel22-dev/generator-testu, „Generátor interaktivních testů" v6.12.x.
Zdroj je modulární: src/shell.html + src/styles.css + src/js/01…60 (konkatenace přes
scripts/build.mjs do jednoho offline dist/index.html — žádné ES moduly). Verze a
changelog žijí v src/js/01-core.js (const RELEASE). Definition of done:
node scripts/build.mjs && node tools/headless-check.mjs dist/index.html → ✅ Vše prošlo.

MODUL TOHOTO VLÁKNA: src/js/<ČÍSLO-NÁZEV>.js — přikládám ho. Ostatní moduly needituj;
pokud změna nutně zasahuje jinam, zastav se a napiš, kam a proč.

ÚKOL: <popis změny>

PRAVIDLA:
- Automaticky bump SemVer v RELEASE + záznam do RELEASE.changes (newest first, max 10)
  — pošli mi k tomu i patch pro 01-core.js (jen ten jeden blok).
- Při změně chování PWA/verze bump i package.json, public/sw.js, manifest.webmanifest.
- Výstup: jen kód + kam ho na GitHubu vložit, bez okolního vysvětlování.
- Jeden offline dist soubor, žádné CDN, systémová písma, UTF-8.
```

K vláknu nahraješ jen: dotčený modul (desítky kB místo 1,6 MB) + případně `01-core.js` kvůli changelogu. To je hlavní zisk celé akce.

### F4 — Volitelné dozdělení velkých modulů (později, každé své vlákno)

Kandidáti: `13-secure-export.js` (223 kB), `14-test-html-builders.js` (142 kB), `01-core.js` (165 kB). Stejná mechanika: nová kotva, split na dva soubory se zachováním pořadí, byte-identita, headless check.

### F5 — ARCHITEKTURA.md (jedno vlákno)

Vygenerovat z tabulky v sekci 2 dokument pro budoucí vlákna: mapa modulů, datové toky (state → prompt → Gemini → editor → export), seznam globálních kontraktů mezi moduly (state, esc/$, uiToast, RELEASE…), pravidla vláken.

---

## 4. Příloha A — `scripts/split.mjs` (jednorázový, ověřený na 6.11.70)

```js
// scripts/split.mjs — JEDNORÁZOVÝ rozřez src/index.html na moduly (fáze F1).
// Kotvy platí pro verzi 6.11.70. Po úspěchu se soubor maže.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync('src/index.html', 'utf8');

const styleOpen  = src.indexOf('<style>');
const styleClose = src.indexOf('</style>');
const s1o = src.indexOf('<script>', styleClose);
const s1c = src.indexOf('</script>', s1o);
const s2o = src.indexOf('<script>', s1c);
const s2c = src.indexOf('</script>', s2o);
const s3o = src.indexOf('<script>', s2c);
const s3c = src.indexOf('</script>', s3o);
if ([styleOpen, styleClose, s1o, s1c, s2o, s2c, s3o, s3c].some(x => x < 0))
  throw new Error('Chybí zónová značka — soubor nemá očekávanou strukturu.');

const head      = src.slice(0, styleOpen + 7);
const css       = src.slice(styleOpen + 7, styleClose);
const midHtml   = src.slice(styleClose, s1o + 8);
const jsMain    = src.slice(s1o + 8, s1c);
const between12 = src.slice(s1c, s2o + 8);
const jsCs      = src.slice(s2o + 8, s2c);
const between23 = src.slice(s2c, s3o + 8);
const jsPwa     = src.slice(s3o + 8, s3c);
const tail      = src.slice(s3c);

const anchors = [
  ['01-core',               null],
  ['02-state-persistence',  '// ═══ Normalizace načteného stavu'],
  ['03-ui-render',          '// ═══ Visual state sync'],
  ['04-templates',          '// ═══ SDÍLENÉ ŠABLONY TESTU'],
  ['05-form-fields',        '// ═══ CEFR ══'],
  ['06-result-didactics',   '// ═══ Result ══'],
  ['07-gemini',             '// ═══ Gemini Integration'],
  ['08-manual-editor',      '// ── LEVEL 3: MANUÁLNÍ EDITOR CVIČENÍ'],
  ['09-selftest-keycheck',  '// ── Bezpečný offline režim: testuje skutečné funkce verifieru'],
  ['10-testlab',            '// ═══ Admin Test Lab'],
  ['11-preview-editor',     '// ═══ Náhled testu před stažením'],
  ['12-prompt-builder',     '// ═══ Content Prompt Builder'],
  ['13-secure-export',      '// ═══ Test Template Engine'],
  ['14-test-html-builders', '// ─── HTML builders'],
  ['15-welcome-onboarding', '// ── Uvítací modal'],
  ['16-access',             '// ===== INSERTED: ACCESS + AUDIT MODULE (start) ====='],
];
const pos = anchors.map(([name, marker]) => {
  if (marker === null) return [name, 0];
  const i = jsMain.indexOf(marker);
  if (i < 0) throw new Error('Kotva nenalezena: ' + name);
  if (jsMain.indexOf(marker, i + 1) >= 0) throw new Error('Kotva není unikátní: ' + name);
  return [name, i];
});
for (let i = 1; i < pos.length; i++)
  if (pos[i][1] <= pos[i - 1][1]) throw new Error('Špatné pořadí kotev u ' + pos[i][0]);

fs.mkdirSync('src/js', { recursive: true });
fs.writeFileSync('src/shell.html',
  head + '{{STYLES}}' + midHtml + '{{JS_MAIN}}' + between12 + '{{JS_CS}}' + between23 + '{{JS_PWA}}' + tail);
fs.writeFileSync('src/styles.css', css);
fs.writeFileSync('src/js/50-cs-module.js', jsCs);
fs.writeFileSync('src/js/60-pwa.js', jsPwa);
for (let i = 0; i < pos.length; i++) {
  const end = i + 1 < pos.length ? pos[i + 1][1] : jsMain.length;
  fs.writeFileSync(path.join('src/js', pos[i][0] + '.js'), jsMain.slice(pos[i][1], end));
}
console.log('✅ Rozřez hotov:', pos.length + 2, 'JS modulů + shell + styles.');
```

## 5. Příloha B — `scripts/build.mjs` v2 (ověřený)

```js
// scripts/build.mjs — v2 (modulární skládání). Čistá konkatenace, žádné ES moduly.
import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const DIST = path.join(DIST_DIR, "index.html");
const MANIFEST_SRC = path.resolve("src/access-manifest.json");
const MANIFEST_DIST = path.join(DIST_DIR, "access-manifest.json");
const PUBLIC_DIR = path.resolve("public");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.mkdirSync(DIST_DIR, { recursive: true });

const shell = fs.readFileSync("src/shell.html", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const jsDir = "src/js";
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).sort();
const mainParts = jsFiles.filter(f => !f.startsWith("50-") && !f.startsWith("60-"));
const jsMain = mainParts.map(f => fs.readFileSync(path.join(jsDir, f), "utf8")).join("");
const jsCs  = fs.readFileSync(path.join(jsDir, "50-cs-module.js"), "utf8");
const jsPwa = fs.readFileSync(path.join(jsDir, "60-pwa.js"), "utf8");

// replace() s funkcí kvůli $-sekvencím v kódu (string replacement patterny by obsah rozbily)
let out = shell
  .replace("{{STYLES}}", () => styles)
  .replace("{{JS_MAIN}}", () => jsMain)
  .replace("{{JS_CS}}", () => jsCs)
  .replace("{{JS_PWA}}", () => jsPwa);

const buildTime = new Date().toISOString();
out = out.replace(/(<html[^>]*>)/i, `$1\n<!-- BUILD: ${buildTime} -->`);
fs.writeFileSync(DIST, out, "utf8");

if (fs.existsSync(MANIFEST_SRC)) { fs.copyFileSync(MANIFEST_SRC, MANIFEST_DIST); console.log("✅  access-manifest.json zkopírován do dist/"); }
if (fs.existsSync(PUBLIC_DIR)) { copyDir(PUBLIC_DIR, DIST_DIR); console.log("✅  PWA soubory z public/ zkopírovány do dist/"); }
console.log("✅  Build dokončen z", mainParts.length + 2, "JS modulů");
console.log(`   dist/index.html →  ${(fs.statSync(DIST).size / 1024).toFixed(1)} kB`);
```

## 6. Příloha C — `tools/headless-check.mjs`

Dodán jako samostatný soubor u této analýzy (`headless-check.mjs`). Nahraj do `tools/` hned — funguje už teď proti jednosouborové verzi 6.11.70 i proti budoucí modulární. Vyžaduje `npm i -D jsdom` (jen lokálně/CI, do dist se nic nedostane).

---

## 7. Rizika a pasti (ověřeno při dry-runu)

1. **`</script>` uvnitř stringů** — generované testy obsahují `<\/script>` escapované; split řeže jen podle skutečných tagů. Nikdy escapování neodstraňuj, jinak se rozpadne parsování zón.
2. **`.replace()` s `$` sekvencemi** — obsah modulů obsahuje `$&`, `$'` apod.; build v2 proto používá `replace(pattern, () => obsah)`. Neměnit na prostý string replace.
3. **Pořadí modulů je kontrakt** — 50-cs-module monkey-patchuje funkce z 01–16 (`buildPrompt`, `goTo`, …), musí se skládat po nich. Číselné prefixy nikdy nepřehazovat.
4. **Kotvy drží jen pro 6.11.70** — split spouštěj na nezměněném souboru z této verze. Pokud mezitím vyjde 6.11.71+, nech si kotvy ve vlákně F1 znovu ověřit (skript při selhání kotvy sám zastaví).
5. **jsdom hlásí `Not implemented: navigation`** — neškodný šum, ignorovat.
6. **Test Lab warny** — „čip Test Lab skrytý“ a „není vygenerovaný test“ jsou očekávané v headless režimu; FAIL je jediný blokující stav.
7. **PWA cache** — po každém nasazení bump `CACHE_NAME`, jinak kolegům zůstane stará verze.
