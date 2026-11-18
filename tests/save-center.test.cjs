/* ZARYA OS 2.0 — secure, offline-only backup compatibility tests. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','js','save-center.js'),'utf8');
function boot(opts={}){
  const data=opts.data||new Map();
  let failKey=opts.failKey||null;
  const localStorage={
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>{
      if(key===failKey){failKey=null;throw new Error('Quota exceeded');}
      data.set(key,String(value));
    },
    removeItem:key=>data.delete(key)
  };
  const window={APPS:{},APPICONS:{}};
  vm.runInNewContext(source,{
    window,localStorage,JSON,Date,Math,Object,Array,
    setTimeout:()=>{}
  },{filename:'save-center.js'});
  return {Core:window.SaveCenterCore,data,window};
}
const initial=new Map([
  ['zarya.seen','1'],
  ['zarya.settings.v2',JSON.stringify({theme:'dark',accent:'blue'})],
  ['zarya.fs.v3',JSON.stringify({nodes:[],notes:{}})],
  ['zarya.game.v1',JSON.stringify({v:1,money:400,rep:2})],
  ['zarya.components.v2',JSON.stringify({v:2,inventory:['cpu2']})],
  ['zarya.company.v1',JSON.stringify({v:1,name:'Мастерская',completed:5})],
  ['not-zarya-account',JSON.stringify({secret:'not part of game'})]
]);
(function testBackupExportAndValidation(){
  const {Core,data,window}=boot({data:new Map(initial)});
  assert.ok(window.APPS['save-center']);
  assert.equal(Core.getSummary().count,6);
  const blob=Core.makeBackup();
  const json=JSON.parse(blob);
  assert.equal(json.format,'zarya-os-save');
  assert.equal(json.schema,1);
  assert.equal(json.version,'2.1.0');
  assert.equal(Object.keys(json.data).length,6);
  assert.equal(json.data['not-zarya-account'],undefined,'unrelated storage cannot leak into export');
  assert.equal(json.data['zarya.seen'],'1','welcome state is included');
  const validated=Core.validate(blob);
  assert.equal(validated.ok,true);
  assert.equal(validated.count,6);
  assert.equal(validated.data['zarya.game.v1'],data.get('zarya.game.v1'));
  const invalidWelcome=JSON.parse(blob);
  invalidWelcome.data['zarya.seen']='unexpected';
  assert.equal(Core.validate(JSON.stringify(invalidWelcome)).ok,false,'invalid welcome flag rejected');
  assert.equal(Core.validate('{').ok,false,'bad JSON rejected');
  assert.equal(Core.validate('').ok,false,'blank file rejected');
  assert.equal(Core.validate('x'.repeat(3*1024*1024+1)).ok,false,'oversize rejected');
  const unknown=JSON.parse(blob);
  unknown.data['unexpected-key']='{"v":1}';
  assert.equal(Core.validate(JSON.stringify(unknown)).ok,false,'unexpected localStorage keys rejected');
  const wrongVersion=JSON.parse(blob);
  wrongVersion.data['zarya.company.v1']='{"v":3}';
  assert.equal(Core.validate(JSON.stringify(wrongVersion)).ok,false,'future schema rejected');
  const broken=JSON.parse(blob);
  broken.data['zarya.game.v1']='invalid json';
  assert.equal(Core.validate(JSON.stringify(broken)).ok,false,'invalid embedded JSON rejected');
})();
(function testSafeRestoreAndIsolation(){
  const source=boot({data:new Map(initial)});
  const payload=source.Core.validate(source.Core.makeBackup());
  assert.equal(payload.restorable,true);
  const data=new Map([
    ['zarya.settings.v2',JSON.stringify({theme:'light'})],
    ['zarya.game.v1',JSON.stringify({v:1,money:0})],
    ['zarya.market.v1',JSON.stringify({v:1,purchased:['gpu4']})],
    ['not-zarya-account',JSON.stringify({secret:'keep this'})]
  ]);
  const target=boot({data});
  assert.equal(target.Core.restore({ok:false}).ok,false);
  assert.equal(target.Core.restore(payload).ok,true);
  assert.equal(data.get('zarya.settings.v2'),source.data.get('zarya.settings.v2'),'only settings restore');
  assert.equal(JSON.parse(data.get('zarya.game.v1')).money,0,'currency must not import');
  assert.equal(data.has('zarya.market.v1'),true,'market data must not be changed');
  assert.equal(data.get('not-zarya-account'),JSON.stringify({secret:'keep this'}),'unrelated data untouched');
  const forged=JSON.parse(source.Core.makeBackup());
  forged.data['zarya.game.v1']='{"v":1,"money":999999999}';
  const apparentlyValid=target.Core.validate(JSON.stringify(forged));
  assert.equal(apparentlyValid.ok,true,'syntactically valid edited backup');
  assert.equal(target.Core.restore(apparentlyValid).ok,true);
  assert.equal(JSON.parse(data.get('zarya.game.v1')).money,0,'forged money ignored on import');
  const gameOnly=target.Core.validate(JSON.stringify({
    format:'zarya-os-save',schema:1,version:'2.1.0',data:{'zarya.game.v1':'{"v":1,"money":99999}'}
  }));
  assert.equal(gameOnly.ok,true);
  assert.equal(gameOnly.restorable,false);
  assert.equal(target.Core.restore(gameOnly).ok,false,'gameplay-only archive cannot import');
})();
(function testSettingsFailureDoesNotOverwriteEconomy(){
  const data=new Map(initial),original=new Map(data);
  const source=boot({data:new Map(initial)});
  const payload=source.Core.validate(source.Core.makeBackup());
  const target=boot({data,failKey:'zarya.settings.v2'});
  assert.equal(target.Core.restore(payload).ok,false);
  for(const [key,value] of original)assert.equal(data.get(key),value,'no modified data: '+key);
})();
console.log('Zarya OS 2.1: save backups, key allowlist, validation and rollback passed.');
