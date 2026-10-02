# Generátor interaktivních testů 7.1.74

Datum: 2026-10-02

## Účel

Tento patch zpevňuje workflow žolíka po ostrém třídním použití. Hlavním cílem je, aby student po zahájení bezpečného testu nemohl běžným reloadem změnit původní volbu žolíka ani získat nový časový limit a aby Teacher Verifier žolíkový pokus nezapočítával do klasifikačních statistik.

## Studentský workflow

- Před startem musí student zvolit „Dělám test“ nebo „Beru si žolíka“.
- Při volbě žolíka následuje explicitní potvrzení; teprve potom lze pokus zahájit.
- Při prvním startu se lokálně zapečetí identita pokusu, `attemptId`, čas startu, absolutní deadline, volba žolíka a stav bezpečnostního zámku.
- Reload/znovuotevření obnoví tentýž pokus a původní volbu. Deadline se nepřepočítává od nuly.
- Pokud je na zařízení rozpracovaný pokus jiné identity, nový pokus vyžaduje učitelský přístupový kód.
- Pokud prohlížeč nepovolí spolehlivé lokální uložení pečeti pokusu, bezpečný test se nespustí (fail-closed).
- Úspěšné odevzdání aktivní pečeť odstraní až po vytvoření šifrovaného výstupu a nastavení zámku odevzdání.

## Teacher Verifier

- `resolvedResults()` zachovává všechny kryptograficky platné a učitelem rozřešené pokusy, včetně žolíka, pro kontrolu a bezpečnostní audit.
- `effectiveResults()` je klasifikační populace a žolíkové pokusy z ní vyřazuje.
- Žolík tedy neovlivňuje třídní průměr, distribuci známek ani položkovou analýzu.
- V tabulce a individuálním feedbacku je viditelně označen jako „ŽOLÍK — MIMO KLASIFIKACI“; vypočtená známka je pouze informativní.
- Výsledkové CSV obsahuje `classification_status`, `joker_used` a `joker_selected_at`; žolíkové řádky nesou `JOKER_EXCLUDED`.
- Bezpečnostní panel dál analyzuje i žolíkové pokusy a krátký čas se u žolíka neignoruje.

## Bezpečnostní hranice

Pečeť aktivního pokusu je lokální browserová ochrana pro offline/serverless provoz. Zavírá běžný workflow loophole přes reload, ale není serverovou autoritou proti studentovi, který by cíleně manipuloval s browserovým úložištěm/DevTools. Definitivní serverová autorita patří do budoucí serverové verze GIT.

## Ověření před vydáním

Patch obsahuje nový `check:joker-workflow` regresní kontrakt, rozšíření Teacher Verifier analytics/IA testů a samostatný klikací Chromium test skutečného secure studentského runtime. Ten ověřuje mimo jiné NE → reload → zákaz přepnutí na ANO, zachování attempt ID/deadline/zámku, blokaci jiné identity, potvrzení žolíka před startem a fail-closed chování při nedostupném úložišti. V sandboxu test používá deterministický QA backing pro storage/WebCrypto, protože přímou lokální navigaci systémový Chromium blokuje organizační politikou. Plný build, přesný lockfile CI a Journey E2E zůstávají finální release autoritou po nahrání kandidáta do GitHubu.
