/* Zarya OS 2.1: one-time global client reset, local economy integrity and no bypass via JSON import. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const reset=fs.readFileSync(path.join(__dirname,'../js/season-reset.js'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8');
function storage(data){
  return {
    get length(){return data.size;},
    key:i=>Array.from(data.keys())[i]||null,
    getItem:k=>data.has(k)?data.get(k):null,
    setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)
  };
}
function initGame(data){
  const window={dispatchEvent:()=>{}};
  const ctx={window,localStorage:storage(data),Date,Math,JSON,Number,Array,Object,Set,Uint8Array};
  vm.runInNewContext(game,ctx,{filename:'game.js'});
  return window.Game;
}
(function testOneTimeWipePerBrowser(){
  const data=new Map([
    ['zarya.game.v1','{"v":1,"money":50000}'],
    ['zarya.components.v2','{"v":2,"inventory":["cpu4"]}'],
    ['zarya.company.v1','{"v":1,"completed":100}'],
    ['zarya.pro-workshop.v1','{"v":1,"complete":10}'],
    ['zarya.seen','1'],
    ['not-zarya-account','untouched']
  ]);
  let window={};
  vm.runInNewContext(reset,{window,localStorage:storage(data)});
  assert.equal(window.ZaryaSeasonReset.performed,true);
  assert.equal(window.ZaryaSeasonReset.removed,5);
  assert.equal(data.has('zarya.game.v1'),false);
  assert.equal(data.has('zarya.company.v1'),false);
  assert.equal(data.has('zarya.pro-workshop.v1'),false);
  assert.equal(data.get('not-zarya-account'),'untouched');
  assert.equal(data.get('zarya.reset.v2.1'),'1');
  data.set('zarya.game.v1','{"v":1,"money":45}');
  window={};
  vm.runInNewContext(reset,{window,localStorage:storage(data)});
  assert.equal(window.ZaryaSeasonReset.performed,false,'no repeated wipe on reload');
  assert.ok(data.has('zarya.game.v1'),'fresh progress persists across reloads');
})();
(function testMoneyTamperingAndGuard(){
  const data=new Map([['zarya.reset.v2.1','1']]);
  let G=initGame(data);
  assert.equal(G.money(),0);
  assert.equal(G.antiCheatStatus().detected,false);
  assert.ok(data.has('zarya.game.guard.v2.1'),'economy checksum initialized');
  assert.equal(G.awardProContract('pro-000001',250).ok,true);
  assert.equal(G.money(),250);
  assert.equal(G.awardProContract('pro-000001',250).ok,false);
  G=initGame(data);
  assert.equal(G.money(),250,'unaltered save loads');
  assert.equal(G.antiCheatStatus().detected,false);
  data.set('zarya.company.v1','{"v":1,"completed":100}');
  const raw=JSON.parse(data.get('zarya.game.v1'));
  raw.money=999999999;
  data.set('zarya.game.v1',JSON.stringify(raw));
  G=initGame(data);
  assert.equal(G.antiCheatStatus().detected,true,'edited wallet detected');
  assert.equal(G.money(),0,'tampered money wiped');
  assert.equal(data.has('zarya.company.v1'),false,'inconsistent completed history wiped too');
  assert.equal(data.has('zarya.reset.v2.1'),true,'one-time reset marker retained');
  G=initGame(data);
  assert.equal(G.antiCheatStatus().detected,false,'new valid profile stable after reset');
})();
(function testMissingIntegrityAndInvalidMoney(){
  const data=new Map([['zarya.reset.v2.1','1']]);
  let G=initGame(data);
  G.awardProContract('pro-000002',200);
  data.delete('zarya.game.guard.v2.1');
  G=initGame(data);
  assert.equal(G.money(),0);
  assert.equal(G.antiCheatStatus().detected,true,'missing seal detected');
  G=initGame(data);
  const raw=JSON.parse(data.get('zarya.game.v1'));
  const guard=JSON.parse(data.get('zarya.game.guard.v2.1'));
  raw.money=-2;
  // An edited value with an old checksum is rejected even when JSON is otherwise parseable.
  data.set('zarya.game.v1',JSON.stringify(raw));
  data.set('zarya.game.guard.v2.1',JSON.stringify(guard));
  G=initGame(data);
  assert.equal(G.money(),0);
  assert.equal(G.antiCheatStatus().detected,true);
})();
console.log('Zarya OS 2.1: mandatory client reset, economy integrity and tamper rollback passed.');
