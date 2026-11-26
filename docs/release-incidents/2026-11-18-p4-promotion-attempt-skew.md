# GIT 7.1.103 – nedokončené P4 povýšení a standardní nové povýšení

Datum incidentu: 18. listopadu 2026
Stav dokumentu: provozní záznam; nemění aplikaci ani bezpečnostní politiku

## Co se stalo

Kandidát `d38f46a3c7f78c326f2fcf81fb1100965a89924a` úspěšně prošel povinnými
P5/E10, Journey E2E, candidate-gate, pr-certification a release-admission.
Autentizované schválení vlastníka bylo zaznamenáno v review `5960109473` na
PR #145. Safe Promotion run `44335148921` následně sloučil kandidáta do `main`
jako commit `0de8f13f26100c7d42860b86e89094cc1ae94f74` se shodným Git tree
`07a048f5fe7fb03450949988a4465b12ebb35c9d`.

P4 certificate však nevznikl. Úspěšné candidate/pr artefakty pocházely z
pokusu 1, zatímco po opakování selhaných jobů producer běžel v pokusu 2 a
správně fail-closed požadoval current-attempt artefakty se suffixem `-2`.
Produkční deployment proto nebyl spuštěn.

## Rozhodnutí

Incident nebude řešen přejmenováním historických artefaktů, syntetickým P4
certifikátem, přímým Pages deploymentem ani opětovným sloučením PR #145.
Nebude přidáváno jednorázové recovery schema ani měněna GitHub Pages branch
policy.

Verze 7.1.103 bude znovu povýšena standardním procesem:

1. `candidate` se fast-forward synchronizuje s aktuálním `main`.
2. Tento dokumentační commit vytvoří nový, otevřeně vykázaný source SHA/tree;
   nemění verzi ani běhové soubory aplikace.
3. Automatizace vytvoří nový PR `candidate → main` a provede úplné certifikace
   na novém source SHA.
4. Nové schválení vlastníka musí být autentizovanou `APPROVED` review svázanou
   s novým PR, source SHA/tree a prepared-main SHA.
5. Následné povýšení musí být nový úplný `workflow_dispatch` běh na ref
   `candidate`, nikoli rerun původního runu `44335148921`.
6. P4 producer, consumer i Pages deployment zůstávají beze změny a musí projít
   standardním exact-run/attempt/artifact kontraktem.

## Neměnné provozní zásady

- Aplikační verze zůstává `7.1.103`.
- Stage08 není součástí tohoto vydání.
- PR #145 zůstává historicky uzavřený a nebude znovu slučován.
- Každý nový FAIL zastaví povýšení; žádný gate nesmí být obejit nebo oslaben.
- Produkční nasazení je povoleno teprve po nové exact-SHA certifikaci a novém
  owner approval pro nový PR.
