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
  try{
    if(process.platform==='win32')spawnSync('taskkill.exe',['/pid',String(child.pid),'/t'],{stdio:'ignore',windowsHide:true});
    else process.kill(-child.pid,'SIGTERM');
  }catch{}
  if(await waitForExit(child,1200))return;
  if(process.platform==='win32')spawnSync('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore',windowsHide:true});
  else try{process.kill(-child.pid,'SIGKILL');}catch{}
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
