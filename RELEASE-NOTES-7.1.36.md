# Generátor testů 7.1.36 — Etapa 5 QA hotfix

Datum: 2026-09-15

## Rozsah

QA-only hotfix nad kandidátem 7.1.35. Produkční chování Etapy 5 se nemění.

## Oprava

`tools/headless-check.mjs` už nehledá neexistující formulaci „Jeden pokus na tomto zařízení“. Místo toho ověřuje skutečný význam finálního UI:

- blok výslovně uvádí, že ochrana platí v bezpečném offline režimu;
- uvádí, že další pokus na stejném zařízení je po odevzdání automaticky uzamčen;
- blok zůstává pouze informační a nesmí obsahovat nový ovládací prvek.

V CI 7.1.35 tato jediná assertion ukončila headless test před spuštěním `qa-generate-fixtures.mjs`. Chybějící `instant_test.html`, `student_test.html` a `teacher_verifier.html` pak vytvořily šest visual a tři critical ENOENT nálezy. Tyto nálezy nebyly poruchou exportního runtime.

## Neměněno

Secure/student runtime, teacher verifier, `SECURE-ANSWERS-V1`, Google Forms, RSA/AES kryptografie, scoring, PIN/odemčení a serverový profil.
