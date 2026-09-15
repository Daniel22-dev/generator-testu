# Generátor testů 7.1.33 — Etapa 3: Google Forms CSV import

Datum: 2026-09-15

## Rozsah

Tato etapa mění pouze učitelský `teacher_verifier.html` bezpečného offline testu. Studentský test, formát `SECURE-ANSWERS-V1`, RSA-OAEP/AES-GCM kryptografie, PIN/odemčení, generování testu a serverový profil se nemění.

## Nové chování

Verifier obsahuje sekci **Import z Google Forms (CSV)**. Importer:

- podporuje pouze CSV (nikoli XLSX),
- automaticky rozpozná čárku, středník nebo tabulátor,
- korektně parsuje quoted multiline buňky,
- hledá celý odevzdávací blok `SECURE-ANSWERS-V1`, nikoli krátký jednorázový studentský kód,
- volitelně rozpozná e-mail a časové razítko formuláře,
- ignoruje ostatní sloupce,
- každý payload předá existující `verifyText()` cestě: Test ID → manifest → SHA-256 studentského HTML → RSA/AES dešifrování → scoring,
- označí chybějící, vícenásobný, poškozený nebo cizí payload jako `CHYBA`,
- ponechává stávající kontrolu duplicit podle studenta/kódu a `attemptId`,
- přenáší Forms metadata také do výsledkového CSV/indexu/JSON archivu.

## Bezpečnostní omezení

E-mail a čas formuláře jsou pouze metadata o odevzdání a nemění důvěryhodnost zašifrovaného payloadu ani výsledek bodování. Neplatný payload se nesmí opravovat ani přijímat jen proto, že přišel z formuláře.

## QA

Přidána headless regresní kontrola, která vytvoří skutečný RSA-OAEP + AES-GCM secure payload, vloží jej do multiline CSV s českými Forms hlavičkami a ověří:

- validní dešifrování a skóre,
- e-mail a čas formuláře,
- duplicitní student/kód a `attemptId`,
- chybějící payload,
- cizí/poškozený payload,
- čárkový i středníkový CSV export.

Release je kandidát do čistého exact-lockfile GitHub CI.
