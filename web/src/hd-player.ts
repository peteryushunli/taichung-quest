/** Native framebuffer recognition only: no animation clock or game writes. */
export type PlayerTemplate = { kind: 'walking' | 'running' | 'cycling'; frame: number; east: boolean;
  w: number; h: number; atlasX: number; atlasY: number; px: Uint16Array; opaque: number };
export type PlayerMatch = { t: PlayerTemplate; x: number; y: number; obscured: number };
export type PlayerFootprint = { x: number; y: number };
export type PlayerForeground = (x: number, y: number, playerBottom: number) => boolean;
const RUN = 6;
const RADIUS = 24;
const W = 240, H = 160;
const WEST = { walking: [2, 7, 8], running: [6, 7, 8], cycling: [2, 7, 8] };
const COUNTS = { walking: 9, running: 11, cycling: 9 };

/** A separate genuinely2x atlas; NPC4x template coordinates remain untouched. */
export function parsePlayerTemplates(value: unknown, atlasWidth: number, atlasHeight: number): PlayerTemplate[] | undefined {
  if (!value || typeof value !== 'object') return;
  const pack = value as Record<string, unknown>;
  if (pack.version !== 1 || pack.scale !== 2 || pack.style !== 'approved-crisp-2x' || pack.atlas !== 'atlas.png'
    || !Array.isArray(pack.sprites) || pack.sprites.length !== 38) return;
  const templates: PlayerTemplate[] = [], seen = new Set<string>();
  for (const raw of pack.sprites) {
    if (!raw || typeof raw !== 'object') return;
    const s = raw as Record<string, unknown>;
    const kind = s.kind as PlayerTemplate['kind'];
    if (!Object.hasOwn(COUNTS, kind) || typeof s.east !== 'boolean' || typeof s.frame !== 'number'
      || !Number.isInteger(s.frame) || s.frame < 0 || s.frame >= COUNTS[kind]
      || (s.east && !WEST[kind].includes(s.frame)) || typeof s.w !== 'number' || s.w !== (kind === 'cycling' ? 32 : 16) || s.h !== 32
      || typeof s.atlasX !== 'number' || typeof s.atlasY !== 'number' || !Number.isInteger(s.atlasX)
      || !Number.isInteger(s.atlasY) || s.atlasX < 0 || s.atlasY < 0 || s.atlasX + s.w * 2 > atlasWidth
      || s.atlasY + s.h * 2 > atlasHeight || typeof s.pixels !== 'string') return;
    const id = `${kind}:${s.frame}:${s.east}`;
    if (seen.has(id)) return;
    seen.add(id);
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(s.pixels), ch => ch.charCodeAt(0)); } catch { return; }
    if (bytes.length !== s.w * s.h * 2) return;
    const px = new Uint16Array(bytes.buffer);
    if (px.some(pixel => pixel !== 0xffff && pixel > 0x7fff)) return;
    const opaque = px.reduce((n, v) => n + Number(v !== 0xffff), 0);
    if (opaque < 64) return;
    templates.push({ kind, frame: s.frame, east: s.east, w: s.w, h: s.h, atlasX: s.atlasX, atlasY: s.atlasY, px, opaque });
  }
  return templates;
}

type Anchor = { t: PlayerTemplate; x: number; y: number };
export class PlayerMatcher {
  private index = new Map<number, Anchor[]>();
  private first = new Uint8Array(32768);
  readonly templates: PlayerTemplate[];
  scannedPixels = 0;
  constructor(templates: PlayerTemplate[]) {
    // Equal native poses also have identical approved Scale2x pixels. Do not
    // turn aliases into false ambiguity or invent a distinction native lacks.
    this.templates = templates.filter((t, i) => templates.findIndex(other => other.w === t.w && other.h === t.h
      && other.px.every((v, n) => v === t.px[n])) === i);
    for (const t of this.templates) {
      const runs: { x: number; y: number; score: number }[] = [];
      for (let y = 0; y < t.h; y++) for (let x = 0; x + RUN <= t.w; x++) {
        const values = t.px.subarray(y * t.w + x, y * t.w + x + RUN);
        if (values.includes(0xffff)) continue;
        runs.push({ x, y, score: new Set(values).size * 100 - Math.abs(y - t.h / 3) });
      }
      runs.sort((a, b) => b.score - a.score);
      const picked: typeof runs = [];
      for (const run of runs) {
        if (picked.length === 4) break;
        if (picked.some(p => Math.abs(p.y - run.y) < 6)) continue;
        picked.push(run);
        let hash = 0;
        for (let n = 0; n < RUN; n++) hash = (Math.imul(hash, 31) + t.px[run.y * t.w + run.x + n]) | 0;
        this.first[t.px[run.y * t.w + run.x]] = 1;
        const list = this.index.get(hash) ?? [];
        list.push({ t, x: run.x, y: run.y }); this.index.set(hash, list);
      }
    }
  }

  /** Exactly one native pose in a bounded footprint. A verified foreground
   * character can cover up to a quarter of a walking pose's opaque pixels.
   * Every other opaque pixel must still match the native palette exactly. */
  match(frame: Uint16Array, foot: PlayerFootprint, foreground?: PlayerForeground): PlayerMatch | undefined {
    this.scannedPixels = 0;
    if (frame.length !== W * H || !Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return;
    const x0 = Math.max(0, Math.floor(foot.x - 16 - RADIUS)), x1 = Math.min(W - RUN, Math.ceil(foot.x + 16 + RADIUS));
    const y0 = Math.max(0, Math.floor(foot.y - 32 - RADIUS)), y1 = Math.min(H - 1, Math.ceil(foot.y + RADIUS));
    const checked = new Set<string>(); let match: PlayerMatch | undefined;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      this.scannedPixels++;
      const i = y * W + x;
      if (!this.first[frame[i]]) continue;
      let hash = 0;
      for (let n = 0; n < RUN; n++) hash = (Math.imul(hash, 31) + frame[i + n]) | 0;
      for (const a of this.index.get(hash) ?? []) {
        const ox = x - a.x, oy = y - a.y, t = a.t;
        if (Math.abs(ox + t.w / 2 - foot.x) > RADIUS || Math.abs(oy + t.h - foot.y) > RADIUS
          || ox < 0 || oy < 0 || ox + t.w > W || oy + t.h > H) continue;
        const key = `${this.templates.indexOf(t)}:${ox}:${oy}`;
        if (checked.has(key)) continue;
        checked.add(key);
        let obscured = 0, valid = true;
        for (let ty = 0; ty < t.h && valid; ty++) for (let tx = 0; tx < t.w; tx++) {
          const expected = t.px[ty * t.w + tx];
          if (expected === 0xffff || frame[(oy + ty) * W + ox + tx] === expected) continue;
          obscured++;
          if (t.kind !== 'walking' || obscured > t.opaque / 4 || !foreground?.(ox + tx, oy + ty, oy + t.h)) {
            valid = false; break;
          }
        }
        if (!valid) continue;
        if (match && (match.x !== ox || match.y !== oy || match.t !== t)) return;
        match = { t, x: ox, y: oy, obscured };
      }
    }
    return match;
  }
}
