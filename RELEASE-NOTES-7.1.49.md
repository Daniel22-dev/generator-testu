# Release notes 7.1.49 — priorita explicitního tématu Readingu

Datum: 2026-09-23

## Funkční změna

Pokud učitel v Reading comprehension explicitně vybere téma (např. „Práce a kariéra“) nebo zadá vlastní téma, toto téma je povinným tematickým rámcem nového Readingu.

Zdrojový materiál se mu podřizuje:
- **Automaticky:** AI vybírá jen ty prvky zdroje, které jsou uvnitř zvoleného tématu pedagogicky použitelné.
- **Obsah a fakta:** fakta ze zdroje jsou podpůrným materiálem uvnitř zvoleného tématu, nikoli náhradním tématem.
- **Slovní zásoba:** použijí se jen skutečně zdrojová slova/obraty, která do tématu přirozeně zapadají.
- **Gramatika / jazykové jevy:** téma zůstává beze změny, zdroj dodává procvičované struktury.
- **Vzor úloh a obtížnosti:** zdroj ovlivňuje konstrukci/náročnost, nikoli vybrané téma.
- **Kombinovat:** propojí se pouze kompatibilní obsah, vocabulary, gramatika a styl; neslučitelné prvky se vynechají.

## Příklad

Zdroj: test k tématu životní prostředí.  
CEFR: B2.  
Reading topic: Práce a kariéra.

Výsledný Reading musí zůstat tematicky o práci/kariéře. Může přirozeně využít například green jobs, sustainability manager, renewable-energy careers nebo carbon footprint firem, ale nesmí změnit hlavní téma na obecný text o životním prostředí ani násilně vložit nesouvisející environmentální výrazy.

## Bezpečnost a kompatibilita

- Hodnota vlastního Reading tématu zůstává lower-trust učitelský datový vstup; důvěryhodná aplikační instrukce pouze určuje jeho roli jako tematického rámce.
- Zdroj zůstává lower-trust DATA a nemůže přepisovat systémové instrukce.
- CEFR pravidla, scoring a jazykově specifická pravidla se touto verzí nemění.
