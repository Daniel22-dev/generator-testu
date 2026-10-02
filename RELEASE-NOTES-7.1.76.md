# Generátor interaktivních testů 7.1.76

Datum: 2026-10-02

## Účel

Remediation release candidate po nezávislém auditu bezpečnostního balíčku 7.1.75. Verze uzavírá kritické a vysoké nálezy auditu v aplikačním kódu a testovací infrastruktuře a přidává race hardening recovery unlocku.

## Opravy

- Teacher Verifier: opravené escapování inline handleru a CSV newline; generated Verifier JavaScript je parsován samostatnou release bránou.
- Credential policy: jedna `credentialPolicyErrors()` autorita; fail-closed enforcement v `validate()`, `applySettingsWithoutAi()` a `assembleTestHtml()`.
- Testy: nové credential fixtures, dvourolová workflow matice, behaviorální R3/R5 adversarial gates a odstranění vakuových E6 kontrol.
- Recovery runtime: locked/busy guard v secure i instant režimu; jeden lock může vytvořit nejvýše jeden recovery-unlock.
- Instant security summary: `warningCount` odpovídá skutečným warning událostem.
- Supply chain: lockfile resolution `brace-expansion` 5.0.12 a `undici` 7.29.1.

## Vědomě odložené LOW

- secure active-attempt seal stále uchovává posledních 120 security eventů;
- `bad-unlock` zůstává ve Verifieru hard security signálem.

Tyto body nejsou privilege-escalation ani integrity blocker a vyžadují samostatné policy rozhodnutí.

## Promotion gate

R6 je možné označit jako finální release až po nezávislém běhu: `npm ci`, `npm test`, `npm run qa:d7:ci`, `npm run check:joker-browser`, `node scripts/check-security-adversarial-r5.mjs`, plus GARP 2.7 static gate s aktuálním external trust pinem. Vše musí skončit bez FAIL/ERROR.
