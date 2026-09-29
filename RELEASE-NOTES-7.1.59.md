# Generátor testů 7.1.59 — workflow / user-journey audit

Datum: 2026-09-29

Cíl: běžný učitel projde od prázdného formuláře až po ověřený a předaný test bez hádání.

## Opraveno (učitel)

- Krok „Doplňky“ vysvětluje, proč nejde pokračovat (chybějící jméno pro učitelský mód); pole už není předvyplněné jménem autora.
- Druhý pohled AI: rozdíly klíče se rozhodují po položkách, výsledek rozhodnutí zůstává vidět, nevyřešené rozdíly nezmizí po jiné úpravě; krok 4 už nenabízí plošné „ponechávám“.
- Neúplná AI kontrola klíče se nevydává za hotovou a vypíše neověřené položky.
- Self-test po změně testu říká, proč už neplatí; učitelská kontrola téhož testu zůstává potvrzená.
- Neúspěšné nové generování zachová původní test i jeho kontroly; nahrazení hotového testu vyžaduje potvrzení.
- Každá chyba AI má řádek „Co dál“ podle HTTP/technického kódu.
- Změna nastavení po vygenerování (body, čas, stupnice, učitelský kód…) je vidět u stažení a jde použít bez nového AI generování.
- Krok 4 u testu se zámkem vysvětluje, jak zamčený test odemknout.
- Návrhy dalších přijatelných odpovědí jsou čitelné a po změně testu přestanou jít použít.

## Opraveno (student)

- Test s identitou „jméno“ žádá jméno a příjmení, ne „kód (např. A1)“.
- Bez Google Forms je answers.txt označen jako odevzdání, ne jako nouzová záloha.
- Zkratka bodů, zpětná vazba procvičování a názvy záložek odpovídají jazyku testu.

## Bezpečnost, výkon a QA

- Brána stažení je přísnější: nevyřešené rozdíly klíče nejde obejít.
- Odstraněno 12 nedosažitelných funkcí (starý účtový modal, nevolaný onboarding); performance budget se nezvyšuje.
- Nová klikací sada audit/tests/journey_suite.py (16 cest) a workflow journey-e2e.yml.
- GARP 2.7 trust anchor, AI assurance fingerprint a CycloneDX SBOM obnoveny pro 7.1.59.
