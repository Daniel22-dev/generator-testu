# Generátor testů 7.1.39 — Etapa 6 secure unlock hotfix

Datum: 2026-09-16

## Důvod vydání

Exact GitHub CI verze 7.1.38 prošlo headless, fixtures, visual i critical auditem, ale workflow matice správně odhalila jednu produkční nekonzistenci v secure studentském runtime.

## Oprava

`src/js/13e-secure-student-runtime.js` nyní při PBKDF2 odvození kanonizuje velikost písmen pro oba učitelské účely:

- `teacher-pin`
- `unlock-password`

Před opravou secure runtime kanonizoval pouze `teacher-pin`, takže stejný Učitelský přístupový kód mohl otevřít teacher panel, ale při zadání s jinou velikostí písmen neodemknout zámkovou obrazovku.

## Bezpečnostní vlastnosti, které se nemění

- PBKDF2 domény/salty zůstávají oddělené: `teacher-pin|testId` a `unlock-password|testId`.
- Teacher-login nepřijímá unlock hash a unlock cesta nepřijímá teacher hash.
- Týmový kód Bezpečnosti pracoviště zůstává samostatný.
- RSA-OAEP/AES-GCM secure package, teacher verifier, scoring, Google Forms a `SECURE-ANSWERS-V1` se nemění.

## Release status

7.1.39 je source kandidát. Etapa 6 se uzavře až po čistém exact-lockfile GitHub CI včetně workflow scénáře teacher-login → pagehide lock → unlock stejným učitelským kódem.
