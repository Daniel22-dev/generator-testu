# Generátor testů 7.1.18

## Bezpečnostní kandidát GARP 2.3 K1

Tato verze je kandidát pro nezávislou kontrolu Claude, nikoli finálně schválený release.

- Sjednocuje prompt-injection trust boundary pro všechny zjištěné AI vstupní cesty včetně řetězců AI výstup → další AI kontrola/oprava.
- Odstraňuje egress skutečných identit z diferenciačního promptu; AI vidí pouze pseudonymy.
- Izoluje self-test v opaque sandboxu a omezuje RPC na allowlist testovacích funkcí.
- Omezuje návratový odkaz handoffu na nakonfigurovaný AI Studio origin/cestu.
- Zavádí scoped ukončení práce na sdíleném zařízení a pravdivé manifesty retence/mazání/importu; JSON přenos zadání je deklarován včetně limitu 512 kB a validační cesty.
- Přidává GARP 2.3 bezpečnostní regresní harness a negativní kontroly.

V tomto auditním prostředí nebylo možné dokončit instalaci přesného `node_modules` z veřejného npm registru a spravovaný Chromium blokoval testovací stránky. Browser/P5/E2E a live-model AI-RED proto musí být zopakovány v CI/nezávislém prostředí před GREEN.
