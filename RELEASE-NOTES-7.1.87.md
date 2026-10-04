# 7.1.87 — Red-team v2 / E10: opravy z přesného GitHub CI

Kontrola bezpečného sestavení už nevyžaduje učitelský panel ve studentském HTML. Nadále vyžaduje start, dešifrování zadání, odevzdání, šifrování výsledku a ochranu opuštění; existující izolace odmítá učitelské funkce, tajné údaje i rosterové membership hashe. Oprava odstraňuje skutečné blokování generování bezpečného testu. Použití nových nastavení bez AI u bezpečného testu už nevyžaduje skrytý Teacher/Admin kód; kontrola nezávislého classroom unlock kódu zůstává zachována.

Klikací audity respektují skryté Teacher/Admin pole v bezpečném režimu a zadávají startovní kód načtený ze skutečného soukromého verifieru. Ověřují syntaxi individuálního kódu na klientu a odmítnutí neznámého rosterového kódu v soukromém verifieru. Testy skórování, odemčení, žolíka, deadline, duplicity a poškozeného payloadu zůstávají povinné. Kryptografické funkce ani ochrana startu se v testovaných exportech nenahrazují.

README, poznámky k vydání, runtime/PWA metadata, GARP trust anchor a jeho CI piny mají aktuální verzi. Changelog zachovává deset položek od nejnovější. Vzdálené kontroly musí certifikovat přesný nový candidate SHA po čistém npm ci; starší PASS není certifikací tohoto commitu.

Vlastník 4. 10. 2026 výslovně schválil publikaci aktuálního GIT pro řízenou studentskou red-team zkoušku. E6 odkládá; incident tím není uzavřen. Forms potvrzuje jako zkontrolované. Fyzické E7 na iPhone/iPad/Android zůstává ANALYZED / NOT TESTED a bude ověřeno při plánované zkoušce 6. a 9. 10. 2026. Stav vydání je READY FOR CONTROLLED STUDENT RED-TEAM.

Readiness kontrola před merge/deploy zůstává povinná a nově kontroluje doložené rozhodnutí vlastníka, omezený účel, odklad E6 a plán E7. Její report uvádí skutečný stav místo pevného NOT READY; admission ho váže SHA-256 na verzovaný záznam rozhodnutí. Negativní kontroly odmítají chybějící souhlas, nepotvrzené Forms, předstírané uzavření E6, vymyšlený mobilní PASS i zastaralou evidenci. Nový commit musí projít úplným vzdáleným CI na přesném SHA před chráněným merge a nasazením z main.
