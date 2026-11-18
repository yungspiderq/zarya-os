/* ЗАРЯ OS 1.7 — реальные игровые заказы на подбор и сборку ПК. */
(function () {
  'use strict';
  const G = window.Game;
  const KEY = 'zarya.pc-orders.v1';
  const TYPES = [
    ['cpu', 'Процессор'], ['board', 'Материнская плата'],
    ['ram', 'Оперативная память'], ['gpu', 'Видеокарта'],
    ['psu', 'Блок питания'], ['ssd', 'Накопитель']
  ];
  const DEFAULT_IDS = { cpu: 'cpu0', board: 'board0', ram: 'ram0', gpu: 'gpu0', psu: 'psu0', ssd: 'ssd0' };
  const START_PRICES = { cpu0: 100, board0: 100, ram0: 35, psu0: 60, ssd0: 60 };
  const ASSEMBLY_COST = 180;
  const STEPS = [
    ['board', 'Установить материнскую плату'],
    ['core', 'Установить процессор и оперативную память'],
    ['gpu', 'Установить видеокарту и накопитель'],
    ['cables', 'Подключить БП и кабели'],
    ['boot', 'Запустить проверку POST'],
    ['deliver', 'Передать компьютер клиенту']
  ];

  const ORDERS = [
    {
      id:'build-01', title:'Учёба и документы', client:'Библиотека «Маяк»', budget:1000, reward:130, unlock:0,
      brief:'Недорогой офисный компьютер. Главное — не менее 8 ГБ ОЗУ и быстрый системный SSD.',
      requirements:{minRam:8,minDisk:1,maxBoot:40},
      target:'Не менее 8 ГБ ОЗУ · SSD вместо HDD · загрузка не дольше 40 сек.'
    },
    {
      id:'build-02', title:'Игровой ПК начального уровня', client:'Клуб «Лагуна»', budget:1600, reward:200, unlock:0,
      brief:'Игрок просит стабильные 60 игровых FPS, 8 ГБ ОЗУ и твердотельный диск.',
      requirements:{minFPS:60,minRam:8,minDisk:1},
      target:'От 60 игровых FPS · 8 ГБ ОЗУ · SSD'
    },
    {
      id:'build-03', title:'Станция для фотографа', client:'Фотостудия «Свет»', budget:2450, reward:280, unlock:1,
      brief:'Нужны не менее Core i5, 16 ГБ оперативной памяти и NVMe для больших фотоархивов.',
      requirements:{minCpu:2,minRam:16,minDisk:3,maxBoot:23,requireM2:true},
      target:'CPU уровня Core i5 · 16 ГБ ОЗУ · NVMe SSD · загрузка не дольше 23 сек.'
    },
    {
      id:'build-04', title:'Компьютер для стриминга', client:'Стример «Норд»', budget:3100, reward:350, unlock:2,
      brief:'Сбалансированная конфигурация с хорошими CPU, GPU и 16 ГБ памяти.',
      requirements:{minCpu:3,minGpu:2,minRam:16,minDisk:2,minFPS:75,maxBoot:29},
      target:'CPU уровня Core i7 · GPU от RX 580 · 16 ГБ ОЗУ · 75 FPS · быстрый SSD'
    },
    {
      id:'build-05', title:'Турнирный компьютер', client:'Киберклуб «Феникс»', budget:3300, reward:420, unlock:3,
      brief:'Игровой ПК с высоким FPS, быстрым SSD и достаточной мощностью блока питания.',
      requirements:{minCpu:2,minGpu:4,minRam:16,minDisk:1,minFPS:110},
      target:'CPU от Core i5 · RTX 3060 · 16 ГБ ОЗУ · от 110 игровых FPS'
    },
    {
      id:'build-06', title:'Монтажная рабочая станция', client:'Продакшн «Кадр»', budget:5100, reward:540, unlock:4,
      brief:'Упор на мощный процессор, 32 ГБ памяти, современную плату и быстрый NVMe.',
      requirements:{minCpu:4,minRam:32,minBoard:2,minDisk:3,maxBoot:22},
      target:'CPU уровня Core i9 · 32 ГБ ОЗУ · материнская плата B560 или лучше · NVMe'
    },
    {
      id:'build-07', title:'Компьютер киберспортсмена', client:'Команда «Орбита»', budget:5000, reward:650, unlock:5,
      brief:'Стабильные максимальные игровые FPS, 32 ГБ памяти и надёжный БП.',
      requirements:{minCpu:3,minGpu:4,minRam:32,minDisk:3,minPsu:2,minFPS:120,maxBoot:21},
      target:'От 120 FPS · CPU уровня Core i7 · RTX 3060 · 32 ГБ RAM · БП от 550 Вт'
    },
    {
      id:'build-08', title:'Флагманская сборка', client:'Лаборатория «Полярис»', budget:7000, reward:850, unlock:6,
      brief:'Дорогая максимальная конфигурация без компромиссов: быстрый CPU, GPU, 32 ГБ RAM и 2 ТБ NVMe.',
      requirements:{minCpu:4,minGpu:4,minRam:32,minBoard:3,minPsu:3,minDisk:4,minFPS:120,maxBoot:12},
      target:'Core i9 · RTX 3060 · 32 ГБ · плата уровня Z490 · БП от 650 Вт · 2 ТБ NVMe'
    }
  ];

  function orderById(id) { return ORDERS.find(function (t) { return t.id === id; }) || null; }
  function initial() { return { version:1, completed:[], active:null, drafts:{} }; }
  let state=initial();
  try {
    const raw=JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version===1) state=Object.assign(initial(),raw);
  } catch (e) {}
  if (!Array.isArray(state.completed)) state.completed=[];
  state.completed=Array.from(new Set(state.completed)).filter(function (id) { return !!orderById(id); });
  if (!state.drafts || typeof state.drafts!=='object' || Array.isArray(state.drafts)) state.drafts={};
  if (!state.active || !orderById(state.active.id) || state.completed.includes(state.active.id) ||
      !['design','assembly'].includes(state.active.phase) ||
      !Number.isSafeInteger(state.active.step) || state.active.step<0 || state.active.step>5) state.active=null;

  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zarya:builds'));
  }
  function validDraft(id) {
    const d=state.drafts[id] || {};
    const out={};
    TYPES.forEach(function (entry) {
      const type=entry[0];
      const p=G.partById(d[type]);
      out[type]=p && p.type===type ? p.id : DEFAULT_IDS[type];
    });
    return out;
  }
  function contractCost(p) {
    return p.price>0 ? p.price : (START_PRICES[p.id] || 0);
  }
  function report(id, ids) {
    const order=orderById(id);
    if (!order) return null;
    const selected=ids || validDraft(id);
    const pc=G.simulatePC(selected);
    const errors=pc.errors ? pc.errors.slice() : [];
    let price=ASSEMBLY_COST;
    TYPES.forEach(function (type) {
      const part=G.partById(selected[type[0]]);
      if (part && part.type===type[0]) price+=contractCost(part);
    });
    if (price>order.budget) errors.push('Превышен бюджет клиента на '+(price-order.budget)+' ₡');
    if (pc.parts) {
      const req=order.requirements;
      const tests=[
        [req.minCpu!==undefined && pc.cpuLevel<req.minCpu,'Нужен более производительный процессор'],
        [req.minGpu!==undefined && pc.gpuLevel<req.minGpu,'Нужна более мощная видеокарта'],
        [req.minBoard!==undefined && pc.parts.board.power<req.minBoard,'Нужна материнская плата более высокого уровня'],
        [req.minPsu!==undefined && pc.parts.psu.power<req.minPsu,'Нужен более мощный блок питания'],
        [req.minRam!==undefined && pc.ramGb<req.minRam,'Недостаточно оперативной памяти'],
        [req.minDisk!==undefined && pc.diskLevel<req.minDisk,'Накопитель слишком медленный для заказа'],
        [req.minFPS!==undefined && pc.fps<req.minFPS,'Меньше требуемых '+req.minFPS+' игровых FPS'],
        [req.maxBoot!==undefined && pc.bootSeconds>req.maxBoot,'Слишком долгий запуск ОС: более '+req.maxBoot+' сек.'],
        [req.requireM2===true && !pc.parts.board.m2,'Материнская плата должна поддерживать M.2']
      ];
      tests.forEach(function (test) { if (test[0]) errors.push(test[1]); });
    }
    return { ok:errors.length===0,errors:errors,budget:order.budget,cost:price,
      spare:order.budget-price,
      pc:pc, parts:Object.assign({},selected),order:order };
  }
  function status(order) {
    if (state.completed.includes(order.id)) return 'done';
    if (state.active && state.active.id===order.id) return 'active';
    return state.completed.length>=order.unlock ? 'available' : 'locked';
  }
  G.buildOrders=function () {
    return ORDERS.map(function (o) {
      return { id:o.id,title:o.title,client:o.client,budget:o.budget,reward:o.reward,
        unlock:o.unlock,brief:o.brief,target:o.target,status:status(o) };
    });
  };
  G.buildProgress=function () {
    return { completed:state.completed.length,total:ORDERS.length,
      active:state.active?Object.assign({},state.active):null };
  };
  G.buildDraft=function (id) { return orderById(id)?validDraft(id):null; };
  G.buildEvaluate=function (id,ids) { return report(id,ids); };
  G.buildStart=function (id) {
    const o=orderById(id);
    if (!o) return {ok:false,msg:'Заказ не найден.'};
    if (status(o)==='done') return {ok:false,msg:'Компьютер уже передан клиенту.'};
    if (status(o)==='locked') return {ok:false,msg:'Сначала заверши предыдущие сборки.'};
    if (state.active && state.active.id!==id) return {ok:false,msg:'Заверши или отмени предыдущий активный заказ.'};
    if (!state.active) state.active={id:id,phase:'design',step:0};
    state.drafts[id]=validDraft(id);
    save();
    return {ok:true,msg:'Заказ принят. Подбирай комплектующие под бюджет.'};
  };
  G.buildChoose=function (type,id) {
    const active=state.active;
    if (!active || active.phase!=='design') return {ok:false,msg:'Для выбора деталей открой этап проектирования.'};
    if (!TYPES.some(function (x) { return x[0]===type; })) return {ok:false,msg:'Неизвестный тип детали.'};
    const part=G.partById(id);
    if (!part || part.type!==type) return {ok:false,msg:'Некорректная модель комплектующего.'};
    const draft=validDraft(active.id);
    draft[type]=id;
    state.drafts[active.id]=draft;
    save();
    return {ok:true,msg:'Выбрано: '+part.name};
  };
  G.buildConfirm=function () {
    if (!state.active || state.active.phase!=='design') return {ok:false,msg:'Сначала начни подбор деталей.'};
    const check=report(state.active.id);
    if (!check.ok) return {ok:false,msg:'Исправь ошибки конфигурации перед сборкой.',errors:check.errors};
    state.active.phase='assembly';
    state.active.step=0;
    save();
    return {ok:true,msg:'Конфигурация одобрена! Теперь собери компьютер.'};
  };
  G.buildAssemblySteps=function () { return STEPS.map(function (s) { return s.slice(); }); };
  G.buildAssemble=function (action) {
    if (!state.active || state.active.phase!=='assembly') return {ok:false,msg:'Сначала подбери совместимые комплектующие.'};
    const expected=STEPS[state.active.step];
    if (!expected || action!==expected[0]) return {ok:false,msg:'Неверное действие. Следующий шаг: '+(expected?expected[1]:'неизвестен')};
    const check=report(state.active.id);
    if (!check.ok) {
      state.active.phase='design'; state.active.step=0; save();
      return {ok:false,msg:'Сборка больше не соответствует заказу. Проверь детали.'};
    }
    if (action==='deliver') {
      const o=orderById(state.active.id);
      const paid=G.awardBuildContract(o.id,o.reward);
      if (!paid.ok && !paid.alreadyPaid) return paid;
      state.completed.push(o.id);
      state.active=null;
      save();
      return {ok:true,delivered:true,reward:paid.ok?o.reward:0,
        msg:paid.ok?'Компьютер передан клиенту. +'+o.reward+' ₡ на баланс.':'Сборка завершена. Оплата уже получена.'};
    }
    state.active.step++;
    save();
    return {ok:true,msg:'Шаг выполнен. '+STEPS[state.active.step][1]};
  };
  G.buildCancel=function () {
    if (!state.active) return {ok:false,msg:'Нет активной сборки.'};
    state.active=null;
    save();
    return {ok:true,msg:'Сборка отменена. Подобранные детали сохранены в черновике.'};
  };
  const reset=G.reset.bind(G);
  G.reset=function () {
    state=initial();
    try { localStorage.removeItem(KEY); } catch (e) {}
    reset();
    save();
  };
  save();

  function make(html) {
    const t=document.createElement('template');
    t.innerHTML=html.trim();
    return t.content.firstElementChild;
  }
  function format(n) { return Math.round(n).toLocaleString('ru-RU')+' ₡'; }

  const App=(function () {
    let root=null,api=null,listener=null,selected='build-01';
    function show() {
      if (!root || !root.isConnected) return;
      const jobs=G.buildOrders(),prog=G.buildProgress();
      if (!jobs.some(function (o) { return o.id===selected; })) selected=jobs[0].id;
      root.querySelector('[data-pb="progress"]').textContent=prog.completed+' / '+prog.total;
      root.querySelector('[data-pb="money"]').textContent=format(G.money());
      const list=root.querySelector('[data-pb="list"]');
      list.replaceChildren();
      jobs.forEach(function (o) {
        const b=make('<button type="button" class="pb-ticket"><span class="pb-ticket-meta"></span><strong></strong><small></small></button>');
        const label={done:'ГОТОВО',active:'СОБИРАЕМ',locked:'ЗАКРЫТО',available:'ДОСТУПНО'}[o.status];
        b.querySelector('.pb-ticket-meta').textContent=o.id.toUpperCase()+' · '+label;
        b.querySelector('strong').textContent=o.title;
        b.querySelector('small').textContent=o.client+' · '+format(o.reward);
        b.classList.toggle('selected',o.id===selected);
        b.classList.toggle('finished',o.status==='done');
        b.addEventListener('click',function () { selected=o.id;show(); });
        list.appendChild(b);
      });
      const o=jobs.find(function (j) { return j.id===selected; });
      const detail=root.querySelector('[data-pb="detail"]');
      const offset=detail.scrollTop;
      detail.replaceChildren();
      const view=make('<div class="pb-detail"><span class="part-kicker"></span><h3></h3><p class="pb-brief"></p>'+
        '<div class="pb-requirements"></div><div data-pb="work"></div><p class="pb-feedback" data-pb="feedback" role="status"></p></div>');
      view.querySelector('.part-kicker').textContent=o.client+' · вознаграждение '+format(o.reward);
      view.querySelector('h3').textContent=o.title;
      view.querySelector('.pb-brief').textContent=o.brief;
      view.querySelector('.pb-requirements').textContent='Требования: '+o.target;
      const actions=view.querySelector('[data-pb="work"]');
      function respond(result) {
        if (result.ok) {
          if (window.UI) window.UI.toast(result.msg,'ok');
          show();
        } else {
          const hint=root && root.querySelector('[data-pb="feedback"]');
          if (hint) hint.textContent=result.msg+(result.errors?' '+result.errors.join(' · '):'');
        }
      }
      const active=prog.active && prog.active.id===o.id ? prog.active:null;
      if (o.status==='done') {
        const completed=make('<p class="pb-finished">Компьютер успешно собран и передан заказчику. Награда получена.</p>');
        actions.appendChild(completed);
      } else if (o.status==='locked') {
        const locked=make('<p class="pb-locked"></p>');
        locked.textContent='Для открытия требуется завершить '+o.unlock+' заказов. Сейчас: '+prog.completed+'.';
        actions.appendChild(locked);
      } else if (!active) {
        const b=make('<button type="button" class="btn btn--primary pb-big-button">Принять заказ</button>');
        b.addEventListener('click',function () { respond(G.buildStart(o.id)); });
        actions.appendChild(b);
        if (prog.active) {
          const msg=make('<p class="muted pb-small-note">Сначала заверши или отмени текущую сборку.</p>');
          actions.appendChild(msg);
        }
      } else if (active.phase==='design') {
        const draft=G.buildDraft(o.id);
        const grid=make('<div class="pb-picker-grid"></div>');
        TYPES.forEach(function (entry) {
          const type=entry[0],label=entry[1];
          const wrapper=make('<label class="pb-picker"><span></span><select></select></label>');
          wrapper.querySelector('span').textContent=label;
          const select=wrapper.querySelector('select');
          G.partsCatalog(type).forEach(function (p) {
            const option=document.createElement('option');
            option.value=p.id;
            option.textContent=p.name+' · '+format(contractCost(p));
            if (draft[type]===p.id) option.selected=true;
            select.appendChild(option);
          });
          select.addEventListener('change',function (e) {
            respond(G.buildChoose(type,e.target.value));
          });
          grid.appendChild(wrapper);
        });
        actions.appendChild(grid);
        const result=G.buildEvaluate(o.id);
        const metrics=make('<div class="pb-stats"></div>');
        [
          ['Стоимость',format(result.cost)+' / '+format(result.budget)],
          ['Остаток бюджета',format(result.spare)],
          ['Игровой FPS',result.pc.fps+' FPS'],
          ['Память',result.pc.ramGb+' ГБ'],
          ['Загрузка ОС',result.pc.bootSeconds+' сек.'],
          ['Блок питания',result.pc.requiredWatts+' / '+result.pc.suppliedWatts+' Вт']
        ].forEach(function (pair) {
          const item=make('<div><span></span><b></b></div>');
          item.querySelector('span').textContent=pair[0];
          item.querySelector('b').textContent=pair[1];
          metrics.appendChild(item);
        });
        actions.appendChild(metrics);
        const feedback=make('<div class="pb-validation"></div>');
        const title=make('<strong></strong>');
        title.textContent=result.ok?'Компьютер соответствует заказу!':'Что нужно исправить:';
        feedback.classList.toggle('valid',result.ok);
        feedback.appendChild(title);
        const lines=make('<ul></ul>');
        (result.ok?['Совместимость, бюджет и требования проверены.']:result.errors).forEach(function (text) {
          const item=make('<li></li>');
          item.textContent=text;
          lines.appendChild(item);
        });
        feedback.appendChild(lines);
        actions.appendChild(feedback);
        const buttons=make('<div class="pb-buttons"><button type="button" class="btn btn--primary">Подтвердить конфигурацию</button><button type="button" class="btn">Отменить заказ</button></div>');
        const [confirm,cancel]=buttons.querySelectorAll('button');
        confirm.disabled=!result.ok;
        confirm.addEventListener('click',function () { respond(G.buildConfirm()); });
        cancel.addEventListener('click',function () { respond(G.buildCancel()); });
        actions.appendChild(buttons);
      } else if (active.phase==='assembly') {
        const title=make('<h4 class="pb-assembly-heading">Этап сборки компьютера</h4>');
        actions.appendChild(title);
        const diagram=make('<div class="pb-pc-illustration" aria-label="Схема собранного ПК">'+
          '<div class="pb-board"><span class="pb-cpu-chip">CPU</span><span class="pb-ram-chips">RAM</span>'+
          '<span class="pb-gpu-slot">GPU</span><span class="pb-disk-chip">SSD</span></div>'+
          '<div class="pb-psu">PSU</div><div class="pb-power-line"></div></div>');
        diagram.setAttribute('data-step',String(active.step));
        actions.appendChild(diagram);
        const progress=make('<div class="pb-assembly-progress"></div>');
        STEPS.forEach(function (step,i) {
          const entry=make('<div class="pb-assembly-step"><span></span><b></b></div>');
          entry.querySelector('span').textContent=String(i+1);
          entry.querySelector('b').textContent=step[1];
          entry.classList.toggle('complete',i<active.step);
          entry.classList.toggle('current',i===active.step);
          progress.appendChild(entry);
        });
        actions.appendChild(progress);
        const row=make('<div class="pb-buttons"><button type="button" class="btn btn--primary"></button><button type="button" class="btn">Отменить сборку</button></div>');
        const buttons=row.querySelectorAll('button');
        const step=STEPS[active.step];
        buttons[0].textContent=step[1];
        buttons[0].addEventListener('click',function () { respond(G.buildAssemble(step[0])); });
        buttons[1].addEventListener('click',function () { respond(G.buildCancel()); });
        actions.appendChild(row);
      }
      detail.appendChild(view);
      detail.scrollTop=offset;
    }
    function mount(openApi) {
      api=openApi;
      root=make('<div class="app pb-app"><div class="app-head"><div><h2>Сборка на заказ</h2>'+
        '<p class="muted">Конфигуратор клиентов · совместимость · мини-игра сборки</p></div>'+
        '<div class="pb-wallet"><b data-pb="progress"></b><span data-pb="money"></span></div></div>'+
        '<div class="pb-layout"><div class="pb-tickets" data-pb="list"></div>'+
        '<section class="pb-detail-scroll" data-pb="detail"></section></div>'+
        '<p class="muted pb-footnote">У каждого клиента собственный бюджет. Выбираемые детали оплачивает клиент, а твой личный инвентарь не расходуется. '+ 
        'Модели и производительность — условная игровая симуляция.</p></div>');
      api.body.appendChild(root);
      const progress=G.buildProgress();
      if (progress.active) selected=progress.active.id;
      listener=show;
      window.addEventListener('zarya:builds',listener);
      window.addEventListener('zarya:game',listener);
      show();
    }
    function close() {
      if (listener) {
        window.removeEventListener('zarya:builds',listener);
        window.removeEventListener('zarya:game',listener);
      }
      listener=null; root=null; api=null;
    }
    return {mount:mount,onClose:close};
  })();
  window.APPICONS.pcOrders='<svg viewBox="0 0 32 32" aria-hidden="true">'+
    '<rect x="3" y="5" width="26" height="23" rx="4" fill="#255c79"/>'+
    '<rect x="7" y="10" width="10" height="11" rx="2" fill="#79cfe7"/>'+
    '<path d="M20 11h5M20 16h5M20 21h5M8 25h16" fill="none" stroke="#c5f6ff" stroke-width="2" stroke-linecap="round"/>'+
    '</svg>';
  window.APPS['pc-orders']={
    name:'Сборка на заказ',icon:window.APPICONS.pcOrders,
    w:1100,h:680,mount:App.mount,onClose:App.onClose
  };
})();