# Release notes – 7.1.64

Datum: 2026-10-01

## D1 – PDF runtime hotfix

Verze 7.1.64 je chirurgická oprava přímého PDF exportu Teacher Verifieru nad 7.1.63. Nemění scoring, analytiku, secure submission workflow, RSA-OAEP/AES-GCM kryptografii ani student package stripping.

### Opravený problém

Přímé studentské i učitelské PDF v 7.1.63 používalo převod HTML přes SVG `foreignObject` do canvasu. Chromium takový canvas při exportu označilo jako tainted a `canvas.toBlob()` skončilo `SecurityError`, takže tlačítka „Stáhnout PDF“ nevytvořila soubor.

### Nové chování

- tiskový DOM je stále sestaven lokálně ve verifieru,
- renderer kreslí pozadí, rámečky, text, seznamové značky a vložené logo přímo do origin-clean canvasu,
- canvas se převádí na lokální JPEG stránky a skládá do PDF 1.4,
- studentská a učitelská varianta se stahují přímo jako `.pdf`, bez tiskového dialogu,
- klasický tisk zůstává nedotčený fallback.

### Regresní ochrana

Statický Stage 3 contract nově odmítá návrat `foreignObject` rasterizace. Přidán je také samostatný real-browser test `check:stage3-pdf-runtime`, který nad vygenerovaným teacher verifierem vytvoří obě PDF varianty a kontroluje skutečný download, název souboru, PDF hlavičku, EOF marker a minimální velikost. Jeho zapojení do povinných release bran je záměrně ponecháno na plánovanou CI etapu D7.

### Záměrně mimo D1

D1 neřeší stránkovací polish, české textové opravy v PDF vrstvě, dark mode, fullscreen, analytiku Verifieru, prefill ani další body závěrečného auditu. Ty zůstávají v navazujících etapách D2–D7.
