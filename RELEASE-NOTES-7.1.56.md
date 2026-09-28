# Release notes 7.1.56 — AI dostupnost a diagnostika

Datum: 2026-09-28

## Oprava

- kvalitní profil generování používá aktuální stabilní model Gemini 3.8 Flash;
- vyvážený profil používá Gemini 3.7 Flash;
- při dočasné providerové nedostupnosti se zkouší více stabilních fallbacků místo jediného;
- chybová hláška nově zachovává bezpečný technický údaj HTTP stav + interní kód + počet providerových požadavků, takže lze rozlišit nedostupnost, kvótu, problém klíče, síť a timeout.

## Důvod

AI Core 1.0.0 převáděl HTTP 404 a libovolnou chybu 5xx na obecný kód PROVIDER_UNAVAILABLE. Aplikační vrstva poté detail zahodila a uživateli zobrazila pouze „AI model je dočasně nedostupný“. Tím nebylo možné z rozhraní určit skutečný typ selhání.

## Rozsah zásahu

Změna se týká pouze providerového mapování, fallbacku a diagnostiky AI transportu. Scoring, verifier, secure studentský runtime, exporty, Google Forms workflow, jednorázové kódy ani bezpečnostní autorita GARP 2.7 se nemění.

## Release boundary

Zdrojový kandidát musí projít standardní cestou candidate → Safe Promotion → main včetně GARP, QA, AI assurance fingerprintu, SBOM a následného produkčního deploye.
