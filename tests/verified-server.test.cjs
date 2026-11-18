/* Zarya OS 2.2.1 server wallet integration — Node 20, no external packages. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createVerifiedServer}=require('../server/verified-server.cjs');

const CAUSES=['observe','restore','contain','observe','contain','restore','contain','observe'];
const ASSETS=[
 'POLAR-RELEASE-4','BEACON-ARCHIVE-21','LYRA-ROUTE-6',
 'CASCADE-META-11','SPECTRUM-INDEX-44','ORBIT-SNAPSHOT-8',
 'HELIOS-EVENT-73','ZARYA-CHECKPOINT-12'
];

async function launch(file) {
  const server=createVerifiedServer({stateFile:file});
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  return {server,url:'http://127.0.0.1:'+server.address().port};
}
async function shutdown(server){
  await new Promise(resolve=>server.close(resolve));
}
async function run(){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'zarya-verified-'));
  const db=path.join(folder,'state.json');
  let node=await launch(db);
  let base=node.url,cookie='';
  async function req(endpoint,opts={}){
    const headers=Object.assign({},opts.headers);
    if(cookie)headers.Cookie=cookie;
    if(opts.body!==undefined){
      headers['Content-Type']=headers['Content-Type']||'application/json';
      headers.Origin=opts.origin===undefined?base:opts.origin;
    }
    const response=await fetch(base+endpoint,{
      method:opts.body===undefined?'GET':'POST',
      headers,
      body:opts.body===undefined?undefined:JSON.stringify(opts.body)
    });
    const setCookie=response.headers.get('set-cookie');
    if(setCookie && opts.keepCookie!==false)cookie=setCookie.split(';',1)[0];
    const json=await response.json().catch(()=>null);
    return {status:response.status,body:json,setCookie};
  }
  const clean=async(endpoint,opts)=>{
    const res=await req(endpoint,opts);
    assert.equal(res.status,200,endpoint+': '+JSON.stringify(res.body));
    assert.equal(res.body.ok,true,endpoint);
    return res.body;
  };
  try{
    const index=await fetch(base+'/');
    assert.equal(index.status,200);
    assert.match(await index.text(),/ZАРЯ/);
    const forbidden=await req('/server/verified-server.cjs');
    assert.equal(forbidden.status,404,'server source not published as static');
    const apiHealth=await clean('/api/verified/health');
    assert.equal(apiHealth.verified,true);
    const initial=await clean('/api/verified/state');
    assert.match(cookie,/^zarya_verified_sid=[a-f0-9]{64}$/);
    assert.equal(initial.verifiedBalance,0);
    assert.equal(initial.cases.length,8);
    assert.equal(initial.completed.length,0);
    assert.equal(initial.catalog.length,3);
    assert.deepEqual(initial.owned,[]);
    assert.equal((await req('/api/verified/award',{body:{amount:500000000}})).status,404);
    assert.equal((await req('/api/verified/start',{body:{id:'op01'},origin:'https://attacker.invalid'})).status,403);
    assert.equal((await req('/api/verified/purchase',{body:{id:'gold',price:0}})).status,422);
    assert.equal((await req('/api/verified/report',{body:{marker:'X',route:{},mode:'observe'}})).status,409);

    let total=0;
    for(let i=0;i<8;i++){
      const id='op'+String(i+1).padStart(2,'0');
      const started=await clean('/api/verified/start',{body:{id}});
      assert.equal(started.active.id,id);
      assert.equal(started.active.nodes.length,6);
      assert.equal(started.active.opened.length,0);
      const evidence=[];
      for(const node of started.active.nodes){
        const inspected=await clean('/api/verified/inspect',{body:{node:node.id}});
        evidence.push(inspected.evidence);
      }
      const matching=evidence.find(item=>item.zone==='store' &&
        item.lines.some(x=>x.includes('object='+ASSETS[i])));
      assert.ok(matching,'evidence must identify target object, '+id);
      const event=matching.lines.join('\n').match(/RECORD event=([A-Z0-9]+)/);
      assert.ok(event);
      const marker=event[1];
      const route={store:matching.node};
      for(const zone of ['edge','relay']){
        const match=evidence.find(item=>item.zone===zone &&
          item.lines.some(line=>line.includes('event='+marker)));
        assert.ok(match,'matching node in '+zone+' for '+id);
        route[zone]=match.node;
      }
      if(i===0){
        const forged=await req('/api/verified/report',{
          body:{marker:'NOT-REAL',route,mode:CAUSES[i],amount:500000000}
        });
        assert.equal(forged.status,422);
        assert.equal((await clean('/api/verified/state')).verifiedBalance,0);
      }
      const reward=await clean('/api/verified/report',{
        body:{marker,route,mode:CAUSES[i],amount:500000000,
          verifiedBalance:999999999,payout:999999999}
      });
      total+=170+i*85;
      assert.equal(reward.reward,170+i*85,'server fixes payout based on case');
      assert.equal(reward.verifiedBalance,total);
      const again=await req('/api/verified/report',{body:{marker,route,mode:CAUSES[i]}});
      assert.equal(again.status,409,'repeat receipt cannot credit wallet');
      const state=await clean('/api/verified/state');
      assert.equal(state.verifiedBalance,total);
      assert.equal(state.completed.length,i+1);
    }
    const beforePurchase=await clean('/api/verified/state');
    assert.equal(beforePurchase.verifiedBalance,total);
    const cert=beforePurchase.catalog.find(c=>c.id==='gold');
    assert.equal(cert.price,1200);
    const purchase=await clean('/api/verified/purchase',{body:{id:'gold',price:0,discount:100}});
    assert.equal(purchase.verifiedBalance,total-1200,'server does not accept fake price');
    assert.equal((await req('/api/verified/purchase',{body:{id:'gold'}})).status,409);
    assert.equal((await req('/api/verified/purchase',{body:{id:'not-real'}})).status,400);
    const afterPurchase=await clean('/api/verified/state');
    assert.ok(afterPurchase.owned.includes('gold'));
    assert.equal(afterPurchase.verifiedBalance,total-1200);
    assert.ok(afterPurchase.ledger.some(x=>x.type==='purchase'));
    const savedCookie=cookie;
    await shutdown(node.server);
    node=await launch(db);base=node.url;
    cookie=savedCookie;
    const afterRestart=await clean('/api/verified/state');
    assert.equal(afterRestart.verifiedBalance,total-1200,'server restart retains balance');
    assert.equal(afterRestart.completed.length,8);
    assert.ok(afterRestart.owned.includes('gold'));
    cookie='';
    const otherSession=await clean('/api/verified/state');
    assert.equal(otherSession.verifiedBalance,0,'other browser cannot copy original money');
    assert.equal(otherSession.completed.length,0);
    assert.equal((await req('/api/verified/purchase',{body:{id:'gold',price:0}})).status,422);
    const persisted=JSON.parse(fs.readFileSync(db,'utf8'));
    assert.equal(Object.keys(persisted.sessions).length,2);
    console.log('Zarya OS 2.2.1: server-only rewards, ledger, purchase pricing, guest separation, persistence and CSRF passed.');
  }finally{
    await shutdown(node.server).catch(()=>{});
    fs.rmSync(folder,{recursive:true,force:true});
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
