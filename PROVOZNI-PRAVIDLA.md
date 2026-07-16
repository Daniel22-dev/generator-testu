# Provozní pravidla Generátoru interaktivních testů

Tato pravidla platí pro oficiální řízené používání technicky ověřené produkční serverless verze. Bezpečnostní hranice doplňuje `SECURITY.md`.

## 1. Účel a odpovědnost

Generátor je pomocný nástroj učitele. Učitel odpovídá za obsah, správnost klíče, bodování, přiměřenost úloh, způsob známkování a náhradní postup při technickém problému.

## 2. Data a anonymizace

- Skutečná jména v diferenciačních skupinách se před AI požadavkem nahrazují anonymními kódy.
- Studentský HTML obsahuje jen SHA-256 `studentHashes` s náhodnou solí.
- Pro ostrou diferenciaci se používají náhodné jednorázové kódy.
- Do volného textu, URL, podmínek skupin ani příloh se nevkládají zdravotní údaje, diagnózy, kázeňské informace, adresy, rodná čísla, kontakty ani jiné citlivé údaje.
- Podpůrná opatření se popisují obecným pedagogickým jazykem.

## 3. API klíč

- Každý učitel používá vlastní oprávněný a omezený klíč.
- Klíč se nesdílí se studenty ani kolegy.
- Na sdíleném počítači se používá jen pro aktuální relaci.
- Klíč se nikdy nevkládá do repozitáře, e-mailu, zadání ani studentského HTML.
- Při podezření na únik se okamžitě zruší a nahradí.

## 4. Kontrola testu před výukou

1. Zkontrolovat obsah, správné odpovědi a bodové součty.
2. Spustit interní self-test.
3. Otevřít studentský výstup na cílovém zařízení.
4. Vyzkoušet všechny použité typy úloh.
5. U secureOffline ověřit stažení a načtení `answers.txt`.
6. U diferenciace vyzkoušet platný i neplatný jednorázový kód.
7. Zkontrolovat, že student dostává pouze `student_test.html`.
8. Připravit jednotný náhradní postup.

## 5. Známkované testy

Pro důležité nebo klasifikované testy se používá secureOffline s odděleným verifierem a běžným učitelským dozorem. Přísný režim není neobejitelný proctoring.

Časový limit běží podle skutečného času i při přepnutí aplikace nebo uspání zařízení. Rozpracovaný pokus se po reloadu nebo zavření stránky plně neobnoví. Učitel předem stanoví postup pro pád prohlížeče, vybití zařízení, poškozené odevzdání nebo nutnost nového pokusu.

## 6. Distribuce souborů

- Studentům patří pouze `student_test.html`.
- `teacher_verifier.html` se nikdy neposílá studentům ani nezveřejňuje.
- Veřejný odkaz na ostrý test se zveřejní až těsně před použitím a po skončení se odstraní.
- Již stažený soubor nelze vzdáleně zneplatnit.
- Ostré balíky se generují z oficiální HTTPS adresy. `file://` a `localhost` jsou pouze vývojové prostředí.

## 7. Výsledky studentů

Výsledky se ukládají pouze na oprávněné školní úložiště nebo zařízení učitele. Nezveřejňují se na GitHubu ani veřejným odkazem a do AI se neposílají bez anonymizace. Verifier se chrání stejně jako answer key.

## 8. Přístupy

- Přístup vydává správce v AI Studiu GHRAB jako podepsaný permit.
- Generátor nemá vlastní aktivační kód, místní PIN ani export přístupového manifestu.
- Odvolání oprávnění se provádí v AI Studiu revokací permitu.
- Uživatel může na svém zařízení zvolit **Odebrat přístup z tohoto zařízení**; tím se smaže lokální permit a otevře centrální přístupová stránka.
- Online se guard vždy načítá čerstvě. Offline může aplikace použít poslední známý permit do příštího připojení.
- Centrální klientská brána je silná organizační kontrola, nikoli školní SSO ani neobejitelná serverová autorizace.

## 9. Vydávání aktualizací

Každé nasazení musí projít:

```bash
npm ci
npm test
npm run test:headless
npm audit --audit-level=high
```

GitHub Actions smí nasadit pouze build, který všechny kontroly dokončil bez chyby a bez neočekávaného varování. Lockfile nesmí obsahovat interní registry URL.

Service worker neprovádí automatický reload otevřené aplikace. Nová verze se aktivuje po zavření starých karet; uživatel proto dokončí nebo bezpečně uloží práci a aplikaci následně znovu otevře.

## 10. Role správce aplikace

Správce:

- udržuje repozitář a centrální přístup v AI Studiu,
- schvaluje a nasazuje vydání,
- řeší revokace permitů,
- vede changelog a dokumentaci,
- přijímá hlášení chyb a incidentů,
- minimálně jednou za pololetí ověří modely, API pravidla a provozní dokumentaci.

## 11. Incident nebo závažná chyba

1. Přerušit používání dotčené funkce.
2. Uchovat anonymizovaný popis problému.
3. Informovat správce.
4. Podle incidentu revokovat permit, otočit API klíč nebo vytvořit nový test a verifier.
5. Opravu ověřit automatickými testy a cíleným scénářem.
6. Vydat novou verzi a oznámit význam změny.

## 12. Hranice aktuální verze

Serverless verze nemá školní SSO, databázi, serverovou ochranu API klíče, centrální archiv výsledků ani neobejitelnou autorizaci. Tyto části musí projít samostatným návrhem a kontrolou školního IT.
