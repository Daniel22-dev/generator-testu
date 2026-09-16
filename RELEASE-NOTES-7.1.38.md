# Generátor testů 7.1.38 — Etapa 6 QA hotfix

Datum: 2026-09-16

## Důvod vydání
Exact GitHub CI 7.1.37 odhalilo dvě chyby v nových Stage 6 workflow testech, nikoli v produkční autentizační logice.

1. Instant test používal secure-runtime DOM ID/funkci (`teacherName`, `teacherPin`, `teacherLogin`, `teacherPanel`) místo skutečných instant názvů (`t-name`, `t-pin`, `doTeacherLogin`, `t-panel`).
2. Secure Stage 6 scénář běžel po úseku workflow matice, který kvůli rychlosti nahrazuje generátorový PBKDF2 deterministickou testovací hodnotou. Studentský runtime ale ověřuje skutečný PBKDF2, takže login musel selhat.

## Oprava
- Instant Stage 6 test používá skutečné instant DOM ID a handler.
- Secure Stage 6 test před generováním dočasně obnoví skutečný `deriveSecretHash` a po sestavení vrátí rychlou testovací náhradu.
- Produkční Stage 6 kód se nemění.

## Nezměněno
- jeden učitelský přístupový kód v UI,
- oddělené PBKDF2 domény `teacher-pin` a `unlock-password`,
- secure i instant runtime,
- teacher verifier, Google Forms, scoring, RSA/AES a `SECURE-ANSWERS-V1`.

## Release status
QA-only source candidate. Etapa 6 se uzavře až po čistém exact-lockfile GitHub CI 7.1.38.
