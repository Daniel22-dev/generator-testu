# GIT 7.1.99 — Forms new tab and Teacher Verifier V2 layout hotfix

Datum: 2026-10-08

## Rozsah změn

### Studentský přísný test — odevzdání do Google Forms

- Funkce `openSubmissionForm()` otevírá školní Google Form přes `window.open(url,'_blank')` namísto varianty s `noopener,noreferrer`, která podle chování prohlížeče vracela `null` a zároveň spouštěla navigační fallback.
- Když prohlížeč otevře nové okno, `opened.opener=null` přeruší vazbu na původní kartu; původní stránka i odevzdávací kód zůstávají zobrazené.
- **Omezení:** pokud prohlížeč popup zablokuje, existující fallback použije `window.location.href=url`. V této větvi se původní studentská karta opustí. Absolutní garance zachování kódu ve všech prostředích není součástí tohoto patch release.
- Oprava se projeví pouze v testech vygenerovaných po nasazení 7.1.99.

### Teacher Verifier 2.0

- `SECURE_VERIFIER_V2_CSS` přidává `.wrap[data-v2-ready]{max-width:min(1500px,98vw)}`.
- Široké stolní zobrazení již není svázáno původním limitem 860 px. Na menších šířkách může mít široká tabulka stále horizontální scroll.

## Záměrně beze změn

Bodování odpovědí, identita studenta, roster, kryptografie, pravidla časových kotev Forms, parser CSV i učitelské podpisy START/END.

## Přidané regrese

- `scripts/check-forms-workflow-f1-f9.mjs`: zdrojový kontrakt, otevření / blokování popupu v Node VM, zachování `opener` izolace a šířka CSS.
- `scripts/check-forms-lesson-windows-browser.mjs`: vyvolání akce na skutečně generovaném studentském HTML a ověření právě jedné nové karty při zachování obrazovky odevzdání.

## Vydání a nezávislé ověření

- Candidate commit smí vzniknout jen po `npm ci`, úplném `npm test`, `npm run test:headless`, statických GARP a `git diff --check` bez chyb.
- Následně je nezbytná nezávislá CI P5 R2, journey E2E a Safe Promotion na přesném SHA. Přímý commit do `main` není povolen.
- Fyzický iPhone/iPad, Android, desktop a skutečné školní Google Forms / CSV export zůstávají provozními acceptance testy. E6 historická očista zůstává explicitně odložena.
