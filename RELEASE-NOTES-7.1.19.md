# Generátor testů 7.1.19 — GARP 2.3 K2

Datum: 2026-08-30
Stav: bezpečnostní kandidát pro druhou nezávislou kontrolu Claude; ne finální release.

## Bezpečnostní změny po kontrole K1

- Opravena neošetřená AI→AI cesta `acceptable-answer-enrichment`: předchozí modelový výstup a klíče odpovědí jsou explicitně vedeny jako nedůvěryhodná data.
- PC-01 nově enumeruje všech 13 aplikačních `callGeminiJSON` cest včetně lazy feature modulů a negativní kontrolou prokazuje detekci nové nepokryté cesty.
- Povinný GARP 2.3 AI-RED corpus je součástí source-only QA evidence s připnutým SHA-256; bez něj bezpečnostní harness neprojde.
- Volný text podmínek diferenciace před AI egressem pseudonymizuje identifikátory známé ze seznamu studentů/kódů.
- `generatorEndWork()` čistí další in-memory testová data, roster, file promises a stav s odpověďovým klíčem.
- Odstraněny dva same-origin execution sinky generovaného HTML; tiskový náhled běží v opaque sandboxu s CSP.
- Přidána regrese, že studentský secure balík neobsahuje syntetický answer-key canary napříč 21 kanonickými typy cvičení.
- Syntetická PEM self-test fixture už není v produkčním zdroji uložena jako souvislá PEM hlavička.

## Release gate

K2 zůstává **AMBER** do druhé nezávislé kontroly Claude a do doplnění browser/live-model/centrálního guardu a dalších GARP runtime důkazů. Reálná studentská data se pro tento kandidát nepoužívají.
