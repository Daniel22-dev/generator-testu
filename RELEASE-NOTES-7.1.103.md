# GIT 7.1.103 – R1 final release candidate

Datum přípravy: 2026-11-17

## Změny

- Oddělený soukromý učitelský náhled a odstranění preview bypass větví z veřejného studentského HTML (C32/D02).
- Bezpečná responzivní karta START/END a startovní kód s ochranou proti asynchronnímu použití zastaralého artefaktu (C29).
- Pravdivý průběh generování podle dokončených kroků a opravené zahazování odmítnutých AI checkpointů (C30).
- Sjednocené vykreslení odstavců Readingu ve studentských, náhledových a tiskových cestách.
- Zpřesněná dokumentace omezení klientské telemetrie; split-screen zůstává SHADOW/AUDIT-ONLY.
- Opravená Windows QA infrastruktura pro ukončování Chromia, Reading viewport a deterministické CI/E10 běhy.
- P4 release identity vyžaduje přesné consumed-evidence schéma v2; historické schválení 7.1.101 neautorizuje 7.1.103.
- Version-only GARP 2.7 metadata, PWA cache a odvozené trust piny; bezpečnostní politika a capabilities se nemění.
- Stage08 není součástí R1 7.1.103. Fyzická zařízení a živé školní služby nejsou tímto lokálním krokem certifikovány.

## Rozsah a vydání

Tento stav je lokální release candidate. Produkční vydání vyžaduje čerstvou exact-SHA GitHub certifikaci, samostatné autentizované schválení vlastníka a chráněný release proces. Stage08 zůstává oddělená.
