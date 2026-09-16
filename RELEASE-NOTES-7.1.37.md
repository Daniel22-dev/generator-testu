# Generátor testů 7.1.37 — Etapa 6: jeden učitelský přístupový kód

Datum: 2026-09-15  
Stav: source candidate — vyžaduje čistý exact-lockfile GitHub CI před uzavřením Etapy 6.

## Rozsah

Etapa 6 zjednodušuje učitelské tajemství bez sloučení bezpečnostních účelů. V Generátoru je jeden viditelný **Učitelský přístupový kód**. Při sestavení testu se z něj odvodí dvě nezávislé PBKDF2 hodnoty se stejnými 120 000 iteracemi SHA-256 jako dříve, ale s různými doménovými solemi:

- `teacher-pin|testId` — učitelský mód a povolení dalšího pokusu na stejném zařízení,
- `unlock-password|testId` — odemčení přísného/screen-guard zámku.

Raw kód se do studentského HTML neukládá. Obě odvozené hodnoty zůstávají rozdílné.

## Bezpečnostní zpřísnění

- teacher-login už nepřijímá `unlock-password` hash,
- autorizace dalšího pokusu už nepřijímá `unlock-password` hash,
- zámková obrazovka ověřuje pouze `unlock-password` hash,
- stejný učitelský kód se kanonizuje jednotně pro oba účely, takže velikost písmen nezpůsobí rozdílné chování,
- týmový kód **Bezpečnosti pracoviště** zůstává samostatný a validace vyžaduje jinou hodnotu.

## Kompatibilita

Skryté pole `#heslo` zůstává jako kompatibilitní mirror pro starší pomocné/sanitizační cesty, ale **není kryptografickým zdrojem**. Kryptografický zdroj je pouze viditelný učitelský přístupový kód (`#ucitelPin`). Citlivá pole se dál neukládají do historie ani šablon.

## Beze změny

- `SECURE-ANSWERS-V1`,
- RSA/AES secure balík,
- teacher verifier a Google Forms CSV import,
- studentské Google Forms odevzdání,
- scoring,
- jednorázové studentské kódy/diferenciace,
- týmový bezpečnostní kód pracoviště,
- serverový profil.

## Povinná certifikace

Před produkčním označením musí přesný commit 7.1.37 projít kompletním GitHub CI. Zvlášť se ověřuje jeden viditelný kód, dva různé účelové PBKDF2 hashe, case-normalizace, teacher-login, strict unlock, retry authorization a nepřítomnost cross-domain hash akceptace.
