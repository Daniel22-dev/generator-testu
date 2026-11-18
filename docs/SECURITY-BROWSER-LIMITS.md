# Hranice bezpečnostních signálů webového testu

Tento dokument je kanonický popis C34 / ID49 / ID56 / ID91 / D04. Popisuje, co může a nemůže samotný webový prohlížeč doložit. Nemění lock policy ani nepřidává sledování.

## Co prohlížeč může zaznamenat

- `visibilitychange`, `pagehide`, ztrátu fokusu, reload a některé odchody z fullscreen;
- změnu vlastního viewportu a z ní odvozený klientský split-window signál;
- lokální chronologii zámku a legitimního Recovery odemčení.

Split-screen zůstává **SHADOW/AUDIT-ONLY**. Jeho signál nesmí sám vyvolat automatický zámek, sankci, známku ani automatický důkaz podvodu. Skutečně změřených 0 % je jiný stav než chybějící či neplatné měření „Nezjištěno“.

## Co web spolehlivě nevidí

Same-origin a operační systém nedávají stránce obecný přístup k jiným aplikacím, druhému zařízení ani neumějí potvrdit, zda student používá druhé zařízení; nevidí také systémový sidebar, obsah notifikací, fotoaparát, hodinky, papír ani pomoc další osoby. Slide Over, Split View, Stage Manager, softwarová klávesnice, zoom a změna orientace mohou měnit viewport podobně; některé rozvržení naopak nemusí vytvořit jednoznačný signál.

Telemetry je **client-controlled**. Student s DevTools, upravenou kopií HTML nebo změněným klientským prostředím může událost pozměnit či vynechat. Chybějící telemetrie proto neznamená nulu ani čistý průběh. Ani tvrdší signál není bez kontextu rozsudek.

## Správná interpretace

Teacher Verifier musí oddělit:

- skutečně naměřenou hodnotu od „Nezjištěno“;
- HARD/SOFT signály od auditní informace;
- legitimní Recovery od neúspěšného odemčení;
- klientské tvrzení od externí kotvy, například ověřeného účtu a času Google Forms.

Fyzický dozor, předem oznámená pravidla a následné lidské posouzení zůstávají nutné. Tento model nevyžaduje instalaci dalšího softwaru na BYOD zařízení a netvrdí, že webový prohlížeč poskytuje serverovou autoritu nebo úplný dohled.
