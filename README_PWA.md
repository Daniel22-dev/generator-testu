# PWA pro Generátor interaktivních testů

Tato verze doplňuje instalovatelnou PWA vrstvu.

## Co je součástí

- `public/manifest.webmanifest` – název, barvy, ikony a režim `standalone`
- `public/sw.js` – verzovaný service worker s cache `6.11.69`
- `public/icons/` – ikony 32–512 px, Apple ikona a maskable ikona pro Android
- `scripts/build.mjs` – při buildu kopíruje `public/` do `dist/`
- `src/index.html` – odkazuje na manifest, ikony a registruje service worker

## Test po nasazení

1. Nahraj obsah složky repozitáře na GitHub.
2. Počkej, až doběhne GitHub Actions workflow.
3. Otevři GitHub Pages adresu generátoru.
4. Na Androidu v Chromu zvol `⋮ → Přidat na plochu` nebo `Instalovat aplikaci`.
5. Pokud se ukáže stará ikona, smaž starého zástupce a otevři aplikaci s parametrem `?v=6.11.69`.

## Poznámka ke cache

Service worker používá network-first strategii pro hlavní stránku a `access-manifest.json`, aby se kolegům po aktualizaci nedržela stará oprávnění ani stará verze aplikace. Statické ikony a manifest se ukládají do cache pro rychlé spuštění.
