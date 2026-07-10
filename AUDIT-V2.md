# Hloubkový audit č. 2 – Generátor interaktivních testů 7.0.0

Datum auditu: 10. 7. 2026  
Rozsah: design, obsah, funkce, soukromí, bezpečnost, přístupnost, build, dokumentace a připravenost k nasazení.  
Mimo rozsah: školní server, SSO, databáze a serverová správa API klíče.

## Konečný verdikt

Po provedených opravách je aplikace **technicky připravena stát se oficiálním řízeným nástrojem gymnázia v rozsahu serverless provozu**. Nejde již o pouhou pilotní technickou verzi.

Tento verdikt znamená, že zdroj, build, hlavní funkční scénáře, ochrany dat a provozní dokumentace dosáhly produkční úrovně pro používání proškolenými učiteli. Neznamená automatické formální schválení vedením školy a nenahrazuje organizační rozhodnutí o odpovědnosti, ukládání výsledků a budoucí serverové etapě.

## Celkové hodnocení

### Design a UX

**Pozitiva**

- výrazná a konzistentní vizuální identita vlajkové aplikace,
- srozumitelný průvodce krok za krokem,
- jednoduchý a pokročilý režim pro různé typy uživatelů,
- responzivní rozhraní a PWA instalace,
- kvalitní náhled, editor a diagnostické obrazovky,
- přístupné názvy ikonových tlačítek, viditelný fokus a opravený kontrast.

**Opravené nedostatky**

- chybějící ARIA role a dynamická hodnota průběhu,
- nedostatečný kontrast pomocných textů,
- přetížená hlavička na velmi úzkých displejích,
- nekonzistentní přístupnost ikonových ovladačů.

Výsledek automatizovaného průchodu hlavního scénáře v Chromiu: **0 porušení WCAG A/AA**.

### Obsah a pedagogická použitelnost

**Pozitiva**

- široký výběr uzavřených, produktivních i komplexních typů úloh,
- samostatný modul českého jazyka,
- diferenciace, více variant a podpůrná opatření,
- okamžitá zpětná vazba i bezpečný klasifikovaný režim,
- didaktická kontrola, self-test bodování a možnost ruční opravy,
- export zadání mezi kolegy a pedagogické šablony.

**Nalezený problém**

Interní poradce obsahoval zastaralé návody: neexistující skupinové PINy, tvrzení o čitelném `answers.txt`, automatickém obnovení rozpracovaného pokusu, nesprávném obsahu šablon a staré struktuře GitHub nasazení.

**Oprava**

Bylo přepsáno 34 klíčových znalostních položek podle skutečného chování 7.0.0. Poradce nyní otevřeně popisuje také limity serverless verze, rozdíl mezi organizační access gate a autentizací, šifrované odevzdání, hashovaný roster a ztrátu rozpracovaného pokusu po reloadu.

### Funkční stránka

**Pozitiva**

- modulární zdroj a deterministický build do jednoho HTML,
- stabilní generování přes Gemini s validací a opravou JSON,
- hybridní generování složitých typů úloh,
- bezpečný offline balík student + verifier,
- šifrované odevzdání a hromadné vyhodnocení,
- PWA cache, GitHub Actions, ESLint a regresní testy,
- interní Test Lab s výsledkem 25 PASS / 2 WARN / 0 FAIL.

**Opravené chyby**

- aktualizace výchozích modelů a migrace starých názvů,
- odstranění zavádějících pevných údajů o API kvótách,
- ověření skutečného Gemini request kontraktu v testu,
- doplnění chybějícího `identityMode` do výstupní konfigurace,
- odmítnutí neznámého diferenciačního identifikátoru místo tichého přidělení výchozí varianty.

## Kritická zjištění v ochraně soukromí

### 1. Skutečná jména mohla odejít do Gemini

Původní verze umožňovala při volbě `anonymizace = NE` vložit skutečná jména studentů z diferenciačních skupin přímo do promptu, přestože nápověda budila dojem, že se jména neposílají.

**Oprava 7.0.0**

- nebezpečná volba byla odstraněna z UI,
- `buildDiffBlock()` vždy používá `Student A1`, `Student A2` atd.,
- staré uložené nastavení se migruje na bezpečný režim,
- historie a snapshoty ukládají pouze pseudonymy,
- přidán regresní test se záměrně vloženými jmény,
- před prvním AI požadavkem se zobrazuje informace o přenosu dat.

### 2. Studentský HTML obsahoval čitelný roster

Druhé kritické zjištění bylo závažnější pro distribuované soubory: diferencovaný studentský HTML obsahoval čitelný seznam všech jmen nebo kódů a jejich příslušnost ke skupinám.

**Oprava 7.0.0**

- při exportu vznikne náhodná sůl konkrétního testu,
- každý identifikátor je převeden na SHA-256 base64url otisk,
- studentský runtime pracuje pouze s `studentHashes`,
- secure i instant režim používají stejný doménově oddělený hashovací postup,
- veřejný výstup neobsahuje čitelný roster,
- neplatný identifikátor je odmítnut,
- produkční a headless testy hlídají návrat této chyby.

**Zbytkové riziko:** veřejná sůl nebrání slovníkovému zkoušení běžných jmen. Pro ostré testy se proto musí používat náhodné jednorázové kódy.

## Automatické ověření

Úspěšně prošly:

- kontrola jednotné verze,
- produkční invariants,
- kontrola struktury modulů,
- kontrola veřejného manifestu,
- ESLint,
- produkční build,
- headless boot bez JS chyb,
- pseudonymizace promptu,
- hashovaný výstupní roster,
- Gemini model/URL/header kontrakt,
- PWA soubory,
- bezpečné vložení JSON,
- secureOffline studentský a učitelský balík,
- všech sedm jednoduchých šablon,
- interní Test Lab 25 PASS / 2 WARN / 0 FAIL,
- audit přístupnosti hlavního scénáře: 0 WCAG A/AA porušení,
- audit závislostí bez high/critical nálezu.

## Zbývající omezení

Nejde o chyby blokující současné řízené nasazení, ale o známé hranice:

1. klientská access gate není neobejitelná autentizace;
2. Gemini API klíč pracuje v prohlížeči;
3. již stažený test nebo verifier nelze vzdáleně zneplatnit;
4. AI může vytvořit obsahovou chybu a každý test musí zkontrolovat učitel;
5. přísný režim omezuje běžné obcházení, ale neposkytuje absolutní ochranu;
6. rozpracovaný pokus se po reloadu nebo pádu plně neobnoví;
7. dostupnost generování závisí na externí službě a limitech projektu;
8. výsledky vyžadují školou určené bezpečné úložiště a retenční pravidla.

## Podmínky oficiálního používání

1. vedení školy určí účel a odpovědnou osobu;
2. uživatelé přijmou `PROVOZNI-PRAVIDLA.md`;
3. učitelé budou proškoleni v kontrole AI výstupů, jednorázových kódech a práci s verifierem;
4. před každým vydáním projde `npm test`, audit závislostí a release checklist;
5. pro klasifikované testy bude existovat postup pro technický incident a bezpečné ukládání výsledků;
6. serverová etapa bude později posouzena samostatně se školním IT.

## Doporučení k nasazení

Verzi 7.0.0 lze nasadit jako **řízený produkční nástroj pro proškolené učitele**. Doporučené označení v komunikaci není „pilot“, ale „produkční serverless verze s vymezenými provozními pravidly“. První školní nasazení má být organizačně kontrolované, nikoli proto, že by šlo o nedokončený software, ale proto, že škola musí sjednotit odpovědnosti, práci s API klíči a ukládání výsledků.
