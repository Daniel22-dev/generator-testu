# generator-testu-next

## PWA instalace

Verze 6.11.69 přidává plnohodnotnou PWA vrstvu pro instalaci Generátoru interaktivních testů na mobil nebo tablet.

- hlavní aplikace: `src/index.html`
- PWA soubory: `public/manifest.webmanifest`, `public/sw.js`, `public/icons/`
- build kopíruje `public/` do `dist/`, takže GitHub Pages nasazuje i manifest, service worker a ikony
- ikona je navržena jako vlajková školní aplikace: testový list, kontrolní symbol a AI/uzlový motiv

Po nahrání změn na GitHub počkej na zelený běh v **Actions** a pak otevři Pages adresu aplikace. V Chrome na Androidu použij **⋮ → Přidat na plochu / Instalovat aplikaci**.
