# Generátor testů 7.1.12 — P5 R2

Datum: 5. srpna 2026

## Změny

- Browser workflow vygenerovaného testu běží přes důvěryhodný lokální HTTP origin s WebCrypto.
- P5 R2 runtime audit měří skutečné UI, ne HTML skořápku.

## Certifikační stav

- Projektové testy: PASS.
- Runtime přístupnost a reflow nad spuštěnou aplikací: PASS.
- Exact axe-core 4.12.1: povinný a blokující v GitHub CI; lokálně v pracovním prostředí nebyl balík dostupný.
- GitHub Pages: zatím nenahráno.
- Školní server: připraven, nepřipojen.

## Hotfix po prvním CI uploadu

- doplněn přístupný název mobilního tlačítka „Nahlásit chybu“;
- opraven kontrast společné platformní patičky;
- doplněna regresní kontrola přístupného názvu tlačítka.
