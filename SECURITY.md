# Bezpečnostní hranice serverless verze

Generátor interaktivních testů 7.0.4 běží jako klientská PWA bez školního serveru. Je technicky připraven k řízenému oficiálnímu používání učiteli, ale jeho bezpečnostní model má jasné hranice.

## Ochrany, které aplikace poskytuje

- povinné nahrazování identit studentů v AI promptu anonymními kódy,
- automatickou migraci starého nebezpečného nastavení anonymizace,
- upozornění před prvním odesláním dat do Gemini v každé relaci,
- hashovaný diferenciační roster ve studentském HTML,
- odmítnutí neznámého identifikátoru místo přidělení výchozí varianty,
- oddělení studentského výstupu a učitelského verifieru,
- odstranění správných odpovědí ze studentské části bezpečného offline balíku,
- hybridní šifrování odevzdání `answers.txt` pomocí AES-GCM a RSA-OAEP,
- kryptografické hashe výstupních souborů,
- lokální přístupovou bránu pro učitele,
- verzovaný PWA cache systém,
- automatické kontroly před nasazením.

## Identity v diferenciaci

Před odesláním do AI jsou identity nahrazeny kódy `Student A1`, `Student A2` atd. Skutečné hodnoty se neukládají do promptu, šablon ani historie.

Při sestavení studentského souboru vznikne pro každý identifikátor SHA-256 otisk s náhodnou solí konkrétního testu. Veřejný soubor proto neobsahuje čitelný seznam studentů nebo kódů. Protože sůl musí být ve studentském souboru, běžná jména lze teoreticky zkoušet slovníkovým útokem. Pro ostré diferencované testy se proto používají náhodné jednorázové kódy, nikoli jména.

Učitelský verifier může obsahovat privátní mapování a správné odpovědi. Nikdy se nezveřejňuje ani neposílá studentům.

## Data odesílaná do Gemini

Při generování mohou být do externí AI služby odeslány:

- texty vyplněné v generátoru,
- obsah promptu sestavený aplikací,
- pedagogické podmínky skupin,
- zvolené URL,
- přiložené soubory nebo jejich zpracovaný obsah.

Generátor neumí spolehlivě rozpoznat a odstranit osobní nebo citlivé údaje vložené do volného textu, URL, popisu podpůrných opatření či příloh.

Proto je zakázáno odesílat zejména:

- zdravotní a psychologické údaje nebo diagnózy,
- kázeňské záznamy,
- rodná čísla, adresy a kontaktní údaje,
- individuální hodnocení propojené s identitou studenta,
- neveřejné dokumenty školy bez oprávnění k externímu zpracování.

Podmínky skupin se formulují obecně jako pedagogická potřeba, například „kratší instrukce“ nebo „více opory“, nikoli jako diagnóza.

## API klíč

API klíč pracuje v prohlížeči uživatele. V současné architektuře jej nelze chránit stejně jako klíč uložený na serveru.

Provozní pravidla:

- každý učitel používá vlastní oprávněný a omezený klíč,
- klíč se mezi kolegy nesdílí,
- klíč se nikdy neukládá do GitHubu, testu ani studentského výstupu,
- na sdíleném zařízení se používá pouze uložení pro relaci,
- po práci se citlivé údaje vymažou,
- při podezření na únik se klíč okamžitě zruší a nahradí,
- API klíč se nikdy nepředává studentům.

## Přístupová brána

Lokální access gate omezuje běžný přístup a podporuje správu učitelských profilů. Aktivační kód a místní PIN se ukládají jen jako solené PBKDF2 otisky. Admin pracuje s lokální pracovní kopií manifestu; změna začne platit až po exportu a nasazení nového `access-manifest.json`.

Protože je však brána implementována v klientském kódu, technicky zdatný uživatel ji může analyzovat nebo obejít. Access gate tedy není:

- školní jednotné přihlášení,
- serverově ověřená identita,
- neobejitelná autorizace rolí,
- centrální auditní systém.

Je vhodná jako organizační bariéra pro řízený okruh učitelů, nikoli jako ochrana vysoce citlivých informací.

## Výsledky studentů

`answers.txt` je v bezpečném režimu šifrovaný. Po dešifrování ve verifieru však obsahuje identitu nebo kód studenta, odpovědi, časy a bezpečnostní události. Učitel s ním zachází jako se školní dokumentací:

- ukládá jej pouze na oprávněné místo,
- nesdílí jej veřejným odkazem,
- neodesílá jej do AI bez anonymizace,
- chrání odpovídající `teacher_verifier.html`,
- po uplynutí účelu jej odstraní podle pravidel školy.

Rozpracované odpovědi se v aktuální verzi plně neobnovují po zavření nebo reloadu stránky. U klasifikovaného testu musí existovat předem oznámený náhradní postup.

## Veřejný repozitář

Repozitář může být veřejný kvůli GitHub Pages. Nesmí obsahovat:

- skutečné API klíče nebo hesla,
- osobní údaje studentů či zaměstnanců,
- interní neveřejné dokumenty školy,
- ostré seznamy uživatelů s identifikačními údaji,
- vyplněné testy nebo výsledky studentů,
- `teacher_verifier.html` z reálného testu.

Kontrola veřejného manifestu probíhá příkazem:

```bash
npm run check:sensitive
```

## Bezpečnostní incident

Při úniku:

1. **student_test.html** – odstranit veřejný odkaz a vytvořit nový test/Test ID;
2. **teacher_verifier.html** – považovat správné odpovědi a privátní klíč za kompromitované a vygenerovat nový pár souborů;
3. **aktivačního kódu** – otočit kód, exportovat a nasadit nový manifest;
4. **Gemini API klíče** – klíč okamžitě zneplatnit, vytvořit nový omezený klíč a zkontrolovat využití;
5. **osobních údajů** – informovat správce a postupovat podle školních pravidel pro incidenty.

Již stažený serverless HTML soubor nelze vzdáleně zneplatnit.

## Hranice tohoto auditu

Audit verze 7.0.4 neposuzuje budoucí školní server, SSO, databázi ani serverovou proxy pro API. Tyto části musí projít samostatným návrhem a kontrolou školního IT.
