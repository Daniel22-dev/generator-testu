# Generátor testů 7.1.14 — bezpečnostní kandidát GARP K1

Datum: 2026-08-25

Tato opravná verze je kandidát pro první nezávislou kontrolu Claude. Zachovává veřejný serverless/PWA provoz a zpřesňuje hranici budoucího školního serveru.

## Bezpečnostní změny

- Aplikace zůstane uzamčená, pokud nelze načíst a ověřit deployment konfiguraci, adresa neodpovídá konfiguraci nebo centrální brána nevrátí permit.
- Integrace GHRAB AI Core již nevolá neexistující funkce platformy. Veřejný profil povoluje jen přímý Gemini transport; školní profil jen same-origin gateway a jen po výslovném potvrzení připravenosti serveru.
- Školní profil odstraní osobní provider klíče z `localStorage` i `sessionStorage`.
- Importované a lokálně uložené stavy mají allowlist polí, limit velikosti a složitosti a odmítají `__proto__`, `prototype` a `constructor`.
- Deployment konfigurace není součástí běžné app-shell cache.
- Externí GitHub Actions jsou připnuté plným commit SHA.
- Nepřímé balíčky `brace-expansion` a `undici` jsou aktualizované na opravené verze v lockfile.

## Pravdivost školního profilu

`deployment.school-server.json` je fail-closed nasazovací šablona, nikoli tvrzení o živém serveru. `serverSessionReady`, `schoolGatewayReady` a `schoolServerConnected` zůstávají `false`, dokud je skutečné serverové nasazení nepotvrdí.

## Hranice kandidáta

Kryptografická implementace centrálního `app-guard.js`, podpisové klíče, 90denní permit, 24hodinový offline LKG a 30denní stáří podepsaného konfiguračního balíčku nejsou součástí tohoto repozitáře Generátoru a musí být ověřeny v kandidátu AI Studia GHRAB.
