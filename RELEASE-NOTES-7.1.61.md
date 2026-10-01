# Release notes – 7.1.61

Datum: 2026-10-01

## Shrnutí

Verze 7.1.61 uzavírá Etapu A funkčního auditu Generátoru interaktivních testů. Opravuje znovunačítání uložených šablon, sjednocuje řízení počtu otázek u Reading/Listening, propisuje úroveň podpory/náročnosti do hlavního generovacího promptu, opravuje YouTube transport a rozšiřuje detekci obsahového driftu.

## Šablony

Nový formát `prefill_v3` ukládá bezpečnou konfiguraci i běžná textová pole formuláře, takže po načtení skutečně znovu předvyplní rozpracované zadání. Záměrně se neukládají PINy, hesla, identity studentů, podmínky skupin ani binární přílohy.

## Reading a Listening

Učitel explicitně volí počet otázek. Stejná hodnota se používá v UI, při AI návrhu, v podrobném nastavení i ve finálním generování. Výchozí hodnota zůstává 4.

## Diferenciace

Volby `basic`, `standard` a `challenge` se nyní propisují do hlavního AI promptu. Nemění testované kurikulum, CEFR, počty položek ani body; mění pouze míru scaffoldingu, jazykovou zátěž a hloubku zpracování uvnitř stejných obsahových požadavků.

## YouTube a URL zdroje

YouTube odkazy se již neposílají do URL Contextu. V přímém Gemini režimu jsou předávány jako video vstupy; běžné webové URL zůstávají v URL Contextu. Školní AI Core zatím externí video URI nepodporuje, proto je tato cesta ve školním režimu odmítnuta fail-closed s jasnou hláškou.

## Detekce zastaralého výstupu

Změny zdrojů, Reading/Listening parametrů, diferenciace a relevantních textových polí nově správně označí předchozí vygenerovaný výstup jako obsahově zastaralý.

## Bezpečnost a kompatibilita

Teacher verifier, secure studentský runtime, kryptografie, Google Forms workflow, scoring a GARP 2.7 autorita zůstávají zachovány. Release musí před promotion projít stávajícím P5 R2, Workflow Journeys E2E, GARP 2.7 foundation a Safe Promotion chainem.
