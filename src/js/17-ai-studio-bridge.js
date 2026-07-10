/* AI Studio GHRAB — přímé převzetí GHRAB Material v1 (v7.0.5, bridge 1.1) */
(function(){
  'use strict';
  const HANDOFF_KEY='ghrab.handoff.v1', EVENTS_KEY='ghrab.pilot.events.v2';
  const q=new URLSearchParams(location.search);
  function get(k){try{return localStorage.getItem(k)}catch(e){console.warn('AI Studio bridge: čtení úložiště selhalo',e);return null}}
  function parse(key,fallback){try{return JSON.parse(get(key)||JSON.stringify(fallback))}catch(_){return fallback}}
  function set(k,v){try{localStorage.setItem(k,v);return true}catch(e){console.warn('AI Studio bridge: zápis do úložiště selhal',e);return false}}
  function remove(k){try{localStorage.removeItem(k)}catch(e){console.warn('AI Studio bridge: odstranění z úložiště selhalo',e)}}
  function validMaterial(m){return !!(m&&m.schema==='ghrab-material-v1'&&m.id&&m.title&&m.subject&&m.content&&typeof m.content==='object')}
  function take(){
    const p=parse(HANDOFF_KEY,null);
    if(!p||p.schema!=='ghrab-handoff-v1'||p.target!=='generator'||!validMaterial(p.material))return null;
    if(Date.parse(p.expiresAt||'')<Date.now()){remove(HANDOFF_KEY);return null}
    remove(HANDOFF_KEY);return p;
  }
  function setValue(id,value){const el=document.getElementById(id);if(!el)return;el.value=value||'';el.dispatchEvent(new Event('input',{bubbles:true}))}
  function taskText(tasks){return (tasks||[]).map((t,i)=>`${i+1}. ${t.prompt||''}${Array.isArray(t.options)&&t.options.length?'\n   Možnosti: '+t.options.join(' | '):''}${t.answer!==undefined&&t.answer!==''?'\n   Klíč: '+(typeof t.answer==='number'?t.answer+1:t.answer):''}${t.explanation?'\n   Vysvětlení: '+t.explanation:''}`).join('\n\n')}
  function record(material){const list=parse(EVENTS_KEY,[]);list.push({at:new Date().toISOString(),type:'handoff-consumed',appId:'generator',materialId:material.id,estimatedMinutes:5});set(EVENTS_KEY,JSON.stringify(list.slice(-500)))}
  function studioUrl(payload){
    try{const u=new URL(payload&&payload.studioUrl||'',location.href);if(/^https?:$/.test(u.protocol))return u.href}catch(_){}
    return `${location.origin}/AI-Studio-GHRAB/`;
  }
  function banner(material,payload){
    const el=document.createElement('div');el.className='studio-import-banner';
    const text=document.createElement('span');
    const strong=document.createElement('b');strong.textContent='⇄ Materiál převzat z AI Studia';
    const small=document.createElement('small');small.textContent=material.title||'Bez názvu';
    text.append(strong,small);
    const link=document.createElement('a');link.href=studioUrl(payload);link.textContent='Zpět do Studia';
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Zavřít');close.onclick=()=>el.remove();
    el.append(text,link,close);(document.querySelector('.container')||document.body).prepend(el);
  }
  function importMaterial(material,payload){
    const langMap={cs:'čeština',en:'angličtina',es:'španělština',de:'němčina',fr:'francouzština',la:'latina'};
    try{if(typeof pickJazyk==='function')pickJazyk(langMap[material.language]||material.language||'angličtina')}catch(_){}
    setValue('nazev',material.title);
    setValue('proKoho',[material.yearGroup,material.level].filter(Boolean).join(' · '));
    setValue('latka',[material.subject,material.title,(material.objectives||[]).join('; ')].filter(Boolean).join(' — '));
    const source=[material.content&&material.content.sourceText,taskText(material.content&&material.content.tasks)].filter(Boolean).join('\n\nSTRUKTUROVANÉ ÚLOHY Z AI STUDIA:\n');
    setValue('zadaniText',source);
    const level=String(material.level||'').toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
    if(level&&typeof state==='object'){state.uroven=[level[1]]}
    try{if(typeof applyVisualState==='function')applyVisualState();if(typeof validate==='function')validate();if(typeof saveSnapshot==='function')saveSnapshot()}catch(_){}
    banner(material,payload);record(material);
    try{if(typeof uiToast==='function')uiToast('Materiál z AI Studia byl načten do základních údajů a zdrojového obsahu.','ok',5200)}catch(_){}
  }
  function boot(){if(q.get('studioHandoff')!=='1')return;const payload=take();if(payload)importMaterial(payload.material,payload)}
  window.addEventListener('load',()=>setTimeout(boot,350),{once:true});
})();
