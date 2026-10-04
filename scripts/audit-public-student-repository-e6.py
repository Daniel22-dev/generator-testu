"""Read-only public audit; raw historical/Pages bytes stay in a temporary directory."""
import argparse, concurrent.futures, datetime, hashlib, json, pathlib, subprocess, tempfile
import urllib.parse, urllib.request

p=argparse.ArgumentParser();p.add_argument('--mirror',required=True);p.add_argument('--output',required=True)
p.add_argument('--repository',default='Daniel22-dev/interaktivni-testy');args=p.parse_args()
repo=args.repository
if len(repo.split('/'))!=2 or any(not part.replace('-','').replace('_','').isalnum() for part in repo.split('/')):raise ValueError('Explicit GitHub owner/repository required')
api='https://api.github.com/repos/'+repo
def get_json(endpoint):
    with urllib.request.urlopen(urllib.request.Request(api+endpoint,headers={'User-Agent':'GIT-E6-readonly-audit','Accept':'application/vnd.github+json'}),timeout=20) as r:return json.load(r)
def git(*parts):return subprocess.check_output(['git','--git-dir='+args.mirror,*parts])
def scan_file(file):
    r=subprocess.run(['node','scripts/student-publication.mjs','file',str(file)],capture_output=True,text=True)
    if r.returncode not in [0,1] or not r.stdout:raise RuntimeError('Scanner did not return a complete JSON report')
    return json.loads(r.stdout)
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
started=stamp();refs=get_json('/git/refs');meta=get_json('')
local={r.split(' ',1)[0]:r.split(' ',1)[1] for r in git('for-each-ref','--format=%(refname) %(objectname)').decode().splitlines()}
remote={r['ref']:r['object']['sha'] for r in refs}
if local!=remote:raise RuntimeError('Mirror refs differ from fresh advertised public refs; refresh mirror before auditing')
subprocess.run(['git','--git-dir='+args.mirror,'fsck','--full'],check=True,capture_output=True)
commits=get_json('/commits?per_page=100');pulls=get_json('/pulls?state=all&per_page=100');releases=get_json('/releases?per_page=100')
actions=get_json('/actions/runs?per_page=100');artifacts=get_json('/actions/artifacts?per_page=100')
inventory={'schema':'git-redteam-e6-public-inventory-v1','repository':repo,'private':meta['private'],'defaultBranch':meta['default_branch'],'pushedAt':meta['pushed_at'],'hasPages':meta['has_pages'],'forksCount':meta['forks_count'],'refs':remote,'restCommitCount':len(commits),'localReachableCommitCount':int(git('rev-list','--count','--all')),'pullRequestCount':len(pulls),'releaseCount':len(releases),'workflowRunsTotal':actions['total_count'],'workflowRunsReturned':len(actions['workflow_runs']),'latestPagesRun':{k:actions['workflow_runs'][0][k] for k in ['id','name','head_sha','conclusion','updated_at']},'actionsArtifactCount':artifacts['total_count'],'actionsArtifactsReturned':len(artifacts['artifacts']),'startedAt':started,'githubWrites':False,'deploymentPerformed':False,'secretValuesOmitted':True}
if len(commits)>=100 or len(pulls)>=100 or len(releases)>=100 or actions['total_count']>len(actions['workflow_runs']) or artifacts['total_count']>len(artifacts['artifacts']):raise RuntimeError('Pagination required; incomplete collections cannot be certified')
r=subprocess.run(['node','scripts/student-publication.mjs','history',args.mirror],capture_output=True,text=True)
if r.returncode not in [0,1] or not r.stdout:raise RuntimeError('Incomplete history scan')
history=json.loads(r.stdout);history.update({'repository':repo,'observedAt':stamp(),'freshRefsMatchImmutableMirror':True})
(out/'public-history-scan.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
head=remote['refs/heads/'+meta['default_branch']]
rows=git('ls-tree','-rz',head).decode().split('\0');htmls=[]
for row in rows:
    if not row:continue
    info,name=row.split('\t',1);mode,kind,sha=info.split(' ')
    if kind=='blob' and name.lower().endswith('.html'):htmls.append((name,sha))
with tempfile.TemporaryDirectory(prefix='git-e6-public-') as scratch:
    def audit(item):
        name,blob=item;tracked=git('cat-file','blob',blob)
        url='https://'+repo.split('/')[0].lower()+'.github.io/'+repo.split('/')[1]+'/'+urllib.parse.quote(name)
        # Bytes are untrusted. Static scanner never executes them or fetches dependencies.
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'GIT-E6-readonly-audit','Cache-Control':'no-cache'}),timeout=20) as response:
            body=response.read(4*1024*1024+1);status=response.status
        if len(body)>4*1024*1024:raise RuntimeError('Pages artifact exceeds audit size bound')
        file=pathlib.Path(scratch)/blob;file.write_bytes(body);scan=scan_file(file)
        # Only presence flags, never credential values or student identities.
        import re
        text=body.decode('utf-8')
        indicators={'teacherCredentialHash':bool(re.search(r'["\']ucitelPinHash["\']\s*:\s*["\'][^"\']+',text)),'studentCodeHashes':bool(re.search(r'["\'](?:identityCodeHashes|studentHashes)["\']\s*:\s*\[[^\]]*["\'][^"\']+',text)),'privateRsaDetected':'private-jwk' in scan['findings'] or 'private-key-pem' in scan['findings'],'knownAnswerDerivedDetected':bool(set(scan['findings'])&{'answer-derived-data','hidden-answer-property','answer-or-private-variant-property'})}
        return {'path':name,'url':url,'httpStatus':status,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'headBlob':blob,'matchesHeadBlob':body==tracked,'observedAt':stamp(),'scan':scan,'indicators':indicators}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:pages=list(pool.map(audit,htmls))
finalRefs={r['ref']:r['object']['sha'] for r in get_json('/git/refs')}
if finalRefs!=remote:raise RuntimeError('Public refs changed during audit; rerun')
inventory.update({'finishedAt':stamp(),'refsStableAcrossAudit':True,'currentHtmlFiles':len(pages),'liveTeacherHashFiles':sum(x['indicators']['teacherCredentialHash'] for x in pages),'liveStudentHashFiles':sum(x['indicators']['studentCodeHashes'] for x in pages),'headMatchesCount':sum(x['matchesHeadBlob'] for x in pages),'allLiveFilesFetched':True,'readiness':'NOT READY – BLOCKING ISSUE','limitations':['No deletion/unadvertised refs, orphan objects, caches or historical detached artifacts are certified absent.','Zero listed forks/artifacts is current repository metadata, not proof against external copies.','A static format rejection of unrelated legacy educational HTML is not by itself a confirmed credential leak.','Questions remain plaintext until F7. No public repository write, secret rotation or history purge was performed.']})
(out/'public-pages-scan.json').write_text(json.dumps({'schema':'git-redteam-e6-live-pages-v1','repository':repo,'head':head,'status':'FAIL','pages':pages,'secretValuesOmitted':True},ensure_ascii=False,indent=2)+'\n')
(out/'public-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'AUDIT COMPLETE / PUBLICATION BLOCKED','reachableCommits':history['reachableCommits'],'reachableBlobs':history['reachableBlobs'],'pages':len(pages),'matchesHead':inventory['headMatchesCount'],'teacherHashFiles':inventory['liveTeacherHashFiles'],'studentHashFiles':inventory['liveStudentHashFiles']}))
