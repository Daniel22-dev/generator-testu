# Generátor interaktivních testů 7.1.43

Datum: 2026-09-18

## Účel

Metadata-only cleanup patch Etapy 6. Nemění aplikační logiku ani pedagogické workflow.

## Oprava

Pre-release `release-acceptance.json` byl historicky uložen pod `public/config/`, a build proto kopíroval časově omezené hodnoty jako `not-yet-uploaded` do produkčního runtime artefaktu. To po úspěšném deployi vytvářelo zastaralý veřejný stavový dokument.

7.1.43 přesouvá tento soubor do `src/config/`. P5 jej nadále používá jako zdrojový pre-release vstup, ale současně fail-closed ověřuje, že `dist/config/release-acceptance.json` neexistuje.

## Autoritativní live evidence

Aktuální produkční stav je dokazován prostřednictvím:

- `release-integrity.json`,
- živého `studio-manifest.json`,
- AI Studio `release-wave`,
- chráněného GitHub P5 / Safe Promotion / Pages deploy řetězce.

## Neměněné oblasti

GARP 2.5/N5, GHRAB Platform 1.1.2, Studio Bridge v2, secure studentský runtime, teacher verifier, Google Forms workflow, scoring, kryptografie a AI operace.
