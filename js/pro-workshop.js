/* ZARYA OS 2.1 — professional workshop. All diagnostics and prices are fictional gameplay. */
(function () {
  'use strict';
  const G = window.Game;
  const KEY = 'zarya.pro-workshop.v1';
  const FAULTS = [
    { id:'ram',name:'Ошибки RAM',kit:'memkit',partCost:140,
      symptom:'Случайные зависания и повреждённые файлы после длительной работы.',
      report:'Тест памяти: ошибки чтения в нескольких циклах; исключи неисправность накопителя.' },
    { id:'psu',name:'Недостаточное питание',kit:'psukit',partCost:215,
      symptom:'Система теряет питание именно при пиковой нагрузке.',
      report:'Под нагрузкой напряжение условной линии питания выходит за допустимый игровой диапазон.' },
    { id:'ssd',name:'Деградация накопителя',kit:'diskkit',partCost:155,
      symptom:'Запуск ОС стал медленным, приложения периодически не отвечают.',
      report:'Виртуальный SMART: ошибки чтения, запас ресурса уменьшен.' },
    { id:'cooling',name:'Нарушено охлаждение CPU',kit:'thermalkit',partCost:85,
      symptom:'FPS становится ниже после прогрева компьютера.',
      report:'Термограф: высокий нагрев CPU и падение частоты под нагрузкой.' },
    { id:'gpu',name:'Нестабильность GPU',kit:'gpukit',partCost:270,
      symptom:'В графических программах видны артефакты и сбои.',
      report:'Графический стресс-тест: ошибки видеопамяти, повторяемые артефакты.' },
    { id:'board',name:'Проблема платы или слота',kit:'boardkit',partCost:205,
      symptom:'Иногда пропадают устройства или не проходит первичная инициализация.',
      report:'POST-журнал: ошибки инициализации контроллера и слота расширения.' },
    { id:'software',name:'Конфликт драйверов',kit:'driverkit',partCost:55,
      symptom:'После программного обновления появляются ошибки и вылеты.',
      report:'Журнал ОС: повторяющийся сбой драйвера; аппаратный самотест исправен.' },
    { id:'airflow',name:'Забитая вентиляция',kit:'airkit',partCost:65,
      symptom:'Корпус перегревается, вентиляторы работают громче обычного.',
      report:'Воздушный поток ограничен; температура GPU и VRM повышается одновременно.' }
  ];
  const KITS = [
    {id:'memkit',name:'Совместимая ОЗУ и диагностика слотов',price:140},
    {id:'psukit',name:'Подбор блока питания с резервом мощности',price:215},
    {id:'diskkit',name:'Замена накопителя с переносом данных',price:155},
    {id:'thermalkit',name:'Восстановление охлаждения процессора',price:85},
    {id:'gpukit',name:'Ремонт или замена видеокарты',price:270},
    {id:'boardkit',name:'Замена неисправной платы',price:205},
    {id:'driverkit',name:'Исправление драйверов и проверка ОС',price:55},
    {id:'airkit',name:'Чистка и восстановление воздушного потока',price:65}
  ];
  const TESTS = [
    {id:'memory',title:'Расширенный MemTest',price:18,checks:['ram','board']},
    {id:'power',title:'Измерение питания под нагрузкой',price:26,checks:['psu','gpu']},
    {id:'storage',title:'SMART + проверка чтения',price:20,checks:['ssd','software']},
    {id:'thermal',title:'Тепловой профиль CPU и VRM',price:23,checks:['cooling','airflow','psu']},
    {id:'graphics',title:'Графический стресс-тест',price:29,checks:['gpu','airflow']},
    {id:'post',title:'POST и журнал материнской платы',price:22,checks:['board','ram','psu']},
    {id:'os',title:'Системный журнал и драйверы',price:14,checks:['software','ssd']},
    {id:'air',title:'Тест воздушного потока',price:18,checks:['airflow','cooling']}
  ];
  const CATEGORIES=[
    ['cpu','Процессор'],['board','Материнская плата'],['ram','Оперативная память'],
    ['gpu','Видеокарта'],['psu','Блок питания'],['ssd','Накопитель'],['cooler','Кулер']
  ];
  const BUILD_PRESETS = [
    {cpu:'cpu1',board:'board0',ram:'ram2',gpu:'gpu0',psu:'psu1',ssd:'ssd1',cooler:'cooler1'},
    {cpu:'cpu2',board:'board0',ram:'ram2',gpu:'gpu2',psu:'psu2',ssd:'ssd2',cooler:'cooler2'},
    {cpu:'cpu2',board:'board1',ram:'ram3',gpu:'gpu3',psu:'psu2',ssd:'ssd3',cooler:'cooler2'},
    {cpu:'cpu3',board:'board1',ram:'ram3',gpu:'gpu4',psu:'psu3',ssd:'ssd3',cooler:'cooler3'},
    {cpu:'cpu4',board:'board3',ram:'ram4',gpu:'gpu4',psu:'psu4',ssd:'ssd4',cooler:'cooler4'}
  ];
  const BASE_COST={cpu0:75,gpu0:20,ram0:30,board0:95,psu0:65,ssd0:50,cooler0:25};
  const CUSTOMER=['Клиника «Север»','Студия «Контур»','Киберклуб «Вектор»','Типография «Гамма»',
    'Проектное бюро «Сфера»','Творческая группа «Лайт»','Школа «Пульс»','Отель «Меридиан»'];
  const MAX_ID=999999,MAX_HISTORY=40;
  function bounded(x,max){return Number.isSafeInteger(x)&&x>=0?Math.min(x,max):0;}
  function seed(n){return (Math.imul(n,1664525)+1013904223)>>>0;}
  function rand(n,salt){return seed((n*1297+salt*193)>>>0);}
  function defaults(){return {v:1,serial:1,complete:0,failed:0,profit:0,reputation:45,
    active:null,jobs:[],history:[],perfect:0};}
  function faultById(id){return FAULTS.find(f=>f.id===id)||null;}
  function kitById(id){return KITS.find(k=>k.id===id)||null;}
  function workType(n){return n%3===2?'build':'repair';}
  function tierOf(n){return Math.min(5,1+Math.floor((n-1)/6));}
  function faultSet(n,tier){
    const pool=FAULTS.slice().sort((a,b)=>rand(n,FAULTS.indexOf(a)+3)-rand(n,FAULTS.indexOf(b)+3));
    return pool.slice(0,tier>=3?3:2).map(f=>f.id);
  }
  function partsPrice(ids){
    return CATEGORIES.reduce(function(sum,t){
      const p=G.partById(ids[t[0]]);
      return sum+(p?(p.price||BASE_COST[p.id]||35):0);
    },260); // case, workshop assembly and packaging
  }
  function makeJob(n){
    const tier=tierOf(n),kind=workType(n);
    const id='pro-'+String(n).padStart(6,'0');
    const faults=faultSet(n,tier);
    const baseline=BUILD_PRESETS[tier-1];
    const budget=kind==='repair'
      ? faults.reduce((sum,id)=>sum+faultById(id).partCost,0)+190+tier*65
      : partsPrice(baseline)+160+tier*65;
    return {id:id,serial:n,tier:tier,kind:kind,client:CUSTOMER[rand(n,11)%CUSTOMER.length],
      faults:faults,budget:budget,workLimit:kind==='repair'?18+tier*2:14+tier,
      faultCount:faults.length,fee:kind==='repair'?95+tier*24:125+tier*35};
  }
  function read(){
    let x=defaults();
    try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&saved.v===1)x=Object.assign(x,saved);}catch(e){}
    x.serial=Math.max(1,bounded(x.serial,MAX_ID));
    x.complete=bounded(x.complete,1e6);
    x.failed=bounded(x.failed,1e6);
    x.profit=bounded(x.profit,1e9);
    x.perfect=bounded(x.perfect,1e6);
    x.reputation=Math.max(0,Math.min(100,bounded(x.reputation,100)));
    x.history=Array.isArray(x.history)?x.history.filter(v=>v&&typeof v.id==='string').slice(0,MAX_HISTORY):[];
    x.jobs=Array.isArray(x.jobs)?x.jobs.filter(j=>j&&/^pro-[0-9]{6}$/.test(j.id)&&['build','repair'].includes(j.kind)).slice(0,4):[];
    x.active=x.active&&x.jobs.some(j=>j.id===x.active.id)&&
      ['inspection','diagnosis','procurement','design','qa','rework','deliver'].includes(x.active.stage)?x.active:null;
    if(x.active){
      const a=x.active;
      a.tests=Array.isArray(a.tests)?a.tests.filter(id=>TESTS.some(t=>t.id===id)).slice(0,8):[];
      a.faults=Array.isArray(a.faults)?a.faults.filter(id=>FAULTS.some(f=>f.id===id)).slice(0,3):[];
      a.kits=a.kits&&typeof a.kits==='object'&&!Array.isArray(a.kits)?a.kits:{};
      a.picks=a.picks&&typeof a.picks==='object'&&!Array.isArray(a.picks)?a.picks:{};
      a.step=bounded(a.step,3);a.time=bounded(a.time,100);
      a.cost=bounded(a.cost,20000);a.penalty=bounded(a.penalty,20000);
      a.strikes=bounded(a.strikes,2);a.qaErrors=bounded(a.qaErrors,10);
    }
    return x;
  }
  let state=read();
  function fill(){
    while(state.jobs.length<3 && state.serial<=MAX_ID)
      state.jobs.push(makeJob(state.serial++));
  }
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
    window.dispatchEvent(new CustomEvent('zarya:pro'));
  }
  fill();save();
  function activeJob(){return state.active?state.jobs.find(j=>j.id===state.active.id)||null:null;}
  function copy(x){return JSON.parse(JSON.stringify(x));}
  function revenueEstimate(j){
    const a=state.active;
    return Math.max(0,j.budget-(a?a.cost+a.penalty:0)-(j.kind==='build'?partsPrice(BUILD_PRESETS[j.tier-1]):j.faults.reduce((v,id)=>v+faultById(id).partCost,0))-65);
  }
  function publicJob(j){
    const data={id:j.id,kind:j.kind,tier:j.tier,client:j.client,budget:j.budget,
      workLimit:j.workLimit,faultCount:j.faultCount,fee:j.fee};
    if(j.kind==='repair'){
      data.symptoms=j.faults.map(id=>faultById(id).symptom)
        .sort((a,b)=>a.localeCompare(b));
      data.symptoms.push('Клиент просит не заменять исправные узлы без подтверждения диагностики.');
    }else data.target=buildTarget(j);
    return data;
  }
  function buildTarget(j){
    const preset=BUILD_PRESETS[j.tier-1],sim=G.simulatePC(preset);
    return {ramGb:sim.ramGb,minFPS:Math.max(20,sim.fps-6),
      maxBoot:sim.bootSeconds+3,minCPU:sim.cpuLevel,minGPU:sim.gpuLevel,
      budget:j.budget,requiredPsuHeadroom:25,maxCpuTemp:79};
  }
  function buildReport(j,picks){
    const p=picks||{};
    const sim=G.simulatePC(p);
    const errors=sim.errors?sim.errors.slice():[];
    const cpu=G.partById(p.cpu),gpu=G.partById(p.gpu),
      psu=G.partById(p.psu),cooler=G.partById(p.cooler);
    const target=buildTarget(j);
    if(!cooler||cooler.type!=='cooler')errors.push('Для стабильной работы нужен отдельный совместимый кулер.');
    if(cpu&&cooler&&cpu.socket!==cooler.socket)errors.push('Кулер несовместим с сокетом процессора.');
    const cpuTemp=cpu&&gpu&&cooler?Math.round(52+cpu.power*9+gpu.power*3-cooler.power*9):null;
    const reserve=sim.requiredWatts&&psu?Math.round((psu.watts/sim.requiredWatts-1)*100):null;
    const cost=partsPrice(p);
    if(sim.ok){
      if(sim.cpuLevel<target.minCPU)errors.push('CPU слабее требований клиента.');
      if(sim.gpuLevel<target.minGPU)errors.push('GPU слабее требований клиента.');
      if(sim.ramGb<target.ramGb)errors.push('Недостаточный объём оперативной памяти.');
      if(sim.fps<target.minFPS)errors.push('Видеосистема не достигает целевого FPS.');
      if(sim.bootSeconds>target.maxBoot)errors.push('Загрузка ОС слишком медленная.');
      if(reserve!==null && reserve<target.requiredPsuHeadroom)errors.push('У БП меньше 25% резерва мощности.');
      if(cpuTemp!==null && cpuTemp>target.maxCpuTemp)errors.push('Охлаждение CPU не проходит игровой термотест.');
    }
    if(cost>j.budget)errors.push('Превышен бюджет клиента на '+(cost-j.budget)+' ₡.');
    return {ok:errors.length===0,errors:errors,cost:cost,budget:j.budget,
      fps:sim.fps||0,boot:sim.bootSeconds||null,cpuTemp:cpuTemp,reserve:reserve,
      requiredWatts:sim.requiredWatts||null,suppliedWatts:psu?psu.watts:null,
      target:target};
  }
  G.proState=function(){
    const a=state.active,job=activeJob();
    return {complete:state.complete,failed:state.failed,profit:state.profit,perfect:state.perfect,
      reputation:state.reputation,queue:state.jobs.map(publicJob),
      active:a?{id:a.id,kind:job.kind,stage:a.stage,time:a.time,workLimit:job.workLimit,
        tests:a.tests.slice(),faults:a.faults.slice(),kits:Object.assign({},a.kits),
        picks:Object.assign({},a.picks),strikes:a.strikes,qaErrors:a.qaErrors,
        step:a.step,pending:a.pending||null,cost:a.cost,penalty:a.penalty,
        remaining:Math.max(0,job.budget-a.cost-a.penalty),
        bestReward:revenueEstimate(job)}:null,
      history:state.history.map(copy)};
  };
  G.proOffers=function(){return state.jobs.map(publicJob);};
  G.proCatalog=function(){return {tests:TESTS.map(copy),faults:FAULTS.map(f=>({id:f.id,name:f.name})),
    kits:KITS.map(copy),types:CATEGORIES.map(copy)};};
  G.proBuildOptions=function(type){return CATEGORIES.some(c=>c[0]===type)?G.partsCatalog(type):[];};
  G.proEvaluateBuild=function(id,picks){
    const j=state.jobs.find(j=>j.id===id);
    if(!j||j.kind!=='build')return null;
    return buildReport(j,picks||state.active&&state.active.picks);
  };
  G.proStart=function(id){
    const j=state.jobs.find(v=>v.id===id);
    if(!j)return {ok:false,msg:'Контракт не найден.'};
    if(state.active)return {ok:false,msg:'Сначала заверши или откажись от текущего заказа.'};
    state.active={id:j.id,stage:j.kind==='build'?'design':'inspection',time:0,tests:[],faults:[],
      kits:{},picks:j.kind==='build'?{cpu:'cpu0',board:'board0',gpu:'gpu0',ram:'ram0',
        psu:'psu0',ssd:'ssd0',cooler:'cooler0'}:{},step:0,cost:0,penalty:0,strikes:0,qaErrors:0,pending:null};
    save();return {ok:true,msg:'Заказ принят. Условия и бюджет обязательны.'};
  };
  function archive(j,success,reward){
    state.history.unshift({id:j.id,kind:j.kind,client:j.client,
      status:success?'done':'failed',reward:reward||0,
      mistakes:state.active?state.active.strikes:0,budget:j.budget});
    state.history=state.history.slice(0,MAX_HISTORY);
    state.jobs=state.jobs.filter(x=>x.id!==j.id);
    state.active=null;fill();save();
  }
  function fail(reason){
    const job=activeJob();
    if(!job)return {ok:false,msg:'Активный заказ отсутствует.'};
    state.failed++;state.reputation=Math.max(0,state.reputation-11);
    archive(job,false,0);
    return {ok:false,failed:true,msg:reason+' Клиент отказался от заказа: оплата 0 ₡, репутация −11.'};
  }
  function timeTick(amount){
    const a=state.active,j=activeJob();
    a.time+=amount;
    if(a.time>j.workLimit)return fail('Превышен лимит рабочих смен/действий.');
    save();return null;
  }
  function mistake(cost,message){
    const a=state.active;
    a.strikes++;a.penalty+=cost;
    const lost=timeTick(2);
    if(lost)return lost;
    if(a.strikes>=2)return fail('Допущено две критические ошибки.');
    save();
    return {ok:false,msg:message+' Финансовый штраф '+cost+' ₡; ещё одна ошибка сорвёт контракт.'};
  }
  G.proAbandon=function(){
    if(!state.active)return {ok:false,msg:'Нет активного заказа.'};
    return fail('Отказ от принятого заказа.');
  };
  G.proTest=function(testId){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='repair'||a.stage!=='inspection')return {ok:false,msg:'Сейчас нельзя проводить диагностику.'};
    const test=TESTS.find(t=>t.id===testId);
    if(!test)return {ok:false,msg:'Неизвестный тест.'};
    if(a.tests.includes(testId))return {ok:false,msg:'Этот тест уже оплачен и выполнен.'};
    if(a.cost+test.price>j.budget-j.faults.reduce((v,id)=>v+faultById(id).partCost,0)-65)
      return {ok:false,msg:'Диагностический бюджет исчерпан: оставь деньги на ремонт.'};
    a.tests.push(testId);a.cost+=test.price;
    const lost=timeTick(1);if(lost)return lost;
    return {ok:true,msg:test.title+': отчёт добавлен в журнал.'};
  };
  G.proTestReport=function(testId){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='repair'||!a.tests.includes(testId))return null;
    const t=TESTS.find(t=>t.id===testId);
    const abnormal=t.checks.filter(f=>j.faults.includes(f));
    const lines=abnormal.length?abnormal.map(id=>faultById(id).report):
      ['Отклонений по проверенным подсистемам не обнаружено.'];
    return {name:t.title,price:t.price,abnormal:abnormal.length>0,lines:lines};
  };
  G.proMarkFault=function(id,checked){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='repair'||a.stage!=='inspection')return {ok:false,msg:'Нет открытой диагностической карты.'};
    if(!faultById(id)||typeof checked!=='boolean')return {ok:false,msg:'Неизвестная категория неисправности.'};
    if(checked&&!a.faults.includes(id)&&a.faults.length>=j.faultCount)
      return {ok:false,msg:'Клиент сообщил о '+j.faultCount+' независимых неисправностях. Убери лишнее предположение.'};
    if(checked&&!a.faults.includes(id))a.faults.push(id);
    if(!checked)a.faults=a.faults.filter(x=>x!==id);
    save();return {ok:true,msg:'Диагностическая карта обновлена.'};
  };
  G.proDiagnose=function(){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='repair'||a.stage!=='inspection')return {ok:false,msg:'Сначала начни диагностику.'};
    if(a.tests.length<j.faultCount)return {ok:false,msg:'Требуется минимум '+j.faultCount+' отдельных инструментальных теста.'};
    if(a.faults.length!==j.faultCount)return {ok:false,msg:'Отметь ровно '+j.faultCount+' вероятные неисправности.'};
    if(!j.faults.every(id=>a.faults.includes(id)))
      return mistake(65,'Диагноз не подтверждается результатами тестов.');
    const lost=timeTick(1);if(lost)return lost;
    a.stage='procurement';save();
    return {ok:true,msg:'Диагноз принят. Подбери правильные ремонтные работы и рассчитай стоимость.'};
  };
  G.proSelectKit=function(fault,kit){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='repair'||a.stage!=='procurement')return {ok:false,msg:'Сначала заверши диагностику.'};
    if(!a.faults.includes(fault)||!kitById(kit))return {ok:false,msg:'Неверная категория ремонта или запчасть.'};
    a.kits[fault]=kit;save();return {ok:true,msg:'В смету добавлено: '+kitById(kit).name};
  };
  G.proRepair=function(){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='repair'||a.stage!=='procurement')return {ok:false,msg:'Нужна смета ремонта.'};
    if(!a.faults.every(id=>kitById(a.kits[id])))return {ok:false,msg:'Выбери набор для каждой найденной неисправности.'};
    const price=a.faults.reduce((sum,id)=>sum+kitById(a.kits[id]).price,0);
    if(a.cost+a.penalty+price+65>j.budget)return {ok:false,msg:'Смета превышает бюджет клиента. Подбери более подходящий план.'};
    if(!j.faults.every(id=>faultById(id).kit===a.kits[id]))
      return mistake(90,'Подобранные детали не устраняют все неисправности.');
    a.cost+=price;
    const lost=timeTick(3);if(lost)return lost;
    a.stage='qa';a.step=0;save();
    return {ok:true,msg:'Ремонт выполнен. Нужно проверить качество перед выдачей.'};
  };
  G.proSelectPart=function(type,id){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='build'||a.stage!=='design')return {ok:false,msg:'Сейчас нельзя изменять конфигурацию.'};
    if(!CATEGORIES.some(c=>c[0]===type)||!G.partById(id)||G.partById(id).type!==type)
      return {ok:false,msg:'Выбрано несовместимое с категорией комплектующее.'};
    a.picks[type]=id;save();return {ok:true,msg:'Выбрано: '+G.partById(id).name};
  };
  G.proApproveBuild=function(){
    const a=state.active,j=activeJob();
    if(!a||j.kind!=='build'||a.stage!=='design')return {ok:false,msg:'Нет заказа на сборку.'};
    const report=buildReport(j,a.picks);
    if(!report.ok)return {ok:false,msg:'Компьютер не проходит техническую приёмку.',errors:report.errors};
    a.cost=report.cost;
    const lost=timeTick(4);if(lost)return lost;
    a.stage='qa';a.step=0;save();
    return {ok:true,msg:'Комплектующие заказаны и собраны. Впереди контроль качества.'};
  };
  function qaSample(j,step,pending){
    const bad=(rand(j.serial,100+step)%4===0)&&!pending; // about 1 in 4 tests needs rework
    if(step===0)return {label:'Температура CPU под нагрузкой',
      reading:(bad?89:72+j.tier)+' °C',limit:'Норма: не выше 83 °C',
      expected:bad?'service':'approve',test:'temperature'};
    if(step===1)return {label:'Запас мощности блока питания',
      reading:(bad?12:29+j.tier)+' %',limit:'Норма: не менее 25 %',
      expected:bad?'service':'approve',test:'power'};
    return {label:'Ошибки памяти/диска в финальном цикле',
      reading:bad?'3 ошибки':'0 ошибок',limit:'Норма: 0 ошибок',
      expected:bad?'service':'approve',test:'storage'};
  }
  G.proQAReport=function(){
    const a=state.active,j=activeJob();
    if(!a||!j||!['qa','rework'].includes(a.stage))return null;
    return Object.assign({step:a.step,total:3},qaSample(j,a.step,a.fixed&&a.fixed.includes(a.step)));
  };
  G.proQAAnswer=function(answer){
    const a=state.active,j=activeJob();
    if(!a||!j||a.stage!=='qa')return {ok:false,msg:'Сейчас контроль качества недоступен.'};
    if(answer!=='approve'&&answer!=='service')return {ok:false,msg:'Выбери решение по измерению.'};
    const report=G.proQAReport();
    if(!report)return {ok:false,msg:'Нет измерения.'};
    if(answer!==report.expected)return mistake(60,'Неверная интерпретация результата контрольного теста.');
    const lost=timeTick(1);if(lost)return lost;
    if(answer==='service'){
      a.stage='rework';a.pending=report.test;save();
      return {ok:true,msg:'Отклонение выявлено. Проведи дополнительную регулировку и повторный тест.'};
    }
    a.step++;
    if(a.step===3){a.stage='deliver';}
    save();return {ok:true,msg:a.stage==='deliver'?'Приёмка пройдена. Компьютер готов к выдаче.':'Измерение соответствует норме.'};
  };
  G.proRework=function(){
    const a=state.active,j=activeJob();
    if(!a||!j||a.stage!=='rework')return {ok:false,msg:'Регулировка не требуется.'};
    if(a.cost+a.penalty+45+65>j.budget)return fail('В бюджете клиента нет средств для необходимой регулировки.');
    a.cost+=45;a.fixed=a.fixed||[];a.fixed.push(a.step);
    const lost=timeTick(2);if(lost)return lost;
    a.stage='qa';a.pending=null;save();
    return {ok:true,msg:'Параметр скорректирован за 45 ₡. Теперь пройди повторное измерение.'};
  };
  G.proDeliver=function(){
    const a=state.active,j=activeJob();
    if(!a||!j||a.stage!=='deliver'||a.step!==3)return {ok:false,msg:'Сначала заверши контроль качества.'};
    const spent=a.cost+a.penalty+65;
    const amount=Math.min(1200,Math.max(0,j.budget-spent));
    if(amount<=0)return fail('Работа завершена с отрицательной рентабельностью.');
    const paid=G.awardProContract(j.id,amount);
    if(!paid.ok&&!paid.alreadyPaid)return paid;
    state.complete++;state.profit+=paid.ok?amount:0;
    if(a.strikes===0)state.perfect++;
    state.reputation=Math.min(100,state.reputation+(a.strikes===0?6:2));
    archive(j,true,paid.ok?amount:0);
    return {ok:true,completed:true,reward:paid.ok?amount:0,
      msg:'Клиент принял работу. Прибыль: +'+(paid.ok?amount:0)+' ₡, репутация выросла.'};
  };
  const originalReset=G.reset.bind(G);
  G.reset=function(){
    state=defaults();fill();
    try{localStorage.removeItem(KEY);}catch(e){}
    originalReset();save();
  };
})();