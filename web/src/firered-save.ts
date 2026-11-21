const SECTOR_BYTES = 0x1000;
const SLOT_SECTORS = 14;
const SIGNATURE = 0x08012025;
// FireRed's sSaveSlotLayout, in sector ID order.
const PAYLOAD_BYTES = [0xf24, 0xf80, 0xf80, 0xf80, 0xee8,
  0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0xf80, 0x7d0];

export function isFullFireRedSaveSize(size: number) {
  return size === 0x20000 || size === 0x20010;
}

export function isFireRedBackupSize(size: number) {
  return isFullFireRedSaveSize(size) || size === 0x10000 || size === 0x10010;
}

function checksum(view: DataView, start: number, length: number) {
  let total = 0;
  for (let offset = start; offset < start + length; offset += 4)
    total = (total + view.getUint32(offset, true)) >>> 0;
  return ((total >>> 16) + total) & 0xffff;
}

export function readFireRedSaveSlot(view: DataView, slot: 0 | 1) {
  const start = slot * SLOT_SECTORS * SECTOR_BYTES;
  const end = start + SLOT_SECTORS * SECTOR_BYTES;
  if (end > view.byteLength) return;

  const counter = view.getUint32(start + 0xffc, true);
  const sections = new Array<number>(SLOT_SECTORS);
  for (let offset = start; offset < end; offset += SECTOR_BYTES) {
    if (view.getUint32(offset + 0xff8, true) !== SIGNATURE || view.getUint32(offset + 0xffc, true) !== counter) return;
    const id = view.getUint16(offset + 0xff4, true);
    if (id >= SLOT_SECTORS || sections[id] !== undefined
      || checksum(view, offset, PAYLOAD_BYTES[id]) !== view.getUint16(offset + 0xff6, true)) return;
    sections[id] = offset;
  }
  return { counter, sections };
}

export function hasReadableFireRedSave(bytes: Uint8Array) {
  if (!isFireRedBackupSize(bytes.byteLength)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The cartridge can recover from one interrupted or empty slot.
  return !!(readFireRedSaveSlot(view, 0) ?? readFireRedSaveSlot(view, 1));
}
