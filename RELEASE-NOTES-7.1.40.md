# Generátor testů 7.1.40 — GARP 2.5 / N5 auto-patch baseline

Datum: 2026-09-16

## Účel release

Verze 7.1.40 je záměrně úzký patch release bez nové aplikační funkce. Je vytvořena jako jednoznačný baseline po uzavření N5 detekce a GARP 2.5 evidence, aby mohla být v následující etapě jednorázově přijata AI Studiem jako minimální verze pro centrální automatické přebírání dalších patch verzí 7.1.x.

## Co se mění

- release/runtime/PWA/QA metadata jsou sjednocena na 7.1.40,
- service-worker cache namespace je `ghrab-generator-v7.1.40`,
- N5 scanner a jeho 59/59 selftest zůstávají součástí GARP 2.5 cesty,
- SBOM a AI assurance fingerprint jsou přegenerovány pro 7.1.40,
- bezpečnostní evidence výslovně rozlišuje historicky ověřený 7.1.39 baseline a nový 7.1.40 source candidate.

## Co se nemění

- secure studentský runtime a verifier,
- teacher access / unlock workflow,
- Google Forms workflow,
- scoring, RSA/AES a `SECURE-ANSWERS-V1`,
- AI funkce a prompt boundary,
- uživatelské workflow a UI.

## Release podmínka

7.1.40 se nesmí považovat za schválený auto-patch baseline pouze na základě tohoto ZIPu. Nejdříve musí projít novým čistým GitHub Actions CI/deploymentem. Teprve potom se v AI Studiu jednorázově nastaví baseline 7.1.40 a `generator` se zařadí do centrální `auto-patch` promotion policy.
