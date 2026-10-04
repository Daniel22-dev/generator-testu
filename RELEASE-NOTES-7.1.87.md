# 7.1.87 — Red-team v2 / E10: opravy z přesného GitHub CI

Kontrola bezpečného sestavení už nevyžaduje učitelský panel ve studentském HTML. Nadále vyžaduje start, dešifrování zadání, odevzdání, šifrování výsledku a ochranu opuštění; existující izolace odmítá učitelské funkce, tajné údaje i rosterové membership hashe. Oprava odstraňuje skutečné blokování generování bezpečného testu. Použití nových nastavení bez AI u bezpečného testu už nevyžaduje skrytý Teacher/Admin kód; kontrola nezávislého classroom unlock kódu zůstává zachována.

Klikací audity respektují skryté Teacher/Admin pole v bezpečném režimu a zadávají startovní kód načtený ze skutečného soukromého verifieru. Ověřují syntaxi individuálního kódu na klientu a odmítnutí neznámého rosterového kódu v soukromém verifieru. Testy skórování, odemčení, žolíka, deadline, duplicity a poškozeného payloadu zůstávají povinné. Kryptografické funkce ani ochrana startu se v testovaných exportech nenahrazují.

README, poznámky k vydání, runtime/PWA metadata, GARP trust anchor a jeho CI piny mají aktuální verzi. Changelog zachovává deset položek od nejnovější. Vzdálené kontroly musí certifikovat přesný nový candidate SHA po čistém npm ci; starší PASS není certifikací tohoto commitu.

NOT READY – BLOCKING ISSUE trvá. E7 fyzické iPhone/iPad/Android je ANALYZED / NOT TESTED, E6 historické raw/cache a soukromá rotace nejsou uzavřeny, skutečné školní Forms čeká na ověření vlastníkem. Readiness kontrola před merge/deploy zůstává povinná; main a produkce se touto opravou nemění.
