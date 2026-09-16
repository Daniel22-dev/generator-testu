#!/usr/bin/env node
// GARP 2.5.1 GHRAB - selftest
// Rozsiruje selftest 2.5 o negativni kontroly, ktere v nem chybely: determinismus
// artifactDigest, vazba keyId na trust root, revokovany klic, anti-rollback,
// neznamy release, prisna provenance, .env rodina, secret ve velkem souboru,
// vendorovany drift, zmrazeni brany v SW a fail-closed chovani release gate.
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const errors = [];
const passed = [];
const run = (s, a, env={}) => spawnSync(process.execPath, [path.join(here, s), ...a], { encoding: 'utf8', env:{...process.env,...env} });
const expect = (name, cond) => { if (cond) passed.push(name); else errors.push(name); };

const t = await mkdtemp(path.join(tmpdir(), 'garp251-'));
try {
  // --- fixture: deployment, ktery drive rozbijel poradi (adresar 'a' vedle souboru 'a.js')
  const deploy = path.join(t, 'dist');
  await mkdir(path.join(deploy, 'a'), { recursive: true });
  await writeFile(path.join(deploy, 'index.html'), '<h1>synthetic</h1>\n');
  await writeFile(path.join(deploy, 'a.js'), 'console.log("a")\n');
  await writeFile(path.join(deploy, 'a', 'z.js'), 'console.log("z")\n');
  await writeFile(path.join(deploy, 'ch.js'), 'console.log("ch")\n');
  await writeFile(path.join(deploy, 'h.js'), 'console.log("h")\n');

  let r = run('create-release-integrity.mjs', [deploy, 'synthetic-app', '1.2.0', 'ghrab-key-2026-A', path.join(t, 'ri.json')]);
  expect('create-ri', r.status === 0);
  const digest1 = JSON.parse(r.stdout || '{}').artifactDigest;

  // NC-1 determinismus: druhy beh musi dat stejny digest
  r = run('create-release-integrity.mjs', [deploy, 'synthetic-app', '1.2.0', 'ghrab-key-2026-A', path.join(t, 'ri2.json')]);
  expect('digest-deterministic', JSON.parse(r.stdout || '{}').artifactDigest === digest1);

  await copyFile(path.join(t, 'ri.json'), path.join(deploy, 'release-integrity.json'));
  r = run('verify-release-integrity.mjs', [deploy, path.join(deploy, 'release-integrity.json')]);
  expect('verify-ri-clean-with-dir-file-collision', r.status === 0);

  // NC-2 byte tamper
  await writeFile(path.join(deploy, 'a.js'), 'console.log("tampered")\n');
  r = run('verify-release-integrity.mjs', [deploy, path.join(deploy, 'release-integrity.json')]);
  expect('NC-ri-byte-tamper-fails', r.status !== 0);
  await writeFile(path.join(deploy, 'a.js'), 'console.log("a")\n');

  // NC-3 pridany soubor
  await writeFile(path.join(deploy, 'extra.js'), 'x\n');
  r = run('verify-release-integrity.mjs', [deploy, path.join(deploy, 'release-integrity.json')]);
  expect('NC-ri-extra-file-fails', r.status !== 0);
  await rm(path.join(deploy, 'extra.js'));

  // NC-4 legacy v1 manifest musi byt odmitnut
  const legacy = JSON.parse(await readFile(path.join(t, 'ri.json'), 'utf8'));
  legacy.schema = 'ghrab-release-integrity-v1';
  await writeFile(path.join(t, 'legacy.json'), JSON.stringify(legacy));
  r = run('verify-release-integrity.mjs', [deploy, path.join(t, 'legacy.json')]);
  expect('NC-legacy-v1-rejected', r.status !== 0);

  // --- podpis a trust root
  const A = generateKeyPairSync('ed25519'), B = generateKeyPairSync('ed25519');
  const pem = k => k.export({ type: 'spki', format: 'pem' });
  await writeFile(path.join(t, 'A.priv'), A.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  await writeFile(path.join(t, 'B.priv'), B.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const trust = {
    schema: 'ghrab-trust-root-v1',
    keys: [
      { keyId: 'ghrab-key-2026-A', algorithm: 'Ed25519', status: 'active', publicKeyPem: pem(A.publicKey) },
      { keyId: 'ghrab-key-2025-OLD', algorithm: 'Ed25519', status: 'revoked', publicKeyPem: pem(B.publicKey) }
    ]
  };
  await writeFile(path.join(t, 'trust-root.json'), JSON.stringify(trust, null, 2));

  r = run('sign-release-integrity.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'A.priv'), path.join(deploy, 'release-integrity.sig')]);
  expect('sign', r.status === 0);
  r = run('verify-release-signature.mjs', [path.join(deploy, 'release-integrity.json'), path.join(deploy, 'release-integrity.sig'), path.join(t, 'trust-root.json')]);
  expect('verify-signature-clean', r.status === 0);

  // NC-5 podpis cizim klicem pri deklarovanem keyId A
  r = run('sign-release-integrity.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'B.priv'), path.join(t, 'wrong.sig')]);
  r = run('verify-release-signature.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'wrong.sig'), path.join(t, 'trust-root.json')]);
  expect('NC-wrong-key-for-declared-keyId-denied', r.status !== 0);

  // NC-6 revokovany klic
  const revoked = JSON.parse(await readFile(path.join(t, 'ri.json'), 'utf8'));
  revoked.signature.keyId = 'ghrab-key-2025-OLD';
  await writeFile(path.join(t, 'revoked.json'), JSON.stringify(revoked, null, 2) + '\n');
  run('sign-release-integrity.mjs', [path.join(t, 'revoked.json'), path.join(t, 'B.priv'), path.join(t, 'revoked.sig')]);
  r = run('verify-release-signature.mjs', [path.join(t, 'revoked.json'), path.join(t, 'revoked.sig'), path.join(t, 'trust-root.json')]);
  expect('NC-revoked-key-denied', r.status !== 0);

  // NC-7 neznamy keyId
  const unknown = JSON.parse(await readFile(path.join(t, 'ri.json'), 'utf8'));
  unknown.signature.keyId = 'attacker-key';
  await writeFile(path.join(t, 'unknown.json'), JSON.stringify(unknown, null, 2) + '\n');
  run('sign-release-integrity.mjs', [path.join(t, 'unknown.json'), path.join(t, 'B.priv'), path.join(t, 'unknown.sig')]);
  r = run('verify-release-signature.mjs', [path.join(t, 'unknown.json'), path.join(t, 'unknown.sig'), path.join(t, 'trust-root.json')]);
  expect('NC-unknown-keyId-denied', r.status !== 0);

  // --- registry / anti-rollback
  const registry = {
    schema: 'ghrab-release-registry-v1', updatedAt: new Date().toISOString(),
    apps: [{ appId: 'synthetic-app', approvedVersion: '1.2.0', artifactDigest: digest1, keyId: 'ghrab-key-2026-A', approvedAt: new Date().toISOString(), status: 'approved', history: [{ version: '1.1.0' }] }]
  };
  await writeFile(path.join(t, 'registry.json'), JSON.stringify(registry, null, 2));
  r = run('verify-release-registry.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'registry.json')]);
  expect('registry-clean', r.status === 0);

  // NC-8 validne podepsany starsi release
  const old = { ...registry, apps: [{ ...registry.apps[0], approvedVersion: '1.3.0', history: [{ version: '1.2.0' }] }] };
  await writeFile(path.join(t, 'registry-newer.json'), JSON.stringify(old, null, 2));
  r = run('verify-release-registry.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'registry-newer.json')]);
  expect('NC-signed-rollback-denied', r.status !== 0);

  // NC-9 neznama aplikace
  const foreign = { ...registry, apps: [{ ...registry.apps[0], appId: 'jina-app' }] };
  await writeFile(path.join(t, 'registry-foreign.json'), JSON.stringify(foreign, null, 2));
  r = run('verify-release-registry.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'registry-foreign.json')]);
  expect('NC-unknown-release-denied', r.status !== 0);

  // --- provenance
  const artifact = path.join(t, 'build.zip');
  await writeFile(artifact, 'synthetic-artifact');
  run('create-build-provenance.mjs', [artifact, path.join(t, 'prov-local.json')]);
  r = run('verify-build-provenance.mjs', [artifact, path.join(t, 'prov-local.json')]);
  expect('NC-untrusted-local-builder-rejected', r.status !== 0);
  r = run('verify-build-provenance.mjs', [artifact, path.join(t, 'prov-local.json'), '--allow-local-builder']);
  expect('NC-local-builder-without-source-identity-still-rejected', r.status !== 0);

  const localWithSource = JSON.parse(await readFile(path.join(t, 'prov-local.json'), 'utf8'));
  localWithSource.source.revision = 'b'.repeat(40);
  await writeFile(path.join(t, 'prov-local2.json'), JSON.stringify(localWithSource, null, 2));
  r = run('verify-build-provenance.mjs', [artifact, path.join(t, 'prov-local2.json')]);
  expect('NC-school-profile-rejects-local-builder', r.status !== 0);
  r = run('verify-build-provenance.mjs', [artifact, path.join(t, 'prov-local2.json'), '--allow-local-builder']);
  expect('prep-allows-local-builder-explicitly', r.status === 0);

  const good = JSON.parse(await readFile(path.join(t, 'prov-local.json'), 'utf8'));
  good.source.revision = 'a'.repeat(40);
  good.builder.id = 'github-actions://Daniel22-dev/ai-studio-ghrab';
  await writeFile(path.join(t, 'prov.json'), JSON.stringify(good, null, 2));
  r = run('verify-build-provenance.mjs', [artifact, path.join(t, 'prov.json')]);
  expect('provenance-clean', r.status === 0);
  await writeFile(artifact, 'tampered-artifact');
  r = run('verify-build-provenance.mjs', [artifact, path.join(t, 'prov.json')]);
  expect('NC-provenance-artifact-tamper-fails', r.status !== 0);
  await writeFile(artifact, 'synthetic-artifact');

  // --- leak scanner
  const leak = path.join(t, 'leak'); await mkdir(leak);
  await writeFile(path.join(leak, 'index.html'), 'ok');
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('leak-clean', r.status === 0);
  await writeFile(path.join(leak, 'legit-token-label.js'), `function explain(tok){return 'token: '+tok+'; typ: synthetic';}
`);
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('N01-legitimate-token-label-does-not-false-positive', r.status === 0);
  await writeFile(path.join(leak, 'assigned-token.js'), `const token = 'SYNTHETIC_TOKEN_VALUE_123456789';
`);
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('N01-assigned-secret-literal-still-detected', r.status !== 0);
  await rm(path.join(leak, 'assigned-token.js'));
  await writeFile(path.join(leak, 'assigned-password-special.js'), `const password = 'Xk9!mQ#2vLp$aB';
`);
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('N2-01-special-character-password-still-detected', r.status !== 0);
  await rm(path.join(leak, 'assigned-password-special.js'));
  await writeFile(path.join(leak, 'assigned-secret-special.js'), `const secret = 'a%b!c#d$e^f&g*h(i)j';
`);
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('N2-01-special-character-secret-still-detected', r.status !== 0);
  await rm(path.join(leak, 'assigned-secret-special.js'));
  await rm(path.join(leak, 'legit-token-label.js'));
  await writeFile(path.join(leak, '.env.production'), 'SESSION_SECRET=7f3a9c1e5b2d8046af11c3e7b9d05a62\n');
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('NC-env-production-detected', r.status !== 0);
  await rm(path.join(leak, '.env.production'));
  await writeFile(path.join(leak, 'bundle.js'), '// b\n' + 'a'.repeat(2_100_000) + '\nconst K="AIzaSyFAKEFAKEFAKEFAKEFAKEFAKEFAKE00";\n');
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('NC-secret-in-large-bundle-detected', r.status !== 0);
  await rm(path.join(leak, 'bundle.js'));
  await writeFile(path.join(leak, 'app.js.map'), '{}');
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('NC-sourcemap-detected', r.status !== 0);
  await rm(path.join(leak, 'app.js.map'));
  await writeFile(path.join(leak, 'jwk-public.json'), JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'A'.repeat(43), y: 'B'.repeat(43) }));
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('N5-public-jwk-does-not-false-positive', r.status === 0);
  await rm(path.join(leak, 'jwk-public.json'));
  await writeFile(path.join(leak, 'jwk.json'), JSON.stringify({ kty: 'EC', crv: 'P-256', x: 'A'.repeat(43), y: 'B'.repeat(43), d: 'C'.repeat(43) }));
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('NC-jwk-private-key-detected', r.status !== 0);
  await rm(path.join(leak, 'jwk.json'));
  await writeFile(path.join(leak, 'encrypted.txt'), '-----BEGIN ' + 'ENCRYPTED PRIVATE KEY-----\n' + 'A'.repeat(64) + '\n-----END ' + 'ENCRYPTED PRIVATE KEY-----\n');
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('NC-encrypted-private-key-detected', r.status !== 0);
  await rm(path.join(leak, 'encrypted.txt'));
  await writeFile(path.join(leak, 'pgp.txt'), '-----BEGIN ' + 'PGP PRIVATE KEY ' + 'BLOCK' + '-----\n' + 'A'.repeat(64) + '\n-----END ' + 'PGP PRIVATE KEY ' + 'BLOCK' + '-----\n');
  r = run('scan-deployment-leaks.mjs', [leak]);
  expect('NC-pgp-private-key-detected', r.status !== 0);
  await rm(path.join(leak, 'pgp.txt'));

  // --- evidence
  const ev = path.join(t, 'evidence'); await mkdir(ev);
  await writeFile(path.join(ev, 'result.txt'), 'PASS synthetic\n');
  run('create-evidence-manifest.mjs', [ev, path.join(t, 'evidence.json')]);
  r = run('verify-evidence-manifest.mjs', [ev, path.join(t, 'evidence.json')]);
  expect('evidence-clean', r.status === 0);
  await writeFile(path.join(ev, 'result.txt'), 'TAMPER\n');
  r = run('verify-evidence-manifest.mjs', [ev, path.join(t, 'evidence.json')]);
  expect('NC-evidence-tamper-fails', r.status !== 0);
  await writeFile(path.join(ev, 'result.txt'), 'PASS synthetic\n');

  // --- vendorovana konzistence
  const eco = path.join(t, 'eco');
  await mkdir(path.join(eco, 'studio', 'src'), { recursive: true });
  await mkdir(path.join(eco, 'ks', 'src', 'vendor'), { recursive: true });
  await mkdir(path.join(eco, 'sortio', 'src', 'vendor'), { recursive: true });
  await writeFile(path.join(eco, 'studio', 'src', 'platform.js'), 'export const V="1.1.0"\n');
  await writeFile(path.join(eco, 'ks', 'src', 'vendor', 'platform.js'), 'export const V="1.1.0"\n');
  await writeFile(path.join(eco, 'sortio', 'src', 'vendor', 'platform.js'), 'export const V="1.0.9"\n');
  const cfg = {
    schema: 'ghrab-vendored-consistency-v1', canonicalRoot: 'studio',
    components: [{ id: 'platform', canonical: 'src/platform.js', severity: 'CRITICAL' }],
    consumers: [
      { appId: 'ks', root: 'ks', copies: { platform: ['src/vendor/platform.js'] } },
      { appId: 'sortio', root: 'sortio', copies: { platform: ['src/vendor/platform.js'] } }
    ]
  };
  await writeFile(path.join(eco, 'cfg.json'), JSON.stringify(cfg, null, 2));
  r = run('check-vendored-consistency.mjs', [path.join(eco, 'cfg.json')]);
  expect('NC-vendored-drift-detected', r.status !== 0 && r.stderr.includes('DRIFT'));
  await writeFile(path.join(eco, 'sortio', 'src', 'vendor', 'platform.js'), 'export const V="1.1.0"\n');
  r = run('check-vendored-consistency.mjs', [path.join(eco, 'cfg.json')]);
  expect('vendored-consistent-after-fix', r.status === 0);
  // Conditional profile copies must be declared without blocking a profile that was not built,
  // then become mandatory as soon as the profile root exists.
  cfg.consumers[0].copies.platform.push({ path: 'dist-school/platform.js', whenRootExists: 'dist-school' });
  await writeFile(path.join(eco, 'cfg.json'), JSON.stringify(cfg, null, 2));
  r = run('check-vendored-consistency.mjs', [path.join(eco, 'cfg.json')]);
  expect('N2-03-unbuilt-profile-copy-is-declared-not-blocking', r.status === 0 && r.stdout.includes('\"profileCopiesNotBuilt\": 1'));
  await mkdir(path.join(eco, 'ks', 'dist-school'), { recursive: true });
  await writeFile(path.join(eco, 'ks', 'dist-school', 'platform.js'), 'export const V="1.1.0"\n');
  r = run('check-vendored-consistency.mjs', [path.join(eco, 'cfg.json')]);
  expect('N2-03-built-profile-copy-is-verified', r.status === 0 && r.stdout.includes('\"profileCopiesNotBuilt\": 0'));

  const goodConditional = cfg.consumers[0].copies.platform[1];
  cfg.consumers[0].copies.platform[1] = { path: 'src/vendor/platform.js', whenRootExists: 'dist-school' };
  await writeFile(path.join(eco, 'cfg.json'), JSON.stringify(cfg, null, 2));
  r = run('check-vendored-consistency.mjs', [path.join(eco, 'cfg.json')]);
  expect('N3-03-conditional-copy-must-live-under-declared-root', r.status !== 0 && (r.stderr.includes('conditional-copy-root-mismatch') || r.stdout.includes('conditional-copy-root-mismatch')));
  cfg.consumers[0].copies.platform[1] = goodConditional;
  await writeFile(path.join(eco, 'cfg.json'), JSON.stringify(cfg, null, 2));


  // --- service worker freeze
  const swDir = path.join(t, 'swapp'); await mkdir(swDir, { recursive: true });
  await writeFile(path.join(swDir, 'app-guard.js'), '// guard\n');
  await writeFile(path.join(swDir, 'revoked-access.json'), '[]\n');
  await writeFile(path.join(swDir, 'index.html'), 'ok');
  const badSw = `const PRECACHE=['/index.html','/app-guard.js','/revoked-access.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.addAll(PRECACHE))));
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))});`;
  await writeFile(path.join(t, 'sw-bad.js'), badSw);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-bad.js'), swDir]);
  expect('NC-sw-freezes-guard-detected', r.status !== 0);

  // GH-02 hotfix regression: variable name must not hide an array-driven cache.add path.
  const blindSpotSw = `const RANDOM_CACHE_LIST=['/index.html','/app-guard.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>Promise.all(RANDOM_CACHE_LIST.map(asset=>cache.add(asset))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.includes('app-guard')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}e.respondWith(fetch(e.request));});`;
  await writeFile(path.join(t, 'sw-blindspot.js'), blindSpotSw);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-blindspot.js'), swDir]);
  expect('NC-sw-arbitrary-array-name-cannot-hide-critical-precache', r.status !== 0 && (r.stderr.includes('CRITICAL') || r.stdout.includes('CRITICAL')));
  const goodSw = `const PRECACHE=['/index.html'];
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
if(u.pathname.includes('app-guard')||u.pathname.includes('revoked-access.json')){
  e.respondWith(fetch(e.request,{cache:'no-store'}));return;}
e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))});`;
  await writeFile(path.join(t, 'sw-good.js'), goodSw);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-good.js'), swDir]);
  expect('sw-network-first-for-guard-passes', r.status === 0);

  // N3-01: explicit two-class SW policy. Support scripts must be install-cached + networkFirst,
  // while authorization/revocation assets remain networkOnly and absent from cache writes.
  await mkdir(path.join(swDir, 'access'), { recursive: true });
  await mkdir(path.join(swDir, 'ghrab'), { recursive: true });
  await writeFile(path.join(swDir, 'access', 'suite-session-cleanup.js'), '// cleanup\n');
  await writeFile(path.join(swDir, 'ghrab', 'ghrab-platform.js'), '// platform\n');
  const v2PolicyPath = path.join(t, 'critical-v2.json');
  await writeFile(v2PolicyPath, JSON.stringify({
    schema:'ghrab-sw-security-assets-v2',
    networkOnly:['app-guard.js','revoked-access.json'],
    networkFirstFallback:['access/suite-session-cleanup.js','ghrab/ghrab-platform.js']
  }, null, 2));
  const v2GoodSw = `const CORE=['/index.html','/access/suite-session-cleanup.js','/ghrab/ghrab-platform.js'];\nself.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.addAll(CORE))));\nasync function networkFirst(request){const cache=await caches.open('x');try{const r=await fetch(request,{cache:'no-store'});if(r.ok)await cache.put(request,r.clone());return r}catch(e){return cache.match(request)}}\nasync function cacheFirst(request){const cache=await caches.open('x');const c=await cache.match(request);if(c)return c;const r=await fetch(request);if(r.ok)await cache.put(request,r.clone());return r}\nasync function networkOnlyNoStore(request){return fetch(request,{cache:'no-store'})}\nfunction isSecurityCriticalRequest(url,scopePath){const relative=url.pathname.slice(scopePath.length);return relative.endsWith('/app-guard.js')||relative.endsWith('/revoked-access.json')}\nfunction isSecurityFreshnessFallbackRequest(url,scopePath){const relative=url.pathname.slice(scopePath.length);return relative==='access/suite-session-cleanup.js'||relative==='ghrab/ghrab-platform.js'}\nself.addEventListener('fetch',e=>{const u=new URL(e.request.url),scopePath='/';if(isSecurityCriticalRequest(u,scopePath)){e.respondWith(networkOnlyNoStore(e.request));return}if(isSecurityFreshnessFallbackRequest(u,scopePath)){e.respondWith(networkFirst(e.request));return}e.respondWith(cacheFirst(e.request))});`;
  await writeFile(path.join(t, 'sw-v2-good.js'), v2GoodSw);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-v2-good.js'), swDir, v2PolicyPath]);
  expect('N3-01-v2-policy-networkfirst-offline-failsafe-passes', r.status === 0 && r.stdout.includes('structuralNetworkFirstFallbackGuard'));
  const v2NoPrecache = v2GoodSw.replace("const CORE=['/index.html','/access/suite-session-cleanup.js','/ghrab/ghrab-platform.js']", "const CORE=['/index.html']");
  await writeFile(path.join(t, 'sw-v2-no-precache.js'), v2NoPrecache);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-v2-no-precache.js'), swDir, v2PolicyPath]);
  expect('N3-01-fallback-layer-missing-install-cache-fails', r.status !== 0 && (r.stderr.includes('offline fail-safe') || r.stdout.includes('offline fail-safe')));
  const v2NetworkOnlyFallback = v2GoodSw.replace("if(isSecurityFreshnessFallbackRequest(u,scopePath)){e.respondWith(networkFirst(e.request));return}", "if(isSecurityFreshnessFallbackRequest(u,scopePath)){e.respondWith(networkOnlyNoStore(e.request));return}");
  await writeFile(path.join(t, 'sw-v2-networkonly-fallback.js'), v2NetworkOnlyFallback);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-v2-networkonly-fallback.js'), swDir, v2PolicyPath]);
  expect('N3-01-support-layer-networkonly-regression-fails', r.status !== 0 && (r.stderr.includes('networkFirst') || r.stdout.includes('networkFirst')));


  // N7 hardening: alternate Cache API write paths must never be silent PASS.
  const criticalListPath = path.join(t, 'critical-list.json');
  await writeFile(criticalListPath, JSON.stringify(['app-guard.js'], null, 2));
  const swVariants = [
    ['property-array-addAll', `self.EXTRA_ASSETS=['/app-guard.js'];\nself.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.addAll(self.EXTRA_ASSETS))));`],
    ['cache-put-literal', `self.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.put('/app-guard.js',new Response('x')))));`],
    ['cache-add-new-request', `self.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.add(new Request('/app-guard.js')))));`],
    ['concat-addAll', `const BASE=['/index.html'];const X=BASE.concat(['/app-guard.js']);\nself.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.addAll(X))));`],
    ['split-addAll', `const X='/index.html,/app-guard.js'.split(',');\nself.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.addAll(X))));`],
    ['object-values-forof-add', `const MAP={a:'/index.html',b:'/app-guard.js'};\nself.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open('x');for(const asset of Object.values(MAP)){await cache.add(asset)}})()));`]
  ];
  for (const [id, code] of swVariants) {
    const f = path.join(t, `sw-${id}.js`); await writeFile(f, code);
    r = run('check-sw-security-freeze.mjs', [f, swDir, criticalListPath]);
    expect(`NC-sw-${id}-not-silent-pass`, r.status !== 0);
  }
  const unresolvedSw = `let dynamicPath;self.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.add(dynamicPath))));`;
  await writeFile(path.join(t, 'sw-unresolved.js'), unresolvedSw);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-unresolved.js'), swDir, criticalListPath]);
  expect('NC-sw-unresolved-cache-write-amber-or-fail', r.status !== 0 && (r.stderr.includes('AMBER') || r.stdout.includes('AMBER') || r.stderr.includes('FAIL') || r.stdout.includes('FAIL')));

  // N8 hardening: comments/text proximity cannot create a network-only exemption.
  await writeFile(path.join(swDir, 'data-manifest.json'), '{}\n');
  const dataCritical = path.join(t, 'critical-data.json');
  await writeFile(dataCritical, JSON.stringify(['data-manifest.json'], null, 2));
  const commentBypassSw = `const CORE=['/index.html'];\nself.addEventListener('install',e=>e.waitUntil(caches.open('x').then(cache=>cache.addAll(CORE))));\nasync function networkFirst(request){ // data-manifest.json network later\n const cache=await caches.open('x');try{return await fetch(request)}catch(e){return cache.match(request)}}\nasync function cacheFirst(request){const cache=await caches.open('x');const c=await cache.match(request);if(c)return c;const rr=await fetch(request);if(rr.ok)await cache.put(request,rr.clone());return rr}\nself.addEventListener('fetch',e=>e.respondWith(cacheFirst(e.request)));`;
  await writeFile(path.join(t, 'sw-comment-bypass.js'), commentBypassSw);
  r = run('check-sw-security-freeze.mjs', [path.join(t, 'sw-comment-bypass.js'), swDir, dataCritical]);
  expect('NC-sw-comment-cannot-create-exemption', r.status !== 0);

  // N6 hardening: release gate itself must enforce the authoritative list and propagate SW failure.
  r = run('release-gate.mjs', [
    '--profile', 'prep', '--deploy', deploy, '--manifest', path.join(deploy, 'release-integrity.json'),
    '--signature', path.join(deploy, 'release-integrity.sig'), '--trust-root', path.join(t, 'trust-root.json'),
    '--sw', path.join(t, 'sw-blindspot.js'), '--critical-list', criticalListPath
  ]);
  expect('NC-gate-propagates-sw-critical-failure', r.status !== 0 && (r.stderr.includes('sw-security-freeze') || r.stdout.includes('sw-security-freeze')));

  r = run('release-gate.mjs', [
    '--profile', 'prep', '--deploy', deploy, '--manifest', path.join(deploy, 'release-integrity.json'),
    '--signature', path.join(deploy, 'release-integrity.sig'), '--trust-root', path.join(t, 'trust-root.json'),
    '--sw', path.join(t, 'sw-good.js')
  ]);
  expect('NC-gate-missing-critical-list-fails-closed', r.status !== 0 && (r.stderr.includes('critical-asset-list-missing') || r.stdout.includes('critical-asset-list-missing')));

  // --- release gate fail-closed
  r = run('release-gate.mjs', ['--profile', 'school', '--deploy', deploy, '--manifest', path.join(deploy, 'release-integrity.json')]);
  expect('NC-gate-missing-inputs-fails-closed', r.status !== 0 && r.stderr.includes('required-input-missing'));

  const sbom = path.join(t, 'sbom.json');
  await writeFile(sbom, JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.7',components:[]})+'\n');
  const hex = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  const envLinks = {
    GHRAB_BUILD_PROVENANCE_SHA256: hex(path.join(t, 'prov.json')),
    GHRAB_SBOM_SHA256: hex(sbom),
    GHRAB_EVIDENCE_MANIFEST_SHA256: hex(path.join(t, 'evidence.json')),
    GHRAB_DEPLOYMENT_PACKAGE_SHA256: hex(artifact)
  };
  r = run('create-release-integrity.mjs', [deploy, 'synthetic-app', '1.2.0', 'ghrab-key-2026-A', path.join(t, 'ri-linked.json')], envLinks);
  expect('assurance-linked-ri-created', r.status === 0);
  await copyFile(path.join(t, 'ri-linked.json'), path.join(deploy, 'release-integrity.json'));
  run('sign-release-integrity.mjs', [path.join(deploy, 'release-integrity.json'), path.join(t, 'A.priv'), path.join(deploy, 'release-integrity.sig')]);
  r = run('release-gate.mjs', [
    '--profile', 'school', '--deploy', deploy, '--manifest', path.join(deploy, 'release-integrity.json'),
    '--signature', path.join(deploy, 'release-integrity.sig'), '--trust-root', path.join(t, 'trust-root.json'),
    '--registry', path.join(t, 'registry.json'), '--artifact', artifact, '--provenance', path.join(t, 'prov.json'),
    '--evidence-dir', ev, '--evidence-manifest', path.join(t, 'evidence.json'), '--sbom', sbom, '--deployment-package', artifact
  ]);
  expect('gate-full-chain-green', r.status === 0);
  await writeFile(sbom, '{"tampered":true}\n');
  r = run('verify-assurance-links.mjs', ['--profile','school','--manifest',path.join(deploy,'release-integrity.json'),'--provenance',path.join(t,'prov.json'),'--evidence-manifest',path.join(t,'evidence.json'),'--sbom',sbom,'--deployment-package',artifact]);
  expect('N05-assurance-link-tamper-fails', r.status !== 0);

} finally { await rm(t, { recursive: true, force: true }); }

const out = { status: errors.length ? 'FAIL' : 'PASS', checks: passed.length + errors.length, passed: passed.length, failed: errors };
console[errors.length ? 'error' : 'log'](JSON.stringify(out, null, 2));
process.exit(errors.length ? 1 : 0);
