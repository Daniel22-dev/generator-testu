# GIT 7.1.90 – opravy cíleného auditu před studentským testováním

Vychází z 7.1.89 a integruje opravy z cíleného auditu bodů 1–10 před řízeným studentským testováním.

## Opravy

- Úlohy s mezerou `___` (word formation, sentence/key word transformation): uzná se doplnění i celá správná věta. Bez mezery zůstává nutná přesná odpověď. Error correction zachovává kontrakt 7.1.89: celá opravená věta nebo přesný změněný úsek.
- Randomizace: stabilní pořadí po obnovení stránky; verifier dopočítá číslo otázky, které student viděl; slova u error-tagging se nemíchají; instant feedback respektuje pořadí studenta.
- Výsledky: typ cvičení a navigace „Vyberte studenta ▼“ ve verifieru, feedback HTML a archivu.
- iOS/iPadOS: výjimka pro softwarovou klávesnici i na iPhonu; omezení falešných split/fullscreen signálů při psaní; delší ztráta fokusu po klávesnici se zapisuje jako měkký signál.
- Studenti: pokyn zapnout Nerušit / Soustředění ve čtyřech jazycích.
- Bezpečnostní a release metadata: GARP 2.7 trust anchor, AI assurance fingerprint, SBOM a E10 readiness jsou svázány s 7.1.90.

## Automatizované ověření

Do CI jsou přidány deterministické regresní kontrakty `check:productive-contract` a `check:randomization-numbering`. Stávající P5, GARP, workflow a browser brány zůstávají beze změny a musí projít nad přesným SHA kandidáta.

## Omezení a manuální gate

Plovoucí mobilní oznámení webová aplikace sama spolehlivě nevidí. Krátká ztráta fokusu bezprostředně po psaní na iOS se nezamyká, aby se zabránilo falešnému zámku při zavření klávesnice. Automatizovaná emulace nenahrazuje fyzické zařízení.

Release scope zůstává **CONTROLLED_STUDENT_RED_TEAM_ONLY**. Před spoléháním na mobilní guard při ostrém testu musí proběhnout fyzické scénáře na iPhone/iPad/Android; absence klientských auditních signálů není důkazem, že student nepoužil jiné zařízení.
