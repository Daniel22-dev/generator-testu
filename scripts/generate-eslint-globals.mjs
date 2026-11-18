import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';

const dir = path.resolve('src/js');
const names = new Set();
const secureRuntimeNames = new Set();
const SECURE_STUDENT_RUNTIME_FILES = [
  '13de-secure-student-guard.js',
  '13df-secure-critical-history.js',
  '13dh-secure-student-submit.js',
  '13di-secure-strict-mode-runtime.js',
  '13e-secure-student-runtime.js',
];
const SECURE_PREVIEW_ADAPTER_GLOBALS = [
  'acquireAttemptTabLock', 'ANSWER_TXT', 'clearActiveAttemptSeal', 'copyAnswers',
  'copySubmissionPayload', 'downloadAnswers', 'envInfo', 'flushPendingAttemptWrites',
  'handleLeave', 'checkDevice', 'idbDelete', 'idbGet', 'idbPut', 'isBrokenEnv',
  'isTestActive', 'loadSignedRecord', 'openSubmissionForm', 'PERSIST_INTEGRITY_BLOCK',
  'PERSIST_KEY_PROMISE', 'persistActiveAttemptSeal', 'persistenceKey',
  'prepareSecureTimerDeadline', 'queuePersistActiveAttemptSeal', 'releaseAttemptTabLock',
  'requestSecureSubmit', 'saveSignedRecord', 'setSubmittedLocked', 'shareAnswers',
  'startSplitMonitor', 'startStrictFallback', 'startStrictFullscreen', 'startTest',
  'startTestAttempt', 'startTimer', 'stopSplitMonitor', 'storageGet', 'storageRemove',
  'storageSet', 'STRICT_FULLSCREEN_MODE', 'STRICT_PREFLIGHT', 'STRICT_PREFLIGHT_BUSY',
  'STRICT_START_BUSY', 'strictInvalidatePreflight', 'strictModeRuntime',
  'strictPreflightChecks', 'strictPreflightStillValid', 'strictReadyState',
  'strictRuntimeNotice', 'strictSetStartButtons', 'strictStartStatus', 'submitSecureTest',
  'SUBMITTED', 'submittedLocked', 't', 'TIMER_DEADLINE', 'TIMER_ID', 'updateEnvWarning',
  'verifyStrictTest',
];

function addPattern(node, target = names) {
  if (!node) return;
  if (node.type === 'Identifier') target.add(node.name);
  else if (node.type === 'ObjectPattern') node.properties.forEach(p => addPattern(p.value || p.argument, target));
  else if (node.type === 'ArrayPattern') node.elements.forEach(item => addPattern(item, target));
  else if (node.type === 'AssignmentPattern') addPattern(node.left, target);
  else if (node.type === 'RestElement') addPattern(node.argument, target);
}

function addProgramDeclarations(ast, target) {
  for (const node of ast.body) {
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) target.add(node.id.name);
    if (node.type === 'VariableDeclaration') node.declarations.forEach(d => addPattern(d.id, target));
  }
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function isStringRawTemplate(node) {
  return node.type === 'TaggedTemplateExpression'
    && node.tag?.type === 'MemberExpression'
    && !node.tag.computed
    && node.tag.object?.type === 'Identifier'
    && node.tag.object.name === 'String'
    && node.tag.property?.type === 'Identifier'
    && node.tag.property.name === 'raw';
}

for (const file of fs.readdirSync(dir).filter(x => x.endsWith('.js')).sort()) {
  const source = fs.readFileSync(path.join(dir, file), 'utf8');
  const ast = espree.parse(source, {ecmaVersion:2022, sourceType:'script'});
  addProgramDeclarations(ast, names);
  walk(ast, node => {
    if (node.type === 'AssignmentExpression'
      && node.left?.type === 'MemberExpression'
      && !node.left.computed
      && node.left.object?.type === 'Identifier'
      && (node.left.object.name === 'globalThis' || node.left.object.name === 'window')
      && node.left.property?.type === 'Identifier') {
      names.add(node.left.property.name);
    }
    if (!SECURE_STUDENT_RUNTIME_FILES.includes(file) || !isStringRawTemplate(node)) return;
    for (const quasi of node.quasi.quasis) {
      const runtimeAst = espree.parse(quasi.value.raw, {ecmaVersion:2022, sourceType:'script'});
      addProgramDeclarations(runtimeAst, secureRuntimeNames);
    }
  });
}

function renderGlobals(target) {
  return [...target].sort().map(name => `  ${JSON.stringify(name)}: 'writable',`).join('\n');
}

const previewSource = fs.readFileSync(path.resolve('src/features/preview-editor.js'), 'utf8');
const previewAst = espree.parse(previewSource, {ecmaVersion:2022, sourceType:'script', range:true});
let previewAdapter = null;
walk(previewAst, node => {
  if (node.type === 'FunctionDeclaration' && node.id?.name === 'installSecureTeacherPreviewRuntime') previewAdapter = node;
});
if (!previewAdapter) throw new Error('installSecureTeacherPreviewRuntime was not found in preview-editor.js');
const previewAdapterSource = previewSource.slice(previewAdapter.range[0], previewAdapter.range[1]);
for (const required of SECURE_PREVIEW_ADAPTER_GLOBALS) {
  if (!secureRuntimeNames.has(required)) {
    throw new Error(`Secure student runtime global was not derived from versioned sources: ${required}`);
  }
  if (!new RegExp(`(^|[^\\w$])${required.replace(/[$]/g, '\\$&')}([^\\w$]|$)`).test(previewAdapterSource)) {
    throw new Error(`Stale secure preview adapter global allowlist entry: ${required}`);
  }
}
const securePreviewRuntimeNames = new Set(SECURE_PREVIEW_ADAPTER_GLOBALS);
const out = `// AUTO-GENERATED by scripts/generate-eslint-globals.mjs. Do not edit manually.\nexport const projectGlobals = {\n${renderGlobals(names)}\n};\n\nexport const securePreviewRuntimeGlobals = {\n${renderGlobals(securePreviewRuntimeNames)}\n};\n`;
fs.writeFileSync('eslint-globals.generated.mjs', out, 'utf8');
console.log(`✅  ESLint globály vygenerovány (${names.size} projektových, ${securePreviewRuntimeNames.size} ověřených preview-runtime názvů).`);
