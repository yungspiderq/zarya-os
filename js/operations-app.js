/* ЗАРЯ OS 2.2 — Operations Lab interface. Entirely fictional and offline. */
(function(){
  'use strict';
  const G=window.Game;
  const ZONES=[['edge','Периметр'],['relay','Внутренний сегмент'],['store','Хранилище']];
  function element(html){
    const t=document.createElement('template');t.innerHTML=html.trim();
    return t.content.firstElementChild;
  }
  function stat(label,value){
    const n=element('<div class="ops-stat"><span></span><strong></strong></div>');
    n.querySelector('span').textContent=label;n.querySelector('strong').textContent=value;
    return n;
  }
  const OpsApp=(function(){
    let root=null,api=null,selected='op01',inspectedNode=null,feedback='',listener=null;
    function message(r){
      feedback=r.msg||'';
      if(r.ok&&r.completed&&window.UI&&window.UI.toast)window.UI.toast(r.msg,'ok');
      draw();
    }
    function control(label,callback,primary){
      const b=element('<button type="button" class="btn"></button>');
      b.textContent=label;if(primary)b.classList.add('btn--primary');
      b.addEventListener('click',function(){message(callback());});
      return b;
    }
    function currentCase(){return G.opsCases().find(c=>c.id===selected);}
    function heading(title,desc){
      const n=element('<header class="ops-section-head"><h3></h3><p></p></header>');
      n.querySelector('h3').textContent=title;
      n.querySelector('p').textContent=desc;
      return n;
    }
    function renderCases(list,cases,active){
      cases.forEach(c=>{
        const item=element('<button type="button" class="ops-case"><div class="ops-case-first">' +
          '<span></span><small></small></div><strong></strong><p></p><span class="ops-case-status"></span></button>');
        item.querySelector('.ops-case-first span').textContent=c.id.toUpperCase();
        item.querySelector('.ops-case-first small').textContent='ЭТАП '+c.level+' / 8';
        item.querySelector('strong').textContent=c.name;
        item.querySelector('p').textContent=c.client;
        item.querySelector('.ops-case-status').textContent={
          done:'ЗАКРЫТО',active:'В РАБОТЕ',locked:'ЗАКРЫТО ДО ПРОХОЖДЕНИЯ',available:'ДОСТУПНО'
        }[c.status];
        item.classList.toggle('selected',c.id===selected);
        item.classList.toggle('done',c.status==='done');
        item.classList.toggle('locked',c.status==='locked');
        item.addEventListener('click',function(){
          selected=c.id;inspectedNode=null;feedback='';draw();
        });
        list.appendChild(item);
      });
      if(active&&selected!==active.id){
        const hint=element('<p class="ops-rail-hint"></p>');
        hint.textContent='Активное расследование: '+active.id+'. Вернись к нему, чтобы продолжить.';
        list.appendChild(hint);
      }
    }
    function overview(body,c,active){
      const cover=element('<section class="ops-brief"><div class="ops-brief-tag"></div>' +
        '<h2></h2><p class="ops-client"></p><p class="ops-brief-text"></p>' +
        '<div class="ops-objective"></div></section>');
      cover.querySelector('.ops-brief-tag').textContent='ДОСЬЕ / '+c.id.toUpperCase();
      cover.querySelector('h2').textContent=c.name;
      cover.querySelector('.ops-client').textContent='Заказчик: '+c.client;
      cover.querySelector('.ops-brief-text').textContent=c.brief;
      cover.querySelector('.ops-objective').textContent='Объект расследования: '+c.asset+
        '  ·  Награда: '+c.reward.toLocaleString('ru-RU')+' ₡';
      body.appendChild(cover);
      if(c.status==='locked')body.appendChild(element('<p class="ops-empty">Сначала пройди предыдущую операцию. Доступ откроется по цепочке.</p>'));
      else if(c.status==='done')body.appendChild(element('<p class="ops-success">Досье закрыто. Цепочка подтверждена, оплата выдана. Выбери следующий кейс.</p>'));
      else if(active&&active.id!==c.id)body.appendChild(element('<p class="ops-empty">Заверши текущий активный кейс, прежде чем начинать другой.</p>'));
      else body.appendChild(control('Начать расследование',()=>G.opsStart(c.id),true));
      const description=element('<section class="ops-guide"><h3>Как работать с виртуальными журналами</h3>' +
        '<p>Изучай отчёты отдельных узлов и сравнивай метки событий, отметки времени и назначения. ' +
        'Построй маршрут через три зоны, докажи маркер цепочки и выбери действие, соответствующее поручению клиента. ' +
        'Минимум четыре независимых журнала должны быть проверены. Каждое первое открытие журнала расходует действие и повышает риск обнаружения.</p>' +
        '<p>Слишком большое число ошибок, высокий риск или превышение лимита действий срывают операцию. ' +
        'Все названия и события существуют только внутри этой игры.</p></section>');
      body.appendChild(description);
    }
    function pill(label,value){
      const n=element('<div class="ops-stat-pill"><span></span><strong></strong></div>');
      n.querySelector('span').textContent=label;
      n.querySelector('strong').textContent=value;
      return n;
    }
    function dossier(body,c,active){
      if(active.status==='failed'){
        body.appendChild(element('<p class="ops-failed">Расследование сорвано. Ты можешь начать новый сеанс этого же кейса с чистыми журналами. За провал уже списаны очки доверия.</p>'));
        body.appendChild(control('Повторить кейс',()=>G.opsStart(c.id),true));
        return;
      }
      const stats=element('<div class="ops-live-stats"></div>');
      stats.appendChild(pill('Просмотрено',active.opened.length+' / 6'),
        pill('Действия',active.turns+' / '+active.turnLimit),
        pill('Риск',active.exposure+' / '+active.exposureLimit),
        pill('Ошибки',active.errors+' / 3'));
      body.appendChild(stats);
      const risk=element('<div class="ops-risk"><span>Общий уровень риска наблюдения</span>' +
        '<div><i></i></div></div>');
      risk.querySelector('i').style.width=Math.min(100,active.exposure/active.exposureLimit*100)+'%';
      risk.classList.toggle('is-hot',active.exposure>=55);
      body.appendChild(risk);
      const brief=element('<div class="ops-mission-note"><strong></strong><p></p></div>');
      brief.querySelector('strong').textContent='Задача: '+c.asset;
      brief.querySelector('p').textContent=c.brief;
      body.appendChild(brief);
      body.appendChild(heading('1. Разведка и анализ журналов',
        'Каждая зона имеет по два варианта узлов. Настоящая цепочка подтверждается общим маркером и объектом в журнале хранилища.'));
      const schematic=element('<div class="ops-map"></div>');
      ZONES.forEach(([zone,title],z)=>{
        const column=element('<section class="ops-zone"><div class="ops-zone-title"><span></span><b></b></div>' +
          '<div class="ops-zone-nodes"></div></section>');
        column.querySelector('.ops-zone-title span').textContent='СЕГМЕНТ 0'+(z+1);
        column.querySelector('.ops-zone-title b').textContent=title;
        c.nodes.filter(n=>n.zone===zone).forEach(n=>{
          const viewed=active.opened.includes(n.id);
          const node=element('<button type="button" class="ops-node"><span class="ops-node-light"></span>' +
            '<strong></strong><small></small><span class="ops-node-state"></span></button>');
          node.querySelector('strong').textContent=n.id;
          node.querySelector('small').textContent='Уровень мониторинга '+n.monitor;
          node.querySelector('.ops-node-state').textContent=viewed?'ЖУРНАЛ ПРОЧИТАН':'ИССЛЕДОВАТЬ';
          node.classList.toggle('viewed',viewed);
          node.classList.toggle('focused',inspectedNode===n.id);
          node.addEventListener('click',function(){
            inspectedNode=n.id;message(G.opsInspect(n.id));
          });
          column.querySelector('.ops-zone-nodes').appendChild(node);
        });
        schematic.appendChild(column);
      });
      body.appendChild(schematic);
      const consoleBox=element('<div class="ops-console"><div class="ops-console-title">' +
        '<span class="ops-console-led"></span><strong>ЖУРНАЛ / ОТЧЁТ</strong><small></small></div>' +
        '<pre class="ops-console-text"></pre></div>');
      const evidence=inspectedNode?G.opsEvidence(inspectedNode):null;
      consoleBox.querySelector('small').textContent=evidence?evidence.id:'нет выбранного узла';
      consoleBox.querySelector('pre').textContent=evidence?evidence.lines.join('\n'):
        'Выбери узел на схеме, чтобы прочитать его виртуальный журнал.\n'+
        'Сравни один и тот же event=... на границе, переходе и записи объекта.\n'+
        'Отвлекающие события также присутствуют в логах.';
      body.appendChild(consoleBox);
      body.appendChild(heading('2. Реконструкция маршрута',
        'Не угадывай: маркер должен совпадать между журналами всех трёх зон, а в хранилище должен быть указан объект из договора.'));
      const plan=element('<section class="ops-plan"><div class="ops-inputs"></div></section>');
      const inputs=plan.querySelector('.ops-inputs');
      const marker=element('<label class="ops-select"><span>Маркер корреляции</span><select></select></label>');
      const markerEmpty=document.createElement('option');
      markerEmpty.value='';markerEmpty.textContent='Выбрать маркер...';marker.querySelector('select').appendChild(markerEmpty);
      c.markerOptions.forEach(m=>{
        const opt=document.createElement('option');opt.value=m;opt.textContent=m;
        marker.querySelector('select').appendChild(opt);
      });
      marker.querySelector('select').value=active.marker||'';
      marker.querySelector('select').addEventListener('change',e=>message(G.opsSetMarker(e.target.value)));
      inputs.appendChild(marker);
      ZONES.forEach(([zone,title])=>{
        const select=element('<label class="ops-select"><span></span><select></select></label>');
        select.querySelector('span').textContent=title;
        const list=select.querySelector('select');
        const empty=document.createElement('option');empty.value='';empty.textContent='Узел не выбран';list.appendChild(empty);
        c.nodes.filter(n=>n.zone===zone).forEach(n=>{
          const opt=document.createElement('option');opt.value=n.id;opt.textContent=n.id+' · '+n.title;
          list.appendChild(opt);
        });
        list.value=active.path[zone]||'';
        list.addEventListener('change',()=>message(G.opsSetNode(zone,list.value)));
        inputs.appendChild(select);
      });
      body.appendChild(plan);
      body.appendChild(heading('3. Заключение и решение',
        'Выбери допустимую для этого договора форму проверки. Не меняй данные, если клиент просит только аудит.'));
      const modes=element('<div class="ops-mode-grid"></div>');
      c.modes.forEach(m=>{
        const option=element('<label class="ops-mode"><input type="radio" name="ops-mode">' +
          '<div><strong></strong><p></p></div></label>');
        option.querySelector('input').value=m.id;
        option.querySelector('input').checked=active.mode===m.id;
        option.querySelector('strong').textContent=m.label;
        option.querySelector('p').textContent=m.hint;
        option.querySelector('input').addEventListener('change',()=>message(G.opsSetMode(m.id)));
        modes.appendChild(option);
      });
      body.appendChild(modes);
      const actions=element('<div class="ops-actions"></div>');
      const report=control('Проверить заключение',()=>G.opsSubmit(),true);
      report.disabled=active.opened.length<4||!active.marker||!active.mode||
        ZONES.some(([zone])=>!active.path[zone]);
      actions.appendChild(report);
      actions.appendChild(control('Пауза: −12 риска, +2 действия',()=>G.opsQuietCheck()));
      body.appendChild(actions);
    }
    function draw(){
      if(!root||!root.isConnected)return;
      const cases=G.opsCases(),s=G.opsState();
      root.querySelector('[data-ops="progress"]').textContent=s.completed+' / '+s.total;
      root.querySelector('[data-ops="confidence"]').textContent=s.confidence+'%';
      const rail=root.querySelector('[data-ops="case-list"]');
      rail.replaceChildren();
      renderCases(rail,cases,s.current);
      const detail=root.querySelector('[data-ops="detail"]');
      const scroll=detail.scrollTop;detail.replaceChildren();
      const c=currentCase();
      if(c){
        if(s.current&&s.current.id===c.id)dossier(detail,c,s.current);
        else overview(detail,c,s.current);
      }
      detail.scrollTop=scroll;
      const status=root.querySelector('[data-ops="feedback"]');
      status.textContent=feedback;status.hidden=!feedback;
    }
    function mount(openApi){
      api=openApi;selected='op01';inspectedNode=null;feedback='';
      root=element('<div class="app ops-app"><header class="ops-head"><div>' +
        '<span class="ops-overline">ZARYA OS · VIRTUAL NETWORK OPERATIONS</span>' +
        '<h2>Операционный центр</h2><p>Восемь сложных расследований в полностью вымышленной закрытой сети</p></div>' +
        '<div class="ops-head-stats"><div><span>Досье</span><strong data-ops="progress"></strong></div>' +
        '<div><span>Доверие</span><strong data-ops="confidence"></strong></div></div></header>' +
        '<div class="ops-workspace"><aside class="ops-sidebar"><div class="ops-sidebar-title">КАМПАНИЯ · 8 ОПЕРАЦИЙ</div>' +
        '<div data-ops="case-list" class="ops-case-list"></div></aside>' +
        '<main data-ops="detail" class="ops-detail" tabindex="0" role="region" aria-label="Расследование"></main></div>' +
        '<p data-ops="feedback" class="ops-feedback" role="status" hidden></p>' +
        '<footer class="ops-footer"><button type="button" class="btn" data-ops="terminal">Терминал</button>' +
        '<span>Команды: ops list, ops start, ops inspect, ops marker, ops route, ops mode, ops submit</span>' +
        '<span>Только виртуальная сеть. Ни один реальный сервер не затрагивается.</span></footer></div>');
      api.body.appendChild(root);
      root.querySelector('[data-ops="terminal"]').addEventListener('click',()=>api.open('terminal'));
      listener=draw;
      window.addEventListener('zarya:ops',listener);
      window.addEventListener('zarya:game',listener);
      draw();
    }
    function close(){
      if(listener){
        window.removeEventListener('zarya:ops',listener);
        window.removeEventListener('zarya:game',listener);
      }
      listener=null;root=null;api=null;
    }
    return {mount,close};
  })();
  window.APPICONS.operations='<svg viewBox="0 0 32 32" aria-hidden="true">'+
    '<circle cx="6" cy="16" r="4" fill="#67c3cb"/><circle cx="16" cy="7" r="4" fill="#6bbf92"/>'+
    '<circle cx="26" cy="16" r="4" fill="#67c3cb"/><circle cx="16" cy="25" r="4" fill="#6bbf92"/>'+
    '<path d="M9 13l4-4m6 0l4 4m0 6l-4 4m-6 0l-4-4" stroke="#a9e4de" stroke-width="2" fill="none"/></svg>';
  window.APPS.operations={name:'Операционный центр',icon:window.APPICONS.operations,
    w:1170,h:770,mount:OpsApp.mount,onClose:OpsApp.close};
})();