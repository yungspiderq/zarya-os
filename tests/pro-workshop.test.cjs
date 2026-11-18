/* Zarya OS 2.1 professional mode: multi-fault, cost, QA, reputation and persistence. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const hardware=fs.readFileSync(path.join(__dirname,'../js/hardware.js'),'utf8');
const professional=fs.readFileSync(path.join(__dirname,'../js/pro-workshop.js'),'utf8');
const faults=['ram','psu','ssd','cooling','gpu','board','software','airflow'];
const mapping={ram:'memkit',psu:'psukit',ssd:'diskkit',cooling:'thermalkit',
  gpu:'gpukit',board:'boardkit',software:'driverkit',airflow:'airkit'};
const PRESETS=[
  {cpu:'cpu1',board:'board0',ram:'ram2',gpu:'gpu0',psu:'psu1',ssd:'ssd1',cooler:'cooler1'},
  {cpu:'cpu2',board:'board0',ram:'ram2',gpu:'gpu2',psu:'psu2',ssd:'ssd2',cooler:'cooler2'},
  {cpu:'cpu2',board:'board1',ram:'ram3',gpu:'gpu3',psu:'psu2',ssd:'ssd3',cooler:'cooler2'},
  {cpu:'cpu3',board:'board1',ram:'ram3',gpu:'gpu4',psu:'psu3',ssd:'ssd3',cooler:'cooler3'},
  {cpu:'cpu4',board:'board3',ram:'ram4',gpu:'gpu4',psu:'psu4',ssd:'ssd4',cooler:'cooler4'}
];
function boot(opts={}){
  const data=opts.data||new Map(),paid=opts.paid||new Set();
  let money=0,payouts=0;
  const G={
    money:()=>money,shop:()=>[],level:()=>0,buy:()=>({ok:true}),
    spendFunds:()=>({ok:true}),
    awardProContract:(id,amount)=>{
      if(!/^pro-[0-9]{6}$/.test(id)||!Number.isSafeInteger(amount)||amount<1||amount>1200)
        return {ok:false,msg:'invalid payout'};
      if(paid.has(id))return {ok:false,alreadyPaid:true};
      paid.add(id);money+=amount;payouts++;
      return {ok:true,reward:amount};
    },
    reset:()=>{money=0;paid.clear()}
  };
  const window={Game:G,dispatchEvent:()=>{}};
  const localStorage={
    getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)
  };
  vm.runInNewContext(hardware,{window,localStorage,CustomEvent:class{constructor(type){this.type=type;}},
    Date,Math,JSON,Number,Array,Object,Set},{filename:'hardware.js'});
  vm.runInNewContext(professional,{window,localStorage,CustomEvent:class{constructor(type){this.type=type;}},
    Date,Math,JSON,Number,Array,Object,Set},{filename:'pro-workshop.js'});
  return {G,data,paid,money:()=>money,payouts:()=>payouts};
}
function ok(r,label){assert.equal(r.ok,true,label+': '+r.msg);}
function rand(n,salt){return (Math.imul((n*1297+salt*193)>>>0,1664525)+1013904223)>>>0;}
function trueFaults(n,tier){
  const orig=faults.slice();
  return faults.slice().sort((a,b)=>rand(n,orig.indexOf(a)+3)-rand(n,orig.indexOf(b)+3))
    .slice(0,tier>=3?3:2);
}
function finishQA(G){
  for(let i=0;i<3;i++){
    const sample=G.proQAReport();
    assert.equal(sample.step,i);
    if(sample.expected==='service'){
      ok(G.proQAAnswer('service'),'flag out-of-range reading');
      assert.equal(G.proState().active.stage,'rework');
      ok(G.proRework(),'rework');
      assert.equal(G.proQAReport().expected,'approve');
    }
    ok(G.proQAAnswer('approve'),'pass QA '+i);
  }
  assert.equal(G.proState().active.stage,'deliver');
}
(function testListingsAndInvalidOps(){
  const {G}=boot();
  assert.equal(G.version,'2.2.1');
  const jobs=G.proOffers();
  assert.equal(jobs.length,3);
  assert.equal(jobs[0].kind,'repair');
  assert.equal(jobs[1].kind,'build');
  assert.equal(jobs[0].faultCount,2);
  assert.equal(jobs[0].faults,undefined,'hidden fault causes not leaked in customer brief');
  assert.equal(G.proStart('nope').ok,false);
  assert.equal(G.proTest('power').ok,false);
  assert.equal(G.proDeliver().ok,false);
  assert.equal(G.proEvaluateBuild(jobs[1].id,{cpu:'invalid'}).ok,false);
})();
(function testRepairWithEvidenceAndCorrectProcurement(){
  const app=boot(),G=app.G,j=G.proOffers()[0];
  const causes=trueFaults(1,j.tier);
  ok(G.proStart(j.id),'accept repair');
  assert.equal(G.proStart(G.proOffers()[1].id).ok,false);
  assert.equal(G.proDiagnose().ok,false,'must use tests');
  const catalog=G.proCatalog();
  const selected=[];
  for(const id of causes){
    const test=catalog.tests.find(t=>t.checks.includes(id)&&!selected.includes(t.id));
    assert.ok(test,'must cover '+id);
    selected.push(test.id);
  }
  for(const id of selected)ok(G.proTest(id),'paid test '+id);
  assert.equal(G.proTest(selected[0]).ok,false,'cannot buy a duplicate test');
  assert.ok(G.proTestReport(selected[0]).lines.length>0);
  for(const id of causes)ok(G.proMarkFault(id,true),'diagnosis fault');
  assert.equal(G.proMarkFault('gpu',true).ok,causes.includes('gpu'),'cannot add more than specified faults');
  ok(G.proDiagnose(),'confirm multi-fault diagnosis');
  assert.equal(G.proState().active.stage,'procurement');
  for(const id of causes)ok(G.proSelectKit(id,mapping[id]),'correct repair kit');
  ok(G.proRepair(),'perform repair');
  finishQA(G);
  const before=app.payouts();
  ok(G.proDeliver(),'payment');
  assert.equal(app.payouts(),before+1);
  assert.equal(G.proState().complete,1);
  assert.equal(G.proState().reputation,51);
  assert.equal(G.proDeliver().ok,false,'cannot collect twice');
  assert.equal(G.proOffers().length,3,'queue replenishes');
})();
(function testWrongDiagnosisConsequences(){
  const {G}=boot();
  ok(G.proStart(G.proOffers()[0].id),'start');
  const j=G.proOffers()[0],catalog=G.proCatalog(),causes=trueFaults(1,j.tier);
  // Buy sufficient independent tests, then purposely assert the wrong causes.
  for(const t of catalog.tests.slice(0,causes.length))ok(G.proTest(t.id),'test');
  const wrong=faults.filter(f=>!causes.includes(f)).slice(0,j.faultCount);
  for(const id of wrong)ok(G.proMarkFault(id,true),'wrong hypothesis');
  const first=G.proDiagnose();
  assert.equal(first.ok,false);
  assert.equal(G.proState().active.strikes,1);
  const second=G.proDiagnose();
  assert.equal(second.ok,false);
  assert.equal(second.failed,true,'second critical mistake fails contract');
  assert.equal(G.proState().failed,1);
  assert.equal(G.proState().reputation,34);
})();
(function testBuildConstraintsAndPersistence(){
  const data=new Map(),paid=new Set();
  let app=boot({data,paid}),G=app.G;
  const build=G.proOffers().find(j=>j.kind==='build');
  ok(G.proStart(build.id),'start build');
  assert.equal(G.proSelectPart('cpu','gpu2').ok,false);
  assert.equal(G.proEvaluateBuild(build.id).ok,false,'stock config should be inadequate');
  for(const [type,id] of Object.entries(PRESETS[0]))ok(G.proSelectPart(type,id),'pick '+type);
  assert.equal(G.proEvaluateBuild(build.id).ok,true);
  assert.equal(G.proApproveBuild().ok,true);
  assert.equal(G.proSelectPart('cpu','cpu4').ok,false,'cannot change after approval');
  app=boot({data,paid});G=app.G;
  assert.equal(G.proState().active.stage,'qa','assembly progress persisted');
  finishQA(G);
  ok(G.proDeliver(),'deliver build');
  assert.equal(G.proState().complete,1);
  G.reset();
  assert.equal(G.proState().complete,0);
  assert.equal(G.proOffers().length,3);
  assert.equal(G.proState().reputation,45);
})();
console.log('Zarya OS 2.1: multi-fault repair, QA readings, failure penalties, build constraints and saves passed.');
