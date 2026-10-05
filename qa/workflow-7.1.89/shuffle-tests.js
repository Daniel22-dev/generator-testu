function runShuffleRegression(){
  const results=[],must=(ok,m)=>{if(!ok)throw new Error(m);};
  const functions=raw=>acorn.parse(raw,{ecmaVersion:'latest'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>raw.slice(n.start,n.end)).join('\n');
  const sec=functions(secureStudentScript()),inst=functions(getTestScript());
  const types=['multiple choice','true/false','fill-in-the-blank','open answer','short answer','word order','word formation','error correction','reading comprehension','listening comprehension','dialogue completion','cloze text','multi-select','ordering','highlight-evidence','table-completion','transformation-chain','error-tagging','categorisation-board','matching'];
  for(const mode of ['secureOffline','instant'])for(const type of types){
    try{
      const items=Array.from({length:6},(_,i)=>({question:'CONTENT '+i,prompt:'CONTENT '+i,statement:'CONTENT '+i,sentence:'CONTENT '+i+' ___',text:'CONTENT '+i+' ___',left:'CONTENT '+i,right:'RIGHT '+i,base_sentence:'CONTENT '+i,words:['CONTENT',String(i)],options:['alpha','beta','gamma'],correct:0,answer:'x',passage:'SHARED SOURCE',dialogue:'DIALOGUE',items:['one','two'],sentences:['First','Second'],columns:['Column'],rows:[[{answer:'x'}]],transformations:[{instruction:'Rewrite',answer:'x'}],tokens:['wrong','word'],error_type_options:['Grammar','Spelling'],categories:['A','B'],entries:[{text:'entry',category:'A'}]}));
      const ex={type,items,points_each:2,item_points:[1,2,3,4,5,6],points_total:21,match_options:items.map(i=>i.right)};
      const cfg={randomizace:true,testId:'SYNTHETIC-TEST',studentName:'Student A',activeGroupKey:'__default',layout:'tabs',labels:{question:'Question',points:'points',choose:'Choose',exercise:'Exercise'},secureLabels:{},testMode:'strict'};
      const doc=new DOMParser().parseFromString('<input id="studentName" value="Student A"><div id="exerciseArea"></div>','text/html');
      let api;
      if(mode==='secureOffline'){
        api=new Function('document','CFG','EXS',"const $=id=>document.getElementById(id);const SL=CFG.secureLabels,GL=CFG.labels;let ACTIVE_KEY='__default',STARTED_AT='2026-10-04T08:00:00Z';\n"+sec+'\nreturn {render:renderTest,shuffle:applyRuntimeRandomization};')(doc,cfg,[ex]);api.render();
      }else{
        doc.getElementById('exerciseArea').innerHTML=buildExerciseHtml(ex,0,cfg,1);
        api=new Function('document','CFG',"let attemptId='SYNTHETIC-ATTEMPT';\n"+inst+'\nreturn {shuffle:applyRuntimeRandomization};')(doc,cfg);
      }
      const selector=type==='matching'?(mode==='secureOffline'?'.q':'.match-row'):(mode==='secureOffline'?'.q':'.question');
      const number=node=>node.querySelector(type==='matching'&&mode==='instant'?'.match-num':mode==='secureOffline'?'.qhead > b':'.q-num');
      const nodes=()=>Array.from(doc.querySelectorAll(selector));
      const content=node=>Number(node.textContent.match(/CONTENT[\s/]+(\d+)/)?.[1]);
      const identity=node=>JSON.stringify({id:node.id,qids:Array.from(node.querySelectorAll('[data-qid],[data-li]')).map(e=>[e.tagName,e.dataset.qid||e.dataset.li,e.dataset.val||'',e.getAttribute('onchange')||'',e.getAttribute('oninput')||'']).sort(),points:node.querySelector('.q-pts,.qhead > span')?.textContent||'',options:Array.from(node.querySelectorAll('option')).map(e=>[e.value,e.textContent]).sort()});
      must(nodes().length===6,'Six real rendered items expected');
      const original=new Map(nodes().map(n=>[content(n),identity(n)]));
      api.shuffle();const orderA=nodes().map(content);
      nodes().forEach((n,i)=>{must(Number(number(n)?.textContent.match(/\d+/)?.[0])===i+1,'Sequential numbering after shuffle');must(identity(n)===original.get(content(n)),'Canonical identity/points/option values changed');});
      must(orderA.join()!=='0,1,2,3,4,5','Content did not move for fixture');
      api.shuffle();must(nodes().map(content).join()===orderA.join(),'Repeated shuffle changed attempt order');
      cfg.studentName='Student B';doc.getElementById('studentName').value='Student B';api.shuffle();const orderB=nodes().map(content);
      must(orderA.join()!==orderB.join(),'Chosen synthetic students should have different order');
      nodes().forEach((n,i)=>{must(Number(number(n)?.textContent.match(/\d+/)?.[0])===i+1,'Student B numbering');must(identity(n)===original.get(content(n)),'Student B identity changed');});
      if(mode==='secureOffline')must(doc.querySelector('.card').lastElementChild.classList.contains('navrow'),'Navigation must remain after questions');
      results.push({mode,type,status:'PASS',orderA,orderB});
    }catch(e){results.push({mode,type,status:'FAIL',error:e.message,stack:e.stack});}
  }
  return {scope:'Real source rendering and shuffle functions in Chromium DOM; synthetic fixture data. No full encrypted export or end-to-end grading claim.',total:results.length,passed:results.filter(r=>r.status==='PASS').length,results};
}
