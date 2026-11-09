/* Stage09 preproduction: visible, voluntary teacher material export.
 * Protected generator UI only, never inserted into student_test.html.
 * No student identity, secure runtime or answer keys leave the builder.
 */
(function () {
  'use strict';
  const BUTTON_ID='stage09SaveMaterial';
  const q=id=>document.getElementById(id);
  const h=(tag,txt='',cls='')=>{
    const n=document.createElement(tag);if(txt)n.textContent=txt;if(cls)n.className=cls;return n;
  };
  function allowed(){
    const a=globalThis.__GHRAB_STUDIO_ACCESS__;
    // A permit verified earlier can expire while this long-lived builder remains open.
    // The Studio access guard verifies the signature; this additional local expiry
    // check rejects stale grants before review AND after every asynchronous import.
    const expiresAt=a?.permit?.exp;
    return document.documentElement.dataset.ghrabAccess==='granted'&&
      a?.appId==='generator'&&typeof a.permit?.sub==='string'&&!!a.permit.sub.trim()&&
      Number.isFinite(expiresAt)&&expiresAt>Math.floor(Date.now()/1000)&&
      globalThis.__GHRAB_GENERATOR_SUITE_SESSION__?.isLocked?.()!==true&&
      (typeof generatorPersistenceAllowed==='function' && generatorPersistenceAllowed());
  }
  function source(){
    if(!allowed())throw new Error('STAGE09_ACCESS_DENIED');
    if(typeof outputMutationBusy!=='undefined'&&outputMutationBusy)throw new Error('STAGE09_OUTPUT_CHANGING');
    if(typeof lastAssembled==='undefined'||!lastAssembled?.variants?.__default?.length)
      throw new Error('STAGE09_GENERATE_TEST_FIRST');
    return lastAssembled;
  }
  let dialog=null,dialogToken=0;
  function prepareDialog(){
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='stage09Dialog';
    dialog.style.cssText='max-width:min(92vw,660px);width:100%;max-height:90vh;overflow:auto;padding:22px;border-radius:14px;';
    dialog.append(h('h2','Pedagogick\u00fd obsah do AI Studia'));
    dialog.append(h('p','P\u0159en\u00e1\u0161ej\u00ed se jen podporovan\u00e9 v\u00fdukov\u00e9 ot\u00e1zky. Odpov\u011bdn\u00ed kl\u00ed\u010d, vysv\u011btlen\u00ed, k\u00f3dy, jm\u00e9na student\u016f, v\u00fdsledky ani zabezpe\u010den\u00ed testu se nikdy nep\u0159en\u00e1\u0161ej\u00ed. Nepodporovan\u00e9 typy cvi\u010den\u00ed se vynechaj\u00ed. P\u016fvodn\u00ed test z\u016fstane nezm\u011bn\u011bn.'));
    const fields=[
      ['title','N\u00e1zev materi\u00e1lu',240],
      ['subject','P\u0159edm\u011bt',160],
      ['yearGroup','C\u00edlov\u00e1 t\u0159\u00edda / ro\u010dn\u00edk (bez jmen)',120],
      ['level','CEFR (A1\u2013C2, nepovinn\u00e9)',2],
      ['objective','V\u00fdukov\u00fd c\u00edl (nepovinn\u00e9)',800]
    ];
    for(const [key,label,max] of fields){
      const box=h('label');box.style.cssText='display:block;margin:10px 0;';
      box.append(h('span',label));
      const input=document.createElement('input');input.id='stage09_'+key;input.type='text';
      input.maxLength=max;input.autocomplete='off';input.style.cssText='display:block;width:100%;box-sizing:border-box;';
      box.append(input);dialog.append(box);
    }
    const consent=h('label');consent.style.cssText='display:flex;gap:8px;align-items:start;margin:12px 0;';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='stage09Consent';
    consent.append(checkbox,h('span','Potvrzuji, \u017ee p\u0159en\u00e1\u0161en\u00e9 ot\u00e1zky neobsahuj\u00ed osobn\u00ed \u00fadaje ani nepovolen\u00e1 m\u00e9dia a souhlas\u00edm s vynech\u00e1n\u00edm kl\u00ed\u010de odpov\u011bd\u00ed.'));
    dialog.append(consent);
    const review=document.createElement('details');review.id='stage09ContentPreview';
    review.append(h('summary','Úplný obsah, který bude předán do AI Studia'));
    const reviewText=h('pre');reviewText.id='stage09ContentText';
    reviewText.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:40vh;overflow:auto;padding:12px;border:1px solid currentColor;border-radius:8px;';
    review.append(reviewText);dialog.append(review);
    const report=h('div');report.id='stage09Report';report.setAttribute('role','status');
    report.style.cssText='white-space:pre-line;padding:10px 0;';dialog.append(report);
    const actions=h('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px;';
    const preview=h('button','Zkontrolovat p\u0159enos','btn-dl-secondary');preview.type='button';preview.id='stage09Preview';
    const send=h('button','P\u0159ipravit p\u0159ed\u00e1n\u00ed','btn-dl-secondary');send.type='button';send.id='stage09Submit';send.disabled=true;
    const cancel=h('button','Zav\u0159\u00edt','btn-dl-secondary');cancel.type='button';cancel.onclick=()=>dialog.close();
    const open=h('a','Otev\u0159\u00edt Moje materi\u00e1ly','btn-dl-secondary');open.id='stage09Open';
    open.hidden=true;open.rel='noopener noreferrer';open.target='_blank';
    actions.append(preview,send,cancel,open);dialog.append(actions);document.body.append(dialog);
    dialog.addEventListener('close',()=>{dialogToken++;checkbox.checked=false;send.disabled=true;review.open=false;reviewText.textContent='';});
    // Changing actual material metadata invalidates the review; ticking consent does not.
    dialog.addEventListener('input',event=>{
      if(event.target?.tagName==='INPUT' && event.target.type!=='checkbox')invalidPreview();
    });
    return dialog;
  }
  let inspected=null,reviewedKey=null,inspectedAccess=null;
  function assembledLanguage(){
    // Use the generated test's captured language, never the mutable live form.
    return String(inspected?.sourceState?.jazyk||inspected?.cfg?.jazyk||'');
  }
  function fields(){
    return {title:q('stage09_title').value,subject:q('stage09_subject').value,
      yearGroup:q('stage09_yearGroup').value,level:q('stage09_level').value.trim().toUpperCase(),
      objective:q('stage09_objective').value};
  }
  function key(){
    // A permit/principal switch invalidates even a byte-identical material preview.
    if(!inspected||source()!==inspected||inspectedAccess!==globalThis.__GHRAB_STUDIO_ACCESS__)return null;
    return JSON.stringify({variant:inspected.variants.__default,language:assembledLanguage(),fields:fields()});
  }
  function invalidPreview(){reviewedKey=null;q('stage09Submit').disabled=true;q('stage09Open').hidden=true;q('stage09ContentPreview').open=false;q('stage09ContentText').textContent='';q('stage09Report').textContent='Po zm\u011bn\u011b zad\u00e1n\u00ed spus\u0165te novou kontrolu p\u0159enosu.';}
  async function show(){
    const output=source();const d=prepareDialog();
    dialogToken++;
    inspected=output;inspectedAccess=globalThis.__GHRAB_STUDIO_ACCESS__;reviewedKey=null;
    const cfg=output.cfg||{};
    q('stage09_title').value=String(cfg.nazev||'V\u00fdukov\u00fd obsah z GIT').slice(0,240);
    q('stage09_subject').value=String(typeof state==='object'?state.jazyk||'':'').slice(0,160);
    q('stage09_yearGroup').value=String(cfg.proKoho||'').slice(0,120);
    q('stage09_level').value=/^(A1|A2|B1|B2|C1|C2)$/.test(String(cfg.cefr||''))?cfg.cefr:'';
    q('stage09_objective').value='';q('stage09Consent').checked=false;
    q('stage09Open').hidden=true;q('stage09Open').removeAttribute('href');
    q('stage09ContentPreview').open=false;q('stage09ContentText').textContent='';
    q('stage09Submit').disabled=true;q('stage09Report').textContent='Nejprve zkontrolujte p\u0159enos. Ulo\u017een\u00ed do AI Studia bude jednor\u00e1zov\u00e9.';

    const preview=q('stage09Preview'),send=q('stage09Submit');
    preview.onclick=async()=>{
      const attemptedToken=dialogToken;
      try{
        if(source()!==inspected)throw Error('STAGE09_CONTENT_CHANGED');
        const mod=await import('../features/stage09-material.js');
        if(attemptedToken!==dialogToken||!dialog.open)return;
        if(source()!==inspected)throw Error('STAGE09_CONTENT_CHANGED');
        const currentKey=key();if(!currentKey)throw Error('STAGE09_CONTENT_CHANGED');
        const data=mod.mapGeneratedTestToMaterial({assembled:inspected,language:assembledLanguage(),...fields(),
          id:'git-00000000-0000-4000-8000-000000000000',
          now:new Date().toISOString(),appVersion:RELEASE.version,privacyConfirmed:true});
        q('stage09ContentText').textContent=mod.describeMaterialForReview(data.material);
        q('stage09ContentPreview').open=true;
        reviewedKey=currentKey;
        q('stage09Report').textContent=`P\u0159enositeln\u00e9 ot\u00e1zky: ${data.exportedItems}; vynechan\u00e9: ${data.excludedItems}.\nOdpov\u011bdn\u00ed kl\u00ed\u010d se nep\u0159en\u00e1\u0161\u00ed.\nTechnick\u00e1 upozorn\u011bn\u00ed: ${data.warnings.join(', ')}`;
        send.disabled=false;
      }catch(e){if(attemptedToken!==dialogToken||!dialog.open)return;reviewedKey=null;send.disabled=true;q('stage09ContentPreview').open=false;q('stage09ContentText').textContent='';q('stage09Report').textContent='P\u0159enos nelze p\u0159ipravit: '+(e.code||e.message);}
    };
    send.onclick=async()=>{
      const attemptedToken=dialogToken;
      send.disabled=true;
      try{
        if(!q('stage09Consent').checked)throw Error('STAGE09_CONSENT_REQUIRED');
        const snapshot=globalThis.__GHRAB_STUDIO_ACCESS__;
        if(!reviewedKey||key()!==reviewedKey)throw Error('STAGE09_PREVIEW_STALE');
        if(!globalThis.crypto?.randomUUID)throw Error('STAGE09_CRYPTO_UNAVAILABLE');
        const m=await import('../features/stage09-material.js');
        if(attemptedToken!==dialogToken||!dialog.open)throw Error('STAGE09_DIALOG_CANCELLED');
        if(!q('stage09Consent').checked||!allowed()||snapshot!==globalThis.__GHRAB_STUDIO_ACCESS__||key()!==reviewedKey)
          throw Error('STAGE09_ACCESS_OR_CONTENT_CHANGED');
        const material=m.mapGeneratedTestToMaterial({assembled:inspected,language:assembledLanguage(),...fields(),
          id:'git-'+globalThis.crypto.randomUUID(),now:new Date().toISOString(),
          appVersion:RELEASE.version,privacyConfirmed:true}).material;
        const root=m.trustedStudioRoot(globalThis.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl,globalThis.location.href);
        // This audited helper owns Bridge v2 and the target/expiry contract.
        // Only exact known Studio paths are importable: no arbitrary URLs.
        let helper;
        try {
          // Online: the canonical shared helper is served by AI Studio.
          helper=root.endsWith('/AI-Studio-GHRAB/')
            ? await import('/AI-Studio-GHRAB/integration/save-to-studio.js')
            : await import('/ai-studio/integration/save-to-studio.js');
        } catch {
          // Offline fallback: exact source-pinned copy of the SAME Studio helper.
          // This is static code only; Bridge handoff still follows Platform 2.0.
          helper=await import('../features/stage09-save-to-studio-local.js');
        }
        if(attemptedToken!==dialogToken||!dialog.open)throw Error('STAGE09_DIALOG_CANCELLED');
        if(!q('stage09Consent').checked||!allowed()||snapshot!==globalThis.__GHRAB_STUDIO_ACCESS__||key()!==reviewedKey)
          throw Error('STAGE09_ACCESS_OR_CONTENT_CHANGED');
        const result=helper.saveMaterialToStudio({material,studioUrl:root,
          sourceAppId:'generator',sourceAppVersion:RELEASE.version,navigate:false});
        if(!result?.ok||!result.targetUrl)throw Error(result?.reason||'STAGE09_HANDOFF_FAILED');
        q('stage09Report').textContent='Materi\u00e1l byl p\u0159ipraven. Otev\u0159ete Moje materi\u00e1ly a dokon\u010dete p\u0159evzet\u00ed.';
        q('stage09Open').href=result.targetUrl;q('stage09Open').hidden=false;
      }catch(e){if(attemptedToken!==dialogToken||!dialog.open)return;q('stage09Report').textContent='P\u0159ed\u00e1n\u00ed selhalo: '+(e.code||e.message);send.disabled=false;}
    };
    if(typeof d.showModal==='function')d.showModal();else d.open=true;
  }
  document.addEventListener('ghrab:access-changed',()=>{
    if(dialog?.open){invalidPreview();dialog.close();}
  });
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#'+BUTTON_ID);
    if(!target)return;
    event.preventDefault();
    void show().catch(e=>{if(typeof uiToast==='function')uiToast(e.message||'Pedagogick\u00fd export nen\u00ed dostupn\u00fd.','err',6000);});
  });
})();