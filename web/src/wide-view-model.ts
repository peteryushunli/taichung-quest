import type { WorldPixels } from './rom-maps';

/** Pure parts of the wide view: the saved choice, the screen geometry and
 * matching a live frame against the cartridge's map pixels. */

export const VIEW_PREFERENCE = 'taichung-quest-view';
export const VIEW_MODES = ['classic', 'a', 'b', 'c'] as const;
export type ViewMode = typeof VIEW_MODES[number];
export const ZOOM: Record<ViewMode, number> = { classic: 1, a: 1, b: .75, c: .5 };
export const GBA_W = 240, GBA_H = 160;
/** Surround drawn per side, in metatiles. The camera can sit about 7.5 tiles
 * past a map edge, so the visible margin is capped below the drawn margin. */
export const PAD = 32;
const MAX_MARGIN = (PAD - 8) * 16;
/** Tracking follows the last lock; a slow device can skip a few frames. */
export const TRACK_RADIUS = 16, ACQUIRE_RADIUS = 28;
/** A clear view matches almost every sample. Below this, repeating road and
 * roof patterns can match a few tiles off, so the position packet is checked. */
export const GOOD_MATCH = .9;
/** Field dialogue covers about a third of the picture; sprites cover more. */
export const MIN_MATCH = .45;
export const LOST_FRAMES = 8;
export const FOCUS_DELAY_MS = 450;

export function isViewMode(value: unknown): value is ViewMode { return VIEW_MODES.includes(value as ViewMode); }

/** A `?view=` link wins and is remembered; otherwise the saved choice; otherwise
 * phones fill their spare height (A) and larger screens step back (B). */
export function readViewPreference(search: string, storage: Pick<Storage, 'getItem' | 'setItem'> | undefined, coarsePointer: boolean): ViewMode {
  const requested = new URLSearchParams(search).get('view');
  if (isViewMode(requested)) { try { storage?.setItem(VIEW_PREFERENCE, requested); } catch { /* still applies to this visit */ } return requested; }
  let saved: string | null = null;
  try { saved = storage?.getItem(VIEW_PREFERENCE) ?? null; } catch { /* storage can be unavailable */ }
  return isViewMode(saved) ? saved : coarsePointer ? 'a' : 'b';
}

/** `fit` is today's contain scale for this box; the wide view uses `zoom` of it. */
export function wideGeometry(boxWidth: number, boxHeight: number, zoom: number) {
  const fit = Math.max(.25, Math.min(boxWidth / GBA_W, boxHeight / GBA_H));
  const scale = Math.max(fit * zoom, boxWidth / (GBA_W + MAX_MARGIN * 2), boxHeight / (GBA_H + MAX_MARGIN * 2));
  const marginX = Math.max(0, Math.ceil((boxWidth / scale - GBA_W) / 2));
  const marginY = Math.max(0, Math.ceil((boxHeight / scale - GBA_H) / 2));
  return { fit, scale, marginX, marginY, cols: GBA_W + marginX * 2, rows: GBA_H + marginY * 2 };
}

/** Frame sample indices on an 8px lattice, skipping the player sprite. */
export function samplePoints() {
  const points: number[] = [];
  for (let y = 3; y < GBA_H; y += 8) for (let x = 3; x < GBA_W; x += 8) {
    if (x >= 100 && x < 140 && y >= 44 && y < 100) continue;
    points.push(y * GBA_W + x);
  }
  return Int32Array.from(points);
}

const offsetsByRadius = new Map<number, Int32Array>();
/** Window offsets nearest-first, so equal scores keep the closest position. */
function windowOffsets(radius: number) {
  let list = offsetsByRadius.get(radius);
  if (!list) {
    const pairs: Array<[number, number]> = [];
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) pairs.push([dx, dy]);
    pairs.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
    list = Int32Array.from(pairs.flat());
    offsetsByRadius.set(radius, list);
  }
  return list;
}

/** Find where the live frame sits in the world image near a guess. Returns the
 * frame's top-left in world pixels and the share of samples that matched. */
export function registerFrame(frame: Uint32Array, world: Pick<WorldPixels, 'pixels' | 'width' | 'height'>, guessX: number, guessY: number, radius: number, samples: Int32Array) {
  const offsets = windowOffsets(radius);
  const { pixels, width } = world;
  const maxX = world.width - GBA_W, maxY = world.height - GBA_H;
  const total = samples.length;
  let best = -1, bestX = 0, bestY = 0;
  for (let i = 0; i < offsets.length; i += 2) {
    const x = guessX + offsets[i], y = guessY + offsets[i + 1];
    if (x < 0 || y < 0 || x > maxX || y > maxY) continue;
    const origin = y * width + x;
    let misses = 0;
    const allowed = total - best;
    for (let s = 0; s < total; s++) {
      const index = samples[s];
      const fy = (index / GBA_W) | 0, fx = index - fy * GBA_W;
      if (((frame[index] ^ pixels[origin + fy * width + fx]) & 0xffffff) !== 0 && ++misses >= allowed) break;
    }
    const matches = total - misses;
    if (matches > best) { best = matches; bestX = x; bestY = y; if (matches === total) break; }
  }
  return best < 0 ? undefined : { x: bestX, y: bestY, match: best / total };
}
