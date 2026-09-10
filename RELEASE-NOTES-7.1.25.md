# Generátor testů 7.1.25 — hotfix self-testu bodování

## Opravený problém
V bezpečném offline režimu mohl povinný self-test bodování skončit chybou `Self-test RPC timeout: __has__`. Uživatel pak nemohl stáhnout studentský test, přestože chyba nebyla v bodování ani v klíči.

## Kořenová příčina
`stRpcBridgeHtml()` vkládal diagnostický RPC bridge před první textový výskyt `</body>`. Učitelský verifier však ve svém JavaScriptu obsahuje HTML šablony pro feedback, archiv a tisk, které samy obsahují text `</body></html>`. Bridge se proto mohl vložit dovnitř JavaScriptového řetězce namísto před skutečný konec dokumentu; iframe následně neodpověděl na bootstrap volání `__has__`.

## Oprava
- RPC bridge se vkládá před poslední uzavírací `</body>` výsledného HTML.
- HTML bez `</body>` zachovává bezpečný fallback připojením bridge na konec.
- Bootstrap timeout má srozumitelnější diagnostickou hlášku.
- Přidán deterministický regresní test s vnořeným `</body>` uvnitř JavaScriptového řetězce.

## Oddělený síťový záznam z hlášení
ZIP hlášení obsahoval také `AbortError` volání Gemini po přibližně 180 s. Tento záznam vznikl přibližně 20 minut před založením hlášení a nesouvisí s RPC bootstrapem self-testu; jde o samostatný timeout AI požadavku.

## Release / assurance status
7.1.25 mění distribuovaný runtime po kandidátu 7.1.24. Auditní a GARP evidence uložená pro 7.1.24 zůstává historická a nemá být automaticky interpretována jako revalidace 7.1.25. Před novým formálním security/release schválením je třeba zopakovat příslušné regresní/GARP kontroly.
