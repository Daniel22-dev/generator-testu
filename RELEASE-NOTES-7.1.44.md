# Release notes 7.1.44 — UI / workflow audit

Datum: 2026-09-18

## Změny
- sjednocena horní nástrojová lišta do jedné řady na desktopu; na úzkých displejích zůstává bezpečně horizontálně posuvná,
- odstraněny historické čipy centrálního účtu / správy přístupů z hlavní obrazovky Generátoru,
- Gemini API klíč přesunut na první stránku do samostatného panelu **AI připojení**; model zůstává v závěrečném kroku,
- opravena čitelnost platformního footeru ve světlém i tmavém motivu,
- opravena chybějící vizuální definice `.ui-modal`, která rozbíjela dialog **Bezpečnost pracoviště**,
- tlačítko „Potřebuji vlastní nastavení“ přejmenováno na jednoznačné „Přepnout do pokročilého nastavení“,
- odstraněno volné pole „Jiný podporovaný typ / synonymum“; workflow nyní používá pouze explicitně podporované typy,
- aktualizovány texty „Jak používat ostře“, „Bezpečný provoz ve škole“, „Co čekat od přísného testu“ a panel realistických rizik,
- opravena zavádějící tvrzení, že student nemůže získat HTML; bezpečnost je nově správně popsaná jako oddělení answer key / privátního klíče od studentského souboru,
- poradce „Zeptat se na funkce“ aktualizován na nové umístění API klíče.

## Kompatibilita
Bez změny formátu secure exportu, kryptografie, teacher verifieru, rosteru a odevzdávacího payloadu.

## Candidate QA hotfix
- Opraven P5 axe blocker `link-in-text-block` u odkazu `aistudio.google.com` přidáním nezávislého podtržení.
- Opraven mobilní visual gate `generator-long-form 360x800`: panel AI připojení se po opuštění prvního kroku skryje, takže aktivní krok zůstává ve viewportu.
