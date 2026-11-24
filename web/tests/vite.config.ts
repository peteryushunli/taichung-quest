import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: false,
  build: { outDir: '../dist/control-tests', emptyOutDir: true, rollupOptions: { input: {
    badges: fileURLToPath(new URL('badges-browser.html', import.meta.url)),
    encounters: fileURLToPath(new URL('encounter-browser.html', import.meta.url)),
    controls: fileURLToPath(new URL('controls-browser.html', import.meta.url)),
    minimap: fileURLToPath(new URL('minimap-browser.html', import.meta.url)),
    onboarding: fileURLToPath(new URL('onboarding-browser.html', import.meta.url)),
  } } },
});
