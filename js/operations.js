/* ЗАРЯ OS 2.2 — Operations Lab.
 * Fictional, offline-only network deduction game: no sockets, requests, exploitation or real targets.
 */
(function () {
  'use strict';
  const G=window.Game;
  const KEY='zarya.ops.v1';
  const ZONES=[
    {id:'edge',label:'Периметр',prefix:'GW'},
    {id:'relay',label:'Внутренний сегмент',prefix:'SW'},
    {id:'store',label:'Хранилище',prefix:'DB'}
  ];
  const MODES=[
    {id:'observe',label:'Сверка цепочки',hint:'Сохранить исходные записи и подтвердить происхождение события'},
    {id:'restore',label:'Проверка восстановления',hint:'Найти маршрут корректной копии и восстановить непротиворечивую запись'},
    {id:'contain',label:'Изоляция тестового инцидента',hint:'Зафиксировать доказательства и изолировать аномалию на стенде'}
  ];
  const CASES=[
    {id:'op01',name:'Ночной пакет',client:'Тестовая студия «Полюс»',
      asset:'POLAR-RELEASE-4',decoy:'POLAR-CACHE-0',mode:'observe',
      brief:'В журнале опубликования есть событие, не совпадающее со временем отчёта. Найди путь именно пакета POLAR-RELEASE-4. Заказчик просит установить происхождение изменения без исправления данных.'},
    {id:'op02',name:'Двойной архив',client:'Проект «Маяк»',
      asset:'BEACON-ARCHIVE-21',decoy:'BEACON-ARCHIVE-12',mode:'restore',
      brief:'В тестовом хранилище две архивные копии. Установи цепочку исходного BEACON-ARCHIVE-21. Клиенту нужна проверка восстановления правильного состояния.'},
    {id:'op03',name:'Незнакомый маршрут',client:'Сервис «Лира»',
      asset:'LYRA-ROUTE-6',decoy:'LYRA-ROUTE-9',mode:'contain',
      brief:'Монитор обнаружил необычный перенос объекта LYRA-ROUTE-6. Установи, через какие внутренние зоны он прошёл, и изолируй виртуальный инцидент после фиксации доказательств.'},
    {id:'op04',name:'Тихая синхронизация',client:'Медиастудия «Каскад»',
      asset:'CASCADE-META-11',decoy:'CASCADE-META-10',mode:'observe',
      brief:'Объект CASCADE-META-11 менялся поздно ночью. Требуется только независимая сверка журналов, без изменения файлов.'},
    {id:'op05',name:'Подмена метки',client:'Лаборатория «Спектр»',
      asset:'SPECTRUM-INDEX-44',decoy:'SPECTRUM-INDEX-04',mode:'contain',
      brief:'Есть подозрение на ложную подпись события SPECTRUM-INDEX-44. Важно доказать цепочку и изолировать аномальное событие в лаборатории.'},
    {id:'op06',name:'Старая копия',client:'Архив «Орбита»',
      asset:'ORBIT-SNAPSHOT-8',decoy:'ORBIT-SNAPSHOT-3',mode:'restore',
      brief:'После сбоя исчезла актуальная копия ORBIT-SNAPSHOT-8. Определи, откуда пришёл корректный экземпляр, и проверь безопасное восстановление.'},
    {id:'op07',name:'Сигнал из тени',client:'Система «Гелиос»',
      asset:'HELIOS-EVENT-73',decoy:'HELIOS-EVENT-37',mode:'contain',
      brief:'В тестовых журналах найдено событие HELIOS-EVENT-73 с неизвестной историей. Установи подтверждённый маршрут и изолируй лабораторную аномалию.'},
    {id:'op08',name:'Контрольная точка',client:'Аудит «Заря»',
      asset:'ZARYA-CHECKPOINT-12',decoy:'ZARYA-CHECKPOINT-21',mode:'observe',
      brief:'Финальный аудит. Несколько похожих событий прошли через разные сегменты. Докажи подлинную цепочку ZARYA-CHECKPOINT-12 и подготовь заключение без изменения доказательств.'}
  ];
  const MARKER_OPTIONS=[
    ['RX-17','RK-34','NX-50'],['DS-12','FK-80','SP-19'],['GX-71','GQ-24','TR-91'],
    ['QZ-61','ZX-15','CT-08'],['LM-72','MN-41','XP-90'],['HG-45','KM-13','YS-66'],
    ['AV-52','UZ-25','PJ-10'],['FA-19','JP-33','BW-88']
  ];
  const VALID_NODE=/^(GW|SW|DB)-[0-9]{2}$/;
  function blueprint(index) {
    const c=CASES[index];
    const mask=[1,6,3,4,2,5,0,7][index];
    const truth=[(mask&1)?1:0,(mask&2)?1:0,(mask&4)?1:0];
    const options=MARKER_OPTIONS[index],correct=options[(index+1)%3];
    const wrong=options[(index+2)%3];
    const names=ZONES.map((zone,j)=>[zone.prefix+'-'+String(10+index*2).padStart(2,'0'),
      zone.prefix+'-'+String(11+index*2).padStart(2,'0')]);
    const answer=names.map((pairs,j)=>pairs[truth[j]]);
    const mirror=names.map((pairs,j)=>pairs[1-truth[j]]);
    const descriptions=[];
    for(let j=0;j<3;j++){
      for(let variant=0;variant<2;variant++){
        const isTrue=variant===truth[j],node=names[j][variant];
        const code=isTrue?correct:wrong,chain=isTrue?answer:mirror;
        const asset=isTrue?c.asset:c.decoy;
        const t=(17+index)%24;
        let line;
        if(j===0)line='['+String(t).padStart(2,'0')+':04] ROUTE event='+code+
          ' forwarded_to='+chain[1]+' flow=authorized-lab';
        else if(j===1)line='['+String(t).padStart(2,'0')+':07] HOP event='+code+
          ' received_from='+chain[0]+' sent_to='+chain[2];
        else line='['+String(t).padStart(2,'0')+':11] RECORD event='+code+
          ' object='+asset+' origin='+chain[1];
        const noise=j===2
          ? '['+String(t).padStart(2,'0')+':12] ARCHIVE status=integrity-check '+(isTrue?'passed':'pending')
          : '['+String(t).padStart(2,'0')+':09] WATCH unrelated-id='+options[index]+' count=2';
        descriptions.push({
          id:node,zone:ZONES[j].id,zoneLabel:ZONES[j].label,
          title:(j===0?'Пограничный журнал':j===1?'Реестр переходов':'Журнал объектов')+
            ' · '+node,
          monitor:1+((index+j+variant)%3),
          lines:[
            '['+String(t).padStart(2,'0')+':00] SYSTEM node='+node+' state=online',
            line,noise,
            '['+String(t).padStart(2,'0')+':20] DEBUG heartbeat='+((index+1)*17+j*7+variant)
          ]
        });
      }
    }
    return {config:c,answer:answer,marker:correct,wrong:wrong,
      markers:options.slice(),nodes:descriptions,zones:ZONES,methods:MODES};
  }
  function fresh() {
    return {v:1,done:[],failed:[],attempts:{},history:[],current:null,confidence:100};
  }
  function load() {
    let state=fresh();
    try {
      const x=JSON.parse(localStorage.getItem(KEY));
      if(x&&x.v===1)state=Object.assign(state,x);
    } catch(e){}
    state.done=Array.isArray(state.done)?state.done.filter(id=>CASES.some(c=>c.id===id)):[];
    state.failed=Array.isArray(state.failed)?state.failed.filter(id=>CASES.some(c=>c.id===id)):[];
    state.history=Array.isArray(state.history)?state.history.filter(x=>x&&CASES.some(c=>c.id===x.id)).slice(-30):[];
    state.attempts=state.attempts&&typeof state.attempts==='object'&&!Array.isArray(state.attempts)?state.attempts:{};
    state.confidence=Number.isInteger(state.confidence)?Math.max(0,Math.min(100,state.confidence)):100;
    const a=state.current;
    if(!a||!CASES.some(c=>c.id===a.id)||state.done.includes(a.id))state.current=null;
    else {
      const idx=CASES.findIndex(c=>c.id===a.id),b=blueprint(idx);
      a.opened=Array.isArray(a.opened)?a.opened.filter(id=>b.nodes.some(n=>n.id===id)):[];
      a.path=a.path&&typeof a.path==='object'&&!Array.isArray(a.path)?a.path:{};
      for(const zone of ZONES)if(!b.nodes.some(n=>n.id===a.path[zone.id]&&n.zone===zone.id))
        delete a.path[zone.id];
      if(!b.markers.includes(a.marker))a.marker=null;
      if(!MODES.some(m=>m.id===a.mode))a.mode=null;
      a.turns=Number.isInteger(a.turns)?Math.min(100,Math.max(0,a.turns)):0;
      a.exposure=Number.isInteger(a.exposure)?Math.min(100,Math.max(0,a.exposure)):0;
      a.errors=Number.isInteger(a.errors)?Math.min(3,Math.max(0,a.errors)):0;
      a.status=a.status==='failed'?'failed':'active';
    }
    return state;
  }
  let st=load();
  function save() {
    try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}
    window.dispatchEvent(new CustomEvent('zarya:ops'));
  }
  function currentBlueprint(){
    if(!st.current)return null;
    return blueprint(CASES.findIndex(c=>c.id===st.current.id));
  }
  function spend(turns,exposure) {
    if(!st.current||st.current.status!=='active')
      return {ok:false,msg:'Нет активной операции.'};
    st.current.turns+=turns;
    st.current.exposure=Math.min(100,st.current.exposure+exposure);
    if(st.current.turns>15||st.current.exposure>=85||st.current.errors>=3) {
      st.current.status='failed';
      if(!st.failed.includes(st.current.id))st.failed.push(st.current.id);
      st.confidence=Math.max(0,st.confidence-10);
      st.history.push({id:st.current.id,success:false,time:Date.now()});
      st.history=st.history.slice(-30);
      save();
      return {ok:false,failed:true,msg:'Операция сорвана: превышен лимит действий, риска или ошибок. Уверенность команды −10.'};
    }
    save();return null;
  }
  function publicBrief(c) {
    const i=CASES.indexOf(c),b=blueprint(i);
    return {
      id:c.id,name:c.name,client:c.client,asset:c.asset,brief:c.brief,
      reward:170+i*85,level:i+1,
      status:st.done.includes(c.id)?'done':st.current&&st.current.id===c.id?'active':
        i>0&&!st.done.includes(CASES[i-1].id)?'locked':'available',
      markerOptions:b.markers.slice(),nodes:b.nodes.map(x=>({
        id:x.id,zone:x.zone,label:x.zoneLabel,monitor:x.monitor,title:x.title
      })),modes:MODES.map(x=>Object.assign({},x))
    };
  }
  G.opsCases=function(){return CASES.map(publicBrief);};
  G.opsState=function() {
    const a=st.current;
    return {completed:st.done.length,total:CASES.length,confidence:st.confidence,
      failed:st.failed.length,
      current:a?{
        id:a.id,opened:a.opened.slice(),path:Object.assign({},a.path),
        marker:a.marker,mode:a.mode,turns:a.turns,exposure:a.exposure,
        errors:a.errors,status:a.status,turnLimit:15,exposureLimit:85
      }:null,
      history:st.history.map(x=>Object.assign({},x))
    };
  };
  G.opsStart=function(id) {
    const c=CASES.find(x=>x.id===id);
    if(!c)return {ok:false,msg:'Операция не найдена.'};
    if(st.current&&st.current.status==='active')return {ok:false,msg:'Сначала заверши текущую операцию.'};
    const i=CASES.indexOf(c);
    if(i>0&&!st.done.includes(CASES[i-1].id))return {ok:false,msg:'Сначала заверши предыдущую операцию.'};
    if(st.done.includes(id))return {ok:false,msg:'Этот кейс уже завершён.'};
    st.current={id:id,status:'active',opened:[],path:{},marker:null,mode:null,turns:0,exposure:0,errors:0};
    st.attempts[id]=(Number(st.attempts[id])||0)+1;
    save();return {ok:true,msg:'Операция открыта. Сначала собери и сопоставь журналы.'};
  };
  G.opsInspect=function(nodeId) {
    const b=currentBlueprint(),a=st.current;
    if(!b||!a||a.status!=='active')return {ok:false,msg:'Начни доступную операцию.'};
    const n=b.nodes.find(x=>x.id===nodeId);
    if(!n)return {ok:false,msg:'Узла с таким обозначением нет в стенде.'};
    if(!a.opened.includes(nodeId)){
      a.opened.push(nodeId);
      const failed=spend(1,2+n.monitor*2);
      if(failed)return failed;
    }
    return {ok:true,msg:'Журнал '+n.id+' открыт.',title:n.title,lines:n.lines.slice()};
  };
  G.opsEvidence=function(nodeId) {
    const b=currentBlueprint(),a=st.current;
    if(!b||!a||!a.opened.includes(nodeId))return null;
    const n=b.nodes.find(x=>x.id===nodeId);
    return n?{id:n.id,title:n.title,lines:n.lines.slice()}:null;
  };
  G.opsSetMarker=function(value){
    const b=currentBlueprint(),a=st.current;
    if(!b||!a||a.status!=='active')return {ok:false,msg:'Нет доступной операции.'};
    if(!b.markers.includes(value))return {ok:false,msg:'Такого корреляционного маркера нет в этой операции.'};
    a.marker=value;save();return {ok:true,msg:'Рабочая гипотеза сохранена: '+value+'.'};
  };
  G.opsSetNode=function(zone,id) {
    const b=currentBlueprint(),a=st.current;
    if(!b||!a||a.status!=='active')return {ok:false,msg:'Нет доступной операции.'};
    if(!ZONES.some(x=>x.id===zone)||!b.nodes.some(x=>x.id===id&&x.zone===zone))
      return {ok:false,msg:'Неверный узел для выбранного сегмента.'};
    a.path[zone]=id;save();return {ok:true,msg:'Маршрут обновлён: '+zone+' → '+id+'.'};
  };
  G.opsSetMode=function(id){
    const a=st.current;
    if(!a||a.status!=='active')return {ok:false,msg:'Сначала открой операцию.'};
    if(!MODES.some(x=>x.id===id))return {ok:false,msg:'Режим неизвестен.'};
    a.mode=id;save();return {ok:true,msg:'Режим отчёта выбран.'};
  };
  G.opsQuietCheck=function(){
    const a=st.current;
    if(!a||a.status!=='active')return {ok:false,msg:'Нет активной операции.'};
    const result=spend(2,-0);
    if(result)return result;
    a.exposure=Math.max(0,a.exposure-12);
    save();return {ok:true,msg:'Пауза на анализ: риск обнаружения −12, затрачено 2 действия.'};
  };
  G.opsSubmit=function() {
    const a=st.current,b=currentBlueprint();
    if(!a||!b||a.status!=='active')return {ok:false,msg:'Нет подготовленного отчёта.'};
    if(a.opened.length<4)return {ok:false,msg:'Проверь минимум четыре независимых журнала перед заключением.'};
    if(!a.marker||!a.mode||ZONES.some(z=>!a.path[z.id]))
      return {ok:false,msg:'Нужно указать маркер, три узла цепочки и режим работы.'};
    if(ZONES.some(z=>!a.opened.includes(a.path[z.id])))
      return {ok:false,msg:'Нельзя ссылаться на сегмент, журнал которого не исследован.'};
    const correct=a.marker===b.marker&&a.mode===b.config.mode &&
      ZONES.every((z,i)=>a.path[z.id]===b.answer[i]);
    if(!correct){
      a.errors++;
      const failed=spend(2,14);
      if(failed)return failed;
      return {ok:false,msg:'Цепочка событий не подтверждена. Проверь совпадение маркера, происхождение объекта и поручение клиента. Ошибок: '+a.errors+'/3.'};
    }
    const i=CASES.indexOf(b.config),reward=170+i*85;
    const paid=G.awardSimulationCase('sim-'+String(i+1).padStart(2,'0'),reward);
    if(!paid.ok&&!paid.alreadyPaid)return paid;
    const perfect=a.errors===0&&a.exposure<55;
    st.done.push(a.id);
    st.history.push({id:a.id,success:true,perfect:perfect,time:Date.now(),
      turns:a.turns,exposure:a.exposure});
    st.history=st.history.slice(-30);
    st.confidence=Math.min(100,st.confidence+(perfect?4:2));
    st.current=null;
    save();
    return {ok:true,completed:true,reward:paid.ok?reward:0,
      msg:'Цепочка доказана. '+(perfect?'Чистая операция! ':'')+'+'+(paid.ok?reward:0)+' ₡. Следующий кейс открыт.'};
  };
  G.opsCommand=function(args) {
    if(!Array.isArray(args)||!args.length)return {
      ok:true,msg:'Тренировочный стенд: ops list | ops start op01 | ops status | ops inspect GW-10 | ops marker RX-17 | ops route edge GW-10 | ops mode observe | ops submit'};
    const cmd=String(args[0]).toLowerCase();
    if(cmd==='list'){
      return {ok:true,msg:G.opsCases().map(c=>'['+c.id+'] '+c.name+' · '+c.status).join('\n')};
    }
    if(cmd==='status'){
      const st=G.opsState(),a=st.current;
      return {ok:true,msg:a?'Операция '+a.id+' · проверено '+a.opened.length+'/6 журналов · действий '+a.turns+'/15 · риск '+a.exposure+'/85 · ошибок '+a.errors+'/3':
        'Сейчас нет активной операции. Прогресс '+st.completed+'/'+st.total+'.'};
    }
    if(cmd==='start')return G.opsStart(String(args[1]||''));
    if(cmd==='inspect'){
      const r=G.opsInspect(String(args[1]||''));
      if(r.ok)r.msg+='\n'+r.lines.join('\n');
      return r;
    }
    if(cmd==='marker')return G.opsSetMarker(String(args[1]||''));
    if(cmd==='route')return G.opsSetNode(String(args[1]||''),String(args[2]||''));
    if(cmd==='mode')return G.opsSetMode(String(args[1]||''));
    if(cmd==='pause')return G.opsQuietCheck();
    if(cmd==='submit')return G.opsSubmit();
    return {ok:false,msg:'Неизвестная команда стенда. Введи ops для справки.'};
  };
  const originalReset=G.reset.bind(G);
  G.reset=function(){
    st=fresh();
    try{localStorage.removeItem(KEY);}catch(e){}
    originalReset();
    save();
  };
  save();
})();