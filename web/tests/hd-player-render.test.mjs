import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import esbuild from 'esbuild';
import { parsePlayerTemplates, PlayerMatcher } from '../src/hd-player.ts';
const bundled=esbuild.buildSync({entryPoints:[new URL('../src/hd-overlay.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const module={exports:{}};new Function('module','exports','require',bundled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url));
const {HdOverlay}=module.exports;
const pack=JSON.parse(readFileSync(new URL('../public/hd/player/player.json',import.meta.url)));
const templates=parsePlayerTemplates(pack,800,128);

test('all ten current gym leaders have HD field facings and portraits, including the exact native Wenyi templates',()=>{
 const sprites=JSON.parse(readFileSync(new URL('../public/hd/sprites/sprites.json',import.meta.url))).sprites;
 for(const character of ['jun','lian','peiqi','yicheng','xingan','wenyi','caining','jiahe','muqing','ling']){
  for(const [frame,east] of [[0,false],[1,false],[2,false],[2,true]])
   assert.ok(sprites.some(s=>s.character===character&&s.kind==='overworld'&&s.frame===frame&&s.east===east),`${character} needs field facing ${frame}/${east}`);
  assert.ok(sprites.some(s=>s.character===character&&s.kind==='battle'),`${character} needs its battle portrait`);
 }
 const provenance=JSON.parse(readFileSync(new URL('./helpers/wenyi-hd-provenance.json',import.meta.url)));
 for(const {kind,frame,east,sha256} of provenance.nativeTemplateSha256){
  const sprite=sprites.find(s=>s.character==='wenyi'&&s.kind===kind&&s.frame===frame&&s.east===east);
  assert.ok(sprite,`Wenyi ${kind}/${frame}/${east}`);
  assert.equal(createHash('sha256').update(Buffer.from(sprite.pixels,'base64')).digest('hex'),sha256);
 }
});
function fixture(detail=2) {
 const t=templates[0],frame=new Uint16Array(240*160).fill(0x1234),rgba=new Uint8ClampedArray(240*160*4);
 const calls=[],restores=[],snapshots=[],clips=[];const underlay={width:0,height:0};const playerAtlas={},npcAtlas={},grab={},patch={};let nav={group:43,map:63,x:2,y:29};
 for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++){const v=t.px[y*t.w+x];if(v!==0xffff)frame[(y+48)*240+x+112]=v;}
 const camera={x:48,y:528},refW=704,ref=new Uint16Array(refW*992).fill(0x1234);
 const overlay=Object.create(HdOverlay.prototype);
 Object.assign(overlay,{enabledValue:true,localPlayerDiagnostics:true,listeners:new Set(),pack:{},options:{getScene:()=>nav},
  element:{width:240*detail,height:160*detail,dataset:{},classList:{add(){},remove(){}}},
  player:{atlas:playerAtlas,matcher:new PlayerMatcher(templates)},
  readFrame(){for(let i=0;i<frame.length;i++){const v=frame[i];rgba.set([(v>>10&31)<<3,(v>>5&31)<<3,(v&31)<<3,255],i*4);}this.frame=frame;this.rgba=rgba;},
  currentMap:()=>({map:{margin:8,buildings:[]},ref,refW,refH:992}),locate:()=>camera,
  findSprites:()=>[{t:{atlasX:400,atlasY:16,w:16,h:32,px:new Uint16Array(512).fill(0x1234),character:'npc',kind:'overworld',frame:0},x:32,y:32}],
  playerUnderlay:underlay,playerUnderlayCtx:{drawImage(...args){snapshots.push(args);}},
  sprites:{atlas:npcAtlas},status:'locked',out:{drawImage(...args){calls.push(args);},save(){},restore(){},beginPath(){},rect(...args){clips.push(args);},clip(){}},grab,patch,
  patchData:{data:new Uint8ClampedArray(240*160*4)},patchCtx:{putImageData(data){restores.push(data.data.slice());}},packScale:4,detailValue:detail});
 return {overlay,t,frame,rgba,calls,restores,snapshots,clips,underlay,playerAtlas,npcAtlas,hideScene(){nav=undefined;}};
}

test('shipped draw uses genuine2x player coordinates alongside unchanged4x NPC coordinates at each display detail',()=>{
 for(const detail of [2,3,4]){
  const f=fixture(detail);f.overlay.draw();
  assert.deepEqual(f.calls.find(c=>c[0]===f.playerAtlas).slice(1),[0,0,32,64,112*detail,48*detail,16*detail,32*detail]);
  assert.deepEqual(f.calls.find(c=>c[0]===f.npcAtlas).slice(1),[400,16,64,128,32*detail,32*detail,16*detail,32*detail]);
  assert.equal(f.overlay.out.imageSmoothingEnabled,false);
  assert.match(f.overlay.element.dataset.playerPose,/^walking:0:native@112,48$/);
 }
});

test('shipped draw keeps native foreground and falls back without a stale pose during covered/menu/missing-pack frames',()=>{
 const f=fixture();const clear=f.t.px.findIndex(p=>p===0xffff);const i=(48+Math.floor(clear/16))*240+112+clear%16;
 f.frame[i]=0x4567;f.overlay.draw();assert.equal(f.snapshots[0][0],f.overlay.element);assert.ok(f.calls.some(c=>c[0]===f.underlay));
 assert.ok(f.clips.some(([x,y,w,h])=>i%240*2>=x&&i%240*2<x+w&&Math.floor(i/240)*2>=y&&Math.floor(i/240)*2<y+h));
 assert.equal(f.restores.some(p=>p[i*4+3]===255),false,'foreground is restored from the HD scene rather than raw native pixels');
 f.calls.length=0;for(let y=64;y<80;y++)f.frame.fill(0x2222,y*240+112,y*240+128);
 f.overlay.draw();assert.equal(f.calls.some(c=>c[0]===f.playerAtlas),false);assert.equal(f.overlay.element.dataset.playerPose,'');
 const next=fixture();next.hideScene();next.overlay.draw();assert.equal(next.calls.some(c=>c[0]===next.playerAtlas),false);
 const missing=fixture();missing.overlay.player=undefined;missing.overlay.draw();assert.equal(missing.calls.some(c=>c[0]===missing.playerAtlas),false);
});

test('a transient player asset failure releases loading and retries on the next HD start, including an existing RAF',async()=>{
 const f=fixture();f.overlay.player=undefined;f.overlay.raf=1;
 const previousFetch=globalThis.fetch,previousImage=Object.getOwnPropertyDescriptor(globalThis,'Image');let requests=0;
 globalThis.fetch=async()=>{if(++requests===1)throw new Error('transient expected denial');return{ok:true,json:async()=>pack};};
 globalThis.Image=class{width=800;height=128;decode(){return Promise.resolve();}};
 try{
  f.overlay.start();assert.equal(f.overlay.playerLoading,true);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.overlay.playerLoading,false);assert.equal(f.overlay.player,undefined);
  f.overlay.start();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,2);assert.equal(f.overlay.playerLoading,false);assert.ok(f.overlay.player);
 }finally{globalThis.fetch=previousFetch;if(previousImage)Object.defineProperty(globalThis,'Image',previousImage);else delete globalThis.Image;}
});

test('all installed custom characters and idle facings retain HD foreground under adjacent player poses',()=>{
 const sprites=JSON.parse(readFileSync(new URL('../public/hd/sprites/sprites.json',import.meta.url))).sprites;
 const characters=sprites.filter(s=>s.kind==='overworld'&&s.frame<=2);
 const decode=s=>new Uint16Array(Uint8Array.from(Buffer.from(s.pixels,'base64')).buffer);
 let cases=0;
 for(const detail of [2,3,4])for(const character of characters)for(const pose of templates.filter(t=>t.kind==='walking')){
  const f=fixture(detail),px=decode(character),t={...character,px};
  // The genuine player is one tile south, in front; visible leader pixels
  // remain in its clear head/shoulder area, including each native direction.
  f.frame.fill(0x1234);
  for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++)if(px[y*t.w+x]!==0xffff)f.frame[(32+y)*240+112+x]=px[y*t.w+x];
  for(let y=0;y<pose.h;y++)for(let x=0;x<pose.w;x++)if(pose.px[y*pose.w+x]!==0xffff)f.frame[(48+y)*240+112+x]=pose.px[y*pose.w+x];
  f.overlay.findSprites=()=>[{t,x:112,y:32,hits:t.opaque}];
  f.overlay.draw();
  assert.ok(f.snapshots.length,`${character.character}/${pose.frame} records existing HD foreground`);
  assert.deepEqual(f.snapshots[0].slice(1),[112*detail,48*detail,pose.w*detail,pose.h*detail,0,0,pose.w*detail,pose.h*detail]);
  const playerIndex=f.calls.findIndex(c=>c[0]===f.playerAtlas),restoreIndex=f.calls.findIndex(c=>c[0]===f.underlay);
  assert.ok(playerIndex>=0&&restoreIndex>playerIndex,`${character.character}/${pose.frame} retains the approved player and restores foreground afterwards`);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const v=px[(y+16)*16+x];
   if(v===0xffff||pose.px[y*16+x]!==0xffff)continue;
   const sx=(112+x)*detail,sy=(48+y)*detail;
   assert.ok(f.clips.some(([rx,ry,w,h])=>sx>=rx&&sx<rx+w&&sy>=ry&&sy<ry+h),`${character.character}/${pose.frame} preserves visible leader pixel ${x},${y}`);
  }
  cases++;
 }
 assert.equal(cases,3*characters.length*templates.filter(t=>t.kind==='walking').length);
});
