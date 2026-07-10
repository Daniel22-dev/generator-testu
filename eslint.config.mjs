// ESLint konfigurace pro postupne stabilizovany vanilla JS projekt.
// Zamerne je mirna: kontroluje syntaxi a jasne rizikove chyby, ale nevyzaduje hned prepis
// stavajici modularni konkatenace na ES moduly.

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  crypto: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  FileReader: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  prompt: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  console: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'archive/**'],
  },
  {
    files: ['src/**/*.js', 'public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tools/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' },
    },
    rules: {
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'off',
    },
  },
];
