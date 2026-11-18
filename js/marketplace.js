/* ЗАРЯ OS 1.9 — техно-барахолка, диагностика б/у деталей и безопасная перепродажа. */
(function () {
  'use strict';
  const G = window.Game, KEY = 'zarya.market.v1';
  const categories = [
    ['cpu', 'Процессоры', 'CPU'],
    ['gpu', 'Видеокарты', 'GPU'],
    ['ram', 'Оперативная память', 'RAM'],
    ['board', 'Материнские платы', 'MB'],
    ['psu', 'Блоки питания', 'PSU'],
    ['ssd', 'Накопители', 'SSD'],
    ['cooler', 'Кулеры', 'FAN']
  ];
  function day() { return new Date().toISOString().slice(0, 10); }
  function fresh() { return { v: 1, day: day(), purchased: [], inspected: {}, refurb: null }; }
  function hash(s) {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) {
      x ^= s.charCodeAt(i);
      x = Math.imul(x, 16777619);
    }
    return x >>> 0;
  }
  let state = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.v === 1) state = Object.assign(fresh(), saved);
  } catch (e) {}
  if (!Array.isArray(state.purchased)) state.purchased = [];
  if (!state.inspected || typeof state.inspected !== 'object' ||
      Array.isArray(state.inspected)) state.inspected = {};
  if (!state.refurb || typeof state.refurb !== 'object') state.refurb = null;
  if (state.day !== day()) state = fresh();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zarya:market'));
  }
  function getOffers() {
    return categories.map(function (cat) {
      const stock = G.partsCatalog(cat[0]).filter(function (p) { return p.price > 0 && !p.builtin; });
      const index = hash(day() + ':' + cat[0]) % stock.length;
      const p = stock[index];
      const condition = 45 + hash(day() + ':state:' + p.id) % 46; // 45–90 %
      const price = Math.max(1, Math.round(p.price * (0.40 + condition / 500)));
      const inspected = state.inspected[p.id];
      const step = inspected && Number.isSafeInteger(inspected.step) ?
        Math.max(0, Math.min(3, inspected.step)) : 0;
      return {
        id: p.id, type: p.type, name: p.name, detail: p.detail,
        retail: p.price, price: price, condition: step === 3 ? condition : null,
        discount: Math.round((1 - price / p.price) * 100),
        category: cat[1], label: cat[2], step: step,
        sold: state.purchased.includes(p.id),
        owned: G.hasPart(p.id)
      };
    });
  }
  function offer(id) { return getOffers().find(function (x) { return x.id === id; }) || null; }
  function rawCondition(id) { return 45 + hash(day() + ':state:' + id) % 46; }
  function checks(id) {
    const c = rawCondition(id);
    return [
      {
        label: 'Контакты и корпус',
        observation: c >= 63 ? 'Контакты чистые, корпус без видимых проблем.' :
          'На контактах заметны следы износа.',
        pass: c >= 63
      },
      {
        label: 'Стресс-тест',
        observation: c >= 79 ? 'Тест стабильности пройден без предупреждений.' :
          'При нагрузке виртуальный тест выдал предупреждение.',
        pass: c >= 79
      },
      {
        label: 'Контроль состояния',
        observation: c >= 55 ? 'Датчики не обнаружили критических ошибок.' :
          'В игровом отчёте есть ошибки состояния.',
        pass: c >= 55
      }
    ];
  }
  G.marketDay = day;
  G.marketOffers = getOffers;
  G.marketInspection = function (id) {
    const o = offer(id);
    if (!o) return null;
    const step = o.step;
    const question = checks(id)[step];
    return {
      step: step, total: 3, completed: step === 3,
      question: question ? { label: question.label, observation: question.observation } : null,
      condition: step === 3 ? rawCondition(id) : null
    };
  };
  G.marketCheck = function (id, answer) {
    const o = offer(id);
    if (!o || o.sold || o.owned) return { ok: false, msg: 'Этот лот больше не доступен.' };
    const current = G.marketInspection(id);
    if (current.completed) return { ok: false, msg: 'Проверка уже завершена.' };
    if (answer !== true && answer !== false) return { ok: false, msg: 'Выбери результат проверки.' };
    const expected = checks(id)[current.step];
    if (answer !== expected.pass) return { ok: false, msg: 'Результат не совпадает с описанием. Прочитай отчёт ещё раз.' };
    state.inspected[id] = { step: current.step + 1 };
    save();
    return { ok: true, completed: current.step + 1 === 3, msg:
      current.step + 1 === 3 ? 'Диагностика завершена. Теперь видны состояние и цена покупки.' :
      'Проверка пройдена. Следующий этап: ' + checks(id)[current.step + 1].label };
  };
  G.marketBuyOffer = function (id) {
    const o = offer(id);
    if (!o || o.sold || o.owned) return { ok: false, msg: 'Лот уже продан или у тебя есть эта модель.' };
    if (o.step !== 3) return { ok: false, msg: 'Сначала закончи все три проверки.' };
    const bought = G.buyUsedPart(o.id, o.price, rawCondition(o.id));
    if (!bought.ok) return bought;
    state.purchased.push(id);
    save();
    return bought;
  };
  G.marketSellInventory = function () {
    return G.partInventory().map(function (p) {
      const quote = G.marketSaleQuote(p.id);
      if (!quote.ok) return null;
      return {
        id: p.id, name: p.name, type: p.type, detail: p.detail,
        amount: quote.price, used: quote.used,
        condition: G.marketCondition(p.id)
      };
    }).filter(Boolean);
  };
  G.marketResell = function (id) { return G.marketSellPart(id); };

  function refurbState() {
    if (!state.refurb || !G.partInventory().some(function (p) { return p.id === state.refurb.id; }) ||
        !G.marketCondition(state.refurb.id) ||
        G.marketCondition(state.refurb.id).serviced ||
        !Number.isSafeInteger(state.refurb.step) || state.refurb.step < 0 || state.refurb.step > 2) {
      state.refurb = null;
    }
    return state.refurb;
  }
  G.marketRepairables = function () {
    return G.partInventory().filter(function (p) {
      const data = G.marketCondition(p.id);
      return data && !data.serviced;
    }).map(function (p) { return { id: p.id, name: p.name, condition: G.marketCondition(p.id).condition }; });
  };
  G.marketRefurbState = function () {
    const r = refurbState();
    return r ? { id: r.id, step: r.step } : null;
  };
  G.marketRefurbStart = function (id) {
    if (refurbState()) return { ok: false, msg: 'Сначала закончи текущую работу или отмени её.' };
    if (!G.marketRepairables().some(function (p) { return p.id === id; })) {
      return { ok: false, msg: 'Эта деталь недоступна для обслуживания.' };
    }
    state.refurb = { id: id, step: 0 };
    save();
    return { ok: true, msg: 'Мастерская открыта. Пройди три виртуальных этапа.' };
  };
  G.marketRefurbAction = function (action) {
    const r = refurbState();
    if (!r) return { ok: false, msg: 'Сначала выбери б/у деталь для восстановления.' };
    const sequence = ['inspect', 'clean', 'test'];
    if (action !== sequence[r.step]) return { ok: false, msg: 'Сейчас нужен другой этап обслуживания.' };
    if (r.step === 2) {
      const done = G.marketRefurbish(r.id, 3);
      if (!done.ok) return done;
      state.refurb = null;
      save();
      return done;
    }
    r.step++;
    save();
    return { ok: true, msg: 'Этап завершён.' };
  };
  G.marketRefurbCancel = function () {
    if (!refurbState()) return { ok: false, msg: 'Нет активной работы.' };
    state.refurb = null;
    save();
    return { ok: true, msg: 'Обслуживание отменено. Состояние детали не изменилось.' };
  };
  const reset = G.reset.bind(G);
  G.reset = function () {
    state = fresh();
    try { localStorage.removeItem(KEY); } catch (e) {}
    reset();
    save();
  };
  save();

  function element(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }
  function format(n) { return n.toLocaleString('ru-RU') + ' ₡'; }
  const App = (function () {
    let root = null, api = null, listener = null;
    let tab = 'offers', selected = '', confirmSale = '';
    function toast(r) {
      if (window.UI && window.UI.toast) window.UI.toast(r.msg, r.ok ? 'ok' : 'err');
      if (!r.ok && root) root.querySelector('[data-flea="hint"]').textContent = r.msg;
    }
    function panel(html) {
      const content = root.querySelector('[data-flea="content"]');
      content.replaceChildren();
      const result = element(html);
      content.appendChild(result);
      return result;
    }
    function shop() {
      const offers = G.marketOffers();
      const section = panel('<div><div class="flea-grid" data-flea-grid></div>' +
        '<div class="flea-inspect" data-flea-inspect></div></div>');
      const list = section.querySelector('[data-flea-grid]');
      offers.forEach(function (o) {
        const card = element('<button type="button" class="flea-offer">' +
          '<div class="flea-offer-head"><span class="flea-kind"></span><span class="flea-discount"></span></div>' +
          '<div class="flea-art"><span></span></div><strong class="flea-name"></strong>' +
          '<span class="flea-desc"></span><div class="flea-prices"><b></b><s></s></div><small class="flea-state"></small></button>');
        card.querySelector('.flea-kind').textContent = o.category;
        card.querySelector('.flea-discount').textContent = '−' + o.discount + '%';
        card.querySelector('.flea-art span').textContent = o.label;
        card.querySelector('.flea-name').textContent = o.name;
        card.querySelector('.flea-desc').textContent = o.detail;
        card.querySelector('.flea-prices b').textContent = format(o.price);
        card.querySelector('.flea-prices s').textContent = format(o.retail);
        card.querySelector('.flea-state').textContent = o.sold ? 'ПРОДАНО' : o.owned ? 'УЖЕ ЕСТЬ' :
          o.step === 3 ? 'ПРОВЕРЕН · ' + o.condition + '%' : 'НУЖНА ДИАГНОСТИКА';
        card.classList.toggle('selected', selected === o.id);
        card.classList.toggle('disabled', o.owned || o.sold);
        card.addEventListener('click', function () {
          selected = o.id;
          render();
          const detail = root.querySelector('[data-flea-inspect]');
          if (detail) detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        list.appendChild(card);
      });
      const current = offers.find(function (o) { return o.id === selected; }) || offers[0];
      if (!current) return;
      const box = section.querySelector('[data-flea-inspect]');
      const shell = element('<div class="flea-inspect-inner"><div class="flea-detail-header">' +
        '<div><span class="part-kicker">ОСМОТР ЛОТА</span><h3></h3><p class="muted"></p></div><div class="flea-condition"></div></div>' +
        '<div class="flea-inspect-body"></div></div>');
      shell.querySelector('h3').textContent = current.name;
      shell.querySelector('.flea-detail-header p').textContent = current.detail;
      shell.querySelector('.flea-condition').textContent = current.condition === null ? 'Состояние: ?' :
        'Состояние: ' + current.condition + '%';
      const body = shell.querySelector('.flea-inspect-body');
      if (current.sold || current.owned) {
        const msg = element('<p class="flea-empty"></p>');
        msg.textContent = current.sold ? 'Этот лот уже куплен. Жди смены ассортимента.' :
          'Такая модель уже есть в инвентаре или установлена в твоём ПК.';
        body.appendChild(msg);
      } else if (current.step < 3) {
        const check = G.marketInspection(current.id);
        const question = element('<div class="flea-question"><small></small><h4></h4><p></p>' +
          '<div class="flea-actions"><button type="button" class="btn btn--primary">Проверка пройдена</button>' +
          '<button type="button" class="btn">Есть замечание</button></div></div>');
        question.querySelector('small').textContent = 'ЭТАП ' + (check.step + 1) + ' / 3';
        question.querySelector('h4').textContent = check.question.label;
        question.querySelector('p').textContent = check.question.observation;
        const buttons = question.querySelectorAll('button');
        buttons[0].addEventListener('click', function () { toast(G.marketCheck(current.id, true)); });
        buttons[1].addEventListener('click', function () { toast(G.marketCheck(current.id, false)); });
        body.appendChild(question);
      } else {
        const buy = element('<div class="flea-checked"><p>Диагностика завершена. Данный лот можно приобрести по сниженной цене.</p>' +
          '<div><strong></strong><button type="button" class="btn btn--primary">Купить проверенную деталь</button></div></div>');
        buy.querySelector('strong').textContent = format(current.price);
        buy.querySelector('button').disabled = G.money() < current.price;
        buy.querySelector('button').addEventListener('click', function () { toast(G.marketBuyOffer(current.id)); });
        if (G.money() < current.price) buy.querySelector('p').textContent =
          'Недостаточно средств. Не хватает ' + format(current.price - G.money()) + '.';
        body.appendChild(buy);
      }
      box.appendChild(shell);
    }
    function selling() {
      const items = G.marketSellInventory();
      const container = panel('<div class="flea-sell"><h3>Продажа запасных деталей</h3>' +
        '<p class="muted">Продаются только детали из инвентаря. Установленные и стартовые компоненты защищены.</p>' +
        '<div data-flea-sell-list></div></div>');
      const list = container.querySelector('[data-flea-sell-list]');
      if (!items.length) list.appendChild(element('<p class="flea-empty">Пока нет платных запасных комплектующих для продажи.</p>'));
      items.forEach(function (p) {
        const row = element('<div class="flea-sell-row"><div><span class="part-kicker"></span>' +
          '<h4></h4><small></small></div><div class="flea-sell-right"><strong></strong>' +
          '<button type="button" class="btn btn--primary"></button></div></div>');
        row.querySelector('.part-kicker').textContent = p.type.toUpperCase() + (p.used ? ' · Б/У' : ' · НОВЫЙ');
        row.querySelector('h4').textContent = p.name;
        row.querySelector('small').textContent = p.condition ? 'Состояние: ' + p.condition.condition + '%' :
          'Без следов использования';
        row.querySelector('strong').textContent = '+' + format(p.amount);
        const button = row.querySelector('button');
        button.textContent = confirmSale === p.id ? 'Подтвердить продажу' : 'Продать';
        button.addEventListener('click', function () {
          if (confirmSale !== p.id) { confirmSale = p.id; render(); return; }
          confirmSale = '';
          toast(G.marketResell(p.id));
        });
        list.appendChild(row);
      });
    }
    function refurb() {
      const container = panel('<div class="flea-refurb"><h3>Восстановление б/у комплектующих</h3>' +
        '<p class="muted">Три шага игровой мастерской. Каждую купленную на барахолке деталь можно обслужить один раз.</p>' +
        '<div data-flea-refurb></div></div>');
      const detail = container.querySelector('[data-flea-refurb]');
      const active = G.marketRefurbState();
      if (!active) {
        const parts = G.marketRepairables();
        if (!parts.length) detail.appendChild(element('<p class="flea-empty">Нет деталей, ожидающих обслуживания. Купи б/у товар, затем вернись сюда.</p>'));
        parts.forEach(function (p) {
          const row = element('<div class="flea-sell-row"><div><h4></h4><small></small></div>' +
            '<button type="button" class="btn btn--primary">Обслужить</button></div>');
          row.querySelector('h4').textContent = p.name;
          row.querySelector('small').textContent = 'Текущее состояние: ' + p.condition + '%';
          row.querySelector('button').addEventListener('click', function () { toast(G.marketRefurbStart(p.id)); });
          detail.appendChild(row);
        });
      } else {
        const steps = [
          { action: 'inspect', label: 'Осмотреть разъёмы и состояние корпуса', detail: 'Найди признаки износа.' },
          { action: 'clean', label: 'Очистить виртуальные контакты', detail: 'Удалить загрязнения на схеме детали.' },
          { action: 'test', label: 'Запустить контрольный тест', detail: 'Проверить стабильность перед использованием.' }
        ];
        const p = G.partById(active.id);
        const stage = steps[active.step];
        const card = element('<div class="flea-repair-board"><div class="flea-repair-chip">' +
          '<div class="flea-repair-core">PCB</div><span>VIRTUAL LAB</span></div><div class="flea-repair-task">' +
          '<small></small><h4></h4><p></p><button type="button" class="btn btn--primary"></button>' +
          '<button type="button" class="btn flea-cancel">Отменить</button></div></div>');
        card.querySelector('.flea-repair-task small').textContent = 'ЭТАП ' + (active.step + 1) + ' / 3 · ' + p.name;
        card.querySelector('.flea-repair-task h4').textContent = stage.label;
        card.querySelector('.flea-repair-task p').textContent = stage.detail;
        const buttons = card.querySelectorAll('button');
        buttons[0].textContent = active.step === 2 ? 'Завершить обслуживание' : 'Выполнить';
        buttons[0].addEventListener('click', function () { toast(G.marketRefurbAction(stage.action)); });
        buttons[1].addEventListener('click', function () { toast(G.marketRefurbCancel()); });
        detail.appendChild(card);
      }
    }
    function render() {
      if (!root || !root.isConnected) return;
      root.querySelector('[data-flea="balance"]').textContent = format(G.money());
      root.querySelector('[data-flea="date"]').textContent = G.marketDay();
      root.querySelectorAll('[data-flea-tab]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-flea-tab') === tab);
      });
      if (tab === 'offers') shop();
      else if (tab === 'sell') selling();
      else refurb();
    }
    function mount(openApi) {
      api = openApi;
      root = element('<div class="app flea-app" tabindex="0" role="region" aria-label="Барахолка комплектующих">' +
        '<div class="app-head"><div><h2>Техно-барахолка</h2>' +
        '<p class="muted">Покупай, проверяй, восстанавливай и продавай виртуальное железо</p></div>' +
        '<div class="flea-wallet"><b data-flea="balance"></b><small>Ассортимент: <span data-flea="date"></span></small></div></div>' +
        '<nav class="flea-tabs" aria-label="Разделы барахолки"><button type="button" data-flea-tab="offers">Б/у предложения</button>' +
        '<button type="button" data-flea-tab="sell">Продать своё</button>' +
        '<button type="button" data-flea-tab="refurb">Мастерская</button></nav>' +
        '<section data-flea="content" class="flea-content"></section>' +
        '<p data-flea="hint" class="flea-hint" role="status">Перед покупкой изучи три отчёта о состоянии выбранного лота.</p>' +
        '<div class="pc-actions"><button type="button" class="btn btn--primary" data-flea="pc">Мой ПК</button>' +
        '<button type="button" class="btn" data-flea="shop">Магазин нового железа</button></div>' +
        '<p class="muted flea-disclaimer">Ассортимент меняется ежедневно по UTC. Оценки, износ, тесты и цены — игровые. ' +
        'Перепродажа не приносит гарантированной прибыли.</p></div>');
      api.body.appendChild(root);
      root.querySelectorAll('[data-flea-tab]').forEach(function (b) {
        b.addEventListener('click', function () {
          tab = b.getAttribute('data-flea-tab');
          confirmSale = '';
          render();
        });
      });
      root.querySelector('[data-flea="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-flea="shop"]').addEventListener('click', function () { api.open('shop'); });
      listener = render;
      window.addEventListener('zarya:market', listener);
      window.addEventListener('zarya:hardware', listener);
      window.addEventListener('zarya:game', listener);
      render();
    }
    function close() {
      if (listener) {
        window.removeEventListener('zarya:market', listener);
        window.removeEventListener('zarya:hardware', listener);
        window.removeEventListener('zarya:game', listener);
      }
      root = null; listener = null; api = null; confirmSale = '';
    }
    return { mount: mount, close: close };
  })();
  window.APPICONS.fleaMarket =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="9" width="26" height="18" rx="3" fill="#365c7f"/>' +
    '<path d="M5 9l3-6h16l3 6M7 14h18" stroke="#8ddcfa" stroke-width="2" fill="none"/>' +
    '<rect x="11" y="16" width="10" height="8" rx="2" fill="#addfee"/><path d="M16 14v12" stroke="#397f99" stroke-width="2"/></svg>';
  window.APPS['flea-market'] = {
    name: 'Техно-барахолка', icon: window.APPICONS.fleaMarket,
    w: 1020, h: 690, mount: App.mount, onClose: App.close
  };
})();