# Release notes – 7.1.62

Datum: 2026-10-01

## Shrnutí

Verze 7.1.62 uzavírá Etapu 2 auditu Generátoru interaktivních testů a zavádí Teacher Verifier 2.0. Jde o redesign informační architektury a pracovního workflow učitele nad existujícím bezpečným verifierem; hodnoticí, kryptografické a datové autority se nemění.

## Nová struktura verifieru

Verifier je rozdělen do sedmi samostatných pracovních sekcí: Dashboard, Výsledky, Analýza, Bezpečnost, Test & PDF, Export a Technické údaje. Rozhraní je responzivní, podporuje světlý/tmavý režim, fullscreen a klávesovou navigaci.

## Výsledky a import

Učitel má tři jasné vstupní cesty: hromadný import answers.txt, celoroční Google Forms CSV a nouzové vložení celého SECURE-ANSWERS-V1 bloku. Health panel rozlišuje kryptograficky platná odevzdání, skutečně započtené výsledky, neplatná data, identické duplicity a nevyřešené rozdílné pokusy stejného studenta.

Pokud existují dva rozdílné kryptograficky platné pokusy stejného studenta, verifier je nezvolí automaticky. Učitel musí konkrétní pokus označit; export výsledků je do té doby fail-closed.

## Analýza a bezpečnost

Položková analýza zachovává obtížnost, diskriminaci, distribuci známek a časté chybné odpovědi. Bezpečnostní panel umožňuje filtrovat signály podle jména, kódu, e-mailu nebo ID pokusu. Textace výslovně zachovává princip, že bezpečnostní signál není automatickým důkazem podvodu a vyžaduje lidský kontext.

## Test, PDF a export

Teacher preview, tisk prázdného studentského archu a tisk s klíčem jsou přesunuty do samostatné sekce Test & PDF. Exportní workflow rozlišuje výsledkové CSV, auditní submission CSV, studentský feedback a učitelský archiv HTML/JSON/index CSV. Archiv je jasně označen jako učitelský výstup s osobními údaji určený pouze do zabezpečeného školního úložiště.

## Bezpečnostní invariance

Verze 7.1.62 nemění scoringovou autoritu, RSA-OAEP/AES-GCM dešifrování, formát SECURE-ANSWERS-V1, kryptografickou selekci Google Forms odevzdání, secure studentský runtime ani hlavní datové kontrakty. Redesign pouze reorganizuje a zpřehledňuje existující ověřené funkce.

## QA

Etapa 2 obsahuje samostatný Teacher Verifier 2.0 kontrakt, browser journey coverage, accessibility/visual/critical QA a plnou pre-production validaci včetně P5 R2 a GARP 2.7.

## Stage 2 closure hotfix

Před přechodem na Etapu 3 byl prezentační shell Teacher Verifieru zkompaktován bez změny scoringu/dešifrování, technický panel doplnil `Student HTML SHA-256` a build nově kompaktně zapisuje pouze nasazované JSON/webmanifest soubory, aby zůstal uvnitř stávajícího performance budgetu bez navyšování limitů.
