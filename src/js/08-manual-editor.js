// ── LEVEL 3: MANUÁLNÍ EDITOR CVIČENÍ ────────────────────────────────────────
// Toggle ✏️ Ručně v konfiguraci cvičení (jen v pokročilém módu, jen pro podporované typy).
// Při generování se pro manuální cvičení nezavolá AI — místo toho se zobrazí
// formulář, kde učitel zadá obsah ručně.

const MANUAL_SUPPORTED_TYPES = ['categorisation-board', 'ordering', 'multi-select', 'highlight-evidence', 'transformation-chain', 'error-tagging', 'banked cloze', 'multiple matching', 'table-completion'];

function isManualSupported(typ) {
  return MANUAL_SUPPORTED_TYPES.includes(normalizeType(typ || ''));
}

// Zobrazí formulář pro ruční zadání jednoho cvičení.
// Vrátí Promise<Object|null> — exercise JSON nebo null (zrušeno).
function showManualExerciseForm(exCfg, exIndex) {
  return new Promise(function(resolve) {
    const typ = normalizeType(exCfg.typ || '');
    const count = exCfg.pocetOtazek || 1;
    const backdrop = document.createElement('div');
    backdrop.className = 'ui-modal-backdrop';
    backdrop.id = 'manualEditorBackdrop';

    // ── Pomocné funkce pro práci s dynamickými řádky ──
            
    // ── Generátory HTML formulářů podle typu ──
// ── Pomocné formy pro dalších 5 typů ─────────────────────────────────────────

    function buildTransformChainForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Výchozí věta / prompt ' + (count>1?'('+( itemIndex+1)+'/'+count+')':'') + '</label>'
        + '<input class="mf-input" id="mfQuestion' + itemIndex + '" placeholder="She goes to school every day." autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Transformace <span class="mf-hint">(kroky v pořadí)</span></label>'
        + '<div id="mfChain' + itemIndex + '">'
        + '<div class="mf-chain-step mf-row-block">'
        + '<div class="mf-step-label">Krok 1</div>'
        + '<div class="mf-row"><label class="mf-sub">Instrukce</label><input class="mf-input" placeholder="Make it negative." autocomplete="off" data-field="instruction"></div>'
        + '<div class="mf-row"><label class="mf-sub">Správná odpověď</label><input class="mf-input" placeholder="She does not go to school." autocomplete="off" data-field="answer"></div>'
        + '<div class="mf-row"><label class="mf-sub">Alternativy <span class="mf-hint">(oddělené |, nepovinné)</span></label><input class="mf-input" placeholder="She doesn\'t go to school." autocomplete="off" data-field="alts"></div>'
        + '</div>'
        + '<div class="mf-chain-step mf-row-block">'
        + '<div class="mf-step-label">Krok 2</div>'
        + '<div class="mf-row"><label class="mf-sub">Instrukce</label><input class="mf-input" placeholder="Make it a question." autocomplete="off" data-field="instruction"></div>'
        + '<div class="mf-row"><label class="mf-sub">Správná odpověď</label><input class="mf-input" placeholder="Does she go to school?" autocomplete="off" data-field="answer"></div>'
        + '<div class="mf-row"><label class="mf-sub">Alternativy</label><input class="mf-input" autocomplete="off" data-field="alts"></div>'
        + '</div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addChainStep(' + itemIndex + ')">+ Přidat krok</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Vysvětlení transformační logiky." autocomplete="off"></div>';
    }

    function buildErrorTaggingForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Věta s chybou ' + (count>1?'('+( itemIndex+1)+'/'+count+')':'') + '</label>'
        + '<input class="mf-input" id="mfSentence' + itemIndex + '" placeholder="She go to school every day." autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Chybný token <span class="mf-hint">(číslo slova, 0 = první)</span></label>'
        + '<input class="mf-input mf-narrow" type="number" min="0" id="mfErrIdx' + itemIndex + '" placeholder="2" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Typ chyby <span class="mf-hint">(např. verb form, spelling, word order)</span></label>'
        + '<input class="mf-input" id="mfErrType' + itemIndex + '" placeholder="verb form" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Oprava <span class="mf-hint">(správný tvar chybného tokenu)</span></label>'
        + '<input class="mf-input" id="mfErrCorr' + itemIndex + '" placeholder="goes" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Subject-verb agreement: she goes." autocomplete="off"></div>';
    }

    function buildBankedClozeForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Text s mezerami ' + (count>1?'('+( itemIndex+1)+'/'+count+')':'') + ' <span class="mf-hint">(použij ___(1), ___(2) apod.)</span></label>'
        + '<textarea class="mf-input mf-textarea" id="mfText' + itemIndex + '" rows="4" placeholder="She ___(1) to school every ___(2). However, ___(3) it rains, she takes the bus."></textarea></div>'
        + '<div class="mf-section"><label class="mf-label">Zásobník slov <span class="mf-hint">(oddělené čárkou — obsahuje i návnady)</span></label>'
        + '<input class="mf-input" id="mfBank' + itemIndex + '" placeholder="goes, day, when, although, while, journey" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Správné odpovědi <span class="mf-hint">(v pořadí mezer, oddělené čárkou)</span></label>'
        + '<input class="mf-input" id="mfAnswers' + itemIndex + '" placeholder="goes, day, when" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Proč jsou tato slova správná." autocomplete="off"></div>';
    }

    function buildMultipleMatchingForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Odstavce ' + (count>1?'('+( itemIndex+1)+'/'+count+')':'') + ' <span class="mf-hint">(každý má písmeno A, B, C…)</span></label>'
        + '<div id="mfParas' + itemIndex + '">'
        + '<div class="mf-row-block"><div class="mf-step-label">A</div><textarea class="mf-input mf-textarea-sm" rows="2" placeholder="Text prvního odstavce…"></textarea></div>'
        + '<div class="mf-row-block"><div class="mf-step-label">B</div><textarea class="mf-input mf-textarea-sm" rows="2" placeholder="Text druhého odstavce…"></textarea></div>'
        + '<div class="mf-row-block"><div class="mf-step-label">C</div><textarea class="mf-input mf-textarea-sm" rows="2" placeholder="Text třetího odstavce…"></textarea></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addParaRow(' + itemIndex + ')">+ Přidat odstavec</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Tvrzení / nadpisy <span class="mf-hint">(číslo → správný odstavec)</span></label>'
        + '<div id="mfStatements' + itemIndex + '">'
        + '<div class="mf-row"><span class="mf-step-num">1.</span><input class="mf-input" placeholder="Tvrzení nebo nadpis 1" autocomplete="off"><input class="mf-input mf-narrow" placeholder="A" autocomplete="off" title="Správný odstavec (A/B/C…)"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><span class="mf-step-num">2.</span><input class="mf-input" placeholder="Tvrzení nebo nadpis 2" autocomplete="off"><input class="mf-input mf-narrow" placeholder="B" autocomplete="off" title="Správný odstavec (A/B/C…)"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addStatementRow(' + itemIndex + ')">+ Přidat tvrzení</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Klíč k odůvodnění přiřazení." autocomplete="off"></div>';
    }

    function buildTableCompletionForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Záhlaví sloupců ' + (count>1?'('+( itemIndex+1)+'/'+count+')':'') + ' <span class="mf-hint">(oddělené |)</span></label>'
        + '<input class="mf-input" id="mfHeaders' + itemIndex + '" placeholder="Verb | Past Simple | Past Participle" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Řádky <span class="mf-hint">(buňky oddělené |, prázdná buňka = student doplní)</span></label>'
        + '<div id="mfTableRows' + itemIndex + '">'
        + '<div class="mf-row"><input class="mf-input" placeholder="go | | gone" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input class="mf-input" placeholder="write | wrote | " autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addTableRow(' + itemIndex + ')">+ Přidat řádek</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Správné odpovědi pro prázdné buňky <span class="mf-hint">(v pořadí, oddělené |)</span></label>'
        + '<input class="mf-input" id="mfTableAnswers' + itemIndex + '" placeholder="went | written" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Nepravidelná slovesa." autocomplete="off"></div>';
    }


    function buildCatBoardForm() {
      return '<div class="mf-section"><label class="mf-label">Otázka</label>'
        + '<input class="mf-input" id="mfQuestion0" placeholder="Sort the words into the correct category." autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Kategorie <span class="mf-hint">(alespoň 2)</span></label>'
        + '<div id="mfCategories">'
        + '<div class="mf-row"><input class="mf-input mf-cat-inp" placeholder="Kategorie A" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input class="mf-input mf-cat-inp" placeholder="Kategorie B" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addCatRow()">+ Přidat kategorii</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Položky k zařazení <span class="mf-hint">(alespoň 4, ve smíšeném pořadí)</span></label>'
        + '<div id="mfEntries">'
        + '<div class="mf-row mf-entry-row"><input class="mf-input mf-entry-text" placeholder="Slovo nebo věta" autocomplete="off"><select class="mf-select mf-entry-cat"><option value="">— kategorie —</option></select><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row mf-entry-row"><input class="mf-input mf-entry-text" placeholder="Slovo nebo věta" autocomplete="off"><select class="mf-select mf-entry-cat"><option value="">— kategorie —</option></select><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row mf-entry-row"><input class="mf-input mf-entry-text" placeholder="Slovo nebo věta" autocomplete="off"><select class="mf-select mf-entry-cat"><option value="">— kategorie —</option></select><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row mf-entry-row"><input class="mf-input mf-entry-text" placeholder="Slovo nebo věta" autocomplete="off"><select class="mf-select mf-entry-cat"><option value="">— kategorie —</option></select><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" id="btnAddEntry">+ Přidat položku</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl0" placeholder="Proč která položka patří do které kategorie." autocomplete="off"></div>';
    }

    function buildOrderingForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Otázka ' + (itemIndex + 1) + ' / ' + count + '</label>'
        + '<input class="mf-input" id="mfQuestion' + itemIndex + '" placeholder="Put the steps in the correct order." autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Kroky <span class="mf-hint">(napiš ve správném pořadí — student je uvidí promíchané)</span></label>'
        + '<div id="mfSteps' + itemIndex + '">'
        + '<div class="mf-row"><span class="mf-step-num">1.</span><input class="mf-input" placeholder="Krok 1" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove();reNumberSteps(' + itemIndex + ')">×</button></div>'
        + '<div class="mf-row"><span class="mf-step-num">2.</span><input class="mf-input" placeholder="Krok 2" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove();reNumberSteps(' + itemIndex + ')">×</button></div>'
        + '<div class="mf-row"><span class="mf-step-num">3.</span><input class="mf-input" placeholder="Krok 3" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove();reNumberSteps(' + itemIndex + ')">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addOrderStep(' + itemIndex + ')">+ Přidat krok</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Proč je toto správné pořadí." autocomplete="off"></div>';
    }

    function buildMultiSelectForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Otázka ' + (itemIndex + 1) + ' / ' + count + '</label>'
        + '<input class="mf-input" id="mfQuestion' + itemIndex + '" placeholder="Choose ALL correct answers." autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Možnosti <span class="mf-hint">(zaškrtni správné)</span></label>'
        + '<div id="mfOptions' + itemIndex + '">'
        + '<div class="mf-row"><input type="checkbox" class="mf-chk"><input class="mf-input" placeholder="Možnost A" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input type="checkbox" class="mf-chk"><input class="mf-input" placeholder="Možnost B" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input type="checkbox" class="mf-chk"><input class="mf-input" placeholder="Možnost C" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input type="checkbox" class="mf-chk"><input class="mf-input" placeholder="Možnost D" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addOptionRow(' + itemIndex + ')">+ Přidat možnost</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Proč jsou právě tyto možnosti správné." autocomplete="off"></div>';
    }

    function buildHighlightForm(itemIndex) {
      return '<div class="mf-section"><label class="mf-label">Otázka ' + (itemIndex + 1) + ' / ' + count + '</label>'
        + '<input class="mf-input" id="mfQuestion' + itemIndex + '" placeholder="Which sentence explains why...?" autocomplete="off"></div>'
        + '<div class="mf-section"><label class="mf-label">Věty <span class="mf-hint">(označ tu správnou přepínačem)</span></label>'
        + '<div id="mfSentences' + itemIndex + '">'
        + '<div class="mf-row"><input type="radio" name="mfCorrect' + itemIndex + '" class="mf-radio" value="0"><input class="mf-input" placeholder="Věta 1" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input type="radio" name="mfCorrect' + itemIndex + '" class="mf-radio" value="1"><input class="mf-input" placeholder="Věta 2" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '<div class="mf-row"><input type="radio" name="mfCorrect' + itemIndex + '" class="mf-radio" value="2"><input class="mf-input" placeholder="Věta 3" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button></div>'
        + '</div>'
        + '<button type="button" class="mf-add" onclick="addSentenceRow(' + itemIndex + ')">+ Přidat větu</button>'
        + '</div>'
        + '<div class="mf-section"><label class="mf-label">Vysvětlení <span class="mf-hint">(nepovinné)</span></label>'
        + '<input class="mf-input" id="mfExpl' + itemIndex + '" placeholder="Proč právě tato věta." autocomplete="off"></div>';
    }

    // ── Render formuláře ──
    var formBody = '';
    if (typ === 'categorisation-board') {
      formBody = buildCatBoardForm();
    } else {
      for (var k = 0; k < count; k++) {
        formBody += '<div class="mf-item-block" id="mfItem' + k + '">';
        if (count > 1) formBody += '<div class="mf-item-head">Otázka ' + (k + 1) + ' z ' + count + '</div>';
        if (typ === 'ordering') formBody += buildOrderingForm(k);
        else if (typ === 'multi-select') formBody += buildMultiSelectForm(k);
        else if (typ === 'highlight-evidence') formBody += buildHighlightForm(k);
        else if (typ === 'transformation-chain') formBody += buildTransformChainForm(k);
        else if (typ === 'error-tagging') formBody += buildErrorTaggingForm(k);
        else if (typ === 'banked cloze') formBody += buildBankedClozeForm(k);
        else if (typ === 'multiple matching') formBody += buildMultipleMatchingForm(k);
        else if (typ === 'table-completion') formBody += buildTableCompletionForm(k);
        formBody += '</div>';
      }
    }

    backdrop.innerHTML = '<div class="ui-modal-box mf-box">'
      + '<div class="ui-modal-head">✏️ Ruční zadání: ' + esc(exCfg.typ || '') + ' (cvičení ' + (exIndex + 1) + ')</div>'
      + '<div class="mf-body">' + formBody + '</div>'
      + '<div class="mf-footer">'
      + '<button type="button" class="mf-btn-ok" id="btnMfOk">✅ Hotovo</button>'
      + '<button type="button" class="mf-btn-cancel" id="btnMfCancel">Zrušit a použít AI</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(backdrop);

    // ── Dynamické aktualizace select kategorií (catBoard) ──
    if (typ === 'categorisation-board') {
      function syncCatSelects() {
        var cats = Array.from(backdrop.querySelectorAll('.mf-cat-inp')).map(function(i) { return i.value.trim(); }).filter(Boolean);
        backdrop.querySelectorAll('.mf-entry-cat').forEach(function(sel) {
          var cur = sel.value;
          sel.innerHTML = '<option value="">— kategorie —</option>';
          cats.forEach(function(c) { sel.innerHTML += '<option value="' + esc(c) + '"' + (cur === c ? ' selected' : '') + '>' + esc(c) + '</option>'; });
        });
      }
      backdrop.addEventListener('input', function(e) { if (e.target.classList.contains('mf-cat-inp')) syncCatSelects(); });
      backdrop.addEventListener('change', function(e) { if (e.target.classList.contains('mf-cat-inp')) syncCatSelects(); });

      // Add entry button
      backdrop.querySelector('#btnAddEntry').onclick = function() {
        var cats = Array.from(backdrop.querySelectorAll('.mf-cat-inp')).map(function(i) { return i.value.trim(); }).filter(Boolean);
        var opts = '<option value="">— kategorie —</option>' + cats.map(function(c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
        var d = backdrop.querySelector('#mfEntries');
        var r = document.createElement('div'); r.className = 'mf-row mf-entry-row';
        r.innerHTML = '<input class="mf-input mf-entry-text" placeholder="Slovo nebo věta" autocomplete="off"><select class="mf-select mf-entry-cat">' + opts + '</select><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button>';
        d.appendChild(r);
      };
    }

    // ── Helper functions exposed to inline onclick ──
        window.addChainStep = function(itemIndex) {
      var d = backdrop.querySelector('#mfChain' + itemIndex);
      if (!d) return;
      var n = d.querySelectorAll('.mf-chain-step').length + 1;
      var r = document.createElement('div'); r.className = 'mf-chain-step mf-row-block';
      r.innerHTML = '<div class="mf-step-label">Krok ' + n + '</div>'
        + '<div class="mf-row"><label class="mf-sub">Instrukce</label><input class="mf-input" autocomplete="off" data-field="instruction"></div>'
        + '<div class="mf-row"><label class="mf-sub">Správná odpověď</label><input class="mf-input" autocomplete="off" data-field="answer"></div>'
        + '<div class="mf-row"><label class="mf-sub">Alternativy</label><input class="mf-input" autocomplete="off" data-field="alts"></div>';
      d.appendChild(r);
    };
    window.addParaRow = function(itemIndex) {
      var d = backdrop.querySelector('#mfParas' + itemIndex);
      if (!d) return;
      var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var n = d.querySelectorAll('.mf-row-block').length;
      var r = document.createElement('div'); r.className = 'mf-row-block';
      r.innerHTML = '<div class="mf-step-label">' + (letters[n] || (n+1)) + '</div><textarea class="mf-input mf-textarea-sm" rows="2" placeholder="Text odstavce…"></textarea>';
      d.appendChild(r);
    };
    window.addStatementRow = function(itemIndex) {
      var d = backdrop.querySelector('#mfStatements' + itemIndex);
      if (!d) return;
      var n = d.querySelectorAll('.mf-row').length + 1;
      var r = document.createElement('div'); r.className = 'mf-row';
      r.innerHTML = '<span class="mf-step-num">' + n + '.</span><input class="mf-input" placeholder="Tvrzení ' + n + '" autocomplete="off"><input class="mf-input mf-narrow" placeholder="A" autocomplete="off" title="Správný odstavec"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button>';
      d.appendChild(r);
    };
    window.addTableRow = function(itemIndex) {
      var d = backdrop.querySelector('#mfTableRows' + itemIndex);
      if (!d) return;
      var r = document.createElement('div'); r.className = 'mf-row';
      r.innerHTML = '<input class="mf-input" placeholder="buňka1 | buňka2 | " autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button>';
      d.appendChild(r);
    };
    window.addCatRow = function() {
      var d = backdrop.querySelector('#mfCategories');
      if (!d) return;
      var r = document.createElement('div'); r.className = 'mf-row';
      r.innerHTML = '<input class="mf-input mf-cat-inp" placeholder="Nová kategorie" autocomplete="off">'
        + '<button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">\xc3\x97</button>';
      d.appendChild(r);
    };
window.reNumberSteps = function(itemIndex) {
      var rows = backdrop.querySelectorAll('#mfSteps' + itemIndex + ' .mf-row');
      rows.forEach(function(r, i) { var n = r.querySelector('.mf-step-num'); if (n) n.textContent = (i + 1) + '.'; });
    };
    window.addOrderStep = function(itemIndex) {
      var d = backdrop.querySelector('#mfSteps' + itemIndex);
      if (!d) return;
      var n = d.querySelectorAll('.mf-row').length + 1;
      var r = document.createElement('div'); r.className = 'mf-row';
      r.innerHTML = '<span class="mf-step-num">' + n + '.</span><input class="mf-input" placeholder="Krok ' + n + '" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove();reNumberSteps(' + itemIndex + ')">×</button>';
      d.appendChild(r);
    };
    window.addOptionRow = function(itemIndex) {
      var d = backdrop.querySelector('#mfOptions' + itemIndex);
      if (!d) return;
      var r = document.createElement('div'); r.className = 'mf-row';
      r.innerHTML = '<input type="checkbox" class="mf-chk"><input class="mf-input" placeholder="Nová možnost" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button>';
      d.appendChild(r);
    };
    window.addSentenceRow = function(itemIndex) {
      var d = backdrop.querySelector('#mfSentences' + itemIndex);
      if (!d) return;
      var n = d.querySelectorAll('.mf-row').length;
      var r = document.createElement('div'); r.className = 'mf-row';
      r.innerHTML = '<input type="radio" name="mfCorrect' + itemIndex + '" class="mf-radio" value="' + n + '"><input class="mf-input" placeholder="Nová věta" autocomplete="off"><button type="button" class="mf-del" onclick="this.closest(\'.mf-row\').remove()">×</button>';
      d.appendChild(r);
    };

    // ── Sběr dat z formuláře ──
    function collectData() {
      var items = [];
      var err = '';
      if (typ === 'categorisation-board') {
        var q = (backdrop.querySelector('#mfQuestion0') || {}).value || '';
        var cats = Array.from(backdrop.querySelectorAll('.mf-cat-inp')).map(function(i) { return i.value.trim(); }).filter(Boolean);
        var entries = Array.from(backdrop.querySelectorAll('.mf-entry-row')).map(function(r) {
          return { text: (r.querySelector('.mf-entry-text') || {}).value || '', category: (r.querySelector('.mf-entry-cat') || {}).value || '' };
        }).filter(function(e) { return e.text; });
        var expl = (backdrop.querySelector('#mfExpl0') || {}).value || '';
        if (!q) err = 'Zadej otázku.';
        else if (cats.length < 2) err = 'Zadej alespoň 2 kategorie.';
        else if (entries.length < 2) err = 'Zadej alespoň 2 položky k zařazení.';
        else if (entries.some(function(e) { return !e.category; })) err = 'Každé položce přiřaď kategorii.';
        if (!err) items.push({ question: q, categories: cats, entries: entries, explanation: expl });
      } else {
        for (var k = 0; k < count; k++) {
          var q2 = (backdrop.querySelector('#mfQuestion' + k) || {}).value || '';
          var expl2 = (backdrop.querySelector('#mfExpl' + k) || {}).value || '';
          if (typ === 'ordering') {
            var steps = Array.from(backdrop.querySelectorAll('#mfSteps' + k + ' .mf-row')).map(function(r) { return (r.querySelector('input[type=text], input:not([type])') || {}).value || ''; }).filter(Boolean);
            if (!q2) err = 'Otázka ' + (k + 1) + ': zadej text otázky.';
            else if (steps.length < 2) err = 'Otázka ' + (k + 1) + ': zadej alespoň 2 kroky.';
            if (err) break;
            var co = steps.map(function(_, i) { return i; });
            items.push({ question: q2, items: steps, correct_order: co, explanation: expl2 });
          } else if (typ === 'multi-select') {
            var optRows = Array.from(backdrop.querySelectorAll('#mfOptions' + k + ' .mf-row'));
            var opts = optRows.map(function(r) { return (r.querySelector('input:not([type=checkbox])') || {}).value || ''; });
            var correct = optRows.map(function(r, i) { return (r.querySelector('.mf-chk') || {}).checked ? i : -1; }).filter(function(i) { return i >= 0; });
            opts = opts.filter(function(o) { return o; });
            if (!q2) err = 'Otázka ' + (k + 1) + ': zadej text otázky.';
            else if (opts.length < 2) err = 'Otázka ' + (k + 1) + ': zadej alespoň 2 možnosti.';
            else if (!correct.length) err = 'Otázka ' + (k + 1) + ': zaškrtni alespoň jednu správnou odpověď.';
            if (err) break;
            items.push({ question: q2, options: opts, correct: correct, explanation: expl2 });
          } else if (typ === 'highlight-evidence') {
            var sentRows = Array.from(backdrop.querySelectorAll('#mfSentences' + k + ' .mf-row'));
            var sents = sentRows.map(function(r) { return (r.querySelector('input:not([type=radio])') || {}).value || ''; }).filter(Boolean);
            var correctRadio = backdrop.querySelector('input[name="mfCorrect' + k + '"]:checked');
            var correctIdx = correctRadio ? parseInt(correctRadio.value) : -1;
            if (!q2) err = 'Otázka ' + (k + 1) + ': zadej text otázky.';
            else if (sents.length < 2) err = 'Otázka ' + (k + 1) + ': zadej alespoň 2 věty.';
            else if (correctIdx < 0) err = 'Otázka ' + (k + 1) + ': označ správnou větu.';
            if (err) break;
            items.push({ question: q2, sentences: sents, correct: correctIdx, explanation: expl2 });
          } else if (typ === 'transformation-chain') {
            var chainSteps = Array.from(backdrop.querySelectorAll('#mfChain' + k + ' .mf-chain-step')).map(function(s) {
              return { instruction: (s.querySelector('[data-field=instruction]')||{}).value||'', answer: (s.querySelector('[data-field=answer]')||{}).value||'', alt_answers: ((s.querySelector('[data-field=alts]')||{}).value||'').split('|').map(function(x){return x.trim();}).filter(Boolean) };
            }).filter(function(s){ return s.instruction && s.answer; });
            if (!q2) err = 'Otázka ' + (k+1) + ': zadej výchozí větu.';
            else if (chainSteps.length < 1) err = 'Otázka ' + (k+1) + ': zadej alespoň 1 transformaci.';
            if (err) break;
            items.push({ question: q2, transformations: chainSteps, explanation: expl2 });
          } else if (typ === 'error-tagging') {
            var sent = (backdrop.querySelector('#mfSentence' + k)||{}).value||'';
            var errIdx = parseInt((backdrop.querySelector('#mfErrIdx' + k)||{}).value||'-1');
            var errType = (backdrop.querySelector('#mfErrType' + k)||{}).value||'';
            var errCorr = (backdrop.querySelector('#mfErrCorr' + k)||{}).value||'';
            if (!sent) err = 'Otázka ' + (k+1) + ': zadej větu s chybou.';
            else if (isNaN(errIdx)||errIdx<0) err = 'Otázka ' + (k+1) + ': zadej index chybného tokenu (0 = první slovo).';
            else if (!errType) err = 'Otázka ' + (k+1) + ': zadej typ chyby.';
            else if (!errCorr) err = 'Otázka ' + (k+1) + ': zadej opravu.';
            if (err) break;
            items.push({ sentence: sent, error_token_index: errIdx, error_type: errType, correction: errCorr, explanation: expl2 });
          } else if (typ === 'banked cloze') {
            var txt = (backdrop.querySelector('#mfText' + k)||{}).value||'';
            var bank = ((backdrop.querySelector('#mfBank' + k)||{}).value||'').split(',').map(function(w){return w.trim();}).filter(Boolean);
            var ansList = ((backdrop.querySelector('#mfAnswers' + k)||{}).value||'').split(',').map(function(w){return w.trim();}).filter(Boolean);
            if (!txt) err = 'Otázka ' + (k+1) + ': zadej text s mezerami.';
            else if (bank.length < 2) err = 'Otázka ' + (k+1) + ': zásobník musí mít alespoň 2 slova.';
            else if (!ansList.length) err = 'Otázka ' + (k+1) + ': zadej správné odpovědi.';
            if (err) break;
            items.push({ text: txt, words: bank, answers: ansList, explanation: expl2 });
          } else if (typ === 'multiple matching') {
            var paras = Array.from(backdrop.querySelectorAll('#mfParas' + k + ' .mf-row-block')).map(function(b,i){ var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return { id: letters[i]||String(i+1), text: (b.querySelector('textarea')||{}).value||'' }; }).filter(function(p){return p.text;});
            var stmts = Array.from(backdrop.querySelectorAll('#mfStatements' + k + ' .mf-row')).map(function(r){ var ins=r.querySelectorAll('input'); return { text: (ins[0]||{}).value||'', correct: (ins[1]||{}).value||'' }; }).filter(function(s){return s.text;});
            if (paras.length < 2) err = 'Otázka ' + (k+1) + ': zadej alespoň 2 odstavce.';
            else if (stmts.length < 2) err = 'Otázka ' + (k+1) + ': zadej alespoň 2 tvrzení.';
            if (err) break;
            items.push({ paragraphs: paras, items: stmts, explanation: expl2 });
          } else if (typ === 'table-completion') {
            var hdrs = ((backdrop.querySelector('#mfHeaders' + k)||{}).value||'').split('|').map(function(h){return h.trim();}).filter(Boolean);
            var trows = Array.from(backdrop.querySelectorAll('#mfTableRows' + k + ' .mf-row')).map(function(r){ return { cells: ((r.querySelector('input')||{}).value||'').split('|').map(function(c){return c.trim();}) }; }).filter(function(r){return r.cells.some(function(c){return c;});});
            var tAnswers = ((backdrop.querySelector('#mfTableAnswers' + k)||{}).value||'').split('|').map(function(a){return a.trim();}).filter(Boolean);
            if (hdrs.length < 2) err = 'Otázka ' + (k+1) + ': zadej alespoň 2 záhlaví sloupců (oddělená |).';
            else if (trows.length < 1) err = 'Otázka ' + (k+1) + ': zadej alespoň 1 řádek tabulky.';
            if (err) break;
            items.push({ headers: hdrs, rows: trows, answers: tAnswers, explanation: expl2 });
          }
        }
      }
      return err ? null : { _err: false, items: items };
    }

    // ── Tlačítka ──
    backdrop.querySelector('#btnMfOk').onclick = function() {
      var data = collectData();
      if (!data) {
        // Find the first error message shown
        uiToast('Zkontroluj formulář — některé pole chybí nebo je prázdné.', 'warn', 4000);
        return;
      }
      document.body.removeChild(backdrop);
      resolve({ type: typ, items: data.items, points_total: exCfg.body || 0 });
    };
    backdrop.querySelector('#btnMfCancel').onclick = function() {
      document.body.removeChild(backdrop);
      resolve(null); // null = use AI instead
    };
  });
}

// ── Generování s manuálními cvičeními ────────────────────────────────────────
async function generateTestWithManual(state, filePack, useUrlContext) {
  const configs = state.exerciseConfig || [];
  const exerciseResults = new Array(configs.length).fill(null);
  const manualIndices = [];
  const aiIndices = [];
  configs.forEach(function(ex, i) {
    if (ex.manualMode && isManualSupported(ex.typ)) manualIndices.push(i);
    else aiIndices.push(i);
  });

  // Krok 1: manuální formuláře (před AI, ať UI nekouká na prázdný spinner)
  for (var mi = 0; mi < manualIndices.length; mi++) {
    var i = manualIndices[mi];
    setGenMsg('✏️ Čekám na ruční zadání cvičení ' + (i + 1) + '/' + configs.length + ' (' + configs[i].typ + ')…');
    var manData = await showManualExerciseForm(configs[i], i);
    if (!manData) {
      // Zrušeno → přesuneme do AI
      aiIndices.push(i);
      aiIndices.sort(function(a, b) { return a - b; });
    } else {
      exerciseResults[i] = manData;
    }
  }

  // Krok 2: AI generování zbývajících cvičení
  if (aiIndices.length > 0) {
    if (state.splitGenerate) {
      for (var ai = 0; ai < aiIndices.length; ai++) {
        var idx = aiIndices[ai];
        setGenMsg('📦 Generuji cvičení ' + (idx + 1) + '/' + configs.length + ': ' + configs[idx].typ + '…');
        var singleState = Object.assign({}, state, { exerciseConfig: [configs[idx]] });
        var singlePrompt = buildContentPrompt(singleState, filePack.notes || []);
        var sData = await callGeminiJSON(singlePrompt, filePack.parts, { urlContext: useUrlContext });
        if (sData.exercises && sData.exercises.length > 0) exerciseResults[idx] = sData.exercises[0];
      }
    } else {
      var aiState = Object.assign({}, state, { exerciseConfig: aiIndices.map(function(i) { return configs[i]; }) });
      var aiPrompt = buildContentPrompt(aiState, filePack.notes || []);
      setGenMsg('Volám Gemini AI pro ' + aiIndices.length + ' cvičení…');
      var aiData = await callGeminiJSON(aiPrompt, filePack.parts, { urlContext: useUrlContext });
      if (aiData.exercises) {
        aiData.exercises.forEach(function(ex, j) {
          if (j < aiIndices.length) exerciseResults[aiIndices[j]] = ex;
        });
      }
    }
  }

  setGenMsg('Sestavuji test a validuji…');
  var cleanResults = exerciseResults.filter(function(e) { return e !== null; }).map(function(ex) {
    var c = Object.assign({}, ex); delete c.manualMode; return c;
  });
  var combinedData = { exercises: cleanResults };
  lastGenData = combinedData;
  return await assembleTestHtml(state, combinedData);
}

// SPLIT GENEROVÁNÍ: každé cvičení jako samostatný API request.
// Výhoda: menší, jednodušší JSON → spolehlivější. Nevýhoda: N API callů místo 1.
// Dostupné jen v pokročilém módu (toggle 📦 Po cvičeních).
async function runSplitGeneration(state, filePack, useUrlContext) {
  const exercises = state.exerciseConfig || [];
  const total = exercises.length;
  const collectedExercises = [];
  for (let i = 0; i < total; i++) {
    const ex = exercises[i];
    setGenMsg('📦 Generuji cvičení ' + (i + 1) + ' / ' + total + ': ' + (ex.typ || '?') + '…');
    // Vytvořit kopii stavu s jediným cvičením
    const singleState = Object.assign({}, state, { exerciseConfig: [ex] });
    const singlePrompt = buildContentPrompt(singleState, filePack.notes || []);
    let singleData = null;
    let correctiveNote = '';
    const MAX_SINGLE = 2;
    for (let attempt = 1; ; attempt++) {
      if (attempt > 1) setGenMsg('📦 Cvičení ' + (i + 1) + '/' + total + ' — opravuji (pokus ' + attempt + '/' + MAX_SINGLE + ')…');
      singleData = await callGeminiJSON(singlePrompt + correctiveNote, filePack.parts, { urlContext: useUrlContext });
      // Validace jednoho cvičení: vezmi jen exercises[0] a validuj
      const testData = { exercises: singleData.exercises || [] };
      try {
        // Dummy check: assembleTestHtml validuje celý test — použijeme validateExerciseSetStrict přímo
        if (!testData.exercises.length) {
          const err = new Error('Cvičení ' + (i + 1) + ' (' + ex.typ + '): model nevrátil žádné cvičení.');
          err.isExerciseValidation = true;
          err.validationDetails = 'prázdný exercises[]';
          throw err;
        }
        break; // základní check prošel
      } catch (ve) {
        const isValFail = ve && (ve.isExerciseValidation === true || /data mimo zadání/i.test(String(ve.message || '')));
        if (isValFail && attempt < MAX_SINGLE) {
          correctiveNote = '\n\n--- OPRAVNÝ POKYN ---\nPřechozí pokus pro cvičení ' + (i + 1) + ' (' + ex.typ + ') selhal:\n- '
            + (ve.validationDetails || ve.message || '')
            + '\nVrať KOMPLETNÍ a POUZE validní JSON s JEDNÍM cvičením ve struktuře {"exercises":[{...}]}.';
          continue;
        }
        throw ve;
      }
    }
    // Vezmi první exercise z odpovědi
    if (singleData.exercises && singleData.exercises.length > 0) {
      collectedExercises.push(singleData.exercises[0]);
    }
  }
  setGenMsg('📦 Všechna cvičení vygenerována — sestavuji test a validuji…');
  const combinedData = { exercises: collectedExercises };
  lastGenData = combinedData;
  return await assembleTestHtml(state, combinedData);
}

// ── AUTOMATICKÝ HYBRID: složitá cvičení každé zvlášť (split), jednoduchá najednou (batch) ──
// complexIdxs = indexy do state.exerciseConfig se složitými typy (MANUAL_SUPPORTED_TYPES)
// simpleIdxs  = indexy s jednoduchými typy
async function runHybridGeneration(state, filePack, useUrlContext, complexIdxs, simpleIdxs) {
  const configs = state.exerciseConfig || [];
  const total = configs.length;
  const exerciseResults = new Array(total).fill(null);
  const MAX_SINGLE = 2;

  // Krok 1: složitá cvičení — každé zvlášť
  for (let ci = 0; ci < complexIdxs.length; ci++) {
    const idx = complexIdxs[ci];
    const ex = configs[idx];
    setGenMsg('⚡ Hybrid: složité cvičení ' + (ci + 1) + '/' + complexIdxs.length + ' (' + (ex.typ || '?') + ')…');
    const singleState = Object.assign({}, state, { exerciseConfig: [ex] });
    const singlePrompt = buildContentPrompt(singleState, filePack.notes || []);
    let singleData = null;
    let correctiveNote = '';
    for (let attempt = 1; ; attempt++) {
      if (attempt > 1) setGenMsg('⚡ Hybrid: cvičení ' + (idx + 1) + '/' + total + ' — opravuji (pokus ' + attempt + '/' + MAX_SINGLE + ')…');
      singleData = await callGeminiJSON(singlePrompt + correctiveNote, filePack.parts, { urlContext: useUrlContext });
      if (singleData.exercises && singleData.exercises.length > 0) {
        exerciseResults[idx] = singleData.exercises[0];
        break;
      }
      if (attempt < MAX_SINGLE) {
        correctiveNote = '\n\n--- OPRAVNÝ POKYN ---\nPředchozí pokus pro cvičení ' + (idx + 1) + ' (' + ex.typ + ') selhal: prázdný exercises[].\nVrať KOMPLETNÍ a POUZE validní JSON s JEDNÍM cvičením ve struktuře {"exercises":[{...}]}.';
        continue;
      }
      // Po MAX pokusech: ulož marker selhání
      exerciseResults[idx] = { __hybridFailed: true, typ: ex.typ, idx: idx };
      break;
    }
  }

  // Krok 2: jednoduchá cvičení — najednou (batch)
  if (simpleIdxs.length > 0) {
    setGenMsg('⚡ Hybrid: generuji ' + simpleIdxs.length + ' jednoduchých cvičení najednou…');
    const simpleConfigs = simpleIdxs.map(function(i) { return configs[i]; });
    const batchState = Object.assign({}, state, { exerciseConfig: simpleConfigs });
    const batchPrompt = buildContentPrompt(batchState, filePack.notes || []);
    const MAX_BATCH = 2;
    let batchCorrectiveNote = '';
    let batchData = null;
    for (let attempt = 1; ; attempt++) {
      if (attempt > 1) setGenMsg('⚡ Hybrid: jednoduchá cvičení — opravuji (pokus ' + attempt + '/' + MAX_BATCH + ')…');
      batchData = await callGeminiJSON(batchPrompt + batchCorrectiveNote, filePack.parts, { urlContext: useUrlContext });
      if (batchData.exercises && batchData.exercises.length > 0) break;
      if (attempt < MAX_BATCH) {
        batchCorrectiveNote = '\n\n--- OPRAVNÝ POKYN ---\nVrať KOMPLETNÍ JSON se VŠEMI ' + simpleIdxs.length + ' cvičeními ve struktuře {"exercises":[...]}.';
        continue;
      }
      break;
    }
    if (batchData && batchData.exercises) {
      batchData.exercises.forEach(function(ex, j) {
        if (j < simpleIdxs.length) exerciseResults[simpleIdxs[j]] = ex;
      });
    }
  }

  // Krok 3: sestav v původním pořadí, přeskoč failed
  const failedTypes = exerciseResults.filter(function(r) { return r && r.__hybridFailed; }).map(function(r) { return r.typ; });
  const cleanResults = exerciseResults.filter(function(e) { return e && !e.__hybridFailed; });

  setGenMsg('⚡ Hybrid: sestavuji test a validuji…');
  const combinedData = { exercises: cleanResults };
  lastGenData = combinedData;
  const built = await assembleTestHtml(state, combinedData);

  // Pokud něco selhalo: zobraz informativní banner
  if (failedTypes.length > 0) {
    const msg = '⚠️ Cvičení ' + failedTypes.join(', ') + ' se nepodařilo vygenerovat automaticky. Použij ruční editaci (✏️) pro tato cvičení v pokročilém módu.';
    setTimeout(function() { setGenErr(msg); }, 100);
  }
  return built;
}


async function generateTest(){
  // NEOFICIÁLNÍ kopie (cizí fork/hosting) → generování je zakázané. Tvrdá zarážka.
  // Platí jen když je nastavená oficiální adresa (jinak je envKind 'unverified' a pustí).
  if (typeof Access !== 'undefined' && Access.blockAllGeneration){
    var expected = OFFICIAL_ORIGINS.join(', ') + (OFFICIAL_PATH_PREFIXES.length ? (' (cesta: ' + OFFICIAL_PATH_PREFIXES.join(', ') + ')') : '');
    setGenErr('⛔ Tohle je neoficiální kopie aplikace — generování testu je tu zakázané. Běží z „' + (location.origin || '?') + location.pathname + '", ale oficiální umístění je „' + expected + '". Otevři generátor z oficiální adresy.');
    setGenUI('error');
    return;
  }
  // Klasifikovaný (ostrý) test = secureOffline (přísný režim ho vždy vynutí). Z NEOVĚŘENÉHO
  // umístění ho nepustíme jen „na jedno kliknutí" — tvrdý stop. Jediná výjimka: admin
  // z místního souboru (file://, vývoj) smí jednou vědomě potvrdit pro vlastní testování.
  if ((state.resultMode || 'instant') === 'secureOffline' && typeof Access !== 'undefined' && Access.warnLevel === 'block'){
    const isAdmin = !!(Access.profile && Access.profile.role === 'admin');
    const isLocalFile = (Access.envKind === 'local'); // file:// — vývoj
    if (isAdmin && isLocalFile){
      const proceed = await uiConfirm('Vývojové spuštění z místního souboru (file://). Ostrý (klasifikovaný) test by se měl generovat jen z oficiální adresy. Jako admin můžeš pro účely testování pokračovat, ale vygenerovaný test NEPOUŽÍVEJ pro skutečné známkování. Pokračovat?', 'Vývojové spuštění — ostrý test', true);
      if (!proceed) return;
    } else {
      const oficialni = (typeof OFFICIAL_ORIGINS!=='undefined'&&OFFICIAL_ORIGINS.length) ? OFFICIAL_ORIGINS.join(', ') : 'oficiální školní adresa';
      setGenErr('Ostrý (klasifikovaný) test lze generovat jen z oficiální adresy (' + oficialni + '). Tahle kopie běží z neověřeného umístění (' + (location.origin && location.origin !== 'null' ? location.origin : 'místní soubor') + (location.pathname || '') + '), takže nelze ověřit aktuálnost přístupového seznamu ani odvolání přístupů. Otevři oficiální odkaz a spusť generování znovu. Pro neznámkovaný procvičovací test přepni „Režim výsledků" na okamžitou známku.');
      return;
    }
  }
  // Když uživatel klíč napsal, ale nezvolil žádné tlačítko (relace/trvale), vezmeme ho
  // automaticky pro tuto relaci — ať generování nezačne padat jen kvůli nekliknutí.
  if(!geminiApiKey){
    const typed=getGeminiInputKey();
    if(typed){ useGeminiKeyForSession(); }
  }
  if(!geminiApiKey){$('geminiKeyInput')?.focus();setGenErr('Nejdříve zadej Gemini API klíč do žluté sekce (a nech ho aspoň „jen pro relaci").');return;}
  const cooldownMs = geminiCooldownRemainingMs();
  if(cooldownMs > 0){
    setGenErr('Překročen limit Gemini API. Generování je dočasně pozastavené; zkus to znovu za ' + geminiFormatWait(cooldownMs) + '. Neklikej opakovaně, tím by se limit mohl dál pálit.');
    geminiUpdateCooldownUI();
    return;
  } else {
    geminiClearCooldown();
  }
  generatedTestHtml=''; generatedPackage=null; generatedIntegrity=null; lastGenData=null; lastAssembled=null; lastSelfTest=null; secureGapsAcknowledged=false;
  resetKeyCheckState();
  resetVerificationReports();
  setGenUI('loading');setGenMsg('Kontroluji soubory a připravuji zdroje…');
  try{
    await waitForFileReads();
    const filePack=await buildGeminiFilePartsForApi();
    const prompt=buildContentPrompt(state,filePack.notes||[]);
    const useUrlContext=state.zadaniTab==='url'&&Array.isArray(state.urls)&&state.urls.some(u=>String(u||'').trim());
    setGenMsg(useUrlContext?'Volám Gemini AI s URL Context nástrojem…':(filePack.parts.length?'Volám Gemini AI s multimodálními přílohami…':'Volám Gemini AI – generuji obsah cvičení…'));
    // Auto-oprava: když výstup neprojde STRIKTNÍ validací (špatný počet položek, typ…),
    // jednou se zeptáme AI znovu s přesným seznamem chyb. Stojí to 1 požadavek navíc,
    // jen při selhání. Opakuje se POUZE na validační chyby — ne na crypto/síť/limit.
    // DISPATCH: manuální → hybrid-auto → split (pokročilý) → batch
    let built;
    const hasManual = (state.exerciseConfig || []).some(function(ex){ return ex.manualMode && isManualSupported(ex.typ); });
    const complexIdxs = (state.exerciseConfig || []).reduce(function(acc,ex,i){ if(isManualSupported(ex.typ||'')) acc.push(i); return acc; },[]);
    const simpleIdxs  = (state.exerciseConfig || []).reduce(function(acc,ex,i){ if(!isManualSupported(ex.typ||'')) acc.push(i); return acc; },[]);
    const hasComplex = !hasManual && complexIdxs.length > 0 && state.exerciseDetail;
    if (hasManual) {
      // Alespoň jedno cvičení je manuální → použij kombinovaný generátor
      built = await generateTestWithManual(state, filePack, useUrlContext);
    } else if (hasComplex) {
      // AUTOMATICKÝ HYBRID: složitá cvičení každé zvlášť, jednoduchá najednou
      built = await runHybridGeneration(state, filePack, useUrlContext, complexIdxs, simpleIdxs);
    } else if (state.splitGenerate) {
      built = await runSplitGeneration(state, filePack, useUrlContext);
    } else {
    const MAX_GEN_ATTEMPTS = 2; // 1 původní + 1 oprava
    let correctiveNote = '';
    for (let attempt = 1; ; attempt++) {
      if (attempt > 1) setGenMsg('Výstup neprošel validací — žádám AI o opravu (pokus ' + attempt + '/' + MAX_GEN_ATTEMPTS + ')…');
      const data = await callGeminiJSON(prompt + correctiveNote, filePack.parts, {urlContext:useUrlContext});
      lastGenData = data;
      setGenMsg('Tvrdě kontroluji strukturu, počty položek a body…');
      try {
        built = await assembleTestHtml(state, data);
        break; // úspěch
      } catch (ve) {
        const isValFail = ve && (ve.isExerciseValidation === true || /data mimo zadání/i.test(String(ve.message||'')));
        if (isValFail && attempt < MAX_GEN_ATTEMPTS) {
          correctiveNote = '\n\n--- OPRAVNÝ POKYN (PŘEDCHOZÍ POKUS SELHAL) ---\nTvá minulá odpověď NEPROŠLA striktní validací aplikace kvůli těmto konkrétním chybám:\n- '
            + (ve.validationDetails || ve.message || '')
            + '\nOprav PŘESNĚ tyto body. U KAŽDÉHO cvičení dodrž přesný počet položek, správný typ a všechna povinná pole. Vrať KOMPLETNÍ a POUZE validní JSON ve stejné struktuře, bez markdownu.';
          continue; // jeden opravný pokus
        }
        throw ve; // jiná chyba nebo došly pokusy → ven na běžné zobrazení chyby
      }
    }
    } // end else (non-split / non-manual)
    if (built && typeof built === 'object' && built.mode === 'secureOffline') {
      generatedPackage=built;
      generatedIntegrity=integrityDataForCurrentOutput();
      setGenMsg('Spouštím interní smoke test studentského souboru i verifieru…');
      validateSecurePackageSmoke(generatedPackage);
    } else {
      generatedTestHtml=String(built||'');
      const cfg=lastAssembled&&lastAssembled.cfg;
      generatedIntegrity={mode:'instant',testId:cfg&&cfg.testId||'',manifestHash:cfg&&cfg.manifestHash||'',buildHash:cfg&&cfg.buildHash||BUILD_HASH,generatorVersion:cfg&&cfg.generatorVersion||RELEASE.version,generatedAt:cfg&&cfg.generatedAt||'',creatorId:cfg&&cfg.creatorId||'',creatorName:cfg&&cfg.creatorName||'',creatorRole:cfg&&cfg.creatorRole||'',studentHtmlSha256:await sha256HexText(generatedTestHtml),teacherHtmlSha256:''};
      setGenMsg('Spouštím interní smoke test HTML a JavaScriptu…');
      validateGeneratedHtmlSmoke(generatedTestHtml);
    }
    exportChecklist = {};
    resetVerificationReports();
    setGenUI('done');
    renderQualityDiagnostics();
    renderExportChecklist(true);
    if (lastGeminiJsonRepaired) {
      // 1) Diagnostický panel se surovou odpovědí (schovaný v <details>)
      const existingDiag = $('geminiRawDiag');
      if (existingDiag) existingDiag.remove();
      if (lastGeminiRawResponse) {
        const diag = document.createElement('details');
        diag.id = 'geminiRawDiag';
        diag.style.cssText = 'margin-top:10px;font-size:12px;border:1px dashed var(--bdr);border-radius:6px;padding:6px 8px;color:var(--t3)';
        const snip = String(lastGeminiRawResponse).slice(0, 2000) + (lastGeminiRawResponse.length > 2000 ? '\n…[zkráceno na 2 000 znaků]' : '');
        diag.innerHTML = '<summary style="cursor:pointer;font-weight:600;">🔍 Diagnostika: surová odpověď AI před opravou JSON</summary>'
          + '<pre style="white-space:pre-wrap;overflow-x:auto;margin:6px 0;max-height:180px;overflow-y:auto;font-size:11px;background:var(--bg2);padding:6px;border-radius:4px">' + esc(snip) + '</pre>'
          + '<button type="button" style="font-size:12px;padding:3px 10px;cursor:pointer;margin-top:4px" onclick="navigator.clipboard&&navigator.clipboard.writeText(lastGeminiRawResponse).then(()=>uiToast(\'Zkopírováno\',\'ok\',1500))">Kopírovat celou odpověď do schránky</button>';
        const genResult = $('genResult');
        if (genResult) genResult.appendChild(diag);
      }
      // 2) Pro klasifikovaný (secureOffline) test: explicitní potvrzení, jinak rollback.
      const isSecure = !!(generatedPackage && generatedPackage.mode === 'secureOffline');
      if (isSecure) {
        const ok = await uiModal({
          title: '⚠️ Klasifikovaný test — oprava JSON',
          message: 'Gemini vrátil nevalidní JSON, který byl automaticky opraven (uvozovky, escapování, koncové čárky, neuzavřené závorky). Oprava je konzervativní, ale výjimečně mohla obsah posunout.\n\nProtože jde o KLASIFIKOVANÝ test (Bezpečný offline), PŘED ZVEŘEJNĚNÍM otevři Teacher preview a ověř správné odpovědi. Surová odpověď AI je v diagnostickém panelu (🔍) níže.\n\nKliknutím „Zahodit" zahodíš výsledek a generuješ znovu.',
          okText: 'Zkontroloval/a jsem — pokračovat',
          cancelText: 'Zahodit a generovat znovu',
          danger: false
        });
        if (!ok) {
          const diag2 = $('geminiRawDiag'); if (diag2) diag2.remove();
          generatedPackage = null; generatedTestHtml = ''; generatedIntegrity = null;
          setGenUI('idle');
          uiToast('Test byl zahozen. Zkontroluj zadání a spusť generování znovu.', 'warn', 4500);
          return;
        }
      } else {
        await uiAlert(
          'Odpověď AI nebyla validní JSON a musela být automaticky opravena (uvozovky, escapování, koncové čárky, neuzavřené závorky). Oprava běžně obsah nemění, ale výjimečně mohla text posunout. Projdi správné odpovědi v náhledu nebo spusť „🔑 Ověřit klíč druhým průchodem (AI)". Surová odpověď AI je v diagnostickém panelu (🔍) níže.',
          '⚠️ Obsah byl automaticky opraven'
        );
      }
    }
  }
  catch(e){generatedTestHtml='';generatedPackage=null;setGenErr(e?.message||String(e));}
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SELF-TEST BODOVÁNÍ  (bod A z revize)
   Ověří, že hodnoticí logika dává očekávané body. Testuje SKUTEČNÝ emitovaný kód,
   ne jeho kopii: vygenerovaný student/verifier se vykreslí do skrytého iframe a
   volají se jejich VLASTNÍ funkce (scorePayload, decryptPayload,
   encryptPayloadForTeacher, calcScoreFromAnswers, scoreItem, correctIndex …).
   Co se ověřuje:
     1) vše správně → earned===total, 100 %
     2) vše špatně → earned===0, 0 %
     2b) RANDOMIZOVANĚ: od „vše špatně" k „vše správně" se po jedné obracejí položky
         na správné; v každém kroku musí být skóre v rozsahu 0–100 % a nesmí klesnout
         (monotonie). Chytá NELINEÁRNÍ chyby bodování, které krajní případy minou
         (chybný součet/zaokrouhlení při částečném skóre, přehozené body, přeplácení).
         Seed je pevný → reproducibilní.
     3) krypto řetězec: encrypt(student) → parseTxt+decrypt(verifier) → scorePayload
     4) varování: položky bez rozpoznatelného klíče správné odpovědi (mezera v datech)
   Spouštěj po každé změně hodnoticí logiky a před prvním ostrým klasifikovaným testem.
   ═════════════════════════════════════════════════════════════════════════════ */
const ST_WRONG = '\u0000zzqx_nonsense_selftest_\u0000'; // mimo Levenshtein≤1 i diakritickou shodu
const ST_EPS = 1e-6;
const ST_CHOICE_TYPES = ['multiple choice','reading comprehension','listening comprehension'];
function stPointOf(ex,i){return Array.isArray(ex.item_points)&&ex.item_points[i]!=null?(Number(ex.item_points[i])||0):(Number(ex.points_each)||1);}

function stMakeHiddenFrame(html, readyCheck){
  // readyCheck(win) → true, jakmile je emitovaný skript inicializovaný (funkce ve window).
  // Místo slepé pevné prodlevy aktivně čekáme, takže na zaneprázdněném stroji nevznikne
  // falešné „neexponuje X" a v běžném případě se vrátí dřív (jakmile je funkce k dispozici).
  return new Promise((resolve,reject)=>{
    const f=document.createElement('iframe');
    f.setAttribute('sandbox','allow-scripts allow-same-origin');
    f.style.cssText='position:fixed;left:-99999px;top:0;width:480px;height:640px;border:0;visibility:hidden';
    let settled=false, pollId=null, hardCap=null;
    const done=(fn,arg)=>{ if(settled)return; settled=true; if(pollId)clearInterval(pollId); if(hardCap)clearTimeout(hardCap); fn(arg); };
    const isReady=()=>{ try{ return readyCheck ? !!readyCheck(f.contentWindow) : true; }catch(_){ return false; } };
    const startWait=()=>{
      if(!readyCheck){ setTimeout(()=>done(resolve,f),80); return; } // zpětná kompatibilita
      if(isReady()){ done(resolve,f); return; }
      const deadline=Date.now()+4000; // max aktivní čekání na readiness po onload
      pollId=setInterval(()=>{
        if(isReady()) done(resolve,f);
        else if(Date.now()>deadline) done(resolve,f); // vrátíme i tak — kontrola výš selže s konkrétní hláškou
      },25);
    };
    f.onload=()=>setTimeout(startWait,0); // tick pro setTimeout(...,0) init skriptu
    f.onerror=()=>done(reject,new Error('Skrytý iframe se nepodařilo načíst.'));
    document.body.appendChild(f);
    f.srcdoc=html;
    hardCap=setTimeout(()=>done(resolve,f),8000); // celková pojistka
  });
}

// Správná odpověď ve tvaru, který hodnoticí funkce čeká; null = mezera v datech.
function stCorrectValue(win,ex,it){
  const type=ex.type, hasOpt=Array.isArray(it.options)&&it.options.length;
  if(ST_CHOICE_TYPES.includes(type)||(type==='dialogue completion'&&hasOpt)){
    const ci=win.correctIndex(it); return (ci>=0&&hasOpt)?ci:null;
  }
  if(type==='dialogue completion'){const a=it.answer||it.model_answer||''; return String(a).trim()?String(a):null;}
  if(type==='true/false') return !!it.correct;
  if(type==='categorization'){const a=it.correct_category||it.category||it.answer||''; return String(a).trim()?String(a):null;}
  if(type==='cloze text'||type==='fill-in-the-blank'){const k=Array.isArray(it.answers)?it.answers:(it.answer!=null?[it.answer]:[]); return k.length?k.map(x=>String(x)):null;}
  // Textové typy: čteme PŘESNĚ to pole, proti kterému boduje scoreItem i scoreItemSecure
  // (ne přes accepted — tu funkci má jen verifier, instant ji nemá; navíc bodování
  // čte konkrétní pole, ne sjednocený seznam, takže tohle je věrnější).
  // Nové/komplexní typy
  if(type==='multi-select') return Array.isArray(it.correct)&&it.correct.length?it.correct:null;
  if(type==='highlight-evidence') return (it.correct!=null&&!isNaN(Number(it.correct)))?Number(it.correct):null;
  if(type==='ordering') return Array.isArray(it.correct_order)&&it.correct_order.length?it.correct_order:null;
  if(type==='categorisation-board') return Array.isArray(it.entries)&&it.entries.length?it.entries.map(function(e){return e&&e.category!=null?String(e.category):'';}):(null);
  if(type==='transformation-chain') return Array.isArray(it.transformations)&&it.transformations.length?it.transformations.map(function(tr){return tr&&tr.answer!=null?String(tr.answer):'';}):null;
  if(type==='error-tagging') return (it.error_token_index!=null&&it.error_type!=null&&it.correction!=null)?{token:Number(it.error_token_index),etype:String(it.error_type),corr:String(it.correction)}:null;
  if(type==='banked cloze') return Array.isArray(it.answers)&&it.answers.length?it.answers:(it.answer!=null?[it.answer]:null);
  if(type==='multiple matching') return Array.isArray(it.items)&&it.items.length?it.items.map(function(s){return s&&s.correct!=null?String(s.correct):'';}):(null);
  let a;
  if(type==='error correction') a=(it.correction!=null?it.correction:it.answer);
  else if(type==='word order') a=(it.correct_sentence!=null?it.correct_sentence:it.answer);
  else if(type==='translation') a=(it.answer!=null?it.answer:it.translation);
  else a=it.answer; // sentence transformation, word formation
  return (a!=null&&String(a).trim())?String(a):null;
}
function stWrongValue(win,ex,it){
  const type=ex.type, hasOpt=Array.isArray(it.options)&&it.options.length;
  if(ST_CHOICE_TYPES.includes(type)||(type==='dialogue completion'&&hasOpt)){
    const ci=win.correctIndex(it),n=(it.options||[]).length; for(let i=0;i<n;i++)if(i!==ci)return i; return '';
  }
  if(type==='true/false') return !it.correct;
  if(type==='cloze text'||type==='fill-in-the-blank'||type==='banked cloze'){const k=Array.isArray(it.answers)?it.answers:(it.answer!=null?[it.answer]:[]); return k.map(function(){return ST_WRONG;});}
  if(type==='multi-select'){var opts=Array.isArray(it.options)?it.options:[]; var cor=Array.isArray(it.correct)?it.correct:[]; var wrong=[]; for(var i=0;i<opts.length;i++){if(!cor.includes(i))wrong.push(i);} return wrong.length?wrong:[];}
  if(type==='highlight-evidence'){var n2=Array.isArray(it.sentences)?it.sentences.length:2; var c2=Number(it.correct); for(var i2=0;i2<n2;i2++){if(i2!==c2)return i2;} return 0;}
  if(type==='ordering'){var ord=Array.isArray(it.correct_order)?it.correct_order.slice():[]; if(ord.length>1){var tmp=ord[0];ord[0]=ord[ord.length-1];ord[ord.length-1]=tmp;} return ord;}
  if(type==='categorisation-board'){var cats=Array.isArray(it.categories)?it.categories:['X','Y']; var entries2=Array.isArray(it.entries)?it.entries:[]; return entries2.map(function(e){var right=e&&e.category?String(e.category):''; return cats.find(function(c){return c!==right;})||cats[0]||'';});}
  if(type==='transformation-chain'){return Array.isArray(it.transformations)?it.transformations.map(function(){return ST_WRONG;}):[];}
  if(type==='error-tagging'){return {token:0,etype:ST_WRONG,corr:ST_WRONG};}
  if(type==='multiple matching'){return Array.isArray(it.items)?it.items.map(function(){return ST_WRONG;}):[];}
  return ST_WRONG;
}

// resp mapa (klíčování jako scorePayload) + seznam položek bez určitelného klíče.
function stBuildResp(win,exs,mode){
  const resp={}, gaps=[];
  exs.forEach((ex,ei)=>{
    if(ex.type==='matching'){
      (ex.items||[]).forEach((it,li)=>{
        const key=ei+'_match_'+li;
        if(mode==='correct'){ if(it.right==null||!String(it.right).trim()) gaps.push({ex:ei+1,q:li+1,type:ex.type}); resp[key]=String(it.right==null?'':it.right); }
        else resp[key]=ST_WRONG+'_'+ei+'_'+li;
      });
      return;
    }
    (ex.items||[]).forEach((it,qi)=>{
      const key=ei+'_'+qi;
      if(mode==='correct'){ const v=stCorrectValue(win,ex,it); if(v===null){gaps.push({ex:ei+1,q:qi+1,type:ex.type}); resp[key]='';} else resp[key]=v; }
      else resp[key]=stWrongValue(win,ex,it);
    });
  });
  return {resp,gaps};
}

/* ── Randomizovaný self-test: monotonie + rozsah 0–100 % ──────────────────────────
   Krajní případy (vše správně / vše špatně) minou NELINEÁRNÍ chyby v bodování:
   chybný součet při částečném skóre, špatné zaokrouhlení, přehozené body položek,
   přeplácený fuzzy kredit. Tady jdeme od „vše špatně" k „vše správně" a v každém
   kroku obrátíme jednu položku ze špatné na správnou. Invarianty:
     (R) ROZSAH: každé mezilehlé skóre je 0 ≤ % ≤ 100 (chytí záporné body, přeplácení).
     (M) MONOTONIE: oprava jedné položky na správnou nesmí skóre SNÍŽIT (chytí
         přehozené mapování bodů / chybu agregace — typický podpis nelineární chyby).
   Seed je pevný → výsledek je reproducibilní (žádný blikající gate). Vynecháme
   položky bez klíče (gaps) a matching s <2 možnostmi (degenerované). scoreVec()
   je předaná uzávěra: pro verifier volá scorePayload, pro instant calcScoreFromAnswers
   — testuje se TÁŽ reálná funkce jako u krajních případů. */
function stSeededRng(seed){var s=seed>>>0||1;return function(){s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

// Sestaví seznam „obracitelných" položek (klíč v resp mapě + jak vypadá správná a špatná hodnota).
// Vrací jen položky, u nichž má smysl testovat monotonii (mají určitelný klíč; matching ≥2).
function stFlippableSlots(win,exs){
  var slots=[];
  exs.forEach(function(ex,ei){
    if(ex.type==='matching'){
      var n=(ex.items||[]).length; if(n<2)return;
      (ex.items||[]).forEach(function(it,li){
        if(it.right==null||!String(it.right).trim())return;
        slots.push({matching:true,ei:ei,li:li,n:n,key:ei+'_match_'+li});
      });
      return;
    }
    (ex.items||[]).forEach(function(it,qi){
      var cv=stCorrectValue(win,ex,it); if(cv===null)return; // gap → vynech
      slots.push({matching:false,ei:ei,qi:qi,key:ei+'_'+qi,type:ex.type,correct:cv,wrong:stWrongValue(win,ex,it)});
    });
  });
  return slots;
}

// Náhodné pořadí oprav (špatně→správně) přes všechny obracitelné položky; v každém
// kroku přepočítá reálné skóre a ověří rozsah + monotonii. scoreFn(correctSet) → pct.
function stMonotonicVerdict(label,slots,scoreFn,seed){
  var issues=[];
  if(!slots.length) return {label:label,wantPct:null,gotPct:null,earned:'—',total:'—',grade:'',issues:issues,kind:'mono',skipped:true};
  var rng=stSeededRng(seed||0x9e3779b9);
  // zamíchej pořadí (Fisher–Yates se seedem)
  var order=slots.map(function(_,i){return i;});
  for(var i=order.length-1;i>0;i--){var j=Math.floor(rng()*(i+1));var t=order[i];order[i]=order[j];order[j]=t;}
  var correctSet=new Set();        // začínáme: nic není správně
  var prevPct=null, minPct=Infinity, maxPct=-Infinity, steps=0, violations=0;
  // krok 0: vše špatně
  var p0=scoreFn(correctSet); minPct=Math.min(minPct,p0); maxPct=Math.max(maxPct,p0);
  if(!(p0>=-1e-9&&p0<=100+1e-9)) issues.push('Rozsah: výchozí (vše špatně) = '+p0+' %, mimo 0–100 %.');
  prevPct=p0;
  // postupně obracej jednu položku na správnou
  for(var k=0;k<order.length;k++){
    correctSet.add(order[k]);
    var pct=scoreFn(correctSet); steps++;
    minPct=Math.min(minPct,pct); maxPct=Math.max(maxPct,pct);
    if(!(pct>=-1e-9&&pct<=100+1e-9)){ issues.push('Rozsah: po '+steps+' opravách = '+pct+' %, mimo 0–100 %.'); }
    if(pct < prevPct-1e-6){ violations++; if(violations<=3) issues.push('Monotonie: oprava položky na správnou SNÍŽILA skóre ('+prevPct+' % → '+pct+' %). Podpis chyby v součtu nebo mapování bodů.'); }
    prevPct=pct;
  }
  // poslední krok musí být 100 % (vše obrácené na správné), pokud nejsou gaps mimo slots
  return {label:label,wantPct:null,gotPct:Math.round(maxPct),earned:steps+' kroků',total:'0–100 %',grade:'rozsah '+Math.round(minPct)+'–'+Math.round(maxPct)+' %',issues:issues,kind:'mono'};
}

// Verdikt nad polem details ({ex,q,type,pts,total[,skip]}); gapSet = "ex_q" vyloučené z verdiktu.
function stVerdict(label,details,wantPct,gotPct,earned,total,grade,gapSet){
  const issues=[];
  let hasExcluded=false;
  (details||[]).forEach(d=>{
    if(d.skip){hasExcluded=true;return;}
    const id=d.ex+'_'+d.q; if(gapSet&&gapSet.has(id)){hasExcluded=true;return;}
    if(wantPct===100 && !(d.pts>=d.total-ST_EPS)) issues.push('Cv. '+d.ex+' / pol. '+d.q+' ('+d.type+'): správná odpověď → '+d.pts+'/'+d.total+' b');
    if(wantPct===0   && !(Math.abs(d.pts)<=ST_EPS)) issues.push('Cv. '+d.ex+' / pol. '+d.q+' ('+d.type+'): špatná odpověď → '+d.pts+'/'+d.total+' b');
  });
  // Agregátní kontrola: když ve variantě NEjsou vyloučené položky (mezery/degenerované
  // pairing), musí reálný součet trefit 100/0 %. Když body sedí po položkách, ale agregát
  // ne, je chyba v součtu/zaokrouhlení/mapování — což by per-item kontrola sama přehlédla.
  if(!hasExcluded && gotPct!=null && Math.round(gotPct)!==wantPct){
    issues.push('Agregát: '+earned+'/'+total+' b = '+gotPct+' %, očekáváno '+wantPct+' % (chyba v součtu nebo zaokrouhlení, ne v jednotlivé položce).');
  }
  return {label,wantPct,gotPct,earned,total,grade,issues};
}

