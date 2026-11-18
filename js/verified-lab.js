/* Zarya OS 2.2.1 — verified wallet UI. No claims of protecting offline money. */
(function () {
  'use strict';
  const CASE_MODES = [
    ['observe','Аудит цепочки событий'],
    ['restore','Восстановление тестовой записи'],
    ['contain','Изоляция виртуального инцидента']
  ];
  const ZONES=[['edge','Периметр'],['relay','Переход'],['store','Хранилище']];
  function elem(html) {
    const template=document.createElement('template');
    template.innerHTML=html.trim();
    return template.content.firstElementChild;
  }
  function format(n) { return Number(n||0).toLocaleString('ru-RU')+' ₡'; }
  const VerifiedLab=(function(){
    let root=null,session=null,evidence=null,draft=null,note='',selected='op01';
    let busy=false,opened=false;
    async function api(path,body){
      const opts={credentials:'same-origin',cache:'no-store'};
      if(body){
        opts.method='POST';
        opts.headers={'Content-Type':'application/json'};
        opts.body=JSON.stringify(body);
      }
      const response=await fetch('/api/verified/'+path,opts);
      const json=await response.json();
      return Object.assign({httpStatus:response.status},json);
    }
    async function refresh(){
      try {
        const data=await api('state');
        if(!data.ok||data.verified!==true)throw Error('API unavailable');
        session=data;
        return true;
      }catch(error){
        session=null;
        return false;
      }
    }
    async function action(path,body){
      if(busy||!session)return;
      busy=true;note='';
      try{
        const result=await api(path,body);
        note=result.message||'Сервер отклонил запрос.';
        if(result.reward){
          note+=' Зачислено '+format(result.reward)+' на подтверждённый баланс.';
        }
        await refresh();
        if(path==='start'&&result.ok) {evidence=null;draft=null;}
        if(path==='inspect'&&result.ok) {
          evidence=result.evidence;
          if(!draft)draft={marker:'',route:{edge:'',relay:'',store:''},mode:'observe'};
        }
      }catch(err){
        note='Сервер недоступен. Локальные деньги не изменялись.';
        session=null;
      }finally{
        busy=false;
        paint();
      }
    }
    function trigger(text,callback,primary=false){
      const b=elem('<button class="btn" type="button"></button>');
      b.textContent=text;
      if(primary)b.classList.add('btn--primary');
      b.disabled=busy;
      b.addEventListener('click',callback);
      return b;
    }
    function heading(text,detail){
      const box=elem('<header class="vl-section"><h3></h3><p></p></header>');
      box.querySelector('h3').textContent=text;
      box.querySelector('p').textContent=detail;
      return box;
    }
    function disconnected(parent){
      const card=elem('<section class="vl-disconnected"><div class="vl-disconnect-icon"></div>'+
        '<h3>Сервер подтверждённых наград не подключён</h3><p></p>'+
        '<div class="vl-disconnect-command"><code>node server/verified-server.cjs</code></div>'+
        '<p class="vl-disconnect-foot"></p></section>');
      card.querySelector('.vl-disconnect-icon').textContent='!';
      card.querySelector('p').textContent='Обычная версия на GitHub Pages остаётся офлайн-игрой. '+
        'Её баланс по-прежнему хранится в браузере и может быть изменён. '+
        'Этот режим работает только при запуске игры через отдельный сервер Zarya OS.';
      card.querySelector('.vl-disconnect-foot').textContent=
        'Запусти сервер из папки проекта, затем открой http://127.0.0.1:8787/ . '+
        'Потребуется Node.js 20 или новее. Это отдельный тестовый кошелёк.';
      parent.appendChild(card);
      parent.appendChild(trigger('Проверить соединение',async()=>{
        busy=true;note='';paint();
        const connected=await refresh();
        note=connected?'Сервер подключён.':'Сервер всё ещё недоступен.';
        busy=false;paint();
      },true));
    }
    function stat(label,value){
      const item=elem('<div class="vl-stat"><small></small><strong></strong></div>');
      item.querySelector('small').textContent=label;
      item.querySelector('strong').textContent=value;
      return item;
    }
    function summary(parent){
      const stats=elem('<div class="vl-stats"></div>');
      stats.appendChild(
        stat('Серверные ₡',format(session.verifiedBalance)),
        stat('Локальные ₡ (не защищены)',format(window.Game.money())),
        stat('Подтверждено операций',session.completed.length+' / 8')
      );
      parent.appendChild(stats);
      const desc=elem('<p class="vl-hint"></p>');
      desc.textContent='Это два НЕ связанных между собой баланса. Сервер никогда не читает деньги из '+
        'localStorage и не принимает сумму награды от браузера. '+
        'Подтверждённые ₡ пока используются только в этом учебном режиме.';
      parent.appendChild(desc);
    }
    function eventList(parent){
      const events=elem('<section class="vl-ledger"></section>');
      events.appendChild(heading('История подтверждённых операций',
        'Записи получены с сервера, не из локального сохранения.'));
      if(!session.ledger.length){
        const p=elem('<p class="vl-empty">Пока событий нет.</p>');
        events.appendChild(p);
      }
      session.ledger.slice().reverse().slice(0,8).forEach(x=>{
        const r=elem('<div class="vl-ledger-item"><span></span><b></b></div>');
        r.querySelector('span').textContent=x.type+' · '+(x.caseId||'—');
        r.querySelector('b').textContent=x.detail||'—';
        events.appendChild(r);
      });
      parent.appendChild(events);
    }
    function verifiedShop(parent){
      parent.appendChild(heading('Магазин подтверждённых сертификатов',
        'Это косметические знаки отличия. Их покупка и стоимость проверяются сервером, а не браузером.'));
      const grid=elem('<div class="vl-shop"></div>');
      (session.catalog||[]).forEach(item=>{
        const owned=(session.owned||[]).includes(item.id);
        const card=elem('<section class="vl-shop-card"><span class="vl-shop-symbol"></span>' +
          '<h4></h4><p></p><button type="button" class="btn"></button></section>');
        card.querySelector('.vl-shop-symbol').textContent=item.id==='gold'?'★':item.id==='silver'?'✦':'◇';
        card.querySelector('h4').textContent=item.name;
        card.querySelector('p').textContent=owned?'Приобретено на сервере':'Цена: '+format(item.price);
        const b=card.querySelector('button');
        b.textContent=owned?'Получено':'Купить';
        b.disabled=owned||busy||session.verifiedBalance<item.price;
        b.addEventListener('click',()=>action('purchase',{id:item.id}));
        grid.appendChild(card);
      });
      parent.appendChild(grid);
    }
    function cases(parent){
      parent.appendChild(heading('Операции с серверной проверкой',
        'Решение вычисляется и проверяется на сервере. В отчёте нельзя указать сумму выплаты.'));
      const list=elem('<div class="vl-case-list"></div>');
      session.cases.forEach(c=>{
        const item=elem('<button type="button" class="vl-case"><span></span><b></b><small></small></button>');
        item.querySelector('span').textContent=c.id.toUpperCase()+' · '+
          ({done:'ПРОЙДЕНО',locked:'ЗАКРЫТО',active:'В РАБОТЕ',available:'ДОСТУПНО'})[c.status];
        item.querySelector('b').textContent=c.name;
        item.querySelector('small').textContent='Цель: '+c.asset+' · '+format(c.reward);
        item.classList.toggle('selected',selected===c.id);
        item.classList.toggle('disabled',c.status==='locked');
        item.addEventListener('click',()=>{
          selected=c.id;
          if(!session.active||session.active.id!==c.id){evidence=null;draft=null;}
          paint();
        });
        list.appendChild(item);
      });
      parent.appendChild(list);
      const c=session.cases.find(x=>x.id===selected);
      if(!c)return;
      const active=session.active;
      if(!active||active.id!==c.id){
        if(c.status==='available'&&!active){
          const start=elem('<div class="vl-start"></div>');
          start.appendChild(trigger('Начать серверную операцию',()=>action('start',{id:c.id}),true));
          parent.appendChild(start);
        }
        if(c.status==='locked')parent.appendChild(elem('<p class="vl-empty">Сначала пройди предыдущую операцию.</p>'));
        if(c.status==='done')parent.appendChild(elem('<p class="vl-completed">Награда уже выдана. Повторная выплата невозможна.</p>'));
        if(active&&active.id!==c.id)parent.appendChild(elem('<p class="vl-empty">Заверши текущее серверное расследование.</p>'));
        return;
      }
      if(active.status==='failed'){
        const b=elem('<p class="vl-empty">Попытка не удалась. Допустим новый запуск этого кейса, но денег за прежнюю попытку не начислено.</p>');
        parent.appendChild(b);
        parent.appendChild(trigger('Начать заново',()=>action('start',{id:c.id}),true));
        return;
      }
      const count=elem('<p class="vl-progress"></p>');
      count.textContent='Журналы '+active.opened.length+'/6 · действия '+active.turns+'/15 · риск '+
        active.exposure+'/85 · ошибки '+active.errors+'/3';
      parent.appendChild(count);
      parent.appendChild(heading('1. Исследовать стенд',
        'Открой минимум четыре узла. Сервер запоминает просмотренные журналы и ограничивает риск.'));
      const nodes=elem('<div class="vl-nodes"></div>');
      active.nodes.forEach(n=>{
        const btn=elem('<button type="button" class="vl-node"><strong></strong><span></span></button>');
        btn.querySelector('strong').textContent=n.id;
        btn.querySelector('span').textContent=active.opened.includes(n.id)?'Изучен':'Открыть журнал';
        btn.classList.toggle('read',active.opened.includes(n.id));
        btn.disabled=busy;
        btn.addEventListener('click',()=>action('inspect',{node:n.id}));
        nodes.appendChild(btn);
      });
      parent.appendChild(nodes);
      const report=elem('<div class="vl-log"><span></span><pre></pre></div>');
      report.querySelector('span').textContent=evidence?evidence.node:'Журнал';
      report.querySelector('pre').textContent=evidence?evidence.lines.join('\n'):
        'Выбери узел выше. Свяжи общий event=... между трёмя сегментами и целевым объектом.';
      parent.appendChild(report);
      if(!draft)draft={marker:'',route:{edge:'',relay:'',store:''},mode:'observe'};
      parent.appendChild(heading('2. Подготовить заключение',
        'Составь маршрут из исследованных узлов и общий идентификатор события.'));
      const form=elem('<div class="vl-input-grid"></div>');
      function select(label,options,value,callback){
        const wrap=elem('<label class="vl-select"><span></span><select></select></label>');
        wrap.querySelector('span').textContent=label;
        const s=wrap.querySelector('select');
        options.forEach(o=>{
          const option=document.createElement('option');
          option.value=o[0];option.textContent=o[1];s.appendChild(option);
        });
        s.value=value||'';
        s.addEventListener('change',()=>callback(s.value));
        return wrap;
      }
      const markers=new Set();
      // Only markers from inspected evidence are selectable; no fixed answers.
      if(evidence){
        evidence.lines.forEach(line=>{
          const found=line.match(/event=([A-Z0-9]+)/);
          if(found)markers.add(found[1]);
        });
      }
      if(draft.marker)markers.add(draft.marker);
      form.appendChild(select('Маркер события',[['','Выбери из журнала…'],
        ...Array.from(markers).map(m=>[m,m])],draft.marker,v=>{draft.marker=v;}));
      ZONES.forEach(([zone,name])=>{
        form.appendChild(select(name,[['','Не выбран'],
          ...active.nodes.filter(n=>n.zone===zone&&active.opened.includes(n.id)).map(n=>[n.id,n.id])],
          draft.route[zone],v=>{draft.route[zone]=v;}));
      });
      form.appendChild(select('Заключение',CASE_MODES,draft.mode,v=>{draft.mode=v;}));
      parent.appendChild(form);
      const submit=trigger('Отправить заключение на сервер',()=>{
        return action('report',{marker:draft.marker,route:draft.route,mode:draft.mode});
      },true);
      submit.disabled=busy||active.opened.length<4;
      parent.appendChild(submit);
    }
    function paint(){
      if(!root||!opened)return;
      const body=root.querySelector('[data-vl="body"]');
      const scroll=body.scrollTop;body.replaceChildren();
      const badge=root.querySelector('[data-vl="status"]');
      badge.textContent=session?'SERVER VERIFIED':'OFFLINE / UNVERIFIED';
      badge.classList.toggle('connected',!!session);
      const msg=root.querySelector('[data-vl="message"]');
      msg.textContent=note;
      msg.hidden=!note;
      if(!session){
        disconnected(body);
        body.scrollTop=scroll;
        return;
      }
      summary(body);
      cases(body);
      verifiedShop(body);
      eventList(body);
      body.scrollTop=scroll;
    }
    async function mount(apiHost){
      root=elem('<div class="app vl-app"><header class="vl-head"><div>' +
        '<span class="vl-overline">ZARYA OS 2.2.1 · SECURITY OVERHAUL</span>' +
        '<h2>Подтверждённый кошелёк</h2>' +
        '<p>Экспериментальная серверная проверка игровых операций</p></div>' +
        '<span data-vl="status" class="vl-status">ПОДКЛЮЧЕНИЕ</span></header>' +
        '<div class="vl-body" data-vl="body" role="region" aria-label="Подтверждённый режим" tabindex="0"></div>'+
        '<p data-vl="message" class="vl-message" role="status" hidden></p>' +
        '<footer class="vl-footer">Локальная экономика других приложений не защищена сервером. '+
        'Серверный кошелёк — отдельная демонстрация.</footer></div>');
      apiHost.body.appendChild(root);
      session=null;note='';evidence=null;draft=null;selected='op01';busy=false;opened=true;
      const connected=await refresh();
      note=connected?'Подключено к серверу проверяемых операций.':
        'Этот сайт запущен без сервера Zarya OS.';
      paint();
    }
    function close(){opened=false;root=null;session=null;draft=null;evidence=null;}
    return {mount,close};
  })();
  window.APPICONS.verifiedLab='<svg viewBox="0 0 32 32" aria-hidden="true">'+
    '<path d="M16 2L28 7v9c0 8-6 12-12 14C10 28 4 24 4 16V7z" fill="#286177" stroke="#91d8cd" stroke-width="2"/>'+
    '<path d="M10 16l4 4 8-9" stroke="#d5fff3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  window.APPS['verified-lab']={name:'Проверка безопасности',
    icon:window.APPICONS.verifiedLab,w:1020,h:710,mount:VerifiedLab.mount,onClose:VerifiedLab.close};
})();