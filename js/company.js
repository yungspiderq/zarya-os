/* ZARYA OS 2.0 — persistent computer workshop career. No real hardware/network actions. */
(function () {
  'use strict';
  const G = window.Game;
  const KEY = 'zarya.company.v1';
  const TYPES = ['diagnose', 'build', 'cooling', 'qa'];
  const TYPE_LABELS = {
    diagnose: 'Диагностика', build: 'Сборка ПК',
    cooling: 'Обслуживание', qa: 'Стресс-тест'
  };
  const RANKS = [
    { xp: 0, title: 'Гаражная мастерская' },
    { xp: 250, title: 'Малый сервис' },
    { xp: 700, title: 'Компьютерная студия' },
    { xp: 1350, title: 'Техноцентр' },
    { xp: 2300, title: 'Сеть мастерских' },
    { xp: 3500, title: 'Корпорация ЗАРЯ' }
  ];
  const UPGRADES = {
    capacity: { title: 'Дополнительные рабочие места', detail: 'Больше клиентов в очереди: от 3 до 6', prices: [180, 420, 900], ranks: [1, 2, 4], max: 3 },
    marketing: { title: 'Реклама и узнаваемость', detail: '+8% к оплате за контракт за уровень', prices: [220, 480, 900], ranks: [1, 2, 4], max: 3 },
    scanner: { title: 'Диагностический сканер', detail: 'Показывает подсказку для поиска неисправности', prices: [170, 390, 850], ranks: [1, 2, 4], max: 3 },
    testbench: { title: 'Тестовый стенд', detail: 'Уменьшает этапы контрольного тестирования', prices: [240, 540, 1050], ranks: [2, 3, 5], max: 3 }
  };
  const SCENARIOS = [
    { symptom: 'Операционная система запускается слишком медленно даже при исправном процессоре.',
      clues: ['Накопитель — медленный HDD', 'Ошибок питания нет', 'CPU проходит тест'],
      cause: 'storage', fix: 'ssd',
      causes: [['storage', 'Медленный системный диск'], ['power', 'Не хватает мощности БП'], ['graphics', 'Слабая видеокарта']],
      fixes: [['ssd', 'Переустановить ОС на SSD'], ['psu', 'Заменить БП'], ['gpu', 'Заменить видеокарту']],
      hint: 'Посмотри на скорость системного диска.' },
    { symptom: 'Компьютер выключается при запуске тяжёлого графического теста.',
      clues: ['Видеокарта требует дополнительного питания', 'Блок питания рассчитан на 300 Вт', 'Температуры не повышены'],
      cause: 'power', fix: 'psu',
      causes: [['heat', 'Перегрев CPU'], ['power', 'Недостаточная мощность БП'], ['storage', 'Слабый SSD']],
      fixes: [['ram', 'Поставить больше ОЗУ'], ['psu', 'Подобрать мощный совместимый БП'], ['ssd', 'Заменить SSD']],
      hint: 'Сравни мощность источника питания с требованиями видеокарты.' },
    { symptom: 'Пользователь жалуется на сильные тормоза при одновременной работе с несколькими программами.',
      clues: ['Установлено 2 ГБ ОЗУ', 'Системный диск исправен', 'CPU не перегревается'],
      cause: 'ram', fix: 'memory',
      causes: [['network', 'Слабый сетевой адаптер'], ['ram', 'Не хватает оперативной памяти'], ['cooler', 'Шумит кулер']],
      fixes: [['memory', 'Установить совместимые модули RAM'], ['fan', 'Заменить вентилятор'], ['net', 'Обновить Wi-Fi']],
      hint: 'Одновременная работа программ прежде всего зависит от доступной памяти.' },
    { symptom: 'Компьютер постепенно снижает FPS при длительной работе.',
      clues: ['Кулер установлен плохо', 'Температура CPU поднимается', 'Видеокарта исправна'],
      cause: 'cooling', fix: 'remount',
      causes: [['cooling', 'Проблема контакта с кулером'], ['ssd', 'Накопитель переполнен'], ['network', 'Проблема сети']],
      fixes: [['ram', 'Увеличить ОЗУ'], ['remount', 'Проверить и заново закрепить охлаждение'], ['ssd', 'Поставить SSD']],
      hint: 'Снижение частот при нагреве связано с охлаждением.' },
    { symptom: 'Купленный NVMe накопитель не обнаружен в системном блоке.',
      clues: ['Диск использует интерфейс M.2', 'На материнской плате нет слота M.2', 'SATA-разъёмы работают'],
      cause: 'slot', fix: 'board',
      causes: [['cable', 'Не подключён SATA-кабель'], ['slot', 'Нет совместимого слота M.2'], ['heat', 'Перегрев CPU']],
      fixes: [['board', 'Заменить плату на вариант с M.2'], ['fans', 'Поставить кулеры'], ['cable', 'Подключить обычный SATA-кабель']],
      hint: 'NVMe M.2 нельзя подключить напрямую к обычному разъёму SATA.' },
    { symptom: 'Игры показывают низкий FPS, хотя процессор и оперативная память достаточны.',
      clues: ['Установлена GeForce GT 1030', 'CPU Core i5', 'ОЗУ 16 ГБ'],
      cause: 'gpu', fix: 'graphics',
      causes: [['gpu', 'Недостаточная мощность GPU'], ['cpu', 'Неисправный CPU'], ['ram', 'Мало ОЗУ']],
      fixes: [['graphics', 'Поставить более мощную совместимую видеокарту'], ['cpu', 'Поменять процессор'], ['ram', 'Уменьшить ОЗУ']],
      hint: 'Слабое звено находится в графической подсистеме.' }
  ];
  const BUILD_PRESETS = [
    { cpu: 'cpu1', board: 'board0', ram: 'ram2', gpu: 'gpu0', psu: 'psu0', ssd: 'ssd1' },
    { cpu: 'cpu2', board: 'board0', ram: 'ram2', gpu: 'gpu2', psu: 'psu1', ssd: 'ssd1' },
    { cpu: 'cpu2', board: 'board1', ram: 'ram3', gpu: 'gpu3', psu: 'psu1', ssd: 'ssd3' },
    { cpu: 'cpu3', board: 'board1', ram: 'ram3', gpu: 'gpu4', psu: 'psu2', ssd: 'ssd3' },
    { cpu: 'cpu4', board: 'board3', ram: 'ram4', gpu: 'gpu4', psu: 'psu3', ssd: 'ssd4' }
  ];
  const BASE_PRICES = { cpu0: 100, gpu0: 30, ram0: 35, board0: 100, psu0: 60, ssd0: 60 };
  const BUILD_TYPES = [['cpu','CPU'], ['board','Материнская плата'], ['ram','ОЗУ'],
    ['gpu','Видеокарта'], ['psu','Блок питания'], ['ssd','Диск']];
  const QA_STEPS = [['power','Проверить питание'], ['disk','Проверить накопитель'],
    ['graphics','Прогнать графический тест']];
  const COOL_STEPS = [['inspect','Осмотреть охлаждение'], ['dust','Очистить пыль'],
    ['paste','Обновить виртуальную термопасту'], ['test','Проверить температуру']];
  const ASSEMBLY_STEPS = [['board','Установить плату и процессор'],
    ['graphics','Установить память, GPU и диск'], ['power','Подключить БП'],
    ['post','Проверить запуск'], ['deliver','Передать заказ клиенту']];
  const ACHIEVEMENTS = [
    { id:'first', title:'Открыли мастерскую', desc:'Заверши первый заказ компании', reward:60, field:'completed', threshold:1 },
    { id:'five', title:'Первые постоянные клиенты', desc:'Заверши 5 заказов', reward:100, field:'completed', threshold:5 },
    { id:'ten', title:'Стабильный поток заказов', desc:'Заверши 10 заказов', reward:180, field:'completed', threshold:10 },
    { id:'twentyfive', title:'Лидер района', desc:'Заверши 25 заказов', reward:300, field:'completed', threshold:25 },
    { id:'fifty', title:'Мастер своего дела', desc:'Заверши 50 заказов', reward:450, field:'completed', threshold:50 },
    { id:'diagnostic', title:'Компьютерный детектив', desc:'Реши 4 задачи диагностики', reward:150, field:'diagnose', threshold:4 },
    { id:'assemblies', title:'Сборочный конвейер', desc:'Собери 4 ПК для компании', reward:150, field:'build', threshold:4 },
    { id:'service', title:'Чистота и порядок', desc:'Выполни 4 обслуживания', reward:150, field:'cooling', threshold:4 },
    { id:'quality', title:'Стандарт качества', desc:'Проведи 4 стресс-теста', reward:150, field:'qa', threshold:4 },
    { id:'two', title:'Малый сервис', desc:'Открой второй ранг компании', reward:120, field:'rank', threshold:2 },
    { id:'four', title:'Техноцентр', desc:'Открой четвёртый ранг', reward:220, field:'rank', threshold:4 },
    { id:'upgrader', title:'Развиваемся', desc:'Купи 3 улучшения мастерской', reward:140, field:'upgrades', threshold:3 }
  ];

  function fresh() {
    return { v:1, name:'Мастерская ЗАРЯ', xp:0, serial:1, jobs:[], active:null,
      completed:0, earned:0, mistakes:0, perfect:0, typeCount:{diagnose:0,build:0,cooling:0,qa:0},
      upgrades:{capacity:0,marketing:0,scanner:0,testbench:0}, claimed:[],history:[] };
  }
  function safeNum(v,max) {
    const n=Number(v);
    return Number.isSafeInteger(n) && n>=0 ? Math.min(max,n) : 0;
  }
  function jobRank(xp) {
    let r=1;
    for(let i=1;i<RANKS.length;i++)if(xp>=RANKS[i].xp)r=i+1;
    return r;
  }
  function seed(n) { return (Math.imul(n,1103515245)+12345)>>>0; }
  function makeJob(n) {
    const type=TYPES[(n-1)%TYPES.length],tier=Math.min(5,1+Math.floor((n-1)/8));
    const scenario=seed(n)%SCENARIOS.length,client=[
      'Творческая студия «Звук»','Геймклуб «Полюс»','Офис «Маяк»',
      'Фотостудия «Свет»','Школа «Спектр»','Команда «Орбита»'][seed(n+19)%6];
    return {
      id:'co-'+String(n).padStart(6,'0'), type:type, tier:tier, scenario:scenario,
      client:client, reward:110+tier*70+(type==='build'?90:type==='qa'?55:0),
      xp:65+tier*45+(type==='build'?15:0)
    };
  }
  function load() {
    let x=fresh();
    try {
      const raw=JSON.parse(localStorage.getItem(KEY));
      if(raw&&raw.v===1)x=Object.assign(x,raw);
    } catch(e) {}
    x.name=typeof x.name==='string'&&x.name.length>=3&&x.name.length<=32?x.name:'Мастерская ЗАРЯ';
    x.xp=safeNum(x.xp,1e8);x.earned=safeNum(x.earned,1e9);
    x.completed=safeNum(x.completed,1e6);x.mistakes=safeNum(x.mistakes,1e6);x.perfect=safeNum(x.perfect,1e6);
    x.serial=Math.max(1,safeNum(x.serial,999999));
    x.upgrades=Object.assign(fresh().upgrades,x.upgrades||{});
    for(const k of Object.keys(UPGRADES))x.upgrades[k]=Math.min(3,safeNum(x.upgrades[k],3));
    x.typeCount=Object.assign(fresh().typeCount,x.typeCount||{});
    TYPES.forEach(function(k){x.typeCount[k]=safeNum(x.typeCount[k],1e6);});
    x.claimed=Array.isArray(x.claimed)?Array.from(new Set(x.claimed)).filter(
      id=>ACHIEVEMENTS.some(a=>a.id===id)):[];
    x.history=Array.isArray(x.history)?x.history.filter(h=>h&&typeof h.id==='string').slice(0,30):[];
    x.jobs=Array.isArray(x.jobs)?x.jobs.filter(j=>j&&/^co-[0-9]{6}$/.test(j.id)&&TYPES.includes(j.type)).slice(0,6):[];
    x.active=x.active&&x.jobs.some(j=>j.id===x.active.id)&&
      typeof x.active.stage==='string'&&Number.isInteger(x.active.step)?x.active:null;
    return x;
  }
  let state=load();
  function fillQueue() {
    const desired=3+state.upgrades.capacity;
    while(state.jobs.length<desired&&state.serial<=999999)state.jobs.push(makeJob(state.serial++));
  }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(state)); } catch(e){}
    window.dispatchEvent(new CustomEvent('zarya:company'));
  }
  fillQueue();
  save();

  function jobById(id){return state.jobs.find(j=>j.id===id)||null;}
  function jobTitle(j) {
    return ({
      diagnose:'Найти неисправность',
      build:'Собрать ПК под требования',
      cooling:'Обслуживание рабочего ПК',
      qa:'Контроль качества системы'
    })[j.type]+' · '+j.client;
  }
  function buildTarget(job) {
    const preset=BUILD_PRESETS[job.tier-1];
    const model=G.simulatePC(preset);
    const cost=180+BUILD_TYPES.reduce(function(sum,pair){
      const p=G.partById(preset[pair[0]]);
      return sum+(p.price>0?p.price:(BASE_PRICES[p.id]||40));
    },0);
    return {
      cpu: model.cpuLevel, gpu: model.gpuLevel, ramGb:model.ramGb,
      minDisk: model.diskLevel, minFPS: Math.max(18,model.fps-8),
      budget:Math.ceil(cost*1.10), preset:preset
    };
  }
  function buildReport(job, ids) {
    const selected=ids||state.active&&state.active.picks||{};
    const target=buildTarget(job);
    const pc=G.simulatePC(selected);
    let cost=180;
    BUILD_TYPES.forEach(function(entry){
      const p=G.partById(selected[entry[0]]);
      if(p&&p.type===entry[0])cost+=p.price>0?p.price:(BASE_PRICES[p.id]||40);
    });
    const errors=pc.errors?pc.errors.slice():[];
    if(pc.ok) {
      if(pc.cpuLevel<target.cpu)errors.push('Нужен более мощный процессор.');
      if(pc.gpuLevel<target.gpu)errors.push('Нужна более мощная видеокарта.');
      if(pc.ramGb<target.ramGb)errors.push('Недостаточно ОЗУ.');
      if(pc.diskLevel<target.minDisk)errors.push('Нужен более быстрый накопитель.');
      if(pc.fps<target.minFPS)errors.push('Игровой FPS ниже цели клиента.');
    }
    if(cost>target.budget)errors.push('Превышен бюджет клиента на '+(cost-target.budget)+' ₡.');
    return { ok:errors.length===0,cost:cost,budget:target.budget,
      target:{cpu:target.cpu,gpu:target.gpu,ramGb:target.ramGb,minDisk:target.minDisk,minFPS:target.minFPS},
      fps:pc.fps||0, errors:errors,parts:pc.parts||null };
  }
  function snapshotJob(j) {
    const r=Object.assign({},j,{label:TYPE_LABELS[j.type],title:jobTitle(j)});
    if(j.type==='diagnose') {
      const s=SCENARIOS[j.scenario];
      r.symptom=s.symptom;r.clues=s.clues.slice();
      r.causes=s.causes.map(a=>a.slice());r.fixes=s.fixes.map(a=>a.slice());
      r.hint=s.hint;
    }
    if(j.type==='build') {
      const t=buildTarget(j);
      r.target={cpu:t.cpu,gpu:t.gpu,ramGb:t.ramGb,minDisk:t.minDisk,
        minFPS:t.minFPS,budget:t.budget};
    }
    return r;
  }
  function xpStats(){
    const rank=jobRank(state.xp),next=RANKS[rank]?RANKS[rank].xp:null;
    return {rank:rank,title:RANKS[rank-1].title,xp:state.xp,nextXP:next,
      floor:RANKS[rank-1].xp};
  }
  G.companyState=function(){
    return {
      name:state.name,completed:state.completed,earned:state.earned,
      mistakes:state.mistakes,perfect:state.perfect,queueSize:3+state.upgrades.capacity,
      rank:xpStats(),upgrades:Object.assign({},state.upgrades),
      byType:Object.assign({},state.typeCount),
      active:state.active?{
        id:state.active.id,stage:state.active.stage,step:state.active.step,
        errors:state.active.errors||0,
        picks:state.active.picks?Object.assign({},state.active.picks):null
      }:null,
      history:state.history.map(x=>Object.assign({},x))
    };
  };
  G.companyJobs=function(){return state.jobs.map(snapshotJob);};
  G.companyUpgradeCatalog=function(){
    const rank=xpStats().rank;
    return Object.keys(UPGRADES).map(function(id){
      const u=UPGRADES[id],lvl=state.upgrades[id];
      return {id:id,title:u.title,detail:u.detail,level:lvl,max:u.max,
        price:lvl===u.max?null:u.prices[lvl],
        requiredRank:lvl===u.max?null:u.ranks[lvl],
        unlocked:lvl===u.max?false:rank>=u.ranks[lvl]};
    });
  };
  G.companyRename=function(name){
    if(typeof name!=='string')return {ok:false,msg:'Нужно указать название.'};
    const clean=name.trim().replace(/\s+/g,' ');
    if(clean.length<3||clean.length>32||/[<>]/.test(clean))return {ok:false,msg:'От 3 до 32 символов, без угловых скобок.'};
    state.name=clean;save();return {ok:true,msg:'Название мастерской обновлено.'};
  };
  G.companyUpgrade=function(id){
    const u=UPGRADES[id];if(!u)return {ok:false,msg:'Улучшение не найдено.'};
    const lvl=state.upgrades[id];
    if(lvl>=u.max)return {ok:false,msg:'Достигнут максимум.'};
    if(xpStats().rank<u.ranks[lvl])return {ok:false,msg:'Требуется ранг '+u.ranks[lvl]+'.'};
    const result=G.spendFunds(u.prices[lvl]);if(!result.ok)return result;
    state.upgrades[id]++;
    fillQueue();save();
    return {ok:true,msg:u.title+': уровень '+state.upgrades[id]+'.'};
  };
  G.companyStart=function(id){
    const job=jobById(id);
    if(!job)return {ok:false,msg:'Контракт не найден.'};
    if(state.active)return {ok:false,msg:'Сначала заверши уже принятый контракт.'};
    const active={id:id,stage:job.type==='diagnose'?'diagnose':
      job.type==='build'?'design':job.type==='cooling'?'service':'qa',
      step:0,errors:0,picks:null};
    if(job.type==='build')active.picks=Object.assign({},BUILD_PRESETS[0]);
    state.active=active;save();
    return {ok:true,msg:'Контракт принят. Следуй инструкциям.'};
  };
  G.companyCancel=function(){
    if(!state.active)return {ok:false,msg:'Нет активного контракта.'};
    state.active=null;save();return {ok:true,msg:'Контракт отменён без штрафа.'};
  };
  G.companyBuildChoices=function(type){
    if(!BUILD_TYPES.some(t=>t[0]===type))return [];
    return G.partsCatalog(type);
  };
  G.companyBuildReport=function(id,ids){
    const job=jobById(id);
    if(!job||job.type!=='build')return null;
    const source=ids || (state.active&&state.active.id===id?state.active.picks:null);
    return buildReport(job,source);
  };
  G.companyChoose=function(type,id){
    const a=state.active;
    if(!a||a.stage!=='design')return {ok:false,msg:'Сейчас нельзя менять детали.'};
    if(!BUILD_TYPES.some(t=>t[0]===type))return {ok:false,msg:'Неизвестный тип детали.'};
    const part=G.partById(id);
    if(!part||part.type!==type)return {ok:false,msg:'Некорректная модель.'};
    a.picks[type]=id;save();return {ok:true,msg:'Выбрано: '+part.name};
  };
  G.companyConfirmBuild=function(){
    const a=state.active;if(!a||a.stage!=='design')return {ok:false,msg:'Сейчас нет конфигурации.'};
    const check=buildReport(jobById(a.id),a.picks);
    if(!check.ok)return {ok:false,msg:'Исправь ошибки конфигурации.',errors:check.errors};
    a.stage='assemble';a.step=0;save();return {ok:true,msg:'Конфигурация одобрена. Приступай к сборке.'};
  };
  G.companySteps=function(){
    if(!state.active)return [];
    const a=state.active,job=jobById(a.id);
    if(a.stage==='assemble')return ASSEMBLY_STEPS.map(x=>x.slice());
    if(a.stage==='service')return COOL_STEPS.map(x=>x.slice());
    if(a.stage==='qa')return QA_STEPS.slice(0,Math.max(1,3-state.upgrades.testbench)).map(x=>x.slice());
    return [];
  };
  G.companyHint=function(){
    if(!state.active||state.active.stage!=='diagnose'||state.upgrades.scanner<1)return null;
    const j=jobById(state.active.id);
    return j?SCENARIOS[j.scenario].hint:null;
  };
  function finish(job){
    const a=state.active;
    const amount=Math.min(2500,Math.round(job.reward*(1+state.upgrades.marketing*.08)));
    const paid=G.awardCompanyJob(job.id,amount);
    if(!paid.ok&&!paid.alreadyPaid)return paid;
    const great=(a.errors||0)===0;
    state.completed++;state.earned+=paid.ok?amount:0;
    state.xp+=job.xp;
    if(great)state.perfect++;
    state.typeCount[job.type]++;
    state.history.unshift({id:job.id,title:jobTitle(job),type:job.type,
      reward:paid.ok?amount:0,xp:job.xp,errors:a.errors||0,date:Date.now()});
    state.history=state.history.slice(0,30);
    state.jobs=state.jobs.filter(j=>j.id!==job.id);
    state.active=null;fillQueue();save();
    return {ok:true,completed:true,reward:paid.ok?amount:0,
      xp:job.xp,msg:'Контракт закрыт. +'+(paid.ok?amount:0)+' ₡, +'+job.xp+' опыта компании.'};
  }
  G.companyAnswer=function(answer){
    const a=state.active;
    if(!a)return {ok:false,msg:'Сначала прими заказ.'};
    const job=jobById(a.id);
    if(job.type!=='diagnose')return {ok:false,msg:'Это не диагностический контракт.'};
    const scenario=SCENARIOS[job.scenario];
    if(a.stage==='diagnose'){
      if(answer!==scenario.cause){
        a.errors++;state.mistakes++;save();return {ok:false,msg:'Причина пока не найдена. Проверь симптомы.'};
      }
      a.stage='repair';save();return {ok:true,msg:'Диагноз подтверждён. Выбери решение.'};
    }
    if(a.stage==='repair'){
      if(answer!==scenario.fix){
        a.errors++;state.mistakes++;save();return {ok:false,msg:'Этот ремонт не решает проблему.'};
      }
      return finish(job);
    }
    return {ok:false,msg:'Неправильный этап.'};
  };
  G.companyAction=function(action){
    const a=state.active;
    if(!a||!['assemble','service','qa'].includes(a.stage))return {ok:false,msg:'Сначала начни соответствующий заказ.'};
    const steps=G.companySteps(),expected=steps[a.step];
    if(!expected||action!==expected[0]){
      a.errors++;state.mistakes++;save();return {ok:false,msg:'Неверный шаг. Следующее действие: '+(expected?expected[1]:'нет')};
    }
    if(a.stage==='assemble'&&a.step===0){
      const report=buildReport(jobById(a.id),a.picks);
      if(!report.ok){a.stage='design';a.step=0;save();return {ok:false,msg:'Конфигурация больше не проходит проверки.'};}
    }
    if(a.step===steps.length-1)return finish(jobById(a.id));
    a.step++;save();return {ok:true,msg:'Шаг выполнен.'};
  };
  G.companyAchievements=function(){
    const st=G.companyState(),upgrades=Object.values(st.upgrades).reduce((a,b)=>a+b,0);
    return ACHIEVEMENTS.map(function(a){
      const progress=a.field==='rank'?st.rank.rank:a.field==='upgrades'?upgrades:
        TYPES.includes(a.field)?st.byType[a.field]:st.completed;
      return {id:a.id,title:a.title,desc:a.desc,reward:a.reward,
        progress:progress,target:a.threshold,
        earned:progress>=a.threshold,claimed:state.claimed.includes(a.id)};
    });
  };
  G.companyClaim=function(id){
    const a=G.companyAchievements().find(item=>item.id===id);
    if(!a)return {ok:false,msg:'Достижение не найдено.'};
    if(!a.earned)return {ok:false,msg:'Сначала выполни условие достижения.'};
    if(a.claimed)return {ok:false,msg:'Награда уже получена.'};
    const paid=G.awardCompanyAchievement('ach-'+id,a.reward);
    if(!paid.ok&&!paid.alreadyPaid)return paid;
    state.claimed.push(id);save();
    return {ok:true,msg:paid.ok?'Награда +'+a.reward+' ₡ получена.':'Достижение отмечено, награда уже выдавалась.'};
  };
  const baseReset=G.reset.bind(G);
  G.reset=function(){
    state=fresh();fillQueue();
    try{localStorage.removeItem(KEY);}catch(e){}
    baseReset();save();
  };
})();