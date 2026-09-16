# Generátor interaktivních testů 7.1.41

Datum: 2026-09-16

## Účel

Tato verze je čistý kontrolní PATCH nad schváleným 7.1.40 baseline. Nemění pedagogické ani bezpečnostní chování aplikace. Jejím jediným účelem je end-to-end ověřit centrální auto-patch AI Studia.

## Co se mění

- verze runtime/PWA/QA metadat 7.1.40 → 7.1.41,
- nový SBOM a AI assurance fingerprint odpovídající 7.1.41,
- po úspěšném Pages deployi workflow odešle AI Studiu `repository_dispatch: app-updated`.

## Co se nemění

GARP 2.5/N5, platformní kontrakt 1.1.2, Studio Bridge v2, secure studentský runtime, teacher verifier, Google Forms workflow, scoring, RSA/AES ani AI operace.

## Akceptační podmínka Etapy 5

Etapa je uzavřena pouze tehdy, pokud AI Studio bez ruční úpravy samo detekuje nasazené 7.1.41, vyhodnotí změnu jako povolený patch, projde svými QA/P5 branami a persistuje 7.1.41 do release-wave baseline.
