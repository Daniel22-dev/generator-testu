# GARP 2.7 cross-app review - Ludus / Korespondencni asistent / Generator

Datum: 2026-09-24

Generator byl pri migraci porovnan s aktualnim r2/G-02 vzorem Korespondencniho asistenta a s GARP 2.7 strukturou Ludusu.

Shodne ekosystemove principy:

- GARP 2.7 je aktivni autorita, legacy GARP zustava regresni zaklad;
- normativni GARP master je oddelen od produkcniho runtime;
- LIVE serverova tvrzeni se pri odlozene serverove fazi nepromenuji na PASS;
- auto-patch musi prokazat release identity, gate admission a bounded dispatch;
- CI pouziva externi trust pin a nepripousti self-approval trust anchoru;
- G-02 policy admission odmita unknown appId, 0.0.0/neplatny semver a semanticky prazdne/placeholder policy.

Generator-specificke odchylky jsou zamerne zachovany:

- D3 misto nizsi datove tridy;
- AGENTIC=PARTIAL kvuli fixed teacher-opt-in `url_context`;
- 11 registrovanych AI operaci;
- existujici secure-offline / Forms / test-generation hranice;
- standalone `direct-gemini` a nepripojeny school `school-gateway` profil.

Cross-app review proto nevynucuje byte-identickou aplikacni implementaci. Vynucuje stejny GARP 2.7 contract model a fail-closed governance pri zachovani realnych capability hranic kazde aplikace.
