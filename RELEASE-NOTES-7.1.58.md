# Generátor testů 7.1.58 — odolné dávkové generování

Datum: 2026-09-28

## Opraveno

- Úspěšně vygenerované dávky se při chybě nebo timeoutu už nezahodí. V rámci stejné otevřené relace další spuštění naváže od první nedokončené části.
- Hotová analýza zdroje pro Reading comprehension se při stejném zadání znovu nepouští.
- Jeden logický AI požadavek má společný časový strop. Fallback modely už nemohou každý samostatně vyčerpat celý 180s timeout.
- Batching už nepovažuje cvičení za složité jen proto, že podporuje ruční editor. Běžné typy se sdružují do větších, stále omezených dávek s rozpočtem 6000 aplikačně odhadovaných výstupních tokenů.
- Reading comprehension, listening comprehension a cloze text zůstávají záměrně oddělené kvůli velikosti a strukturální náročnosti výstupu.
- Chybová hláška nyní explicitně uvádí, kolik hotových částí a zda Reading analýza zůstaly zachovány pro navázání.

## Bezpečnost a QA

- Validace každé AI dávky i generation-repair zůstávají zachovány.
- GARP 2.7 trust anchor, AI assurance fingerprint a CycloneDX SBOM byly obnoveny pro 7.1.58.
- Performance budget se nezvyšuje; release musí projít původním P5 limitem.
