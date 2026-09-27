# Release notes 7.1.55 — O aplikaci

Datum: 2026-09-27

## Změna

- samostatný vstup „co je nového“ v hlavičce byl nahrazen vstupem **O aplikaci**;
- karta sjednocuje identitu aplikace, účel, autora/vývojového garanta, školní projekt, určení a přístup, technický stav, provozní zásady a nápovědu;
- původní release historie zůstává zachována uvnitř karty jako rozbalovací **Katalog změn**;
- katalog dál odděluje hlavní Generátor od samostatně verzovaného modulu Český jazyk.

## Rozsah zásahu

Jde o informační a prezentační vrstvu. Generování testů, scoring, verifier, secure studentský runtime, exporty, Google Forms workflow, AI Core/AI prompty ani bezpečnostní autorita GARP 2.7 se funkčně nemění.

## Release boundary

Zdrojový kandidát musí projít standardní cestou candidate → Safe Promotion → main. Lokální kontroly nenahrazují exact-lockfile GitHub CI ani následné provozní ověření nasazené verze.
