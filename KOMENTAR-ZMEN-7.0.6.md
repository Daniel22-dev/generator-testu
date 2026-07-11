# Komentář změn — Generátor testů 7.0.6

- Odstraněna stará samostatná PIN brána a veřejný přístupový manifest.
- Před spuštěním se načítá centrální `app-guard.js` AI Studia.
- Všech 29 aplikačních modulů je v distribučním HTML inertních až do úspěšného ověření.
- Po ověření se do kompatibilní vrstvy předá identita a role z podepsaného oprávnění.
- Role `admin` zachovává administrátorské funkce a Test Lab.
- Přímá URL bez přístupu, s cizím oprávněním nebo s neplatným podpisem se bezpečně uzamkne.
- Při výpadku centrální konfigurace se Generátor neotevře.
- Zachována auditní metadata autora ve výstupu a ochrana neoficiálních kopií.

Testy: 28/28 workflow oblastí, 576 kombinací režimů a kompletní headless sada prošly.

- GitHub Actions nyní před publikací spouští úplný workflow audit i headless validaci a teprve potom nasazuje.
- Po vydání může repozitář volitelně vyvolat synchronizaci AI Studia.
