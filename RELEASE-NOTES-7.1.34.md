# Generátor testů 7.1.34 — Etapa 4: studentské odevzdání přes Google Forms

Datum: 2026-09-15

## Rozsah

- V Nastavení Generátoru lze uložit pouze validovaný responder URL školního Google Formuláře (`https://docs.google.com/forms/.../viewform` nebo `https://forms.gle/...`). Editor URL, HTTP a jiné domény jsou odmítnuty fail-closed.
- URL je lokální nastavení zařízení a nevstupuje do historie zadání ani šablon. Použije se pouze u nově generovaných secure testů a je zahrnuto do integrity-bound konfigurace.
- Student po secure odevzdání primárně zkopíruje celý `SECURE-ANSWERS-V1` payload a otevře školní Google Form. Payload se nepředvyplňuje do URL.
- `answers.txt` zůstává nouzový fallback. Bez Forms konfigurace zůstává původní TXT workflow; nad konzervativním limitem 24 000 znaků se Forms cesta automaticky vypne ve prospěch TXT.
- Studentské instrukce se při aktivním Forms workflow přepnou tak, aby Form byl primární cesta a TXT pouze záloha.

## Beze změny

- RSA-OAEP + AES-GCM kryptografie a formát `SECURE-ANSWERS-V1`.
- Sdílené scoring jádro, PIN/odemčení a attempt mechanismus.
- Učitelský verifier a CSV import z Etapy 3.
- Instant/practice runtime a serverový profil.

## Ověření kandidáta

- Cílený systémový Chromium E2E pokrývá kopii přesného payloadu, otevření responder URL, `forms.gle`, fail-closed cizí doménu, 24k fallback, device/submit texty a legacy režim bez Forms.
- GARP, XSS ratchet, platformní/quality, technical/security, SW/offline, SBOM a integrity evidence musí zůstat zelené bez zvýšení baseline.
- Finální povýšení vyžaduje čistý exact-lockfile GitHub CI běh 7.1.34.
