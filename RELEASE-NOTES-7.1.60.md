# Release notes – 7.1.60

Datum: 2026-09-30

## Shrnutí

Verze 7.1.60 dokončuje poslední předserverovou etapu Generátoru interaktivních testů. Hlavní změnou je provozní model **jeden univerzální Google Form + jeden celoroční Response Sheet**, ze kterého si teacher verifier konkrétního testu umí bez ručního filtrování vybrat pouze kryptograficky platná odevzdání pro své Test ID.

Individuální studentské one-time kódy, `SECURE-ANSWERS-V1`, `answers.txt` fallback a teacher verifier jako jediná autorita hodnocení zůstávají zachovány.

## Google Forms metadata

- Přidáno jednorázové nastavení metadata polí pomocí standardního předvyplněného Google Forms odkazu.
- Učitel nemusí ručně hledat `entry.123456789`; Generátor potřebná entry ID bezpečně odvodí z placeholderů.
- Povinně se podporují:
  - Test ID,
  - název testu,
  - skupina / třída.
- Volitelně lze předávat:
  - verzi Generátoru,
  - datum generování.
- Neplatný host, špatná URL, chybějící povinný placeholder nebo neplatné entry ID jsou odmítnuty fail-closed.

## Studentský workflow

Po dokončení secure testu student stále:
1. klikne na Odevzdat;
2. získá celý `SECURE-ANSWERS-V1`;
3. zkopíruje secure submission;
4. otevře formulář;
5. vloží secure submission;
6. odešle Form.

Test ID, název testu a skupina se při nakonfigurovaných metadata polích předvyplní automaticky. Student je nemusí opisovat.

Pokud metadata konfigurace není nastavena, pokračuje dosavadní Google Forms workflow. `answers.txt` zůstává funkční nouzová cesta.

## Teacher verifier – celý školní rok v jednom CSV

Verifier nově umí přijmout nezměněný CSV export společného Response Sheetu obsahujícího více testů a skupin.

- Payloady aktuálního testu jsou identifikovány kryptograficky.
- Odevzdání jiných Test ID jsou klasifikována jako „jiné testy“ a nevstupují do výsledků.
- Poškozené nebo neplatné payloady jsou odděleně hlášeny.
- Google Forms metadata nejsou bezpečnostní autorita.
- Pokud se metadata neshodují s ověřeným payloadem, verifier ukáže **METADATA MISMATCH**, ale nepřepíše kryptograficky ověřenou identitu testu.
- Pozměněný vnější `SECURE-ANSWERS-V1` envelope je odmítnut fail-closed.

## Duplicity a více pokusů

- Identický secure payload odevzdaný vícekrát je označen jako identická duplicita a do výsledku se započítává jednou.
- Pokud má stejný student dva různé validní pokusy stejného testu, verifier žádný nevybere potichu.
- Učitel musí explicitně určit, který pokus použije.
- Analytika a výsledkový export pracují jen s efektivními, deduplikovanými a případně explicitně vybranými výsledky.

## Exporty

Přidány dvě jasně oddělené cesty:

### Export výsledků tohoto testu
Obsahuje pouze efektivní výsledky aktuálního testu, včetně dostupného verified e-mailu, studentského kódu, bodů, procent, známky a relevantních security/status informací.

### Export odevzdání tohoto testu
Obsahuje pouze kryptograficky ověřená submissions patřící aktuálnímu testu, včetně timestampu, verified e-mailu, provozních metadata a secure submission evidence.

Výsledky jiných testů se do těchto exportů nepřenášejí.

## Výkon a dlouhodobý provoz

Přidány benchmarky pro 100 / 1 000 / 3 000 / 5 000 odevzdání.

Reálný Chromium E2E test se skutečným verifierem a WebCrypto naměřil přibližně:
- 100 řádků: 1,43 s;
- 1 000 řádků: 14,53 s;
- 3 000 řádků: 38,40 s;
- 5 000 řádků: 67,27 s.

Import průběžně uvolňuje event loop a zobrazuje progress, takže UI při dlouhém importu nezůstává trvale zamrzlé.

## Build a výkonové rozpočty

Nová funkcionalita původně překročila stávající performance budgets. Limity nebyly zvýšeny.

Build byl upraven tak, aby bezpečně kompaktoval zbytečný JavaScript whitespace při zachování významných zalomení řádků. Finální kandidát se znovu vejde do původních limitů.

## Bezpečnost

Zachováno / ověřeno:
- answer key není publikován ve studentském souboru;
- teacher private key zůstává pouze v teacher verifieru;
- RSA-OAEP, AES-GCM a WebCrypto nebyly oslabeny;
- CSP a stávající GARP / P5 kontroly zůstávají aktivní;
- Forms metadata nejsou důvěryhodný zdroj výsledku;
- poškozený ciphertext a nekonzistentní secure envelope jsou odmítnuty;
- nevznikl nový studentský secret;
- výsledky se neukládají na GitHub;
- nebyl přidán nový backend ani databáze;
- teacher verifier se nestal součástí studentského buildu.

## QA

Před version bumpem prošly:
- P5 R2 pre-production release gate;
- Workflow Journeys E2E;
- journey / state-transition / feature / integration / identity / wizard suites;
- GARP 2.7 foundation a legacy regressions;
- AI assurance fingerprint check;
- browser E2E pro full-year Forms workflow.

Finální 7.1.60 release kandidát musí po synchronizaci verze projít stejnými gatey znovu.

## Dokumentace

Přidány:
- `docs/GIT-TEACHER-FORMS-WORKFLOW.md`
- `docs/GIT-LIVE-CLASSROOM-ACCEPTANCE-TEST.md`
- `docs/GIT-PRE-SERVER-FINAL-AUDIT.md`

Live classroom pilot zůstává samostatným provozním acceptance krokem a automatické QA jej nenahrazuje.
