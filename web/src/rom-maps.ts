/** Read-only reader for the map data inside the loaded cartridge. It draws the
 * static field tiles the wide view shows around the live GBA picture. It never
 * reads or writes emulator memory, and it assumes nothing about symbol
 * addresses: the map tables are found by their FireRed data shapes. */

const ROM_BASE = 0x08000000;
const PRIMARY_METATILES = 640;
const PRIMARY_TILES = 640;
const PRIMARY_PALETTES = 7;
const MAX_MAP_SIDE = 1024;
const MAX_MAP_GROUPS_SEARCH = 64;

export const DIRECTION = { SOUTH: 1, NORTH: 2, WEST: 3, EAST: 4 } as const;

export type MapConnection = { direction: number; offset: number; group: number; num: number };
export type MapLayout = {
  width: number; height: number; border: number; blocks: number;
  primary: number; secondary: number; borderWidth: number; borderHeight: number;
};
export type MapHeader = { group: number; num: number; layout: MapLayout; connections: MapConnection[] };
/** RGBA pixels packed as little-endian u32 (ImageData order), one map plus a
 * `pad`-metatile margin filled with connected maps or the map's border. */
export type WorldPixels = { pixels: Uint32Array; width: number; height: number; pad: number; key: string };

/** GBA BIOS LZ77 (type 0x10). */
export function decompressLz77(rom: Uint8Array, offset: number): Uint8Array {
  if (rom[offset] !== 0x10) throw new Error('Not an LZ77 block.');
  const size = rom[offset + 1] | rom[offset + 2] << 8 | rom[offset + 3] << 16;
  const out = new Uint8Array(size);
  let read = offset + 4, written = 0;
  while (written < size) {
    const flags = rom[read++];
    for (let bit = 0; bit < 8 && written < size; bit++) {
      if (flags & 0x80 >> bit) {
        const high = rom[read++], low = rom[read++];
        const length = (high >> 4) + 3, distance = ((high & 15) << 8 | low) + 1;
        if (distance > written) throw new Error('LZ77 reference before output start.');
        for (let i = 0; i < length && written < size; i++, written++) out[written] = out[written - distance];
      } else out[written++] = rom[read++];
    }
  }
  return out;
}

/** GBA BGR555 to the 8-bit channel values the emulator canvas shows. */
export function colorFromBgr555(value: number) {
  const expand = (channel: number) => channel << 3 | channel >> 2;
  return (0xff000000 | expand(value >> 10 & 31) << 16 | expand(value >> 5 & 31) << 8 | expand(value & 31)) >>> 0;
}

type Tileset = { tiles: Uint8Array; palettes: number; metatiles: number; metatileCount: number };

export class CartridgeMaps {
  private readonly rom: Uint8Array;
  private readonly words: Uint32Array;
  private readonly view: DataView;
  private groups?: number[][];
  private readonly tilesets = new Map<number, Tileset | undefined>();
  private readonly metatileCache = new Map<string, Uint32Array>();

  constructor(rom: Uint8Array) {
    // Word scans need 4-byte alignment; a fresh fetch buffer always has it.
    const aligned = rom.byteOffset % 4 === 0 ? rom : rom.slice();
    this.rom = aligned;
    this.words = new Uint32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength >> 2);
    this.view = new DataView(aligned.buffer, aligned.byteOffset, aligned.byteLength);
  }

  private pointer(value: number) { return value >= ROM_BASE && value < ROM_BASE + this.rom.length ? value - ROM_BASE : -1; }
  private u32(offset: number) { return this.view.getUint32(offset, true); }

  private readLayout(offset: number): MapLayout | undefined {
    if (offset < 0 || offset % 4 || offset + 28 > this.rom.length) return;
    const width = this.view.getInt32(offset, true), height = this.view.getInt32(offset + 4, true);
    if (width < 1 || height < 1 || width > MAX_MAP_SIDE || height > MAX_MAP_SIDE) return;
    const border = this.pointer(this.u32(offset + 8)), blocks = this.pointer(this.u32(offset + 12));
    const primary = this.pointer(this.u32(offset + 16)), secondary = this.pointer(this.u32(offset + 20));
    const borderWidth = this.rom[offset + 24], borderHeight = this.rom[offset + 25];
    if (border < 0 || blocks < 0 || primary < 0 || secondary < 0 || !borderWidth || !borderHeight || borderWidth > 8 || borderHeight > 8) return;
    if (blocks + width * height * 2 > this.rom.length || border + borderWidth * borderHeight * 2 > this.rom.length) return;
    // Tileset headers: isCompressed (0/1), isSecondary (0 primary, 1 secondary).
    if (this.rom[primary] > 1 || this.rom[primary + 1] !== 0 || this.rom[secondary] > 1 || this.rom[secondary + 1] !== 1) return;
    return { width, height, border, blocks, primary, secondary, borderWidth, borderHeight };
  }

  private isHeader(offset: number) {
    if (offset < 0 || offset % 4 || offset + 28 > this.rom.length) return false;
    if (!this.readLayout(this.pointer(this.u32(offset)))) return false;
    const connections = this.u32(offset + 12);
    return this.pointer(this.u32(offset + 4)) >= 0 && this.pointer(this.u32(offset + 8)) >= 0 && (connections === 0 || this.pointer(connections) >= 0);
  }

  /** gMapGroups: the longest run of pointers to arrays of map header pointers. */
  private findGroups(): number[][] {
    const { words } = this;
    const headerCache = new Map<number, boolean>();
    const isHeaderPointer = (value: number) => {
      const offset = this.pointer(value);
      if (offset < 0 || offset % 4) return false;
      let known = headerCache.get(offset);
      if (known === undefined) headerCache.set(offset, known = this.isHeader(offset));
      return known;
    };
    const isGroupPointer = (value: number) => {
      const offset = this.pointer(value);
      return offset >= 0 && offset % 4 === 0 && isHeaderPointer(words[offset >> 2]);
    };
    let best = { start: 0, length: 0 };
    for (let index = 0; index < words.length; index++) {
      if (!isGroupPointer(words[index])) continue;
      let length = 1;
      while (index + length < words.length && length < MAX_MAP_GROUPS_SEARCH && isGroupPointer(words[index + length])) length++;
      if (length > best.length) best = { start: index, length };
      index += length;
    }
    if (best.length < 8) throw new Error('Map groups were not found in this cartridge.');
    const starts = Array.from({ length: best.length }, (_, i) => this.pointer(words[best.start + i]));
    const ordered = [...new Set(starts)].sort((a, b) => a - b);
    // Each group runs until the next group's array (or until headers stop).
    return starts.map((start) => {
      const next = ordered.find((offset) => offset > start) ?? this.rom.length;
      const headers: number[] = [];
      for (let offset = start; offset < next && isHeaderPointer(this.u32(offset)); offset += 4) headers.push(this.pointer(this.u32(offset)));
      return headers;
    });
  }

  header(group: number, num: number): MapHeader | undefined {
    this.groups ??= this.findGroups();
    const offset = this.groups[group]?.[num];
    if (offset === undefined) return;
    const layout = this.readLayout(this.pointer(this.u32(offset)))!;
    const connections: MapConnection[] = [];
    const table = this.pointer(this.u32(offset + 12));
    if (table >= 0) {
      const count = this.view.getInt32(table, true), list = this.pointer(this.u32(table + 4));
      for (let i = 0; list >= 0 && i < count && i < 16; i++) {
        const entry = list + i * 12;
        connections.push({ direction: this.rom[entry], offset: this.view.getInt32(entry + 4, true), group: this.rom[entry + 8], num: this.rom[entry + 9] });
      }
    }
    return { group, num, layout, connections };
  }

  private tileset(offset: number, secondary: boolean): Tileset | undefined {
    if (this.tilesets.has(offset)) return this.tilesets.get(offset);
    let result: Tileset | undefined;
    try {
      const compressed = this.rom[offset] === 1;
      const tiles = this.pointer(this.u32(offset + 4)), palettes = this.pointer(this.u32(offset + 8)), metatiles = this.pointer(this.u32(offset + 12));
      if (tiles >= 0 && palettes >= 0 && metatiles >= 0) {
        const count = secondary ? 1024 - PRIMARY_TILES : PRIMARY_TILES;
        result = { tiles: compressed ? decompressLz77(this.rom, tiles) : this.rom.subarray(tiles, tiles + count * 32), palettes, metatiles, metatileCount: secondary ? 1024 - PRIMARY_METATILES : PRIMARY_METATILES };
      }
    } catch { result = undefined; }
    this.tilesets.set(offset, result);
    return result;
  }

  /** 16×16 RGBA pixels for each metatile of a primary/secondary pair. */
  private metatiles(layout: MapLayout) {
    const key = `${layout.primary}:${layout.secondary}`;
    const cached = this.metatileCache.get(key);
    if (cached) return cached;
    const primary = this.tileset(layout.primary, false), secondary = this.tileset(layout.secondary, true);
    const out = new Uint32Array(1024 * 256);
    if (!primary || !secondary) { this.metatileCache.set(key, out); return out; }
    const palette = new Uint32Array(256);
    for (let p = 0; p < 16; p++) {
      const base = p < PRIMARY_PALETTES ? primary.palettes : secondary.palettes;
      for (let c = 0; c < 16; c++) palette[p * 16 + c] = colorFromBgr555(this.view.getUint16(base + (p * 16 + c) * 2, true));
    }
    const backdrop = palette[0];
    for (let n = 0; n < 1024; n++) {
      const set = n < PRIMARY_METATILES ? primary : secondary;
      const index = n < PRIMARY_METATILES ? n : n - PRIMARY_METATILES;
      const base = set.metatiles + index * 16;
      const pixels = out.subarray(n * 256, n * 256 + 256);
      pixels.fill(backdrop);
      if (index >= set.metatileCount || base + 16 > this.rom.length) continue;
      for (let layer = 0; layer < 2; layer++) {
        for (let quadrant = 0; quadrant < 4; quadrant++) {
          const entry = this.view.getUint16(base + (layer * 4 + quadrant) * 2, true);
          const tile = entry & 0x3ff;
          const source = tile < PRIMARY_TILES ? primary.tiles : secondary.tiles;
          const start = (tile < PRIMARY_TILES ? tile : tile - PRIMARY_TILES) * 32;
          if (start + 32 > source.length) continue;
          const flipX = entry & 0x400, flipY = entry & 0x800, pal = (entry >> 12) * 16;
          const qx = (quadrant & 1) * 8, qy = (quadrant >> 1) * 8;
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              const sx = flipX ? 7 - x : x, sy = flipY ? 7 - y : y;
              const byte = source[start + sy * 4 + (sx >> 1)];
              const color = sx & 1 ? byte >> 4 : byte & 15;
              if (color) pixels[(qy + y) * 16 + qx + x] = palette[pal + color];
            }
          }
        }
      }
    }
    this.metatileCache.set(key, out);
    return out;
  }

  /** The map with `pad` metatiles around it: connected maps where they exist,
   * the map's own border pattern elsewhere, as the field camera would show. */
  world(group: number, num: number, pad: number): WorldPixels | undefined {
    const header = this.header(group, num);
    if (!header) return;
    const { layout } = header;
    const cols = layout.width + pad * 2, rows = layout.height + pad * 2;
    const blocks = new Int32Array(cols * rows).fill(-1);
    const place = (source: MapLayout, left: number, top: number) => {
      for (let y = 0; y < source.height; y++) {
        const wy = top + y;
        if (wy < 0 || wy >= rows) continue;
        for (let x = 0; x < source.width; x++) {
          const wx = left + x;
          if (wx < 0 || wx >= cols) continue;
          blocks[wy * cols + wx] = this.view.getUint16(source.blocks + (y * source.width + x) * 2, true) & 0x3ff;
        }
      }
    };
    const neighbours: Array<{ layout: MapLayout; metatiles: Uint32Array; left: number; top: number }> = [];
    for (const connection of header.connections) {
      const other = this.header(connection.group, connection.num)?.layout;
      if (!other) continue;
      const left = pad + (connection.direction === DIRECTION.WEST ? -other.width : connection.direction === DIRECTION.EAST ? layout.width : connection.offset);
      const top = pad + (connection.direction === DIRECTION.NORTH ? -other.height : connection.direction === DIRECTION.SOUTH ? layout.height : connection.offset);
      if (connection.direction < 1 || connection.direction > 4) continue;
      neighbours.push({ layout: other, metatiles: this.metatiles(other), left, top });
    }
    const width = cols * 16, height = rows * 16;
    const pixels = new Uint32Array(width * height);
    const paint = (metatiles: Uint32Array, metatile: number, wx: number, wy: number) => {
      const source = metatile * 256;
      for (let y = 0; y < 16; y++) pixels.set(metatiles.subarray(source + y * 16, source + y * 16 + 16), (wy * 16 + y) * width + wx * 16);
    };
    // Neighbours first, so the current map wins any overlap.
    for (const neighbour of neighbours) {
      blocks.fill(-1);
      place(neighbour.layout, neighbour.left, neighbour.top);
      for (let i = 0; i < blocks.length; i++) if (blocks[i] >= 0) paint(neighbour.metatiles, blocks[i], i % cols, Math.floor(i / cols));
    }
    const covered = new Uint8Array(cols * rows);
    for (const neighbour of neighbours) {
      for (let y = Math.max(0, neighbour.top); y < Math.min(rows, neighbour.top + neighbour.layout.height); y++) {
        for (let x = Math.max(0, neighbour.left); x < Math.min(cols, neighbour.left + neighbour.layout.width); x++) covered[y * cols + x] = 1;
      }
    }
    const own = this.metatiles(layout);
    blocks.fill(-1);
    place(layout, pad, pad);
    for (let wy = 0; wy < rows; wy++) {
      for (let wx = 0; wx < cols; wx++) {
        const i = wy * cols + wx;
        if (blocks[i] >= 0) { paint(own, blocks[i], wx, wy); continue; }
        if (covered[i]) continue;
        const bx = ((wx - pad) % layout.borderWidth + layout.borderWidth) % layout.borderWidth;
        const by = ((wy - pad) % layout.borderHeight + layout.borderHeight) % layout.borderHeight;
        paint(own, this.view.getUint16(layout.border + (by * layout.borderWidth + bx) * 2, true) & 0x3ff, wx, wy);
      }
    }
    return { pixels, width, height, pad, key: `${group}.${num}.${pad}` };
  }
}
