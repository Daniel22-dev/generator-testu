# E1 IMPLEMENTATION REPORT - 7.1.76 R7/E1

Datum: 2026-10-03
Stav: IMPLEMENTED / RELEASE CANDIDATE, nikoli production-promoted

## Scope

Implementace vychazi pouze z potvrzenych E1 findingu:

1. localStorage activeAttempt nebyl kryptograficky chraneny;
2. smazani active/submitted lokalniho stavu mohlo otevrit novy pokus;
3. stale activeAttempt mohl byt replaynut;
4. rozpracovane odpovedi se po legitimnim reloadu neobnovily;
5. Teacher Verifier neoveroval student/code -> groupKey binding pred scoringem.

Historicky jiz opravene Teacher/Recovery privilege mechanismy nebyly preimplementovany.

## Zmeny v runtime

### Persistence integrity

Soubor: src/js/13e-secure-student-runtime.js

- signed persistence records s HMAC-SHA-256;
- neextrahovatelny HMAC CryptoKey ulozeny v IndexedDB;
- monotoni revision + chain state;
- activeAttempt + attemptGuard jako oddelene podepsane zaznamy;
- redundantni localStorage kopie pro rychlou obnovu, nikoli jako jedina autorita;
- fail-closed pri invalid MAC, chybejicim klici s existujicim stavem, konfliktu revizi nebo tamper indikaci;
- conservative merge unload shadowu nesmi prodlouzit deadline, odstranit lock ani zmenit identitu/variantu;
- submit race je uzavren flushPendingAttemptWrites() pred submitted guardem.

### Response restoration

Do activeAttempt jsou zahrnuty RESP, answerChangeStats, lastRespSerial a lastChangeTs. Po reloadu se obnovuje interní stav i viditelne prvky formulare vcetne choice, text, cloze, select, table, error-tagging, categorisation board a ordering.

## Zmeny ve Verifieru

Soubory:
- src/js/13f-secure-teacher-verifier.js
- src/js/13ea-secure-verifier-forms.js

Verifier nese diffRosterSalt + diffGroups/studentHashes a pred scorePayload provede payloadBindingError():

- kontrola identityMode;
- groupKey musi existovat;
- oneTimeCode musi byt v rosteru;
- identity/code se normalizuje stejne jako pri generovani;
- GIT-DIFF-ROSTER-V1 hash urci prirazenou skupinu;
- payload s jinym groupKey je invalid-current a neni scoreovan.

## Regression coverage

Nove:
- scripts/check-e1-remediation.mjs
- scripts/check-e1-persistence-browser.mjs
- package scripts check:e1-remediation a check:e1-remediation-browser

Aktualizovano:
- scripts/check-joker-workflow-regressions.mjs

Browser adversarial scenare:
1. local tamper nesmi odemknout ani prodlouzit pokus;
2. smazani local active/guard/shadow nesmi vytvorit novy timer/pokus, pokud sekundarni autorita zustava;
3. stale podepsana local revize nesmi prepsat novejsi stav;
4. RESP se po restartu obnovi do viditelneho UI;
5. smazani local submitted markeru a pending-write race nesmi znovu otevrit pokus.

## Test status

Security/regression gate testy uvedene v R7 release notes prosly. Exact-lockfile npm ci/npm test a plny build v tomto sandboxu nejsou tvrzeny jako PASS, protoze sitova instalace nedobehla a node_modules/acorn je nekompletni.

## Security boundary po E1

Tato oprava zvysuje odolnost proti editaci/smazani beznych lokalnich zaznamu a stale replay. Neni to serverova autorita. Kompletni vymazani vsech site data, jiny browser/device nebo arbitrary same-origin JS zustavaji platform limitation. Teacher/Recovery privilege boundary a recovery semantics zustavaji zachovany.
