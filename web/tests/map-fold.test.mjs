import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { boulevardPoints, ease, foldDuration, foldPoint, meshTriangles, nearerView, pinScale, ramp, spreadPins, turnPoint } from '../src/map-fold.ts';

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

test('Taiwan Blvd lies level on both maps, and the fold slides its middle from one to the other', () => {
  const band = city.world.streetBands.find((street) => street.name.en === 'Taiwan Boulevard');
  const row = (band.bounds[1] + band.bounds[3]) / 2;
  assert.deepEqual(fold.anchor.game, [.5, Number((row / city.world.height).toFixed(5))]);
  const game = pairs(fold.boulevard.game);
  const real = pairs(fold.boulevard.real);
  assert.equal(game.length, real.length);
  const middle = (game.length - 1) / 2;
  assert.deepEqual(game[middle], fold.anchor.game);
  assert.deepEqual(real[middle], fold.anchor.real);
  // On the game map the boulevard is one straight row from edge to edge; on the real one it stays close to a row.
  assert.ok(game.every(([, y]) => y === fold.anchor.game[1]));
  assert.equal(game[0][0], 0);
  assert.equal(game.at(-1)[0], 1);
  assert.ok(real.every(([, y]) => Math.abs(y - fold.anchor.real[1]) < .05), 'the real boulevard runs flat across the view');
  assert.ok(real.every(([x], index) => index === 0 || x > real[index - 1][0]), 'and runs the same way as in the game');
  const settled = boulevardPoints(fold, 1, 1000, 725).split(' ');
  assert.equal(settled.length, game.length);
  assert.equal(settled[0], `0.0,${(fold.anchor.game[1] * 725).toFixed(1)}`);
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
  // The real view is framed on the game's ground: all of it shows, and it fills most of the frame's height.
  assert.ok(real.every(([x, y]) => x > 0 && x < 1 && y > 0 && y < 1));
  const down = real.map(([, y]) => y);
  assert.ok(Math.max(...down) - Math.min(...down) > .85, 'the game\'s ground fills the real view');
});

test('every place on the landing map has a real position on the sheet', () => {
  const landmarks = JSON.parse(read('../src/data/landmarks.json'));
  const sights = JSON.parse(read('../src/data/sights.json'));
  for (const { id } of [...landmarks, ...sights, ...city.extraSights]) {
    const at = fold.places[id];
    assert.ok(at, `${id} has a real position`);
    // A place that really lies beyond the game's ground may be outside the frame, but never off the picture.
    const [left, top, right, bottom] = fold.sheet.picture;
    assert.ok(at[0] > left && at[0] < right && at[1] > top && at[1] < bottom, `${id} is on the picture`);
  }
  assert.equal(fold.places['guest-house'], undefined, 'the guest house is not a real place');
});

test('the real view ships with its picture, its credit and both languages', () => {
  assert.ok(existsSync(new URL('../src/assets/boulevard/real.webp', import.meta.url)));
  assert.ok(fold.sheet.kmWide > 10 && fold.sheet.kmTall > 8);
  const landing = read('../src/landing.ts');
  const translations = read('../src/i18n.ts');
  for (const text of ['Real Taichung', 'In the game', 'Which map to show', 'Taiwan Blvd', 'Taichung', 'North up', 'Real map © OpenStreetMap contributors', 'See how it plays ↓', '01 — THE LANDMARKS', '02 — HOW IT PLAYS']) {
    assert.ok(landing.includes(`'${text}'`), `${text} is on the page`);
    assert.ok(translations.includes(`'${text}': '`), `${text} has a Chinese line`);
  }
  for (const name of ['LEAD_HEADING', 'LEAD_TEXT', 'REAL_MAP_CAPTION', 'GAME_MAP_CAPTION', 'PLACES_HEADING', 'PLACES_TEXT', 'HOW_HEADING', 'HOW_TEXT']) {
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

test('crowded pins are nudged apart, and gyms hold their place', () => {
  const far = [[10, 10], [200, 80]];
  assert.deepEqual(spreadPins(far, 30), far, 'pins with room between them stay put');
  const crowd = [[100, 100], [104, 100], [100, 103], [100, 100]];
  const held = [true, false, false, false];
  const apart = spreadPins(crowd, 30, held);
  assert.deepEqual(apart[0], crowd[0], 'the gym does not move');
  for (let a = 0; a < apart.length; a += 1) {
    assert.ok(Math.hypot(apart[a][0] - crowd[a][0], apart[a][1] - crowd[a][1]) <= 30.001, 'no pin leaves its neighbourhood');
    for (let b = a + 1; b < apart.length; b += 1) {
      assert.ok(Math.hypot(apart[a][0] - apart[b][0], apart[a][1] - apart[b][1]) > 20, `pins ${a} and ${b} no longer cover each other`);
    }
  }
  const gyms = spreadPins([[50, 50], [60, 50], [200, 50]], 30, [true, true, true]);
  assert.ok(gyms[1][0] - gyms[0][0] >= 29.9 && gyms[2][0] === 200, 'two gyms that collide share the move; a gym with room stays');
  const edge = spreadPins([[3, 50], [5, 52], [318, 236]], 24, [true, false, false], { width: 320, height: 240, inset: 15 });
  for (const [x, y] of edge) assert.ok(x >= 15 && x <= 305 && y >= 15 && y <= 225, 'a pin by the edge is drawn whole inside the frame');
  assert.ok(Math.hypot(edge[0][0] - edge[1][0], edge[0][1] - edge[1][1]) > 16, 'and still clear of its neighbour');
});

test('every landmark pin has the Pokémon the game keeps there', () => {
  const patch = read('../../patches/taichung.patch').split('\n');
  const start = patch.findIndex((line) => line.startsWith('diff --git') && line.includes('data/taichung/encounters/sites.json'));
  const body = [];
  for (const line of patch.slice(start + 1)) {
    if (line.startsWith('diff --git')) break;
    if (line.startsWith('+') && !line.startsWith('+++')) body.push(line.slice(1));
  }
  const registry = JSON.parse(body.join('\n'));
  const { species } = JSON.parse(read('../src/data/capture-species.json'));
  assert.deepEqual(species, [...registry.sites].sort((a, b) => a.stableSiteId - b.stableSiteId)
    .map((site) => site.species?.toLowerCase() ?? null));
  assert.equal(species[0], 'lapras');
  assert.equal(species[27], null);
  assert.equal(species[city.markersById['yuanbao-temple'].captureBit], 'chansey');
  const translations = read('../src/i18n.ts');
  const landmarks = Object.values(city.markersById).filter((marker) => marker.captureBit !== undefined);
  assert.ok(!landmarks.some((marker) => marker.captureBit === 0));
  assert.equal(new Set(landmarks.map((marker) => marker.captureBit)).size, landmarks.length, 'no two landmarks share a Pokémon');
  for (const marker of landmarks) {
    const slug = species[marker.captureBit];
    assert.ok(slug, `${marker.id} points to an active capture slot`);
    assert.ok(existsSync(new URL(`../src/assets/pokemon/icon/${slug}.png`, import.meta.url)), `${marker.id} has the ${slug} icon`);
    assert.ok(translations.includes(`'${slug[0].toUpperCase()}${slug.slice(1)}': '`), `${slug} has a Chinese name`);
  }
  // The map carries no place names or numbers: a Pokémon or a gym front marks each place.
  const landing = read('../src/landing.ts');
  assert.ok(landing.includes("${icon || number(index)}") && read('../src/landing.css').includes('.lp-pin-icon > .lp-pin-label { display: none; }'));
});

test('the paired real map has geographic points for every public game pin', () => {
  assert.equal(fold.source.cityGeometryFingerprintSha256, city.geometryFingerprintSha256);
  assert.deepEqual(Object.keys(fold.places).sort(), Object.keys(city.markersById).filter(id => id !== 'guest-house').sort());
  assert.deepEqual(fold.places['yuanbao-temple'], [0.59431, 0.35798]);
  assert.deepEqual(fold.places['taichung-park'], [0.7473, 0.50239]);
  assert.equal(fold.places['taichung-park-lakeshore'], undefined);
  assert.equal(fold.sheet.kmWide, 11.85);
});

test('the real view can be turned north-up without running out of picture', () => {
  const shape = 353 / 256;
  const turn = fold.sheet.turnedDegrees;
  assert.deepEqual(turnPoint([.25, .75], 0, shape), [.25, .75]);
  assert.deepEqual(turnPoint([.5, .5], turn, shape), [.5, .5], 'the frame turns about its middle');
  // North on the sheet as drawn points up and to the left by the sheet's angle; turned, it points straight up.
  const north = [.5 + Math.sin(-turn * Math.PI / 180) * .2 / shape, .5 - Math.cos(-turn * Math.PI / 180) * .2];
  const up = turnPoint(north, turn, shape);
  assert.ok(Math.abs(up[0] - .5) < 1e-9 && Math.abs(up[1] - .3) < 1e-9);
  // Every corner of the frame, traced back onto the sheet, still lands on the picture.
  const [left, top, right, bottom] = fold.sheet.picture;
  assert.ok(left < 0 && top < 0 && right > 1 && bottom > 1, 'the picture reaches beyond the frame on every side');
  for (const corner of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const [x, y] = turnPoint(corner, -turn, shape);
    assert.ok(x >= left && x <= right && y >= top && y <= bottom, `the frame's corner ${corner} is covered when turned`);
  }
  // The compass is a button, and the city is named beside it.
  const landing = read('../src/landing.ts');
  assert.ok(landing.includes('<button type="button" class="lp-map-north"') && landing.includes("copy('Taichung')"));
});

