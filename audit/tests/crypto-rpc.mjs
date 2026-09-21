import { webcrypto } from 'node:crypto';
import readline from 'node:readline';
const keys=new Map(); let sequence=0;
function decode(x){if(!x||typeof x!=='object')return x;if(x.$key)return keys.get(x.$key);if(x.$bytes)return new Uint8Array(x.$bytes);if(Array.isArray(x))return x.map(decode);return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,decode(v)]));}
function encode(x){if(x instanceof globalThis.CryptoKey){const id=String(++sequence);keys.set(id,x);return {$key:id,type:x.type,extractable:x.extractable,usages:x.usages,algorithm:x.algorithm};}if(x instanceof ArrayBuffer||ArrayBuffer.isView(x))return {$bytes:Array.from(new Uint8Array(x.buffer||x,x.byteOffset||0,x.byteLength))};if(Array.isArray(x))return x.map(encode);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,encode(v)]));return x;}
for await(const line of readline.createInterface({input:process.stdin})){try{const r=JSON.parse(line);const v=await webcrypto.subtle[r.method](...decode(r.args));console.log(JSON.stringify({ok:true,value:encode(v)}));}catch(e){console.log(JSON.stringify({ok:false,error:String(e.stack||e)}));}}
