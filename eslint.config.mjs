// ESLint pro projekt složený z více classic scriptů ve sdíleném globálním scope.
// Seznam projektových globálů se generuje z top-level deklarací před každým lintem.
import globals from 'globals';
import { projectGlobals } from './eslint-globals.generated.mjs';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'archive/**'],
  },
  {
    files: ['src/**/*.js', 'public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...projectGlobals },
    },
    rules: {
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tools/**/*.mjs', 'eslint.config.mjs', 'eslint-globals.generated.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
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
