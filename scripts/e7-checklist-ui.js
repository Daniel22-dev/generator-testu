/* Offline owner-side recorder, not a mobile runtime test. No persistence/network. */
const matrix = JSON.parse(document.getElementById('matrix').textContent);
const records = new Map();
const metadata = new Map();
const profileSelect = document.getElementById('profile');
const fields = ['device', 'os', 'browser', 'locale', 'origin', 'artifactSha256', 'runId', 'aiFeatures'];
const resultStatuses = matrix.resultStatuses;
for (const profile of matrix.profiles) {
  const option = document.createElement('option');
  option.value = profile.id; option.textContent = profile.label; profileSelect.append(option);
}
function el(tag, value) { const node = document.createElement(tag); if (value) node.textContent = value; return node; }
function recordFor(profile, id) {
  const key = profile + '/' + id;
  if (!records.has(key)) records.set(key, {status:'NOT RUN',negativeStatus:'NOT RUN',evidenceId:'',notes:''});
  return records.get(key);
}
function stashMetadata() {
  if (!profileSelect.dataset.previous) return;
  metadata.set(profileSelect.dataset.previous, Object.fromEntries(fields.map(f => [f,document.getElementById(f).value.trim()])));
}
function render() {
  stashMetadata(); const profile = profileSelect.value; profileSelect.dataset.previous = profile;
  const meta = metadata.get(profile) || {};
  for (const f of fields) document.getElementById(f).value = meta[f] || '';
  document.getElementById('profile-help').textContent = matrix.profiles.find(p => p.id===profile).requiredEvidence;
  const list = document.getElementById('cases'); list.replaceChildren();
  for (const item of matrix.cases.filter(c => c.profiles.includes(profile))) {
    const rec = recordFor(profile,item.id), card = el('article'); card.dataset.caseId = item.id;
    card.append(el('h2', item.id+' · '+item.title),el('p', item.categories.join(' / ')));
    const steps = el('ol'); for (const step of item.steps) steps.append(el('li',step)); card.append(steps);
    for (const [label,value] of [['Očekávání',item.expected],['Hranice',item.limits],['Negativní kontrola',item.negativeControl]]) {
      const p=el('p'); p.append(el('strong',label+': '),document.createTextNode(value)); card.append(p);
    }
    for (const [key,label] of [['status','Výsledek'],['negativeStatus','Negativní kontrola']]) {
      const wrapper=el('label',label+' '),select=el('select'); select.dataset.field=key; select.setAttribute('aria-label',item.id+' '+label);
      for (const status of resultStatuses) { const option=el('option',status); option.value=status; select.append(option); }
      select.value=rec[key];select.addEventListener('change',()=>{rec[key]=select.value;});wrapper.append(select);card.append(wrapper);
    }
    for (const [key,label] of [['evidenceId','ID sanitizovaného důkazu'],['notes','Pozorování a důvod případného N/A/BLOCKED']]) {
      const wrapper=el('label',label),input=el(key==='notes'?'textarea':'input');input.dataset.field=key;input.value=rec[key];input.maxLength=key==='notes'?2000:200;
      input.setAttribute('aria-label',item.id+' '+label);input.addEventListener('input',()=>{rec[key]=input.value.trim();});wrapper.append(input);card.append(wrapper);
    }
    list.append(card);
  }
  document.getElementById('message').textContent='Zobrazeno '+list.children.length+' případů. E7 zůstává ANALYZED / NOT TESTED.';
}
function createReport() {
  stashMetadata(); const profiles=[];
  for (const profile of matrix.profiles) {
    const observations = matrix.cases.filter(c=>c.profiles.includes(profile.id)).map(c=>({caseId:c.id,...recordFor(profile.id,c.id)}));
    const touched = observations.some(o=>o.status!=='NOT RUN'||o.negativeStatus!=='NOT RUN'||o.notes||o.evidenceId);
    const meta=metadata.get(profile.id)||{};
    if (touched) {
      for (const key of ['device','os','browser','locale','origin','artifactSha256','runId']) if (!meta[key]) throw new Error(profile.label+': chybí '+key);
      if (!/^[a-f0-9]{64}$/i.test(meta.artifactSha256)) throw new Error(profile.label+': SHA-256 musí mít 64 hex znaků.');
      const origin=new URL(meta.origin);
      if (origin.protocol!=='https:'||origin.search||origin.hash||origin.username||origin.password||origin.pathname!=='/') throw new Error('Zapiš pouze HTTPS origin bez cesty/query/credentialů.');
      for (const o of observations) {
        if (!resultStatuses.includes(o.status)||!resultStatuses.includes(o.negativeStatus)) throw new Error(o.caseId+': neznámý status.');
        if (o.status==='PASS'&&(o.negativeStatus!=='PASS'||!o.notes||!o.evidenceId)) throw new Error(o.caseId+': PASS potřebuje důkaz, poznámku a PASS negativní kontroly.');
        if (o.status==='FAIL'&&(!o.notes||!o.evidenceId)) throw new Error(o.caseId+': FAIL potřebuje důkaz a poznámku.');
        if (['BLOCKED','NOT APPLICABLE'].includes(o.status)&&!o.notes) throw new Error(o.caseId+': uveď důvod.');
        if (o.negativeStatus!=='NOT RUN'&&!o.notes) throw new Error(o.caseId+': uveď pozorování negativní kontroly.');
      }
    }
    profiles.push({profileId:profile.id,metadata:meta,observations});
  }
  return {schema:'git-redteam-e7-manual-observations-v1',version:matrix.version,stage:'E7',stageStatus:'ANALYZED / NOT TESTED',readiness:'NOT READY – BLOCKING ISSUE',physicalDevicesTested:false,scope:'MANUALLY REPORTED / NOT VERIFIED',recordedAt:new Date().toISOString(),profiles};
}
window.mobileChecklistReport=createReport;
profileSelect.addEventListener('change',render);
document.getElementById('export').addEventListener('click',()=>{
  try {
    const report=createReport(),blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=el('a');
    link.href=url;link.download='GIT-E7-7.1.83-pozorovani.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    document.getElementById('message').textContent='Export vytvořen. Ruční záznamy nejsou ověřený mobile PASS. Ulož JSON před zavřením.';
  } catch (error) { document.getElementById('message').textContent='Export odmítnut: '+error.message; }
});
render();
