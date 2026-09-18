# Generátor interaktivních testů 7.1.42

Datum: 2026-09-18

## Účel

Čistý kontrolní PATCH nad přijatým 7.1.41 baseline. Neobsahuje zamýšlenou změnu pedagogické ani aplikační logiky; jeho účelem je prokázat ostrý end-to-end auto-patch AI Studia.

## Release-only změny

- runtime/PWA/QA verze 7.1.41 → 7.1.42,
- aktualizovaný CycloneDX SBOM a AI assurance fingerprint,
- zachovaný kontrakt `ghrab-release-integrity-v2`,
- po ověřeném Pages deployi automatický `repository_dispatch: app-updated` do AI Studia.

## Neměněné oblasti

GARP 2.5/N5, GHRAB Platform 1.1.2, Studio Bridge v2, secure studentský runtime, teacher verifier, Google Forms workflow, scoring, RSA/AES a AI operace.

## Akceptační podmínka Etapy 5

7.1.42 musí projít Generator candidate → P5 → chráněný main → production deploy. AI Studio poté musí bez ruční editace release-wave samo ověřit live identity 7.1.42, vyhodnotit změnu jako povolený patch, zapsat ji na `candidate`, projít vlastním P5/Safe Promotion a nasadit ji do produkce. Následně se ověřují duplicate/replay, concurrency, rollback, minor/major a contract-regression fail-closed scénáře.
