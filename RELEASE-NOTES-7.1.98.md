# GIT 7.1.98 — classroom secure start/submission hotfix

Datum: 2026-10-08

## Důvod vydání

Po ostrém vygenerování secureOffline testu se objevil incident, kdy nový studentský test po zadání START kódu a osobního kódu působil, jako by přeskočil přímo na odevzdání / Google Forms. Přesný historický mechanismus jediného incidentu nebyl zpětně prokázán na 100 %, ale audit reprodukoval více cest se stejným symptomem. Tato verze je zavírá a přidává regresní pokrytí.

## Opravy

- Dokončený `submissionOutbox` se obnovuje až po ověření aktuální identity a musí odpovídat jejímu hashovanému bindingu; cizí pokus se nezobrazí.
- Vazba identity se zachovává také při `pageshow` / BFCache obnově.
- Po Startu se test vrací na začátek stránky a krátký click-through guard platí pouze uvnitř testového UI; nesmí spolknout kliky na lock/recovery obrazovce.
- Ruční odevzdání jde přes explicitní potvrzení. Automatické odevzdání po vypršení času potvrzení nečeká.
- Obnovený pokus s již vypršelým časem zachovává původní deadline, automaticky se odevzdá a student dostane vysvětlení.
- Po timeout auto-submit se znovu neaktivuje split monitor ani lock UI.
- Secure studentský runtime je rozdělen do samostatného submit modulu `13dh-secure-student-submit.js`; hlavní runtime zůstává pod strukturálním limitem 90 kB.

## Regresní pokrytí

Browser/static kontrakty pokrývají zejména:
- fresh start nesmí přejít na Submitted/Forms;
- click-through nesmí odevzdat ani změnit odpověď;
- cizí či libovolný jiný šestimístný kód nesmí obnovit cizí outbox;
- vlastní outbox se může bezpečně obnovit;
- expired resume nesmí resetovat čas;
- BFCache musí zachovat identity binding;
- ruční submit musí projít potvrzením;
- auditní Journey/identity/runtime/a11y harnessy používají nový potvrzený submit workflow.

## Bezpečnostní semantika

Teacher/Admin a Classroom Recovery zůstávají oddělené role. Skryté Recovery pole zůstává dostupné až po pěti tazích na zámek. Studentský veřejný secure soubor nenese soukromý roster; autoritativní vazba kódu na studenta / Forms identitu se nadále kontroluje v soukromém Teacher Verifieru.

## Release gate

7.1.98 smí být povýšena do `main` pouze po zeleném exact-SHA P5 R2, Workflow journeys E2E a Safe Promotion. První fyzický školní Google Forms / device průchod zůstává provozním acceptance testem.
