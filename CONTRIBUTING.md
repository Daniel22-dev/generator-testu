# Pravidla pro další úpravy

Tento dokument slouží jako stručný návod pro člověka i AI asistenta, který bude projekt upravovat.

## Základní pravidlo

Nejdřív zachovat funkčnost, až potom přidávat nové funkce.

Před každým commitem musí projít:

```bash
npm test
npm run test:headless
npm audit --audit-level=high
```

`npm test` zahrnuje kontrolu verzí, struktury modulů, citlivých údajů, ESLint, build a workflow matici. `npm run test:headless` samostatně ověřuje runtime, secure balík a Test Lab.

## Neměnit zbytečně architekturu

Projekt je záměrně jednoduchý:

- žádný React,
- žádný backend,
- žádný složitý bundler,
- jeden výsledný `dist/index.html`,
- PWA soubory v `public/`.

Velké technologické migrace dělat pouze po samostatném rozhodnutí.

## Práce s moduly

JS soubory v `src/js/` se skládají podle názvu. Prefixy nejsou kosmetika, ale určují pořadí běhu.

Při úpravách:

1. upravuj co nejmenší dotčený modul,
2. nepřesouvej funkce mezi moduly bez důvodu,
3. neměň prefix souboru bez kontroly závislostí,
4. bloky `13a…13g` a `14a…14d` nerozsekávej ani nespojuj bez samostatného důvodu,
5. po změně vždy spusť `npm test`.

## Verze

Při změně verze musí sedět:

- `package.json`,
- `src/js/01-core.js`,
- `public/sw.js`,
- `public/manifest.webmanifest`.

Kontrola verzí běží při buildu. Samostatně ji lze spustit:

```bash
npm run check:versions
```

Changelog v `RELEASE.changes` drží jen posledních 10 položek.

## Bezpečné vkládání HTML

Pozor na výstupy od uživatele a AI. Kdykoliv se text vkládá do HTML, musí být ošetřen escapováním.

Doporučení:

- pro čistý text používat `textContent`,
- při HTML stringu používat existující escape helper,
- nikdy nevkládat neověřený vstup přímo do `innerHTML`,
- u nových výstupů myslet na hodnoty jako `<script>`, `onerror=`, `</script>`.

## API klíče a citlivá data

Do repozitáře nikdy neukládat:

- API klíče,
- hesla,
- osobní údaje studentů,
- interní neveřejné dokumenty školy.

Repozitář může být veřejný kvůli GitHub Pages.

## Doporučený postup pro AI asistenta

Při zadávání úprav AI asistentovi používat tento postup:

1. popsat problém a očekávané chování,
2. určit konkrétní soubor/modul,
3. zakázat plošné přepisování celé aplikace,
4. požadovat minimální diff,
5. požadovat spuštění `npm test`,
6. nechat vypsat změněné soubory.

## Co nedělat bez samostatného schválení

Bez jasného rozhodnutí nedělat:

- přepis do Reactu,
- migraci na TypeScript,
- zavedení backendu,
- změnu systému access gate,
- změnu formátu studentských výstupů nebo hashovacího schématu rosteru,
- odstranění offline verifieru,
- spojení rozdělených modulů `13a…13g` / `14a…14d` zpět do monolitu,
- velké dělení modulů bez průběžných testů.
