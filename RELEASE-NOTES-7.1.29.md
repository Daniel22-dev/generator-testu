# Release notes — Generátor testů 7.1.29

Datum: 2026-09-15

## Etapa 1 — skutečně jednoduchý režim

Tato verze zavádí pouze první etapu zjednodušení workflow nad zeleným baseline 7.1.28. Nemění verifier, kryptografii, učitelský PIN/odemykací mechanismus, Google Forms ani školní serverový profil.

### Změny
- Jednoduchý režim je přejmenován na **Jednoduché nastavení** a nabízí právě tři pedagogické účely: **Procvičování / Běžný test / Přísný test**.
- Učitel v jednoduchém nastavení nevybírá technickou šablonu; režim, zpětná vazba a bezpečnostní chování se odvodí automaticky z účelu.
- **Procvičování** používá existující procvičovací preset s okamžitým výsledkem a učící zpětnou vazbou.
- **Běžný test** zachovává dosavadní jednoduchý výchozí profil (běžný režim, okamžitý výsledek, stručná zpětná vazba, bez screen locku). Etapa 1 tím nemění výsledkový kanál ani verifier workflow.
- **Přísný test** používá existující strict preset s bezpečným offline verifierem a zámkem při opuštění.
- Přepnutí jazykové sady zachová pedagogický účel a přemapuje jej na odpovídající interní preset.
- Pokročilý režim zachovává původní plnou sadu šablon a ruční nastavení.
- Opravena deterministická obnova standardního Simple profilu: po návratu z procvičování se `feedbackMode` vždy vrátí na `brief` a nemůže zůstat skrytě zděděný z předchozí volby.
- Přidány regresní kontroly tří účelů, přepnutí jazykové sady a zachování Advanced šablon.

## Bezpečnostní hranice etapy
- XSS sink baseline se nesmí zvyšovat.
- Performance budget se nesmí zvyšovat.
- Žádný nový PIN, heslo, kryptografický formát ani transport výsledků.
- Žádná změna `teacher_verifier.html`, `answers.txt`, Google Forms nebo serverové autentizace.

7.1.29 je source kandidát. Produkční baseline zůstává 7.1.28 do čistého GitHub CI průchodu 7.1.29.
