# Generator testu - GARP 2.7 r2 migration assessment

Datum: 2026-09-24  
Aplikace: `generator` / Generator testu 7.1.50  
Aktivni kontrakt: GARP 2.7 / konsolidace `2026-09-23-r2`  
Vstupni aplikacni ZIP SHA-256: `21cd1544de2ac27832eef1503bca9c2d503b21b4fa4596b07707a4cd4f9c43d3`  
GARP r2 vstupni ZIP SHA-256: `0c278aefa0581b3ba13dd5725da9d3fc624976c255602ec16b054fc81da6f7c8`

## Rozhodnuti

Generator byl preveden z GARP 2.5.1/N5 baseline na aktivni GARP 2.7 r2 bez odstraneni nebo prejmenovani existujicich ochran. GARP 2.5.1 tooling a evidence zustavaji povinnou regresni vrstvou.

Migrace je zamerne adapterova: normativni GARP 2.7 master a aplikacni verification nastroje nejsou importovany do produkcniho browser runtime. Funkcni workflow Generatoru se timto releasem nemeni.

## Zachovane hranice

- klasifikace dat zustava **D3**;
- agentni profil zustava **AGENTIC=PARTIAL** kvuli teacher-opt-in provider-side `url_context`;
- zadny autonomni lokalni tool loop, MCP executor ani modelove spoustene aplikacni side effects nebyly pridany;
- standalone egress zustava explicitni `direct-gemini`; skolni profil zustava provider-neutralni `school-gateway` a je nepripojeny;
- realna D3 studentska data nejsou timto lokalnim kolem schvalena pro externi AI egress.

## GARP 2.7 dopad

- `generator` je overovan proti trusted ecosystem inventory;
- policy admission pouziva r2 G-02 semanticky validator;
- capability inventory vazne sleduje 11 AI operaci a jedinou provider capability `url_context`;
- architecture gate kontroluje zdrojove dependency hrany, produkcni artefakt, capability drift, trusted digests, single active authority a CI trust pin;
- vlastni mutation testy prokazuji fail-closed chovani pri unknown app, neplatne verzi, placeholder policy, neinventarizovane AI operaci/toolu, oslabeni school egressu, self-editu gate a vendor driftu;
- auto-patch kontrakt je navazan na existujici verified-release `app-updated` workflow a nevydava LIVE tvrzeni.

## Lokalni validace tohoto kola

Provedeno a PASS:

- GARP 2.7 package selftest 19/19;
- GARP 2.7 reference contract selftest 25/25 vcetne G-02 5/5;
- Generator contract gate 6/6;
- Generator G-02 policy mutations 6/6;
- Generator auto-patch contract vcetne staticke vazby na release dispatch;
- G27-AR architecture checker selftest na syntetickem production fixture 54/54;
- G27-AR mutation suite na syntetickem fixture 10/10;
- verze 7.1.50 sedi napric zdrojovymi/runtime kontrakty;
- legacy GARP 2.5.1 tooling selftest 59/59.

Lokalni clean build a tim i pozitivni production-artifact cast architecture/foundation gate nebyly v tomto prostredi dokonceny, protoze exact-lockfile dependency install nema kompletni lokalni npm cache (`yocto-queue@0.1.0` chybi) a sitovy install predtim vyprsel. Architecture gate tento stav spravne klasifikuje jako FAIL misto falesneho PASS. Autoritativni plny vysledek proto musi dodat exact GitHub CI po nahrani kandidata.

## Server/LIVE

School-server faze zustava `DEFERRED_BY_OWNER_DECISION`. Zadny novy serverovy endpoint, Fortinet zmena ani infrastruktura se v tomto patchi nepridava. LIVE stav zustava `NOT_TESTED`.

## Governance

Technicky nalez G-02 je v aplikacnim adapteru pokryt r2 validatorem a negativnimi testy. G-01 (formalni governance prijeti normativni autority) je samostatny vlastnicky krok a technicky patch jej neoznacuje za automaticky schvaleny.
