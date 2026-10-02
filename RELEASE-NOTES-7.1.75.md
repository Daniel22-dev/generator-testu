# Generátor interaktivních testů 7.1.75

Datum: 2026-10-02

## Účel

Tento bezpečnostní patch odstraňuje privilege coupling verze 7.1.74, kde jeden vstupní učitelský kód sloužil jako zdroj pro privilegovanou i odemykací autentizační větev. Nový model používá dva nezávislé credentialy s rozdílným účelem, kryptografickou doménou a runtime pravomocí.

## Nový bezpečnostní model

- **Teacher/Admin secret** je tajný údaj pouze pro učitele. Ověřuje teacher login, povolení dalšího pokusu po odevzdání a reset rozpracovaného pokusu jiné identity.
- **Classroom Recovery Code** je per-test provozní kód. Jeho jedinou pravomocí je odemknout aktuální bezpečnostní lock téhož pokusu. Může být podle provozního scénáře sdělen třídě, aniž by tím vznikla teacher/admin pravomoc.
- Teacher větev používá PBKDF2 doménu `teacher-pin|<testId>`; recovery větev používá `recovery-code|<testId>`.
- Secure i instant runtime používají shodnou privilege boundary a role-specific matchery.

## Recovery workflow a audit

- Skryté gesto 5× poklepání na ikonu zámku zůstává zachováno.
- Správný Recovery Code odemkne pouze aktuální lock; nemění `attemptId`, absolutní deadline, identitu, aktivní variantu, volbu žolíka, odpovědi ani začátek pokusu.
- Každý `recovery-unlock` ukládá vazbu na předchozí důvod a čas locku. Sekvence opakovaných lock/unlock cyklů je rekonstruovatelná.
- Teacher Verifier vykazuje úspěšný Recovery Unlock jako auditní informaci, nikoli automatický bezpečnostní prohřešek nebo důkaz podvodu.
- CSV/archiv zachovává recovery unlock count a security event timeline.

## Secret hygiene

- Raw Teacher/Admin secret ani raw Recovery Code se nesmí dostat do studentského HTML.
- Oba credentialy jsou citlivá pole a jsou rekurzivně odstraňovány ze snapshotů, šablon, historie, importovaných legacy struktur a exportu zadání.
- Legacy společný `heslo` kód se při migraci nepovyšuje na dva nové credentialy.
- Manual/AI workflow používá pouze `__TEACHER_ADMIN_SECRET_DOPLN_LOKALNE__` a `__CLASSROOM_RECOVERY_CODE_DOPLN_LOKALNE__`; skutečné secrety se do AI promptu neposílají.
- SecretScanner pokrývá oba nové raw credentialy a současně toleruje pouze jejich odvozené hashové reprezentace.

## Regresní ochrana

Přidány jsou release gate E1–E6 pro datový model a UX, kryptografickou separaci, privilege boundary, forenzní log/Verifier, persistence/secret hygiene a adversarial scénáře. Zachovány jsou existující kritické kontrakty žolíka 7.1.74, iPadOS keyboard-dismiss 7.1.73, Google Forms/Verifier workflow a PDF layout 7.1.72.

## Ověřovací hranice tohoto zdrojového balíčku

V lokálním sandboxu prošly dostupné dependencyless/statické a vybrané Chromium gate. Sandbox však neumožnil síťový `npm ci`; přesný lockfile build a testy závislé na `node_modules` proto nejsou v lokálním verification reportu označeny jako PASS. Produkční/deployment READY vyžaduje v normálně síťovaném prostředí minimálně `npm ci` a `npm test` plus standardní GitHub P5/Journey/deploy smoke.

## Server deferred

Tento patch záměrně nepřidává server-authoritative attempt state, serverové spotřebování jednorázových kódů, centrální identity binding, serverové vydávání otázek ani anti-DevTools jako bezpečnostní autoritu. Tyto oblasti patří do budoucí serverové verze GIT.
