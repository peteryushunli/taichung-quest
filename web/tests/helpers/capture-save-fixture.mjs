// Synthetic unit data only; never imported into an emulator or used as runtime
// acceptance evidence. Sector sizes follow published FireRed save structures.
const sizes = [0xf24, 0xf80, 0xf80, 0xf80, 0xee8, ...Array(8).fill(0xf80), 0x7d0];
export const proof = { saveCounter: 7, trainerId: 0x12345678, attempts: 0x2041, unlocks: 0x0041 };
export function fixture(expected = proof, slot = 1, rotation = 5, schema = 0xec01) {
  const bytes = new Uint8Array(0x20000).fill(0xff);
  const view = new DataView(bytes.buffer);
  const positions = [];
  for (let id = 0; id < 14; id++) {
    const at = (slot * 14 + (id + rotation) % 14) * 0x1000;
    positions[id] = at;
    bytes.fill(0, at, at + 0xf80);
    view.setUint16(at + 0xff4, id, true);
    view.setUint32(at + 0xff8, 0x08012025, true);
    view.setUint32(at + 0xffc, expected.saveCounter, true);
  }
  view.setUint32(positions[0] + 0xa, expected.trainerId, true);
  const wide = schema === 0xec02 || schema === 0xec03;
  const lowMask = wide ? 0x3ff : 0xffff;
  const fields = [[0xf3, schema], [0xf4, expected.attempts & lowMask], [0xf5, expected.unlocks & lowMask]];
  if (wide) fields.push([0xf0, expected.attempts >>> 10], [0xf2, expected.unlocks >>> 10]);
  if (schema === 0xec03) fields.push([0xef, (expected.attempts >>> 26 & 1) | (expected.unlocks >>> 26 & 1) << 8]);
  for (const [id, value] of fields)
    view.setUint16(positions[2] + 0x1000 + id * 2 - 0xf80, value, true);
  function seal(id) {
    const words = new Uint32Array(bytes.buffer, positions[id], sizes[id] / 4);
    const total = Number([...words].reduce((sum, word) => (sum + BigInt(word)) & 0xffffffffn, 0n));
    view.setUint16(positions[id] + 0xff6, (total + Math.floor(total / 65536)) & 65535, true);
  }
  positions.forEach((_, id) => seal(id));
  return { bytes, view, positions, seal };
}
