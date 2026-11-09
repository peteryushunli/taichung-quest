import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { GBA_H, GBA_W, VIEW_PREFERENCE, readViewPreference, registerFrame, samplePoints, wideGeometry } from '../src/wide-view-model.ts';
import { CartridgeMaps, colorFromBgr555, decompressLz77 } from '../src/rom-maps.ts';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

test('a view link wins and is remembered; otherwise the saved choice; otherwise phones fill and desktops step back', () => {
  const storage = memoryStorage({ [VIEW_PREFERENCE]: 'c' });
  assert.equal(readViewPreference('?view=a', storage, false), 'a');
  assert.equal(storage.values.get(VIEW_PREFERENCE), 'a');
  assert.equal(readViewPreference('', storage, false), 'a');
  assert.equal(readViewPreference('?view=zoomed', memoryStorage({ [VIEW_PREFERENCE]: 'classic' }), true), 'classic');
  assert.equal(readViewPreference('', memoryStorage({ [VIEW_PREFERENCE]: 'wide' }), true), 'a');
  assert.equal(readViewPreference('', memoryStorage(), false), 'b');
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readViewPreference('?view=c', broken, true), 'c');
  assert.equal(readViewPreference('', broken, true), 'a');
  assert.equal(readViewPreference('', undefined, false), 'b');
});

test('wide geometry covers the whole box and keeps the live picture centred at the chosen zoom', () => {
  const cases = [
    { box: [384, 365], zoom: 1 }, // phone, A: the screen grows into spare height
    { box: [384, 365], zoom: .5 },
    { box: [1390, 550], zoom: .75 }, // desktop, B
    { box: [1390, 550], zoom: .5 },
    { box: [240, 160], zoom: 1 }, // today's shape: nothing around it
  ];
  for (const { box: [width, height], zoom } of cases) {
    const g = wideGeometry(width, height, zoom);
    assert.equal(g.fit, Math.min(width / GBA_W, height / GBA_H));
    assert.ok(g.scale >= g.fit * zoom - 1e-9, `scale for ${width}×${height} at ${zoom}`);
    assert.ok(g.cols * g.scale >= width - 1e-6 && g.rows * g.scale >= height - 1e-6, `covers ${width}×${height}`);
    assert.ok((g.cols - 2) * g.scale < width && (g.rows - 2) * g.scale < height, `no more than one extra pixel per side for ${width}×${height}`);
    assert.equal(g.cols, GBA_W + g.marginX * 2);
    assert.equal(g.rows, GBA_H + g.marginY * 2);
  }
  assert.deepEqual(wideGeometry(240, 160, 1), { fit: 1, scale: 1, marginX: 0, marginY: 0, cols: 240, rows: 160 });
  // A huge, tiny-zoom box is limited to the surround that is drawn.
  const capped = wideGeometry(4000, 3000, .1);
  assert.ok(capped.marginX <= 24 * 16 + 1 && capped.marginY <= 24 * 16 + 1);
});

test('frame samples skip the player sprite and stay inside the picture', () => {
  const samples = samplePoints();
  assert.ok(samples.length > 500);
  for (const index of samples) {
    const x = index % GBA_W, y = Math.floor(index / GBA_W);
    assert.ok(x < GBA_W && y < GBA_H);
    assert.ok(!(x >= 100 && x < 140 && y >= 44 && y < 100), `sample ${x},${y} sits on the player`);
  }
});

function world(width, height, seed = 1) {
  const pixels = new Uint32Array(width * height);
  let state = seed;
  for (let i = 0; i < pixels.length; i++) { state = (Math.imul(state, 1103515245) + 12345) >>> 0; pixels[i] = (0xff000000 | (state >>> 8)) >>> 0; }
  return { pixels, width, height };
}
function cut(source, x, y) {
  const frame = new Uint32Array(GBA_W * GBA_H);
  for (let row = 0; row < GBA_H; row++) frame.set(source.pixels.subarray((y + row) * source.width + x, (y + row) * source.width + x + GBA_W), row * GBA_W);
  return frame;
}

test('a live frame registers at its exact place in the map, near the guess and under dialogue', () => {
  const map = world(640, 480);
  const samples = samplePoints();
  const frame = cut(map, 200, 150);
  assert.deepEqual(registerFrame(frame, map, 200, 150, 4, samples), { x: 200, y: 150, match: 1 });
  assert.deepEqual(registerFrame(frame, map, 188, 166, 16, samples), { x: 200, y: 150, match: 1 });
  // A dialogue box over the bottom third still lands on the right place.
  frame.fill(0xffffffff, (GBA_H - 56) * GBA_W);
  const covered = registerFrame(frame, map, 210, 140, 16, samples);
  assert.equal(covered.x, 200); assert.equal(covered.y, 150);
  assert.ok(covered.match > .6 && covered.match < .9);
  // Out of the window it can only report a poor match.
  assert.ok(registerFrame(cut(map, 200, 150), map, 260, 150, 12, samples).match < .1);
  // Windows that leave the map are clipped, not read out of bounds.
  assert.deepEqual(registerFrame(cut(map, 0, 0), map, 4, 3, 8, samples), { x: 0, y: 0, match: 1 });
  assert.equal(registerFrame(cut(map, 0, 0), map, -100, -100, 8, samples), undefined);
});

test('equal matches keep the position nearest the guess', () => {
  const flat = { pixels: new Uint32Array(400 * 300).fill(0xff336699), width: 400, height: 300 };
  assert.deepEqual(registerFrame(new Uint32Array(GBA_W * GBA_H).fill(0xff336699), flat, 50, 40, 10, samplePoints()), { x: 50, y: 40, match: 1 });
});

test('cartridge colours and LZ77 blocks decode as the GBA does', () => {
  assert.equal(colorFromBgr555(0), 0xff000000);
  assert.equal(colorFromBgr555(0x7fff), 0xffffffff);
  assert.equal(colorFromBgr555(0x001f), 0xff0000ff); // red lands in the first byte (ImageData order)
  assert.equal(colorFromBgr555(0x7c00), 0xffff0000);
  // "abcabcabc!": three literals, a 6-byte back-reference 3 back, then one more literal.
  const block = Uint8Array.from([0x10, 10, 0, 0, 0b00010000, 0x61, 0x62, 0x63, 0x30, 0x02, 0x21]);
  assert.equal(Buffer.from(decompressLz77(block, 0)).toString(), 'abcabcabc!');
  assert.throws(() => decompressLz77(Uint8Array.from([0x11, 0, 0, 0]), 0), /Not an LZ77/);
  assert.throws(() => decompressLz77(Uint8Array.from([0x10, 3, 0, 0, 0x80, 0x00, 0x05]), 0), /before output start/);
});

const romFile = new URL('../public/roms/taichung-firered.gba', import.meta.url);
test('the built cartridge’s map tables match the minimap contract', { skip: !existsSync(romFile) && 'no local cartridge build' }, () => {
  const contract = JSON.parse(readFileSync(new URL('../src/data/minimap-contract.json', import.meta.url), 'utf8'));
  const maps = new CartridgeMaps(new Uint8Array(readFileSync(romFile)));
  for (const map of Object.values(contract.mapsByNativeKey)) {
    const header = maps.header(map.group, map.number);
    assert.ok(header, `header ${map.nativeKey}`);
    assert.equal(header.layout.width, map.width, `${map.nativeKey} width`);
    assert.equal(header.layout.height, map.height, `${map.nativeKey} height`);
  }
  const xitun = Object.values(contract.mapsByNativeKey).find((map) => map.nativeMapName === 'TaichungXitun') ?? contract.mapsByNativeKey['43:2'];
  const pixels = maps.world(xitun.group, xitun.number, 8);
  assert.equal(pixels.width, (xitun.width + 16) * 16);
  assert.equal(pixels.height, (xitun.height + 16) * 16);
  assert.ok(pixels.pixels.every((value) => value >>> 24 === 0xff), 'every pixel is opaque');
});
