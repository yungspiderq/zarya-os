/* ZARYA OS 2.1 company regression suite; no dependencies or DOM. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const hardware=fs.readFileSync(path.join(__dirname,'..','js','hardware.js'),'utf8');
const company=fs.readFileSync(path.join(__dirname,'..','js','company.js'),'utf8');
const CONFIGS=[
  {cpu:'cpu1',board:'board0',ram:'ram2',gpu:'gpu0',psu:'psu0',ssd:'ssd1'},
  {cpu:'cpu2',board:'board0',ram:'ram2',gpu:'gpu2',psu:'psu1',ssd:'ssd1'},
  {cpu:'cpu2',board:'board1',ram:'ram3',gpu:'gpu3',psu:'psu1',ssd:'ssd3'},
  {cpu:'cpu3',board:'board1',ram:'ram3',gpu:'gpu4',psu:'psu2',ssd:'ssd3'},
  {cpu:'cpu4',board:'board3',ram:'ram4',gpu:'gpu4',psu:'psu3',ssd:'ssd4'}
];
function boot(opts={}){
  const data=opts.data||new Map(),paid=opts.paid||new Set(),
    achievementPaid=opts.achievementPaid||new Set();
  let balance=opts.balance===undefined?15000:opts.balance,resetCount=0,companyRewards=0;
  const G={
    money:()=>balance,level:()=>0,
    shop:()=>[{id:'cpu',levels:['none']},{id:'proxy',levels:['off']}],
    buy:()=>({ok:true}),
    spendFunds:amount=>{
      if(!Number.isSafeInteger(amount)||amount<0||balance<amount)return {ok:false,msg:'Недостаточно средств'};
      balance-=amount;return {ok:true};
    },
    awardCompanyJob:(id,amount)=>{
      if(!/^co-[0-9]{6}$/.test(id)||!Number.isSafeInteger(amount)||amount<1||amount>2500)
        return {ok:false,msg:'bad payout'};
      if(paid.has(id))return {ok:false,alreadyPaid:true,msg:'already paid'};
      paid.add(id);balance+=amount;companyRewards++;return {ok:true};
    },
    awardCompanyAchievement:(id,amount)=>{
      if(!/^ach-[a-z0-9-]{2,40}$/.test(id)||!Number.isSafeInteger(amount)||amount<1||amount>500)
        return {ok:false,msg:'bad award'};
      if(achievementPaid.has(id))return {ok:false,alreadyPaid:true};
      achievementPaid.add(id);balance+=amount;return {ok:true};
    },
    reset:()=>{resetCount++;balance=0;paid.clear();achievementPaid.clear()}
  };
  const events=[];
  const window={Game:G,dispatchEvent:e=>events.push(e.type)};
  const localStorage={
    getItem:key=>data.get(key)||null,
    setItem:(key,val)=>data.set(key,String(val)),
    removeItem:key=>data.delete(key)
  };
  const ctx={
    window,localStorage,CustomEvent:class{constructor(type){this.type=type;}},
    Date,Math,JSON,Set,Object,Array,Number
  };
  vm.runInNewContext(hardware,ctx,{filename:'hardware.js'});
  vm.runInNewContext(company,ctx,{filename:'company.js'});
  return {G,data,paid,achievementPaid,balance:()=>balance,
    resetCount:()=>resetCount,companyRewards:()=>companyRewards,events};
}
function ok(r,context){assert.equal(r.ok,true,context+': '+r.msg);}
const solutions=[
  ['storage','ssd'],['power','psu'],['ram','memory'],
  ['cooling','remount'],['slot','board'],['gpu','graphics']
];
// Match the deterministic scenario selection algorithm used by the company.
function seed(n){return (Math.imul(n,1103515245)+12345)>>>0;}
function complete(G,id){
  const job=G.companyJobs().find(j=>j.id===id);
  assert.ok(job,'job exists '+id);
  ok(G.companyStart(id),'start '+id);
  if(job.type==='diagnose'){
    const answer=solutions[job.scenario];
    assert.equal(G.companyAnswer('incorrect').ok,false,'bad diagnosis must not progress');
    ok(G.companyAnswer(answer[0]),'diagnose');
    ok(G.companyAnswer(answer[1]),'repair');
  }else if(job.type==='build'){
    const preset=CONFIGS[job.tier-1];
    for(const [type,item] of Object.entries(preset))ok(G.companyChoose(type,item),'choose '+type);
    assert.equal(G.companyBuildReport(id).ok,true,'valid '+job.tier+' build');
    ok(G.companyConfirmBuild(),'approve build');
    assert.equal(G.companyAction('wrong').ok,false,'cannot skip build steps');
    for(const step of G.companySteps())ok(G.companyAction(step[0]),'assembly '+step[0]);
  }else{
    for(const step of G.companySteps())ok(G.companyAction(step[0]),'step '+step[0]);
  }
  assert.equal(G.companyState().active,null);
}
(function testStartAndUpgradeEconomy(){
  const a=boot(),G=a.G;
  assert.equal(G.version,'2.1.0');
  assert.equal(G.companyJobs().length,3);
  assert.equal(G.companyJobs()[0].id,'co-000001');
  assert.equal(G.companyJobs()[0].type,'diagnose');
  assert.equal(G.companyJobs()[1].type,'build');
  assert.equal(G.companyJobs()[2].type,'cooling');
  assert.equal(G.companyState().rank.rank,1);
  assert.equal(G.companyState().rank.title,'Гаражная мастерская');
  assert.equal(G.companyRename('X').ok,false);
  assert.equal(G.companyRename('<script>').ok,false);
  ok(G.companyRename('Мастерская Polaris'),'rename');
  assert.equal(G.companyState().name,'Мастерская Polaris');
  assert.equal(G.companyUpgrade('unknown').ok,false);
  assert.equal(G.companyUpgrade('testbench').ok,false,'test bench gated');
  const startMoney=a.balance();
  ok(G.companyUpgrade('marketing'),'marketing upgrade');
  assert.equal(a.balance(),startMoney-220);
  ok(G.companyUpgrade('capacity'),'capacity upgrade');
  assert.equal(G.companyJobs().length,4,'queue expands');
  assert.equal(G.companyState().queueSize,4);
  ok(G.companyUpgrade('scanner'),'scanner upgrade');
  assert.equal(G.companyState().upgrades.scanner,1);
  ok(G.companyStart('co-000001'),'start');
  assert.ok(G.companyHint(),'scanner provides practical diagnosis hint');
  assert.equal(G.companyStart('co-000002').ok,false,'one active contract at a time');
  ok(G.companyCancel(),'cancel');
  assert.equal(G.companyState().active,null);
  assert.equal(G.companyClaim('first').ok,false,'cannot claim before completion');
  assert.ok(a.events.includes('zarya:company'));
})();
(function testProgressionAndAchievements(){
  const app=boot(),G=app.G;
  // 30 jobs from all 4 categories: persistent, unlimited enough to rank up.
  for(let i=1;i<=30;i++){
    const jobs=G.companyJobs();
    const id='co-'+String(i).padStart(6,'0');
    assert.ok(jobs.some(j=>j.id===id),'rolling queue should have job '+id);
    complete(G,id);
    assert.equal(G.companyState().completed,i);
    assert.equal(G.companyJobs().length,3,'queue replenished after completion');
  }
  assert.equal(G.companyState().rank.rank,6);
  assert.equal(G.companyState().history.length,30,'history capped');
  assert.ok(G.companyState().mistakes>=2);
  assert.ok(G.companyState().byType.qa>=7);
  assert.equal(app.companyRewards(),30,'exactly one payment per completed job');
  const initialBalance=app.balance();
  const award=G.companyAchievements().find(a=>a.id==='first');
  assert.ok(award.earned);assert.equal(award.claimed,false);
  ok(G.companyClaim('first'),'award');
  assert.equal(app.balance(),initialBalance+60);
  assert.equal(G.companyClaim('first').ok,false,'award cannot be claimed twice');
  assert.equal(G.companyAchievements().length,12);
  assert.equal(G.companyAchievements().find(a=>a.id==='fifty').earned,false);
  ok(G.companyUpgrade('testbench'),'testbench after rank unlock');
  assert.equal(G.companyState().upgrades.testbench,1);
  const qa=G.companyJobs().find(j=>j.type==='qa');
  if(qa){
    ok(G.companyStart(qa.id),'qa');
    assert.equal(G.companySteps().length,2,'better testbench shortens quality tests');
  }
})();
(function testBuildValidation(){
  const {G}=boot();
  ok(G.companyStart('co-000002'),'start build');
  assert.equal(G.companyChoose('cpu','gpu2').ok,false,'wrong slot');
  assert.equal(G.companyBuildReport('co-000002',{cpu:'gpu2'}).ok,false);
  assert.equal(G.companyConfirmBuild().ok,true,'default tier-1 configuration can pass');
  assert.equal(G.companyChoose('cpu','cpu4').ok,false,'cannot change parts mid build');
  assert.equal(G.companyAction('deliver').ok,false,'assembly cannot skip');
  const steps=G.companySteps();
  assert.equal(steps.length,5);
  for(const step of steps)ok(G.companyAction(step[0]),step[0]);
  assert.equal(G.companyState().completed,1);
})();
(function testSaveRestoreAndReset(){
  const data=new Map(),paid=new Set(),achievementPaid=new Set();
  let session=boot({data,paid,achievementPaid});
  ok(session.G.companyRename('Настоящий сервис'),'name');
  complete(session.G,'co-000001');
  ok(session.G.companyStart('co-000002'),'begin assembly');
  assert.equal(session.G.companyState().active.stage,'design');
  session=boot({data,paid,achievementPaid});
  assert.equal(session.G.companyState().name,'Настоящий сервис');
  assert.equal(session.G.companyState().completed,1);
  assert.equal(session.G.companyState().active.stage,'design','active contract persisted');
  assert.equal(session.G.companyJobs().length,3);
  assert.equal(session.G.companyClaim('first').ok,true);
  session.G.reset();
  assert.equal(session.G.companyState().completed,0);
  assert.equal(session.G.companyState().name,'Мастерская ЗАРЯ');
  assert.equal(session.G.companyState().active,null);
  assert.equal(session.G.companyJobs().length,3);
  assert.equal(session.resetCount(),1);
})();
console.log('Zarya OS 2.1: company queues, ranks, building, upgrades, payouts and saves passed.');
