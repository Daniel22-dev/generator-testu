
'use strict';

// ═══ Constants ════════════════════════════════════════════════════════════════
const STEP_LABELS = ["Základní info","Cvičení","Čas & forma","Doplňky"];

// ─── RELEASE ─────────────────────────────────────────────────────────────────
// JEDEN zdroj pravdy pro verzi. Všechna ostatní místa (title, footer, balíčky,
// archiv, feedback dokumenty) čtou odsud — netřeba synchronizovat. Při bumpu
// edituj jen tento blok.
//   version: SemVer-styl, "MAJOR.MINOR.PATCH[-tag]"
//   date:    'YYYY-MM-DD' kdy byla verze sestavena
//   status:  'production-serverless' = technicky ověřená produkční verze bez školního serveru
//            'draft' = ve vývoji, NEpoužívat pro ostré testy
//   changes: krátké body „co se v této verzi změnilo" (NEJNOVĚJŠÍ NAHOŘE).
//   PRAVIDLO: udržuj jen POSLEDNÍCH 10 záznamů. Při bumpu přidej nový na začátek
//   pole a smaž nejstarší (poslední) položku, ať jich zůstane 10. Zobrazení je navíc
//   pojištěné v showReleaseInfo (slice 0–10), takže víc než 10 se nikdy neukáže.
const RELEASE = Object.freeze({
  version: '7.0.8',
  date:    '2026-07-12',
  status:  'production-serverless',
  changes: [
    'INTEGROVANÝ INTERAKTIVNÍ MANUÁL (7.0.8): v pravém horním rohu přibylo samostatné tlačítko knihy. Otevírá úplný interaktivní manuál v nové kartě, takže nerozbíjí rozpracovaný test ani stávající rychlé návody, bezpečnostní pravidla a poradce. Manuál používá stejné oprávnění AI Studia jako aplikace a je součástí PWA balíčku.',
    'SJEDNOCENÁ IDENTITA ŠKOLY (7.0.7): záhlaví nyní používá stejné oficiální logo a výrazný název GYMNÁZIUM, OSTRAVA-HRABŮVKA jako ostatní nástroje AI Studia. Autorský blok v zápatí byl sjednocen na společný dvouřádkový formát.',
    'CENTRÁLNÍ PŘÍSTUP AI STUDIO GHRAB (7.0.6): původní lokální aktivační kódy a PIN brána byly nahrazeny kryptograficky podepsaným oprávněním vydávaným v AI Studiu. Generátor se nespustí před ověřením podpisu, platnosti, role, povolení aplikace a revokačního seznamu. Správce aktivuje přístup pouze jednou ve Studiu a stejná relace otevře všechny povolené aplikace; auditní Creator ID a role zůstávají ve výstupech zachované. Přímá adresa bez oprávnění zobrazí jednotnou zamykací obrazovku.',
    'NAPOJENÍ NA AI STUDIO GHRAB (7.0.5): Generátor umí bezpečně převzít krátkodobou lokální předávku GHRAB Material v1. Automaticky doplní název, skupinu/úroveň, předmět a látku i zdrojový obsah včetně strukturovaných úloh. Předávka má omezenou platnost, po načtení se smaže a nic se neposílá na server. Přidán viditelný návrat do AI Studia a anonymní místní záznam přínosu pro pilot.',
    'ODDĚLENÁ A NEZÁVISLÁ PŘÍSTUPOVÁ BRÁNA (7.0.4): zdrojové moduly se již neskládají do jediného obřího scriptu. Každý modul se spouští samostatně a závěrečný init je v samostatném modulu 99-init.js, takže chyba v jedné části formuláře už nezastaví spuštění PINu nebo aktivace. Statická nouzová tlačítka mají vlastní malý skript nezávislý na aplikaci; umějí odregistrovat service worker, smazat PWA cache, vynutit PIN nebo úplně obnovit místní profil. Přidán regresní test izolace modulů a funkčnosti nouzové obsluhy.',
    'OPRAVA ZAMRZNUTÉ PŘÍSTUPOVÉ BRÁNY (7.0.3): načtení externího access-manifestu má pevný časový limit a při nedostupnosti automaticky přejde na vestavěný seznam. Přístupový boot se plánuje ještě před inicializací formuláře, takže poškozený starý snapshot nebo jiná chyba rozhraní už nemůže zabránit zobrazení PINu či aktivace. Přidán watchdog a nouzová obsluha neošetřené chyby; statická brána nabízí odkazy pro nové načtení a reset místního profilu. Regresní test ověřuje i nikdy nekončící síťový požadavek.',
    'OPRAVA PŘÍSTUPOVÉ BRÁNY (7.0.2): aplikace je nyní zamčená už v samotném HTML ještě před spuštěním JavaScriptu, takže při chybě načtení nezůstane generátor otevřený. Odemčení relace je navázané na konkrétní verzi aplikace; po nasazení nové verze se existující zařízení znovu zeptá na místní PIN. Přidány servisní adresy ?lock=1 pro okamžité uzamčení a ?reset-access=1 pro smazání místního přístupového profilu a novou aktivaci. Headless test nově ověřuje, že čerstvé zařízení vždy zobrazí aktivační bránu a že session token obsahuje aktuální verzi.',
    'KOMPLETNÍ AUDIT NÁVAZNOSTI PRŮVODCE (7.0.1): přidána vydávací workflow matice, která ověřuje křížové závislosti jednoduchého i pokročilého režimu, všechny šablony, 13 presetů českého modulu, všech 38 podporovaných typů cvičení samostatně a všech 703 dvojic, 315 kombinací CEFR napříč pěti cizími jazyky, aktivaci a skrytí polí, obnovu starých rozporných stavů, úplný průchod kroky a runtime jednorázových kódů v instant i secure režimu. Opraveno: karta Bez šablony skutečně otevírá pokročilý režim; procvičování vždy vynutí instantní učící zpětnou vazbu a vypne žolík; secure režim vynutí celkové odevzdání bez okamžité zpětné vazby; české procvičovací presety nyní nastavují skutečný procvičovací režim; český modul už mimo češtinu neodkrývá globální typy při detailním rozpisu; vlastní stupnice blokuje mezery a překryvy s přesným vysvětlením; listening bez zdroje, nepodporované vlastní typy, více typů než cvičení, duplicitní členové skupin a neúplné 1:1 přiřazení rosteru jsou zablokovány. Jednorázové kódy se kontrolují i bez diferenciace v obou výstupech.',
    'PRODUKČNÍ SERVERLESS VYDÁNÍ (7.0.0): odstraněn rozpor mezi pilotní dokumentací a stavem aplikace; verze je nyní označena jako technicky ověřená produkční serverless varianta, nikoli jako formálně schválená školou. Kritická ochrana soukromí: jména studentů v diferenciaci se do AI promptu již nikdy neposílají a staré nastavení se automaticky převádí na bezpečný režim. Před prvním AI požadavkem v relaci se zobrazuje transparentní informace o přenosu zadání, URL a příloh do Gemini. Výchozí modely aktualizovány na stabilní gemini-3.5-flash a gemini-3.1-flash-lite, staré 2.5 volby se migrují. Odstraněny zastaralé pevné údaje o kvótách; aplikace odkazuje na aktivní limity projektu v AI Studiu. Opraveny ARIA role průvodce, kontrast pomocných textů, fokus klávesnice a mobilní hlavička. Doplněna produkční kontrola npm test, provozní pravidla, checklist vydání a auditní zpráva. Druhá kritická oprava soukromí odstranila čitelný seznam studentů z generovaných HTML: rozpis variant nyní používá náhodnou sůl a SHA-256 otisky, neznámý identifikátor je odmítnut místo přiřazení výchozí varianty. Interní poradce byl obsahově přepsán podle skutečného chování 7.0.0 a testy nově hlídají API kontrakt i soukromí výstupního rosteru.',
    'TECHNICKÁ STABILIZACE A PILOTNÍ PRAVIDLA (6.12.2): priorita A+B bez serveru. Velké bloky secure exportu a HTML builderů byly opatrně rozděleny na menší části 13a…13g a 14a…14d; spojení těchto částí bylo ověřeno proti původnímu obsahu. Přidán ESLint, kontrola struktury zdroje, kontrola známých osobních údajů v public access manifestu a rozšířený headless test: PWA soubory, bezpečné vložení JSON před &lt;/script&gt; a sestavení secureOffline balíku student + teacher verifier. Přístupové manifesty v repozitáři jsou anonymizované na obecné identifikátory ADMIN/TEACHER_01. Doplněn dokument PILOTNI-PRAVIDLA.md pro řízený školní pilot. Funkční chování aplikace se nemění.',
    'STABILIZAČNÍ BALÍK PRO GITHUB A PWA (6.12.1): doplněn jsdom do devDependencies, přidán package-lock pro opakovatelné instalace, GitHub Actions nově používají npm ci a před nasazením spouštějí npm test. Build nově kontroluje shodu verzí napříč package.json, RELEASE.version, PWA service workerem a manifestem, aby se předešlo staré cache nebo nejednotnému označení verze. Doplněny provozní dokumenty ARCHITEKTURA.md, SECURITY.md a CONTRIBUTING.md pro bezpečný další vývoj bez serveru. Funkční chování aplikace se nemění.',]
});
// Stabilní fingerprint verze — krátký hash z verze+data+statusu. Stejný zdroj = stejný
// hash. Slouží jako "build hash" v balíčcích a archivu, ať lze ostře rozlišit, který
// soubor test vyrobil. Není to kryptografický hash, jen identifikátor.
function computeBuildHash(){
  const s=RELEASE.version+'|'+RELEASE.date+'|'+RELEASE.status;
  let h=0x811c9dc5; // FNV-1a 32-bit
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0;}
  return h.toString(16).padStart(8,'0');
}
const BUILD_HASH = computeBuildHash();
const RELEASE_LABEL = RELEASE.version+' · '+RELEASE.date+' · '+BUILD_HASH;

// Samostatný changelog MODULU ČESKÝ JAZYK. Modul má vlastní verzování (V16…),
// nezávislé na verzi generátoru. Záznamy ve stejném formátu jako RELEASE.changes:
// "NÁZEV (V16): text". Newest first. Zobrazuje se v changelog modalu pod přepínačem
// „Modul ČJ" vedle hlavního changelogu generátoru.
const RELEASE_CS = Object.freeze({
  module:  'Modul Český jazyk',
  version: 'V19',
  date:    '2026-06-12',
  changes: [
    'BEZPEČNOSTNÍ AUDIT VAZEB (V19): šablony procházejí enforceModeConstraints (konec zakázané kombinace procvičovací + secureOffline) a toastem hlásí, co přepsaly na ostatních kartách. Varování pro známkovaný test čte skutečný režim (csDerivedGoal), ne jen goal ze šablony. Interpunkční checkbox je u interpunkčního jevu povinný a viditelně zamčený. Tlačítka počtu cvičení v ČJ skryta (počet = vybrané typy). Čeština vynucuje pokročilý mód, takže exerciseConfig modulu se skutečně propíše do generování. splitGenerate se po semi/manual umí vrátit. Ověřeno node --check + headless testy.',
    'SKRYTÍ NASTAVENÍ CVIČENÍ V CS REŽIMU (V18): tlačítko Nastavit cvičení podrobně a celá sekce s typy cvičení jsou v CS režimu skryté — typy i počet určuje modul ČJ, ruční zásah nedává smysl. Ověřeno node --check.',
    'DUPLIKÁT ODSTRANĚN ZE SKLADBY (V17): jev \'základní skladební dvojice\' odstraněn ze seznamu jevů kategorie Skladba — didakticky totožný s \'podmět a přísudek\', AI generovala překrývající se úlohy. Ověřeno node --check.',
    'SLOUČENÍ DO GENERÁTORU (V16): modul naroubován do bezpečnostní větve generátoru (v6.11.25). Integrační háčky protaženy přes cfg → studentský CFG → verifier CONFIG i do hashe (csScoringPolicy, csFeedbackPolicy, isCzech). Vše české je zahrazené na jazyk=čeština; cizí jazyky (EN/ES/FR/LA) běží beze změny. Ověřeno node --check.',
    'STRUKTUROVANÁ ZPĚTNÁ VAZBA (V16): objekt csFeedback (jev, pravidlo, proč správně/špatně, co zopakovat, typ chyby) se generuje u českých položek, zobrazuje studentovi v učícím režimu, učiteli v náhledu i ve verifieru a propisuje se do exportů feedbacku.',
    'ČESKÉ HODNOCENÍ ODPOVĚDÍ (V16): normForScore respektuje zvolenou přesnost — diakritika, interpunkce a velká písmena se hodnotí podle zadání. U češtiny se vypíná fuzzy tolerance překlepů (pravopis musí sedět přesně).',
    'TŘÍKROKOVÝ PRŮVODCE (V16): modul rozdělen do tří listů — 1/ učivo (ročník, oblost, jev), 2/ podoba úlohy, 3/ hodnocení a přesnost. Vlastní stav csModule, presety, bezpečnostní souhrn a kontrola rizik. Záloha a obnova generického stavu při přepnutí jazyka je symetrická.',
    'POZN.: historie modulu před V16 byla vyvíjena v samostatné větvi a do tohoto changelogu se nepřenášela; sledování začíná verzí V16.',
  ]
});

// POZN.: Klíče localStorage jsou záměrně zmrazené na 'v5_13_0', i když je aplikace
// na vyšší verzi. Drží se tím šablony, historie a rozpracovaný stav napříč buildy
// bez migrační smyčky. Verzi klíčů neměň jen kvůli bumpu verze aplikace.
const SAVE_KEY  = 'sestavovac_v5_13_0';
const TPL_KEY   = 'sestavovac_tpl_v5_13_0';
const HIST_KEY  = 'sestavovac_hist_v5_13_0';
const OLD_KEYS_TO_CLEAR = [
  'sestavovac_v5_14_0','sestavovac_tpl_v5_14_0','sestavovac_hist_v5_14_0','sestavovac_v5_12_0','sestavovac_tpl_v5_12_0','sestavovac_hist_v5_12_0',
  'sestavovac_v5_11_2','sestavovac_tpl_v5_11_2','sestavovac_hist_v5_11_2',
  'sestavovac_v5_11_1','sestavovac_tpl_v5_11_1','sestavovac_hist_v5_11_1',
  'sestavovac_v5','sestavovac_tpl_v5','sestavovac_hist_v5',
  'sestavovac_v5_4','sestavovac_tpl_v5_4','sestavovac_hist_v5_4',
  'sestavovac_v5_6','sestavovac_tpl_v5_6','sestavovac_hist_v5_6',
  'sestavovac_hist_v5_7','sestavovac_hist_v5_7_4','sestavovac_v5_7_1','sestavovac_tpl_v5_7_1','sestavovac_hist_v5_7_1','sestavovac_v5_7_2','sestavovac_tpl_v5_7_2','sestavovac_hist_v5_7_2','sestavovac_hist_v5_7_3','sestavovac_v5_8_0','sestavovac_hist_v5_8_0','sestavovac_v5_8_2','sestavovac_v5_8_1','sestavovac_hist_v5_8_2','sestavovac_hist_v5_8_1','sestavovac_v5_8_3','sestavovac_hist_v5_8_3','sestavovac_v5_8_4','sestavovac_hist_v5_8_4','sestavovac_v5_8_5','sestavovac_v5_9_4','sestavovac_tpl_v5_9_4','sestavovac_hist_v5_9_4','sestavovac_hist_v5_9_0','sestavovac_v5_9_0','sestavovac_tpl_v5_9_0','sestavovac_hist_v5_8_5','sestavovac_v5_9_1','sestavovac_tpl_v5_9_1','sestavovac_hist_v5_9_1','sestavovac_v5_9_3','sestavovac_tpl_v5_9_3','sestavovac_hist_v5_9_3'
];

const CEFR_LEVELS = ['A1','A2','B1','B2','C1','C2'];
const CEFR_DESC = {
  A1:'Začátečník — základní fráze a pozdravy',
  A2:'Mírně pokročilý — běžné každodenní situace',
  B1:'Středně pokročilý — orientace v textu, každodenní témata',
  B2:'Pokročilý — komplexnější témata, plynulejší vyjadřování',
  C1:'Velmi pokročilý — náročné texty, přesné vyjadřování',
  C2:'Mastery — akademická a literární úroveň, téměř rodilý mluvčí',
};

// minutes per exercise type for smart suggestion
const TYPE_MIN = {
  'multiple choice':4,'fill-in-the-blank':5,'matching':4,'word order':4,
  'translation':6,'true/false':3,'error correction':5,
  'cloze text':6,'sentence transformation':5,'reading comprehension':9,
  'dialogue completion':5,'categorization':3,'word formation':4,
  'listening comprehension':6,
  'odd one out':3,'multiple matching':7,'banked cloze':6,'key word transformation':6,
  'table-completion':5,
  'transformation-chain':6,
  'highlight-evidence':4,
  'synonym choice':4,'antonym choice':4,'choose the correct response':4,'match word to definition':4,
  'verb form':5,'preposition gap-fill':5,'question formation':5,'word family':4,
  'short answer':5,'paraphrase the sentence':6,
  'heading matching':7,'gist question':5,'summary cloze':6,
};

const DISABLED_EXERCISE_TYPES = ['open answer','image description'];
const DISABLED_TYPE_ALIASES = ['open','open question','free answer','image','picture description','picture','describe picture','image description'];
function isDisabledExerciseType(t) {
  const raw = String(t || '').trim().toLowerCase();
  return DISABLED_EXERCISE_TYPES.includes(raw) || DISABLED_TYPE_ALIASES.includes(raw);
}
function isAllowedExerciseType(t) {
  const raw=String(t || '').trim().toLowerCase();
  if(!raw || DISABLED_EXERCISE_TYPES.includes(raw) || DISABLED_TYPE_ALIASES.includes(raw)) return false;
  // Výsledný test má renderer a bodování jen pro explicitně podporované typy.
  // Volné označení typu by jinak spadlo do otevřené odpovědi bez spolehlivého klíče.
  if(typeof ALL_TYPES!=='undefined') {
    const norm=(typeof normalizeType==='function')?normalizeType(raw):raw;
    return ALL_TYPES.includes(raw) || ALL_TYPES.includes(norm);
  }
  return true;
}
function sanitizeExerciseTypeList(types) {
  return (types || []).map(normalizeType).filter(isAllowedExerciseType);
}


const THEME_SPECS = {
  modern:{nazev:'Moderní barevný',spec:`VIZUÁLNÍ DESIGN — Moderní barevný styl:
  • Header: gradient pozadí (#667eea → #764ba2), bílý text, border-radius 0 0 16px 16px
  • Karty cvičení: bílé, box-shadow 0 4px 20px rgba(0,0,0,0.1), border-radius 14px
  • Tlačítka: gradient (#667eea → #764ba2), hover lift transform: translateY(-2px), border-radius 9px
  • Progress bar průběhu testem: barevný gradient, animovaný (width transition)
  • Feedback: správně #22c55e s barvou pozadí, špatně #ef4444
  • Smooth CSS transitions (0.2s ease) na všech interaktivních prvcích
  • Výsledková karta: animovaný gradient border, velká čísla procent`},

  examBlue:{nazev:'Exam Blue / školní',spec:`VIZUÁLNÍ DESIGN — Exam Blue / školní styl:
  • Vycházej z kompaktního modrého layoutu: primární #1a3a6c, světlejší #2756a8, pozadí #f0f4f8, karta #ffffff, text #1a2332, muted #6b7a8d, border #dde3ea.
  • Intro: centrovaná karta max-width cca 560px, horní modrý gradient, název testu, předmět/třída, poté 2×2 overview grid: počet cvičení, body, čas, úroveň.
  • Rules & Consequences: kompaktní světlý žlutý box (#fff8e1, border #ffc107) s krátkými odrážkami. Text pravidel musí odpovídat skutečnému režimu testu a jazyku UI.
  • Test: sticky modrý header s názvem, jménem, timerem a Test ID; pod ním horizontální lišta Ex 1, Ex 2… se zaoblenými pill tlačítky.
  • Cvičení: bílé karty, header cvičení v modrém gradientu, výrazné kulaté číslo otázky, hodně vzduchu a dobrá čitelnost na mobilu.
  • Tlačítka: primární modrá #1a3a6c, submit zelený #2e7d32, varování/teacher akcent zlatý #e8a020, danger #c62828.
  • Učitelský mód: tmavý zkouškový vzhled #0d1b2a / #071120 se zlatým akcentem #e8a020 a zeleně zvýrazněnými správnými odpověďmi. Má být kontrolní, ne přeplácaný.
  • Výsledková karta: kompaktní modrá hlavička, velké body/procenta, jasná známka a screenshot-ready layout.`},
  dark:{nazev:'Tmavý / neon',spec:`VIZUÁLNÍ DESIGN — Tmavý neon styl:
  • Pozadí: #0a0e1a, karty: #0d1226, border: 1px solid rgba(0,245,255,0.15)
  • Primární akcentová barva: #00f5ff (cyan neon); sekundární: #7b2fff
  • Tlačítka: background #00f5ff, color #0a0e1a, box-shadow: 0 0 12px #00f5ff66
  • Text: #c8cde8 běžný, #ffffff nadpisy, #00f5ff akcenty
  • Feedback: správně #00f5ff, špatně #ff006e
  • Výsledková karta: tmavá s neonovými čísly, glow efekt na procentech`},
  nature:{nazev:'Příroda / zelená',spec:`VIZUÁLNÍ DESIGN — Přírodní zelený styl:
  • Pozadí: #f1f8f4, karty: #ffffff s border-left: 4px solid #2d9b5f
  • Primární: #2d9b5f; hover: #1e7a46; světlá varianta: #81c784
  • Tlačítka: #2d9b5f, bílý text, border-radius 8px
  • Nadpisy: #134e2a, text: #2d3748, hints: #6b8f71
  • Feedback: správně #2d9b5f, špatně #f59e0b (oranžová místo červené)
  • Výsledková karta: světlá, zelené akcenty, klidná a přehledná`},
  akademicky:{nazev:'Akademický',spec:`VIZUÁLNÍ DESIGN — Akademický čistý styl:
  • Pozadí: #f8fafc, karty: #ffffff, border: 1px solid #e2e8f0, border-radius 8px
  • Primární: #1976d2; sekundární: #e3f2fd
  • Tlačítka: #1976d2, bílý text, border-radius 6px, žádné výrazné stíny
  • Text: #1e293b, nadpisy: #1a237e font-weight 700, řádkování 1.6
  • Feedback: správně #16a34a, špatně #dc2626
  • Výsledková karta: tabulkový layout, přehledný, profesionální`},
  minimal:{nazev:'Minimalistický',spec:`VIZUÁLNÍ DESIGN — Minimalistický styl:
  • Pozadí: #fafafa, karty: #ffffff, jemný border 1px solid #e5e7eb, bez výrazných stínů
  • Primární akcent: #18181b; sekundární text: #52525b; doplňková šedá #f4f4f5
  • Tlačítka: jednobarevná tmavá, bílý text, border-radius 6px, bez gradientů
  • Layout: hodně volného prostoru, větší řádkování, jasná hierarchie nadpisů
  • Feedback: správně #15803d, špatně #b91c1c, bez animovaného blikání kromě časového varování
  • Výsledková karta: čistá, kontrastní, vhodná pro tisk i mobilní screenshot`},
  pastel:{nazev:'Pastelový',spec:`VIZUÁLNÍ DESIGN — Pastelový přívětivý styl:
  • Pozadí: #fff7ed nebo velmi světlý pastelový gradient, karty: #ffffff s jemným barevným okrajem
  • Primární akcent: #fb7185; sekundární akcent: #93c5fd; doplněk: #fde68a
  • Tlačítka: měkký gradient (#f9a8d4 → #93c5fd), zaoblené rohy 12px, decentní shadow
  • Text: #1f2937, popisky #6b7280; důraz na čitelnost, ne dětský vzhled
  • Feedback: správně #22c55e, špatně #ef4444, upozornění #f59e0b
  • Výsledková karta: světlá, měkké barvy, velké procento a přehledné bloky výsledků`},

  terakota:{nazev:'Teplá / Terakota',spec:`VIZUÁLNÍ DESIGN — Teplý terakotový styl (mobile-first, navržený pro pohodlné čtení a orientaci na telefonu):
  • Pozadí: teplá krémová #faf4ec; karty čistě bílé #ffffff s jemným okrajem #ece2d6 a měkkým stínem 0 6px 24px rgba(120,80,60,0.10), border-radius 18px.
  • Primární akcent: terakota #c75d3c; hover/tmavší #a84a2e; sekundární klidná modrozelená #2f7d77 pro doplňkové prvky a odkazy.
  • Text: hlavní #2b211c (teplá tmavá, vysoký kontrast), tlumený #7a6a60; nadpisy font-weight 700, pohodlné řádkování 1.6.
  • Header testu: plný terakotový pruh #c75d3c, bílý text, dolní rohy zaoblené (0 0 18px 18px); sticky a dobře čitelný i přes obsah pod ním.
  • Lišta cvičení: velké zaoblené pill taby s min. výškou 44 px a dostatečnými mezerami; aktivní tab plně terakotový s bílým textem, hotové cvičení s jemnou zelenou #2f9e6e tečkou nebo okrajem.
  • Karty otázek: hodně vnitřního prostoru (padding ~18px), výrazné kulaté číslo otázky v terakotovém kroužku, klikací odpovědi jako velké dlaždice (min. 48 px) s tučnějším terakotovým okrajem ve vybraném stavu.
  • Tlačítka: plná terakota, bílý text, border-radius 12px, výška min. 48 px, jasný stisknutý stav; submit zelený #2f9e6e; danger #d24b3e.
  • Feedback: správně #2f9e6e, špatně #d24b3e, upozornění #e0892f; klidná barevná změna bez agresivního blikání kromě časového varování.
  • Učitelský mód: tlumený teplý tmavý vzhled #2b211c se světlým textem a terakotovým akcentem #c75d3c; správné odpovědi zeleně zvýrazněné.
  • Výsledková karta: krémová #faf4ec, velké procento a známka, přehledné bloky, kompaktní na jeden mobilní screenshot.
  • Mobilní priorita: jednosloupcové rozložení, velké dotykové cíle, vysoký kontrast textu, žádné drobné odkazy ani prvky závislé jen na hoveru.`},
};

const DOM_FIELDS = ['nazev','proKoho','latka','vlastniTyp','zadaniText',
  'zadaniFileNote','zadaniUrlNote','listeningFocus','listeningQuestions','listeningTranscript','readingTopicCustom','readingText','readingQuestions','casCustom','bodyCustom','ucitelJmeno','poznamky','vlastniSkala'];
const SENSITIVE_FIELD_IDS = ['heslo','ucitelPin','bezpKod'];
const SCHOOL_SECURITY_CODE_KEY = 'sestavovac_school_security_code_v1';
const MAX_FILES = 12;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_PREVIEW_SIZE = 4 * 1024 * 1024;
const MAX_EMBEDDED_TEXT_BYTES = 300 * 1024;
const MAX_EMBEDDED_TEXT_CHARS = 24000;
// Strop délky zdrojového textu vkládaného do promptu pro AI (Gemini). Sjednoceno s limitem
// načítání souborů (MAX_EMBEDDED_TEXT_CHARS), aby nevznikala past, kdy se soubor tváří jako
// „celý v promptu", ale do AI jde jen jeho část. Když je zdroj delší, UI to hlasitě hlásí.
const MAX_SOURCE_CHARS_FOR_AI = 24000;
const TEXT_EMBED_EXT = ['txt','md','markdown','csv','tsv','json','rtf','html','htm','xml','yaml','yml','srt'];
const ALLOWED_FILE_EXT = ['pdf','txt','md','markdown','csv','tsv','json','rtf','html','htm','xml','yaml','yml','srt','docx','png','jpg','jpeg','gif','webp','heic','mp3','wav','m4a','ogg','aac','flac','mp4','mov','m4v','webm'];

const DEFAULT = {
  appMode:'simple', workPreset:'quick',
  jazyk:'', instrJazyk:'target', uroven:[], kombinovat:false,
  pocet:3, typyCviceni:[], zadaniTab:'text', rcLength:'medium', rcTopic:'', sourceSliceMode:'start',
  cas:30, odevzdavani:'', randomizace:'NE', testMode:'bezny', layout:'tabs', resultMode:'instant', identityMode:'name',
  body:0, gradeTyp:'skola', exerciseDetail:false, exerciseConfig:[],
  fuzzyTolerance:'off',
  aiGradeScale:null, aiGradeRaw:'',
  tema:'modern', zolicek:'NE', diferencovany:'NE',
  overeni:'NE', anonymizace:'ANO',
  skupiny:[], fileNames:[], urls:[''],
  // ── Pedagogicko-didaktická vrstva (BOD 5/6/7/8/15) ──
  ageGroup:'', ageGroupCustom:'',           // BOD 15 — věková skupina / ročník
  testPurpose:'',                            // pedagogický účel testu (label presetu)
  pedagogicalPreset:'',                      // BOD 6 — zvolený systémový preset
  simpleTemplate:'',                         // jednoduchá šablona (simple mode) — zamyká a skrývá volby
  screenGuard:false,                         // hlídání obrazovky (zámek při opuštění) nezávisle na testMode
  feedbackMode:'brief',                      // BOD 8 — none | brief | learning
  differentiationLevel:'standard',           // BOD 7 — basic | standard | challenge (celý test)
  exercisePedagogyMap:null,                  // BOD 5 — typ → pedagogická funkce (cache)
  didacticReview:null,                       // panel didaktické kontroly (poslední výpočet)
};

let state = JSON.parse(JSON.stringify(DEFAULT));
let currentStep = 0;
let maxStep = 0;
let groupIdCounter = 0;
let fileObjects = [];
let fileReadPromises = [];
let timeTipValue = 0;
let saveTimer = null;
let indicatorTimer = null;

// ═══ DOM ══════════════════════════════════════════════════════════════════════
const $  = id => document.getElementById(id);
const val = id => { const e = $(id); return e ? e.value : ''; };
const setVal = (id, v) => { const e = $(id); if (e) e.value = (v == null) ? '' : String(v); };
const trim = id => val(id).trim();
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function plainText(s){ return String(s ?? '').replace(/\s+/g,' ').trim(); }
function isSpanishLike(j){ const s=String(j||'').toLowerCase(); return s.includes('španěl') || s.includes('spanish') || s.includes('español') || s.includes('spani'); }
function isEnglishLike(j){ const s=String(j||'').toLowerCase(); return s.includes('anglič') || s.includes('english') || s.includes('angl'); }
function isGermanLike(j){ const s=String(j||'').toLowerCase(); return s.includes('němč') || s.includes('nemeck') || s.includes('german') || s.includes('deutsch'); }
function languageText(){ return state.jazyk || ''; }


// ═══ App modal/toast helpers: no native alert/confirm/prompt in generator UI ═══
let uiModalResolver = null;
function ensureToastStack(){
  let stack = document.getElementById('uiToastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'uiToastStack';
    stack.className = 'ui-toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}
function uiToast(message, type='ok', timeout=3600){
  const stack = ensureToastStack();
  const item = document.createElement('div');
  item.className = 'ui-toast ' + (type || 'ok');
  item.textContent = String(message || '');
  stack.appendChild(item);
  requestAnimationFrame(() => item.classList.add('visible'));
  setTimeout(() => {
    item.classList.remove('visible');
    setTimeout(() => item.remove(), 220);
  }, timeout);
}
function closeUiModal(value){
  const modal = document.getElementById('uiModal');
  if (modal) modal.remove();
  document.removeEventListener('keydown', uiModalKeyHandler);
  const resolve = uiModalResolver;
  uiModalResolver = null;
  if (resolve) resolve(value);
}
function uiModalKeyHandler(e){
  const modal = document.getElementById('uiModal');
  if (!modal) return;
  if (e.key === 'Escape') closeUiModal(null);
  if (e.key === 'Enter') {
    const input = modal.querySelector('.ui-modal-input');
    if (input && document.activeElement === input) closeUiModal(input.value.trim());
  }
}
function uiModal({title='Potvrzení', message='', input=false, defaultValue='', okText='OK', cancelText='', danger=false, boxClass='', html=false} = {}){
  if (uiModalResolver) closeUiModal(null);
  return new Promise(resolve => {
    uiModalResolver = resolve;
    const backdrop = document.createElement('div');
    backdrop.id = 'uiModal';
    backdrop.className = 'ui-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    const inputHtml = input ? `<input class="ui-modal-input" type="text" value="${esc(defaultValue)}" aria-label="${esc(title)}">` : '';
    // html:true → message je důvěryhodné HTML složené v kódu (ne vstup uživatele).
    const bodyHtml = html ? message : esc(message);
    backdrop.innerHTML = `
      <div class="ui-modal-box${boxClass ? ' ' + boxClass : ''}">
        <div class="ui-modal-head">${esc(title)}</div>
        <div class="ui-modal-body">${bodyHtml}</div>
        ${inputHtml}
        <div class="ui-modal-actions">
          ${cancelText ? `<button type="button" class="ui-modal-btn" data-ui-cancel>${esc(cancelText)}</button>` : ''}
          <button type="button" class="ui-modal-btn primary${danger ? ' danger' : ''}" data-ui-ok>${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const inputEl = backdrop.querySelector('.ui-modal-input');
    const okBtn = backdrop.querySelector('[data-ui-ok]');
    const cancelBtn = backdrop.querySelector('[data-ui-cancel]');
    okBtn.addEventListener('click', () => closeUiModal(inputEl ? inputEl.value.trim() : true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeUiModal(input ? null : false));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeUiModal(input ? null : false); });
    document.addEventListener('keydown', uiModalKeyHandler);
    setTimeout(() => { if (inputEl) { inputEl.focus(); inputEl.select(); } else okBtn.focus(); }, 0);
  });
}
function uiAlert(message, title='Upozornění', boxClass=''){
  return uiModal({title, message, okText:'Rozumím', boxClass});
}
function uiConfirm(message, title='Potvrzení', danger=false){
  return uiModal({title, message, okText:'Ano, pokračovat', cancelText:'Zrušit', danger}).then(Boolean);
}
function uiPrompt(title, defaultValue=''){
  return uiModal({title, message:'Zadej název a potvrď.', input:true, defaultValue, okText:'Uložit', cancelText:'Zrušit'});
}

/* Generator Assistant — lokální poradce ke generátoru (KB + UI + volitelné AI). */
// Generator Assistant
/* Generator Assistant — core (KB + search). Vkládá se 1:1 do generátoru. */
// Stav: 'reseno' | 'castecne' | 'ne'
const GENERATOR_ASSISTANT_KB = [
 {id:'split-screen',title:'Rozdělená obrazovka (split screen)',status:'reseno',
  keywords:['split screen','rozdelena obrazovka','rozdeleni obrazovky','male okno','split window','multitasking','okno vedle sebe','dve aplikace vedle sebe'],
  simple:'Ano, částečně. Test si hlídá, jestli neběží dlouho v malém okně (typické pro rozdělenou obrazovku), a zapíše to učiteli jako signál k posouzení.',
  detailed:'Generovaný test vzorkuje každé 2 s poměr velikosti okna k displeji. Když je okno souvisle (od ~10 s) menší než 60 % displeje, počítá to jako „malé/rozdělené okno". Při odevzdání uloží jeden souhrnný signál split-window s podílem času v malém okně; ten se objeví v bezpečnostním záznamu, ve výsledku i v učitelském ověření. Je to vodítko, ne obvinění. Pozor: cílené rozdělení 70/30 nebo druhé fyzické zařízení tím nechytíš.',
  evidence:['startSplitMonitor()','stopSplitMonitor()','recordSplitSummary()','windowIsSmall()','SPLIT_RATIO=0.60','SPLIT_MIN_RUN_MS','signál split-window']},

 {id:'limity-detekce',title:'Co generátor NEdetekuje (druhé zařízení, kamera, nahrávání, Bluetooth)',status:'ne',
  keywords:['druhy mobil','druhe zarizeni','druhy telefon','telefon vedle','mobil vedle','vedle notebooku','jine zarizeni','kamera','webkamera','nahravani obrazovky','screen recording','screrecording','obs','bluetooth','sluchatka','odposlech','spy','druhy pocitac','tablet vedle','mistnost','v mistnosti','kamera v mistnosti'],
  simple:'Ne. Generátor vidí jen dění ve svém okně/prohlížeči na tomtéž zařízení. Druhý telefon vedle notebooku, kameru v místnosti, nahrávání obrazovky ani Bluetooth zařízení nepozná a ani poznat nemůže.',
  detailed:'Veškerá detekce je vázaná na okno a prohlížeč: opuštění okna (visibilitychange, pagehide, blur), fullscreen, velikost okna (split monitor) a heartbeat. Nic z toho nevidí mimo prohlížeč. Druhé fyzické zařízení, kamera, odposlech, nahrávání obrazovky či Bluetooth jsou mimo dosah webové stránky. I split monitor podle vlastního komentáře v kódu „cílenou snahu (rozdělení 70/30, druhé zařízení) nechytí". Bezpečnost je tedy vodítko k lidskému posouzení, ne neprůstřelný dohled.',
  evidence:['komentář u split monitoru: „druhé zařízení nechytí"','detekce jen okno/prohlížeč (visibilitychange, pagehide, blur)','detectDevice() určuje jen TYP aktuálního zařízení, ne počet zařízení']},

 {id:'opusteni-okna',title:'Opuštění testu / přepnutí aplikace / blur',status:'reseno',
  keywords:['opusteni testu','opustit test','prepnuti aplikace','prepnuti karty','blur','visibilitychange','pagehide','beforeunload','reload','ztrata fokusu','odejit z testu','alt tab'],
  simple:'Ano. Když student během testu přepne aplikaci/kartu, otevře jiné okno nebo stránku načte znovu, test to pozná. V přísném režimu se zamkne, v běžném se to jen zapíše.',
  detailed:'Detekce je vícevrstvá: visibilitychange (hidden), pagehide, beforeunload/reload příznak v sessionStorage/localStorage, heartbeat (lastActiveAt) a hlídaný blur fallback (jen když test běží, není otevřený modal, student nepíše do inputu a stránka je bez fokusu déle než ~800–1200 ms). Podezřelá mezera od heartbeatu nad 2–3 s = zámek (v přísném režimu). Nezamyká se při běžné mobilní klávesnici, file pickeru, selectu ani vlastním modalu.',
  evidence:['getCompactSecurityBlock() (přísný i běžný)','visibilitychange / pagehide / beforeunload','heartbeat lastActiveAt','hlídaný blur fallback ~800–1200 ms','mezera >2–3 s = zámek']},

 {id:'fullscreen',title:'Fullscreen / celá obrazovka',status:'reseno',
  keywords:['fullscreen','cela obrazovka','celoobrazovkovy','fullscreenchange','rezim cele obrazovky'],
  simple:'Ano. Test nabízí tlačítko na celou obrazovku jako volitelnou pomůcku. V samotném generátoru je fullscreen tlačítko v hlavičce.',
  detailed:'Ve studentském testu je fullscreen volitelná pomůcka na intru (ne povinnost). V přísném režimu může opuštění celé obrazovky (fullscreenchange) buď zamknout, nebo zapsat samostatné varování; skutečné opuštění stránky ale zamyká vždy. V běžném režimu fullscreenchange zámek nespouští. Samotný generátor má fullscreen přepínač v hlavičce (toggleFullscreen).',
  evidence:['toggleFullscreen() (hlavička generátoru, btnFs)','getCompactSecurityBlock(): „fullscreenchange smí zamknout/zapsat varování"','intro: fullscreen jako volitelná pomůcka']},

 {id:'prisny-rezim',title:'Přísný režim',status:'reseno',
  keywords:['prisny rezim','prisny test','zamek','zamyka','lock','uzamknuti','dohled','pod dohledem'],
  simple:'Přísný režim test při skutečném opuštění zamkne a pokračovat lze jen přes odemykací heslo učitele. Slouží pro známkovanou práci pod dohledem.',
  detailed:'Přísný režim napojuje lock screen na state.locked. Skutečné opuštění (visibilitychange hidden, pagehide, reload, přepnutí aplikace/okna) nastaví state.locked + lockReason, zapíše do securityEvents a uloží stav; po návratu se zobrazí zámek. Zámková obrazovka neukazuje rovnou pole pro heslo — student vidí jen 🔒 a výzvu „Kontaktuj učitele"; pole se odkryje až 5× poklepáním na zámek během ~2 s. Odemčení se loguje. Ve výsledku jsou počty varování, zámků i odemčení.',
  evidence:['getCompactTestModeBlock() / getCompactSecurityBlock() větev prisny','state.locked + lockReason','odkrytí hesla 5× tapem na 🔒','testMode==="prisny"']},

 {id:'bezny-rezim',title:'Běžný režim',status:'reseno',
  keywords:['bezny rezim','bezny test','standardni test','monitorovani bez zamku','nezamyka'],
  simple:'Běžný režim test nezamyká — opuštění okna jen zaznamená a ukáže učiteli ve výsledku. Studentovi se ale neříká, že se nezamyká.',
  detailed:'Běžný režim monitoruje bez zámku: skutečné opuštění běžícího testu se zapíše do logs/securityEvents jako varování a zobrazí ve výsledku a v OVR4 payloadu (počet signálů + stručný záznam) jako „výsledek vyžaduje kontrolu", nikdy jako automatické obvinění. state.locked se nenastavuje, lock screen nevzniká. Studentská pravidla jsou formulovaná jako zákaz opustit test, ale neprozrazují, že režim nezamyká.',
  evidence:['getCompactSecurityBlock() větev bezny','logs/securityEvents jako warning','OVR4 payload: počet signálů','testMode==="bezny"']},

 {id:'procvicovaci-rezim',title:'Procvičovací režim',status:'reseno',
  keywords:['procvicovaci rezim','procvicovani','uceni','trenink','mekka bezpecnost','feedback'],
  simple:'Procvičovací režim je na učení: přívětivější feedback a nápovědy, žádné represivní zámky.',
  detailed:'Cílem je učení — přidává se vstřícnější zpětná vazba, krátká vysvětlení a volitelné nápovědy (které ale přímo neprozradí odpověď). Bezpečnost je měkká, bez zámků; opuštění stránky se nanejvýš jemně zaloguje jako varování.',
  evidence:['getCompactTestModeBlock() větev procviceci','getCompactSecurityBlock() větev procviceci']},

 {id:'offline',title:'Offline režim / bezpečný offline balíček',status:'reseno',
  keywords:['offline','bez internetu','funguje offline','secure offline','bezpecny offline','balicek','bez site','bez pripojeni'],
  simple:'Ano. Hotový test je jeden HTML soubor a funguje offline. Bezpečný režim navíc nemá ve studentském souboru klíč odpovědí — opravuje se zvlášť učitelským souborem.',
  detailed:'Vygenerovaný test je samostatný HTML bez externích knihoven, takže běží offline. V režimu „Bezpečný offline" (secureOffline) student_test.html neobsahuje správné odpovědi: student vytvoří zakódovaný answers.txt a učitel ho opraví v teacher_verifier.html. V tomto režimu se netvoří okamžitá známka ani QR/ověřovací .txt.',
  evidence:['resultMode==="secureOffline"','getCompactVerificationBlock()','student_test.html → answers.txt → teacher_verifier.html','jeden HTML bez CDN']},

 {id:'okamzita-znamka',title:'Okamžitá známka (instant)',status:'reseno',
  keywords:['okamzita znamka','instant','hned vysledek','rovnou znamka','vysledek ihned','self scoring'],
  simple:'V režimu „Okamžitá známka" student po odevzdání hned vidí výsledek a známku přímo v testu a pošle učiteli screenshot.',
  detailed:'Režim resultMode="instant" počítá výsledek v prohlížeči studenta ihned po odevzdání a zobrazí výsledkovou kartu (jméno, Test ID, body, procenta, známka). Tento režim má ve studentském souboru hodnotící logiku; pro maximální ochranu klíče zvol „Bezpečný offline". Procenta se zaokrouhlují matematicky na celá %.',
  evidence:['resultMode==="instant"','getGrade()','showResult()','výsledková karta: jméno/Test ID/body/%/známka']},

 {id:'teacher-verifier',title:'Teacher verifier (učitelský opravovací soubor)',status:'reseno',
  keywords:['teacher verifier','ucitelsky verifier','opravit answers','answers txt','oprava odpovedi','dekodovat odpovedi','ucitelsky opravovaci soubor'],
  simple:'Teacher verifier je samostatný učitelský HTML soubor, který v bezpečném režimu dekóduje a opraví studentův answers.txt a spočítá známku.',
  detailed:'V režimu Bezpečný offline student odevzdá zakódovaný answers.txt. Učitel ho nahraje (jednotlivě i hromadně) do teacher_verifier.html, který obsahuje privátní klíč a plné varianty s klíčem odpovědí, dekóduje odpovědi, nezávisle přepočítá body a známku a porovná je se studentovým záznamem. Tento soubor je jen pro učitele — nikdy ho nedávej studentům.',
  evidence:['secureTeacherScript()','teacher_verifier.html','PRIVATE_KEY / VARIANTS_FULL','bulkVerifyFiles()','SHARED_SCORING_JS (stejné bodování jako student)']},

 {id:'self-test',title:'Self-test bodování',status:'reseno',
  keywords:['self test','selftest','self-test','test bodovani','overeni bodovani','overeni vypoctu','100 0 procent','kontrola hodnoceni'],
  simple:'Self-test vezme tvůj právě vygenerovaný test, synteticky ho vyplní jednou úplně správně a jednou úplně špatně a ověří, že stroj dá 100 % a 0 %. U klasifikovaného testu je povinný.',
  detailed:'runScoringSelfTest() spustí hodnoticí logiku skutečně staženého testu (v bezpečném režimu i celý šifrovací řetězec student→verifier), u každého typu úlohy vyplní jednou zcela správně a jednou zcela špatně a očekává 100 % a 0 %. Upozorní i na úlohy bez uloženého klíče. Chrání před tichou chybnou známkou (horší riziko než rozbitá stránka). Bez úspěšného self-testu generátor nepustí stažení klasifikovaného testu.',
  evidence:['runScoringSelfTest() (btnSelfTest)','lastSelfTest gate','SHARED_SCORING_JS','očekává 100 % / 0 %']},

 {id:'overeni-klice',title:'Ověření klíče druhým průchodem (AI)',status:'reseno',
  keywords:['overit klic','overeni klice','druhy pruchod','spravnost klice','ai zkontroluje odpovedi','klic spravne odpovedi','je klic spravne'],
  simple:'Tahle funkce nechá AI nezávisle vyřešit tvůj test a ukáže položky, kde se její odpověď liší od uloženého klíče — tam nejspíš je chyba v klíči. Vyžaduje Gemini klíč.',
  detailed:'aiVerifyKey() požádá AI, aby sama vyřešila úlohy testu (negeneruje nový test) a porovná to s uloženým klíčem. Rozdílné položky označí jako podezřelé — levný signál, kde ručně zkontrolovat. Doplňuje self-test: self-test ověří, že STROJ počítá podle klíče správně; tohle hledá, jestli je sám KLÍČ obsahově správný. Silné u uzavřených typů (výběr, true/false, doplňování), slabší u otevřených překladů.',
  evidence:['aiVerifyKey() (btnKeyCheck)','porovnání AI odpovědí s uloženým klíčem','vyžaduje Gemini klíč','keyCheckReport']},

 {id:'gemini-api-klic',title:'Gemini API klíč',status:'reseno',
  keywords:['gemini','api klic','apikey','klic gemini','ai generovani','primo generovat','vytvorit test primo','model gemini'],
  simple:'Generátor umí volat Gemini a vytvořit test přímo. Klíč zadáš ve žluté sekci. Bez klíče zkopíruješ prompt do Claude/ChatGPT.',
  detailed:'Ve žluté sekci zadáš Gemini API klíč; pak tlačítko „Vytvořit test přímo" pošle prompt (a multimodální přílohy) přes callGeminiJSON na Google API. Klíč se posílá jen v hlavičce požadavku na Google, nikam jinam. Bez klíče generátor funguje tak, že vygeneruje prompt k ručnímu zkopírování do jiného AI nástroje. Model lze změnit v poli „Model".',
  evidence:['callGeminiJSON()','x-goog-api-key (jen na Google API)','buildGeminiFilePartsForApi()','geminiApiKey','„Vytvořit test přímo"']},

 {id:'ukladani-api-klice',title:'Ukládání API klíče (relace vs trvale)',status:'reseno',
  keywords:['ukladani klice','kam se uklada klic','sessionstorage klic','localstorage klic','zapamatovat klic','relace klic','trvale klic','uchovani klice'],
  simple:'Klíč můžeš použít jen pro tuto relaci (po zavření prohlížeče se zapomene), nebo ho uložit trvale v tomto prohlížeči. Trvalé uložení je pohodlnější, ale klíč zůstává na zařízení.',
  detailed:'„Relace" (useGeminiKeyForSession) drží klíč jen do zavření prohlížeče. „Uložit trvale" (saveGeminiKeyPermanent) zapíše klíč do úložiště prohlížeče, takže ho příště nemusíš zadávat — vhodné jen na vlastním zařízení. Klíč se odesílá výhradně do Google API v hlavičce, nikdy do žádné jiné služby ani do tohoto poradce.',
  evidence:['useGeminiKeyForSession() (btnUseKeySession)','saveGeminiKeyPermanent() (btnSaveKeyPermanent)','geminiNote: „Relace = po zavření se zapomene"']},

 {id:"pristupove-kody",title:"Přístup z AI Studia",status:"reseno",
  keywords:["pristupovy kod","pristupovy soubor","access code","prihlaseni","AI Studio","odemknout aplikaci"],
  simple:"Přístup se aktivuje jednou v AI Studiu pomocí osobního podepsaného souboru nebo kódu. Generátor si stejné ověřené oprávnění přečte automaticky.",
  detailed:"Správce vydá v AI Studiu osobní oprávnění s rolí, seznamem povolených aplikací, platností a jedinečným JTI. Soubor nebo kód je digitálně podepsán ECDSA klíčem. Generátor před spuštěním ověří podpis, vydavatele, platnost, revokační seznam a oprávnění generator. Neexistuje samostatný PIN Generátoru; na jednom zařízení se přístup aktivuje pouze ve Studiu.",
  evidence:["ghrab.access.permit.v2","/AI-Studio-GHRAB/access/app-guard.js","protectApp('generator')","JTI"]},

 {id:"admin-sprava",title:"Admin správa přístupů",status:"reseno",
  keywords:["admin","sprava pristupu","administrace","spravce","vydat pristup","odvolat pristup"],
  simple:"Admin spravuje přístupy centrálně v AI Studiu. Soukromým podpisovým klíčem vydává osobní oprávnění a pomocí JTI může konkrétní přístup zneplatnit.",
  detailed:"Tlačítko Správa přístupů otevírá administrátorský nástroj AI Studia. Soukromý podpisový klíč se načítá pouze při vydávání přístupu a nesmí být v GitHubu. Kolegovi se posílá jen jeho .ghrab-access.json. Zneplatnění se provádí přidáním JTI do centrálního revokačního seznamu a novým nasazením Studia. Bez serveru jde o silnou organizační a kryptografickou bránu, nikoli o ověření skutečné identity uživatele.",
  evidence:["openAdminPanel()","AI Studio access issuer","revoked-access.json","JTI","ECDSA P-256"]},

 {id:"storage",title:"localStorage / sessionStorage (co se ukládá)",status:"reseno",
  keywords:["localstorage","sessionstorage","uklada","co se uklada","data v prohlizeci","soukromi dat","kam se uklada"],
  simple:"Generátor lokálně ukládá rozpracované nastavení, nejvýše pět položek historie, pedagogické šablony a ověřený podepsaný přístup AI Studia. Hesla testu, přílohy a skutečná jména studentů se do běžných snapshotů neukládají.",
  detailed:"Snapshoty a historie používají localStorage; jména studentů jsou před uložením nahrazena kódy Student A1…, přílohy se neukládají a citlivá pole se čistí. Volitelně lze lokálně uložit Gemini API klíč a týmový bezpečnostní kód pouze na důvěryhodném zařízení. Centrální permit AI Studia je uložen pod klíčem ghrab.access.permit.v2 a obsahuje podepsané nároky, nikoli soukromý podpisový klíč. Ve studentském secure testu se odpovědi drží za běhu v paměti.",
  evidence:["getStoredState()","anonymizeGroupsForStorage()","pushHistory()","ghrab.access.permit.v2","submittedLocked()"]},

 {id:'ochrana-answer-key',title:'Ochrana před únikem klíče odpovědí',status:'reseno',
  keywords:['unik odpovedi','unik klice','answer key','spravne odpovedi unik','muze student videt odpovedi','skryt odpovedi','bezpecnostni skener','scanner'],
  simple:'Ano. V bezpečném režimu studentský soubor správné odpovědi vůbec neobsahuje a před stažením to kontroluje bezpečnostní skener.',
  detailed:'V režimu Bezpečný offline se klíč do studentského souboru nevkládá (odpovědi jsou zašifrované, dešifruje je až učitelský verifier privátním klíčem). Před exportem běží assertNoStudentAnswerKeys() a SecretScanner, který blokuje únik privátního klíče, plných variant a dalších citlivých dat do studentského souboru; má vlastní sadu 14 fixture testů (runScannerTests).',
  evidence:['assertNoStudentAnswerKeys()','SecretScanner','runScannerTests() (14 testů)','stripItemForStudent','secureOffline = klíč jen v teacher_verifier']},

 {id:'export-studentsky',title:'Export studentského testu',status:'reseno',
  keywords:['export studenta','studentsky test','stahnout test','student_test','soubor pro studenty','rozdat test','html pro studenty'],
  simple:'Stáhneš jeden HTML soubor pro studenty. V bezpečném režimu neobsahuje klíč odpovědí.',
  detailed:'downloadGeneratedTest() vytvoří studentský HTML. V bezpečném režimu je to student_test.html bez klíče (secureStudentScript), který po odevzdání vytvoří zakódovaný answers.txt. Před stažením klasifikovaného testu musí projít self-test a bezpečnostní brána (secureGateBanner).',
  evidence:['downloadGeneratedTest() (btnDownloadMain)','secureStudentScript()','student_test.html / answers.txt','self-test gate']},

 {id:'ucitelsky-soubor',title:'Učitelský soubor / teacher export',status:'reseno',
  keywords:['ucitelsky soubor','teacher export','soubor pro ucitele','ucitelska verze','klic pro ucitele','ucitelsky balicek'],
  simple:'Vedle studentského souboru se generuje učitelský soubor (s klíčem / verifier). Je jen pro tebe, nedávej ho studentům.',
  detailed:'V bezpečném režimu se generuje teacher_verifier.html s privátním klíčem a plnými variantami pro opravu. Učitelský mód uvnitř testu (intro tlačítko „Učitelský režim") chrání PIN. Bezpečnostní skener i názvové kontroly hlídají, aby se učitelský obsah nedostal do studentského exportu.',
  evidence:['secureTeacherScript() / teacher_verifier.html','učitelský PIN (ucitelPin)','SecretScanner blokuje učitelský obsah ve studentském souboru']},

 {id:'listening',title:'Listening comprehension (poslech)',status:'reseno',
  keywords:['listening','poslech','poslechove cviceni','audio cviceni','poslech s porozumenim','nahravka poslech'],
  simple:'Ano. Poslech zadáš přes audio/video soubor, URL nebo transkript. Student v testu poslech nevidí ani neslyší — pouští ho učitel; otázky jsou uzavřené a samoopravitelné.',
  detailed:'usesListeningComprehension() zapíná poslechovou větev. Zdroj (audio/video soubor, URL nebo transkript) slouží Gemini a učiteli. Studentský test NEobsahuje přehrávač, URL ani transkript — jen pokyn, že poslech pustí učitel. Položky musí být auto-scorable (možnosti + correct index), žádné volné odpovědi; speechSynthesis se jako zdroj nepoužívá.',
  evidence:['usesListeningComprehension()','getCompactListeningRules()','buildListeningUserBlock()','student nevidí transkript/přehrávač']},

 {id:'reading',title:'Reading comprehension (čtení s porozuměním)',status:'reseno',
  keywords:['reading','cteni s porozumenim','cteny text','reading comprehension','text k precteni','porozumeni textu'],
  simple:'Ano, generátor umí cvičení na čtení s porozuměním.',
  detailed:'usesReadingComprehension() zapíná větev pro čtení s porozuměním — text + návazné otázky. Funguje souběžně se zadáním látky a přílohami; konkrétní text můžeš dodat v zadání nebo souborem.',
  evidence:['usesReadingComprehension()','readingBlock UI (přepíná se podle typu cvičení)']},

 {id:'soubory',title:'Práce se soubory (DOCX/PDF/obrázky/audio/video)',status:'reseno',
  keywords:['soubory','prilohy','docx','word','pdf','obrazek','obrazky','audio','video','nahrat soubor','vlozit soubor','import souboru','csv'],
  simple:'Můžeš přiložit DOCX, PDF, obrázky, audio, video i textové soubory. Z DOCX se vytáhne text; ostatní se při přímém generování pošlou Gemini automaticky.',
  detailed:'Pole pro soubory přijímá image/*, audio/*, video/*, .pdf, .txt, .md, .csv, .tsv, .docx aj. Z .docx generátor extrahuje text (extractDocxText). Při přímém generování přes Gemini se přílohy odešlou automaticky jako multimodální vstup (buildGeminiFilePartsForApi, obrázky se zmenší). Při kopírování promptu do jiného AI nástroje binární přílohy přiložíš ručně.',
  evidence:['fileInput accept="image/*,audio/*,video/*,.pdf,.txt,.md,.csv,.tsv,.docx…"','extractDocxText()','buildGeminiFilePartsForApi()']},

 {id:'kontrola-kvality',title:'Kontrola kvality vygenerovaného testu',status:'reseno',
  keywords:['kontrola kvality','kvalita testu','validace','overeni kvality','je test ok','quality','kontrola vystupu ai'],
  simple:'Před stažením generátor kontroluje, že úlohy dávají smysl (mají klíč, dost možností apod.), a nabízí self-test, ověření klíče a kontrolní checklist.',
  detailed:'Výstup AI prochází striktní validací (validateExerciseSetStrict) — kontroluje typy, počty možností, existenci klíče atd. K tomu je panel kvality (qualityPanel), exportní checklist (exportChecklist), self-test bodování (runScoringSelfTest) a volitelné AI ověření klíče (aiVerifyKey). U klasifikovaného testu brání stažení bezpečnostní brána, dokud kontroly neprojdou.',
  evidence:['validateExerciseSetStrict()','qualityPanel','exportChecklist','runScoringSelfTest()','aiVerifyKey()']},

 {id:'rezim-jednoduchy-pokrocily',title:'Jednoduchý vs. pokročilý režim',status:'reseno',
  keywords:['jednoduchy rezim','pokrocily rezim','simple advanced','rozdil rezimu','zjednoduseny','plne nastaveni','prepnout rezim'],
  simple:'Jednoduchý režim skryje pokročilá nastavení a vyplní rozumné výchozí hodnoty, ať uděláš test rychle. Pokročilý odemkne všechny volby.',
  detailed:'isSimpleMode() (state.appMode) řídí, kolik nastavení je vidět. V jednoduchém režimu se aplikují bezpečné defaulty (applySimpleDefaults: běžný režim atd.) a pokročilé sekce se skryjí (markAdvancedSections). Pokročilý režim zpřístupní detailní konfiguraci cvičení, bezpečnosti, diferenciace apod.',
  evidence:['isSimpleMode() / state.appMode','applySimpleDefaults()','markAdvancedSections()']},

 {id:"sablony",title:"Šablony",status:"reseno",
  keywords:["sablona", "sablony", "template", "ulozit nastaveni", "znovu pouzit nastaveni", "predloha"],
  simple:"Šablona ukládá pedagogický profil testu, nikoli celé zadání. Neobsahuje jazyk, téma, cvičení, čas, přílohy, jména studentů ani přístupové údaje.",
  detailed:"Nový formát profile_v1 ukládá pracovní režim, způsob výsledku a zpětné vazby, úroveň diferenciace, toleranci odpovědí, typ známkování a pouze počet/názvy skupin. Po načtení ponechá jazyk, cvičení, čas a obsah beze změny. Staré plné šablony lze kvůli zpětné kompatibilitě načíst, ale citlivá pole se při tom vždy vymažou.",
  evidence:["PROFILE_KEYS", "getTemplateProfile()", "applyTemplateProfile()", "saveTemplate()", "SENSITIVE_FIELD_IDS"]},

 {id:"historie",title:"Historie",status:"reseno",
  keywords:["historie", "minule testy", "posledni prompty", "vratit se k testu", "drive vygenerovane", "log promptu"],
  simple:"Historie uchovává nejvýše pět posledních očištěných promptů a nastavení. Hotový test, přílohy, hesla, PINy ani skutečná jména studentů neukládá.",
  detailed:"pushHistory() deduplikuje položky podle hashe a ukládá posledních pět. Prompt je už při sestavení pseudonymizovaný a před uložením znovu sanitizovaný; stav skupin obsahuje pouze kódy Student A1… Načtení z historie obnoví formulář, ale vyčistí přílohy a citlivá pole. Výsledný HTML test je nutné znovu vygenerovat.",
  evidence:["pushHistory()", "sanitizePromptForStorage()", "getStoredState()", "loadFromHistory()", "hist.slice(0, 5)"]},

 {id:'bezpecnostni-report',title:'Bezpečnostní záznam / report',status:'reseno',
  keywords:['bezpecnostni report','bezpecnostni zaznam','security report','log udalosti','co se stalo behem testu','signaly','varovani ve vysledku','securityevents'],
  simple:'Test si vede záznam bezpečnostních událostí (opuštění okna, malé okno, zámky…) a ukáže ho ve výsledku a v učitelském ověření jako „výsledek vyžaduje kontrolu".',
  detailed:'Generovaný test zapisuje události do securityEvents/logs (recordSec). Výsledková karta i OVR4/učitelské ověření zobrazí počet signálů a stručný přehled (např. split-window podíl, opuštění okna, zámky a odemčení). Formulace je „výsledek vyžaduje kontrolu", ne obvinění z podvodu.',
  evidence:['securityEvents / recordSec()','recordSplitSummary() → signál split-window','výsledek + OVR4 payload: počet signálů']},

 {id:'znamkovaci-stupnice',title:'Známkovací stupnice',status:'reseno',
  keywords:['stupnice','znamkovani','znamka','skolni stupnice','vlastni stupnice','procenta na znamku','hranice znamek','klasifikace'],
  simple:'Vyber školní stupnici (1–5) nebo si zadej vlastní pásma. Procenta se před zařazením zaokrouhlují matematicky na celá %.',
  detailed:'Školní stupnice: 1=88–100, 2=74–87, 3=59–73, 4=44–58, 5=0–43 %. Vlastní stupnici zadáš v bodech nebo procentech, pásma odděluješ novým řádkem, středníkem, lomítkem nebo čárkou (parseCustomGradeScale). Nepokrytá pásma generátor označí; neúplná/rozbitá stupnice se nepustí dál. Zaokrouhlení je matematické: 87,5 % → 88 %, 87,4 % → 87 %.',
  evidence:['getGrade()/gradeFor()','parseCustomGradeScale()','gradeScaleGaps()','školní pásma 88/74/59/44']},


 {id:'tisk-pdf-papir',title:'Tisk / PDF / papírová verze testu',status:'reseno',
  keywords:['tisk','vytisknout','papir','papír','pdf','ulozit jako pdf','uložit jako pdf','studentsky arch','student sheet','pracovni list','print','printable'],
  simple:'Ano. V teacher verifieru je sekce „Tisk / papírová verze“, kde otevřeš prázdný studentský arch nebo verzi s klíčem a přes prohlížeč ji vytiskneš / uložíš jako PDF.',
  detailed:'Tisk se řeší z učitelského souboru teacher_verifier.html. Sekce „Tisk / papírová verze“ má dvě tlačítka: „Tisk — prázdný arch“ pro studenty a „Tisk — s klíčem (jen učitel)“. Funkce openPrint(false/true) otevře tisknutelné HTML vytvořené přes buildPrintableHtml(withKey); v horní liště tisknutelné stránky je tlačítko window.print(), takže lze tisknout na papír nebo v dialogu prohlížeče uložit jako PDF. U diferencovaného testu se tisknou všechny varianty.',
  evidence:['teacher_verifier.html: sekce „Tisk / papírová verze“','openPrint(false) / openPrint(true)','buildPrintableHtml(withKey)','window.print()','prtVariantHtml()']},

 {id:'co-dat-studentum',title:'Co dát studentům a co si nechat jen pro učitele',status:'reseno',
  keywords:['co poslat studentum','co dat studentum','co sdilet','studentum','studentům','soubor pro studenty','teacher nedavat','nesdilet verifier','do not send'],
  simple:'Studentům dávej jen studentský HTML soubor. Učitelský verifier / učitelský export obsahuje správné odpovědi a klíče, takže zůstává pouze u učitele.',
  detailed:'Studentský export vzniká přes downloadGeneratedTest() jako student_test.html. V bezpečném offline režimu neobsahuje klíč odpovědí. Učitelský soubor teacher_verifier.html naopak obsahuje privátní klíč a VARIANTS_FULL se správnými odpověďmi; generátor ho i názvem označuje jako DO_NOT_SEND_TEACHER_VERIFIER_contains_answers. Proto se studentům posílá/publikuje jen student_test.html, zatímco teacher verifier se ukládá bezpečně jen u učitele.',
  evidence:['downloadGeneratedTest()','student_test.html','teacher_verifier.html','PRIVATE_KEY / VARIANTS_FULL','teacherVerifierFileName()','DO_NOT_SEND_TEACHER_VERIFIER_contains_answers']},

 {id:'odevzdani-studentu',title:'Co student po dokončení odevzdává',status:'reseno',
  keywords:['co odevzda student','co ma student poslat','odevzdani','odevzdávání','screenshot','answers.txt','zalozni kod','záložní kód','výsledek'],
  simple:'Záleží na režimu výsledků. U okamžité známky student pošle screenshot výsledkové karty; v bezpečném offline režimu stáhne a pošle zakódovaný answers.txt.',
  detailed:'Režim resultMode="instant" zobrazí studentovi po odevzdání výsledkovou kartu se jménem, Test ID, body, procenty a známkou; instrukce počítá se screenshotem výsledku. Režim resultMode="secureOffline" studentovi známku hned neukáže: po odevzdání vytvoří zakódovaný answers.txt s odpověďmi a bezpečnostním záznamem, který učitel načte do teacher_verifier.html. Pokud download souboru selže, verifier počítá i s nouzovým vložením záložního textu.',
  evidence:['resultMode==="instant"','showResult()','výsledková karta: jméno/Test ID/body/%/známka','resultMode==="secureOffline"','downloadAnswers()','SECURE-ANSWERS-V1','bulkVerifyPasted()']},

 {id:'nouzova-zaloha-answers',title:'Nouzová záloha, když nejde stáhnout answers.txt',status:'reseno',
  keywords:['nejde stahnout answers','nejde stáhnout answers','nejde stáhnout soubor','zaloha','záloha','backup','SECURE-ANSWERS','vlozit kod','vložit kód'],
  simple:'Ano. Když studentovi v bezpečném offline režimu nejde stáhnout answers.txt, může poslat celý záložní text od „SECURE-ANSWERS-V1“ a učitel ho vloží do teacher verifieru.',
  detailed:'Studentský bezpečný výstup má textový formát začínající SECURE-ANSWERS-V1. Teacher verifier obsahuje pole „Nouzová záloha“, kam lze celý text vložit, a tlačítko „Načíst vloženou zálohu“ volající bulkVerifyPasted(). Je to záložní cesta pro situaci, kdy prohlížeč nebo zařízení blokuje stažení souboru.',
  evidence:['SECURE-ANSWERS-V1','teacher_verifier.html: „Nouzová záloha“','pasteBox','bulkVerifyPasted()','downloadAnswers()']},

 {id:'hromadne-vyhodnoceni',title:'Hromadné vyhodnocení, CSV, feedback a archiv',status:'reseno',
  keywords:['hromadne vyhodnoceni','hromadné vyhodnocení','csv','excel','tabulka vysledku','feedback','individualni zpetna vazba','archiv','polozkova analyza','položková analýza'],
  simple:'Ano. Teacher verifier umí hromadně načíst více answers.txt, spočítat výsledky, stáhnout CSV, vygenerovat feedback a uložit archiv.',
  detailed:'V teacher_verifier.html je sekce Hromadné vyhodnocení: učitel přetáhne nebo vybere více answers.txt a verifier je opraví. K dispozici jsou exporty „Stáhnout CSV“, „Stáhnout feedback HTML“, individuální feedback pro vybraného studenta i jednotlivé feedbacky. Verifier obsahuje také souhrn problematických otázek, položkovou analýzu, bezpečnostní signály a archivní HTML/JSON pro školní úložiště.',
  evidence:['bulkVerifyFiles()','downloadCsv()','downloadFeedbackHtml()','downloadSelectedFeedbackHtml()','downloadIndividualFeedbacks()','renderProblemSummary()','renderItemAnalysis()','downloadArchiveHtml()','downloadArchiveJson()']},

 {id:'zpetna-vazba',title:'Zpětná vazba a zobrazení správných odpovědí',status:'reseno',
  keywords:['zpetna vazba','zpětná vazba','feedback','spravne odpovedi','správné odpovědi','ukaze klic','ukáže klíč','vysvetleni','vysvětlení'],
  simple:'Ano, režim zpětné vazby se nastavuje. U klasifikace můžeš vypnout okamžitou zpětnou vazbu; v bezpečném offline režimu student po testu nevidí známku ani klíč, vše řeší učitel ve verifieru.',
  detailed:'Volba feedbackMode rozlišuje „Bez okamžité ZV“, „Stručná“ a „Učící“. Režim resultMode="instant" může ukazovat výsledek hned podle nastavení feedbacku. Režim resultMode="secureOffline" je pro klasifikaci bezpečnější: student nevidí známku ani správné odpovědi hned, stáhne answers.txt a učitel zpětnou vazbu vytvoří ve verifieru. Ve verifieru lze také zvolit úroveň feedbacku: chyby + správné odpovědi, jen body a známka, chyby bez správných odpovědí nebo kompletní rozbor.',
  evidence:['feedbackModeBtns','feedbackMode','resultMode==="instant"','resultMode==="secureOffline"','feedbackLevel','downloadFeedbackHtml()','hideCorrectExport']},

 {id:'editor-upravy-testu',title:'Úprava otázek a odpovědí po vygenerování',status:'reseno',
  keywords:['upravit test','upravit otazky','upravit odpovedi','editor','chyba v klici','alternativni odpovedi','přijatelné odpovědi','rozšířit odpovědi'],
  simple:'Ano. Po vygenerování lze otevřít editor otázek a odpovědí, opravit klíč, doplnit alternativní odpovědi a potom test znovu sestavit.',
  detailed:'Ve výsledkové sekci je tlačítko „Upravit otázky a odpovědi“ (openTestEditor). Editor umožňuje měnit znění úloh, možnosti, správné odpovědi, alternativní odpovědi i vysvětlení. Funkce „Rozšířit přijatelné odpovědi“ umí přes AI navrhnout další uznatelné varianty pro textově opravované úlohy. Po úpravě se test znovu sestaví přes assembleTestHtml() a před stažením je vhodné znovu spustit self-test bodování.',
  evidence:['openTestEditor()','openEditorFromData()','edApply()','assembleTestHtml()','enrichAltAnswers()','runScoringSelfTest()']},

 {id:'diferenciace-skupiny',title:'Diferenciace a různé skupiny studentů',status:'reseno',
  keywords:['diferenciace','diferencovany test','diferencovaný test','skupiny','slabsi studenti','silnejsi studenti','svp','různé varianty','varianty testu'],
  simple:'Ano. Generátor umí diferencovaný test pro skupiny. Skupiny mohou dostat jiný obsah nebo náročnost, ale počet cvičení, typy a bodování mají zůstat stejné kvůli férovému srovnání.',
  detailed:'V pokročilém nastavení lze zapnout diferenciaci, vytvořit skupiny, popsat jejich podmínky a přiřadit studenty ideálně pomocí kódů. Generátor má pravidlo, že se u skupin mění obsah otázek / míra podpory, ne celková struktura: počet cvičení, typy cvičení a body zůstávají stejné. Učitel může zvolit i obecnou míru podpory / náročnosti: základní podpora, standard, challenge. U klasifikovaných testů je diferenciace označena jako pedagogicky citlivá a má měřit stejné učivo.',
  evidence:['diferencovany','skupiny','buildDiffBlock()','differentiationLevel','renderDiffLevelNote()','group_variants','Náhled jako student/skupina']},

 {id:"anonymizace-gdpr",title:"Anonymizace a ochrana osobních údajů",status:"reseno",
  keywords:["anonymizace", "gdpr", "osobni udaje", "jmena studentu", "ochrana dat", "pseudonymizace"],
  simple:"Jména z diferenciačních skupin se do Gemini neposílají nikdy. Prompt používá kódy Student A1… a veřejný studentský HTML obsahuje jen solené SHA-256 otisky zadaných identifikátorů.",
  detailed:"Ochrana má dvě vrstvy: buildDiffBlock() nahrazuje identity před AI požadavkem pseudonymy a veřejný rozpis skupin ve studentském souboru ukládá pouze salted hash. Pro diferencované testy je nejbezpečnější používat náhodné žákovské kódy, protože běžná jména lze při znalosti soli zkoušet slovníkovým útokem. Učitel musí odstranit osobní a citlivé údaje také z volného textu, podmínek skupin, URL a příloh; ty aplikace neumí spolehlivě rozpoznat.",
  evidence:["buildDiffBlock()", "buildPublicDiffGroups()", "studentHashes", "diffRosterSalt", "ensureGeminiDataNotice()"]},

 {id:'podpurna-opatreni',title:'Podpůrná opatření: delší čas, větší písmo, dyslexie-friendly',status:'reseno',
  keywords:['podpurna opatreni','podpůrná opatření','delsi cas','delší čas','bez limitu','vetsi pismo','větší písmo','dyslexie','dyslexia','svp'],
  simple:'Ano. U skupin lze nastavit podpůrná opatření: prodloužený čas, bez časového limitu, větší písmo nebo dyslexie-friendly zobrazení.',
  detailed:'V kartě skupiny je sekce podpůrných opatření. U konkrétní skupiny lze nastavit násobek času, volbu bez časového limitu, větší písmo a dyslexie-friendly zobrazení. Ve studentském testu se po zadání jména/kódu aktivní úpravy zobrazí v informační liště a časovač se upraví podle A11Y.timeMult nebo A11Y.noLimit.',
  evidence:['group-a11y','A11Y.timeMult','A11Y.noLimit','A11Y.font','A11Y.dys','timerVal=A11Y.noLimit?Infinity']},

 {id:'casovy-limit',title:'Časový limit a vypršení času',status:'reseno',
  keywords:['casovy limit','časový limit','casovac','časovač','vyprsi cas','vyprší čas','konec casu','timer','automaticky odevzdat'],
  simple:'Ano. Test má časovač. Po vypršení času se test automaticky odevzdá; u podpůrných opatření může mít skupina prodloužený čas nebo žádný limit.',
  detailed:'Délka testu se nastavuje v minutách v generátoru. Ve studentském testu běží timerDisplay a startTimer() každou sekundu snižuje timerVal. Pod 5 minut se mění varovný stav, pod 1 minutu kritický stav. Když timerVal klesne na 0, interval se zastaví a volá se doSubmit(), tedy automatické odevzdání. Podpůrná opatření mohou čas vynásobit nebo nastavit nekonečný limit.',
  evidence:['casCustom / state.cas','timerDisplay','startTimer()','timerVal','doSubmit()','A11Y.timeMult','A11Y.noLimit']},

 {id:'jazyk-pokynu-ui',title:'Jazyk pokynů, tlačítek a rozhraní testu',status:'reseno',
  keywords:['jazyk pokynu','jazyk pokynů','pokyny cesky','pokyny česky','ui cesky','ui česky','cely test ve spanelstine','celý test v angličtině','cilovy jazyk'],
  simple:'Ano. Lze zvolit, jestli bude celý studentský test v cílovém jazyce, pokyny česky, nebo UI česky a zadání cvičení v cílovém jazyce. Teacher verifier zůstává česky.',
  detailed:'Volba instrJazyk má tři režimy: target = celý studentský test v cílovém jazyce, cs = české UI i pokyny, mixed = UI a technické texty česky, ale zadání cvičení a jazykový obsah v cílovém jazyce. Funkce getInstructionLanguageBlock() tuto politiku posílá do generování. U bezpečného offline balíčku učitelský verifier zůstává vždy česky, protože je to pracovní nástroj učitele.',
  evidence:['instrJazykBtns','state.instrJazyk','getInstructionLanguageBlock()','getUiLang()','teacher verifier zůstává vždy česky']},

 {id:'nahled-pred-stazenim',title:'Náhled testu před stažením',status:'reseno',
  keywords:['nahled','náhled','preview','zkontrolovat test','pred stazenim','před stažením','mobilni nahled','mobilní náhled'],
  simple:'Ano. Po vygenerování lze test otevřít v náhledu a přepínat šířku zobrazení, aby šel rychle zkontrolovat před stažením.',
  detailed:'Výsledková sekce má tlačítko náhledu, které otevírá overlay s iframe preview. V horní liště náhledu lze přepínat šířku zobrazení, typicky mobilní a plnou šířku. Náhled slouží ke kontrole vzhledu a ovládání před stažením studentského souboru; pro kontrolu správnosti bodování slouží samostatně self-test a ověření klíče.',
  evidence:['btnPreview','preview-overlay','preview-frame','preview-w-btn','runScoringSelfTest()','aiVerifyKey()']},

 {id:'spanelstina-prizvuk',title:'Španělština a přízvuky',status:'reseno',
  keywords:['spanelstina','prizvuk','akcent','accent','tilde','spanelsky','diakritika spanelstina'],
  simple:'U španělštiny se za chybějící/špatný přízvuk u jinak správné odpovědi odečítá 0,5 bodu (nikdy ne pod 0). Ñ se bere jako samostatné písmeno.',
  detailed:'getCompactSpanishRules() přidává španělská pravidla: vyžaduje člen u izolovaných substantiv, nezrazuje rod členem před mezerou a u přízvuků odečítá 0,5 bodu za chybějící/špatný přízvuk. Hodnoticí engine (textScore v SHARED_SCORING_JS) dává za odpověď lišící se jen přízvukem poloviční kredit.',
  evidence:['getCompactSpanishRules()','textScore() v SHARED_SCORING_JS','0,5 bodu za přízvuk','ñ = samostatné písmeno']},

 {id:'chyba-503',title:'Chyba 503 / UNAVAILABLE při generování',status:'reseno',
  keywords:['503','unavailable','service unavailable','pretizeny','přetížený','pretizene','přetížené servery','high demand','server nedostupny','server nedostupný','generovani selhalo','generování selhalo','zkus znovu'],
  simple:'Chyba 503 znamená dočasnou nedostupnost nebo přetížení služby/modelu. Počkej několik minut a zkontroluj stav služby a aktivní limity projektu v AI Studiu.',
  detailed:'HTTP 503 UNAVAILABLE značí dočasnou nedostupnost, přetížení nebo problém služby/modelu. Z této chyby samotné nelze spolehlivě určit kvótu. Počkej několik minut, zkontroluj stav služby a v Google AI Studiu otevři aktuální Rate limits pro svůj projekt. Generátor může jednou zkusit odlišný stabilní model, ale úspěch ani samostatná kvóta nejsou garantovány.',
  evidence:['geminiApiErrorMessage()','HTTP 503','UNAVAILABLE','RPD','Rate Limit','aistudio.google.com']},

 {id:'chyba-429',title:'Chyba 429 / RESOURCE_EXHAUSTED / překročen limit',status:'reseno',
  keywords:['429','resource exhausted','resource_exhausted','prekrocen limit','překročen limit','kvota','kvóta','quota','too many requests','denni limit','denní limit','rpm','rpd','rate limit'],
  simple:'Byl překročen limit požadavků nebo kvóta API klíče. Generátor tlačítko dočasně zablokuje. Počkej alespoň minutu a zkus znovu, nebo ověř limity v AI Studiu.',
  detailed:'HTTP 429 RESOURCE_EXHAUSTED znamená překročení některého aktivního limitu projektu, například požadavků za minutu, tokenů za minutu nebo požadavků za den. Konkrétní hodnoty se liší podle modelu a usage tieru. Generátor zobrazí cooldown a neprovádí bezhlavé opakování. Aktuální limity ověř v Google AI Studiu v části Rate limits.',
  evidence:['geminiCooldownRemainingMs()','geminiUpdateCooldownUI()','GEMINI_COOLDOWN_MS','HTTP 429','RESOURCE_EXHAUSTED']},

 {id:'chyba-400',title:'Chyba 400 / INVALID_ARGUMENT při generování',status:'reseno',
  keywords:['400','invalid argument','invalid_argument','neplatny klic','neplatný klíč','api key not valid','spatny klic','špatný klíč','klic nefunguje','klíč nefunguje','neplatny pozadavek','neplatný požadavek'],
  simple:'Chyba 400 nejčastěji znamená neplatný API klíč. Zkontroluj klíč ve žluté sekci — zkopíruj ho znovu z aistudio.google.com → API Keys.',
  detailed:'HTTP 400 INVALID_ARGUMENT znamená neplatný tvar požadavku, nepodporovanou kombinaci modelu/příloh nebo jiný chybný parametr. Neplatný či neoprávněný klíč se častěji projeví jako 401/403. Zkontroluj model, URL a přílohy; pro návrat k ověřené volbě použij Výchozí (gemini-3.5-flash).',
  evidence:['geminiApiErrorMessage()','HTTP 400','INVALID_ARGUMENT','getGeminiInputKey()','useGeminiKeyForSession()']},

 {id:'chyba-401-403',title:'Chyba 401 / 403 / PERMISSION_DENIED při generování',status:'reseno',
  keywords:['401','403','permission denied','permission_denied','unauthenticated','nemam opravneni','nemám oprávnění','pristup odepren','přístup odepřen','klic nema opravneni','klíč nemá oprávnění'],
  simple:'Chyba 401/403 znamená, že API klíč nemá oprávnění. Zkontroluj klíč nebo vytvoř nový s správným projektem v AI Studiu.',
  detailed:'HTTP 401 nebo 403 PERMISSION_DENIED nastane když API klíč není oprávněn pro daný model nebo projekt. Může to být: (1) klíč patří jinému projektu, (2) projekt nemá povolenou Gemini API, (3) klíč byl omezen nebo odvolán. Řešení: jdi na aistudio.google.com → API Keys, zkontroluj ke kterému projektu klíč patří, případně vytvoř nový klíč ve správném projektu.',
  evidence:['geminiApiErrorMessage()','HTTP 401','HTTP 403','PERMISSION_DENIED','UNAUTHENTICATED']},

 {id:'chyba-504',title:'Chyba 504 / DEADLINE_EXCEEDED — timeout',status:'reseno',
  keywords:['504','deadline exceeded','deadline_exceeded','timeout','vyprselo','vypršelo','cas vyprsel','čas vypršel','prilis dlouhy test','příliš dlouhý','nestihlo','nestihlo se vygenerovat'],
  simple:'Chyba 504 znamená, že Gemini nestihlo vygenerovat odpověď v časovém limitu. Zkus zmenšit test — méně cvičení nebo méně položek.',
  detailed:'HTTP 504 DEADLINE_EXCEEDED znamená, že služba požadavek nestihla dokončit. Typické příčiny: mnoho cvičení, velké přílohy nebo náročná kombinace typů. Zmenši test, použij hybridní generování, zkrať podklady nebo při použití Lite přepni na výchozí gemini-3.5-flash.',
  evidence:['geminiApiErrorMessage()','HTTP 504','DEADLINE_EXCEEDED','GEMINI_TIMEOUT_MS','hybridní generování']},

 {id:'chyba-poskozeny-json',title:'Poškozený JSON — generátor nemůže sestavit test',status:'reseno',
  keywords:['poskozeny json','poškozený json','spatny json','špatný json','nepodařilo opravit','nepodarilo opravit','json selhal','test negeneruje','generátor nemůže','blbý výstup','divný výstup','nesmyslný výstup'],
  simple:'Gemini vrátilo neúplný nebo chybně naformátovaný výstup. Generátor se pokusí opravit automaticky. Pokud selže, zkus generovat znovu nebo použij hybridní generování.',
  detailed:'Poškozený JSON nastane když model vrátí text, který nejde naparsovat jako validní JSON — typicky useknutý výstup (příliš dlouhý test), model vložil text mimo JSON strukturu, nebo nesprávně escapoval znaky. Generátor automaticky zkusí opravit (repairGeminiJson) a při selhání zobrazí chybu. Řešení: (1) zkus generovat znovu — modely jsou nedeterministické, druhý pokus bývá lepší, (2) zmenši test (méně cvičení/položek), (3) zapni hybridní generování — složitá cvičení zvlášť produkují menší JSON, (4) pokud selháváš opakovaně u jednoho typu, nastav ho na ruční editaci (✏️ v pokročilém módu).',
  evidence:['repairGeminiJson()','lastGeminiJsonRepaired','lastGeminiRawResponse','hybridní generování','runHybridGeneration()']},

 {id:'chyba-data-mimo-zadani',title:'Chyba: data mimo zadání — generátor negeneruje test',status:'reseno',
  keywords:['data mimo zadani','data mimo zadání','pocet polozek','počet položek','ocekavano','očekáváno','spatny pocet','špatný počet','validator','validátor','negeneruje','test negeneruje','chyba validace'],
  simple:'Gemini vygenerovalo správný JSON, ale s jiným počtem položek nebo špatným typem cvičení než bylo zadáno. Generátor to odmítne a zobrazí co konkrétně nesedí. Zkus generovat znovu.',
  detailed:'Validátor striktně kontroluje: počet cvičení, typy cvičení, počet položek v každém cvičení a povinná pole. Chyba data mimo zadání nastane když Gemini nedodrží přesné zadání — například u ordering vygeneruje 1 otázku místo 5. Generátor automaticky zkusí jednu opravu (pošle AI seznam chyb). Pokud ani oprava neprojde, zobrazí se detail chyby. Řešení: (1) zkus generovat znovu, (2) pokud se chyba opakuje u konkrétního typu, zkus hybridní generování, (3) složité typy (ordering, categorisation-board) nastav na ruční editaci.',
  evidence:['validateExerciseSetStrict()','buildExerciseSpecs()','isExerciseValidation','validationDetails','opravný pokyn']},

 {id:'chyba-sit',title:'Chyba sítě / fetch selhal / offline',status:'reseno',
  keywords:['sit','síť','network','fetch','offline','neni internet','není internet','odpojeni','odpojení','selhala sit','selhala síť','cors','proxy'],
  simple:'Generátor nemůže dosáhnout Gemini API kvůli síťovému problému. Zkontroluj připojení k internetu a zkus znovu.',
  detailed:'Síťová chyba nastane když fetch() požadavek selže ještě před tím, než API odpověď dorazí — typicky kvůli výpadku internetu, firemnímu proxy nebo firewallu blokujícímu api.generativelanguage.googleapis.com. Školní sítě občas blokují přímé API volání. Řešení: (1) zkontroluj připojení k internetu, (2) zkus na mobilních datech jestli to funguje, (3) pokud blokuje školní síť, generuj z domova nebo použij mobilní hotspot.',
  evidence:['callGeminiJSON()','geminiNetworkErrorMessage()','fetch selhal','TypeError']},

 {id:'chyba-model-nenalezen',title:'Chyba: model nenalezen / není podporován',status:'reseno',
  keywords:['model nenalezen','model nenalezeny','model not found','not found','not supported','unsupported','404','model nefunguje','spatny model','špatný model','neexistujici model','neexistující model'],
  simple:'Název modelu ve žluté sekci neexistuje nebo již není dostupný. Přepni přes Výchozí nebo ⚡ Silný na gemini-3.5-flash.',
  detailed:'HTTP 404 nebo odpověď not found znamená, že zadaný model není dostupný. ⚡ Silný nastaví stabilní gemini-3.5-flash, 🪶 Lite stabilní gemini-3.1-flash-lite a Výchozí obnoví doporučenou volbu. Dostupnost modelů ověř v oficiální dokumentaci Gemini API.',
  evidence:['GEMINI_MODEL_DEFAULT','setGeminiModel()','quickModel()','resetGeminiModel()','NOT_FOUND']},

 {id:'typy-cviceni-prehled',title:'Přehled typů cvičení — co který typ dělá',status:'reseno',
  keywords:['typy cviceni','typy cvičení','co je ordering','co je matching','co je cloze','co je highlight','co je error tagging','co je transformation','co je categorisation','jaké typy','seznam typů','přehled typů','co umí'],
  simple:'Generátor nabízí přes 20 typů cvičení: od klasických (multiple choice, true/false, fill-in-the-blank) přes složitější (ordering, categorisation-board, highlight-evidence, error-tagging) až po produktivní (translation, transformation-chain). Každý typ testuje jiné jazykové dovednosti.',
  detailed:'Základní typy: multiple choice (výběr z možností), true/false (pravda/nepravda), fill-in-the-blank (doplňování), matching (párování), word order (sestavení věty). Složitější: ordering (seřazení vět/kroků), multi-select (více správných odpovědí), highlight-evidence (označení důkazní věty v textu), error-tagging (označení chyby ve větě a její oprava), banked cloze (doplňování ze zásoby slov), multiple matching (přiřazení více položek). Produktivní: translation (překlad), transformation-chain (transformace věty), error correction (oprava chyby). Specifické: categorisation-board (třídění do kategorií), table-completion (doplňování tabulky), reading comprehension (čtení s porozuměním), listening comprehension (poslech). V generátoru je ke každému typu pedagogická funkce (BOD 5).',
  evidence:['EXERCISE_TYPES','normalizeType()','MANUAL_SUPPORTED_TYPES','isManualSupported()','pedagogická mapa typů']},

 {id:'typy-ordering-vs-wordorder',title:'Ordering vs. word order — jaký je rozdíl',status:'reseno',
  keywords:['ordering','word order','rozdil ordering','rozdíl ordering','serazeni','seřazení','slozeni vety','složení věty','poradi slov','pořadí slov','kdy ordering','kdy word order'],
  simple:'Word order = student skládá větu z jednotlivých slov (drag & drop nebo klikání). Ordering = student řadí celé fráze nebo kroky do správného pořadí (1., 2., 3…). Word order je na úrovni věty, ordering na úrovni celků.',
  detailed:'Word order testuje syntaxi — student dostane zamíchaná slova a sestaví z nich správnou větu. Hodí se na procvičení slovosledu, pomocných sloves, negace. Ordering testuje logické pořadí — student dostane celé fráze nebo kroky a seřadí je. Hodí se na procvičení podmínkových vět, kroků procesu, časové posloupnosti. Ordering generuje N samostatných bloků (každý je jedna otázka se svými frázemi), zatímco word order generuje jednu větu na otázku.',
  evidence:['ordering','word-order','ordBadgeHtml()','clickOrd()']},

 {id:'typy-multiselect-vs-multiplechoice',title:'Multi-select vs. multiple choice — jaký je rozdíl',status:'reseno',
  keywords:['multi select','multiselect','multiple choice','vice spravnych','více správných','jedna spravna','jedna správná','checkbox','radio','kdy multi select'],
  simple:'Multiple choice = právě jedna správná odpověď (radio button). Multi-select = může být více správných najednou (checkboxy). Multi-select je náročnější — student musí zaškrtnout přesně ty správné.',
  detailed:'Multiple choice má vždy právě jednu správnou odpověď — student vybere jednu z nabídnutých možností. Multi-select může mít 1–N správných odpovědí; student zaškrtne všechny správné. Bodování multi-select je přísnější: za každou nesprávně zaškrtnutou nebo nezaškrtnutou možnost se odečítá část bodu. Správný klíč u multi-select je pole indexů (např. [0,2]), ne jedno číslo.',
  evidence:['multi-select','multiple choice','multiSelectScore()','correct[]','MULTI-SELECT RULES']},

 {id:'typy-highlight-evidence',title:'Highlight-evidence — označení důkazní věty',status:'reseno',
  keywords:['highlight evidence','highlight-evidence','zvyrazneni','zvýraznění','dukaz','důkaz','oznacit vetu','označit větu','ukazat dukaz','ukázat důkaz','evidence','podtrhnout'],
  simple:'Student dostane odstavec textu a musí kliknout na větu, která nejlépe podporuje dané tvrzení (důkazní věta). Testuje porozumění textu a schopnost najít relevantní informaci.',
  detailed:'Highlight-evidence zobrazí text rozdělený do vět. Student klikne na větu, která je správnou odpovědí. Správný klíč je index věty (0, 1, 2…) v poli sentences[]. Bodování: kliknutí na správnou větu = plný počet bodů, jiná věta = 0. Tento typ vyžaduje kvalitní zdrojový text; generátor ho vytvoří automaticky nebo použij vlastní text ve vstupním poli.',
  evidence:['highlight-evidence','sentences[]','correct (index)','edEvidenceBlock()']},

 {id:'typy-error-tagging',title:'Error-tagging — označení a oprava chyby',status:'reseno',
  keywords:['error tagging','error-tagging','oznaceni chyby','označení chyby','oprava chyby','chyba ve vete','chyba ve větě','najdi chybu','podtrhni chybu','grammar error'],
  simple:'Student dostane větu s chybou, klikne na chybné slovo a napíše opravenou verzi. Testuje gramatické povědomí a schopnost identifikovat a opravit chybu.',
  detailed:'Error-tagging zobrazí větu jako klikatelná slova (tokeny). Student klikne na slovo kde je chyba — vybraný token se zvýrazní — a pak napíše opravenou verzi do textového pole. Klíč obsahuje: token (chybné slovo), etype (typ chyby), corr (správná oprava). Bodování: správný token + správná oprava = plný počet bodů; jen token nebo jen oprava = částečný kredit.',
  evidence:['error-tagging','token','etype','corr','errorTagScore()']},

 {id:'typy-categorisation-board',title:'Categorisation-board — třídění do kategorií',status:'reseno',
  keywords:['categorisation board','categorisation-board','trideni','třídění','kategorie','kategorizace','sorting','rozdelit do skupin','rozdělit do skupin','drag drop kategorie'],
  simple:'Student třídí slova nebo fráze do správných kategorií přetažením nebo klikáním. Každá položka patří do právě jedné kategorie. Testuje třídění slovní zásoby nebo gramatických jevů.',
  detailed:'Categorisation-board zobrazí N kategorií jako sloupce a zamíchané položky. Student přiřadí každou položku do správné kategorie. Každá kategorie (entries s {text, category}) má přesně jeden správný sloupec. Generátor generuje 6–10 položek na jeden board. Bodování je částečné: 4/4 = plný počet, 3/4 = 75 % atd. Typ je označen jako složitý (MANUAL_SUPPORTED_TYPES) — generuje se zvlášť v hybrid módu.',
  evidence:['categorisation-board','entries[{text,category}]','categories[]','catBoardScore()','MANUAL_SUPPORTED_TYPES']},

 {id:'pocet-polozek-doporuceni',title:'Kolik položek dát do každého cvičení',status:'reseno',
  keywords:['kolik polozek','kolik položek','kolik otazek','kolik otázek','doporuceny pocet','doporučený počet','optimalni pocet','optimální počet','prilis mnoho','příliš mnoho','prilis malo','příliš málo'],
  simple:'Doporučení: 5–10 položek na cvičení. Méně než 3 je pedagogicky slabé, více než 15 zvyšuje riziko chyb generování a pomalého tisku.',
  detailed:'Optimální počet závisí na typu: multiple choice 5–8, true/false 8–12, fill-in-the-blank 6–10, matching 5–8 párů, ordering 3–6 bloků, categorisation-board 6–10 položek, multi-select 4–6, transformation-chain 4–6, error-tagging 4–6. U složitých typů (ordering, categorisation-board) drž se raději spodní hranice — model má obtížnější strukturovaný výstup a více položek zvyšuje riziko poškodeného JSONu nebo timeoutu.',
  evidence:['pocetOtazek','validateExerciseSetStrict()','MIN_ITEMS','MAX_ITEMS']},

 {id:'hybrid-generovani',title:'Hybridní generování — co to je a proč existuje',status:'reseno',
  keywords:['hybrid','hybridni','hybridní','proc se generuje po cvicenich','proč se generuje po cvičeních','automaticky zvlast','automaticky zvlášť','slozita cviceni','složitá cvičení','proc trva dele','proč trvá déle','jak funguje generovani'],
  simple:'Hybridní generování automaticky rozpozná složitá cvičení (ordering, categorisation-board atd.) a vygeneruje je každé vlastním API požadavkem. Jednoduchá cvičení jdou najednou. Žádná akce není potřeba — funguje automaticky.',
  detailed:'Složitá cvičení (MANUAL_SUPPORTED_TYPES: ordering, categorisation-board, multi-select, highlight-evidence, transformation-chain, error-tagging, banked cloze, multiple matching, table-completion) mají komplexní JSON strukturu, kterou model při generování více cvičení najednou občas pokazí. Hybridní generování řeší tím, že tato cvičení generuje každé zvlášť (split), jednoduchá jdou v jednom batchi. Výsledky se složí ve správném pořadí. Pokud složité cvičení selže i po 2 pokusech, test se sestaví bez něj a zobrazí se doporučení pro ruční editaci. Tlačítko Každé cvičení zvlášť je manuální alternativa — generuje zvlášť i jednoduchá cvičení.',
  evidence:['runHybridGeneration()','MANUAL_SUPPORTED_TYPES','isManualSupported()','complexIdxs','simpleIdxs','hybridBanner']},

 {id:'hybrid-hlasky',title:'Hlášky při hybridním generování — co znamenají',status:'reseno',
  keywords:['hybrid hlaska','hybrid hláška','generuje zvlast','generuje zvlášť','pokus 1 2','co znamena hybrid','co znamená hybrid','zlute hlasky','žluté hlášky','jak dlouho trva','jak dlouho trvá'],
  simple:'Hlášky "⚡ Hybrid: složité cvičení 1/2…" jsou normální — informují o průběhu. Číslo X/Y znamená kolikáté složité cvičení se právě generuje z celkového počtu.',
  detailed:'Při hybridním generování se zobrazují průběžné hlášky: "⚡ Hybrid: složité cvičení X/Y (typ)…" = generuje se X-té složité cvičení z Y celkových složitých. "⚡ Hybrid: generuji N jednoduchých cvičení najednou…" = batch jednoduchých. "Gemini vrátilo neúplný výstup — opakuji (pokus X/Y, za N s)…" = model vrátil špatná data, generátor to zkouší znovu automaticky (normální). "⚡ Hybrid: sestavuji test a validuji…" = vše vygenerováno, probíhá validace. Pokud se zobrazí ⚠️ s doporučením ruční editace, jedno ze složitých cvičení se nepodařilo automaticky.',
  evidence:['runHybridGeneration()','setGenMsg()','geminiWaitBeforeRetry()','MAX_SINGLE=2']},

 {id:'rucni-editace-cviceni',title:'Ruční editace složitých cvičení (✏️)',status:'reseno',
  keywords:['rucni editace','ruční editace','rucne zadat','ručně zadat','ceruzka','tužka','pencil','manual mode','manualni','manuální','slozite cviceni rucne','složité cvičení ručně','editovat cviceni','editovat cvičení'],
  simple:'Pro složitá cvičení lze v pokročilém módu zapnout ruční zadání (✏️). Místo generování AI vyplníš otázky a odpovědi sám přes formulář v editoru.',
  detailed:'V pokročilém módu je u každého složitého cvičení (MANUAL_SUPPORTED_TYPES) přepínač 🤖/✏️. Přepnutí na ✏️ (manualMode=true) způsobí, že toto cvičení AI negeneruje — místo toho se otevře editor otázek a odpovědí kde zadáš obsah ručně. Ostatní cvičení se generují normálně (hybridně). Ruční editace je záchranná síť pro případy kdy AI opakovaně selhává u konkrétního složitého typu.',
  evidence:['manualMode','isManualSupported()','MANUAL_SUPPORTED_TYPES','ex-manual-toggle','generateTestWithManual()']},

 {id:"answers-txt-format",title:"Co obsahuje answers.txt",status:"reseno",
  keywords:["answers txt", "answers.txt", "soubor odpovedi", "format odpovedi", "otevrit answers", "co je v answers"],
  simple:"V bezpečném offline režimu je answers.txt šifrovaný balíček. Ručně je čitelná jen obálka s technickými identifikátory; odpovědi, jméno/kód a bezpečnostní události dešifruje až správný učitelský verifier.",
  detailed:"Soubor začíná hlavičkou SECURE-ANSWERS-V1 a obsahuje hybridně šifrovaný payload: data jsou chráněna AES-GCM a klíč je zabalen veřejným RSA-OAEP klíčem konkrétního verifieru. Uvnitř šifrované části jsou odpovědi, identita zadaná studentem, skupina, časy, attemptId a bezpečnostní události. answers.txt se nemá ručně upravovat ani převádět do jiného formátu.",
  evidence:["SECURE-ANSWERS-V1", "encryptPayloadForTeacher()", "AES-GCM", "RSA-OAEP", "teacher_verifier.html"]},

 {id:'bezpecnostni-signaly-vyznam',title:'Bezpečnostní signály ve výsledku — co znamenají a kolik je normální',status:'reseno',
  keywords:['bezpecnostni signal','bezpečnostní signál','blur','split screen signal','opusteni testu','opuštění testu','podvadeni','podvádění','bezpecnostni zaznam','bezpečnostní záznam','jak cist bezpecnostni','jak číst bezpečnostní','kolik signalu je normal','kolik signálů je normální'],
  simple:'Bezpečnostní signály jsou indicie, ne důkazy. Blur = student přepnul okno/aplikaci. Split-screen = test běžel v malém okně. Fullscreen exit = opustil fullscreen. Každý student je jiný — 1–3 signály mohou být náhodné.',
  detailed:'Typy signálů: blur-count (kolikrát student přepnul z okna testu — 1–2 může být náhodné, 10+ je podezřelé), blur-total-ms (celkový čas mimo okno), split-window (podíl času s malým oknem — typické pro rozdělenou obrazovku), fullscreen-exit (kolikrát opustil povinný fullscreen). Signály jsou vodítko pro učitele, ne automatické hodnocení. Kontext je důležitý: student s dyslexií mohl mít zapnutou čtečku v druhém okně; student na slabém PC mohl mít pomalé překreslování. Signály vidíš v teacher verifieru v záložce Bezpečnostní záznam.',
  evidence:['startBlurMonitor()','startSplitMonitor()','recordSplitSummary()','security{}','SPLIT_RATIO','BLUR_THRESHOLD']},

 {id:'bodovani-nesedi',title:'Bodování nesedí — co dělat',status:'reseno',
  keywords:['bodovani nesedi','bodování nesedí','spatne body','špatné body','chybne body','chybné body','dostal 0','dostala 0','spatny vysledek','špatný výsledek','chybny vysledek','chybný výsledek','student ma 0','špatně ohodnoceno','chybne ohodnoceno'],
  simple:'Pokud bodování nesedí: (1) zkontroluj klíč správných odpovědí v teacher verifieru, (2) spusť ověření klíče, (3) oprav klíč v editoru a výsledky vygeneruj znovu.',
  detailed:'Nejčastější příčiny chybného bodování: (1) AI vygenerovala špatnou správnou odpověď — zkontroluj klíč v teacher verifieru, oprav v editoru, (2) alt_answers chybí — student napsal synonymum nebo jiný tvar, přidej ho jako přijatelnou alternativu, (3) mezery nebo velikost písmen — bodovací engine ignoruje velikost a okrajové mezery, ale ne vnitřní, (4) u překladu/transformace je bodování AI-based — může se lišit od tvého očekávání, (5) u multi-select zkontroluj jestli klíč je pole indexů [0,2] a ne jedno číslo. Spusť self-test pro ověření bodování všech typů.',
  evidence:['textScore()','SHARED_SCORING_JS','alt_answers[]','runScoringSelfTest()','aiVerifyKey()']},

 {id:"student-odevzdal-dvakrat",title:"Student odevzdal dvakrát",status:"castecne",
  keywords:["odevzdal dvakrat", "dvojite odevzdani", "duplicate", "stejny student", "dva answers", "opakovany pokus"],
  simple:"Secure test po odevzdání nastaví v témže prohlížeči zámek a verifier umí upozornit na duplicitní identitu nebo pokus. Není to však absolutní ochrana proti novému zařízení či jiné kopii souboru.",
  detailed:"Po úspěšném odevzdání se pro daný test uloží lokální příznak submitted. Stejný prohlížeč proto další pokus zablokuje. Student ale může použít jiný profil, zařízení nebo nově vygenerovaný soubor; bez serveru nelze pokus globálně zneplatnit. Při hromadném vyhodnocení kontroluj shodné identity, attemptId a časové údaje a rozhodni podle předem oznámených pravidel.",
  evidence:["setSubmittedLocked()", "submittedLocked()", "attemptId", "teacher verifier", "result duplicate checks"]},

 {id:"workflow-pred-nasazenim",title:"Správný postup před ostrým nasazením testu",status:"reseno",
  keywords:["postup", "workflow", "jak pripravit test", "jak připravit test", "co udelat pred", "co udělat před", "checklist", "kontrolni seznam", "kontrolní seznam", "pred nasazenim", "před nasazením", "jak spravne", "jak správně", "co zkontrolovat"],
  simple:"Vygeneruj test, pedagogicky ho zkontroluj, spusť self-test a ověření klíče, oprav chyby, otestuj studentský průchod i odevzdání a teprve potom soubor distribuuj.",
  detailed:"Povinné minimum: (1) zkontrolovat zadání, jazyk, klíč a bodování, (2) otevřít mobilní i desktopový náhled, (3) spustit self-test, (4) u důležitého testu použít druhý AI průchod jen jako pomocnou kontrolu, ne jako náhradu učitele, (5) opravit obsah v editoru, (6) vytvořit student_test.html a případný verifier, (7) projít celý test jako student včetně answers.txt, (8) u diferenciace ověřit jeden platný a jeden neplatný kód, (9) zkontrolovat, že studentský soubor neobsahuje čitelný roster ani answer key, (10) připravit náhradní postup pro reload, pád zařízení nebo nedostupnost sítě.",
  evidence:["runScoringSelfTest()", "aiVerifyKey()", "openTestEditor()", "studentHashes", "RELEASE-CHECKLIST.md"]},

 {id:"sdileni-bez-github",title:"Jak nasdílet test bez GitHub Pages",status:"reseno",
  keywords:["bez github", "bez GitHub", "sdileni souboru", "sdílení souboru", "poslat soubor", "poslat test", "email", "email soubor", "usb", "uloziste", "úložiště", "google drive", "onedrive", "jak dat studentum", "jak dát studentům", "lokalni sit", "lokální síť", "classroom"],
  simple:"Studentský HTML lze předat přes školní LMS, zabezpečené úložiště, e-mail nebo USB. Po stažení běží offline, ale pro klasifikované použití je spolehlivější otevření z oficiální HTTPS adresy.",
  detailed:"Samostatný student_test.html nevyžaduje Gemini ani průběžné internetové připojení. Lokální otevření přes file:// může mít podle prohlížeče omezení pro WebCrypto, fullscreen, sdílení nebo úložiště, proto před ostrým použitím otestuj přesně stejný způsob distribuce a zařízení. teacher_verifier.html nikdy nezveřejňuj ani neposílej studentům. Veřejný odkaz na ostrý test sdílej až těsně před použitím a po skončení jej odstraň.",
  evidence:["student_test.html", "teacher_verifier.html", "secureOffline", "https://", "WebCrypto"]},

 {id:"github-pages-hosting",title:"Nasazení na GitHub Pages",status:"reseno",
  keywords:["github pages", "nahrat na github", "hosting", "publikovat", "deploy", "github actions", "dist"],
  simple:"Zdroj aplikace se upravuje v src/, ale na GitHub Pages se nasazuje sestavený obsah dist/. Repo má automatický build a testy v GitHub Actions.",
  detailed:"Doporučený postup: nahraj obsah produkčního ZIPu do repozitáře, ponech workflow a zdrojové soubory, zkontroluj že Actions prošly, a teprve potom používej Pages URL. Neupravuj ručně vygenerovaný dist/index.html; změny dělej v src/shell.html, src/styles.css nebo příslušném modulu src/js/ a spusť npm test. Aktualizace se na webu projeví po dokončení nasazovacího workflow a obnovení PWA cache.",
  evidence:["src/", "scripts/build.mjs", "dist/", "npm test", ".github/workflows"]},

 {id:"github-test-nenacte",title:"Test na GitHubu se nenačte nebo zobrazuje chybu",status:"reseno",
  keywords:["nefunguje link", "nefunguje odkaz", "nenacte se", "nenačte se", "github chyba", "404 github", "test nejde otevrit", "test nejde otevřít", "bily ekran", "bílý ekrán", "prazdna stranka", "prázdná stránka", "cors", "mixed content"],
  simple:"Nejdřív zkontroluj stav GitHub Actions a Pages deploymentu, potom přesnou github.io adresu a cache PWA. Změna není dostupná, dokud nasazovací workflow neskončí úspěšně.",
  detailed:"Postup: (1) v záložce Actions otevři poslední běh workflow a ověř zelený build i deploy, (2) zkontroluj Pages URL a cestu repozitáře, (3) proveď tvrdé obnovení nebo zavři a znovu otevři nainstalovanou PWA, (4) ověř že dist/ při buildu obsahoval index.html, PWA manifest, service worker a studio-manifest.json, (5) při bílé stránce zkontroluj konzoli prohlížeče. Neupravuj ručně nasazený dist/index.html; oprav zdroj, spusť npm test a vytvoř nový commit.",
  evidence:[".github/workflows/deploy.yml", "GitHub Actions", "dist/index.html", "public/sw.js", "npm test"]},

 {id:"prisny-vs-procvicovaci-student",title:"Co vidí student v ostrém a procvičovacím režimu",status:"reseno",
  keywords:["prisny test", "přísný test", "procvicovaci", "procvičovací", "co vidi student", "co vidí student", "vysledek studenta"],
  simple:"V okamžitém režimu student po odevzdání vidí výsledek a nastavenou zpětnou vazbu. V secureOffline režimu výsledek ani klíč nevidí; stáhne pouze šifrovaný answers.txt pro učitele.",
  detailed:"Okamžitý režim je vhodný pro procvičování a rychlou zpětnou vazbu; podle konfigurace ukáže skóre, známku a vysvětlení. Bezpečný offline režim odděluje studentský test a teacher_verifier.html. Po odevzdání student dostane jen možnosti stáhnout, sdílet nebo zkopírovat šifrovaný soubor odpovědí. Vyhodnocení probíhá až ve verifieru učitele.",
  evidence:["resultMode", "instant", "secureOffline", "downloadAnswers()", "teacher_verifier.html"]},

 {id:"student-ztratil-pripojeni",title:"Student ztratil připojení nebo obnovil stránku",status:"castecne",
  keywords:["ztratil pripojeni", "bez internetu", "offline", "obnovil stranku", "refresh", "zavrel kartu", "ztratil odpovedi"],
  simple:"Již načtený studentský test může pokračovat bez internetu. Rozpracované odpovědi se však průběžně neobnovují po zavření karty nebo reloadu; tyto akce mohou pokus ztratit.",
  detailed:"Studentský HTML je samostatný a po načtení nepotřebuje server ani Gemini. Aktuální odpovědi a časovač jsou ale během pokusu převážně v paměti. Krátký výpadek sítě nevadí, pokud stránka zůstane otevřená; obnovení stránky, pád prohlížeče nebo zavření karty může rozpracovaný pokus smazat. U klasifikovaného testu proto zakaž reload, připrav náhradní zařízení/postup a incident řeš podle jednotných pravidel.",
  evidence:["offline HTML", "RESP", "STARTED_AT", "startTimer()", "submittedLocked()"]},

 {id:"zmena-pinu-hesla",title:"Změna přístupu, PINu nebo hesla",status:"reseno",
  keywords:["zmena pinu","zmena hesla","novy pristup","odemykaci heslo","ucitelsky pin"],
  simple:"Přístup do Generátoru se mění vydáním nového oprávnění v AI Studiu. Učitelský PIN a odemykací heslo konkrétního testu změníš pouze novým sestavením výstupu.",
  detailed:"Generátor již nemá vlastní místní přístupový PIN. Pokud uživatel ztratí osobní přístupový soubor nebo získá další školení, správce v AI Studiu vydá nový kumulativní přístup. Učitelský PIN a odemykací heslo vložené do konkrétního testu nelze po exportu bezpečně přepsat bez změny integrity; uprav je v generátoru a vytvoř nový student_test.html i teacher_verifier.html.",
  evidence:["AI Studio Můj přístup","Vydání přístupu","teacher_verifier.html","student_test.html"]},

 {id:'flash-vs-lite',title:'Gemini Flash vs. Flash Lite — jaký je rozdíl',status:'reseno',
  keywords:['flash vs lite','flash lite','ktery model','který model','lepsi model','lepší model','horsi model','horší model','kdy pouzit lite','kdy použít lite','rychlejsi model','rychlejší model','kvalita modelu','model doporuceni','model doporučení'],
  simple:'Gemini 3.5 Flash je výchozí volba pro kvalitní a složitější testy. Gemini 3.1 Flash-Lite je rychlejší a úspornější pro jednodušší, dobře vymezené úlohy. Aktivní limity se liší podle projektu.',
  detailed:'Gemini 3.5 Flash je stabilní výchozí model s podporou strukturovaných výstupů, URL contextu a multimodálních vstupů; hodí se pro složité typy a delší testy. Gemini 3.1 Flash-Lite je stabilní nízkolatenční a nákladově úspornější model pro jednoduché, dobře vymezené úlohy. Přepíná se tlačítky 🪶 Lite a ⚡ Silný. Konkrétní rychlost a aktivní limity závisí na projektu, modelu a zatížení služby.',
  evidence:['GEMINI_MODEL_DEFAULT','gemini-3.5-flash','gemini-3.1-flash-lite','quickModel()','Rate limits']},

 {id:"pristup-kolega",title:"Jak dát přístup kolegovi",status:"reseno",
  keywords:["pristup kolega","pridat ucitele","novy ucitel","vydat pristup","skoleni"],
  simple:"Po absolvování školení vydá správce kolegovi v AI Studiu osobní podepsaný přístup a povolí v něm Generátor i všechny dříve absolvované aplikace.",
  detailed:"V AI Studiu otevři Správa → Vydání přístupu, načti soukromý podpisový klíč, vyplň jméno a interní identifikátor, nastav roli Proškolený učitel, platnost a kumulativní seznam aplikací. Kolegovi pošli pouze soubor .ghrab-access.json. Ten jej jednou aktivuje ve Studiu; Generátor i ostatní povolené nástroje se pak otevřou bez dalšího zadávání.",
  evidence:["AI Studio access issuer",".ghrab-access.json","apps: generator","kumulativní oprávnění"]},

 {id:"vice-variant-testu",title:"Více variant testu",status:"reseno",
  keywords:["vice variant", "více variant", "varianta a b", "nahodne poradi", "náhodné pořadí", "diferencovane varianty"],
  simple:"Aplikace umí náhodné pořadí i rozdílné varianty podle diferenciačních skupin. Pro zcela samostatné varianty A/B lze stejné zadání také vygenerovat opakovaně.",
  detailed:"Volba randomizace mění pořadí úloh a odpovědí podle podporovaného typu. Diferenciace vytvoří samostatný obsah pro skupiny a studentovu variantu zvolí podle přesně zadaného jména nebo jednorázového kódu. Potřebuješ-li dvě nezávislé sady bez společného rozpisu, vygeneruj test dvakrát a označ je A/B; každý výstup má vlastní Test ID a bezpečnostní materiál.",
  evidence:["randomizace", "buildPublicDiffGroups()", "STUDENT_VARIANTS", "testId", "diferenciace-skupiny"]},

 {id:'test-pro-cast-latky',title:'Jak udělat test jen pro část látky nebo konkrétní text',status:'reseno',
  keywords:['cast latky','část látky','konkretni text','konkrétní text','urcita latka','určitá látka','jen z textu','jen z tohoto','vlastni text','vlastní text','nahrat text','nahrát text','vstupni text','vstupní text','omezit obsah','omezit téma'],
  simple:'Vlož svůj text do vstupního pole (nebo nahraj soubor) a generátor vytvoří otázky výhradně z tohoto obsahu. Čím konkrétnější vstup, tím přesnější výstup.',
  detailed:'Způsoby omezení obsahu: (1) Vstupní text — vlož přímo text, ze kterého mají být otázky (článek, ukázka, slovní zásoba). Generátor ho přijme jako primární zdroj. (2) Příloha — nahraj PDF, DOCX nebo obrázek; generátor ho zpracuje jako vstup. (3) URL — vlož odkaz na webovou stránku. (4) Téma + kontext — v poli tématu buď velmi konkrétní: místo "conditional sentences" napiš "second conditional — nereálné podmínky, věty o cestování, úroveň B1". Čím konkrétnější zadání, tím méně se generátor odchyluje od tvého záměru.',
  evidence:['buildContentPrompt()','filePartsForGemini()','urlContext','state.tema','state.kontext']},

 {id:"sablony-ulozeni",title:"Co přesně ukládá šablona",status:"reseno",
  keywords:["co uklada sablona", "co ukládá šablona", "ulozeni sablony", "uložení šablony", "template profile", "pedagogicky profil"],
  simple:"Šablona ukládá pouze pedagogický profil a základní strukturu diferenciace. Nejde o kopii celého testu.",
  detailed:"Ukládají se: testMode, resultMode, feedbackMode, differentiationLevel, fuzzyTolerance, gradeTyp, zapnutí diferenciace a počet/názvy skupin. Neukládají se cvičení, počet otázek, jazyk, název, téma, čas, podmínky skupin, seznam studentů, soubory, URL, API klíč, hesla ani PINy. Pro přenos celého očištěného zadání mezi kolegy použij samostatný export zadání JSON.",
  evidence:["PROFILE_KEYS", "getTemplateProfile()", "profile_v1", "exportZadani()", "buildZadaniExport()"]},

 {id:"historie-snapshoty",title:"Co přesně ukládá historie a snapshot",status:"reseno",
  keywords:["snapshot", "historie ulozeni", "historie uložení", "obnovit nastaveni", "obnovit nastavení", "lokalni historie"],
  simple:"Snapshot obnoví většinu rozpracovaného formuláře, historie uchová pět posledních očištěných generování. Citlivé hodnoty a reálné identity jsou odstraněny.",
  detailed:"getStoredState() vyprázdní seznam příloh a nahradí členy skupin kódy Student A1…. Hesla a učitelský PIN nejsou mezi ukládanými poli; prompt se navíc sanitizuje. Při načtení se soubory a citlivá pole znovu vyčistí. Data jsou pouze v daném profilu prohlížeče, takže je nepovažuj za zálohu a na sdíleném zařízení historii po práci smaž.",
  evidence:["saveSnapshot()", "getStoredState()", "anonymizeGroupsForStorage()", "sanitizePromptForStorage()", "loadFromHistory()"]},

 {id:"archivace-vysledku",title:"Jak archivovat výsledky testů",status:"reseno",
  keywords:["archivace", "archivovat", "ulozit vysledky", "uložit výsledky", "archiv testu", "archiv testů", "uchovat vysledky", "uchovati výsledky", "dlouhodobe ulozeni", "dlouhodobé uložení", "csv export", "export vysledku", "export výsledků"],
  simple:"Výsledky ukládej jen na oprávněné školní úložiště, s jasným názvem testu a dobou uchování. Veřejný GitHub ani osobní cloud bez schválení nejsou vhodné.",
  detailed:"Pro ověřitelnost uchovej po nezbytnou dobu: použitý student_test.html, odpovídající teacher_verifier.html, šifrované answers.txt a export výsledků. Složku označ třídou, datem a Test ID, omez přístup a řiď se školní spisovou/retenční politikou; nearchivuj data automaticky navždy. Po uplynutí účelu bezpečně smaž studentské identity a výsledky. Verifier je vysoce citlivý, protože obsahuje privátní klíč a správné odpovědi.",
  evidence:["testId", "answers.txt", "teacher_verifier.html", "downloadCsv()", "PROVOZNI-PRAVIDLA.md"]},

 {id:"student-nema-vysledek",title:"Student po secure testu nevidí výsledek",status:"reseno",
  keywords:["student nema vysledek", "student nemá výsledek", "neukazuje znamku", "neukazuje známku", "jen answers txt", "kde je vysledek"],
  simple:"V secureOffline režimu je to záměr: student nevidí skóre ani klíč, pouze odevzdá šifrovaný answers.txt. Výsledek zobrazí až učitelský verifier.",
  detailed:"Po odevzdání student stáhne answers.txt; stejný obsah lze ještě sdílet nebo zkopírovat ze záložního textového pole, dokud stránku nezavře či neobnoví. Učitel otevře odpovídající teacher_verifier.html a soubor načte. Pokud student stránku před uložením výsledku obnoví, rozpracovaný payload už nemusí být dostupný a je nutné postupovat podle pravidel pro technický incident.",
  evidence:["downloadAnswers()", "shareAnswers()", "copyAnswers()", "ANSWER_TXT", "teacher_verifier.html"]},

 {id:'test-se-zobrazuje-jinak',title:'Test se studentovi zobrazuje jinak než v náhledu',status:'reseno',
  keywords:['zobrazuje jinak','vypadá jinak','jiny vzhled','jiný vzhled','student vidi jine','student vidí jiné','rozliseni','rozlišení','mobil pc','mobil pocitac','mobil počítač','jiny prohlizec','jiný prohlížeč','safari chrome'],
  simple:'Test je responzivní — na mobilu vypadá jinak než na PC. To je záměr. Pokud jsou rozdíly závažné (prvky se překrývají, texty se nevejdou), zkontroluj náhled v mobilním zobrazení.',
  detailed:'Rozdíly mezi zařízeními jsou normální a žádoucí — test se přizpůsobuje šířce obrazovky. Problémy nastávají když: (1) student používá velmi starý prohlížeč (IE, starý Safari) — test je otestován pro Chrome, Firefox, Edge, moderní Safari, (2) student má zapnutý čtečkový/accessibility mód který mění layout, (3) na iOS Safari může být jiné chování fullscreenu a drag&drop. Pokud student hlásí nefunkčnost: požádej ho aby otevřel test v Chrome. Vizuální rozdíly (barvy, fonty) mohou způsobit tmavý režim operačního systému.',
  evidence:['responsive CSS','viewport','@media','prefers-color-scheme']},

 {id:"prilohy-typy-a-limity",title:"Přílohy — podporované typy a limity",status:"reseno",
  keywords:["prilohy", "přílohy", "typy souboru", "limit souboru", "pdf docx audio video", "kolik souboru"],
  simple:"Lze přidat nejvýše 12 souborů, každý do 20 MB. Podporovány jsou PDF, DOCX, textové a datové formáty, běžné obrázky, audio a vybraná videa; starý DOC, AVI a MKV podporovány nejsou.",
  detailed:"Povolené přípony: pdf, docx, txt/md/csv/tsv/json/rtf/html/xml/yaml/yml/srt, png/jpg/jpeg/gif/webp/heic, mp3/wav/m4a/ogg/aac/flac a mp4/mov/m4v/webm. Text vložený do promptu je omezen na 24 000 znaků a obrázky se před API požadavkem zmenšují. I povolený velký mediální soubor může narazit na limit služby nebo timeout; pro spolehlivost používej menší a pedagogicky relevantní podklady.",
  evidence:["MAX_FILES", "MAX_FILE_SIZE", "MAX_EMBEDDED_TEXT_CHARS", "ALLOWED_FILE_EXT", "prepareInlineDataPart()"]},

 {id:'url-kontext',title:'Použití URL jako vstupního kontextu',status:'reseno',
  keywords:['url','odkaz','link','webova stranka','webová stránka','z internetu','z webu','pridat url','přidat url','url kontext','url context','vlozit odkaz','vložit odkaz','nacist z webu','načíst z webu'],
  simple:'Do pole URL kontextu vlož odkaz na webovou stránku a generátor vytvoří otázky z jejího obsahu. Funguje pro veřejně dostupné stránky. Stránky za přihlášením nebo s blokem robotů nefungují.',
  detailed:'URL kontext pošle odkaz přímo do Gemini API — model načte obsah stránky a použije ho jako zdroj pro otázky. Funguje pro: veřejné články, Wikipedie, vzdělávací weby, online texty. Nefunguje pro: stránky za přihlášením (Google Docs, školní systémy), stránky blokující crawlery (robots.txt), PDF přímo v URL (lepší je stáhnout a nahrát jako přílohu). Tip: pokud URL nefunguje, zkopíruj text stránky do vstupního textového pole.',
  evidence:['urlContext','state.urlContext','useUrlContext','filePartsForGemini()']},

 {id:"procvicovaci-test-bez-hodnoceni",title:"Procvičovací test bez klasifikace",status:"castecne",
  keywords:["bez hodnoceni", "bez hodnocení", "bez znamky", "bez známky", "procvicovaci test", "formativni", "formativní"],
  simple:"Procvičovací režim lze používat formativně, ale aktuální aplikace nemá samostatný přepínač, který by úplně skryl skóre i známku ve všech výstupech.",
  detailed:"Pro procvičování zvol okamžitý výsledek a vysvětlující zpětnou vazbu, test neukládej jako klasifikovaný a žákům sděl, že skóre je pouze orientační. Potřebuješ-li skutečně výstup bez bodů a známky, je to zatím funkční mezera a vyžaduje samostatnou úpravu výsledkové obrazovky; nepoužívej zastaralé návody s volbou showCorrect nebo group.showFeedback, tyto volby v aktuálním modelu neexistují.",
  evidence:["testMode", "resultMode", "feedbackMode", "instant", "gradeTyp"]},

 {id:"maturita-pouziti",title:"Jak generátor použít pro maturitní přípravu",status:"reseno",
  keywords:["maturita", "maturitni", "maturitní", "priprava na maturitu", "příprava na maturitu", "maturitni test", "maturitní test", "statnice", "státnice", "maturitni cviceni", "maturitní cvičení"],
  simple:"Generátor je vhodný pro přípravu k maturitě, domácí procvičování a školní cvičné testy. Nenahrazuje oficiální zadání ani pravidla vlastní maturitní zkoušky.",
  detailed:"Nastav odpovídající CEFR, používej typy úloh podobné procvičovaným dovednostem a pracuj jen s legálně použitelnými podklady. Učitel musí zkontrolovat věcnou správnost, bodování i shodu s cílem přípravy. Pro interní klasifikované cvičení lze použít secureOffline a dohled; pro samotnou oficiální maturitní zkoušku je nutné postupovat podle platných školních a právních pravidel a schválených materiálů.",
  evidence:["CEFR", "reading comprehension", "transformation-chain", "secureOffline", "PROVOZNI-PRAVIDLA.md"]},

 {id:"co-kdyz-kolega-zapomnel-pin",title:"Kolega ztratil přístupový soubor",status:"reseno",
  keywords:["ztratil pristup","zapomnel pristup","novy pocitac","novy prohlizec","pristupovy soubor"],
  simple:"Kolega znovu načte svůj osobní přístupový soubor v AI Studiu. Pokud jej nemá nebo už neplatí, správce vydá nový kumulativní přístup.",
  detailed:"Přístup je uložen v konkrétním prohlížeči. Na novém zařízení, po vymazání dat nebo v jiném prohlížeči je nutné znovu aktivovat .ghrab-access.json či textový kód. Ztracený soubor nelze ze Studia zpětně stáhnout; správce vytvoří nový, uloží jeho JTI a podle potřeby zneplatní původní oprávnění.",
  evidence:["Můj přístup","ghrab.access.permit.v2","JTI","revoked-access.json"]},

 {id:"anonymizace-gdpr-detail",title:"Anonymizace a GDPR — jak chránit data studentů",status:"reseno",
  keywords:["anonymizace", "gdpr", "ochrana dat", "osobni udaje", "osobní údaje", "jmeno studenta", "jméno studenta", "skryt jmena", "skrýt jména", "anonymni", "anonymní", "pravni", "právní"],
  simple:"Studentské odpovědi se do Gemini neposílají. Při generování ale služba dostává prompt, vybrané URL a přílohy; jména z diferenciace jsou povinně pseudonymizována a ve studentském HTML je rozpis skupin uložen jen jako solené hashe.",
  detailed:"Před AI požadavkem generátor ukáže informační dialog. Identity ze skupin převádí na Student A1… a staré nastavení s vypnutou anonymizací automaticky opraví. Veřejný test neobsahuje čitelný seznam skupin; pro ochranu proti hádání používej náhodné jednorázové kódy místo jmen. Poznámky, diagnózy, podmínky skupin, zdrojové texty a přílohy musí učitel předem zkontrolovat a omezit na nezbytné pedagogické informace. Výsledky a verifier patří jen do zabezpečeného školního úložiště.",
  evidence:["ensureGeminiDataNotice()", "buildDiffBlock()", "studentHashes", "diffRosterSalt", "getStoredState()"]},

 {id:"vice-testu-na-jednom-webu",title:"Více testů na jednom webu",status:"reseno",
  keywords:["vice testu", "více testů", "vice souboru", "více souborů", "seznam testu", "seznam testů", "rozcestnik", "rozcestník", "index stranka", "index stránka", "jak organizovat", "jak organizovat testy", "repo struktura"],
  simple:"Každý studentský test může být samostatný HTML soubor, například ve složce /testy/. Generátor samotný má vlastní build a nasazuje se z dist/.",
  detailed:"Pro studentské testy používej názvy bez osobních údajů, například /testy/2026-4a-kondicionaly-a.html, a sdílej přímý odkaz. Veřejný rozcestník používej jen tehdy, když je záměrné, aby byly testy dohledatelné; pro ostré testy odkaz zveřejni až těsně před použitím a po skončení ho odstraň. Zdroj generátoru zůstává v src/, GitHub Actions sestaví dist/; nepřesouvej studentské výsledky ani teacher_verifier.html do veřejného webu.",
  evidence:["GitHub Pages", "dist/", "src/", "student_test.html", "teacher_verifier.html"]},

 {id:'uprava-po-generovani',title:'Jak upravit otázky a odpovědi po vygenerování',status:'reseno',
  keywords:['upravit otazky','upravit otázky','upravit odpovedi','upravit odpovědi','zmenit otazku','změnit otázku','zmenit odpoved','změnit odpověď','editor','editovat test','editovat','opravit test','opravit chybu','ai vygenerovala spatne','AI vygenerovala špatně'],
  simple:'Po vygenerování klikni na ikonu ✏️ (editor) u konkrétního cvičení nebo otevři plný editor otázek. Lze měnit zadání, správné odpovědi, přijatelné alternativy i vysvětlení.',
  detailed:'Editor otázek a odpovědí (openTestEditor) umožňuje: (1) upravit text otázky/zadání, (2) změnit správnou odpověď, (3) přidat přijatelné alternativy (alt_answers) pro synonyma nebo jiné tvary, (4) přidat nebo smazat položky cvičení, (5) přidat vysvětlení správné odpovědi (zobrazí se v procvičovacím režimu). Po editaci klikni na Uložit a přestavit — test se sestaví znovu s opravenými daty. Pro složité typy (highlight-evidence, ordering) je editor plně funkční.',
  evidence:['openTestEditor()','edItemHtml()','saveEditorChanges()','alt_answers[]','Uložit a přestavit']},

 {id:'pridat-alternativni-odpovedi',title:'Jak přidat přijatelné alternativy ke správné odpovědi',status:'reseno',
  keywords:['alternativy','alternativa','alt odpoved','alt odpověď','synonymum','synonyma','jiny tvar','jiný tvar','student ma pravdu','student má pravdu','spravna ale jina','správná ale jiná','alt answers','uznane odpovedi','uznané odpovědi'],
  simple:'V editoru otázek klikni na + Alternativa pod správnou odpovědí. Alternativy jsou uznány jako správné při hodnocení (oranžová barva v editoru). Vhodné pro synonyma, různé tvary nebo různé správné překlady.',
  detailed:'Přijatelné alternativy (alt_answers[]) jsou další odpovědi, které se hodnotí jako plně správné — například u překladu může být správných více variant. Přidání: otevři editor (✏️), u otázky klikni na + Alternativa, napiš alternativní odpověď. Alternativy jsou viditelné v teacher verifieru (oranžová barva) a v hromadném vyhodnocení. Bodovací engine porovnává studentovu odpověď nejdříve se správnou odpovědí, pak s alternativami — pokud sedí cokoliv z toho, dostane plný počet bodů.',
  evidence:['alt_answers[]','edAltAnswers','textScore()','alternativy']},

 {id:'smazat-cviceni',title:'Jak smazat nebo přeskládat cvičení po vygenerování',status:'reseno',
  keywords:['smazat cviceni','smazat cvičení','odstranit cviceni','odstranit cvičení','preskladat','přeskládat','zmenit poradi','změnit pořadí','presunout cviceni','přesunout cvičení','mazani cviceni','mazání cvičení'],
  simple:'V editoru otázek lze mazat jednotlivé položky uvnitř cvičení. Celé cvičení smazat nebo přeskládat nelze přímo v editoru — nejjednodušší je upravit nastavení a vygenerovat znovu.',
  detailed:'Co lze v editoru: mazat jednotlivé otázky/položky uvnitř cvičení (tlačítko ✕ u položky), přidat novou položku (+ Přidat položku), měnit obsah. Co nelze přímo: smazat celé cvičení nebo změnit pořadí cvičení. Workaround: (1) pokud chceš cvičení smazat, v editoru smaž všechny jeho položky — cvičení zůstane prázdné, ale při přestavení se přeskočí, nebo (2) uprav konfiguraci v generátoru a vygeneruj znovu. Přeskládání pořadí cvičení: zatím nepodporováno — plánovaná funkce.',
  evidence:['edDelItem()','edAddItem()','openTestEditor()','saveEditorChanges()']},

 {id:'ai-klic-nespravny',title:'AI vygenerovala špatnou správnou odpověď — jak opravit',status:'reseno',
  keywords:['spatna odpoved','špatná odpověď','spatny klic','špatný klíč','ai se spleta','ai se splete','chybna odpoved','chybná odpověď','generátor spletl','nesouhlas s klicem','nesouhlas s klíčem','opravit klic','opravit klíč'],
  simple:'Otevři editor (✏️), najdi otázku s chybnou odpovědí a přepiš ji. Pak klikni Uložit a přestavit. Spusť ověření klíče pro kontrolu ostatních otázek.',
  detailed:'Postup opravy: (1) klikni na ✏️ (editor) u cvičení s chybou, (2) najdi konkrétní otázku, (3) přepiš pole Odpověď na správnou hodnotu, (4) volitelně přidej vysvětlení proč je tato odpověď správná, (5) klikni Uložit a přestavit. Pro prevenci: před nasazením spusť Ověření klíče — AI projde všechny uzavřené otázky a upozorní na podezřelé odpovědi. Pokud se chybné odpovědi opakují u určitého typu, zkus přesnější zadání tématu nebo konkrétnější vstupní text.',
  evidence:['openTestEditor()','edAnswer','saveEditorChanges()','aiVerifyKey()','keyDiffsAcknowledged']},
 {id:'typy-banked-cloze',title:'Banked cloze — doplňování ze zásoby slov',status:'reseno',
  keywords:['banked cloze','cloze','banka slov','zásoba slov','word bank','doplnit ze seznamu','doplnit ze zásoby','vyber ze slov','vyber ze seznamu','cloze test','mezerovy test','mezerový test'],
  simple:'Student dostane text s mezerami a seznam slov (banku). Vybírá správné slovo ze zásoby pro každou mezeru. Testuje slovní zásobu a gramatiku v kontextu.',
  detailed:'Banked cloze zobrazí text s mezerami a pod ním nabídku slov (word bank). Student přiřadí každé slovo do správné mezery — buď přetažením nebo výběrem z dropdown menu. Každé slovo lze použít jen jednou. Klíč obsahuje pole správných odpovědí (answers[]) odpovídající pořadí mezer. Bodování: každá správná mezera = poměrná část bodů. Typ je označen jako složitý (MANUAL_SUPPORTED_TYPES) a v hybrid módu se generuje zvlášť.',
  evidence:['banked cloze','banked-cloze','answers[]','word bank','MANUAL_SUPPORTED_TYPES','clozeScore()']},

 {id:'typy-table-completion',title:'Table-completion — doplňování tabulky',status:'reseno',
  keywords:['table completion','table-completion','tabulka','doplnit tabulku','doplňování tabulky','doplnit do tabulky','gramaticka tabulka','gramatická tabulka','sklonovani','skloňování','casovani','časování','paradigma'],
  simple:'Student doplňuje chybějící buňky v tabulce. Vhodné pro paradigmata (časování sloves, skloňování, nepravidelné tvary). Testuje systematické gramatické znalosti.',
  detailed:'Table-completion zobrazí tabulku s předvyplněnými záhlavími a části buněk. Student doplní prázdné buňky. Struktura: rows[] kde každý řádek má label a cells[] (buňky — část je prefilled, část je prázdná pro student). Bodování: každá správně doplněná buňka = poměrná část bodů. Typ je označen jako složitý a v hybrid módu se generuje zvlášť. Vhodné například pro: časování sloves (I go/he goes/they go), stupňování přídavných jmen, nepravidelná minulá příčestí.',
  evidence:['table-completion','rows[]','cells[]','tableScore()','MANUAL_SUPPORTED_TYPES']},

 {id:"bezpecnostni-incident",title:"Bezpečnostní incident — co dělat",status:"reseno",
  keywords:["klic unikl","studenti maji klic","podvod","bezpecnostni incident","zneplatnit pristup","test unikl","pristupovy soubor unikl"],
  simple:"Při úniku testu, verifieru, osobního přístupu nebo API klíče zastav distribuci a zneplatni dotčený prostředek. Již stažený studentský soubor nelze bez serveru vzdáleně zrušit.",
  detailed:"Únik student_test.html: přestaň používat odkaz a vygeneruj nový Test ID. Únik teacher_verifier.html: vytvoř nový pár souborů. Únik osobního .ghrab-access.json: přidej jeho JTI do revokačního seznamu a vydej nový přístup. Únik soukromého podpisového klíče AI Studia: okamžitě vytvoř nový pár klíčů a přegeneruj přístupy. Únik Gemini API klíče: zneplatni jej v Google AI Studio/Cloud Console a zkontroluj využití.",
  evidence:["JTI","revoked-access.json","teacher_verifier.html","Gemini API key","nový podpisový pár"]},

 {id:"access-manifest",title:"Jak funguje podepsaný přístup AI Studia",status:"reseno",
  keywords:["podepsany pristup","permit","pristupovy soubor","verejny klic","revokace","jak funguje pristup"],
  simple:"AI Studio vydává digitálně podepsaný přístup s rolí, platností a seznamem aplikací. Dílčí aplikace podpis ověřují veřejným klíčem ještě před spuštěním svého rozhraní.",
  detailed:"Permit má formát ghrab1.payload.signature. Obsahuje vydavatele, publikum, subjekt, roli, povolené aplikace, čas vydání, konec platnosti a JTI. Soukromý ECDSA P-256 klíč zůstává jen u správce; veřejný klíč může být v repozitáři a slouží pouze k ověření. Generátor také kontroluje revokační seznam. Protože vše běží bez serveru, nelze spolehlivě potvrdit fyzickou identitu uživatele ani zabránit předání souboru jiné osobě.",
  evidence:["ghrab1.payload.signature","ECDSA P-256","access-public-key.json","revoked-access.json","protectApp('generator')"]},

 {id:"role-admin-teacher",title:"Role admin vs. proškolený učitel",status:"reseno",
  keywords:["admin","administrator","proskoleny ucitel","role","opravneni","co muze admin"],
  simple:"Proškolený učitel používá jen aplikace uvedené ve svém přístupu. Admin má automaticky otevřeny všechny aplikace a navíc správcovské nástroje AI Studia.",
  detailed:"Role admin obchází jednotlivý seznam aplikací, otevírá Test Lab a odkazy na centrální správu. Role trainedTeacher používá běžné funkce Generátoru, ale nevydává cizí přístupy. Rozsah oprávnění je součástí digitálně podepsaného permitu a nelze jej změnit prostou editací JSON bez zneplatnění podpisu.",
  evidence:["accIsAdmin()","openAdminPanel()","role: admin","apps[]","digitální podpis"]},

 {id:"logo-skola",title:"Jak změnit logo nebo název aplikace",status:"reseno",
  keywords:["logo", "logo skoly", "logo školy", "nazev skoly", "název školy", "skola", "škola", "branding", "vlastni logo", "vlastní logo", "pridat logo", "přidat logo", "upravit generátor", "vzhled generátoru"],
  simple:"Logo generátoru je vloženo v src/shell.html; názvy aplikace a PWA se upravují v src/shell.html a public/manifest.webmanifest. Poté je nutný build a test.",
  detailed:"src/index.html je pouze informační ukazatel na modulární zdroj, nikoli soubor aplikace k editaci. Branding upravuj ve zdrojích: obrázek/logotyp a titulky v src/shell.html, PWA name/short_name a ikony v public/. Následně spusť npm test a nasaď nově sestavený dist/. Neexistuje jedna globální uživatelská konstanta SCHOOL_NAME, takže po změně zkontroluj titulky generátoru i exportovaných testů.",
  evidence:["src/shell.html", "src/index.html (ukazatel)", "school-logo", "public/manifest.webmanifest", "scripts/build.mjs"]},

 {id:"prirazeni-skupin",title:"Jak přiřadit studenty do skupin",status:"reseno",
  keywords:["prirazeni skupin", "přiřazení skupin", "skupiny", "skupina", "student ve skupine", "student ve skupině", "jak vytvorit skupiny", "jak vytvořit skupiny", "kdo je v jake skupine", "kdo je v jaké skupině", "trida", "třída", "rozdelit studenty", "rozdělit studenty", "jednorazovy kod", "jednorázový kód"],
  simple:"Každá diferenciační skupina má název, pedagogické podmínky, seznam přidělených jmen nebo kódů a volby přístupnosti. Student zadá přesně svůj přidělený identifikátor; podle jeho hashe se otevře správná varianta.",
  detailed:"Skupiny nejsou chráněny společným PINem. Učitel přiřadí každému studentovi jedinečný identifikátor, ideálně náhodný jednorázový kód bez osobních údajů. Při spuštění test normalizuje zadanou hodnotu, vytvoří SHA-256 hash se solí konkrétního testu a porovná jej s veřejným seznamem hashů. Neznámý identifikátor je odmítnut, takže nedojde k náhodnému přidělení jiné varianty. Pedagogické podmínky formuluj obecně, bez diagnóz a nadbytečných citlivých údajů.",
  evidence:["state.skupiny", "identityMode", "buildPublicDiffGroups()", "chooseVariant()", "resolveStudentGroup()"]},

 {id:"anonymizace-v-diferenciaci",title:"Jak funguje anonymizace v diferenciovaném testu",status:"reseno",
  keywords:["anonymizace diferenciace", "anonymizace skupiny", "anonymni skupina", "anonymní skupina", "skryt skupinu", "skrýt skupinu", "nevidet skupinu", "nevidět skupinu", "anonymni trida", "anonymní třída", "diferenciace anonymizace"],
  simple:"Před odesláním do AI se identity vždy mění na Student A1, A2…. Do studentského HTML se čitelný rozpis skupin nevkládá; obsahuje jen solené hashe.",
  detailed:"buildDiffBlock() sestaví prompt s pseudonymy bez ohledu na staré nastavení. Snapshoty a historie také ukládají jen pseudonymy. Při exportu testu buildPublicDiffGroups() vytvoří pro každý identifikátor SHA-256 otisk s náhodnou solí konkrétního testu a runtime podle něj bezpečně zvolí variantu. Učitelský verifier může obsahovat nezbytné privátní mapování pro režim jednorázových kódů, a proto se nikdy nesmí zveřejnit. Hashování není anonymizace proti slovníkovému hádání běžných jmen; používej náhodné kódy.",
  evidence:["buildDiffBlock()", "anonymizeGroupsForStorage()", "buildPublicDiffGroups()", "studentHashes", "teacher_verifier.html"]},

 ];

const GA_NOT_ADDRESSED = 'Tento jev není v generátoru nijak výslovně řešen.';
const GA_CHIPS = ['tisk / PDF','co dát studentům','answers.txt','hromadné vyhodnocení','zpětná vazba','diferenciace','anonymizace','split screen','API klíč','self-test','teacher verifier','fullscreen','export','chyba 503','chyba 429','chyba 400','poškozený JSON','data mimo zadání','model nenalezen','síťová chyba','hybridní generování','ordering','categorisation-board','highlight-evidence','Flash vs Lite','GitHub Pages','šablony','archivace','GDPR','maturita','editor','alternativy'];
let gaState = { ai:null, mode:'simple', loading:false, query:'' };

function gaStatusMeta(status){
  if(status==='reseno')   return {cls:'ga-st-ok',  label:'✅ Řešeno'};
  if(status==='castecne') return {cls:'ga-st-mid', label:'🟡 Částečně řešeno'};
  return {cls:'ga-st-no', label:'⛔ Není výslovně řešeno'};
}
// Odpovídá vždy AI, ale POUZE z popisu funkcí generátoru (GENERATOR_ASSISTANT_KB).
// Posílá se jen dotaz + popis funkcí; NIKDY zdrojový kód, API klíč ani klíč odpovědí.
async function gaRunSearch(){
  const ta=document.getElementById('gaQuery'); if(!ta) return;
  const q=ta.value.trim();
  if(!q){ gaState.ai=null; gaState.query=''; gaState.loading=false; renderGeneratorAssistantAnswer(); return; }
  gaState.query=q;
  if(!(typeof geminiApiKey!=='undefined' && geminiApiKey)){
    gaState.ai=null; gaState.loading=false;
    const box=document.getElementById('gaResult');
    if(box) box.innerHTML='<div class="ga-card"><span class="ga-status ga-st-mid">⚠ Potřebuješ AI klíč</span>'
      +'<p class="ga-hint">Poradce odpovídá přes AI. Zadej prosím Gemini API klíč ve žluté sekci a zkus dotaz znovu.</p></div>';
    return;
  }
  gaState.ai=null; gaState.query=q; gaState.loading=true; renderGeneratorAssistantAnswer();
  const btn=document.getElementById('gaFind'); const old=btn?btn.textContent:''; if(btn){ btn.disabled=true; btn.textContent='⏳ Hledám…'; }
  const podklady=GENERATOR_ASSISTANT_KB.map(e=>({title:e.title,status:e.status,keywords:e.keywords||[],simple:e.simple,detailed:e.detailed,evidence:e.evidence}));
  const prompt='Jsi nápověda k JEDNOMU konkrétnímu generátoru testů (webová aplikace pro učitele). '
    +'Odpovídej VÝHRADNĚ z dodaných podkladů (pole "podklady" = popis skutečných funkcí tohoto generátoru). '
    +'Nevymýšlej funkce, nic nedomýšlej, nepiš "pravděpodobně". Urči stav: '
    +'"reseno" = jev je v podkladech jasně popsán; "castecne" = souvisí jen částečně nebo nepřímo; "ne" = v podkladech není. '
    +'Pokud status="ne", pole simple MUSÍ být přesně: "Tento jev není v generátoru nijak výslovně řešen." '
    +'a do detailed můžeš dodat, že generátor řeší jen chování v rámci okna/prohlížeče, pokud to z podkladů plyne. '
    +'Odpověz česky, srozumitelně pro běžného učitele. simple = krátká netechnická odpověď (1-3 věty). '
    +'detailed = podrobnější vysvětlení. evidence = pole názvů funkcí/konstant/sekcí z podkladů, o které se odpověď opírá (zkopíruj je z podkladů, nevymýšlej nové). '
    +'Vrať POUZE JSON: {"status":"reseno|castecne|ne","simple":"...","detailed":"...","evidence":["..."]} bez dalšího textu. '
    +'Dotaz učitele: '+JSON.stringify(q)+'\npodklady: '+JSON.stringify(podklady);
  try{
    const out=await callGeminiJSON(prompt);
    if(ta.value.trim()!==q){
      gaState.loading=false;
      if(btn){ btn.disabled=false; btn.textContent=old; }
      return;
    }
    const st=(out&&typeof out.status==='string')?out.status.toLowerCase().trim():'';
    const status=(st==='reseno'||st==='castecne'||st==='ne')?st:'ne';
    gaState.ai={
      status,
      simple:String((out&&out.simple)||GA_NOT_ADDRESSED),
      detailed:String((out&&out.detailed)||''),
      evidence:Array.isArray(out&&out.evidence)?out.evidence.map(String).filter(Boolean).slice(0,12):[]
    };
  }catch(err){
    gaState.ai=null; gaState.loading=false;
    if(btn){ btn.disabled=false; btn.textContent=old; }
    const box=document.getElementById('gaResult');
    if(box) box.innerHTML='<div class="ga-card"><span class="ga-status ga-st-no">Chyba AI</span>'
      +'<p class="ga-hint">'+esc('AI se nepodařilo zavolat: '+(err&&err.message?err.message:err))+'</p></div>';
    uiToast('AI dotaz selhal.','warn');
    return;
  }
  gaState.loading=false;
  if(btn){ btn.disabled=false; btn.textContent=old; }
  renderGeneratorAssistantAnswer();
}
function renderGeneratorAssistantAnswer(){
  const box=document.getElementById('gaResult'); if(!box) return;
  if(gaState.loading){ box.innerHTML='<div class="ga-card"><p class="ga-hint">⏳ Hledám odpověď v popisu generátoru…</p></div>'; return; }
  const a=gaState.ai;
  if(!a){ box.innerHTML='<p class="ga-hint">Napiš dotaz a klikni na „Najít odpověď". Odpovídá AI, ale jen z toho, co generátor opravdu umí.</p>'; return; }
  const currentQ=(document.getElementById('gaQuery')?.value||'').trim();
  if(gaState.query && currentQ && currentQ!==gaState.query){
    gaState.ai=null;
    box.innerHTML='<p class="ga-hint">Máš rozepsaný nový dotaz. Klikni na „Najít odpověď", aby se nezobrazovala stará odpověď.</p>';
    return;
  }
  const meta=gaStatusMeta(a.status);
  const evi=(a.evidence||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
  const body = (gaState.mode==='detailed')
    ? '<div class="ga-lbl">Podrobná odpověď</div><p class="ga-det">'+esc(a.detailed||a.simple||'(bez podrobností)')+'</p>'
    : '<div class="ga-lbl">Jednoduchá odpověď</div><p class="ga-simple">'+esc(a.simple)+'</p>';
  box.innerHTML='<div class="ga-card">'
    + '<span class="ga-status '+meta.cls+'">'+esc(meta.label)+'</span>'
    + '<span class="ga-aimark">✨ odpověď AI z popisu generátoru</span>'
    + body
    + (evi?'<details class="ga-evi"'+(gaState.mode==='detailed'?' open':'')+'><summary>Opora v generátoru</summary><ul>'+evi+'</ul></details>':'')
    + '</div>';
}
function gaSetMode(mode){
  gaState.mode = (mode==='detailed') ? 'detailed' : 'simple';
  document.querySelectorAll('.ga-mode-btn').forEach(b=>b.classList.toggle('active', b.getAttribute('data-mode')===gaState.mode));
  const currentQ=(document.getElementById('gaQuery')?.value||'').trim();
  if(gaState.ai && gaState.query && currentQ!==gaState.query){ gaState.ai=null; gaState.loading=false; }
  renderGeneratorAssistantAnswer();
}
function gaPlainAnswer(){
  const a=gaState.ai; if(!a) return '';
  const meta=gaStatusMeta(a.status);
  const lines=['Stav: '+meta.label.replace(/^\S+\s/,'')];
  if(gaState.mode==='detailed') lines.push('Podrobně: '+(a.detailed||a.simple||''));
  else lines.push('Jednoduše: '+a.simple);
  if(a.evidence&&a.evidence.length) lines.push('Opora v generátoru: '+a.evidence.join('; '));
  lines.push('(Odpověď vygenerovala AI z popisu funkcí generátoru.)');
  return lines.filter(Boolean).join('\n');
}
async function copyGeneratorAssistantAnswer(){
  if(!gaState.ai){ uiToast('Nejdřív najdi odpověď.','warn'); return; }
  const txt=gaPlainAnswer();
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(txt); }
    else { const tt=document.createElement('textarea'); tt.value=txt; document.body.appendChild(tt); tt.select(); document.execCommand('copy'); tt.remove(); }
    uiToast('Odpověď zkopírována.');
  }catch(_){ uiToast('Kopírování se nepodařilo — označ text ručně.','warn'); }
}
function gaClear(){
  const ta=document.getElementById('gaQuery'); if(ta) ta.value='';
  gaState.ai=null; gaState.query=''; gaState.loading=false;
  renderGeneratorAssistantAnswer();
  if(ta) ta.focus();
}
function gaOnQueryInput(){
  const ta=document.getElementById('gaQuery');
  const current=(ta&&ta.value?ta.value:'').trim();
  if(gaState.ai && current!==gaState.query){
    gaState.ai=null; gaState.loading=false;
    renderGeneratorAssistantAnswer();
  }
}

function closeGeneratorAssistant(){
  const b=document.getElementById('gaBackdrop'); if(b) b.remove();
  document.removeEventListener('keydown', gaKeyHandler);
}
function gaKeyHandler(e){ if(e.key==='Escape'){ if(document.activeElement && document.activeElement.id==='gaQuery'){ e.preventDefault(); return; } closeGeneratorAssistant(); } }
function openGeneratorAssistant(){
  if(document.getElementById('gaBackdrop')) return;
  gaState.ai=null; gaState.query=''; gaState.loading=false;
  const chips=GA_CHIPS.map(c=>'<button type="button" class="ga-chip" data-q="'+esc(c)+'">'+esc(c)+'</button>').join('');
  const bd=document.createElement('div');
  bd.id='gaBackdrop'; bd.className='ui-modal-backdrop'; bd.setAttribute('role','dialog'); bd.setAttribute('aria-modal','true'); bd.setAttribute('aria-label','Poradce ke generátoru');
  bd.innerHTML='<div class="ui-modal-box ga-box">'
    + '<div class="ga-head"><span>💬 Poradce ke generátoru</span><button type="button" class="ga-x" id="gaClose" aria-label="Zavřít">✕</button></div>'
    + '<div class="ga-desc">Zeptej se na cokoliv o funkcích, bezpečnosti nebo ovládání generátoru. Odpovídá AI, ale drží se jen toho, co generátor opravdu umí — když to v něm není, řekne to. (Vyžaduje Gemini klíč ve žluté sekci.)</div>'
    + '<textarea id="gaQuery" class="ga-input" rows="2" placeholder="Např. „Jak je řešen split screen?" nebo „Kde se ukládá API klíč?""></textarea>'
    + '<div class="ga-controls"><div class="ga-mode" role="group" aria-label="Úroveň odpovědi">'
      + '<button type="button" class="ga-mode-btn'+(gaState.mode==='simple'?' active':'')+'" data-mode="simple">Jednoduše</button>'
      + '<button type="button" class="ga-mode-btn'+(gaState.mode==='detailed'?' active':'')+'" data-mode="detailed">Podrobně</button></div>'
      + '<button type="button" class="ga-find" id="gaFind">🔎 Najít odpověď</button></div>'
    + '<div class="req-note">Poradce odpovídá přes AI — každý dotaz = 1 požadavek z aktivního limitu projektu.</div>'
    + '<div class="ga-chips" id="gaChips">'+chips+'</div>'
    + '<div class="ga-result" id="gaResult" aria-live="polite"><p class="ga-hint">Napiš dotaz a klikni na „Najít odpověď".</p></div>'
    + '<div class="ga-actions">'
      + '<button type="button" class="ga-act" id="gaCopy">📋 Zkopírovat odpověď</button>'
      + '<button type="button" class="ga-act" id="gaClearBtn">🧹 Vyčistit</button></div>'
    + '<div class="ga-foot">Odpovídá AI z popisu funkcí generátoru — když daná věc v generátoru není, řekne to. Posílá jen tvůj dotaz a popis funkcí; NEodesílá zdrojový kód, API klíč ani klíč odpovědí. Dotazy se nikam neukládají.</div>'
    + '</div>';
  document.body.appendChild(bd);
  // Poradce se zavírá jen křížkem nebo klávesou Escape mimo pole dotazu.
  // Kliknutí mimo okno se ignoruje, aby při mazání/psaní omylem nevyskočil ven.
  document.getElementById('gaClose').addEventListener('click',closeGeneratorAssistant);
  document.getElementById('gaFind').addEventListener('click',gaRunSearch);
  document.getElementById('gaCopy').addEventListener('click',copyGeneratorAssistantAnswer);
  document.getElementById('gaClearBtn').addEventListener('click',gaClear);
  bd.querySelectorAll('.ga-mode-btn').forEach(b=>b.addEventListener('click',()=>gaSetMode(b.getAttribute('data-mode'))));
  bd.querySelectorAll('.ga-chip').forEach(b=>b.addEventListener('click',()=>{ const ta=document.getElementById('gaQuery'); if(ta) ta.value=b.getAttribute('data-q'); gaRunSearch(); }));
  const ta=document.getElementById('gaQuery');
  ta.addEventListener('input',gaOnQueryInput);
  ta.addEventListener('keydown',e=>{ if((e.key==='Enter'&&(e.ctrlKey||e.metaKey))){ e.preventDefault(); gaRunSearch(); } });
  document.addEventListener('keydown', gaKeyHandler);
  setTimeout(()=>ta.focus(),0);
  try{ if(!gaState._verified){ gaState._verified=true; verifyGeneratorAssistantKB(); } }catch(_){}
}
// Dev kontrola driftu: ověří, že kódové „opory" (názvy funkcí foo(), KONSTANTY) z KB skutečně
// existují v aktuálním dokumentu. Jen do konzole; nehlásí kolegům. Volej window.verifyGeneratorAssistantKB().
function verifyGeneratorAssistantKB(){
  const src=document.documentElement ? document.documentElement.outerHTML : '';
  const miss=[];
  GENERATOR_ASSISTANT_KB.forEach(e=>{
    (e.evidence||[]).forEach(ev=>{
      const syms=(String(ev).match(/[A-Za-z_][\w]*\(\)|[A-Z][A-Z0-9_]{3,}/g)||[]);
      syms.forEach(sym=>{ const bare=sym.replace(/\(\)$/,''); if(src.indexOf(bare)<0) miss.push(e.id+' → '+sym); });
    });
  });
  if(miss.length) console.warn('[Generator Assistant] Opory bez nálezu v kódu (zkontroluj KB):', miss);
  else console.info('[Generator Assistant] KB integrita OK: všechny kódové opory nalezeny.');
  return miss;
}
if(typeof window!=='undefined'){ window.verifyGeneratorAssistantKB=verifyGeneratorAssistantKB; window.openGeneratorAssistant=openGeneratorAssistant; }
/* konec Generator Assistant */

function isSimpleMode(){ return (state.appMode || 'simple') !== 'advanced'; }
function randomChunk(chars){
  if (!(window.crypto && window.crypto.getRandomValues))
    throw new Error('WebCrypto není dostupné — generování bezpečného kódu/PINu selhalo.');
  const arr = new Uint32Array(chars);
  window.crypto.getRandomValues(arr);
  return Array.from(arr).map(n => (n % 36).toString(36).toUpperCase()).join('');
}
function fillSimpleSecrets(){
  if (!trim('ucitelPin')) setVal('ucitelPin', 'PIN-' + randomChunk(8));   // ≥8 znaků, silné
  if (!trim('heslo')) setVal('heslo', 'LOCK-' + randomChunk(8) + '-' + randomChunk(4)); // ≥12 znaků
  validate(); saveSnapshot();
  uiToast('Vygenerováno. PIN a odemykací heslo si před použitím testu poznamenej. Do historie ani šablon se neukládají.', 'warn', 5200);
}
function applySimpleDefaults(){
  if (!isSimpleMode()) return;
  state.testMode = 'bezny';
  state.layout = state.layout || 'tabs';
  state.resultMode = 'instant';
  state.odevzdavani = 'B';
  state.randomizace = 'NE';
  state.gradeTyp = 'skola';
  state.exerciseDetail = false;
  state.zolicek = 'NE';
  state.diferencovany = 'NE';
  state.anonymizace = 'ANO';
  state.overeni = 'NE';
  state.identityMode = 'name';
  state.fuzzyTolerance = 'off';
  state.screenGuard = false;
  if (!state.body || state.body <= 0) { state.body = 30; setVal('bodyCustom', 30); }
  // Aktivní jednoduchá šablona přebíjí tvrdé defaulty svými zamčenými hodnotami.
  // Tím může i v jednoduchém módu vzniknout např. offline/přísný test — volby jsou
  // ale schované, takže je učitel nevidí ani nemění (řídí je výhradně šablona).
  applySimpleTemplateLocks();
}
// Aplikuje zamčené hodnoty aktivní jednoduché šablony na state. Volá se z
// applySimpleDefaults (po defaultech). NEVOLÁ enforceModeConstraints — to běží
// buď jako volající (applySimpleDefaults je z něj volán), nebo navazuje samostatně;
// zavolání zde by způsobilo nekonečnou rekurzi.
function applySimpleTemplateLocks(){
  // Drží zamčené hodnoty šablony — voláno opakovaně z applySimpleDefaults.
  // Účinné jen v jednoduchém módu (v pokročilém se hodnoty nedrží, jsou volné).
  if (!isSimpleMode()) return;
  applyTemplateValues(state.simpleTemplate || '');
}
// Jednorázově zapíše hodnoty šablony do state. Funguje v OBOU režimech.
// V jednoduchém se pak volby skryjí, v pokročilém zůstanou viditelné a editovatelné.
function applyTemplateValues(id){
  const t = simpleTemplateById(id || '');
  if (!t) return;
  const L = t.locks || {};
  // screenGuard je „opt-in" prvek šablony. Před aplikací ho vynulujeme, aby
  // nezůstal viset z předchozí šablony — pokud ho nová šablona chce, locks ho zapne.
  state.screenGuard = false;
  for (const k in L){ if (Object.prototype.hasOwnProperty.call(L,k)) state[k] = L[k]; }
  ensureUnlockPasswordForGuard();
}
// Hlídání obrazovky potřebuje odemykací heslo učitele — bez něj by se zámek
// neaktivoval (jen by se zaznamenalo varování). Když je guard zapnutý a heslo
// prázdné, vygenerujeme čitelné heslo automaticky, ať guard funguje i v jednoduchém
// režimu bez nutnosti cokoli zadávat. Heslo se objeví v pokynech pro učitele.
function ensureUnlockPasswordForGuard(){
  if (!state.screenGuard) return;
  try {
    if (!trim('heslo')) {
      setVal('heslo', 'LOCK-' + randomChunk(8) + '-' + randomChunk(4));
    }
  } catch(_){}
}
function setAppMode(mode){
  if (mode === 'advanced') {
    state.appMode = 'advanced';
    state.workPreset = 'advanced';
    // Šablony jsou sjednocené napříč režimy — aktivní šablona zůstává i v pokročilém,
    // kde slouží jako odrazový můstek (předvyplní režim/hodnocení, ale volby jsou
    // viditelné a editovatelné). Nemažeme ji.
    if (!state.testMode) state.testMode = 'bezny';
    if (!state.resultMode) state.resultMode = 'instant';
    if (state.splitGenerate === undefined) state.splitGenerate = false;
    if (Array.isArray(state.exerciseConfig)) state.exerciseConfig.forEach(function(ex){ if (ex.manualMode === undefined) ex.manualMode = false; });
    if (!state.layout) state.layout = 'tabs';
    if (!state.odevzdavani) state.odevzdavani = 'B';
  } else {
    state.appMode = 'simple';
    state.workPreset = 'quick';
  }
  enforceModeConstraints();
  applyVisualState(); validate(); saveSnapshot();
}

