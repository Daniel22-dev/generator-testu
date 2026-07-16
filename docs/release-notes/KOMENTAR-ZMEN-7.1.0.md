# Generátor interaktivních testů 7.1.0

## Co se změnilo

- Každý dokončený generační běh zapíše do AI Studia anonymní technickou metriku `test-package`.
- Rozlišuje se úspěch, technická chyba a zrušení uživatelem.
- Počítá se jeden výsledný testový balíček na jeden generační běh, nikoli jednotlivé otázky nebo varianty uvnitř balíčku.
- Nezapisuje se prompt, téma, zdrojový text, otázky, odpovědi ani identita uživatele.
- Interaktivní manuál používá přístupovou bránu bez telemetrie, takže jeho čtení není započteno jako používání Generátoru.
