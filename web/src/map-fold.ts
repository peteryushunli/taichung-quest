// The arithmetic of folding real Taichung into the game map. `fold` runs from 0 (the real map) to 1 (the
// game map). Positions are fractions of the map frame. Taiwan Blvd lies level on both maps; the fold slides
// its middle from one spot to the other. The real view can also be turned about the frame's middle (north-up).

export interface RealMapData {
  schemaVersion: number;
  /** The real view: its size on the ground, how far it is drawn turned from north-up (degrees), and where the whole
   * picture lies around the frame (left, top, right, bottom as fractions of the frame: it reaches beyond it). */
  sheet: { kmWide: number; kmTall: number; turnedDegrees: number; picture: [number, number, number, number] };
  /** The middle of Taiwan Blvd on each map. */
  anchor: { game: [number, number]; real: [number, number] };
  /** A grid over the game map; for every corner, where it sits on the game map and on the real sheet (x, y pairs). */
  mesh: { columns: number; rows: number; game: number[]; real: number[] };
  /** Taiwan Blvd as the game draws it, edge to edge, and the same stretch on the real sheet (x, y pairs). */
  boulevard: { game: number[]; real: number[] };
  /** Each place's real position; one that really lies beyond the game's ground may fall outside the frame. */
  places: Record<string, [number, number]>;
}

export type MapView = 'real' | 'game';

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
/** Slow in, slow out. */
export const ease = (amount: number) => { const t = clamp01(amount); return t * t * (3 - 2 * t); };
/** 0 before `from`, 1 after `to`, eased in between. */
export const ramp = (from: number, to: number, value: number) => ease((value - from) / (to - from));

/** Where a point sits part-way through the fold. */
export function foldPoint(real: readonly number[], game: readonly number[], fold: number): [number, number] {
  const amount = ease(fold);
  return [lerp(real[0], game[0], amount), lerp(real[1], game[1], amount)];
}

/** Two triangles for every cell of the grid, as corner numbers. */
export function meshTriangles(columns: number, rows: number) {
  const corners: number[] = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let column = 0; column < columns - 1; column++) {
      const corner = row * columns + column;
      corners.push(corner, corner + 1, corner + columns, corner + 1, corner + columns + 1, corner + columns);
    }
  }
  return new Uint16Array(corners);
}

/** Taiwan Blvd part-way through the fold, as SVG polyline points in a box `width` by `height`. */
export function boulevardPoints(data: Pick<RealMapData, 'boulevard'>, fold: number, width: number, height: number) {
  const { real, game } = data.boulevard;
  const amount = ease(fold);
  const points: string[] = [];
  for (let index = 0; index < game.length; index += 2) {
    points.push(`${(lerp(real[index], game[index], amount) * width).toFixed(1)},${(lerp(real[index + 1], game[index + 1], amount) * height).toFixed(1)}`);
  }
  return points.join(' ');
}

/** Pins shrink on the real map, where every place sits inside the smaller patch the game covers. */
export function pinScale(fold: number, onRealMap: number) { return lerp(onRealMap, 1, ease(fold)); }

/** Which of the two maps the frame is nearer to. */
export function nearerView(fold: number): MapView { return fold < .5 ? 'real' : 'game'; }

/** How long a fold from one position to another should take. */
export function foldDuration(from: number, to: number, full = 2600) { return full * Math.abs(to - from); }

/** Nudges pins that would sit on top of each other apart, so each one stays readable. Points are in pixels and
 * `gap` is the least distance to leave between two of them. A held point (a gym) keeps its place and the others
 * make room around it; only two held points that collide move, each by half. No point ends further than `reach` (by default `gap`) from where it belongs. With a
 * `frame`, every point is also kept `inset` pixels inside it, so a pin by the map's edge is drawn whole. */
export function spreadPins(points: readonly (readonly [number, number])[], gap: number, held: readonly boolean[] = [],
  frame?: { width: number; height: number; inset: number }, reach = gap): [number, number][] {
  const inside = (point: [number, number]) => {
    if (!frame) return point;
    point[0] = Math.min(Math.max(point[0], frame.inset), Math.max(frame.inset, frame.width - frame.inset));
    point[1] = Math.min(Math.max(point[1], frame.inset), Math.max(frame.inset, frame.height - frame.inset));
    return point;
  };
  const at = points.map(([x, y]) => inside([x, y]));
  for (let round = 0; round < 80; round += 1) {
    let moved = false;
    for (let a = 0; a < at.length; a += 1) for (let b = a + 1; b < at.length; b += 1) {
      let dx = at[b][0] - at[a][0];
      let dy = at[b][1] - at[a][1];
      let distance = Math.hypot(dx, dy);
      if (distance >= gap - .01) continue;
      const lack = gap - distance;
      // Two pins on the very same spot have no direction between them, so each pair is given one.
      if (distance < .001) { const angle = ((a * 7 + b * 13) % 8) * Math.PI / 4; dx = Math.cos(angle); dy = Math.sin(angle); distance = 1; }
      const push = lack / distance;
      const share = held[a] === held[b] ? .5 : held[a] ? 0 : 1;
      at[a][0] -= dx * push * share; at[a][1] -= dy * push * share;
      at[b][0] += dx * push * (1 - share); at[b][1] += dy * push * (1 - share);
      moved = true;
    }
    at.forEach((point, index) => {
      const dx = point[0] - points[index][0];
      const dy = point[1] - points[index][1];
      const away = Math.hypot(dx, dy);
      if (away > reach) { point[0] = points[index][0] + dx * reach / away; point[1] = points[index][1] + dy * reach / away; }
      inside(point);
    });
    if (!moved) break;
  }
  return at;
}

/** A point of the map frame, turned clockwise by `degrees` about the frame's middle. `shape` is the frame's width
 * over its height, which makes the turn a true rotation on screen and not a skew. */
export function turnPoint(point: readonly number[], degrees: number, shape: number): [number, number] {
  if (!degrees) return [point[0], point[1]];
  const angle = degrees * Math.PI / 180;
  const x = (point[0] - .5) * shape;
  const y = point[1] - .5;
  return [.5 + (x * Math.cos(angle) - y * Math.sin(angle)) / shape, .5 + x * Math.sin(angle) + y * Math.cos(angle)];
}
