# 7.1.86 — Red-team v2 / E10: šifrovaný start

Studentský soubor obsahuje pouze zašifrované, předem očištěné zadání. AES-256-GCM s PBKDF2-SHA256 (210 000 iterací) váže data k testId a manifestHash. Náhodný startovní kód má 50 bitů a zůstává v soukromém balíčku/verifieru; učitel ho ukáže při zahájení. Chybějící nebo nesprávný kód nespustí otázky ani časovač. Po reloadu je třeba kód znovu zadat, původní pokus, odpovědi a deadline se zachovají.

Kód otevře zadání, neprokazuje původ odpovědí. Po otevření může klient zadání přečíst; konzistentní forgery zůstává CLIENT-CONTROLLED / REVIEW_REQUIRED. Classroom unlock je oddělená procedurální brzda. Soukromý verifier, roster, answer key a privátní klíč nepatří studentům ani do veřejné distribuce.

Lokální kompletní E10 řetězec prošel. První vzdálený CI běh stejného kandidáta odhalil zastaralou dokumentaci a nesoulad smoke kontroly / klikacích auditů se studentskou izolací a startovním kódem. Oprava pokračuje v 7.1.87; tato verze se nepovažuje za plně vzdáleně certifikovanou.

Release zůstává NOT READY – BLOCKING ISSUE: fyzická E7 zařízení, uzavření E6 raw/cache incidentu a rotace, živé školní Forms. Povinná readiness kontrola blokuje merge i deploy. Žádný produkční studentský experiment nebyl schválen.
