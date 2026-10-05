# GIT 7.1.90 – opravy cíleného auditu před studentským testováním

Vychází z 7.1.89 a zachovává rozsah řízené studentské red-team zkoušky.

## Opravy
- Úlohy s mezerou ___ (word formation, sentence/key word transformation): doplnění i celá věta. Bez mezery zůstává nutná přesná odpověď. Error correction nadále uznává celou větu nebo přesný změněný úsek.
- Randomizace: stabilní pořadí po obnovení stránky, verifier dopočítá číslo otázky u studenta bez změny formátu odevzdání, slova u error-tagging se nemíchají, zpětná vazba okamžitého testu je v pořadí studenta.
- Výsledky: typ cvičení a navigace „Vyberte studenta ▼“ ve feedback HTML, archivu a verifieru.
- iOS/iPadOS: cílená výjimka pro softwarovou klávesnici, fullscreen/split heuristiky a měřená ztráta fokusu; skutečné visibility/pagehide odchody zůstávají aktivní.
- Studenti: pokyn zapnout Nerušit / Soustředění ve čtyřech jazycích.

## Ověření
Nové změny mají samostatné regresní kontrakty pro produktivní odpovědi a randomizaci/číslování. Přesný SHA musí znovu projít kompletním GitHub CI.

## Omezení
Plovoucí oznámení webová aplikace nevidí. Krátké iOS focus změny po práci s klávesnicí jsou záměrně tolerované a auditované. Fyzické iPhone/iPad/Android testy zůstávají povinnou manuální bránou; emulace není důkaz chování reálného zařízení.
