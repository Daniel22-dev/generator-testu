# GIT 7.1.96 — candidate

Maintenance release Teacher Verifieru navazující přímo na 7.1.95.

## Oprava času Google Forms

- Učitel už nezadává ISO 8601 ani UTC offset. UI používá **Datum zveřejnění** + **Čas zveřejnění** (např. `13:20`).
- Datum se při otevření předvyplní dnešním datem v `Europe/Prague`.
- Verifier interně vytvoří přesný offsetový ISO timestamp a automaticky rozlišuje CET/CEST.
- Neexistující a dvojznačné DST wall-times zůstávají fail-closed.
- Volitelný **Konec příjmu** používá stejný Datum + Čas model.

## Univerzální Google Form

- `Limit to 1 response` je podporovaně **OFF**; verifier už nevyžaduje `oneResponseConfirmed`.
- Povinné zůstává: ověřený školní e-mail, omezení na školní doménu a potvrzení, že CSV je původní nezměněný export z Google Forms.
- Kontrola identity proti soukromému rosteru, CSV vazby a replay/duplicate/multiple-attempt detekce se nemění.

## Regrese a release chain

- E3 pokrývá Prague timestamp, CET, CEST, neplatný/chybějící čas a Form s `Limit to 1 response = OFF`.
- Browser/journey helpery používají nové Datum + Čas UI a explicitně ověřují odstranění starého checkboxu.
- Studentský secure runtime, scoring a oprava teacher preview z 7.1.95 nejsou změněny.
- Verze/PWA cache posunuty na 7.1.96; assurance fingerprint, SBOM a GARP 2.7 binding/trust piny jsou synchronizované.
