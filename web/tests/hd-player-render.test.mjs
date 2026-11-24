import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import { parsePlayerTemplates, PlayerMatcher } from '../src/hd-player.ts';
const bundled=esbuild.buildSync({entryPoints:[new URL('../src/hd-overlay.ts',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const module={exports:{}};new Function('module','exports','require',bundled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url));
const {HdOverlay}=module.exports;
const pack=JSON.parse(readFileSync(new URL('../public/hd/player/player.json',import.meta.url)));
const templates=parsePlayerTemplates(pack,800,128);
function fixture(detail=2) {
 const t=templates[0],frame=new Uint16Array(240*160).fill(0x1234),rgba=new Uint8ClampedArray(240*160*4);
 const calls=[],restores=[];const playerAtlas={},npcAtlas={},grab={},patch={};let nav={group:43,map:63,x:2,y:29};
 for(let y=0;y<t.h;y++)for(let x=0;x<t.w;x++){const v=t.px[y*t.w+x];if(v!==0xffff)frame[(y+48)*240+x+112]=v;}
 const camera={x:48,y:528},refW=704,ref=new Uint16Array(refW*992).fill(0x1234);
 const overlay=Object.create(HdOverlay.prototype);
 Object.assign(overlay,{enabledValue:true,localPlayerDiagnostics:true,listeners:new Set(),pack:{},options:{getScene:()=>nav},
  element:{width:240*detail,height:160*detail,dataset:{},classList:{add(){},remove(){}}},
  player:{atlas:playerAtlas,matcher:new PlayerMatcher(templates)},
  readFrame(){for(let i=0;i<frame.length;i++){const v=frame[i];rgba.set([(v>>10&31)<<3,(v>>5&31)<<3,(v&31)<<3,255],i*4);}this.frame=frame;this.rgba=rgba;},
  currentMap:()=>({map:{margin:8,buildings:[]},ref,refW,refH:992}),locate:()=>camera,
  findSprites:()=>[{t:{atlasX:400,atlasY:16,w:16,h:32,px:new Uint16Array(512).fill(0x1234),character:'npc',kind:'overworld',frame:0},x:32,y:32}],
  sprites:{atlas:npcAtlas},status:'locked',out:{drawImage(...args){calls.push(args);}},grab,patch,
  patchData:{data:new Uint8ClampedArray(240*160*4)},patchCtx:{putImageData(data){restores.push(data.data.slice());}},packScale:4,detailValue:detail});
 return {overlay,t,frame,rgba,calls,restores,playerAtlas,npcAtlas,hideScene(){nav=undefined;}};
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
 f.frame[i]=0x4567;f.overlay.draw();assert.ok(f.restores.some(p=>p[i*4+3]===255&&p[i*4]===f.rgba[i*4]));
 f.calls.length=0;for(let y=64;y<80;y++)f.frame.fill(0x2222,y*240+112,y*240+128);
 f.overlay.draw();assert.equal(f.calls.some(c=>c[0]===f.playerAtlas),false);assert.equal(f.overlay.element.dataset.playerPose,'');
 const next=fixture();next.hideScene();next.overlay.draw();assert.equal(next.calls.some(c=>c[0]===next.playerAtlas),false);
 const missing=fixture();missing.overlay.player=undefined;missing.overlay.draw();assert.equal(missing.calls.some(c=>c[0]===missing.playerAtlas),false);
});
