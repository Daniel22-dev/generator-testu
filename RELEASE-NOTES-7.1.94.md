# GIT 7.1.94 — candidate

Patch release navazující na 7.1.93.

## Hlavní změny

- Reading comprehension používá srozumitelnější terminologii pro zdroj textu a práci AI s podkladem.
- UI výslovně vysvětluje, že student u aktuálního Reading comprehension vybírá odpověď z nabízených možností.
- AI posudek vhodnosti cvičení je přehlednější a jasně se vztahuje na celou vybranou sadu cvičení.
- Učitelský náhled testu je oddělen od studentského tab-locku a persistence pokusu; ostrý studentský secure runtime zůstává fail-closed.
- Ověření Google Forms je přesunuto z běžného výsledkového workflow do panelu Bezpečnost; ve Výsledcích zůstává pouze stav a rychlý vstup do nastavení.
- Historické a matoucí texty o starém Apps Scriptu a pokročilé změně seznamu kódů byly z běžného workflow odstraněny.
- E2E, E3 a E8 browser/security harnessy byly sjednoceny s novým Forms workflow.
- P5 performance budgety zůstaly beze změny; nové UX bylo zkompaktováno tak, aby release limity splnil bez jejich zvýšení.

## Nasazení

Verze musí projít chráněným postupem `candidate → P5 / journey-e2e / Safe Promotion → main → GitHub Pages`.

Fyzické testování na školních zařízeních zůstává samostatnou akceptační fází.
