// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.jquery,
        ...globals.node,
      },
    },
  },
  {
    ignores: ['tests/**', 'node_modules/**', 'dist/**', '.idea/**', '.vscode/**', 'reports/**', 'tar/**', '!**/*.js', '!**/*.ts'],
  },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },
];
