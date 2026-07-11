# Centrální přístup AI Studio GHRAB — Generátor 7.0.6

Generátor je chráněn jednotným podepsaným oprávněním AI Studia. Při přímém otevření nejprve načte `/AI-Studio-GHRAB/access/app-guard.js`. Hlavní aplikační skripty jsou do té doby inertní a nemohou se spustit.

Ověření kontroluje podpis ECDSA P-256, vydavatele, publikum, platnost, revokaci a oprávnění `generator`. Role `admin` má přístup automaticky. Přístup se aktivuje pouze jednou v AI Studiu a díky společnému originu je dostupný i Generátoru.

Při zamítnutí se zobrazí jednotná zamykací obrazovka s návratem do AI Studia. Soukromý podpisový klíč ani osobní přístupové soubory nesmějí být součástí tohoto repozitáře.
