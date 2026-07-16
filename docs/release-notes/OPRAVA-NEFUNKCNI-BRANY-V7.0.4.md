# Oprava nefunkční přístupové brány – 7.0.4

## Příčina

Aplikační moduly byly při buildu spojeny do jediného velkého `<script>` bloku. Jediná runtime chyba před koncem tohoto bloku mohla zastavit jeho další provádění, takže se přístupová logika ani obsluha tlačítek nespustila. Statická obrazovka zůstala na textu „Ověřuji přístup“.

## Oprava

- každý zdrojový modul se nyní v produkčním HTML spouští jako samostatný classic script;
- přístupová logika je definována v samostatném modulu a start aplikace je přesunut do `99-init.js`;
- chyba jednoho aplikačního modulu tak nezastaví následující moduly ani přístupovou bránu;
- nouzová tlačítka mají vlastní malý skript přímo u statické brány;
- nouzový reset umí odregistrovat service worker, smazat PWA cache a znovu načíst čistou verzi;
- build a headless test hlídají oddělené script tagy a odolnost proti chybě vložené před init modulem.
