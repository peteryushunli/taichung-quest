// The arithmetic of folding real Taichung into the game map. `fold` runs from 0 (the real map) to 1 (the
// game map). Positions are fractions of the map frame. Taiwan Blvd's middle is the same point at both ends,
// so the boulevard holds still and the city folds in around it.

export interface RealMapData {
  schemaVersion: number;
  sheet: { kmWide: number; kmTall: number; turnedDegrees: number };
  /** The middle of the game's Taiwan Blvd: the one point that does not move. */
  anchor: [number, number];
  /** A grid over the game map; for every corner, where it sits on the game map and on the real sheet (x, y pairs). */
  mesh: { columns: number; rows: number; game: number[]; real: number[] };
  /** Taiwan Blvd as the game draws it, edge to edge, and the same stretch on the real sheet (x, y pairs). */
  boulevard: { game: number[]; real: number[] };
  /** Each place's real position on the sheet. */
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
