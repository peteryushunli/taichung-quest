export type NeighborhoodName = { en: string; zh: string };
export type Neighborhood = { name: NeighborhoodName; tile: number[] };

/** Older exports abbreviate these two districts. Keep existing ROM geometry
 * paired while also accepting the exporter's expanded names. */
export function neighborhoodName(name: NeighborhoodName): NeighborhoodName {
  return { en: name.en === 'North' ? 'North District' : name.en === 'West' ? 'West District' : name.en, zh: name.zh };
}
export function neighborhoodLabels(world: { neighborhoods?: Neighborhood[] }) {
  return (world.neighborhoods ?? []).map(({ name, tile }) => ({ name: neighborhoodName(name), tile }));
}
export function bilingualNeighborhood(name: NeighborhoodName) {
  const expanded = neighborhoodName(name);
  return `${expanded.en} ${expanded.zh}`;
}

export type LabelBox = { x: number; y: number; width: number; height: number };
export function boxesOverlap(a: LabelBox, b: LabelBox, gap = 2) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

/** Move text only, within its map. Anchors, map dimensions and marker positions
 * stay fixed. When a cropped radar has no safe room, omit that label. */
export function placeNeighborhoodLabels(width: number, height: number, labels: LabelBox[], obstacles: LabelBox[], maxMove: number, step = 6, gap = 2) {
  const occupied = [...obstacles];
  const offsets: [number, number][] = [];
  for (let dy = -Math.floor(maxMove / step); dy <= Math.floor(maxMove / step); dy++) {
    for (let dx = -Math.floor(maxMove / step); dx <= Math.floor(maxMove / step); dx++) offsets.push([dx * step, dy * step]);
  }
  offsets.sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2 || a[1] - b[1] || a[0] - b[0]);
  const result: (LabelBox | undefined)[] = new Array(labels.length);
  // Reserve room for longer district names before fitting short neighborhood names.
  for (const { label, index } of labels.map((label, index) => ({ label, index })).sort((a, b) => b.label.width - a.label.width)) {
    if (label.width > width - 2 || label.height > height - 2) continue;
    const origin = { ...label, x: Math.max(1, Math.min(width - label.width - 1, label.x)), y: Math.max(1, Math.min(height - label.height - 1, label.y)) };
    let found: LabelBox | undefined;
    for (const [dx, dy] of offsets) {
      const box = { ...origin, x: origin.x + dx, y: origin.y + dy };
      if (box.x < 1 || box.y < 1 || box.x + box.width > width - 1 || box.y + box.height > height - 1 || occupied.some(other => boxesOverlap(box, other, gap))) continue;
      found = box; break;
    }
    if (found) occupied.push(found);
    result[index] = found;
  }
  return result;
}
