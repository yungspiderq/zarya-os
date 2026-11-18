/* ZARYA OS 2.2.1 — server-authoritative demonstration wallet for FICTIONAL training cases.
 * Zero external dependencies (Node.js >= 20). Does not secure the legacy offline wallet.
 *
 * Important limits:
 *   - Guest sessions are cookie-based; no account authentication or account recovery.
 *   - Client source includes a similar puzzle generator, so it is possible to automate
 *     solving. The server validates the report and awards, not human originality.
 *   - Other Zarya OS activities still pay the local (unverified) wallet.
 */
'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DATA = path.join(__dirname, 'data', 'verified-state.json');
const SESSION_COOKIE = 'zarya_verified_sid';
const CASES = [
  { id:'op01', name:'Ночной пакет', asset:'POLAR-RELEASE-4', decoy:'POLAR-CACHE-0', mode:'observe' },
  { id:'op02', name:'Двойной архив', asset:'BEACON-ARCHIVE-21', decoy:'BEACON-ARCHIVE-12', mode:'restore' },
  { id:'op03', name:'Незнакомый маршрут', asset:'LYRA-ROUTE-6', decoy:'LYRA-ROUTE-9', mode:'contain' },
  { id:'op04', name:'Тихая синхронизация', asset:'CASCADE-META-11', decoy:'CASCADE-META-10', mode:'observe' },
  { id:'op05', name:'Подмена метки', asset:'SPECTRUM-INDEX-44', decoy:'SPECTRUM-INDEX-04', mode:'contain' },
  { id:'op06', name:'Старая копия', asset:'ORBIT-SNAPSHOT-8', decoy:'ORBIT-SNAPSHOT-3', mode:'restore' },
  { id:'op07', name:'Сигнал из тени', asset:'HELIOS-EVENT-73', decoy:'HELIOS-EVENT-37', mode:'contain' },
  { id:'op08', name:'Контрольная точка', asset:'ZARYA-CHECKPOINT-12', decoy:'ZARYA-CHECKPOINT-21', mode:'observe' }
];
const TYPES = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.json':'application/json; charset=utf-8'};
const CATALOG = [
  {id:'bronze',name:'Бронзовый сертификат аналитика',price:120},
  {id:'silver',name:'Серебряный сертификат аналитика',price:480},
  {id:'gold',name:'Золотой сертификат аналитика',price:1200}
];
const MAX_BODY = 4096;
const LIMIT_PER_MINUTE = 100;
const MAX_SESSIONS = 10000;

function randomId() { return crypto.randomBytes(32).toString('hex'); }
function error(code, message, status=400) {
  return {ok:false, code, message, status};
}
function safeObject(obj) { return obj && typeof obj==='object' && !Array.isArray(obj); }
function caseIndex(id) { return CASES.findIndex(c=>c.id===id); }
function nodeIds(index) {
  const n=String(10+index*2).padStart(2,'0');
  const m=String(11+index*2).padStart(2,'0');
  return [
    {id:'GW-'+n,zone:'edge',monitor:1},
    {id:'GW-'+m,zone:'edge',monitor:2},
    {id:'SW-'+n,zone:'relay',monitor:2},
    {id:'SW-'+m,zone:'relay',monitor:3},
    {id:'DB-'+n,zone:'store',monitor:2},
    {id:'DB-'+m,zone:'store',monitor:3}
  ];
}
function makeActive(index) {
  const correctBits=Array.from({length:3},()=>crypto.randomInt(2));
  const nodes=nodeIds(index);
  const correct=['edge','relay','store'].map((zone,i)=>
    nodes.filter(n=>n.zone===zone)[correctBits[i]].id);
  const decoy=['edge','relay','store'].map((zone,i)=>
    nodes.filter(n=>n.zone===zone)[1-correctBits[i]].id);
  return {id:CASES[index].id, status:'active', nodes, correct, decoy,
    marker:crypto.randomBytes(3).toString('hex').toUpperCase(),
    falseMarker:crypto.randomBytes(3).toString('hex').toUpperCase(),
    opened:[],turns:0,exposure:0,errors:0};
}
function publicActive(current) {
  if(!current)return null;
  return {
    id:current.id,status:current.status,opened:current.opened.slice(),
    turns:current.turns,exposure:current.exposure,errors:current.errors,
    turnLimit:15,exposureLimit:85,
    nodes:current.nodes.map(n=>({id:n.id,zone:n.zone,monitor:n.monitor}))
  };
}
function readEvidence(current,node) {
  const index=caseIndex(current.id),c=CASES[index];
  const i=['edge','relay','store'].indexOf(node.zone);
  const genuine=current.correct[i]===node.id;
  const chain=genuine?current.correct:current.decoy;
  const marker=genuine?current.marker:current.falseMarker;
  const asset=genuine?c.asset:c.decoy;
  let event;
  if(i===0) event='ROUTE event='+marker+' forwarded_to='+chain[1];
  else if(i===1) event='HOP event='+marker+' received_from='+chain[0]+' sent_to='+chain[2];
  else event='RECORD event='+marker+' object='+asset+' origin='+chain[1];
  return {
    node:node.id,zone:node.zone,
    lines:[
      '[23:00] SYSTEM node='+node.id+' online=1',
      '[23:04] '+event,
      '[23:11] WATCH monitor='+node.monitor+' integrity=logged',
      '[23:19] HEARTBEAT sequence='+String(index*13+i*4+Number(genuine))
    ]
  };
}
function readDb(file) {
  if(!fs.existsSync(file))return {schema:1,sessions:{}};
  const raw=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!safeObject(raw)||raw.schema!==1||!safeObject(raw.sessions))
    throw new Error('Verified session database has an unsupported structure; not resetting it.');
  return raw;
}
function persist(file,data) {
  const directory=path.dirname(file);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const temp=file+'.tmp-'+process.pid+'-'+crypto.randomBytes(4).toString('hex');
  try {
    fs.writeFileSync(temp,JSON.stringify(data),{mode:0o600,flag:'wx'});
    fs.renameSync(temp,file);
  } finally {
    try{fs.rmSync(temp,{force:true});}catch(e){}
  }
}
function publicCases(session) {
  return CASES.map((c,i)=>({
    id:c.id,name:c.name,asset:c.asset,
    reward:170+i*85,
    status:session.completed.includes(c.id)?'done':
      session.active&&session.active.id===c.id?'active':
      i>0&&!session.completed.includes(CASES[i-1].id)?'locked':'available'
  }));
}
function publicState(session) {
  return {
    ok:true,verified:true,backend:'Zarya OS Server Wallet 2.2.1',
    verifiedBalance:session.balance,completed:session.completed.slice(),
    catalog:CATALOG.map(c=>({...c})),owned:(session.owned||[]).slice(),
    cases:publicCases(session),active:publicActive(session.active),
    ledger:session.ledger.slice(-15).map(x=>({...x}))
  };
}
function record(session,type,caseId,detail) {
  session.ledger.push({type,caseId:caseId||null,detail:String(detail||'').slice(0,90),
    at:Date.now()});
  session.ledger=session.ledger.slice(-40);
}
function failIfExceeded(session) {
  const a=session.active;
  if(a&&a.status==='active' && (a.turns>15||a.exposure>=85||a.errors>=3)){
    a.status='failed';
    record(session,'failed',a.id,'Risk, time or error limit exceeded');
    return true;
  }
  return false;
}
function cookieId(req) {
  const raw=req.headers.cookie||'';
  const found=raw.match(/(?:^|;\s*)zarya_verified_sid=([a-f0-9]{64})(?:;|$)/);
  return found?found[1]:null;
}
function json(res,status,obj,headers) {
  res.writeHead(status,Object.assign({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'same-origin','Vary':'Cookie'
  },headers||{}));
  res.end(JSON.stringify(obj));
}
function requestBody(req){
  return new Promise((resolve,reject)=>{
    let raw='',size=0,finished=false;
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>MAX_BODY){
        if(!finished){finished=true;reject(error('body_too_large','Request exceeds 4 KB.',413));}
        return;
      }
      raw+=chunk;
    });
    req.on('end',()=>{
      if(finished)return;
      try{
        const parsed=JSON.parse(raw);
        if(!safeObject(parsed))throw Error('not object');
        resolve(parsed);
      }catch(e){reject(error('invalid_json','Expected a small JSON object.',400));}
    });
    req.on('error',()=>{if(!finished)reject(error('request_failed','Failed to read request.',400));});
  });
}
function sessionFor(req,res,db,persistDb,secureCookies) {
  let id=cookieId(req),session=id&&Object.hasOwn(db.sessions,id)?db.sessions[id]:null;
  if(!session){
    if(Object.keys(db.sessions).length>=MAX_SESSIONS)
      return null;
    id=randomId();
    session={created:Date.now(),balance:0,completed:[],owned:[],ledger:[],active:null};
    db.sessions[id]=session;
    persistDb();
    const secure=secureCookies?'; Secure':'';
    res.setHeader('Set-Cookie',SESSION_COOKIE+'='+id+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000'+secure);
  }
  return session;
}
function evaluate(session,action,input) {
  if(action==='purchase') {
    const item=typeof input.id==='string'&&CATALOG.find(c=>c.id===input.id);
    if(!item)return error('unknown_item','Not a verified catalog item.',400);
    if(!Array.isArray(session.owned))session.owned=[];
    if(session.owned.includes(item.id))return error('already_owned','Certificate already owned.',409);
    if(session.balance<item.price)return error('insufficient_credits','Not enough verified credits.',422);
    // Server-fixed price and owned state; client price and localStorage are ignored.
    session.balance-=item.price;
    session.owned.push(item.id);
    record(session,'purchase',null,item.id+' (-'+item.price+' credits)');
    return {ok:true,item:item.id,verifiedBalance:session.balance,
      message:'Certificate purchased using server credits.'};
  }
  const a=session.active;
  if(action==='start'){
    const id=input.id;
    const index=typeof id==='string'?caseIndex(id):-1;
    if(index<0)return error('unknown_case','Unknown case.');
    if(session.completed.includes(id))return error('already_paid','Case completed and rewarded already.',409);
    if(a&&a.status==='active')return error('active_case','Finish the active case first.',409);
    if(index>0&&!session.completed.includes(CASES[index-1].id))
      return error('case_locked','Complete the preceding case first.',409);
    session.active=makeActive(index);
    record(session,'start',id,'Case opened');
    return {ok:true,message:'Case started.',active:publicActive(session.active)};
  }
  if(!a||a.status!=='active')return error('no_active_case','Start an available case first.',409);
  if(action==='inspect'){
    const node=typeof input.node==='string'&&a.nodes.find(x=>x.id===input.node);
    if(!node)return error('invalid_node','Unknown node.',400);
    if(!a.opened.includes(node.id)){
      a.opened.push(node.id);
      a.turns++;
      a.exposure+=2+node.monitor*2;
    }
    if(failIfExceeded(session))return error('case_failed','Time or risk exceeded.',422);
    record(session,'inspect',a.id,node.id);
    return {ok:true,evidence:readEvidence(a,node),active:publicActive(a)};
  }
  if(action==='report'){
    if(a.opened.length<4)return error('not_enough_evidence','Inspect at least four different nodes.',422);
    const route=input.route;
    if(!safeObject(route)||typeof input.marker!=='string'||input.marker.length>40||
        typeof input.mode!=='string'||input.mode.length>20||
        ['edge','relay','store'].some(zone=>
          typeof route[zone]!=='string'||route[zone].length>20||
          !a.opened.includes(route[zone])||
          !a.nodes.some(n=>n.zone===zone&&n.id===route[zone])))
      return error('incomplete_report','Use inspected nodes in each segment and a valid marker/mode.',422);
    const correct=input.marker===a.marker &&
      input.mode===CASES[caseIndex(a.id)].mode &&
      ['edge','relay','store'].every((zone,i)=>route[zone]===a.correct[i]);
    if(!correct){
      a.errors++;
      a.turns+=2;
      a.exposure+=14;
      record(session,'rejected',a.id,'Evidence does not support the report');
      if(failIfExceeded(session))return error('case_failed','Case failed after repeated unsupported reports.',422);
      return error('invalid_evidence','Report rejected; no reward was credited.',422);
    }
    const index=caseIndex(a.id),reward=170+85*index;
    // This is the ONLY credit mutation in the verified wallet; never accept
    // arbitrary amounts, client-provided rewards, balances or receipt IDs.
    if(session.completed.includes(a.id))return error('already_paid','Case already rewarded.',409);
    session.balance+=reward;
    session.completed.push(a.id);
    record(session,'reward',a.id,'+'+reward+' verified credits');
    session.active=null;
    return {ok:true,reward,verifiedBalance:session.balance,
      message:'Server accepted case and credited the verified wallet.'};
  }
  return error('unsupported_action','Unknown action.',404);
}
function staticFilePath(urlPath) {
  let decoded;
  try{decoded=decodeURIComponent(urlPath);}catch(e){return null;}
  if(decoded==='/'||decoded==='/index.html')return path.join(ROOT,'index.html');
  // No server source, .git, tests or user data are reachable as static assets.
  if(!/^\/(js|css|docs)\/[a-zA-Z0-9_.\/-]+$/.test(decoded) ||
      decoded.includes('..')||decoded.includes('//'))return null;
  const target=path.resolve(ROOT,'.'+decoded);
  if(!target.startsWith(ROOT+path.sep))return null;
  return target;
}
function createVerifiedServer(options={}){
  const file=path.resolve(options.stateFile||process.env.ZARYA_STATE_FILE||DEFAULT_DATA);
  const db=readDb(file);
  const persistDb=()=>persist(file,db);
  const publicOrigin=options.publicOrigin||process.env.ZARYA_PUBLIC_ORIGIN||null;
  const secureCookies=options.secureCookies===undefined?process.env.ZARYA_SECURE_COOKIES==='1':
    !!options.secureCookies;
  const limits=new Map();
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      const pathname=url.pathname;
      if(pathname==='/api/verified/health'){
        if(req.method!=='GET')return json(res,405,error('method','GET only.',405));
        return json(res,200,{ok:true,verified:true,
          description:'Server wallet for verified fictional operations only.'});
      }
      if(pathname.startsWith('/api/verified/')){
        if(req.method!=='GET'&&req.method!=='POST')
          return json(res,405,error('method','GET or POST only.',405));
        const limiterId=req.socket.remoteAddress||'unknown',now=Date.now();
        const old=limits.get(limiterId);
        const info=old&&now-old.started<60000?old:{started:now,count:0};
        info.count++;
        limits.set(limiterId,info);
        if(info.count>LIMIT_PER_MINUTE)return json(res,429,error('rate_limited','Try again later.',429));
        if(req.method==='POST'){
          const origin=req.headers.origin;
          const expected=publicOrigin || 'http://'+req.headers.host;
          if(!origin || origin!==expected)
            return json(res,403,error('origin','Same-origin requests only.',403));
          if(!String(req.headers['content-type']||'').startsWith('application/json'))
            return json(res,415,error('content_type','JSON required.',415));
        }
        const session=sessionFor(req,res,db,persistDb,secureCookies);
        if(!session)return json(res,503,error('capacity','Server session capacity reached.',503));
        if(pathname==='/api/verified/state'&&req.method==='GET')
          return json(res,200,publicState(session));
        if(req.method==='POST'&&['start','inspect','report','purchase'].some(s=>pathname==='/api/verified/'+s)){
          const input=await requestBody(req);
          const action=pathname.slice('/api/verified/'.length);
          const result=evaluate(session,action,input);
          // Persist failed attempts, inspection logs, and credits before replying.
          persistDb();
          return json(res,result.status||200,result);
        }
        return json(res,404,error('not_found','Unsupported endpoint.',404));
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,error('method','Not allowed.',405));
      const filePath=staticFilePath(pathname);
      if(!filePath)return json(res,404,error('not_found','Not a public game asset.',404));
      let stat;
      try{stat=fs.statSync(filePath);}catch(e){return json(res,404,error('not_found','Not found.',404));}
      const ext=path.extname(filePath).toLowerCase();
      if(!stat.isFile()||!TYPES[ext])return json(res,404,error('not_found','Not public.',404));
      res.writeHead(200,{
        'Content-Type':TYPES[ext], 'X-Content-Type-Options':'nosniff',
        'Referrer-Policy':'same-origin',
        'Cache-Control':'no-store'
      });
      if(req.method==='HEAD')return res.end();
      fs.createReadStream(filePath).pipe(res);
    }catch(e){
      const known=e&&e.status;
      json(res,known||500,known?e:error('server_error','Unexpected server error.',500));
    }
  });
  return server;
}
module.exports={createVerifiedServer};
if(require.main===module){
  const host=process.env.HOST||'127.0.0.1';
  const port=Number(process.env.PORT||8787);
  createVerifiedServer().listen(port,host,function(){
    console.log('ЗАРЯ Verified Lab: http://'+host+':'+this.address().port+'/');
    console.log('Server-verified case credits are separate from local offline credits.');
  });
}
