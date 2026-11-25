import { defineConfig } from 'vite';
import { validatePreviewSaveBuild } from './scripts/preview-save-build.mjs';

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig(({ mode }) => ({
  server: { headers: isolationHeaders, port: 5173, strictPort: true },
  preview: { headers: isolationHeaders, port: 4173, strictPort: true },
  build: { target: 'es2022' },
  plugins: [validatePreviewSaveBuild(mode)],
}));
