// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';

export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.jquery,
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
  },
  {
    ignores: ['playground/**', 'node_modules/**', 'dist/**', '.idea/**', '.vscode/**', 'reports/**', 'tar/**', '!**/*.js', '!**/*.ts'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },
  {
    files: ['test/*.test.js'],
    ...vitest.configs.recommended,
  },
];
