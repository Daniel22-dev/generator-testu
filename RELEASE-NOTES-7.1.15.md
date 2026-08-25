# Generátor testů 7.1.15 — bezpečnostní kandidát GARP, kolo 2

Datum: 25. 8. 2026

## Důvod vydání

Nezávislá kontrola kandidáta 7.1.14 potvrdila všech osm oprav z prvního kola, ale správně upozornila, že deklarovaná CSP existovala pouze jako budoucí serverová konfigurace. GitHub Pages build aktivní CSP neměl. Kontrola navíc našla použití `new Function`, které by vyžadovalo `unsafe-eval`, a tichý FNV fallback v instant režimu bez WebCrypto.

## Opravy

1. `src/shell.html` a interaktivní manuál obsahují aktivní meta Content Security Policy.
2. CSP nepovoluje `unsafe-eval`. Kompatibilitní výjimka `unsafe-inline` zůstává výslovně zdokumentována pro současnou single-file architekturu.
3. Syntaktická kontrola generovaných skriptů používá lokální Acorn 8.17.0 a kód pouze parsuje, nespouští.
4. Runtime `new Function` byl odstraněn také z vestavěného Test Labu a českého modulu, nejen z hlavního validátoru.
5. Sdílené bodovací funkce se vytvářejí jednou factory funkcí. Stejný zdroj používá emitovaný student/verifier i interní diagnostika.
6. Bez WebCrypto se zastaví vytvoření každého exportovaného testu, včetně instant režimu; vložený instant i secure-student runtime také odmítnou ověřovat heslo/PIN slabým FNV hashem.
7. Acorn je lokální same-origin runtime závislost, je součástí PWA precache a build přikládá také jeho MIT licenci.
8. Nová brána `check-csp.mjs` ověřuje přítomnost a shodu CSP, zákaz `unsafe-eval`, přibalení parseru a AST absenci runtime `eval`/`new Function`.
9. P5 baseline dynamického vyhodnocování je snížen z 12 na 0, takže se `new Function` nemůže později tiše vrátit pod starým limitem.

## Zbytkové hranice

- `unsafe-inline` zůstává do navazující modularizace. CSP proto omezuje cizí skripty, objekty, base hijack a dynamické vyhodnocování, ale není plnou druhou obranou proti každé DOM XSS.
- Baseline rizikových HTML sinků se nesmí zvýšit; postupné snižování je samostatný úkol.
- Kryptografii centrálního app-guardu je nutné posuzovat proti AI Studiu 0.21.31 nebo novějšímu.
- Finální GREEN vyžaduje P5/browser/Axe bránu v prostředí s nainstalovaným Chromiem a živý smoke test nasazené GitHub Pages verze.
