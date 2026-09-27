# Generátor testů 7.1.54 — úklid kódu a rychlejší otevírání

Datum: 2026-09-27

## Co se mění

- Rychlejší otevírání: service worker už při každém otevření nestahuje celou stránku aplikace (~1,4 MB, po kompresi ~420 kB). Zeptá se serveru, zda se změnila; pokud ne, server odpoví 304 bez obsahu. Nová verze se projeví stejně rychle jako dosud.
- Odstraněno 17 funkcí, které nikdo nevolal (přežitky starého přístupového systému a nahrazené pomocné funkce).
- Sestavovací skript `scripts/build.mjs` je čitelný; výstup sestavení se nezměnil (bajtová shoda).

## Co se nemění

Rozhraní, bodování, secure runtime, verifier, Forms, AI prompty, modely, transport, bezpečnostní model, GARP autorita ani serverová fáze. Release musí projít stávající cestou candidate → Safe Promotion → main.

## Ověření po nasazení

V prohlížeči otevřít aplikaci, v nástrojích pro vývojáře (karta Síť) zapnout zachování záznamu a aplikaci otevřít znovu: požadavek na `index.html` má mít stav 304.
