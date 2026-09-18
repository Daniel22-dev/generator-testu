# Generátor interaktivních testů 7.1.44

Datum: 2026-09-18

## Účel

UI/workflow maintenance patch po seniorním auditu uživatelského rozhraní. Nemění formát studentských výsledků, kryptografii secure balíku ani scoring.

## Změny

- horní akce jsou na desktopu v jedné řadě; účet AI Studia zůstává dostupný přes ikonu 👤, historická lokální Správa přístupů byla z hlavičky odstraněna,
- Gemini API klíč a model se nastavují už na první stránce; provider klíč se nadále drží jen v session,
- odstraněny duplicitní vstupy „Potřebuji vlastní nastavení“ a „Jiný podporovaný typ“,
- opraveno světlé téma runtime footeru Platform 1.1.2,
- opraven společný modal shell používaný Nastavením Generátoru/Bezpečností pracoviště i účtem AI Studia,
- provozní návody a panel realistických rizik přísného testu byly srovnány se skutečným secure runtime (zdroj HTML není bezpečnostní hranice; čas používá deadline),
- Poradce ke generátoru odkazuje na nové umístění AI připojení a na centrální správu přístupů v AI Studiu.

## Neměněné oblasti

Secure studentský formát, teacher verifier, Google Forms workflow, RSA/AES/PBKDF2 domény, scoring, GARP 2.5/N5, GHRAB Platform 1.1.2 a Studio Bridge v2.
