/* Zarya OS 1.7 regression tests: client budgets, compatibility, assembly and payouts. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const hardware=fs.readFileSync(path.join(__dirname,'..','js','hardware.js'),'utf8');
const builder=fs.readFileSync(path.join(__dirname,'..','js','pc-orders.js'),'utf8');

function boot(opts={}) {
  const data=opts.data||new Map(),paid=opts.paid||new Set();
  let money=0, paidCount=0;
  const base={
    money:()=>money,
    shop:()=>[{id:'cpu',levels:['0']},{id:'proxy',levels:['0']}],
    level:()=>0, buy:()=>({ok:true}),
    spendFunds:(cost)=>cost<=money?((money-=cost),{ok:true}):({ok:false}),
    reset:()=>{money=0;paid.clear()},
    awardBuildContract:(id,amount)=>{
      if (!/^build-[0-9]{2}$/.test(id)||amount<1||amount>1000)
        return {ok:false,msg:'invalid'};
      if(paid.has(id))return {ok:false,alreadyPaid:true,msg:'already paid'};
      paid.add(id);money+=amount;paidCount++;return {ok:true,reward:amount};
    }
  };
  const window={Game:base,APPS:{},APPICONS:{},UI:{toast:()=>{}},dispatchEvent:()=>{}};
  const localStorage={
    getItem:key=>data.get(key)||null,
    setItem:(key,val)=>{data.set(key,String(val))},
    removeItem:key=>{data.delete(key)}
  };
  const ctx={
    window,localStorage,CustomEvent:class {constructor(type){this.type=type}},
    Date,Math,JSON,Number,Set,Object,Array
  };
  vm.runInNewContext(hardware,ctx,{filename:'hardware.js'});
  vm.runInNewContext(builder,ctx,{filename:'pc-orders.js'});
  return {G:base,data,paid,money:()=>money,paidCount:()=>paidCount};
}
function ok(r,label) { assert.equal(r.ok,true,label+': '+r.msg); }
const valid=[
  {cpu:'cpu0',board:'board0',ram:'ram2',gpu:'gpu0',psu:'psu0',ssd:'ssd1'},
  {cpu:'cpu0',board:'board0',ram:'ram2',gpu:'gpu2',psu:'psu1',ssd:'ssd1'},
  {cpu:'cpu2',board:'board1',ram:'ram3',gpu:'gpu0',psu:'psu0',ssd:'ssd3'},
  {cpu:'cpu3',board:'board0',ram:'ram3',gpu:'gpu2',psu:'psu1',ssd:'ssd2'},
  {cpu:'cpu2',board:'board0',ram:'ram3',gpu:'gpu4',psu:'psu1',ssd:'ssd1'},
  {cpu:'cpu4',board:'board2',ram:'ram4',gpu:'gpu0',psu:'psu0',ssd:'ssd3'},
  {cpu:'cpu3',board:'board1',ram:'ram4',gpu:'gpu4',psu:'psu2',ssd:'ssd3'},
  {cpu:'cpu4',board:'board3',ram:'ram4',gpu:'gpu4',psu:'psu3',ssd:'ssd4'}
];
const actions=['board','core','gpu','cables','boot','deliver'];
(function testCatalogueAndPerformance() {
  const {G}=boot();
  assert.equal(G.version,'1.8.0');
  assert.equal(G.buildOrders().length,8);
  assert.equal(G.buildOrders()[0].status,'available');
  assert.equal(G.buildOrders()[1].status,'available');
  assert.equal(G.buildOrders()[2].status,'locked');
  assert.equal(G.buildStart('build-08').ok,false,'locked order unavailable');
  assert.equal(G.buildStart('wrong').ok,false);
  assert.equal(G.buildEvaluate('missing'),null);
  valid.forEach((ids,i)=>{
    const id='build-'+String(i+1).padStart(2,'0');
    const result=G.buildEvaluate(id,ids);
    assert.equal(result.ok,true,id+': '+result.errors.join('; '));
    assert.ok(result.cost<=result.budget,id+' under budget');
    assert.ok(result.pc.fps>=12);
  });
  assert.equal(G.simulatePC({cpu:'gpu2'}).ok,false);
  assert.equal(G.simulatePC(valid[0]).ok,true);
  assert.equal(G.buildEvaluate('build-02',Object.assign({},valid[1],{psu:'psu0'})).ok,false,'weak power supply');
  assert.equal(G.buildEvaluate('build-03',Object.assign({},valid[2],{board:'board0'})).ok,false,'NVMe requires M.2');
  assert.equal(G.buildEvaluate('build-08',Object.assign({},valid[7],{gpu:'gpu0'})).ok,false,'inadequate GPU');
  assert.equal(G.buildEvaluate('build-01',Object.assign({},valid[0],{cpu:'cpu4',board:'board3'})).ok,false,'over budget');
})();

(function testSequentialAssemblyAndPayouts() {
  const {G,money,paidCount}=boot();
  assert.equal(G.buildConfirm().ok,false);
  assert.equal(G.buildAssemble('board').ok,false);
  assert.equal(G.buildChoose('cpu','cpu2').ok,false);
  const ordered=G.buildOrders();
  for(let i=0;i<ordered.length;i++) {
    const id=ordered[i].id;
    const config=valid[i];
    ok(G.buildStart(id),id+' begin');
    assert.equal(G.buildStart(ordered[(i+1)%ordered.length].id).ok,false,'one order at a time');
    assert.equal(G.buildConfirm().ok,false,'default setup should not meet requirements');
    assert.equal(G.buildChoose('cpu','gpu1').ok,false,'wrong component type rejected');
    for(const [type,item] of Object.entries(config))ok(G.buildChoose(type,item),id+' choose '+type);
    assert.equal(G.buildEvaluate(id).ok,true,id+' meets requirements');
    ok(G.buildConfirm(),id+' approve');
    assert.equal(G.buildChoose('cpu','cpu0').ok,false,'cannot edit parts mid-assembly');
    assert.equal(G.buildAssemble('deliver').ok,false,'cannot skip assembly');
    for(const step of actions)ok(G.buildAssemble(step),id+' step '+step);
    assert.equal(G.buildProgress().completed,i+1);
    assert.equal(G.buildStart(id).ok,false,'completed orders cannot be replayed');
    assert.equal(G.buildOrders()[i].status,'done');
  }
  assert.equal(money(),3420,'all rewards paid once');
  assert.equal(paidCount(),8);
  assert.equal(G.buildProgress().active,null);
})();

(function testStorageAndCancel() {
  const data=new Map(),paid=new Set();
  let client=boot({data,paid});
  ok(client.G.buildStart('build-01'),'start');
  ok(client.G.buildChoose('ram','ram2'),'choose ram');
  assert.equal(client.G.buildDraft('build-01').ram,'ram2');
  client=boot({data,paid});
  assert.equal(client.G.buildProgress().active.phase,'design');
  assert.equal(client.G.buildDraft('build-01').ram,'ram2');
  ok(client.G.buildCancel(),'cancel');
  assert.equal(client.G.buildProgress().active,null);
  ok(client.G.buildStart('build-01'),'resume');
  assert.equal(client.G.buildDraft('build-01').ram,'ram2','draft kept after cancellation');
  for(const [type,id] of Object.entries(valid[0]))ok(client.G.buildChoose(type,id),'choose');
  ok(client.G.buildConfirm(),'approve');
  ok(client.G.buildAssemble('board'),'board');
  client=boot({data,paid});
  assert.equal(client.G.buildProgress().active.phase,'assembly');
  assert.equal(client.G.buildProgress().active.step,1);
  for(const action of actions.slice(1))ok(client.G.buildAssemble(action),action);
  assert.equal(client.money(),130);
  client=boot({data,paid});
  assert.equal(client.G.buildProgress().completed,1);
  assert.equal(client.G.buildOrders()[0].status,'done');
  client.G.reset();
  assert.equal(client.G.buildProgress().completed,0);
  assert.equal(client.G.buildDraft('build-01').ram,'ram0');
  assert.equal(data.has('zarya.pc-orders.v1'),true,'fresh state saved after reset');
})();

console.log('Zarya OS 1.7: order budgets, compatibility, assembly stages and payouts passed.');
