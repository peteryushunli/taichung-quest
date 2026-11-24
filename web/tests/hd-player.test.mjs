import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parsePlayerTemplates, PlayerMatcher } from '../src/hd-player.ts';
const read = name => readFileSync(new URL(`../public/hd/player/${name}`, import.meta.url));
const pack = JSON.parse(read('player.json'));
const provenance = JSON.parse(read('provenance.json'));
const atlas = read('atlas.png');
const width = atlas.readUInt32BE(16), height = atlas.readUInt32BE(20);
const templates = parsePlayerTemplates(pack, width, height);
const matcher = () => new PlayerMatcher(templates);
function draw(frame, t, x, y) { for (let ty = 0; ty < t.h; ty++) for (let tx = 0; tx < t.w; tx++) {
  const v = t.px[ty * t.w + tx]; if (v !== 0xffff) frame[(y + ty) * 240 + x + tx] = v;
} }
const background = () => new Uint16Array(240 * 160).fill(0x1234);

test('approved29 source poses plus native east mirrors stay genuinely2x, original palette and byte-exact', () => {
  assert.equal(templates.length, 38); assert.equal(pack.scale, 2); assert.deepEqual(provenance.counts, {walking:9,running:11,cycling:9});
  assert.deepEqual([width,height], provenance.atlasSize); assert.equal(provenance.opaquePaletteColors, 15);
  assert.equal(createHash('sha256').update(atlas).digest('hex'), provenance.atlasSha256);
  assert.equal(createHash('sha256').update(read('player.json')).digest('hex'), provenance.packSha256);
  for (const [file,sha] of Object.entries(provenance.nativeSourceInputsSha256)) assert.equal(createHash('sha256').update(readFileSync(new URL(`../src/assets/player-crisp-2x/source/${file}`,import.meta.url))).digest('hex'),sha);
  for (const change of [{scale:4},{sprites:pack.sprites.slice(1)},{style:'source-detail'},
    {sprites:pack.sprites.map((s,i)=>i===0?{...s,atlasX:width}:s)},
    {sprites:pack.sprites.map((s,i)=>i===0?{...s,pixels:''}:s)}]) assert.equal(parsePlayerTemplates({...pack,...change},width,height),undefined);
});

test('all native walking/running/head-turn/cycling poses match at exact live pixel offsets, without a new clock', () => {
  const m=matcher();
  templates.forEach((t,index) => {
    const frame=background(), x=120-t.w/2+(index%3-1)*9,y=48+(index%5-2)*3;
    draw(frame,t,x,y);
    const before=frame.slice(), found=m.match(frame,{x:120,y:80});
    assert.ok(found,`${t.kind}:${t.frame}:${t.east}`); assert.equal(found.x,x);assert.equal(found.y,y);assert.deepEqual(found.t.px,t.px);
    assert.deepEqual(frame,before,'read-only matching');assert.ok(m.scannedPixels<=6561,'one bounded footprint, not a full-frame player scan');
  });
});

test('coverage, fades, foreign palette, off-footprint copies and two live candidates fall back immediately', () => {
  const m=matcher(),t=templates[0],frame=background();draw(frame,t,112,48);assert.ok(m.match(frame,{x:120,y:80}));
  for(let y=64;y<80;y++)frame.fill(0x2222,y*240+112,y*240+128);
  assert.equal(m.match(frame,{x:120,y:80}),undefined,'covered lower half never repaints a cached full body');
  const faded=background();draw(faded,t,112,48);for(let i=0;i<faded.length;i++)faded[i]^=0x0400;
  assert.equal(m.match(faded,{x:120,y:80}),undefined,'native palette fade');
  const far=background();draw(far,t,10,10);assert.equal(m.match(far,{x:120,y:80}),undefined);
  const ambiguous=background();draw(ambiguous,t,104,48);draw(ambiguous,t,128,48);assert.equal(m.match(ambiguous,{x:124,y:80}),undefined);
  assert.equal(m.match(background(),{x:120,y:80}),undefined,'scene/menu transition clears match');
  const current=background();draw(current,templates[10],108,52);const found=m.match(current,{x:120,y:80});assert.ok(found);assert.deepEqual(found.t.px,templates[10].px);
});
