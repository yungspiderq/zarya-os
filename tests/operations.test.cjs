'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/operations.js'),'utf8');
function boot(options={}){
  const data=options.data||new Map(),paid=options.paid||new Set();
  let balance=0,count=0,resets=0;
  const G={
    awardSimulationCase:(id,amount)=>{
      if(!/^sim-0[1-8]$/.test(id)||!Number.isSafeInteger(amount)||amount<170||amount>765)
        return {ok:false,msg:'Invalid credit'};
      if(paid.has(id))return {ok:false,alreadyPaid:true};
      paid.add(id);balance+=amount;count++;return {ok:true};
    },
    reset:()=>{resets++;balance=0;paid.clear();}
  };
  const window={Game:G,dispatchEvent:()=>{}};
  const localStorage={
    getItem:k=>data.has(k)?data.get(k):null,
    setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)
  };
  const ctx={window,localStorage,CustomEvent:class{constructor(type){this.type=type;}},
    Date,JSON,Math,Object,Array,Number,Set};
  vm.runInNewContext(source,ctx,{filename:'operations.js'});
  return {G,data,paid,balance:()=>balance,count:()=>count,resets:()=>resets};
}
function ok(r,label){assert.equal(r.ok,true,label+': '+r.msg);}
function solve(G,brief){
  const nodes=brief.nodes.map(n=>{
    const result=G.opsInspect(n.id);
    ok(result,'inspect '+n.id);
    return {id:n.id,zone:n.zone,text:result.lines.join('\n')};
  });
  const target=nodes.find(n=>n.zone==='store'&&n.text.includes('object='+brief.asset));
  assert.ok(target,'asset found in store');
  const marker=target.text.match(/RECORD event=([A-Z0-9-]+)/)[1];
  assert.ok(brief.markerOptions.includes(marker));
  const route={store:target.id};
  ['edge','relay'].forEach(zone=>{
    const node=nodes.find(n=>n.zone===zone&&n.text.includes('event='+marker));
    assert.ok(node,'marker shared in '+zone);
    route[zone]=node.id;
  });
  ok(G.opsSetMarker(marker),'set marker');
  ['edge','relay','store'].forEach(zone=>ok(G.opsSetNode(zone,route[zone]),'set '+zone));
  const description=brief.brief.toLowerCase();
  const mode=description.includes('изолир')?'contain':
    description.includes('восстанов')?'restore':'observe';
  ok(G.opsSetMode(mode),'set mode');
}
(function testUnlocksAndValidation(){
  const {G}=boot(),list=G.opsCases();
  assert.equal(list.length,8);
  assert.equal(list[0].status,'available');
  assert.equal(list[1].status,'locked');
  assert.equal(list[0].answer,undefined,'solutions must stay hidden');
  assert.equal(G.opsStart('op03').ok,false);
  ok(G.opsStart('op01'),'start first case');
  assert.equal(G.opsSubmit().ok,false);
  assert.equal(G.opsInspect('bad-node').ok,false);
  assert.equal(G.opsSetMarker('invalid').ok,false);
  assert.equal(G.opsSetNode('store','GW-11').ok,false);
  assert.equal(G.opsSetMode('exploit').ok,false);
})();
(function testEightCases(){
  const session=boot(),G=session.G;
  let total=0;
  for(let i=0;i<8;i++){
    const id='op'+String(i+1).padStart(2,'0');
    const brief=G.opsCases()[i];
    assert.equal(brief.id,id);
    ok(G.opsStart(id),'start '+id);
    solve(G,brief);
    assert.equal(G.opsState().current.opened.length,6);
    const reward=G.opsSubmit();
    ok(reward,'complete '+id);
    total+=170+i*85;
    assert.equal(reward.reward,170+i*85);
    assert.equal(G.opsState().completed,i+1);
    assert.equal(G.opsSubmit().ok,false,'double-submit blocked');
  }
  assert.equal(G.opsCases().every(c=>c.status==='done'),true);
  assert.equal(session.count(),8);
  assert.equal(session.balance(),total);
})();
(function testBadEvidenceAndRetry(){
  const {G}=boot(),first=G.opsCases()[0];
  ok(G.opsStart(first.id),'start');
  first.nodes.slice(0,4).forEach(n=>ok(G.opsInspect(n.id),'inspect'));
  ok(G.opsSetMarker(first.markerOptions[0]),'wrong marker');
  ['edge','relay','store'].forEach(zone=>{
    const node=first.nodes.find(n=>n.zone===zone);
    if(!G.opsState().current.opened.includes(node.id))ok(G.opsInspect(node.id),'review');
    ok(G.opsSetNode(zone,node.id),'select');
  });
  ok(G.opsSetMode('restore'),'wrong mode');
  for(let i=1;i<=3;i++){
    const r=G.opsSubmit();
    assert.equal(r.ok,false);
    if(i===3)assert.equal(r.failed,true);
  }
  assert.equal(G.opsState().confidence,90);
  assert.equal(G.opsState().current.status,'failed');
  ok(G.opsStart('op01'),'retry');
  assert.equal(G.opsState().current.turns,0);
})();
(function testPersistenceAndTerminal(){
  const data=new Map(),paid=new Set();
  let app=boot({data,paid});
  assert.ok(app.G.opsCommand([]).msg.includes('ops inspect'));
  assert.ok(app.G.opsCommand(['list']).msg.includes('op01'));
  assert.equal(app.G.opsCommand(['start','op01']).ok,true);
  assert.equal(app.G.opsCommand(['inspect','GW-10']).ok,true);
  assert.equal(app.G.opsCommand(['marker','RK-34']).ok,true);
  app=boot({data,paid});
  assert.equal(app.G.opsState().current.opened.includes('GW-10'),true);
  assert.equal(app.G.opsState().current.marker,'RK-34');
  assert.equal(app.G.opsState().current.turns,1);
  app.G.reset();
  assert.equal(app.G.opsState().current,null);
  assert.equal(app.G.opsState().completed,0);
  assert.equal(app.resets(),1);
})();
console.log('Zarya OS 2.2: eight evidence-based cases, route correlation, failure and persistence passed.');
