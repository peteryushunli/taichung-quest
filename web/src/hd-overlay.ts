import { PlayerMatcher, parsePlayerTemplates } from './hd-player';
import type { PlayerMatch } from './hd-player';
import { scoreHdCamera } from './hd-scene';
import type { HdScene } from './hd-scene';

// High-resolution preview: buildings and characters drawn from their originals.
//
// The game still renders its own 240x160 frame. Each animation frame this reads
// that frame and draws a 4x copy of it. Buildings: the game reports which map
// the player is on and where; the overlay loads that map's exact in-game
// picture, finds where the screen sits on it, and paints each building's
// high-resolution original over the copy. Characters: any gym leader or story
// character frame is found on screen by its exact pixels and replaced. Every
// pixel the game draws differently (the player, people, grass, a text box, a
// fade) is put back from the frame, so whatever the game puts in front stays in
// front. With nothing to replace, the overlay hides and the original canvas shows.

type Building = { sprite: string; x: number; y: number; w: number; h: number; picture: string; covers: string; mask?: Uint8Array };
type MapEntry = { name: string; ref: string; width: number; height: number; margin: number; cells: [number, number]; buildings: Building[] };
type WorldPack = { version: 2; scale: number; group: number; romSha256: string | null; maps: Record<string, MapEntry> };
type Loaded = { key: string; map: MapEntry; ref: Uint16Array; refW: number; refH: number };
export type Detail = 2 | 3 | 4;
export const DETAILS: Detail[] = [2, 3, 4];
const DETAIL_KEY = 'taichung-hd-detail';
type Nav = HdScene;
type Options = { getScene: () => HdScene | undefined };

const W = 240, H = 160;
const RUN = 6;

type SpriteTemplate = { character: string; kind: string; frame: number; east: boolean; w: number; h: number; atlasX: number; atlasY: number; px: Uint16Array; opaque: number };
type SpritePack = { atlas: HTMLImageElement; index: Map<number, [SpriteTemplate, number, number][]>; first: Uint8Array };

async function loadSprites(base: string): Promise<SpritePack> {
  const pack = await (await fetch(`${base}/sprites.json`, { cache: 'no-cache' })).json() as { atlas: string; sprites: (Omit<SpriteTemplate, 'px' | 'opaque'> & { pixels: string })[] };
  const atlas = await loadImage(`${base}/${pack.atlas}`);
  const index = new Map<number, [SpriteTemplate, number, number][]>(), first = new Uint8Array(32768);
  for (const s of pack.sprites) {
    const bytes = Uint8Array.from(atob(s.pixels), (ch) => ch.charCodeAt(0));
    const px = new Uint16Array(bytes.buffer);
    const t: SpriteTemplate = { ...s, px, opaque: px.reduce((n, v) => n + (v === 0xffff ? 0 : 1), 0) };
    // A few anchor runs per frame (all opaque, most varied colours), so a
    // partly covered character is still found.
    const runs: { x: number; y: number; score: number }[] = [];
    for (let y = 0; y < t.h; y++) for (let x = 0; x + RUN <= t.w; x++) {
      const vals = Array.from(px.subarray(y * t.w + x, y * t.w + x + RUN));
      if (vals.some((v) => v === 0xffff)) continue;
      runs.push({ x, y, score: new Set(vals).size * 100 - Math.abs(y - t.h / 3) });
    }
    runs.sort((a, b) => b.score - a.score);
    const picked: typeof runs = [];
    for (const r of runs) {
      if (picked.length >= 4) break;
      if (picked.some((p) => Math.abs(p.y - r.y) < t.h / 6)) continue;
      picked.push(r);
    }
    for (const r of picked) {
      let h = 0;
      for (let i = 0; i < RUN; i++) h = (Math.imul(h, 31) + px[r.y * t.w + r.x + i]) | 0;
      first[px[r.y * t.w + r.x]] = 1;
      const list = index.get(h) ?? [];
      list.push([t, r.x, r.y]);
      index.set(h, list);
    }
  }
  return { atlas, index, first };
}
const STORAGE_KEY = 'taichung-hd-buildings';

/** Must run before the emulator asks for its WebGL context, so frames stay readable. */
export function keepCanvasReadable(canvas: HTMLCanvasElement) {
  const original = canvas.getContext.bind(canvas) as (type: string, attributes?: object) => RenderingContext | null;
  (canvas as unknown as { getContext: typeof original }).getContext = (type: string, attributes?: object) =>
    original(type, type.startsWith('webgl') || type === 'experimental-webgl' ? { ...attributes, preserveDrawingBuffer: true } : attributes);
}

const to555 = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

async function loadImage(url: string) {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
  return image;
}

async function loadMap(base: string, key: string, map: MapEntry): Promise<Loaded> {
  const refImage = await loadImage(`${base}/${map.ref}`);
  const c = document.createElement('canvas');
  c.width = refImage.width; c.height = refImage.height;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(refImage, 0, 0);
  const rgba = x.getImageData(0, 0, c.width, c.height).data;
  const ref = new Uint16Array(c.width * c.height);
  for (let i = 0; i < ref.length; i++) ref[i] = to555(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
  for (const b of map.buildings) {
    if (b.mask) continue;
    const bits = Uint8Array.from(atob(b.covers), (ch) => ch.charCodeAt(0));
    b.mask = new Uint8Array(b.w * b.h);
    for (let i = 0; i < b.mask.length; i++) b.mask[i] = (bits[i >> 3] >> (i & 7)) & 1;
  }
  return { key, map, ref, refW: c.width, refH: c.height };
}

export class HdOverlay {
  readonly element: HTMLCanvasElement;
  private readonly out: CanvasRenderingContext2D;
  private readonly grab = document.createElement('canvas');
  private readonly grabCtx: CanvasRenderingContext2D;
  private readonly patch = document.createElement('canvas');
  private readonly patchCtx: CanvasRenderingContext2D;
  private readonly patchData: ImageData;
  private readonly playerUnderlay = document.createElement('canvas');
  private readonly playerUnderlayCtx = this.playerUnderlay.getContext('2d')!;
  private readonly frame = new Uint16Array(W * H);
  private rgba = new Uint8ClampedArray(W * H * 4);
  private loaded?: Loaded;
  private pack?: WorldPack;
  private loadingMap?: string;
  private readonly pictures = new Map<string, HTMLImageElement | 'loading'>();
  lastNav?: Nav;
  private sprites?: SpritePack;
  private player?: { atlas: HTMLImageElement; matcher: PlayerMatcher };
  private playerLoading = false;
  private readonly localPlayerDiagnostics = typeof location !== 'undefined' && ['127.0.0.1', 'localhost'].includes(location.hostname);
  lastSprites: string[] = [];
  private camera?: { x: number; y: number };
  private raf = 0;
  private enabledValue: boolean;
  private samples: Int32Array[] = [];
  private listeners = new Set<() => void>();
  status: 'off' | 'loading' | 'searching' | 'locked' | 'error' = 'off';
  private detailValue: Detail = 2;

  constructor(private readonly source: HTMLCanvasElement, private readonly packBase: string, private readonly spriteBase: string, private readonly options: Options, scale = 4) {
    this.element = document.createElement('canvas');
    this.element.className = 'hd-overlay';
    this.element.setAttribute('aria-hidden', 'true');
    this.out = this.element.getContext('2d')!;
    this.packScale = scale;
    let storedDetail: string | null = null;
    try { storedDetail = localStorage.getItem(DETAIL_KEY); } catch { /* storage unavailable */ }
    this.detail = DETAILS.includes(Number(storedDetail) as Detail) ? Number(storedDetail) as Detail : 2;
    this.grab.width = W; this.grab.height = H;
    this.grabCtx = this.grab.getContext('2d', { willReadFrequently: true })!;
    this.patch.width = W; this.patch.height = H;
    this.patchCtx = this.patch.getContext('2d')!;
    this.patchData = this.patchCtx.createImageData(W, H);
    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    this.enabledValue = stored !== 'off';
    // Sample points for the camera search: spread over the screen, avoiding the
    // middle where the player stands and the bottom where text boxes open.
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let set = 0; set < 4; set++) {
      const points: number[] = [];
      while (points.length < 48) {
        const x = Math.floor(rand() * W), y = Math.floor(rand() * 112);
        if (x > 96 && x < 144 && y > 48 && y < 96) continue;
        points.push(y * W + x);
      }
      this.samples.push(Int32Array.from(points));
    }
  }

  /**
   * How many screen pixels each game pixel becomes in the overlay. 4 shows the
   * originals smooth; 2 and 3 redraw them at that density and show the result
   * as crisp pixels, so they sit closer to the rest of the game.
   */
  get detail() { return this.detailValue; }
  set detail(value: Detail) {
    this.detailValue = value;
    try { localStorage.setItem(DETAIL_KEY, String(value)); } catch { /* storage unavailable */ }
    this.element.width = W * value; this.element.height = H * value;
    this.element.classList.toggle('hd-crisp', value < 4);
    this.out.imageSmoothingEnabled = false;
    this.emit();
  }
  private readonly packScale: number;

  get enabled() { return this.enabledValue; }
  set enabled(value: boolean) {
    this.enabledValue = value;
    try { localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off'); } catch { /* storage unavailable */ }
    if (!value) { this.hide(); this.status = 'off'; this.emit(); }
    else this.start();
  }
  onChange(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit() { this.listeners.forEach((listener) => listener()); }

  start() {
    if (!this.enabledValue) return;
    if (!this.player && !this.playerLoading) {
      this.playerLoading = true;
      Promise.all([fetch('/hd/player/player.json', { cache: 'no-cache' }).then(r => {
        if (!r.ok) throw new Error('Player presentation is unavailable.');
        return r.json();
      }), loadImage('/hd/player/atlas.png')]).then(([pack, atlas]) => {
        const templates = parsePlayerTemplates(pack, atlas.width, atlas.height);
        if (!templates) throw new Error('Unpaired player presentation.');
        this.player = { atlas, matcher: new PlayerMatcher(templates) };
      }).catch(error => console.info('Using native player pixels:', error)).finally(() => { this.playerLoading = false; });
    }
    if (this.raf) return;
    if (!this.sprites) loadSprites(this.spriteBase).then((sprites) => { this.sprites = sprites; })
      .catch((error) => console.info('HD character pack unavailable:', error));
    if (!this.pack && this.status !== 'loading') {
      this.status = 'loading'; this.emit();
      Promise.all([
        fetch(`${this.packBase}/pack.json`, { cache: 'no-cache' }).then((r) => r.json() as Promise<WorldPack>),
        fetch('/roms/build.json', { cache: 'no-cache' }).then((r) => r.json() as Promise<{ sha256: string }>),
      ]).then(([pack, build]) => {
        // A pack only fits the cartridge it was made from.
        if (pack.romSha256 && pack.romSha256 !== build.sha256) throw new Error('HD pack was made for a different cartridge');
        this.pack = pack;
        this.status = 'searching'; this.emit();
      }).catch((error) => { console.info('HD building pack unavailable:', error); this.status = 'error'; this.emit(); });
    }
    const tick = () => { this.raf = requestAnimationFrame(tick); this.draw(); };
    this.raf = requestAnimationFrame(tick);
  }

  stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.hide(); }

  private hide() { this.element.classList.remove('playing'); this.camera = undefined; this.playerDiagnostic(); }

  private readFrame() {
    this.grabCtx.drawImage(this.source, 0, 0, W, H);
    const rgba = this.rgba = this.grabCtx.getImageData(0, 0, W, H).data;
    const f = this.frame;
    for (let i = 0; i < f.length; i++) f[i] = to555(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
  }

  /** The current map's picture, fetched the first time the player is on it. */
  private currentMap(nav: Nav | undefined) {
    if (!nav || !this.pack) return undefined;
    const key = `${nav.group}.${nav.map}`;
    if (this.loaded?.key === key) return this.loaded;
    const map = this.pack.maps[key];
    if (!map) return undefined;
    if (this.loadingMap !== key) {
      this.loadingMap = key;
      loadMap(this.packBase, key, map).then((loaded) => { if (this.loadingMap === key) { this.loaded = loaded; this.camera = undefined; } })
        .catch((error) => console.info('HD map unavailable:', key, error));
      for (const b of map.buildings) this.picture(b.picture);
    }
    return undefined;
  }

  private picture(file: string) {
    const have = this.pictures.get(file);
    if (have) return have === 'loading' ? undefined : have;
    this.pictures.set(file, 'loading');
    loadImage(`${this.packBase}/${file}`).then((image) => this.pictures.set(file, image)).catch(() => this.pictures.delete(file));
    return undefined;
  }

  /** Share of sample points where the frame equals the map at this camera. */
  private score(cx: number, cy: number, step = 7) {
    const { ref, refW, refH } = this.loaded!;
    return scoreHdCamera(this.frame, ref, refW, refH, cx, cy, step);
  }

  /** Narrow every camera position in the window down by successive sample points. */
  private search(x0: number, y0: number, x1: number, y1: number) {
    const { ref, refW, refH } = this.loaded!;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(refW - W, x1); y1 = Math.min(refH - H, y1);
    if (x1 < x0 || y1 < y0) return undefined;
    let best: { x: number; y: number; s: number } | undefined;
    for (const points of this.samples) {
      let alive: { x: number; y: number }[] = [];
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) alive.push({ x: cx, y: cy });
      for (const p of points) {
        const sx = p % W, sy = (p / W) | 0, want = this.frame[p];
        alive = alive.filter((c) => ref[(c.y + sy) * refW + c.x + sx] === want);
        if (alive.length <= 1) break;
      }
      for (const c of alive) {
        const s = this.score(c.x, c.y, 3);
        if (!best || s > best.s) best = { ...c, s };
      }
      if (best && best.s > 0.9) break;
    }
    return best && best.s > 0.75 ? best : undefined;
  }

  private locate(nav: Nav) {
    const last = this.camera;
    if (last) {
      // Walking moves the screen a pixel or two a frame, the bike a little more.
      let best = { x: last.x, y: last.y, s: this.score(last.x, last.y) };
      if (best.s < 0.97) {
        for (let r = 1; r <= 8 && best.s < 0.97; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const s = this.score(last.x + dx, last.y + dy);
            if (s > best.s) best = { x: last.x + dx, y: last.y + dy, s };
          }
        }
      }
      if (best.s > 0.8) return best;
    }
    // The player stands near the middle of the screen: search around there.
    const m = this.loaded!.map.margin;
    const cx = (nav.x + m) * 16 - 112, cy = (nav.y + m) * 16 - 64;
    return this.search(cx - 40, cy - 40, cx + 40, cy + 40);
  }

  /** Find every character frame on screen by an exact run of its pixels, then check the whole frame. */
  private findSprites() {
    const sp = this.sprites;
    if (!sp) return [];
    const f = this.frame, found = new Map<number, { t: SpriteTemplate; x: number; y: number; hits: number }>();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x + RUN <= W; x++) {
        const i = y * W + x;
        if (!sp.first[f[i]]) continue;
        let h = 0;
        for (let r = 0; r < RUN; r++) h = (Math.imul(h, 31) + f[i + r]) | 0;
        const list = sp.index.get(h);
        if (!list) continue;
        for (const [t, ax, ay] of list) {
          const ox = x - ax, oy = y - ay, key = (oy + 64) * 1024 + ox + 64;
          if ((found.get(key)?.hits ?? -1) >= t.opaque) continue;
          let seen = 0, hits = 0;
          for (let ty = 0; ty < t.h; ty++) {
            const sy = oy + ty;
            if (sy < 0 || sy >= H) continue;
            for (let tx = 0; tx < t.w; tx++) {
              const v = t.px[ty * t.w + tx], sx = ox + tx;
              if (v === 0xffff || sx < 0 || sx >= W) continue;
              seen++; if (f[sy * W + sx] === v) hits++;
            }
          }
          if (seen < t.opaque * 0.4 || hits < seen * 0.6) continue;
          const prev = found.get(key);
          if (!prev || hits > prev.hits) found.set(key, { t, x: ox, y: oy, hits });
        }
      }
    }
    // One picture per place: drop weaker matches that overlap a stronger one.
    const all = [...found.values()].sort((a, b) => b.hits - a.hits), kept: typeof all = [];
    for (const m of all) {
      if (kept.some((o) => Math.abs(o.x - m.x) < m.t.w / 2 && Math.abs(o.y - m.y) < m.t.h / 2)) continue;
      kept.push(m);
    }
    return kept;
  }

  /** Read-only rendering evidence; no game state or user controls. */
  private playerDiagnostic(match?: PlayerMatch) {
    if (!this.localPlayerDiagnostics) return;
    const value = match ? `${match.t.kind}:${match.t.frame}:${match.t.east ? 'east' : 'native'}@${match.x},${match.y}` : '';
    if (this.element.dataset.playerPose !== value) this.element.dataset.playerPose = value;
  }

  /** Smooth only when shrinking an original; game pixels always stay hard-edged. */
  private smooth(on: boolean) {
    const resize = on && this.detailValue !== this.packScale;
    this.out.imageSmoothingEnabled = resize;
    if (resize) this.out.imageSmoothingQuality = 'high';
  }

  private flushPatch() {
    this.patchCtx.putImageData(this.patchData, 0, 0);
    this.out.drawImage(this.patch, 0, 0, this.element.width, this.element.height);
    this.patchData.data.fill(0);
  }

  private draw() {
    if (!this.enabledValue || (!this.pack && !this.sprites)) return;
    this.readFrame();
    const nav = this.lastNav = this.options.getScene();
    const loaded = nav ? this.currentMap(nav) : undefined;
    const camera = loaded ? this.locate(nav!) : undefined;
    const sprites = this.findSprites();
    const player = nav && camera && loaded && this.player ? this.player.matcher.match(this.frame, {
      x: (nav.x + loaded.map.margin) * 16 + 8 - camera.x,
      y: (nav.y + loaded.map.margin) * 16 + 16 - camera.y,
    }) : undefined;
    this.playerDiagnostic(player);
    this.camera = camera;
    const next = camera ? 'locked' : 'searching';
    if (this.status !== next) { this.status = next; this.emit(); }
    if (!camera && !sprites.length) { this.hide(); return; }
    const k = this.element.width / W, out = this.out;
    out.drawImage(this.grab, 0, 0, W * k, H * k);
    const patch = this.patchData.data, rgba = this.rgba;
    const keep = (i: number) => { const o = i * 4; patch[o] = rgba[o]; patch[o + 1] = rgba[o + 1]; patch[o + 2] = rgba[o + 2]; patch[o + 3] = 255; };

    if (camera && loaded) {
      const { map, ref, refW } = loaded;
      let patched = false;
      for (const b of map.buildings) {
        const x0 = b.x - camera.x, y0 = b.y - camera.y;
        if (x0 >= W || y0 >= H || x0 + b.w <= 0 || y0 + b.h <= 0) continue;
        const image = this.picture(b.picture);
        if (!image) continue;
        this.smooth(true);
        out.drawImage(image, x0 * k, y0 * k, b.w * k, b.h * k);
        this.smooth(false);
        // Put back what the game draws in front (every pixel that is not the map)
        // and every pixel of the box that is not the building itself.
        const mask = b.mask!;
        const ax = Math.max(0, x0), ay = Math.max(0, y0), bx = Math.min(W, x0 + b.w), by = Math.min(H, y0 + b.h);
        for (let y = ay; y < by; y++) {
          const row = (y + camera.y) * refW + camera.x;
          for (let x = ax; x < bx; x++) {
            const i = y * W + x;
            if (mask[(y - y0) * b.w + x - x0] && this.frame[i] === ref[row + x]) continue;
            keep(i); patched = true;
          }
        }
      }
      if (patched) this.flushPatch();
    }

    if (sprites.length && this.sprites) {
      let patched = false;
      for (const { t, x, y } of sprites) {
        const s = this.packScale;
        this.smooth(k !== s);
        out.drawImage(this.sprites.atlas, t.atlasX, t.atlasY, t.w * s, t.h * s, x * k, y * k, t.w * k, t.h * k);
        this.smooth(false);
        // Whatever covers the character in the game (grass, a roof, a text box) stays on top.
        for (let ty = 0; ty < t.h; ty++) for (let tx = 0; tx < t.w; tx++) {
          const sx = x + tx, sy = y + ty, v = t.px[ty * t.w + tx];
          if (v === 0xffff || sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
          const i = sy * W + sx;
          if (this.frame[i] !== v) { keep(i); patched = true; }
        }
      }
      if (patched) this.flushPatch();
    }
    if (player && this.player && loaded && camera) {
      const { t, x, y } = player;
      // Save the already composited scene wherever native foreground covers
      // the player. Restoring raw game pixels here would erase HD characters
      // visible through the player's transparent head/shoulder area.
      const foreground: [number, number, number][] = [];
      for (let ty = 0; ty < t.h; ty++) {
        let start = -1;
        for (let tx = 0; tx <= t.w; tx++) {
          const i = (y + ty) * W + x + tx;
          const expected = t.px[ty * t.w + tx];
          const covered = tx < t.w && (expected === 0xffff
            ? this.frame[i] !== loaded.ref[(y + ty + camera.y) * loaded.refW + x + tx + camera.x]
            : this.frame[i] !== expected);
          if (covered && start < 0) start = tx;
          if (!covered && start >= 0) { foreground.push([start, ty, tx - start]); start = -1; }
        }
      }
      if (foreground.length) {
        const buffer = this.playerUnderlay;
        if (buffer.width !== t.w * k || buffer.height !== t.h * k) {
          buffer.width = t.w * k; buffer.height = t.h * k;
        }
        this.playerUnderlayCtx.drawImage(this.element, x * k, y * k, t.w * k, t.h * k, 0, 0, t.w * k, t.h * k);
      }
      // The player atlas is genuinely2x; never apply the NPC pack's4x scale.
      this.out.imageSmoothingEnabled = false;
      out.drawImage(this.player.atlas, t.atlasX, t.atlasY, t.w * 2, t.h * 2, x * k, y * k, t.w * k, t.h * k);
      if (foreground.length) {
        out.save(); out.beginPath();
        for (const [tx, ty, width] of foreground) out.rect((x + tx) * k, (y + ty) * k, width * k, k);
        out.clip(); out.drawImage(this.playerUnderlay, x * k, y * k); out.restore();
      }
    }
    this.lastSprites = sprites.map(({ t, x, y }) => `${t.character}:${t.kind}:${t.frame}@${x},${y}`);
    this.element.classList.add('playing');
  }
}
