# Oprava zamrznuté přístupové brány – 7.0.3

Verze 7.0.2 mohla zůstat na statické obrazovce „Ověřuji přístup“, pokud se síťový požadavek na `access-manifest.json` neukončil nebo pokud inicializace formuláře selhala dříve, než se naplánoval přístupový boot.

Verze 7.0.3 zavádí časový limit 2,5 s, fallback na vestavěný manifest, pětisekundový watchdog, zachycení neošetřené chyby a spuštění přístupové logiky před inicializací formuláře. Statická obrazovka obsahuje i odkazy pro nové načtení a reset místního profilu.
