# Release notes — Generátor testů 7.1.30

Datum: 2026-09-15

## Etapa 2 — Bezpečnost pracoviště mimo běžný workflow

Tato verze navazuje na kandidát Etapy 1 (7.1.29) a mění pouze způsob obsluhy týmového bezpečnostního kódu. Kryptografický význam kódu, secure balík, teacher verifier, formát výsledků, učitelský PIN, odemykací heslo, Google Forms ani školní serverový profil se nemění.

### Změny
- Týmový bezpečnostní kód už není editovatelným polem v kroku **Doplňky**.
- V horní liště přibylo **⚙️ Nastavení Generátoru** se sekcí **Bezpečnost pracoviště**.
- Učitel vloží týmový kód jednou; na vlastním zařízení jej může vědomě uložit do lokálního úložiště stejně jako dosud.
- Secure/joker workflow v kroku Doplňky zobrazuje pouze stav **Bezpečnost pracoviště nastavena / nenastavena** a odkaz do Nastavení.
- Uložený týmový kód se automaticky načte po startu aplikace a znovu se obnoví po importu zadání, načtení staré plné šablony nebo historie.
- Admin může v Nastavení nadále vygenerovat nový týmový kód a zkopírovat jej pro kolegy; běžný učitel jej pouze vloží a případně uloží na svém zařízení.
- Validace při chybějícím povinném kódu nyní odkazuje přímo na **⚙️ Nastavení → Bezpečnost pracoviště**.
- Přidány regresní kontroly přesunu kódu mimo workflow, stavu pracoviště, synchronizace Nastavení → runtime a automatického obnovení uloženého kódu.

## Bezpečnostní hranice etapy
- Hodnota `bezpKod` zůstává citlivá a není součástí snapshotů, šablon, historie ani exportu zadání.
- XSS sink baseline se nesmí zvýšit.
- Performance budget se nesmí zvýšit.
- Neproběhla změna kryptografického formátu, verifieru, `answers.txt`, PIN/odemknutí, Google Forms ani serverové autentizace.

7.1.30 je source kandidát. GitHub `main` byl při přípravě této etapy stále na 7.1.28; 7.1.29 tedy nebyla samostatně CI potvrzena. Produkční označení 7.1.30 vyžaduje čistý GitHub CI průchod z exact lockfile a tím současně ověří změny Etapy 1 i Etapy 2.
