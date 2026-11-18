/* ZARYA OS 2.0 — company management application. */
(function () {
  'use strict';
  const G = window.Game;
  const TABS = [['dashboard','Обзор'],['contracts','Заказы'],['upgrades','Развитие'],['achievements','Награды']];
  const KINDS = { diagnose:'Диагностика',build:'Сборка',cooling:'Обслуживание',qa:'Тестирование' };
  const ASSET_LABELS = [['cpu','Процессор'],['board','Материнская плата'],['ram','Оперативная память'],
    ['gpu','Видеокарта'],['psu','Блок питания'],['ssd','Накопитель']];
  function el(html) {
    const t=document.createElement('template');
    t.innerHTML=html.trim();
    return t.content.firstElementChild;
  }
  function money(n){ return Math.round(n).toLocaleString('ru-RU')+' ₡'; }
  const Company = (function () {
    let root=null,api=null,tab='dashboard',selected=null,listener=null,notice='';
    function notify(result){
      if(result.ok && window.UI && window.UI.toast)window.UI.toast(result.msg,'ok');
      notice=result.ok?'':result.msg+(result.errors?' '+result.errors.join(' · '):'');
      paint();
    }
    function statusLine(){
      if(!root)return;
      const out=root.querySelector('[data-hq="feedback"]');
      out.textContent=notice;
      out.hidden=!notice;
    }
    function stat(label,value,icon){
      const card=el('<div class="hq-stat"><span class="hq-stat-icon"></span><div><small></small><strong></strong></div></div>');
      card.querySelector('small').textContent=label;
      card.querySelector('strong').textContent=value;
      card.querySelector('.hq-stat-icon').textContent=icon;
      return card;
    }
    function heading(name,subtitle){
      const h=el('<div class="hq-section-heading"><h3></h3><p class="muted"></p></div>');
      h.querySelector('h3').textContent=name;
      h.querySelector('p').textContent=subtitle;
      return h;
    }
    function dashboard(parent) {
      const state=G.companyState();
      const summary=el('<div class="hq-summary-grid"></div>');
      summary.append(
        stat('Выполнено контрактов',String(state.completed),'▣'),
        stat('Заработано мастерской',money(state.earned),'₡'),
        stat('Без ошибок',String(state.perfect),'✓'),
        stat('На личном счёте',money(G.money()),'◇')
      );
      parent.appendChild(summary);
      const hero=el('<section class="hq-rank-panel"><div class="hq-rank-badge"><span>RANK</span><strong></strong></div>' +
        '<div class="hq-rank-body"><span>РЕПУТАЦИЯ МАСТЕРСКОЙ</span><h3></h3>' +
        '<p></p><div class="hq-progress"><i></i></div><small></small></div></section>');
      const rank=state.rank;
      hero.querySelector('.hq-rank-badge strong').textContent=String(rank.rank).padStart(2,'0');
      hero.querySelector('h3').textContent=rank.title;
      hero.querySelector('p').textContent=state.name;
      const max=rank.nextXP===null?100:rank.nextXP-rank.floor;
      const progress=rank.nextXP===null?100:Math.min(100,Math.round((rank.xp-rank.floor)/max*100));
      hero.querySelector('.hq-progress i').style.width=progress+'%';
      hero.querySelector('small').textContent=rank.nextXP===null?'Максимальный ранг открыт':
        rank.xp+' / '+rank.nextXP+' XP · '+progress+'% до следующего ранга';
      parent.appendChild(hero);
      const actions=el('<div class="hq-quick"><button class="btn btn--primary" type="button" data-goto="contracts">Принять заказ</button>' +
        '<button class="btn" type="button" data-goto="upgrades">Улучшить мастерскую</button>' +
        '<button class="btn" type="button" data-goto="achievements">Достижения</button></div>');
      actions.querySelectorAll('[data-goto]').forEach(function(b){
        b.addEventListener('click',function(){tab=b.getAttribute('data-goto');paint();});
      });
      parent.appendChild(actions);
      const metrics=el('<div class="hq-two-col"><section class="hq-panel hq-stat-bars"></section>' +
        '<section class="hq-panel hq-recent"></section></div>');
      const bar=metrics.querySelector('.hq-stat-bars');
      bar.appendChild(heading('Направления работы','Сколько контрактов выполнено в каждой категории'));
      const highest=Math.max(1,...Object.values(state.byType));
      Object.keys(KINDS).forEach(function(kind){
        const line=el('<div class="hq-barline"><div><span></span><b></b></div><div class="hq-bar"><i></i></div></div>');
        line.querySelector('span').textContent=KINDS[kind];
        line.querySelector('b').textContent=state.byType[kind];
        line.querySelector('i').style.width=Math.round(state.byType[kind]/highest*100)+'%';
        bar.appendChild(line);
      });
      const recent=metrics.querySelector('.hq-recent');
      recent.appendChild(heading('Последние заказы','История работы сохраняется между запусками'));
      if(!state.history.length)recent.appendChild(el('<p class="hq-empty">Компания только открылась. Первые клиенты уже ждут в разделе «Заказы».</p>'));
      state.history.slice(0,5).forEach(function(item){
        const line=el('<div class="hq-history-row"><span></span><b></b></div>');
        line.querySelector('span').textContent=item.title;
        line.querySelector('b').textContent='+'+money(item.reward);
        recent.appendChild(line);
      });
      parent.appendChild(metrics);
    }
    function jobCard(job,active){
      const b=el('<button type="button" class="hq-job-item"><span></span><strong></strong><small></small>' +
        '<div><b></b><em></em></div></button>');
      b.querySelector('span').textContent=job.label+' · Уровень '+job.tier;
      b.querySelector('strong').textContent=job.title;
      b.querySelector('small').textContent=job.client;
      b.querySelector('b').textContent='+'+money(job.reward);
      b.querySelector('em').textContent='+'+job.xp+' XP';
      b.classList.toggle('selected',selected===job.id);
      b.classList.toggle('active',active&&active.id===job.id);
      b.addEventListener('click',function(){selected=job.id;notice='';paint();});
      return b;
    }
    function contractResponse(r){
      notify(r);
    }
    function actionButton(label,fn,className){
      const b=el('<button type="button" class="btn"></button>');
      b.textContent=label;
      if(className)b.classList.add(className);
      b.addEventListener('click',function(){contractResponse(fn());});
      return b;
    }
    function contractDetail(parent,job,active){
      parent.appendChild(heading(job.title,job.label+' · '+job.client));
      const intro=el('<div class="hq-job-tags"><span></span><span></span><span></span></div>');
      intro.children[0].textContent='Награда '+money(job.reward);
      intro.children[1].textContent='Опыт '+job.xp+' XP';
      intro.children[2].textContent='Сложность '+job.tier+'/5';
      parent.appendChild(intro);
      if(!active){
        const txt=el('<p class="hq-job-copy"></p>');
        txt.textContent=job.type==='diagnose'?'Изучи симптомы неисправности, поставь диагноз и подбери ремонт.':
          job.type==='build'?'Собери клиентский компьютер под конкретный бюджет и проверь совместимость.':
          job.type==='cooling'?'Пройди диагностику, очистку и проверку системы охлаждения.':
          'Проведи контроль качества компьютерной конфигурации.';
        parent.appendChild(txt);
        const st=G.companyState();
        if(st.active&&st.active.id!==job.id)parent.appendChild(el('<p class="hq-empty">У тебя уже есть активный заказ. Заверши или отмени его.</p>'));
        else parent.appendChild(actionButton('Принять контракт',()=>G.companyStart(job.id),'btn--primary'));
        return;
      }
      if(job.type==='diagnose'){
        const symptom=el('<p class="hq-job-copy"></p>');
        symptom.textContent=job.symptom;
        parent.appendChild(symptom);
        const evidence=el('<div class="hq-evidence"></div>');
        job.clues.forEach(function(v){const row=el('<p></p>');row.textContent=v;evidence.appendChild(row);});
        parent.appendChild(evidence);
        parent.appendChild(heading(active.stage==='diagnose'?'Шаг 1: причина поломки':'Шаг 2: подходящий ремонт',
          active.stage==='diagnose'?'Выбери точный диагноз по результатам обследования':'Выбери действие, устраняющее неисправность'));
        const actions=active.stage==='diagnose'?job.causes:job.fixes;
        const grid=el('<div class="hq-choices"></div>');
        actions.forEach(function(a){grid.appendChild(actionButton(a[1],()=>G.companyAnswer(a[0])));});
        parent.appendChild(grid);
        if(active.stage==='diagnose'){
          const hint=G.companyHint();
          if(hint){const p=el('<p class="hq-hint"></p>');p.textContent='Диагностический сканер: '+hint;parent.appendChild(p);}
        }
      }
      if(job.type==='build'){
        const target=job.target;
        const copy=el('<p class="hq-job-copy"></p>');
        copy.textContent='Клиент хочет не менее '+target.ramGb+' ГБ RAM, CPU от уровня '+target.cpu+
          ', GPU от уровня '+target.gpu+', диск от уровня '+target.minDisk+
          ', от '+target.minFPS+' FPS. Бюджет: '+money(target.budget)+'.';
        parent.appendChild(copy);
        if(active.stage==='design'){
          const grid=el('<div class="hq-build-form"></div>');
          ASSET_LABELS.forEach(function(pair){
            const wrap=el('<label class="hq-selector"><span></span><select></select></label>');
            wrap.querySelector('span').textContent=pair[1];
            const select=wrap.querySelector('select');
            G.companyBuildChoices(pair[0]).forEach(function(p){
              const option=document.createElement('option');
              option.value=p.id;option.textContent=p.name+' · '+money(p.price);
              if(active.picks&&active.picks[pair[0]]===p.id)option.selected=true;
              select.appendChild(option);
            });
            select.addEventListener('change',function(){contractResponse(G.companyChoose(pair[0],select.value));});
            grid.appendChild(wrap);
          });
          parent.appendChild(grid);
          const result=G.companyBuildReport(job.id);
          if(result){
            const numbers=el('<div class="hq-build-stats"></div>');
            [[ 'Стоимость',money(result.cost)],['Бюджет',money(result.budget)],['Игровой FPS',result.fps+' FPS']].forEach(function(v){
              const item=el('<div><span></span><b></b></div>');
              item.querySelector('span').textContent=v[0];item.querySelector('b').textContent=v[1];
              numbers.appendChild(item);
            });
            parent.appendChild(numbers);
            const verdict=el('<div class="hq-verdict"></div>');
            verdict.classList.toggle('ok',result.ok);
            const top=el('<strong></strong>');
            top.textContent=result.ok?'Конфигурация подходит клиенту':'Что нужно исправить:';
            verdict.appendChild(top);
            const lines=el('<ul></ul>');
            (result.ok?['Все условия совместимости и бюджета соблюдены.']:result.errors).forEach(function(x){
              const li=el('<li></li>');li.textContent=x;lines.appendChild(li);
            });
            verdict.appendChild(lines);parent.appendChild(verdict);
            const btn=actionButton('Подтвердить конфигурацию',()=>G.companyConfirmBuild(),'btn--primary');
            btn.disabled=!result.ok;parent.appendChild(btn);
          }
        } else if(active.stage==='assemble')stepControls(parent,active);
      }
      if(job.type==='cooling'||job.type==='qa')stepControls(parent,active);
      parent.appendChild(actionButton('Отменить заказ',()=>G.companyCancel(),'hq-cancel'));
    }
    function stepControls(parent,active){
      const steps=G.companySteps(),step=steps[active.step],headingNode=heading(
        'Мини-игра · шаг '+(active.step+1)+' / '+steps.length,
        'Действия должны выполняться последовательно');
      parent.appendChild(headingNode);
      const board=el('<div class="hq-mini-board"><div class="hq-cpu-drawing">CPU</div>' +
        '<div class="hq-ram-drawing">RAM</div><div class="hq-gpu-drawing">GPU</div>' +
        '<div class="hq-fan-drawing"></div><div class="hq-led-drawing"></div></div>');
      board.setAttribute('data-progress',String(active.step));
      parent.appendChild(board);
      const bar=el('<div class="hq-step-track"></div>');
      steps.forEach(function(row,i){
        const tag=el('<span></span>');tag.textContent=(i+1)+'. '+row[1];
        tag.classList.toggle('done',i<active.step);
        tag.classList.toggle('current',i===active.step);
        bar.appendChild(tag);
      });
      parent.appendChild(bar);
      const choices=el('<div class="hq-choices"></div>');
      const candidates=[step];
      if(active.stage==='qa'){
        const pool=[['power','Проверить питание'],['disk','Проверить диск'],['graphics','Запустить графический тест']];
        pool.forEach(function(p){if(p[0]!==step[0])candidates.push(p);});
      }
      candidates.forEach(function(item){
        choices.appendChild(actionButton(item[1],()=>G.companyAction(item[0]),
          item[0]===step[0]?'btn--primary':null));
      });
      parent.appendChild(choices);
    }
    function contracts(parent) {
      const info=G.companyState(),jobs=G.companyJobs();
      if(!jobs.some(j=>j.id===selected))selected=info.active?info.active.id:jobs[0]?.id;
      parent.appendChild(heading('Очередь мастерской',
        'Постоянные заказы обновляются после сдачи. Рабочие места можно расширять.'));
      const columns=el('<div class="hq-job-layout"><section class="hq-job-list"></section>' +
        '<section class="hq-job-detail"></section></div>');
      jobs.forEach(function(j){columns.querySelector('.hq-job-list').appendChild(jobCard(j,info.active));});
      const chosen=jobs.find(j=>j.id===selected);
      if(chosen){
        const detail=columns.querySelector('.hq-job-detail');
        contractDetail(detail,chosen,info.active&&info.active.id===chosen.id?info.active:null);
      }
      parent.appendChild(columns);
    }
    function upgrades(parent){
      const rank=G.companyState().rank.rank;
      parent.appendChild(heading('Развитие мастерской',
        'Покупки списывают обычные игровые ₡. Улучшения остаются навсегда.'));
      const grid=el('<div class="hq-upgrade-grid"></div>');
      G.companyUpgradeCatalog().forEach(function(u){
        const card=el('<section class="hq-upgrade-card"><div><span class="part-kicker"></span>' +
          '<h3></h3><p></p></div><div class="hq-upgrade-meter"></div>' +
          '<div class="hq-upgrade-foot"><strong></strong><button type="button" class="btn btn--primary"></button></div></section>');
        card.querySelector('.part-kicker').textContent='УЛУЧШЕНИЕ · УРОВЕНЬ '+u.level+' / '+u.max;
        card.querySelector('h3').textContent=u.title;
        card.querySelector('p').textContent=u.detail;
        for(let i=0;i<u.max;i++){
          const bar=el('<i></i>');bar.classList.toggle('active',i<u.level);
          card.querySelector('.hq-upgrade-meter').appendChild(bar);
        }
        const cost=card.querySelector('strong'),button=card.querySelector('button');
        if(u.level===u.max){cost.textContent='Максимум';button.textContent='Куплено';button.disabled=true;}
        else{
          cost.textContent=money(u.price);
          button.textContent=u.unlocked?'Улучшить':'Ранг '+u.requiredRank;
          button.disabled=!u.unlocked||G.money()<u.price;
          if(!u.unlocked)button.title='Текущий ранг: '+rank;
          else if(G.money()<u.price)button.title='Недостаточно игровых денег';
          button.addEventListener('click',function(){notify(G.companyUpgrade(u.id));});
        }
        grid.appendChild(card);
      });
      parent.appendChild(grid);
    }
    function achievements(parent){
      const a=G.companyAchievements();
      parent.appendChild(heading('Зал достижений','12 целей, за выполнение которых выдаются игровые награды'));
      const stats=el('<p class="hq-ach-count"></p>');
      stats.textContent='Получено '+a.filter(x=>x.claimed).length+' из '+a.length;
      parent.appendChild(stats);
      const grid=el('<div class="hq-ach-grid"></div>');
      a.forEach(function(item){
        const card=el('<section class="hq-ach-card"><div class="hq-ach-symbol">★</div>' +
          '<div class="hq-ach-content"><h4></h4><p></p><small></small></div>' +
          '<div class="hq-ach-prize"><b></b><button type="button" class="btn"></button></div></section>');
        card.classList.toggle('claimed',item.claimed);
        card.classList.toggle('earned',item.earned&&!item.claimed);
        card.querySelector('h4').textContent=item.title;
        card.querySelector('p').textContent=item.desc;
        card.querySelector('small').textContent=Math.min(item.progress,item.target)+' / '+item.target;
        card.querySelector('.hq-ach-prize b').textContent='+'+money(item.reward);
        const b=card.querySelector('button');
        b.textContent=item.claimed?'Получено':item.earned?'Забрать':'Закрыто';
        b.disabled=!item.earned||item.claimed;
        b.addEventListener('click',function(){notify(G.companyClaim(item.id));});
        grid.appendChild(card);
      });
      parent.appendChild(grid);
    }
    function paint(){
      if(!root||!root.isConnected)return;
      const st=G.companyState();
      root.querySelector('[data-hq="name"]').textContent=st.name;
      root.querySelector('[data-hq="rank"]').textContent='Ранг '+st.rank.rank+' / 6';
      const menu=root.querySelectorAll('[data-hq-tab]');
      menu.forEach(function(b){b.classList.toggle('active',b.getAttribute('data-hq-tab')===tab);});
      const body=root.querySelector('[data-hq="body"]'),scroll=body.scrollTop;
      body.replaceChildren();
      if(tab==='dashboard')dashboard(body);
      if(tab==='contracts')contracts(body);
      if(tab==='upgrades')upgrades(body);
      if(tab==='achievements')achievements(body);
      body.scrollTop=scroll;
      statusLine();
    }
    function mount(openApi){
      api=openApi;selected=null;notice='';tab='dashboard';
      root=el('<div class="app hq-app"><header class="hq-hero-head"><div>' +
        '<div class="hq-overline">ZARYA CORP · BUSINESS MANAGEMENT</div><h2 data-hq="name"></h2>' +
        '<p>Управляй компьютерной мастерской, обслуживай клиентов и расширяй бизнес</p></div>' +
        '<div class="hq-head-actions"><span data-hq="rank"></span>' +
        '<button type="button" class="btn" data-hq="rename">Переименовать</button></div></header>' +
        '<nav class="hq-tabs" aria-label="Разделы компании"></nav>' +
        '<div class="hq-main" data-hq="body" tabindex="0" role="region" aria-label="Содержимое компании"></div>' +
        '<p data-hq="feedback" class="hq-feedback" role="status" hidden></p>' +
        '<footer class="hq-footer">Вся экономика, опыт и клиенты виртуальные. Реальные устройства не используются.</footer></div>');
      api.body.appendChild(root);
      const menu=root.querySelector('.hq-tabs');
      TABS.forEach(function(t){
        const b=el('<button type="button" data-hq-tab></button>');
        b.textContent=t[1];b.setAttribute('data-hq-tab',t[0]);
        b.addEventListener('click',function(){tab=t[0];notice='';paint();});
        menu.appendChild(b);
      });
      root.querySelector('[data-hq="rename"]').addEventListener('click',function(){
        window.UI.prompt('Название мастерской',G.companyState().name,'Новая компания').then(function(value){
          if(value!==null)notify(G.companyRename(value));
        });
      });
      listener=paint;
      window.addEventListener('zarya:company',listener);
      window.addEventListener('zarya:game',listener);
      paint();
    }
    function close(){
      if(listener){
        window.removeEventListener('zarya:company',listener);
        window.removeEventListener('zarya:game',listener);
      }
      listener=null;root=null;api=null;
    }
    return {mount:mount,close:close};
  })();
  window.APPICONS.company='<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect x="3" y="11" width="26" height="18" rx="3" fill="#356e91"/>' +
    '<path d="M7 11V6h18v5M13 6V3h6v3M8 17h16M8 23h16" fill="none" stroke="#9ae9f5" stroke-width="2.3"/>' +
    '<circle cx="16" cy="17" r="3" fill="#0f435e"/></svg>';
  window.APPS.company={
    name:'Моя компания',icon:window.APPICONS.company,w:1110,h:720,
    mount:Company.mount,onClose:Company.close
  };
})();