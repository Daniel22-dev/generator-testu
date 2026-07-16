# Checklist před produkčním vydáním

## Povinné automatické kontroly

- [ ] `npm ci` proběhlo bez chyby.
- [ ] `npm run check:lockfile` potvrzuje 0 interních registry URL.
- [ ] `npm test` skončilo úspěšně včetně workflow matice.
- [ ] `npm run test:headless` skončilo úspěšně bez neočekávaných warnů.
- [ ] `npm audit --audit-level=high` nehlásí závažnou zranitelnost.
- [ ] Verze je shodná v package, RELEASE, service workeru a manifestu.
- [ ] `npm run check:precache` potvrzuje existenci všech PWA aktiv.
- [ ] `npm run check:timers` potvrzuje deadline časovače obou runtime.
- [ ] Produkční ZIP neobsahuje `node_modules/`, lokální `dist/`, `archive/`, screenshoty, cache ani testovací tajné údaje.

## Funkční kontrola

- [ ] Aplikace se otevře na desktopu i telefonu.
- [ ] Centrální permit AI Studia odemkne aplikaci; bez permitu zůstává build inertní.
- [ ] Funguje jednoduchý i pokročilý režim.
- [ ] Workflow matice hlásí 28 PASS / 0 FAIL.
- [ ] Fungují podporované jazyky a český modul.
- [ ] Lze vytvořit instantní test i secureOffline balík.
- [ ] Studentský HTML neobsahuje answer key ani soukromý klíč.
- [ ] Učitelský verifier načte zkušební `answers.txt`.
- [ ] Platný jednorázový kód otevře správnou variantu a neplatný je odmítnut.
- [ ] Test s limitem 1 minuta se po dvou minutách v jiné aplikaci automaticky ukončí.
- [ ] PWA service worker je `activated` a cache má aktuální verzi.
- [ ] Offline reload dojde alespoň k centrální bráně / poslední známé cache.
- [ ] Nová verze neprovede automatický reload rozpracované práce.

## Ochrana dat a exportů

- [ ] Skutečná jména se v promptu objeví pouze jako anonymní kódy.
- [ ] Studentský HTML obsahuje jen `studentHashes` a náhodnou sůl.
- [ ] Pro ostrý diferencovaný test jsou použity náhodné jednorázové kódy.
- [ ] Před prvním AI požadavkem se zobrazí informace o přenosu dat.
- [ ] V repozitáři není API klíč, heslo, e-mail, rodné číslo, ostrý roster, verifier ani studentský výsledek.
- [ ] CSV se jménem `=1+1` zobrazí text, nikoli vypočtenou hodnotu.
- [ ] Simulované zaplnění `localStorage` vyvolá varovný toast a uložení šablony nehlásí úspěch.

## Obsahová a vizuální kontrola

- [ ] Jeden reálný test zkontroloval učitel po obsahové stránce.
- [ ] Self-test bodování nemá FAIL.
- [ ] AI kontrola klíče je chápána jen jako pomocná kontrola.
- [ ] Mobilní hlavička, formulář a hlavní dialogy jsou ovladatelné bez překryvů.
- [ ] Klávesnicový fokus je viditelný a ikonová tlačítka mají přístupný název.
- [ ] Chybové zprávy neuvádějí neověřené pevné hodnoty kvót.

## Provozní připravenost

- [ ] Je určena odpovědná osoba za vydání, revokace a incidenty.
- [ ] Uživatelé znají pravidla API klíče, anonymizace a offline permitu.
- [ ] Je připraven postup pro reload, pád zařízení a nový pokus.
- [ ] Je určeno bezpečné úložiště výsledků a doba uchování.
- [ ] Teacher verifier nebude zveřejněn ani předán studentům.

## Vydání

- [ ] Changelog obsahuje nový záznam a nejvýše deset položek.
- [ ] Datum vydání je správné.
- [ ] GitHub Actions prošly instalací, testy, auditem a deployem.
- [ ] Správce provedl smoke test nasazené URL.
- [ ] Uživatelé dostali stručnou informaci o významných změnách.
