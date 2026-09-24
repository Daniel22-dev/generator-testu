# Release notes 7.1.50 — GARP 2.7 r2 / G-02 FIX

Datum: 2026-09-24

## Co se mění

Release 7.1.50 převádí Generátor testů na aktivní bezpečnostní kontrakt **GARP 2.7 r2 / G-02 FIX**. Jde o bezpečnostní a governance migraci; funkční logika tvorby testů se záměrně nemění.

- normativní GARP 2.7 r2 master je vendored a hashově připnutý;
- přidána aplikační policy, capability inventory, migration profile, LIVE status a trust anchor;
- přidány contract, architecture-integrity, G-02 policy mutation, G27-AR mutation, auto-patch a FOUNDATION brány;
- CI vyžaduje externí SHA-256 pin trust anchoru;
- build nově fail-closed ověřuje přesnou nainstalovanou verzi Acorn proti `package.json`;
- GARP 2.5.1/N5 zůstává povinnou regresní vrstvou;
- zachována datová třída **D3** a profil **AGENTIC=PARTIAL** kvůli teacher-opt-in `url_context`;
- school-server fáze zůstává `DEFERRED_BY_OWNER_DECISION`, LIVE stav je `NOT_TESTED`.

Exact release důkaz dodává GitHub CI nad tímto konkrétním candidate commitem.
