# Generátor testů 7.1.35 — Etapa 5: přehlednější Pokročilá nastavení

Datum: 2026-09-15

## Rozsah

Etapa 5 je čistá změna informační architektury učitelského **Pokročilého režimu**. Nemění význam, hodnoty ani validační pravidla existujících voleb.

## Změny

- Stávající ovladače jsou v Pokročilém režimu seskupeny do pěti sekcí:
  - **Test** — čas, režim testu, riziko přísného režimu, způsob odevzdávání, body a klasifikační stupnice.
  - **Student** — identita, roster, míra podpory, diferenciace a pořadí otázek.
  - **Zpětná vazba** — režim zpětné vazby a tolerance překlepů.
  - **Bezpečnost** — režim výsledku, hlídání obrazovky a vysvětlení existujícího secure-offline zámku dalšího pokusu.
  - **Vzhled** — rozložení a téma studentského testu.
- Horní navigace umožňuje skočit přímo na příslušnou sekci.
- Simple režim obnovuje původní umístění prvků a zůstává funkčně beze změny.
- Ochrana opakovaného pokusu není nový přepínač; jde pouze o přesné vysvětlení stávajícího chování secure-offline runtime na stejném zařízení.

## Explicitně beze změny

- `SECURE-ANSWERS-V1` a jeho kryptografie,
- studentský secure a instant runtime,
- teacher verifier včetně Google Forms CSV importu,
- studentské Google Forms odevzdání a `answers.txt` fallback,
- scoring, PIN a odemykací heslo,
- serverový profil a AI transport.

## QA kandidáta

- Cílený Chromium DOM test ověřuje přesné členství 5/5 skupin, nulovou mutaci `state` samotným seskupením, návrat prvků do původních kroků v Simple režimu a opakované Simple ↔ Advanced.
- XSS sink ratchet se nesmí zvýšit a performance budget se nesmí kvůli této etapě měnit.
- Finální povýšení vyžaduje čistý exact-lockfile GitHub CI běh 7.1.35.
