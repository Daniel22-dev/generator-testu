import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';

const exited=child=>!child||child.exitCode!==null||child.signalCode!==null;
async function waitForExit(child,timeoutMs){
  if(exited(child))return true;
  await Promise.race([new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve);}),sleep(timeoutMs)]);
  return exited(child);
}
export async function stopBrowserProcess(child){
  if(exited(child))return;
  if(process.platform==='win32'){
    // Chromium spawns a process tree whose utility children may retain the
    // user-data directory briefly after the browser parent exits. Terminate
    // the test-owned tree atomically before the parent PID disappears; never
    // target unrelated Chromium processes by name.
    const termination=spawnSync('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{encoding:'utf8',windowsHide:true});
    await waitForExit(child,5000);
    await sleep(750);
    if(termination.error)throw termination.error;
    if(!exited(child)){
      const diagnostic=[termination.stdout,termination.stderr].filter(Boolean).join(' ').trim();
      throw new Error(`Chromium process tree did not terminate (taskkill exit ${termination.status}): ${diagnostic}`);
    }
    return;
  }
  try{
    process.kill(-child.pid,'SIGTERM');
  }catch{}
  if(await waitForExit(child,1200))return;
  try{process.kill(-child.pid,'SIGKILL');}catch{}
  await waitForExit(child,3000);
  if(!exited(child))throw new Error('Chromium process tree did not terminate');
}
export async function closeHttpServer(server){
  if(!server||!server.listening)return;
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
export async function removeBrowserProfile(profile){
  let lastError;
  for(let attempt=0;attempt<8;attempt++){
    try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:80});return;}
    catch(error){lastError=error;await sleep(125*(attempt+1));}
  }
  throw lastError;
}
