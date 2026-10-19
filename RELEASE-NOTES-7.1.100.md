# GIT 7.1.100 V7 — konsolidovaná bezpečnostní a výuková aktualizace

Datum přípravy: 18. 10. 2026

## Co vydání přináší

- oddělené a zpevněné oprávnění Recovery, Teacher a Admin bez ukládání surových přístupových údajů,
- pedagogicky věrné typy cvičení, jednotné názvy, počty a bodování,
- zachování identity, pokusu, odpovědí a časových hranic při podporovaných obnoveních,
- Teacher Verifier 2.0 s pravdivou bezpečnostní telemetrií, karanténou a kompatibilními CSV exporty,
- Strict Mode Guard V2 s dvoufázovým fullscreen startem; split-screen zůstává pouze SHADOW/AUDIT-ONLY,
- didaktický AI posudek, doporučování formátů a validovaný katalog 38 pedagogických stylů,
- zpřesněné Forms, Sheets, Apps Script a učitelské workflow,
- sjednocené Linux/Windows certifikační brány, GARP 2.7 trust chain a aktualizovaný AI assurance fingerprint.

## Zachované bezpečnostní hranice

Automatický split-screen LOCK není aktivní. T110 zůstává SERVER-DEFERRED. Klientská telemetrie není serverová autentizace a podezřelé nebo neúplné výsledky vyžadují učitelskou kontrolu. Skutečné iPady, ostatní mobilní prohlížeče, živý školní Google Forms/Sheets/MailApp a živý Gemini transport nejsou tímto zdrojovým vydáním vydávány za automaticky ověřené.

## Vydávací podmínka

Produkční povýšení je dovoleno pouze existujícím chráněným procesem: přesný release SHA musí projít P5, Journey E2E, dvěma nezávislými candidate/PR certifikacemi, ochranou `main` a následným ověřením identity skutečně nasazeného artefaktu.
