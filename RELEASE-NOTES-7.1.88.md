# GIT 7.1.88 – opravy workflow

Výběr typů a podrobné nastavení nyní vytvářejí stejný seznam cvičení. Sbalení panelu zachovává položky, body i ruční režim. Reading a Listening se nastavují v samostatných dialozích a lze je znovu upravit. Náhradní termín může používat jen vybrané studenty nebo odložené doplnění kódů bez opakovaného generování otázek.

## Opravy

- Globální typy jsou unikátní. Staré skryté řádky se při načtení zahodí; při změně výběru se nastavení zachová podle typu, nikoli podle starého indexu.
- Autorita uložených detailních řádků je oddělená od viditelnosti panelu. Zmenšení odstraní řádky; nové řádky v detailu vyžadují výslovnou volbu typu. Změna typu ruší předchozí ruční režim a obnoví správný počet položek.
- Reading/Listening dialogy přesouvají skutečné formulářové prvky, nevytvářejí druhé kopie dat. Podporují uložení, zrušení rozepsaných změn, Escape, obnovení fokusu a přehled Nastaveno/Upravit. Listening může přímo přijmout URL či soubor přes stávající zdrojový pipeline.
- Přesná oprava chyb přijímá celou větu i celý změněný úsek odvozený z klíče. Neakceptuje libovolné podřetězce či neúplnou opravu několika chyb. Deklarované alternativy a pravidla hodnocení češtiny zůstávají autoritativní.
- Soukromý seznam účastníků nabízí celou skupinu, vybrané studenty a doplnění později. Odložení je podporováno pro bezpečný offline test bez diferenciace. Stažení zůstává uzamčené, dokud nejsou účastníci skutečně použiti v hotovém testu.
- Přebalení účastníků nemění otázky a nevolá AI. Vytváří nový pár student/verifier a nové Test ID, resetuje technické i učitelské kontroly. CSV se nesmí stáhnout s kódy odlišnými od hotového balíčku.
- Hláska o „složitých cvičeních“ již neslibuje neexistující pevné dělení požadavků. Plánování dávek podle velikosti a struktury zůstává zachované.
- PWA zachytává také odmítnutý asynchronní update a zakázaný přístup ke service workeru v sandboxovaném náhledu.

## Regresní pokrytí

`check:workflow-update` ověřuje 13 funkčních scénářů včetně emitovaného verifieru a skutečného ručního editoru. `check:workflow-update-browser` ověřuje 7 scénářů v nativním Chromium včetně modalu, Escape, výběru účastníků a šířky 390 px. Obě sady jsou součástí P5; funkční sada i `npm test`.

Pro konečnou certifikaci se spouští stávající neměnný řetězec `npm run qa:redteam:ci`: npm test → GARP 2.7 foundation → P5 CI → admission čerstvých důkazů. Přesné SHA, remote CI a produkční nasazení se ověřují samostatně.

## Praktické omezení

Po změně účastníků stáhni a použij nový studentský soubor i odpovídající verifier. Dříve rozdané statické soubory nelze serverless změnou odvolat. Doplnění účastníků je proto určeno před zahájením testování; již rozběhnuté pokusy se do nového Test ID nepřenášejí. Diferencovaný test vyžaduje aktualizaci kódů ve skupinách a standardní sestavení.

Rozsah stávajícího schválení zůstává řízená studentská red-team zkouška. E6 je odložené, Forms jsou potvrzené vlastníkem a fyzické E7 je naplánované na 6. a 9. 10. 2026. Test na 390px viewportu fyzické ověření mobilu nenahrazuje. Živá AI nebyla součástí lokálních syntetických scénářů.
