import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  build: {
    manifest: false,
    minify: true,
    reportCompressedSize: true,
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ViteWordpress',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['fs', 'path', 'crypto', 'deepmerge', 'fast-glob', 'rollup-plugin-external-globals'],
    },
  },
});
