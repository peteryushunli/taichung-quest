import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homeWorldInGeometry, placeWorldInGeometry, placedAnchorsInGeometry, streetsInGeometry, visitorLocationInGeometry } from '../src/city-geometry.ts';
import { projectNavigation, projectTutorial, radarPosition } from '../src/minimap-model.ts';
import { currentStreet } from '../src/street-label-model.ts';
import { visitorMapUrl } from '../src/landing-model.ts';
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const geometry = read('../src/data/minimap-contract.json');
const catalog = [...read('../src/data/landmarks.json'), ...read('../src/data/sights.json')];
const expected = {
  'old-taichung-station': ['43:0',333,96], 'taichung-park': ['43:18',330,58], miyahara: ['43:0',324,114],
  'natural-science-museum': ['43:23',258,64], 'calligraphy-greenway': ['43:1',258,104], 'shen-ji-new-village': ['43:1',246,123],
  'fine-arts-museum': ['43:1',265,130], 'fengjia-night-market': ['43:22',160,40], 'maple-garden': ['43:2',138,100],
  'taichung-theater': ['43:2',168,112], 'prefectural-hall': ['43:0',303,134], 'botanical-garden': ['43:23',258,38],
  'wenxin-forest-park': ['43:1',222,132], 'wanhe-temple': ['43:15',232,184], 'wenchang-temple': ['43:15',220,184],
  'cultural-heritage-park': ['43:26',342,173], 'fengle-sculpture-park': ['43:15',242,207],
  'confucius-temple': ['43:18',339,20], 'yizhong-street': ['43:18',325,38], 'second-market': ['43:0',305,96],
};
const reserved = ['luce-chapel', 'rainbow-village', 'city-hall', 'jingming-street'];
function packet(key, x, y, g=geometry, indoor=false) {
  const map=g.mapsByNativeKey[key], [mapGroup,mapNumber]=key.split(':').map(Number);
  return {sequence:2,frame:1,flags:indoor?23:79,x,y,mapGroup,mapNumber,mapType:indoor?8:1,width:map.width,height:map.height,facing:2,contextFlags:0};
}
function at(x,y,g=geometry) {
  const [key,map]=Object.entries(g.mapsByNativeKey).find(([,m])=>m.kind==='exterior' && x>=m.worldOrigin[0] && y>=m.worldOrigin[1] && x<m.worldOrigin[0]+m.width && y<m.worldOrigin[1]+m.height);
  return packet(key,x-map.worldOrigin[0],y-map.worldOrigin[1],g);
}
const street = (x,y,g=geometry) => currentStreet({phase:'live',snapshot:at(x,y,g)},g);

test('the immutable horizontal export retains its native bytes, twenty placed anchors and twelve true warp markers', () => {
  const raw=readFileSync(new URL('../src/data/minimap-contract.json',import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'),'e85324df545afae24bf3cec44c61789fc216b41e06e2ab8d7402db993660abe3');
  assert.equal(geometry.geometryFingerprintSha256,'61734270b5b95656fff77fea5feb864c401c247fe658040c841d670a3ddc3e37');
  assert.deepEqual([geometry.world.width,geometry.world.height],[352,216]);
  assert.equal(geometry.coordinateSystem.northUp,false);
  assert.equal(Object.keys(geometry.placesById).length,24);
  assert.equal(Object.keys(geometry.markersById).length,12);
  const anchors=placedAnchorsInGeometry(geometry);
  assert.equal(anchors.length,20);
  assert.deepEqual(new Set(anchors.map(p=>p.id)),new Set(Object.keys(expected)));
  assert.deepEqual(new Set(catalog.map(p=>p.id)),new Set(Object.keys(expected)));
  for (const [id,[key,x,y]] of Object.entries(expected)) {
    const place=catalog.find(p=>p.id===id);
    assert.deepEqual(placeWorldInGeometry({...place,world:[1,1]},geometry),[x,y],id);
    assert.equal(geometry.placesById[id].nativeKey,key,id);
    const p=projectNavigation(at(x,y),geometry);
    assert.deepEqual([p.worldX,p.worldY,p.landmarkId],[x,y,id],id);
  }
  for(const p of catalog.filter(p=>p.kind==='sight')) assert.equal(geometry.markersById[p.id],undefined,p.id);
});

test('all 76,032 exterior tiles project to current world space, with all twenty anchors eligible for nearest', () => {
  const anchors=placedAnchorsInGeometry(geometry);let checked=0;
  for(const [key,map] of Object.entries(geometry.mapsByNativeKey).filter(([,m])=>m.kind==='exterior')) {
    const own=anchors.filter(p=>p.exteriorNativeKey===key), candidates=own.length?own:anchors;
    for(let y=0;y<map.height;y++) for(let x=0;x<map.width;x++) {
      const p=projectNavigation(packet(key,x,y),geometry), wx=map.worldOrigin[0]+x,wy=map.worldOrigin[1]+y;
      assert.deepEqual([p.worldX,p.worldY],[wx,wy]);
      const chosen=anchors.find(a=>a.id===p.landmarkId),distance=a=>(a.world[0]-wx)**2+(a.world[1]-wy)**2;
      assert.ok(candidates.includes(chosen));
      assert.equal(distance(chosen),Math.min(...candidates.map(distance)));
      checked++;
    }
  }
  assert.equal(checked,76032);
});

test('every tile along all 34 directed seams projects continuously through the twelve exteriors', () => {
  let checked=0;const touched=new Set();
  for(const seam of geometry.seams) {
    for(let n=0;n<seam.overlappingEdgeTiles;n++) {
      const first=seam.first,last=seam.last;
      const local=(side)=>first[side].map((v,i)=>v+(last[side][i]===v?0:n));
      const a=projectNavigation(packet(seam.fromNativeKey,...local('fromLocal')),geometry);
      const b=projectNavigation(packet(seam.toNativeKey,...local('toLocal')),geometry);
      assert.equal(Math.abs(a.worldX-b.worldX)+Math.abs(a.worldY-b.worldY),1,JSON.stringify(seam));
      touched.add(seam.fromNativeKey);touched.add(seam.toNativeKey);checked++;
    }
  }
  assert.equal(geometry.seams.length,34);assert.equal(touched.size,12);assert.equal(checked,2704);
});

test('all fifteen current interior contexts project to explicit exterior entrances and hide radar', () => {
  let checked=0;
  for(const [key,map] of Object.entries(geometry.mapsByNativeKey).filter(([,m])=>m.kind==='interior')) {
    for(const [x,y] of [[0,0],[map.width-1,map.height-1]]) {
      const p=projectNavigation(packet(key,x,y,geometry,true),geometry);
      assert.deepEqual([p.worldX,p.worldY],map.parentEntranceWorld,key);
      assert.equal(p.landmarkId,map.parentMarkerId ?? 'guest-house',key);
      assert.equal(radarPosition(p),undefined,key);
    }
    checked++;
  }
  assert.equal(checked,15);
});

test('both guest-house floors use the residence door and hide the radar, never their indoor XY or a gym marker', () => {
  assert.deepEqual(homeWorldInGeometry(geometry),[312,114]);
  for(const key of ['43:19','43:20']) {
    const map=geometry.mapsByNativeKey[key];
    assert.equal(map.parentMarkerId,null);assert.equal(map.parentPlaceId,'guest-house');
    for(const [x,y] of [[0,0],[map.width-1,map.height-1]]) {
      const p=projectNavigation(packet(key,x,y,geometry,true),geometry);
      assert.deepEqual([p.worldX,p.worldY,p.landmarkId],[312,114,'guest-house']);
      assert.equal(p.indoorLabel.zh,'旅宿');assert.equal(radarPosition(p),undefined);
    }
  }
  const p=projectTutorial({phase:6,flags:5,mapGroup:43,mapNumber:0,x:30,y:45},geometry);
  assert.deepEqual([p.worldX,p.worldY],[310,117]);
  for(const edit of [g=>g.residence.localDoor=[33,42],g=>g.residence.nativeKey='43:1',g=>g.mapsByNativeKey['43:19'].parentEntranceWorld=[313,114],g=>g.mapsByNativeKey['43:19'].parentPlaceId='station']) {
    const g=structuredClone(geometry);edit(g);assert.equal(projectNavigation(packet('43:19',1,1,g,true),g),undefined);
  }
});

test('every exported road region names its own cells, with explicit priority and ties hidden at real intersections', () => {
  assert.equal(streetsInGeometry(geometry).length,19);
  // Test every source region cell against an independent highest-priority selection.
  for(const road of geometry.roads) for(const {rect:[x0,y0,x1,y1]} of road.regions) for(let x=x0;x<x1;x++) for(let y=y0;y<y1;y++) {
    const matches=geometry.roads.filter(r=>r.regions.some(({rect:[l,t,r,b]})=>x>=l&&x<r&&y>=t&&y<b));
    const best=Math.max(...matches.map(r=>r.priority)),top=matches.filter(r=>r.priority===best);
    assert.equal(street(x,y)?.id,top.length===1?top[0].id:undefined,`${x},${y}`);
  }
  for(const x of [103,104,207,208,279,280]) assert.equal(street(x,80)?.name.zh,'臺灣大道');
  assert.equal(street(156,80)?.id,'taiwan');assert.equal(street(156,54),undefined,'Two priority50 streets tie');
  assert.equal(street(9,9),undefined);assert.equal(street(347,80),undefined,'Half-open boulevard edge');
  for(const edit of [g=>g.roads[0].regions[0].rect=[0,0,353,1],g=>g.roads[0].regions=[],g=>g.roads[0].priority=NaN,g=>delete g.roads[0].priority,g=>g.roads[0].name.zh='',g=>g.roads[0].id='liming',g=>g.geometryVersion='horizontal-v99']) {
    const g=structuredClone(geometry);edit(g);assert.deepEqual(streetsInGeometry(g),[]);assert.equal(street(156,80,g),undefined);
  }
});

test('reserved or malformed places never use old catalog positions or warp fallbacks', () => {
  for(const id of reserved) {
    assert.equal(geometry.placesById[id].artStatus,'reserved-no-facade');
    assert.equal(geometry.markersById[id],undefined);assert.ok(!catalog.some(p=>p.id===id));
    assert.equal(placeWorldInGeometry({id,world:[333,96]},geometry),undefined);
    const p=projectNavigation(at(...geometry.placesById[id].worldAnchor),geometry);assert.ok(!reserved.includes(p.landmarkId));
  }
  for(const edit of [p=>p.artStatus='reserved-no-facade',p=>p.interactionStatus='reserved-for-Gameplay-and-Story',p=>p.nativeKey='43:1',p=>p.worldAnchor=[352,96],p=>p.worldAnchor=[333.5,96],p=>p.id='changed']) {
    const g=structuredClone(geometry);edit(g.placesById['old-taichung-station']);
    assert.equal(placeWorldInGeometry({id:'old-taichung-station',world:[333,96]},g),undefined);
  }
  const p=at(312,114);
  for(const change of [{width:71},{height:71},{x:72},{y:72},{flags:0},{contextFlags:1},{contextFlags:4},{contextFlags:32},{mapNumber:99}])
    assert.equal(projectNavigation({...p,...change},geometry),undefined,JSON.stringify(change));
});

test('all twenty real visitor GPS links remain independent of the horizontal game coordinates', () => {
  for(const p of catalog) {
    const url=new URL(visitorMapUrl(visitorLocationInGeometry(p,geometry)));
    const [longitude,latitude]=geometry.placesById[p.id].realPlace.coordinates;
    assert.equal(url.searchParams.get('query'),`${latitude},${longitude}`);
  }
});
