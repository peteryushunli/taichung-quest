import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: false,
  build: { outDir: '../dist/control-tests', emptyOutDir: true, rollupOptions: { input: fileURLToPath(new URL('controls-browser.html', import.meta.url)) } },
});
