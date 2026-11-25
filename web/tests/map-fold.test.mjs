import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { boulevardPoints, ease, foldDuration, foldPoint, meshTriangles, nearerView, pinScale, ramp } from '../src/map-fold.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const fold = JSON.parse(read('../src/data/real-map.json'));
const city = JSON.parse(read('../src/data/boulevard-preview.json'));
const pairs = (flat) => Array.from({ length: flat.length / 2 }, (_, index) => [flat[index * 2], flat[index * 2 + 1]]);

test('the fold starts on the real map and ends on the game map', () => {
  assert.deepEqual(foldPoint([.25, .125], [.75, .875], 0), [.25, .125]);
  assert.deepEqual(foldPoint([.25, .125], [.75, .875], 1), [.75, .875]);
  assert.deepEqual(foldPoint([.25, .125], [.75, .875], .5), [.5, .5], 'half-way is half-way');
  assert.equal(ease(-1), 0);
  assert.equal(ease(2), 1);
  assert.equal(ramp(.5, 1, .25), 0);
  assert.equal(ramp(.5, 1, 1.5), 1);
  assert.equal(nearerView(.49), 'real');
  assert.equal(nearerView(.5), 'game');
  assert.equal(pinScale(0, .5), .5);
  assert.equal(pinScale(1, .5), 1);
  assert.equal(foldDuration(0, 1), 2600);
  assert.equal(foldDuration(.75, 1), 650, 'a fold picked up part-way takes its share of the time');
});

test('Taiwan Blvd is the anchor: its middle is the same point on both maps', () => {
  const band = city.world.streetBands.find((street) => street.name.en === 'Taiwan Boulevard');
  const row = (band.bounds[1] + band.bounds[3]) / 2;
  assert.deepEqual(fold.anchor, [.5, Number((row / city.world.height).toFixed(5))]);
  const game = pairs(fold.boulevard.game);
  const real = pairs(fold.boulevard.real);
  assert.equal(game.length, real.length);
  const middle = (game.length - 1) / 2;
  assert.deepEqual(game[middle], fold.anchor);
  assert.ok(Math.abs(real[middle][0] - fold.anchor[0]) < .003 && Math.abs(real[middle][1] - fold.anchor[1]) < .003, 'the real boulevard passes through the anchor');
  // On the game map the boulevard is one straight row from edge to edge; on the real one it stays close to that row.
  assert.ok(game.every(([, y]) => y === fold.anchor[1]));
  assert.equal(game[0][0], 0);
  assert.equal(game.at(-1)[0], 1);
  assert.ok(real.every(([, y]) => Math.abs(y - fold.anchor[1]) < .03), 'the real boulevard runs flat across the sheet');
  assert.ok(real.every(([x], index) => index === 0 || x > real[index - 1][0]), 'and runs the same way as in the game');
  const settled = boulevardPoints(fold, 1, 1000, 725).split(' ');
  assert.equal(settled.length, game.length);
  assert.equal(settled[0], `0.0,${(fold.anchor[1] * 725).toFixed(1)}`);
});

test('the grid covers the whole game map and never folds over itself on the real one', () => {
  const { columns, rows } = fold.mesh;
  const game = pairs(fold.mesh.game);
  const real = pairs(fold.mesh.real);
  assert.equal(game.length, columns * rows);
  assert.equal(real.length, columns * rows);
  assert.deepEqual(game[0], [0, 0]);
  assert.deepEqual(game.at(-1), [1, 1]);
  const triangles = meshTriangles(columns, rows);
  assert.equal(triangles.length, (columns - 1) * (rows - 1) * 6);
  const area = (points, a, b, c) => (points[b][0] - points[a][0]) * (points[c][1] - points[a][1]) - (points[c][0] - points[a][0]) * (points[b][1] - points[a][1]);
  for (let index = 0; index < triangles.length; index += 3) {
    const [a, b, c] = triangles.subarray(index, index + 3);
    assert.ok(area(game, a, b, c) > 0, 'every triangle faces the same way on the game map');
    assert.ok(area(real, a, b, c) > 0, 'and still does on the real map: the bend has no creases');
  }
  // The real sheet shows more city than the game covers, so the game's ground sits inside it.
  assert.ok(real.every(([x, y]) => x > 0 && x < 1 && y > 0 && y < 1));
});

test('every place on the landing map has a real position on the sheet', () => {
  const landmarks = JSON.parse(read('../src/data/landmarks.json'));
  const sights = JSON.parse(read('../src/data/sights.json'));
  for (const { id } of [...landmarks, ...sights, ...city.extraSights]) {
    const at = fold.places[id];
    assert.ok(at, `${id} has a real position`);
    assert.ok(at[0] > 0 && at[0] < 1 && at[1] > 0 && at[1] < 1, `${id} is on the sheet`);
  }
  assert.equal(fold.places['guest-house'], undefined, 'the guest house is not a real place');
});

test('the real view ships with its picture, its credit and both languages', () => {
  assert.ok(existsSync(new URL('../src/assets/boulevard/real.webp', import.meta.url)));
  assert.ok(fold.sheet.kmWide > 10 && fold.sheet.kmTall > 8);
  const landing = read('../src/landing.ts');
  const translations = read('../src/i18n.ts');
  for (const text of ['Real Taichung', 'In the game', 'Which map to show', 'Taiwan Blvd', 'Real map © OpenStreetMap contributors', 'See how it plays ↓', '01 — THE LANDMARKS', '02 — HOW IT PLAYS']) {
    assert.ok(landing.includes(`'${text}'`), `${text} is on the page`);
    assert.ok(translations.includes(`'${text}': '`), `${text} has a Chinese line`);
  }
  for (const name of ['LEAD_HEADING', 'LEAD_TEXT', 'REAL_MAP_CAPTION', 'GAME_MAP_CAPTION', 'HOW_HEADING', 'HOW_TEXT']) {
    const text = landing.match(new RegExp(`const ${name} = (['"])(.*)\\1;`))[2];
    assert.ok(translations.includes(`'${text.replaceAll("'", "\\'")}': '`), `${name} has a Chinese line`);
  }
  assert.ok(read('../public/licenses/index.html').includes('OpenStreetMap'));
  // The page sells the city and wears no status labels.
  for (const label of ['GYM OPEN', 'IN DEVELOPMENT', "'LANDMARK'", 'lp-facts']) assert.ok(!landing.includes(label), `${label} is gone from the page`);
  assert.ok(landing.indexOf('id="map"') < landing.indexOf('id="gyms"') && landing.indexOf('id="gyms"') < landing.indexOf('id="how"'), 'the map leads the page');
  assert.ok(landing.indexOf('lp-casing') > landing.indexOf('id="how"'), 'the Game Boy reel sits in How it plays');
  // The picture and its drawing code are fetched apart from the page itself.
  assert.ok(landing.includes("import('./real-map')") && !/import .* from '\.\/real-map'/.test(landing));
});
