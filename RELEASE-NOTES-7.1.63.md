# Release notes – 7.1.63

Datum: 2026-10-01

## Etapa 3 – přímé PDF

Verze 7.1.63 zavádí dokumentovou/PDF vrstvu Teacher Verifieru. Učitel může přímo stáhnout skutečný PDF soubor bez tiskového dialogu ve dvou oddělených variantách: studentský test bez klíče a učitelský test s klíčem.

PDF se vytváří lokálně v prohlížeči bez serveru a bez externí PDF služby. Vykreslení probíhá přes browserový layout, takže zůstává zachována česká diakritika. Do PDF se vkládá školní logo jako embedded data URI; výsledný PDF soubor tedy není závislý na pozdější dostupnosti externích assetů.

Klasický tisk zůstává zachován jako fallback. Etapa 3 nemění scoring, RSA-OAEP/AES-GCM dešifrování, SECURE-ANSWERS-V1, kryptografickou selekci Google Forms ani logiku vyhodnocení výsledků.

## Rekalibrace performance budgetu

Etapa 3 legitimně rozšířila klientský bundle o lokální PDF vrstvu. Statické velikostní budgety byly proto jednorázově rekalibrovány s přibližně 5–8% rezervou: `distBytes` 2,60 MB, `entryHtmlBytes`/`largestFileBytes` 1,60 MB, `entryCriticalBytes` 1,75 MB a `precacheBytes` 2,20 MB. Bezpečnostní a runtime limity, `largestInlineScriptBytes` i `duplicateLargeBytes` zůstávají beze změny.
