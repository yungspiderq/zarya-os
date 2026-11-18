/* ZARYA OS 2.1 — expert workshop application. */
(function () {
  'use strict';
  const G=window.Game;
  const TABS=[['orders','Сложные заказы'],['analytics','Репутация и экономика'],['help','Инструкция']];
  const fmt=n=>Math.round(Number(n)||0).toLocaleString('ru-RU')+' ₡';
  function el(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;}
  const App=(function(){
    let root=null,api=null,tab='orders',selected=null,feedback='',listeners=null;
    function report(result){
      feedback=result.msg||'';
      if(result.ok&&window.UI&&window.UI.toast)window.UI.toast(feedback,'ok');
      draw();
    }
    function section(title,desc){
      const o=el('<div class="pr-heading"><h3></h3><p></p></div>');
      o.querySelector('h3').textContent=title;
      o.querySelector('p').textContent=desc;
      return o;
    }
    function button(text,click,primary){
      const b=el('<button type="button" class="btn"></button>');
      b.textContent=text;if(primary)b.classList.add('btn--primary');
      b.addEventListener('click',function(){report(click());});
      return b;
    }
    function card(label,value){
      const v=el('<div class="pr-metric"><small></small><b></b></div>');
      v.querySelector('small').textContent=label;v.querySelector('b').textContent=value;
      return v;
    }
    function costStrip(a,job){
      const stats=el('<div class="pr-finances"></div>');
      const values=[
        ['Бюджет клиента',fmt(job.budget)],
        ['Учтённые расходы',fmt(a.cost)],
        ['Штрафы',fmt(a.penalty)],
        ['Резерв клиента',fmt(a.remaining)]
      ];
      values.forEach(pair=>stats.appendChild(card(pair[0],pair[1])));
      return stats;
    }
    function primaryJobs(container){
      const data=G.proState(),jobs=G.proOffers(),active=data.active;
      container.appendChild(section('Биржа сложных контрактов',
        'Нельзя просто угадать ответ: понадобятся тесты, смета, расчёты и финальная приёмка.'));
      const layout=el('<div class="pr-layout"><div class="pr-tickets"></div><div class="pr-body"></div></div>');
      const list=layout.querySelector('.pr-tickets'),detail=layout.querySelector('.pr-body');
      if(!jobs.some(j=>j.id===selected))selected=active?active.id:jobs[0]?.id||null;
      jobs.forEach(function(job){
        const item=el('<button type="button" class="pr-ticket"><span class="pr-ticket-eyebrow"></span>' +
          '<b></b><small class="pr-ticket-client"></small><div class="pr-ticket-meta"><span></span><span></span></div></button>');
        item.querySelector('.pr-ticket-eyebrow').textContent=(job.kind==='repair'?'ДИАГНОСТИКА + РЕМОНТ':'СБОРКА + ПРОВЕРКИ')+' · УР. '+job.tier;
        item.querySelector('b').textContent=job.client;
        item.querySelector('.pr-ticket-client').textContent=job.kind==='repair'?
          job.faultCount+' возможных независимых дефекта':'ПК с расчётом запаса БП и температуры';
        const tags=item.querySelectorAll('.pr-ticket-meta span');
        tags[0].textContent=fmt(job.budget);
        tags[1].textContent='Смена: '+job.workLimit+' ед.';
        item.classList.toggle('selected',job.id===selected);
        if(active&&active.id===job.id)item.classList.add('active');
        item.addEventListener('click',function(){selected=job.id;feedback='';draw();});
        list.appendChild(item);
      });
      const job=jobs.find(j=>j.id===selected);
      if(job)detailJob(detail,job,active);
      container.appendChild(layout);
    }
    function detailJob(detail,job,active){
      detail.appendChild(section(job.client,job.kind==='repair'?
        'Сначала инструментальное обследование, затем смета и контроль качества.':
        'Подбор компонентов, проверка энергопотребления, охлаждения и стабильности.'));
      const tags=el('<div class="pr-tags"><span></span><span></span><span></span></div>');
      const spans=tags.querySelectorAll('span');
      spans[0].textContent=job.kind==='repair'?'Дефектов: '+job.faultCount:'Клиентский ПК';
      spans[1].textContent='Бюджет: '+fmt(job.budget);
      spans[2].textContent='Сложность '+job.tier+' / 5';
      detail.appendChild(tags);
      if(active && active.id!==job.id){
        detail.appendChild(el('<p class="pr-hint">У тебя уже есть активный контракт. Заверши его или откажись от него.</p>'));
        return;
      }
      if(!active){
        if(job.kind==='repair'){
          detail.appendChild(section('Жалобы клиента','Один внешний симптом не обязательно равен одному дефекту.'));
          const faults=el('<div class="pr-symptoms"></div>');
          job.symptoms.forEach(x=>{const p=el('<p></p>');p.textContent=x;faults.appendChild(p);});
          detail.appendChild(faults);
        }else{
          const goal=job.target;
          const content=el('<div class="pr-brief"></div>');
          content.textContent='Требуется от '+goal.ramGb+' ГБ RAM, от '+goal.minFPS+' FPS, CPU уровня '+
            goal.minCPU+', GPU уровня '+goal.minGPU+
            ', загрузка до '+goal.maxBoot+' с. Запас БП не ниже '+goal.requiredPsuHeadroom+
            '%, CPU не горячее '+goal.maxCpuTemp+' °C.';
          detail.appendChild(content);
        }
        detail.appendChild(button('Принять сложный контракт',()=>G.proStart(job.id),true));
        return;
      }
      const progress=el('<div class="pr-progress"><div><span></span><b></b></div><div class="pr-progressbar"><i></i></div></div>');
      progress.querySelector('span').textContent='Израсходовано рабочего времени';
      progress.querySelector('b').textContent=active.time+' / '+active.workLimit;
      progress.querySelector('i').style.width=Math.min(100,active.time/active.workLimit*100)+'%';
      detail.appendChild(progress);
      detail.appendChild(costStrip(active,job));
      const danger=el('<p class="pr-risk"></p>');
      danger.textContent='Критические ошибки: '+active.strikes+'/2. Вторая ошибка сорвёт контракт. Деньги за провал не начисляются.';
      danger.classList.toggle('danger',active.strikes>0);
      detail.appendChild(danger);
      if(job.kind==='repair'){
        if(active.stage==='inspection')inspection(detail,job,active);
        if(active.stage==='procurement')procurement(detail,job,active);
      }else if(active.stage==='design')build(detail,job,active);
      if(active.stage==='qa'||active.stage==='rework')quality(detail,job,active);
      if(active.stage==='deliver')delivery(detail,job,active);
      const cancel=el('<div class="pr-end-actions"></div>');
      const b=button('Отказаться от контракта',()=>G.proAbandon());
      b.classList.add('pr-abandon');
      b.addEventListener('click',function(e){e.stopPropagation();});
      cancel.appendChild(b);detail.appendChild(cancel);
    }
    function inspection(detail,job,active){
      detail.appendChild(section('1. Инструментальная диагностика',
        'Каждый тест расходует бюджет и время. Проведи минимум '+job.faultCount+' разных теста, сопоставь результаты.'));
      const grid=el('<div class="pr-tests"></div>');
      G.proCatalog().tests.forEach(t=>{
        const used=active.tests.includes(t.id);
        const cell=el('<div class="pr-test"><div><b></b><small></small></div><button type="button" class="btn"></button></div>');
        cell.querySelector('b').textContent=t.title;
        cell.querySelector('small').textContent='Стоимость '+fmt(t.price);
        const b=cell.querySelector('button');
        b.textContent=used?'Выполнен':'Провести';
        b.disabled=used;
        b.addEventListener('click',function(){report(G.proTest(t.id));});
        grid.appendChild(cell);
      });
      detail.appendChild(grid);
      detail.appendChild(section('Журнал исследований','Интерпретируй отчёты — тест одной подсистемы может выявить несколько связанных симптомов.'));
      const journal=el('<div class="pr-journal"></div>');
      if(!active.tests.length)journal.appendChild(el('<p class="pr-empty">Отчёты ещё не получены. Начни с анализа жалоб клиента.</p>'));
      active.tests.forEach(id=>{
        const t=G.proTestReport(id);
        if(!t)return;
        const article=el('<article class="pr-test-report"><strong></strong><div></div></article>');
        article.querySelector('strong').textContent=t.name+(t.abnormal?' · ОБНАРУЖЕНЫ ОТКЛОНЕНИЯ':' · ОТКЛОНЕНИЙ НЕТ');
        article.classList.toggle('warning',t.abnormal);
        t.lines.forEach(line=>{const p=el('<p></p>');p.textContent=line;article.querySelector('div').appendChild(p);});
        journal.appendChild(article);
      });
      detail.appendChild(journal);
      detail.appendChild(section('2. Диагностическое заключение',
        'Отметь ровно '+job.faultCount+' настоящих причин. Неверный диагноз приведёт к финансовым потерям.'));
      const picks=el('<div class="pr-fault-grid"></div>');
      G.proCatalog().faults.forEach(f=>{
        const wrap=el('<label class="pr-fault"><input type="checkbox"><span></span></label>');
        wrap.querySelector('span').textContent=f.name;
        const check=wrap.querySelector('input');
        check.checked=active.faults.includes(f.id);
        check.addEventListener('change',function(){report(G.proMarkFault(f.id,check.checked));});
        picks.appendChild(wrap);
      });
      detail.appendChild(picks);
      const can=active.tests.length>=job.faultCount&&active.faults.length===job.faultCount;
      const submit=button('Утвердить диагноз',()=>G.proDiagnose(),true);
      submit.disabled=!can;detail.appendChild(submit);
    }
    function procurement(detail,job,active){
      detail.appendChild(section('3. План ремонта и закупка',
        'Выбери комплект/работу под каждый подтверждённый дефект. Ошибочная закупка съест прибыль.'));
      const catalogue=G.proCatalog(),items=el('<div class="pr-procurement"></div>');
      active.faults.forEach(function(fault){
        const label=catalogue.faults.find(x=>x.id===fault)?.name||fault;
        const item=el('<label class="pr-selector"><span></span><select></select></label>');
        item.querySelector('span').textContent=label;
        const select=item.querySelector('select');
        const placeholder=document.createElement('option');
        placeholder.value='';placeholder.textContent='Выбери вариант ремонта...';select.appendChild(placeholder);
        catalogue.kits.forEach(function(kit){
          const option=document.createElement('option');
          option.value=kit.id;option.textContent=kit.name+' · '+fmt(kit.price);
          if(active.kits[fault]===kit.id)option.selected=true;
          select.appendChild(option);
        });
        select.addEventListener('change',function(){report(G.proSelectKit(fault,select.value));});
        items.appendChild(item);
      });
      detail.appendChild(items);
      const known=Object.values(active.kits);
      const kits=G.proCatalog().kits;
      const cost=known.reduce((sum,id)=>sum+(kits.find(k=>k.id===id)?.price||0),0);
      const invoice=el('<p class="pr-invoice"></p>');
      invoice.textContent='Стоимость выбранного ремонта: '+fmt(cost)+
        '. Бюджет после закупки и фиксированных расходов: '+fmt(job.budget-active.cost-active.penalty-cost-65)+'.';
      detail.appendChild(invoice);
      const b=button('Согласовать и выполнить ремонт',()=>G.proRepair(),true);
      b.disabled=active.faults.some(id=>!active.kits[id]);detail.appendChild(b);
    }
    function build(detail,job,active){
      detail.appendChild(section('1. Инженерное проектирование',
        'Нужно добиться совместимости, запаса питания, охлаждения и клиентского FPS одновременно.'));
      const target=job.target;
      const targetGrid=el('<div class="pr-targets"></div>');
      [['RAM, минимум',target.ramGb+' ГБ'],['FPS, минимум',target.minFPS+' кадр/с'],
        ['Загрузка, максимум',target.maxBoot+' с'],['Резерв БП, минимум',target.requiredPsuHeadroom+' %'],
        ['Температура CPU, максимум',target.maxCpuTemp+' °C'],['Лимит стоимости',fmt(target.budget)]]
        .forEach(v=>targetGrid.appendChild(card(v[0],v[1])));
      detail.appendChild(targetGrid);
      const form=el('<div class="pr-build-grid"></div>');
      G.proCatalog().types.forEach(([type,title])=>{
        const label=el('<label class="pr-selector"><span></span><select></select></label>');
        label.querySelector('span').textContent=title;
        const select=label.querySelector('select');
        G.proBuildOptions(type).forEach(p=>{
          const opt=document.createElement('option');
          opt.value=p.id;opt.textContent=p.name+' · '+fmt(p.price);
          if(active.picks[type]===p.id)opt.selected=true;select.appendChild(opt);
        });
        select.addEventListener('change',function(){report(G.proSelectPart(type,select.value));});
        form.appendChild(label);
      });
      detail.appendChild(form);
      const r=G.proEvaluateBuild(job.id),metrics=el('<div class="pr-targets"></div>');
      [['Стоимость сборки',fmt(r.cost)],['FPS',r.fps+' кадр/с'],
        ['Запас мощности',r.reserve===null?'—':r.reserve+' %'],
        ['Температура CPU',r.cpuTemp===null?'—':r.cpuTemp+' °C'],
        ['Загрузка ОС',r.boot===null?'—':r.boot+' с'],
        ['Бюджет клиента',fmt(r.budget)]].forEach(v=>metrics.appendChild(card(v[0],v[1])));
      detail.appendChild(metrics);
      const verdict=el('<div class="pr-verdict"><strong></strong><ul></ul></div>');
      verdict.classList.toggle('ok',r.ok);
      verdict.querySelector('strong').textContent=r.ok?'Все обязательные условия выполнены':'Обнаружены проблемы конфигурации:';
      const items=r.ok?['Модель проходит энергетическую и тепловую проверку.']:r.errors;
      items.forEach(x=>{const li=el('<li></li>');li.textContent=x;verdict.querySelector('ul').appendChild(li);});
      detail.appendChild(verdict);
      const b=button('Заказать детали и начать проверку',()=>G.proApproveBuild(),true);
      b.disabled=!r.ok;detail.appendChild(b);
    }
    function quality(detail,job,active){
      const r=G.proQAReport();
      detail.appendChild(section('Контроль качества · '+(r.step+1)+' / '+r.total,
        'Прочитай измерение и сравни его с допустимым порогом. Ошибка здесь критическая.'));
      const panel=el('<div class="pr-qa-panel"><div class="pr-qa-visual"><div class="pr-qa-grid"></div>' +
        '<span class="pr-qa-diode"></span><strong>QA / POST</strong></div>' +
        '<div class="pr-qa-reading"><span></span><strong></strong><p></p></div></div>');
      panel.querySelector('.pr-qa-reading span').textContent=r.label;
      panel.querySelector('.pr-qa-reading strong').textContent=r.reading;
      panel.querySelector('.pr-qa-reading p').textContent=r.limit;
      panel.classList.toggle('needs-work',active.stage==='rework');
      detail.appendChild(panel);
      if(active.stage==='qa'){
        detail.appendChild(section('Твоё решение','Проводить ли выдачу после этого измерения?'));
        const btns=el('<div class="pr-qa-buttons"></div>');
        btns.appendChild(button('Показатель в норме — продолжить',()=>G.proQAAnswer('approve'),true));
        btns.appendChild(button('Отклонение — отправить на доработку',()=>G.proQAAnswer('service')));
        detail.appendChild(btns);
      }else{
        const warning=el('<p class="pr-hint"></p>');
        warning.textContent='Обнаружено отклонение. Регулировка стоит 45 ₡ и два рабочих действия. Затем потребуется повторный тест.';
        detail.appendChild(warning);
        detail.appendChild(button('Провести регулировку и повторный тест',()=>G.proRework(),true));
      }
    }
    function delivery(detail,job,active){
      detail.appendChild(section('Контракт готов к сдаче','Все три контрольных измерения пройдены.'));
      const info=el('<div class="pr-complete"><div class="pr-check">✓</div><strong>Качество подтверждено</strong><p></p></div>');
      info.querySelector('p').textContent='Клиент выплатит остаток бюджета после учёта деталей, испытаний, штрафов и накладных расходов. Прибыль: '+
        fmt(job.budget-active.cost-active.penalty-65)+'.';
      detail.appendChild(info);
      detail.appendChild(button('Сдать ПК и получить оплату',()=>G.proDeliver(),true));
    }
    function analytics(container){
      const st=G.proState();
      container.appendChild(section('Реальная цена ошибок','Награды выплачиваются только после успешного прохождения всех этапов.'));
      const metrics=el('<div class="pr-targets"></div>');
      [['Репутация',st.reputation+' / 100'],['Выполнено',String(st.complete)],
        ['Провалено',String(st.failed)],['Чистая игровая прибыль',fmt(st.profit)],
        ['Без критических ошибок',String(st.perfect)],['Текущий игровой баланс',fmt(G.money())]]
        .forEach(v=>metrics.appendChild(card(v[0],v[1])));
      container.appendChild(metrics);
      const bar=el('<div class="pr-reputation"><span></span><div><i></i></div></div>');
      bar.querySelector('span').textContent='Репутация: '+st.reputation+' %. Проваленный заказ: −11; безошибочный: +6.';
      bar.querySelector('i').style.width=st.reputation+'%';
      container.appendChild(bar);
      container.appendChild(section('История заказов','Сохраняются 40 последних контрактов.'));
      const logs=el('<div class="pr-history"></div>');
      if(!st.history.length)logs.appendChild(el('<p class="pr-empty">Пока нет завершённых заказов.</p>'));
      st.history.forEach(x=>{
        const row=el('<div><span></span><b></b></div>');
        row.querySelector('span').textContent=x.client+' · '+(x.kind==='build'?'сборка':'ремонт')+
          ' · '+(x.status==='done'?'выполнено':'провалено');
        row.querySelector('b').textContent=x.status==='done'?'+'+fmt(x.reward):'0 ₡';
        logs.appendChild(row);
      });
      container.appendChild(logs);
    }
    function help(container){
      container.appendChild(section('Как работать в режиме «Профи»',
        'Это учебная симуляция диагностики, а не руководство по физическому ремонту техники.'));
      const steps=[
        ['1. Изучи жалобы','У компьютера может быть несколько независимых дефектов. Сначала сравни симптомы и выбери информативные инструментальные тесты.'],
        ['2. Управляй бюджетом','Каждое обследование расходует деньги клиента. Оставь средства на необходимые работы и финальные испытания.'],
        ['3. Докажи диагноз','Для диагностики требуется минимум столько разных тестов, сколько дефектов заявил клиент. Укажи все причины одновременно.'],
        ['4. Согласуй смету','Неподходящий ремонт не решает проблему и приводит к финансовым штрафам. Не нужно заменять исправные компоненты.'],
        ['5. Рассчитай сборку','При выборе семи типов деталей проверь сокет, интерфейс M.2, запас БП 25%, условную температуру CPU и FPS.'],
        ['6. Проведи QA','Сравни результаты измерений с лимитами. Если показатель за пределами нормы, проведи виртуальную регулировку и повтори проверку.'],
        ['7. Учитывай последствия','На контракт даётся лимит рабочего времени. Две серьёзные ошибки или превышение лимита означают провал и отсутствие выплаты.']
      ];
      const list=el('<div class="pr-howto"></div>');
      steps.forEach(row=>{
        const card=el('<article><b></b><p></p></article>');
        card.querySelector('b').textContent=row[0];card.querySelector('p').textContent=row[1];list.appendChild(card);
      });
      container.appendChild(list);
    }
    function draw(){
      if(!root||!root.isConnected)return;
      const st=G.proState();
      root.querySelector('[data-pr="rep"]').textContent='Репутация '+st.reputation+'/100';
      root.querySelector('[data-pr="wallet"]').textContent=fmt(G.money());
      root.querySelectorAll('[data-pr-tab]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-pr-tab')===tab));
      const content=root.querySelector('[data-pr="content"]'),scroll=content.scrollTop;
      content.replaceChildren();
      if(tab==='orders')primaryJobs(content);
      else if(tab==='analytics')analytics(content);
      else help(content);
      content.scrollTop=scroll;
      const msg=root.querySelector('[data-pr="feedback"]');
      msg.textContent=feedback;
      msg.hidden=!feedback;
    }
    function mount(openApi){
      api=openApi;selected=null;tab='orders';feedback='';
      root=el('<div class="app pr-app"><header class="pr-header"><div><span class="pr-eyebrow">ZARYA OS 2.1 · PROFESSIONAL MODE</span>' +
        '<h2>Мастерская: Профи</h2><p>Несколько неисправностей, ограниченные ресурсы и контроль реальной для игры прибыли</p></div>' +
        '<div class="pr-header-right"><strong data-pr="wallet"></strong><span data-pr="rep"></span></div></header>' +
        '<nav class="pr-tabs" aria-label="Разделы сложной мастерской"></nav>' +
        '<main class="pr-scroll" data-pr="content" role="region" aria-label="Сложные контракты" tabindex="0"></main>' +
        '<p class="pr-feedback" data-pr="feedback" role="status" hidden></p>' +
        '<footer class="pr-footer"><button type="button" class="btn" data-pr="company">Обычная мастерская</button>' +
        '<button type="button" class="btn" data-pr="save">Центр сохранений</button>' +
        '<span>Все значения и ремонтные процедуры — игровые, а не реальные инструкции.</span></footer></div>');
      api.body.appendChild(root);
      const nav=root.querySelector('.pr-tabs');
      TABS.forEach(([id,label])=>{
        const btn=el('<button type="button" data-pr-tab></button>');
        btn.setAttribute('data-pr-tab',id);btn.textContent=label;
        btn.addEventListener('click',function(){tab=id;feedback='';draw();});
        nav.appendChild(btn);
      });
      root.querySelector('[data-pr="company"]').addEventListener('click',()=>api.open('company'));
      root.querySelector('[data-pr="save"]').addEventListener('click',()=>api.open('save-center'));
      listeners=draw;
      window.addEventListener('zarya:pro',listeners);
      window.addEventListener('zarya:game',listeners);
      draw();
    }
    function close(){
      if(listeners){
        window.removeEventListener('zarya:pro',listeners);
        window.removeEventListener('zarya:game',listeners);
      }
      root=null;api=null;listeners=null;
    }
    return {mount:mount,close:close};
  })();
  window.APPICONS.proWorkshop='<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<path d="M5 7h22v21H5z" fill="#204f63" stroke="#74d3c4" stroke-width="2"/>' +
    '<path d="M9 14l4-6 4 6 4-6 3 6" stroke="#f7cc78" fill="none" stroke-width="2"/>' +
    '<path d="M10 19h12M10 24h8" stroke="#bbf5ed" stroke-width="2"/></svg>';
  window.APPS['pro-workshop']={name:'Мастерская: Профи',icon:window.APPICONS.proWorkshop,
    w:1180,h:780,mount:App.mount,onClose:App.close};
})();