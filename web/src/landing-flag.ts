/** The header's waving pixel pennant: a gold flag with a Poké Ball, drawn as SVG pixels. */
const WIDTH = 24;
const HEIGHT = 26;
const CENTER = 10;
const LENGTH = 20;
const colors: Record<string, string> = {
  k: '#263d32', y: '#f4c443', Y: '#d99a2b', r: '#e0503a', w: '#fbf8ee', b: '#8a6a4a', B: '#5e4630',
};
const finial = ['.yy.', 'yyyy', '.yy.'];
const ball = ['..kkk..', '.krrrk.', 'krrrrrk', 'kkkwkkk', 'kwwwwwk', '.kwwwk.', '..kkk..'];

function frame(phase: number) {
  const grid = Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill('.'));
  finial.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel !== '.') grid[y][x] = pixel; }));
  for (let y = 3; y < HEIGHT; y += 1) { grid[y][1] = 'B'; grid[y][2] = 'b'; }
  // The cloth is fixed at the pole and waves more toward its tip.
  const wave = (i: number) => 1.6 * Math.sin(i / 16 * Math.PI * 2 + phase) * (i / LENGTH);
  const cloth = new Set<string>();
  for (let i = 0; i < LENGTH; i += 1) {
    const half = 7.5 * (1 - i / LENGTH);
    const top = Math.round(CENTER + wave(i) - half);
    const bottom = Math.round(CENTER + wave(i) + half);
    for (let y = top; y <= bottom; y += 1) cloth.add(`${i + 3},${y}`);
  }
  for (const key of cloth) {
    const [x, y] = key.split(',').map(Number);
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !cloth.has(`${x + dx},${y + dy}`));
    grid[y][x] = edge ? 'k' : cloth.has(`${x},${y + 2}`) ? 'y' : 'Y';
  }
  const ballTop = Math.round(CENTER + wave(5)) - 3;
  ball.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel !== '.') grid[ballTop + y][x + 5] = pixel; }));
  // One rect per horizontal run of a colour keeps the markup small.
  return grid.map((row, y) => {
    let out = '';
    for (let x = 0; x < WIDTH;) {
      const pixel = row[x];
      let end = x + 1;
      while (end < WIDTH && row[end] === pixel) end += 1;
      if (pixel !== '.') out += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${colors[pixel]}"/>`;
      x = end;
    }
    return out;
  }).join('');
}

export const pixelFlag = `<svg class="lp-flag" viewBox="0 0 ${WIDTH} ${HEIGHT}" shape-rendering="crispEdges" aria-hidden="true">${
  [0, 1, 2].map((step) => `<g class="lp-flag-frame">${frame(step / 3 * Math.PI * 2)}</g>`).join('')
}</svg>`;
