# Generátor testů 7.1.73 — iPadOS klávesnice + workflow Verifieru

Datum: 2026-10-02

## iPadOS / WebKit

- Přísný studentský runtime i rychlý interaktivní runtime rozlišují typický falešný `window.blur`, který na iPadOS vzniká při zavření softwarové klávesnice jejím systémovým tlačítkem.
- Výjimka je záměrně úzká: platí pouze na iPadOS, pouze když dokument zůstává `visible` a pouze krátce po práci v editovatelném poli nebo změně `visualViewport`.
- Skutečné opuštění přes `visibilitychange=hidden`, `pagehide`, `beforeunload` a stávající split-screen monitoring zůstávají beze změny. Událost potlačeného falešného blur se zapisuje jako `keyboard-dismiss-ios`.

## Teacher Verifier — import výsledků

- Google Forms CSV je nyní zobrazen jako první a doporučená cesta.
- CSV lze přetáhnout do samostatné dropzóny nebo vybrat souborovým dialogem.
- Rozhraní výslovně upozorňuje, že pokud se export stáhne jako ZIP, je třeba ho nejdříve rozbalit; `.csv` není nutné otevírat ani převádět v Excelu a ikona/asociace souboru ve Windows není pro Verifier podstatná.
- `answers.txt` / vložený blok `SECURE-ANSWERS-V1` je přesunut do druhé, rozbalovací nouzové sekce.

## Viditelná zpětná vazba

- Po úspěšném importu Google Forms CSV se zobrazí potvrzení s počtem načtených platných výsledků.
- Nouzový import dává potvrzení nebo konkrétní upozornění i při prázdném vstupu.
- Textové/CSV exporty po spuštění stažení zobrazí potvrzovací toast s názvem souboru. Přímý PDF export si zachovává vlastní stavové hlášky.

## Regresní ochrana

- Přidán `scripts/check-runtime-ux-regressions.mjs` a zapojen do hlavního `npm test`.
- Kontrola hlídá iPadOS podmínky, zachování fail-closed cest, pořadí importů ve Verifieru, ZIP/CSV nápovědu a viditelnou odezvu importních/exportních akcí.

## Hranice změn

Scoring, kryptografie, formát odpovědí, vyhodnocovací algoritmus a bezpečnostní politika skutečného opuštění testu se nemění. Specifické chování iPadOS/WebKit je vhodné po nasazení potvrdit krátkým smoke testem na fyzickém iPadu.
