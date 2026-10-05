/**
 * GIT 7.1.89 - separate distribution from test/code generation.
 * Bound Google Apps Script. No scheduled mail; only an explicit menu action sends.
 * Do not combine this menu's checkboxes with a legacy bulk-mail button.
 * If this project already defines onOpen, add gitCodesMenu() there instead of
 * keeping a second onOpen function. No student data are sent to AI.
 */
function onOpen(){gitCodesMenu();}
function gitCodesMenu(){
  SpreadsheetApp.getUi().createMenu('GIT \u2014 k\u00f3dy')
    .addItem('1. Nastavit tento list / test','gitCodesSetup')
    .addItem('2. N\u00e1hled a odeslat ZA\u0160KRTNUT\u00ddM','gitCodesSendSelected')
    .addSeparator()
    .addItem('Ozna\u010dit v\u0161echny dosud neodeslan\u00e9','gitCodesSelectUnsent')
    .addItem('Zru\u0161it v\u00fdb\u011br v\u0161ech','gitCodesClearSelection')
    .addItem('Zobrazit nastaven\u00ed testu','gitCodesShowConfig')
    .addSeparator()
    .addItem('Ru\u010dn\u011b povolit opakov\u00e1n\u00ed pro jeden e-mail','gitCodesAllowRetry')
    .addToUi();
}
function gitCodesProps(){return PropertiesService.getDocumentProperties();}
function gitCodesHash(value){
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8)
    .map(function(n){return ('0'+((n+256)%256).toString(16)).slice(-2);}).join('');
}
function gitCodesLogKey(testId,email){return 'GIT_MAIL_'+gitCodesHash(testId+'\n'+email.toLowerCase());}
function gitCodesConfig(sheet){
  var value=gitCodesProps().getProperty('GIT_CONFIG_'+sheet.getSheetId());
  if(!value)throw new Error('Tento list nen\u00ed nastaven. Pou\u017eij krok 1 v menu GIT.');
  return JSON.parse(value);
}
function gitCodesEmail(value){
  var email=String(value||'').trim().toLowerCase();
  if(email.length>254||!(/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i).test(email)||/[\s,;\r\n]/.test(email))throw new Error('Neplatn\u00fd jednotliv\u00fd e-mail: '+email);
  return email;
}
function gitCodesTestId(value){
  var id=String(value||'').trim();
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,127}$/.test(id))throw new Error('Vlo\u017e skute\u010dn\u00e9 Test ID z hotov\u00e9ho testu / verifieru (3\u2013128 znak\u016f).');
  return id;
}
function gitCodesHttps(value){
  var url=String(value||'').trim();
  if(!/^https:\/\/[a-z0-9.-]+(?::443)?(?:[/?#][^\s]*)?$/i.test(url)||/DO_NOT_SEND|TEACHER_VERIFIER|PRIVATE_KEY|[\r\n<>]/i.test(url))throw new Error('Vlo\u017e HTTPS odkaz na STUDENTSK\u00dd test, nikdy na soukrom\u00fd verifier.');
  return url;
}
function gitCodesRead(sheet,needsExtras){
  var range=sheet.getDataRange(),values=range.getValues(),formulas=range.getFormulas();
  if(values.length<2)throw new Error('List mus\u00ed obsahovat z\u00e1hlav\u00ed CSV a alespo\u0148 jednoho studenta.');
  var headers=values[0].map(function(x){return String(x).replace(/^\uFEFF/,'').trim().toLowerCase();});
  var ix={};headers.forEach(function(h,i){if(h){if(Object.prototype.hasOwnProperty.call(ix,h))throw new Error('Duplicitn\u00ed sloupec: '+h);ix[h]=i;}});
  ['email','code'].concat(needsExtras?['odeslat','odeslano','stav']:[]).forEach(function(h){if(ix[h]===undefined)throw new Error('Chyb\u00ed sloupec '+h+'. Importuj CSV z GIT / spus\u0165 nastaven\u00ed.');});
  var rows=[],emails={},codes={};
  for(var i=1;i<values.length;i++){
    var v=values[i];if(v.every(function(x){return x===''||x===false;}))continue;
    ['email','code','test_id','odeslat','odeslano','stav'].forEach(function(h){if(ix[h]!==undefined&&formulas[i]&&formulas[i][ix[h]])throw new Error('Vzorec nen\u00ed povolen ve sloupci '+h+', \u0159\u00e1dek '+(i+1)+'.');});
    var email=gitCodesEmail(v[ix.email]),code=String(v[ix.code]||'').trim().toUpperCase();
    if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('Neplatn\u00fd k\u00f3d na \u0159\u00e1dku '+(i+1)+'. Pou\u017eij p\u016fvodn\u00ed CSV, k\u00f3dy neupravuj.');
    if(emails[email]||codes[code])throw new Error('Duplicitn\u00ed e-mail nebo k\u00f3d na \u0159\u00e1dku '+(i+1)+'. Nic nebylo odesl\u00e1no.');
    emails[email]=true;codes[code]=true;
    var chosen=ix.odeslat!==undefined&&(v[ix.odeslat]===true||String(v[ix.odeslat]).toUpperCase()==='TRUE');
    rows.push({row:i+1,email:email,code:code,testId:ix.test_id!==undefined?String(v[ix.test_id]||'').trim():'',selected:chosen,
      sent:ix.odeslano!==undefined?String(v[ix.odeslano]||''):'',status:ix.stav!==undefined?String(v[ix.stav]||''):''});
  }
  return {headers:headers,ix:ix,rows:rows};
}
function gitCodesPrompt(title,message,initial){
  var ui=SpreadsheetApp.getUi(),res=ui.prompt(title,message+(initial?'\nDosavadn\u00ed hodnota: '+initial:''),ui.ButtonSet.OK_CANCEL);
  if(res.getSelectedButton()!==ui.Button.OK)return null;
  var text=res.getResponseText().trim();return text||initial||'';
}
function gitCodesSetup(){
  var ui=SpreadsheetApp.getUi();
  try{
    var sheet=SpreadsheetApp.getActiveSheet(),data=gitCodesRead(sheet,false),old=null;
    try{old=gitCodesConfig(sheet);}catch(ignore){}
    var ids=Array.from(new Set(data.rows.map(function(r){return r.testId;}).filter(Boolean)));
    if(ids.length>1)throw new Error('List obsahuje v\u00edce Test ID. Jeden list mus\u00ed pat\u0159it jedin\u00e9mu nov\u00e9mu testu.');
    var id=gitCodesPrompt('Test ID','Ov\u011b\u0159 Test ID podle hotov\u00e9ho testu / verifieru.',ids[0]||(old&&old.testId)||'');if(id===null)return;id=gitCodesTestId(id);
    if(ids.length&&ids[0]!==id)throw new Error('Zadan\u00e9 Test ID neodpov\u00edd\u00e1 CSV.');
    if(old&&old.testId!==id)throw new Error('Pro nov\u00fd test zalo\u017e NOV\u00dd list a importuj nov\u00e9 CSV. Nep\u0159episuj list p\u0159edchoz\u00edho testu.');
    var url=gitCodesPrompt('Odkaz pro studenty','Vlo\u017e HTTPS odkaz na STUDENTSK\u00dd soubor (ne verifier).',old&&old.url);if(url===null)return;url=gitCodesHttps(url);
    var subject=gitCodesPrompt('N\u00e1zev testu / p\u0159edm\u011bt zpr\u00e1vy','Nap\u0159\u00edklad: Angli\u010dtina \u2014 opravn\u00fd test',old&&old.subject);if(subject===null)return;
    if(!subject||subject.length>160||/[\r\n]/.test(subject))throw new Error('N\u00e1zev mus\u00ed b\u00fdt jeden \u0159\u00e1dek, 1\u2013160 znak\u016f.');
    var linkKey='GIT_TEST_URL_'+gitCodesHash(id),known=gitCodesProps().getProperty(linkKey);
    if(known&&known!==url)throw new Error('Toto Test ID u\u017e pou\u017e\u00edv\u00e1 jin\u00fd odkaz. Zkontroluj, \u017ee nesm\u00edch\u00e1v\u00e1\u0161 dv\u011b verze testu.');
    // Re-read after prompts; no mail, and never replace existing codes.
    data=gitCodesRead(sheet,false);
    data.rows.forEach(function(r){if(r.testId&&r.testId!==id)throw new Error('CSV se b\u011bhem nastaven\u00ed zm\u011bnilo.');});
    ['test_id','odeslat','odeslano','stav'].forEach(function(h){
      if(data.ix[h]===undefined){var col=data.headers.length+1;sheet.getRange(1,col).setValue(h);data.ix[h]=col-1;data.headers.push(h);}
    });
    data.rows.forEach(function(r){
      sheet.getRange(r.row,data.ix.test_id+1).setNumberFormat('@').setValue(id);
      var checkbox=sheet.getRange(r.row,data.ix.odeslat+1);checkbox.insertCheckboxes();checkbox.setValue(r.selected);
    });
    sheet.setFrozenRows(1);
    gitCodesProps().setProperty('GIT_CONFIG_'+sheet.getSheetId(),JSON.stringify({testId:id,url:url,subject:subject}));
    gitCodesProps().setProperty(linkKey,url);
    ui.alert('P\u0159ipraveno. Ve sloupci odeslat za\u0161krtni jen p\u0159\u00edtomn\u00e9. Pak pou\u017eij GIT \u2014 k\u00f3dy \u2192 N\u00e1hled a odeslat ZA\u0160KRTNUT\u00ddM. Star\u00e9 rozes\u00edlac\u00ed tla\u010d\u00edtko nepou\u017e\u00edvej.');
  }catch(error){ui.alert('Nic se neodeslalo: '+error.message);}
}
function gitCodesSnapshot(sheet){
  var config=gitCodesConfig(sheet),data=gitCodesRead(sheet,true),props=gitCodesProps();
  data.rows.forEach(function(r){if(r.testId!==config.testId)throw new Error('Test ID se neshoduje na \u0159\u00e1dku '+r.row+'.');});
  var selected=data.rows.filter(function(r){return r.selected;});
  selected.forEach(function(r){
    if(r.sent||r.status||props.getProperty(gitCodesLogKey(config.testId,r.email)))throw new Error(r.email+': ji\u017e odesl\u00e1no nebo nejist\u00fd v\u00fdsledek p\u0159edchoz\u00edho odesl\u00e1n\u00ed. Od\u0161krtni tento \u0159\u00e1dek. Opakov\u00e1n\u00ed vy\u017eaduje samostatn\u00e9 potvrzen\u00ed.');
  });
  return {config:config,data:data,selected:selected,fingerprint:gitCodesHash(JSON.stringify({config:config,rows:data.rows}))};
}
function gitCodesSendSelected(){
  var ui=SpreadsheetApp.getUi(),sheet=SpreadsheetApp.getActiveSheet(),lock=null,sent=0,summary='';
  try{
    var first=gitCodesSnapshot(sheet);
    if(!first.selected.length){ui.alert('Nikdo nen\u00ed za\u0161krtnut. Nic se neodeslalo.');return;}
    var preview='Test: '+first.config.subject+'\nTest ID: '+first.config.testId+'\nOdkaz: '+first.config.url+'\n\nP\u0159\u00edjemci ('+first.selected.length+'):\n'+first.selected.map(function(r){return r.email;}).join('\n')+'\n\nOstatn\u00ed nic neobdr\u017e\u00ed. Odeslat?';
    if(ui.alert('Potvrdit rozes\u00edlku',preview,ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
    // UI alerts suspend execution: acquire the lock AFTER confirmation.
    lock=LockService.getDocumentLock();if(!lock.tryLock(10000))throw new Error('Jin\u00e1 rozes\u00edlka pr\u00e1v\u011b b\u011b\u017e\u00ed. Zkus to po jej\u00edm dokon\u010den\u00ed.');
    var current=gitCodesSnapshot(sheet);
    if(current.fingerprint!==first.fingerprint)throw new Error('List nebo nastaven\u00ed se od n\u00e1hledu zm\u011bnily. Zkontroluj nov\u00fd n\u00e1hled; nic se neodeslalo.');
    if(MailApp.getRemainingDailyQuota()<current.selected.length)throw new Error('Nedostate\u010dn\u00e1 denn\u00ed kv\u00f3ta e-mail\u016f; nic se neodeslalo.');
    var props=gitCodesProps(),ix=current.data.ix,conf=current.config;
    for(var i=0;i<current.selected.length;i++){
      var r=current.selected[i];
      // Re-read checkboxes/addresses immediately before EACH message. Manual edits
      // do not honor DocumentLock; abort the remainder rather than use stale input.
      var now=gitCodesRead(sheet,true),fresh=now.rows.find(function(x){return x.row===r.row;});
      if(JSON.stringify(now.headers)!==JSON.stringify(current.data.headers)||JSON.stringify(gitCodesConfig(sheet))!==JSON.stringify(conf))throw new Error('Sloupce nebo nastavení se změnily. Zbytek rozesílky zastaven.');
      if(!fresh||!fresh.selected||fresh.email!==r.email||fresh.code!==r.code||fresh.testId!==conf.testId||fresh.sent||fresh.status)throw new Error('V\u00fdb\u011br nebo k\u00f3d se b\u011bhem rozes\u00edl\u00e1n\u00ed zm\u011bnil. Zbytek nebyl odesl\u00e1n.');
      var key=gitCodesLogKey(conf.testId,r.email);
      if(props.getProperty(key))throw new Error('Existuje z\u00e1znam o odesl\u00e1n\u00ed pro '+r.email+'.');
      var time=new Date().toISOString();
      // Mail and Sheets are not an atomic transaction. Persist pending BEFORE send;
      // uncertain results are NEVER retried automatically.
      props.setProperty(key,JSON.stringify({status:'pending',at:time}));
      sheet.getRange(r.row,ix.stav+1).setValue('ODESILANI / NEJISTE');SpreadsheetApp.flush();
      MailApp.sendEmail({to:r.email,subject:conf.subject,body:'Dobr\u00fd den,\n\ntv\u016fj osobn\u00ed k\u00f3d pro tento test: '+r.code+'\n\nOdkaz na test: '+conf.url+'\nTest ID: '+conf.testId+'\n\nK\u00f3d je ur\u010den pouze tob\u011b. Test zahaj podle pokyn\u016f vyu\u010duj\u00edc\u00edho.\n'});
      sent++;
      props.setProperty(key,JSON.stringify({status:'sent',at:time}));
      sheet.getRange(r.row,ix.odeslano+1).setValue(time);sheet.getRange(r.row,ix.stav+1).setValue('ODESLANO');sheet.getRange(r.row,ix.odeslat+1).setValue(false);SpreadsheetApp.flush();
    }
    summary='Odesl\u00e1no '+sent+' zpr\u00e1v. Ostatn\u00ed studenti nic neobdr\u017eeli. Pozd\u011bji p\u0159\u00edchoz\u00edho pouze za\u0161krtni a spus\u0165 nov\u00fd n\u00e1hled.';
  }catch(error){summary='Potvrzen\u00e9 odesl\u00e1n\u00ed v tomto b\u011bhu: '+sent+'. '+error.message+'\nStav ODESILANI / NEJISTE ov\u011b\u0159 v odeslan\u00e9 po\u0161t\u011b. Neopakuj jej naslepo.';}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
  if(summary)ui.alert(summary);
}
function gitCodesClearSelection(){
  try{var s=SpreadsheetApp.getActiveSheet(),d=gitCodesRead(s,true);d.rows.forEach(function(r){s.getRange(r.row,d.ix.odeslat+1).setValue(false);});}
  catch(e){SpreadsheetApp.getUi().alert(e.message);}
}
function gitCodesSelectUnsent(){
  var ui=SpreadsheetApp.getUi();
  try{
    var s=SpreadsheetApp.getActiveSheet(),c=gitCodesConfig(s),d=gitCodesRead(s,true),p=gitCodesProps();
    if(ui.alert('Ozna\u010dit celou skupinu?','Za\u0161krtne v\u0161echny dosud neodeslan\u00e9. Nic zat\u00edm neode\u0161le. Pro opravn\u00fd test rad\u011bji za\u0161krtni jen p\u0159\u00edtomn\u00e9.',ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
    d.rows.forEach(function(r){s.getRange(r.row,d.ix.odeslat+1).setValue(!r.sent&&!r.status&&!p.getProperty(gitCodesLogKey(c.testId,r.email)));});
  }catch(e){ui.alert(e.message);}
}
function gitCodesShowConfig(){try{var c=gitCodesConfig(SpreadsheetApp.getActiveSheet());SpreadsheetApp.getUi().alert(c.subject+'\nTest ID: '+c.testId+'\n'+c.url);}catch(e){SpreadsheetApp.getUi().alert(e.message);}}
function gitCodesAllowRetry(){
  var ui=SpreadsheetApp.getUi(),lock=null;
  try{
    var s=SpreadsheetApp.getActiveSheet(),c=gitCodesConfig(s),email=gitCodesPrompt('Opakovan\u00e9 odesl\u00e1n\u00ed','Nejprve OV\u011a\u0158 odeslanou po\u0161tu. Vlo\u017e jedin\u00fd e-mail, kter\u00e9mu v\u011bdom\u011b dovol\u00ed\u0161 nov\u00e9 odesl\u00e1n\u00ed.','');
    if(email===null)return;email=gitCodesEmail(email);
    if(ui.alert('Riziko duplicitn\u00ed zpr\u00e1vy','Ov\u011b\u0159il(a) jsi odeslanou po\u0161tu? V\u011bdom\u011b povolit opakov\u00e1n\u00ed pro '+email+'? K\u00f3d se NEZM\u011aN\u00cd. Tato akce je\u0161t\u011b nic neode\u0161le.',ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
    lock=LockService.getDocumentLock();if(!lock.tryLock(10000))throw new Error('Rozes\u00edlka pr\u00e1v\u011b b\u011b\u017e\u00ed.');
    var d=gitCodesRead(s,true),r=d.rows.find(function(x){return x.email===email;});if(!r)throw new Error('E-mail nen\u00ed v tomto listu.');
    gitCodesProps().deleteProperty(gitCodesLogKey(c.testId,email));
    s.getRange(r.row,d.ix.odeslano+1).clearContent();s.getRange(r.row,d.ix.stav+1).clearContent();s.getRange(r.row,d.ix.odeslat+1).setValue(false);
  }catch(e){if(lock&&lock.hasLock())lock.releaseLock();lock=null;ui.alert(e.message);}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
