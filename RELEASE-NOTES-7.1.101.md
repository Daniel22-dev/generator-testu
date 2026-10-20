# GIT 7.1.101 – Učitelský náhled a kompatibilita Apple

Datum vydání: 2026-10-20

## Změny

- Opravené dvoukrokové spuštění učitelského náhledu přísného testu v odděleném sandboxu bez požadavku na fullscreen.
- Učitelská simulace bez běžícího časovače a bez skutečného odevzdání; po zavření a opětovném otevření vznikne nový náhled.
- Přístupový a studentský kód se předvyplňují pouze v dočasném učitelském náhledu, nikoli do veřejného studentského HTML.
- Nové samostatné učitelské povolení kompatibilního startu na iPhonu/iPodu bez Element Fullscreen API; standardně vypnuto, pouze samostatný test přes HTTPS.
- Nepovolený fullscreen s existujícím API nelze zaměnit za nepodporované API; skutečná kompatibilní výjimka má viditelné upozornění a auditní důvod.
- Zachovány přísný režim, Recovery, odevzdání, Google Forms, Teacher Verifier, běžné testy a procvičování. Split-screen zůstává SHADOW/AUDIT-ONLY.
- Doplněna browser/regresní certifikace a bezpečná DOM oprava XSS sinku ve výsledku simulace.
- Tato funkční oprava již byla v produkčním commitu 7.1.100 ze dne 20. 10. 2026; vydání 7.1.101 napravuje její chybějící changelog, release identitu a verzování PWA cache.
- Fyzické testování Safari na iPhonu/iPadu a živých školních formulářů se tímto dokumentačním vydáním nevydává za ověřené.

## Rozsah

Bez nové funkcionality nad již vydaný 7.1.100 hotfix. Changelog, konzistentní SemVer, PWA a cache identita, SBOM, release assurance a přesná CI certifikace. Bez zásahu do hodnoticího algoritmu a datových kontraktů.
