# Generátor testů 7.1.45 — AI Core + workflow cleanup

Datum: 2026-09-19  
Stav: production-serverless source candidate; před ostrým nasazením musí projít vzdáleným GitHub CI / SAFE PROMOTION.

## Co se změnilo

- Běžné rozhraní už nezobrazuje ani nepovoluje ruční volbu konkrétního AI modelu. Generátor používá abstrakci AI Core `economy / balanced / quality`; konkrétní provider/model určuje transport nebo školní gateway.
- Kompletní generování používá profil `quality`, běžné dílčí generování `balanced`, lehké pomocné operace `economy`; Poradce byl přesunut na `balanced`.
- Poradce ke Generátoru před AI requestem lokálně vybere relevantní části znalostní báze, přidá bezpečný souhrn aktuální konfigurace testu a po odpovědi zahodí neověřené evidence. Odpověď bez platné opory se zobrazí fail-closed jako nepotvrzená.
- Panel AI připojení na první stránce byl zjednodušen. Detailní providerový postup je přesunut do samostatného návodu; školní režim vysvětluje serverovou gateway bez požadavku na osobní API klíč.
- `Způsob odevzdávání` byl přejmenován na `Průběh odevzdání v testu` a `Režim výsledků` na `Výsledek a předání učiteli`, aby se nepletlo zamykání odpovědí s cestou předání výsledku.
- Google Forms byly odděleny od bezpečnostního kódu a vysvětleny jako volitelná sběrná cesta šifrovaného `SECURE-ANSWERS-V1` výsledku. `answers.txt` zůstává fallback; teacher verifier umí CSV z Forms.
- Legacy „týmový bezpečnostní kód / Bezpečnost pracoviště“ byl odstraněn z UI, validace i sestavení. V současné RSA/AES secure větvi se kód nepoužíval k dešifrování ani ověření; v instant HMAC větvi navíc tajemství musí být ve studentském souboru, takže tato týmová vrstva neposkytovala reálnou kryptografickou ochranu.
- Starý lokálně uložený týmový kód se při startu pouze uklidí z `localStorage`.
- Helper v jednoduchém režimu pro učitelský přístupový kód se ukazuje jen tehdy, když kód skutečně chybí.
- Manuál, Test Lab, workflow testy a produkční invarianty byly upraveny na novou architekturu.
- Přidán `check:assistant`, který staticky hlídá AI Core profil Poradce, aktuální kontext, Google Forms KB, zákaz model pickeru a odstranění legacy týmového kódu.

## Co se nemění

- RSA-OAEP + AES-GCM formát `SECURE-ANSWERS-V1` a teacher verifier.
- Oddělené PBKDF2 domény učitelského přístupového kódu pro teacher login a odemčení zámku.
- Self-test bodování, answer-key kontrola, manifest/integrita secure balíku, hashovaný roster a jednorázové studentské kódy.
- Google Forms zůstávají volitelné; bez uloženého responder URL se používá `answers.txt`.
