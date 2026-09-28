# Generator testů 7.1.57 — šablony a odolnost AI

Datum: 2026-09-28

## Opraveno

- **Moje šablony skutečně předvyplňují formulář.** Nový formát `prefill_v2` ukládá bezpečnou konfiguraci testu: režim, jazyk, CEFR, typy a počet cvičení, čas, body, vzhled, způsob výsledku a zpětné vazby, toleranci, známkování a strukturu diferenciace.
- **Citlivý nebo jednorázový obsah se do šablon neukládá.** Šablona neobsahuje text zadání, URL, přílohy, podmínky skupin, jména studentů, API klíč ani učitelský přístupový kód.
- **Starší šablony `profile_v1` zůstávají načitatelné**, ale protože v nich jazyk/cvičení/čas nikdy uloženy nebyly, zobrazí se upozornění, že je potřeba nastavení jednou doplnit a šablonu uložit znovu.
- **Gemini HTTP 503 dostává omezený automatický retry.** Pokud celé první kolo modelových fallbacků skončí přechodnou 503, Generátor krátce počká a celé providerové kolo jednou zopakuje. Zrušení uživatelem během čekání zůstává funkční.
- Diagnostika nadále zachovává bezpečný HTTP stav, interní kód a souhrnný počet providerových pokusů.

## Bezpečnost a QA

- GARP 2.7 vazba a trust anchor aktualizovány pro 7.1.57.
- AI assurance fingerprint obnoven.
- CycloneDX SBOM vytvořen pro 7.1.57.
- Production-readiness kontrola nově hlídá rozsah bezpečného předvyplnění šablon a přítomnost 503 backoff retry.
