# Release notes 7.1.51 — universal Reading AI registry hotfix

Datum: 2026-09-25

## Duvod vydani

Pri realnem ucitelskem workflow se zdrojovym podkladem a Reading comprehension byla operace `reading-source-analysis` odmitnuta GHRAB AI Core jako `UNREGISTERED_OPERATION`. Verejny AI kontrakt ji obsahoval, ale runtime registr `GEN_AI_OPERATIONS` nikoli.

## Opravy

- runtime registr nově obsahuje `reading-source-analysis`;
- `reading-package-suggestion` povoluje `text`, `image` a `document`, aby fungoval i nad obrazovymi a dokumentovymi podklady;
- současně byl odstraněn starší drift veřejného registru u `generator-help-answer`; Poradce zůstává podle záměru od 7.1.45 na profilu `balanced` / `balanced, quality`;
- pridana fail-closed kontrola `scripts/check-ai-operation-registry.mjs`, ktera porovnava runtime registr s verejnym kontraktem a normalizuje pouze vstupni typy podporovane GHRAB AI Core 1.0.0;
- kontrola parity je soucasti `prebuild` i `qa:garp23`;
- workflow QA obsahuje end-to-end regresní matici pro celou dvoufázovou cestu `reading-source-analysis` → `reading-package-suggestion` v Simple/Advanced a pro procvičovací, běžný i přísný účel testu.

## Bezpecnostni dopad

Fail-closed chovani AI Core se nemenilo. Chyba nebyla obchazena vypnutim validace; byla opravena registrace povolene operace a pridana kontrola, ktera ma stejnou tridu driftu zachytit pred vydanim.

## Rozsah

Serverova/LIVE cast GARP 2.7 zustava odlozena podle stavajiciho rozhodnuti. Tento patch meni pouze aplikacni AI registr, souvisejici QA a release metadata.

## Lokální ověření tohoto kandidáta

- `check:ai-operations`: PASS (11/11 operací);
- `qa:garp23`: PASS (82/82 + suite-session 20/20);
- AI assurance fingerprint a CycloneDX SBOM: PASS/current;
- přesný jsdom/browser workflow a produkční build musí doběhnout v GitHub CI, protože v lokálním auditním prostředí nebylo možné stáhnout chybějící npm závislosti.
