# generator-testu

Generátor interaktivních testů pro učitele. Výstupem je vždy **jeden offline HTML soubor** (žádné CDN, žádné externí knihovny) nasazovaný přes GitHub Actions na GitHub Pages.

## Struktura zdroje (od 6.12.0 — modulární)

- `src/shell.html` — kostra stránky s placeholdery `{{STYLES}}`, `{{JS_MAIN}}`, `{{JS_CS}}`, `{{JS_PWA}}`; obsahuje i celé statické HTML těla
- `src/styles.css` — kompletní CSS
- `src/js/01-core.js … 16-access.js` — hlavní logika po doménách; **pořadí = číselný prefix, nikdy nepřehazovat**
- `src/js/50-cs-module.js` — modul Český jazyk (skládá se až po hlavním bloku — monkey-patchuje jeho funkce)
- `src/js/60-pwa.js` — registrace service workeru
- `src/access-manifest.json` — přístupy proškolených učitelů
- `public/` — PWA (manifest, sw.js, ikony)
- `archive/index-v6.11.70.html` — původní jednosouborový zdroj (referenční)

Verze a changelog aplikace žijí v `src/js/01-core.js` (`const RELEASE`). Při každé změně: bump SemVer + záznam do `RELEASE.changes` (newest first, max 10) + stejná verze v `package.json`, `public/sw.js` (`CACHE_NAME`) a `public/manifest.webmanifest` (`start_url`).

## Build a kontrola

```bash
node scripts/build.mjs        # složí dist/index.html čistou konkatenací modulů
npm i -D jsdom                # jednorázově (jen lokálně/CI, do dist se nic nedostane)
npm test                      # build + headless kontrola (Test Lab musí být 25 pass / 0 fail)
```

Mapa modulů a pravidla pro vlákna AI asistentů: viz `PLAN-MODULARIZACE.md`.

## PWA instalace

PWA vrstva (od 6.11.69): manifest, service worker s verzovanou cache a network-first strategií pro hlavní stránku a `access-manifest.json`. V Chrome na Androidu **⋮ → Přidat na plochu / Instalovat aplikaci**.
