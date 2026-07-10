# Checklist před produkčním vydáním

## Povinné automatické kontroly

- [ ] `npm ci` proběhlo bez chyby.
- [ ] `npm test` skončilo úspěšně včetně `test:workflow`.
- [ ] `npm run test:headless` skončilo úspěšně.
- [ ] `npm audit --audit-level=high` nehlásí známou závažnou zranitelnost.
- [ ] Verze je shodná v package, RELEASE, service workeru a manifestu.
- [ ] Produkční ZIP neobsahuje `node_modules/`, `dist/`, lokální screenshoty, cache ani testovací tajné údaje.

## Funkční kontrola

- [ ] Aplikace se otevře na desktopu i telefonu.
- [ ] Funguje jednoduchý i pokročilý režim.
- [ ] Workflow matice hlásí 0 FAIL a souvislý průchod všemi čtyřmi kroky končí neprázdným promptem.
- [ ] Funguje angličtina, španělština, němčina a čeština podle podporovaného rozsahu.
- [ ] Lze vytvořit běžný test i secureOffline balík.
- [ ] Studentský HTML neobsahuje answer key.
- [ ] Učitelský verifier načte zkušební `answers.txt`.
- [ ] Platný diferenciační kód otevře správnou variantu.
- [ ] Neplatný diferenciační kód je odmítnut.
- [ ] PWA se po aktualizaci nevrací ke staré cache.

## Ochrana dat

- [ ] Testovací jména v diferenciaci se v promptu objeví pouze jako anonymní kódy.
- [ ] V UI není možnost odesílat skutečná jména studentů do AI.
- [ ] Studentský HTML neobsahuje čitelný seznam jmen nebo kódů skupin.
- [ ] Veřejný roster obsahuje jen `studentHashes` a náhodnou sůl testu.
- [ ] Pro ostrý diferencovaný test jsou použity náhodné jednorázové kódy, ne jména.
- [ ] Před prvním AI požadavkem v relaci se zobrazí informace o přenosu dat.
- [ ] V repozitáři není API klíč, heslo, ostrý seznam uživatelů, verifier ani studentský výsledek.
- [ ] Dokumentace a interní poradce odpovídají skutečnému chování aplikace.

## Obsahová a vizuální kontrola

- [ ] Jeden reálný test zkontroloval učitel po obsahové stránce.
- [ ] Self-test bodování nemá FAIL.
- [ ] AI kontrola klíče je chápána jen jako pomocná kontrola.
- [ ] Mobilní hlavička, formulář a hlavní dialogy jsou ovladatelné bez překryvů.
- [ ] Klávesnicový fokus je viditelný.
- [ ] Důležitá ikonová tlačítka mají přístupný název.
- [ ] Audit přístupnosti nehlásí WCAG A/AA porušení v hlavním scénáři.
- [ ] Chybové zprávy neuvádějí neověřené pevné hodnoty kvót.

## Provozní připravenost

- [ ] Je určena odpovědná osoba za vydání a incidenty.
- [ ] Uživatelé znají pravidla pro API klíč a anonymizaci.
- [ ] Je připraven postup pro reload/pád zařízení během testu.
- [ ] Je určeno bezpečné úložiště výsledků a doba uchování.
- [ ] Teacher verifier nebude zveřejněn ani předán studentům.

## Vydání

- [ ] Changelog obsahuje nový záznam a nejvýše deset položek.
- [ ] Datum vydání je správné.
- [ ] GitHub Actions prošly buildem a testy.
- [ ] Správce provedl smoke test nasazené URL.
- [ ] Uživatelé dostali stručnou informaci o významných změnách.
