# Generator interaktivnich testu 7.1.76 R7 / E1 remediation candidate

Datum: 2026-10-03

## Ucel

Tento kandidat implementuje pouze mezery potvrzene E1 deep regression a adversarial auditem nad zdrojovym balickem 7.1.76. Nemeni Teacher/Admin vs Classroom Recovery privilege model ani kryptograficky format SECURE-ANSWERS-V1.

## Implementovane opravy

- Active-attempt persistence: autoritativni podepsany zaznam s HMAC-SHA-256, neextrahovatelnym CryptoKey v IndexedDB, monotoni revizi a redundantnim localStorage zaznamem.
- Tamper/replay: neplatny MAC, konflikt revizi nebo pokus o stale replay vede fail-closed k integrity locku; bez Teacher autorizace se nevytvori novy pokus.
- Submitted continuity: podepsany attempt guard zachova stav odevzdani i po smazani bezneho localStorage markeru; submit nejdriv flushne pending active-attempt zapis, aby starsi zapis neprepsal submitted stav.
- Response recovery: rozpracovany RESP a change statistics se ukladaji v aktivnim pokusu a po reloadu se obnovi take do viditelnych inputu, selectu, choice, multi-select, ordering a dalsich podporovanych ovladacich prvku.
- Verifier binding: Teacher Verifier pred scorePayload znovu vypocita vazbu student/jednorazovy kod -> diferencni skupina a odmitne payload s cizi nebo neexistujici variantou; u oneTimeCode rezimu zaroven vyzaduje kod z rosteru testu.
- Regression gates: pridany check:e1-remediation a check:e1-remediation-browser; aktualizovan joker workflow contract.

## Zachovane bezpecnostni mechanismy

- Teacher/Admin secret a Classroom Recovery Code zustavaji oddelene role a credentialy.
- Recovery odemyka pouze aktualni legitimni pokus a nema Teacher/Admin pravomoci.
- Attempt ID, deadline, identita, varianta, zolik a security log zustavaji soucasti obnovovaneho pokusu.
- SECURE-ANSWERS-V1 sifrovani, manifest/test/student HTML binding a duplicate handling nejsou oslabeny.

## Overeni v tomto prostredi

PASS: credential-security, recovery runtime, runtime UX, joker workflow, security adversarial, security forensics, verifier generated syntax, verifier-v2, E1 static remediation, E1 isolated-browser adversarial scenarios, source structure, hermetic syntax lint, versions, QA manifest, lockfile URL policy, GitHub Actions SHA pinning, sensitive scan, deadline timers, AI assurance fingerprint, GARP 2.5 selftest, GARP 2.7 contract gate, GARP policy-admission mutations a auto-patch contract.

E1 browser adversarial harness overil: local tamper, smazani local markeru, stale signed replay, obnovu rozpracovanych odpovedi do viditelneho UI a submitted-marker deletion/race.

## Promotion blockers / omezeni

- V sandboxu nedobehlo sitove npm ci; lokalni node_modules ma chybejici acorn 8.17.0. Proto nelze tento kandidat oznacit jako finalni pouze na zaklade zdejsiho behu npm build/npm test.
- Organizacni Chromium policy v tomto prostredi blokuje file:// i 127.0.0.1. Browser harness proto overuje control flow v izolovanem srcdoc se storage/crypto shimem; produkcni source gate zvlast kontroluje realne WebCrypto HMAC + IndexedDB API.
- Pred produkcnim povysenim je nutny real-browser smoke test exportovaneho studentskeho HTML na podporovanem zpusobu doruceni, zejmena Chrome/Edge a pokud je podporovan, Safari/iPadOS.
- Serverless klient nedokaze garantovat jeden pokus po kompletnim smazani vsech browserovych dat vcetne IndexedDB, v jinem browser profilu/zarizeni ani proti uzivateli, ktery muze spoustet arbitrary same-origin JavaScript. Pro tuto uroven autority je nutny server.

## Promotion gate

Pred finalnim oznacenim release musi projit nezavisle: npm ci, npm test, npm run qa:d7:ci, npm run check:e1-remediation-browser na realnem browser/delivery surface, puvodni R5 adversarial gate 0 FAIL/0 ERROR, GARP 2.7 static gate s aktualnim external trust pinem a post-deploy smoke kontroly.
