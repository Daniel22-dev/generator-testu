// Regression: self-test RPC bridge must be inserted before the real closing body,
// not before a literal "</body>" embedded inside generated verifier JavaScript.
import fs from 'node:fs';
import vm from 'node:vm';

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const source = fs.readFileSync('src/js/08-manual-editor.js', 'utf8');
const start = source.indexOf('function stRpcBridgeHtml');
const end = source.indexOf('\nfunction stMakeHiddenFrame', start);
if (start < 0 || end < 0) fail('Nelze najít stRpcBridgeHtml() ve zdroji.');

const context = {};
vm.createContext(context);
vm.runInContext(source.slice(start, end) + '\nthis.__stRpcBridgeHtml = stRpcBridgeHtml;', context);
const inject = context.__stRpcBridgeHtml;
if (typeof inject !== 'function') fail('stRpcBridgeHtml() se nepodařilo načíst.');

const nonce = 'rpc-regression-nonce';
const sample = '<!doctype html><html><body>'
  + '<script>const nested = "</body></html>"; function scorePayload(){return 1;}<\/script>'
  + '<p id="rpc-sentinel">sentinel</p>'
  + '</body></html>';
const out = inject(sample, nonce);
const noncePos = out.indexOf(nonce);
const sentinelPos = out.indexOf('<p id="rpc-sentinel">');
const lastBodyPos = out.toLowerCase().lastIndexOf('</body>');

if (noncePos < 0) fail('RPC bridge v testovacím HTML chybí.');
if (noncePos <= sentinelPos) fail('RPC bridge byl vložen před sentinel — pravděpodobně do JS řetězce s vnořeným </body>.');
if (noncePos >= lastBodyPos) fail('RPC bridge není uvnitř body před jeho skutečným uzavřením.');

const withoutBody = '<!doctype html><html><head></head><div>fragment</div></html>';
const outWithoutBody = inject(withoutBody, nonce);
if (!outWithoutBody.includes(nonce) || !outWithoutBody.endsWith('<\/script>')) {
  fail('Fallback pro HTML bez </body> bridge nepřipojil na konec.');
}

console.log('✅ Self-test RPC bridge: poslední </body> + fallback bez body PASS.');
