# Generator testů 7.1.20 — GARP 2.3 post-second-Claude repair candidate

Status: **NEVYDÁVAT / NENASAZOVAT**. Po druhém nezávislém Claude kole byl v K2 potvrzen HIGH release-integrity regresní nález. Verze 7.1.20 opravuje potvrzené body, ale podle GARP 2.3 vyžaduje nový, uživatelem výslovně zahájený nezávislý review cyklus.

## Opravy
- C2-01: odstraněna souvislá sekvence `</script>` z inlinovaného JS zdroje učitelského verifieru; runtime skládá ukončovací značku až při vykonání.
- C2-02: `artifact.imports` je sjednoceno na `generator-testu-zadani` v consumer a platform manifestu, v souladu s pravdivým data-manifestem.
- C2-03: povinný `npm test` nyní používá `npm run build` (včetně pre/postbuild konformity) a headless kontrolu přesného výsledného `dist`.
- C2-04: XSS ratchet zamyká `documentWrite` na 0.
- C2-05: výkonové budgety byly navýšeny pouze o malou rezervu po bezpečnostním hardeningu: entry HTML 1.470 MB, critical 1.655 MB, precache 2.130 MB, largest file 1.470 MB. Jde o <1% provozní headroom, nikoli uvolnění bezpečnostní kontroly.
- Přidán source-level guard proti souvislému `</script>` v inlinovaných JS zdrojích a jeho negativní kontrola v auditní evidenci.

## Evidence
Vendorovaný `security/garp23-ai-red-corpus.json` byl v tomto kole porovnán s originálním `07-AI-RED-TEST-CORPUS.json` z přiloženého GARP 2.3 balíčku: byte-for-byte shoda a shodný SHA-256.
