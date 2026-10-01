# Release notes – 7.1.63

Datum: 2026-10-01

## Etapa 3 – přímé PDF

Verze 7.1.63 zavádí dokumentovou/PDF vrstvu Teacher Verifieru. Učitel může přímo stáhnout skutečný PDF soubor bez tiskového dialogu ve dvou oddělených variantách: studentský test bez klíče a učitelský test s klíčem.

PDF se vytváří lokálně v prohlížeči bez serveru a bez externí PDF služby. Vykreslení probíhá přes browserový layout, takže zůstává zachována česká diakritika. Do PDF se vkládá školní logo jako embedded data URI; výsledný PDF soubor tedy není závislý na pozdější dostupnosti externích assetů.

Klasický tisk zůstává zachován jako fallback. Etapa 3 nemění scoring, RSA-OAEP/AES-GCM dešifrování, SECURE-ANSWERS-V1, kryptografickou selekci Google Forms ani logiku vyhodnocení výsledků.
