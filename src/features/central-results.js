/* GIT Stage08B teacher-private history UI. Lazy, inert until teacher clicks.
   Never uploads CSV, student names, codes, results or identifiers anywhere. */
(function () {
  'use strict';
  let modulePromise=null, ledger=null, ledgerAdapter=null, mapping=null, dialog=null, csvPreview=null, generation=0;
  function checkAccess(){
    if(document.documentElement.dataset.ghrabAccess!=='granted'||
      globalThis.__GHRAB_STUDIO_ACCESS__?.appId!=='generator'||
      globalThis.__GHRAB_GENERATOR_SUITE_SESSION__?.isLocked?.())
      throw new Error('CENTRAL_ACCESS_DENIED');
  }
  function el(tag,text){const x=document.createElement(tag);if(text!=null)x.textContent=String(text);return x;}
  function node(id){return document.getElementById(id);}
  function msg(text){const target=node('centralResultsMessage');if(target)target.textContent=text;}
  function btn(label,fn){const b=el('button',label);b.type='button';b.className='btn-edit';b.addEventListener('click',()=>{void fn();});return b;}
  async function init(){
    checkAccess();
    if(!modulePromise)modulePromise=import('./group-result-ledger.js').catch(e=>{modulePromise=null;throw e;});
    const lib=await modulePromise;checkAccess();
    if(!ledger){ledgerAdapter=lib.createMemoryResultAdapter();ledger=lib.createResultLedger(ledgerAdapter);}
    return lib;
  }
  function status(text){const x=node('centralGroupsResultsStatus');if(x)x.textContent=text;msg(text);}
  function downloadPrivate(obj,name){
    checkAccess();
    if(typeof downloadBlobFile!=='function')throw new Error('DOWNLOAD_HELPER_MISSING');
    downloadBlobFile(JSON.stringify(obj,null,2),name,'application/json;charset=utf-8');
  }
  async function readFile(input,max){
    checkAccess();const f=input.files?.[0];
    if(!f||f.size>max)throw new Error('FILE_MISSING_OR_TOO_LARGE');
    const text=await f.text();checkAccess();
    if(text.length>max)return Promise.reject(new Error('FILE_TOO_LARGE'));
    return {name:String(f.name||''),text};
  }
  function ensureDialog(){
    if(dialog)return dialog;
    dialog=el('dialog');dialog.id='centralResultsDialog';dialog.setAttribute('aria-label','Soukromá evidence výsledků');
    dialog.style.cssText='width:min(94vw,44rem);max-width:44rem;max-height:90vh;overflow:auto;padding:1rem 1.25rem';
    dialog.append(el('h3','Moje skupiny · Soukromá evidence výsledků'));
    dialog.append(el('p','Tato evidence neověřuje výsledky ani nerozhoduje o známce. Importuj pouze CSV, které jsi již zkontroloval v příslušném soukromém učitelském verifieru. Data zůstávají v paměti této relace.'));
    const actions=el('div');actions.className='btn-row';
    actions.append(btn('Vytvořit a uložit soukromou mapu',createAndSaveMap),
      btn('Zavřít',async()=>dialog.close()));dialog.append(actions);
    dialog.append(el('p','Mapa propojuje jednorázový kód testu s neměnným ID studenta. Nepřenáší jména ani e-maily, ale samotné kódy jsou citlivé. Soubor uchovávej pouze v zabezpečeném učitelském úložišti.'));
    const label=el('label','Načíst dříve uloženou soukromou mapu (.json)');label.setAttribute('for','centralMapFile');
    const mapInput=el('input');mapInput.type='file';mapInput.accept='.json,application/json';mapInput.id='centralMapFile';
    label.append(mapInput);dialog.append(label);
    dialog.append(btn('Načíst mapu',importMap));
    const resultsLabel=el('label','CSV „results_TESTID.csv“ ze soukromého verifieru');resultsLabel.setAttribute('for','centralResultsFile');
    const resultsInput=el('input');resultsInput.type='file';resultsInput.accept='.csv,text/csv';resultsInput.id='centralResultsFile';
    resultsLabel.append(resultsInput);dialog.append(resultsLabel);
    dialog.append(btn('Zkontrolovat CSV bez uložení',previewCsv));
    const confirmLabel=el('label');confirmLabel.style.display='block';
    const confirm=el('input');confirm.type='checkbox';confirm.id='centralResultsConfirm';
    confirmLabel.append(confirm,document.createTextNode(' Potvrzuji, že výsledky pocházejí ze správného soukromého verifieru, byly učitelem zkontrolovány a patří k vybranému Test ID.'));
    dialog.append(confirmLabel);
    dialog.append(btn('Převzít výsledky do této relace',applyCsv));
    const archive=el('div');archive.className='btn-row';archive.append(btn('Stáhnout soukromou historii',exportArchive),btn('Zobrazit výsledky',showResults));dialog.append(archive);
    const archivedLabel=el('label','Obnovit soukromou historii (.json)');archivedLabel.setAttribute('for','centralHistoryFile');
    const archivedInput=el('input');archivedInput.type='file';archivedInput.accept='.json,application/json';archivedInput.id='centralHistoryFile';
    archivedLabel.append(archivedInput);dialog.append(archivedLabel);
    dialog.append(btn('Obnovit historii (neověřený archiv)',importArchive));
    const msgNode=el('p');msgNode.id='centralResultsMessage';msgNode.setAttribute('role','status');msgNode.className='small-muted';dialog.append(msgNode);
    const table=el('div');table.id='centralResultsTable';table.style.overflowX='auto';dialog.append(table);
    dialog.addEventListener('close',()=>{csvPreview=null;generation++;});
    document.body.append(dialog);
    return dialog;
  }
  async function open(){
    try{await init();const d=ensureDialog();if(!d.open)d.showModal();
      msg(mapping?'Mapa připravena: '+mapping.testId+' · revize '+mapping.revision:'Nejdříve vytvoř soukromou mapu nebo načti dříve uloženou mapu.');}
    catch(e){status('Evidence není dostupná: '+e.message);}
  }
  async function createAndSaveMap(){
    try{
      const lib=await init();
      const live=globalThis.GHRAB_GENERATOR_GROUPS?.getPrivateCodeBindings();
      const next=lib.createPrivateMapping(live);
      mapping=next;csvPreview=null;generation++;
      downloadPrivate(mapping,'SOUKROME_NEODESILAT_GIT_MAPA_'+mapping.testId+'.json');
      msg('Mapa testu '+mapping.testId+' obsahuje '+mapping.entries.length+' stabilních vazeb. Její soubor uchovávej mimo dosah studentů.');
    }catch(e){msg('Mapu nelze připravit: '+e.message+'. V GIT nejprve dokonči test a použij kódy celé propojené skupiny.');}
  }
  async function importMap(){
    const ticket=++generation;
    try{const lib=await init(),file=await readFile(node('centralMapFile'),100000);
      const next=lib.validatePrivateMapping(JSON.parse(file.text));
      if(ticket!==generation)return;
      mapping=next;csvPreview=null;node('centralResultsConfirm').checked=false;
      msg('Soukromá mapa načtena: Test ID '+mapping.testId+' · skupina '+mapping.groupId+' · členů '+mapping.entries.length+'.');
    }catch(e){msg('Mapu nelze načíst: '+e.message);}
  }
  async function previewCsv(){
    const ticket=++generation;csvPreview=null;
    try{
      const lib=await init();if(!mapping)throw new Error('Nejdříve načti mapu testu');
      const f=await readFile(node('centralResultsFile'),10_000_000);
      if(f.name!=='results_'+mapping.testId+'.csv')throw new Error('Soubor není pojmenovaný results_'+mapping.testId+'.csv; při nesouladu Test ID import zastav. Název však sám nedokazuje autenticitu.');
      const plan=lib.planResultsImport({mapping,csv:f.text});
      if(ticket!==generation)return;
      csvPreview={csv:f.text,mapFingerprint:JSON.stringify(mapping),fileName:f.name};
      msg('Náhled: '+plan.records.length+' pokusů pro '+mapping.testId+', nenahraných členů '+plan.missingCodes+'. Výsledky byly pouze syntakticky zkontrolovány; autenticitu CSV nelze v GIT potvrdit.');
    }catch(e){msg('CSV nelze načíst: '+e.message);}
  }
  async function applyCsv(){
    try{
      await init();if(!csvPreview||!mapping||csvPreview.mapFingerprint!==JSON.stringify(mapping))throw new Error('Náhled už není platný');
      if(!node('centralResultsConfirm').checked)throw new Error('Vyžaduji potvrzení učitele');
      const result=await ledger.importResults({mapping,csv:csvPreview.csv,teacherAcknowledged:true});
      csvPreview=null;node('centralResultsConfirm').checked=false;
      msg('Dočasná evidence: nově '+result.inserted+' pokusů, beze změny '+result.unchanged+'. Pro zachování po zavření stáhni soukromou historii.');
      await showResults();
    }catch(e){msg('Import zastaven: '+e.message);}
  }
  async function showResults(){
    try{
      await init();if(!mapping)throw new Error('Nejdříve vyber mapu');
      const rows=await ledger.listGroupResults(mapping.groupId);const host=node('centralResultsTable');host.replaceChildren();
      const table=el('table');table.style.width='100%';
      const header=el('tr');for(const h of ['Student','Test','Pokus','Body','Známka (návrh)','Přezkum'])header.append(el('th',h));table.append(header);
      for(const r of rows.slice(0,500)){
        const tr=el('tr');const label=globalThis.GHRAB_GENERATOR_GROUPS?.displayMemberName?.(r.memberId);
        for(const v of [label?label+' · '+r.memberId:r.memberId,r.testId,r.attemptId,`${r.points}/${r.total}`,r.grade,r.classificationStatus])tr.append(el('td',v));table.append(tr);
      }
      host.append(table);msg('Zobrazeno '+Math.min(rows.length,500)+' / '+rows.length+' soukromých záznamů. Importovaná CSV nejsou samostatným důkazem původu ani správnosti známky.');
    }catch(e){msg('Výsledky nelze zobrazit: '+e.message);}
  }
  async function exportArchive(){
    try{await init();if(!mapping)throw new Error('Vyber mapu testu');
      const data=await ledger.exportPrivateArchive(mapping.groupId);
      downloadPrivate(data,'SOUKROME_NEODESILAT_GIT_HISTORIE_'+mapping.groupId+'.json');
      msg('Soukromá historie uložena do staženého souboru. Zkontroluj její bezpečné umístění.');
    }catch(e){msg('Historii nelze stáhnout: '+e.message);}
  }
  async function importArchive(){
    const ticket=++generation;
    try{
      await init();
      if(!node('centralResultsConfirm').checked)throw new Error('Před obnovením potvrď kontrolu učitelem');
      const f=await readFile(node('centralHistoryFile'),10_000_000);
      const archive=JSON.parse(f.text);
      if(!mapping)throw new Error('Před obnovou historie nejprve načti soukromou mapu skupiny');
      if(!Array.isArray(archive.records)||archive.records.some(r=>r.groupId!==mapping.groupId))
        throw new Error('Archiv obsahuje jinou skupinu, než vybraná mapa');
      if(ticket!==generation)return;
      const result=await ledger.importPrivateArchive(archive,true);node('centralResultsConfirm').checked=false;
      msg('Obnoveno '+result.inserted+' záznamů, existujících '+result.unchanged+'. Nejde o nové ověření zdroje archivních známek.');
    }catch(e){msg('Historii nelze obnovit: '+e.message);}
  }
  function clear(){
    generation++;mapping=null;csvPreview=null;modulePromise=null;
    try{void ledgerAdapter?.clear?.();}catch(_){}
    ledgerAdapter=null;
    ledger=null;
    try{if(dialog?.open)dialog.close();dialog?.remove();}catch(_){}
    dialog=null;
  }
  globalThis.GHRABGeneratorFeatures=globalThis.GHRABGeneratorFeatures||{};
  globalThis.GHRABGeneratorFeatures.centralResults=Object.freeze({open,clear});
})();
