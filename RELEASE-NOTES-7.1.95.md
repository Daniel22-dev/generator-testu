# GIT 7.1.95 — candidate

Kritický opravný release navazující na 7.1.94.

## Oprava

- Učitelský náhled už nerecykluje jeden iframe přes `srcdoc = ''`. Každé otevření vytváří nový sandboxovaný iframe a zavření jeho browsing context úplně odstraní.
- Oprava se týká pouze učitelského preview kontejneru. Studentské instant/secure runtime a jejich ochranné mechanismy se tímto hotfixem nemění.
- Shell už neobsahuje trvale připravený `#previewFrame`; vzniká až na vyžádání.

## Regresní pojistky

- trojí otevření a zavření stejného vygenerovaného testu musí pokaždé použít nový iframe;
- instant preview se spustí, vyplní, odešle, zavře a stejný test se znovu otevře v čistém úvodním stavu;
- one-time-code teacher preview se znovu otevírá správně v `instant` i `secureOffline` režimu;
- statický UX kontrakt zakazuje návrat k teardownu přes prázdný `srcdoc` a trvalému iframe v shellu.

## Release chain

- SemVer/PWA cache posunuty na 7.1.95, aby zařízení nemohla dál používat starý preview modul z cache.
- Aktualizovány AI assurance fingerprint, CycloneDX SBOM, GARP 2.7 version binding a trust-anchor piny všech release workflow.
- Při komplexním preflightu byl navíc opraven zdrojový `ghrab_platform.cache_name`, počet registrovaných AI operací v GARP policy a chybějící záznam 7.1.94 v CHANGELOGu.

## Nasazení

Verze musí projít chráněným postupem `candidate → P5 / journey-e2e / Safe Promotion → main → GitHub Pages`. Fyzické školní ověření zůstává samostatnou akceptační fází.
