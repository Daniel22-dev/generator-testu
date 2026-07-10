# Provozní pravidla Generátoru interaktivních testů

Tato pravidla platí pro oficiální řízené používání produkční serverless verze 7.0.1 učiteli. Technické hranice doplňuje `SECURITY.md`.

## 1. Účel a odpovědnost

Generátor je pomůcka pro přípravu výuky. Nenahrazuje odborné ani klasifikační rozhodnutí učitele.

Před použitím učitel vždy ověří:

- věcnou a jazykovou správnost,
- správné odpovědi a bodování,
- přiměřenost obtížnosti,
- srozumitelnost pokynů,
- funkčnost na zařízení studentů,
- soulad s cílem hodiny a pravidly hodnocení.

AI kontrola klíče ani automatický self-test nenahrazují pedagogickou kontrolu člověkem.

## 2. Data a anonymizace

Identity uvedené v diferenciačních skupinách generátor před AI požadavkem automaticky nahrazuje anonymními kódy. Ve studentském HTML používá pouze solené hashe identifikátorů.

Pro ostré diferencované testy učitel používá náhodné jednorázové kódy. Běžná jména se nepoužívají, protože hashovaný seznam s veřejnou solí může být napadnutelný hádáním známých jmen.

Do volných textů, URL, podmínek skupin ani příloh se nesmějí vkládat osobní nebo citlivé údaje. Zakázáno je zejména odesílat do AI:

- zdravotní nebo psychologické informace a diagnózy,
- kázeňské případy,
- rodná čísla, adresy, telefonní čísla a soukromé kontakty,
- individuální hodnocení propojené s identitou,
- interní dokumenty bez oprávnění k externímu zpracování.

Podpůrná opatření se popisují obecně pedagogickým jazykem. Před každým odesláním učitel zkontroluje text, URL i přílohy.

## 3. API klíč

- Každý učitel používá vlastní oprávněný a omezený klíč.
- API klíč se nesdílí se studenty ani mezi kolegy.
- Klíč se nevkládá do repozitáře, e-mailu, zadání ani studentského HTML.
- Na sdíleném počítači se ukládá jen pro aktuální relaci.
- Po práci se použije vymazání citlivých údajů.
- Při podezření na únik se klíč okamžitě zruší a nahradí.

## 4. Kontrola testu před výukou

Minimální kontrola každého nového testu:

1. zkontrolovat obsah, klíč a bodové součty,
2. spustit interní self-test,
3. u důležitého testu provést druhou kontrolu klíče,
4. otevřít studentský výstup na desktopu i cílovém mobilním zařízení,
5. projít všechny typy úloh a instrukce,
6. vyzkoušet odevzdání a výsledkovou obrazovku,
7. u secureOffline ověřit vytvoření a načtení `answers.txt`,
8. u diferenciace vyzkoušet platný i neplatný jednorázový kód,
9. ověřit, že student dostává pouze `student_test.html`,
10. připravit náhradní postup pro technický problém.

## 5. Známkované testy

Pro důležité nebo klasifikované testy se používá bezpečný offline režim s odděleným učitelským verifierem. Studentům se předává pouze studentský test a pokyny k odevzdání.

Přísný režim zvyšuje organizační kontrolu, ale není náhradou dozoru. Prohlížeč ani samostatný HTML soubor nemohou zaručit absolutní ochranu proti obcházení pravidel.

Rozpracovaný pokus se po zavření nebo obnovení stránky plně neobnoví. Učitel předem stanoví jednotný postup pro reload, pád prohlížeče, vybití zařízení nebo poškozené odevzdání. Doporučuje se náhradní zařízení a záznam technického incidentu bez zbytečných osobních údajů.

## 6. Distribuce souborů

- `student_test.html` lze dát studentům.
- `teacher_verifier.html` se nikdy nedává studentům ani na veřejný web.
- Veřejný odkaz na ostrý test se zveřejní až těsně před použitím a po skončení se odstraní.
- Lokální otevření `file://` se předem otestuje na stejném typu zařízení; preferuje se oficiální HTTPS adresa.
- Již staženou kopii nelze vzdáleně zneplatnit.

## 7. Výsledky studentů

Výsledkové soubory se ukládají pouze na oprávněné školní úložiště nebo zařízení učitele. Nezveřejňují se na GitHubu ani veřejným odkazem a neodesílají se do AI bez anonymizace.

Složka výsledků má obsahovat Test ID, datum a označení skupiny/třídy bez zbytečných osobních údajů. Doba uchování se řídí pravidly školy; data se neuchovávají automaticky navždy. Verifier je chráněn stejně přísně jako answer key.

## 8. Přístupy

- Aktivační kód je osobní a nepředává se dál.
- Místní PIN ani aktivační kód nelze zpětně přečíst; ukládají se jen jejich otisky.
- Při odchodu uživatele nebo podezření na sdílení správce přístup odvolá nebo otočí kód.
- Změna platí až po exportu a nahrání nového `access-manifest.json`.
- Access gate je organizační bariéra, nikoli serverová autentizace.

## 9. Vydávání aktualizací

Každé nasazení musí splnit `RELEASE-CHECKLIST.md` a projít:

```bash
npm ci
npm test
npm run test:headless
npm audit --audit-level=high
```

Nasazení se neprovádí, pokud některá povinná kontrola selže. Změny se zapisují do changelogu a verze se aktualizuje ve všech povinných souborech.

## 10. Role správce aplikace

Správce:

- udržuje produkční repozitář,
- schvaluje a nasazuje vydání,
- řeší přístupový manifest,
- vede dokumentaci změn,
- přijímá hlášení chyb a incidentů,
- komunikuje technické změny uživatelům,
- minimálně jednou za pololetí ověří aktuálnost modelů, API pravidel a provozní dokumentace.

## 11. Incident nebo závažná chyba

Při chybě, která může ovlivnit data, hodnocení nebo bezpečnost:

1. přerušit používání dotčené funkce,
2. uchovat anonymizovaný popis problému,
3. informovat správce,
4. podle typu incidentu otočit klíč/kód nebo vygenerovat nový test a verifier,
5. opravu otestovat pomocí `npm test` a cíleného scénáře,
6. vydat novou verzi a oznámit změnu uživatelům.

## 12. Hranice aktuální verze

Serverless verze nemá školní SSO, centrální databázi, serverovou ochranu API klíče ani neobejitelnou autorizaci. Tyto body jsou určeny k samostatnému projednání se školním IT a nejsou součástí auditu 7.0.1.
