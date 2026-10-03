# Generátor testů 7.1.72 — GARP 2.8 hardening + PDF layout

Datum: 2026-10-02

## Bezpečnostní změny podle auditu GARP 2.8

- `sync-ghrab-ai-core.yml` je rozdělen na read-only `verify-core` a samostatný `publish`. Zápisová oprávnění existují jen v `publish`; ověřovací job používá `persist-credentials: false`, `npm ci --ignore-scripts --no-audit --no-fund` a předává pouze očekávané synchronizované soubory přes připnutý artifact action.
- `safe-promotion.yml` má na úrovni workflow pouze `contents: read`; každý job má explicitně jen oprávnění potřebná pro své GitHub API/PR operace.
- Přidán `frame-guard.js`: same-origin vložení z AI Studia zůstává povoleno, cizí rám je blokován před spuštěním aplikačního UI.
- Sandboxový self-test RPC bridge nově přijímá zprávy pouze od svého `parent` okna.
- Error reporter rediguje i holý Google API klíč tvaru `AIza…` a hodnoty query parametrů `key`, `api_key` a `apikey`; regression test skládá syntetický klíč za běhu.

## PDF layout

- Přímé studentské i učitelské PDF nyní používá samostatný 40px horní a dolní bezpečný okraj na každé A4 stránce, nikoli jen padding na začátku a konci dlouhého rasterizovaného dokumentu.
- Obsahová výška pro stránkování je zmenšena o oba vertikální okraje, takže text nezačíná těsně u horní hrany a nekončí těsně u spodní.
- Stránkovací algoritmus přednostně přesune celé nové cvičení na další stránku, pokud začíná až v poslední zhruba třetině použitelné výšky a pokračovalo by na další stránku. Tím se odstraní situace typu „Cvičení 5“ na konci jedné stránky a jeho položky až na další.
- Quality regression kontroluje jak nerozřezané otázky/textové řádky, tak osiřelý začátek cvičení a minimální vertikální okraj.

## Hranice změn

Scoring, šifrování/dešifrování, Teacher Verifier analytics, studentský secure runtime a formát SECURE-ANSWERS-V1 se nemění.
