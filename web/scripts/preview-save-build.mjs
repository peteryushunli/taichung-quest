import { existsSync } from 'node:fs';
import { loadEnv } from 'vite';

export function validatePreviewSaveBuild(mode) {
  const seedFile = new URL('../public/roms/playtest-post-intro.sav', import.meta.url);
  const enabled = loadEnv(mode, process.cwd(), 'VITE_').VITE_PLAYTEST_PREVIEW_SAVE === '1';
  return {
    name: 'validate-preview-save-build',
    apply: 'build',
    buildStart() {
      if (!enabled && existsSync(seedFile)) {
        throw new Error('Remove public/roms/playtest-post-intro.sav before building without VITE_PLAYTEST_PREVIEW_SAVE=1.');
      }
    },
  };
}
