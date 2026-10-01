# Generator testů 7.1.69 — D4 + D5 + D6

## Rozsah
Společný kandidát uzavírá D4-D6 nad certifikovaným 7.1.66-R3. D4 řeší theme/fullscreen Teacher Verifieru, D5 informační architekturu a security UX a D6 zbývající generátorové mezery z Etapy A.

## D6 — šablony
- `prefill_v3` ukládá a obnovuje `rcTopic`.
- Nově uložená šablona si pamatuje pouze boolean `attachmentWasPresent`; název ani obsah přílohy se do šablony neukládá.
- Po načtení šablony, která vycházela ze souboru, se binární stav vždy vyčistí a učitel dostane explicitní warning, že musí přílohu znovu připojit.
- Starší `prefill_v3` bez nového booleanu zůstává kompatibilní; pokud byl uložen na file tabu, loader konzervativně upozorní na nové připojení přílohy.

## D6 — diferenciace
- `buildContentPrompt()` a aktivní legacy `buildPrompt()` nyní sdílejí stejný invariant: stejné učivo, cílová CEFR/SERR, typy cvičení, počty položek a body.
- Basic mění pouze míru podpory/processing load.
- Challenge mění pouze hloubku zpracování v rámci stejné struktury a stejného učiva.
- Odstraněny konfliktní formulace o menším počtu položek a vyšším podílu produkčních úloh.
- Stejná logika je promítnuta i do viditelné UI nápovědy.

## Regresní ochrana
- State-transition suite ověřuje `rcTopic` SAVE→LOAD.
- State-transition suite ověřuje skutečné uložení `attachmentWasPresent`, nulový leak názvu souboru, vyčištění file runtime a warning po LOAD.
- Ověřena kompatibilita staršího `prefill_v3` bez booleanu.
- Dynamický test vykonává obě prompt cesty pro Basic/Standard/Challenge a kontroluje zachování stejné struktury.
- Production readiness guard výslovně hlídá rcTopic, attachment warning a zákaz starých konfliktních diferenciací.

## Hranice
D6 nemění scoring, kryptografii, D1-D3 PDF runtime/kvalitu/analytics ani D4-D5 Teacher Verifier funkcionalitu. Přesný GitHub CI/Journey běh proběhne po uploadu tohoto společného 7.1.69 kandidáta.
