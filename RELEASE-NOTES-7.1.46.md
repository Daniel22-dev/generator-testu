# Generátor testů 7.1.46 — funkční a kombinační audit

Datum: 2026-09-21  
Stav: source candidate; před sloučením do `main` musí projít vzdáleným GitHub CI / SAFE PROMOTION.

## Hlavní změny

- Opraveno překrývání spodních ovládacích prvků editoru a chování editoru na úzkých obrazovkách.
- Proveden průchod jednoduchým i pokročilým režimem včetně kombinací nastavení, ručního zadání a přechodů mezi režimy.
- Opraveny hraniční stavy řazení položek, nevyplněných odpovědí, výběru důkazní věty a vybraných složitých editorů.
- Doplněna studentská lokalizace pro francouzštinu a latinu a sjednoceny popisky složitějších cvičení.
- Ověřeno 38 nabízených typů a variant cvičení v instantním i secure režimu pomocí deterministických testovacích dat.
- Doplněna ochrana proti příliš rozsáhlým AI požadavkům a rozdělování složitějšího generování do menších částí.
- Učitelský helper byl zpřesněn tak, aby bylo zřejmé, že pouze doplňuje náhodnou hodnotu do existujícího pole přístupového kódu.
- Opraveno přijímání návrhů alternativních odpovědí a druhý průchod kontroly klíče.
- Závěrečná obrazovka byla zjednodušena na čtyři očíslované kroky: kontrola obsahu, self-test, volitelná AI kontrola a stažení/předání.
- Technické regresní a fingerprint panely byly odstraněny z běžného uživatelského workflow; interní kontroly zůstávají v QA.

## Jazykové a hodnoticí poznámky

- Cizojazyčné textové odpovědi se nadále řídí existující normalizací; překlad a parafráze nejsou sémanticky hodnoceny libovolným textem, ale vůči klíči a přijatelným alternativám.
- Francouzština a latina mají vlastní studentské popisky. Obsahová správnost živých odpovědí AI zůstává předmětem učitelské kontroly.

## CI a výkon

- Produkční build od 7.1.46 odstraňuje pouze CSS komentáře z výsledného `dist/index.html`. Zdrojový `src/styles.css` zůstává čitelný a beze změny významu.
- Tím se zachovává stávající P5 limit velikosti vstupního HTML; performance budget se nezvyšuje ani neobchází.
- Přidána tato release note jako součást verzovaných podkladů vyžadovaných regresním testem reportéru.

## Co se nemění

- GHRAB Platform 1.1.2, AI Core 1.0.0, GARP 2.5.1/N5 hranice a secure formát `SECURE-ANSWERS-V1`.
- Teacher verifier zůstává oddělený od studentského souboru.
- Google Forms zůstávají volitelnou sběrnou cestou pro šifrovaný payload; `answers.txt` zůstává fallback.
