# Generátor testů 7.1.21 — GHRAB Platform 1.1.2 suite-session candidate

Status: **ECOSYSTEM RELEASE WAVE CANDIDATE / NENASAZOVAT AUTOMATICKY**.

Tato verze migruje Generátor testů na přesnou referenční GHRAB Platform 1.1.2 a integruje kontrakt `ghrab-suite-session-v1`. Suite end uklízí pouze Generator-owned obsah a target-scoped handoff, zachovává platformní generation tombstone i aplikační lifecycle acknowledgement/status a po ukončení relace fail-closed blokuje autosave i stale BFCache/history dokumenty.

F-02 je lokálně řešen rozlišitelným stavem signal/seen/cleanup-complete/ack; úplné ekosystémové uzavření vyžaduje koordinátor, který ověří acknowledgement všech relevantních child aplikací. F-03 (same-origin možnost manipulovat se sdíleným tombstonem/ack při XSS) zůstává ekosystémový trust-boundary dluh.

Do dokončení celé release wave používat pouze syntetická testovací data. E-01 se touto jedinou migrací nepovažuje za uzavřený.
