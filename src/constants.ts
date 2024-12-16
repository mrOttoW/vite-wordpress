export const VITE_PLUGIN_NAME = 'vite-wordpress';
export const DEFAULT_OPTIONS = {
  outDir: 'build',
  srcDir: 'src',
  base: '',
  target: 'es2017',
  input: [],
  alias: {},
  globals: {},
  manifest: false,
  preserveDirs: true,
  wrapper: true,
  banner: "(() => {'use strict';document.addEventListener('DOMContentLoaded', () => {",
  footer: '})})();',
  css: 'pcss',
  allowedJsExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
};
