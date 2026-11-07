import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: false,
  build: { outDir: '../dist/control-tests', emptyOutDir: true, rollupOptions: { input: {
    controls: fileURLToPath(new URL('controls-browser.html', import.meta.url)),
    minimap: fileURLToPath(new URL('minimap-browser.html', import.meta.url)),
  } } },
});
