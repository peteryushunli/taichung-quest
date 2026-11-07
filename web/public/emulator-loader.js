// Keep the threaded Emscripten runtime outside Vite's source transformation.
// Its pthread worker must import this unmodified module at the same URL.
import createEmulator from './emulator/mgba.js';

window.taichungCreateEmulator = createEmulator;
window.dispatchEvent(new Event('taichung:emulator-ready'));
