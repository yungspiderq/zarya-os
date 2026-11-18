/* ЗАРЯ OS — магазин комплектующих, инвентарь и интерактивная замена CPU. */
(function () {
  'use strict';

  const G = window.Game;
  const UI = window.UI;

  function el(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  }
  function money(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₡'; }
  function notify(result) { UI.toast(result.msg, result.ok ? 'ok' : 'err'); }
  function listen(fn) {
    window.addEventListener('zarya:game', fn);
    window.addEventListener('zarya:hardware', fn);
  }
  function unlisten(fn) {
    if (!fn) return;
    window.removeEventListener('zarya:game', fn);
    window.removeEventListener('zarya:hardware', fn);
  }
  const names = { cpu: 'Процессоры', gpu: 'Видеокарты', ram: 'Оперативная память', software: 'Программы' };
  const icons = {
    cpu: '<rect x="6" y="6" width="20" height="20" rx="3" fill="#15344a" stroke="#5dd3ff" stroke-width="2"/><rect x="12" y="12" width="8" height="8" rx="1.5" fill="#5dd3ff"/><path d="M10 2v4m6-4v4m6-4v4M10 26v4m6-4v4m6-4v4M2 10h4m-4 6h4m-4 6h4m20-12h4m-4 6h4m-4 6h4" stroke="#5dd3ff" stroke-width="1.6"/>',
    shop: '<rect x="5" y="9" width="22" height="19" rx="3" fill="#11416b"/><path d="M10 11V8a6 6 0 0 1 12 0v3" fill="none" stroke="#8fdaff" stroke-width="2"/><path d="M10 18h12m-12 5h8" stroke="#8fdaff" stroke-width="2" stroke-linecap="round"/>'
  };

  const Store = (function () {
    let root = null;
    let api = null;
    let current = 'cpu';
    let update = null;

    function render() {
      if (!root || !root.isConnected) return;
      root.querySelector('[data-store="money"]').textContent = money(G.money());
      root.querySelector('[data-store="credits"]').textContent = G.hardwareCredits() + ' арк. ₡';
      root.querySelectorAll('[data-store-cat]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-store-cat') === current);
      });
      const grid = root.querySelector('[data-store="grid"]');
      grid.replaceChildren();

      if (current === 'software') {
        G.shop().forEach(function (item) {
          const level = G.level(item.id);
          const maxed = level >= item.max;
          const card = el(
            '<article class="part-product"><div class="part-product-top"><span class="part-kicker">УТИЛИТЫ</span><span class="part-tag"></span></div>' +
            '<h3></h3><p class="muted part-desc"></p><p class="part-metadata"></p>' +
            '<footer><strong class="part-price"></strong><button type="button" class="btn btn--primary btn--sm"></button></footer></article>'
          );
          card.querySelector('h3').textContent = item.name;
          card.querySelector('.part-tag').textContent = (level) + ' / ' + item.max;
          card.querySelector('.part-desc').textContent = item.desc;
          card.querySelector('.part-metadata').textContent = 'Сейчас: ' + item.levels[level];
          card.querySelector('.part-price').textContent = maxed ? 'Куплено' : money(item.costs[level]);
          const button = card.querySelector('button');
          button.textContent = maxed ? 'Максимум' : 'Купить софт';
          button.disabled = maxed;
          button.addEventListener('click', function () { notify(G.buy(item.id)); render(); });
          grid.appendChild(card);
        });
        root.querySelector('[data-store="help"]').textContent = 'Программы приобретаются отдельно от комплектующих и действуют сразу.';
        return;
      }

      G.partsCatalog(current).forEach(function (p) {
        const installed = G.installedPart(p.type).id === p.id;
        const owned = G.hasPart(p.id);
        const card = el(
          '<article class="part-product"><div class="part-product-top"><span class="part-kicker"></span><span class="part-tag"></span></div>' +
          '<div class="part-product-art" aria-hidden="true"><span></span></div><h3></h3>' +
          '<p class="muted part-desc"></p><p class="part-metadata"></p>' +
          '<footer><strong class="part-price"></strong><button type="button" class="btn btn--primary btn--sm"></button></footer></article>'
        );
        card.querySelector('.part-kicker').textContent = names[p.type];
        card.querySelector('.part-tag').textContent = installed ? 'УСТАНОВЛЕНО' : owned ? 'В ИНВЕНТАРЕ' : p.builtin ? 'ВСТРОЕНО' : 'НОВЫЙ';
        card.querySelector('.part-product-art').setAttribute('data-kind', p.type);
        card.querySelector('.part-product-art span').textContent = p.type === 'cpu' ? 'CPU' : p.type === 'gpu' ? 'GPU' : 'DDR4';
        card.querySelector('h3').textContent = p.name;
        card.querySelector('.part-desc').textContent = p.detail;
        card.querySelector('.part-metadata').textContent =
          p.type === 'cpu' ? 'Совместимость: LGA1200' :
          p.type === 'ram' ? 'Модуль памяти DDR4' : 'Графический адаптер PCIe';
        card.querySelector('.part-price').textContent = p.price ? money(p.price) : 'Стартовая деталь';
        const button = card.querySelector('button');
        button.textContent = installed ? 'В компьютере' : owned ? 'Перейти к установке' : p.builtin ? 'Встроено' : 'Купить';
        button.disabled = installed || !!p.builtin;
        button.addEventListener('click', function () {
          if (owned) {
            if (p.type === 'cpu') {
              window.CPUWorkbench.choose(p.id);
              api.open('workbench');
            } else api.open('pc');
          } else {
            notify(G.buyPart(p.id));
            render();
          }
        });
        grid.appendChild(card);
      });
      root.querySelector('[data-store="help"]').textContent =
        'Компоненты приобретаются поштучно: сначала в инвентарь, затем устанавливаются. ' +
        'При покупке сперва тратятся аркадные кредиты, остаток — с баланса контрактов.';
    }

    function mount(openApi) {
      api = openApi;
      root = el(
        '<div class="app parts-app"><div class="app-head"><div><h2>Магазин комплектующих</h2>' +
        '<p class="muted">Выбери конкретную модель. Купленная деталь попадает в инвентарь.</p></div>' +
        '<div class="parts-wallet"><b data-store="money"></b><small data-store="credits"></small></div></div>' +
        '<nav class="part-categories" aria-label="Разделы магазина">' +
        '<button data-store-cat="cpu" type="button">Процессоры</button><button data-store-cat="gpu" type="button">Видеокарты</button>' +
        '<button data-store-cat="ram" type="button">ОЗУ</button><button data-store-cat="software" type="button">Программы</button></nav>' +
        '<div class="part-products" data-store="grid"></div><p class="muted parts-footnote" data-store="help"></p>' +
        '<div class="pc-actions"><button type="button" class="btn btn--primary" data-store="pc">Мой ПК и инвентарь</button>' +
        '<button type="button" class="btn" data-store="workbench">Мастерская CPU</button></div></div>'
      );
      api.body.appendChild(root);
      root.querySelectorAll('[data-store-cat]').forEach(function (button) {
        button.addEventListener('click', function () {
          current = button.getAttribute('data-store-cat');
          render();
        });
      });
      root.querySelector('[data-store="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-store="workbench"]').addEventListener('click', function () { api.open('workbench'); });
      update = render;
      listen(update);
      render();
    }
    function close() { unlisten(update); update = null; root = null; api = null; }
    return { mount: mount, close: close };
  })();

  const Computer = (function () {
    let root = null;
    let api = null;
    let update = null;

    function render() {
      if (!root || !root.isConnected) return;
      const perf = G.performance();
      root.querySelector('[data-my="fps"]').textContent = perf.fps + ' FPS';
      root.querySelector('[data-my="delay"]').textContent = perf.latency + ' мс';
      root.querySelector('[data-my="money"]').textContent = money(G.money());
      root.querySelector('[data-my="credits"]').textContent = G.hardwareCredits() + ' арк. ₡';
      root.querySelector('[data-my="meter"]').style.width = Math.min(100, perf.fps / 120 * 100) + '%';

      const installed = root.querySelector('[data-my="installed"]');
      installed.replaceChildren();
      ['cpu', 'gpu', 'ram'].forEach(function (type) {
        const p = G.installedPart(type);
        const card = el('<article class="my-part"><span class="part-kicker"></span><h3></h3><p class="muted"></p><span class="my-installed-badge">Установлено</span></article>');
        card.querySelector('.part-kicker').textContent = names[type];
        card.querySelector('h3').textContent = p.name;
        card.querySelector('p').textContent = p.detail;
        installed.appendChild(card);
      });

      const inventory = root.querySelector('[data-my="inventory"]');
      inventory.replaceChildren();
      const items = G.partInventory();
      root.querySelector('[data-my="count"]').textContent = items.length + ' шт.';
      if (!items.length) {
        inventory.appendChild(el('<p class="parts-empty">Инвентарь пуст. Купи комплектующие в магазине.</p>'));
      }
      items.forEach(function (p) {
        const row = el(
          '<article class="my-inventory-row"><div><span class="part-kicker"></span><h4></h4><p class="muted"></p></div>' +
          '<button type="button" class="btn btn--primary btn--sm"></button></article>'
        );
        row.querySelector('.part-kicker').textContent = names[p.type];
        row.querySelector('h4').textContent = p.name;
        row.querySelector('p').textContent = p.detail;
        const button = row.querySelector('button');
        button.textContent = p.type === 'cpu' ? 'Заменить CPU' : 'Установить';
        button.addEventListener('click', function () {
          if (p.type === 'cpu') {
            window.CPUWorkbench.choose(p.id);
            api.open('workbench');
          } else notify(G.installPart(p.id));
        });
        inventory.appendChild(row);
      });
    }

    function mount(openApi) {
      api = openApi;
      root = el(
        '<div class="app pc-app"><div class="app-head"><div><h2>Мой компьютер</h2>' +
        '<p class="muted">Детали покупаются отдельно и работают только после установки.</p></div>' +
        '<div class="parts-wallet"><b data-my="money"></b><small data-my="credits"></small></div></div>' +
        '<section class="pc-overview"><div><span class="pc-eyebrow">ИГРОВАЯ ПРОИЗВОДИТЕЛЬНОСТЬ</span>' +
        '<strong data-my="fps"></strong><p>Задержка ввода: <span data-my="delay"></span></p></div>' +
        '<div class="pc-chip-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>' +
        '<div class="pc-fps-bar"><i data-my="meter"></i></div><h3 class="pc-section-title">Установлено в ПК</h3>' +
        '<div class="pc-parts" data-my="installed"></div><div class="my-inventory-title"><h3 class="pc-section-title">Мои комплектующие</h3>' +
        '<span data-my="count"></span></div><div class="my-inventory" data-my="inventory"></div>' +
        '<div class="pc-actions"><button type="button" class="btn btn--primary" data-my="shop">Магазин комплектующих</button>' +
        '<button type="button" class="btn" data-my="workbench">Заменить процессор</button>' +
        '<button type="button" class="btn" data-my="arcade">Аркада</button></div>' +
        '<p class="muted pc-disclaimer">Это игровой компьютер: показатели FPS и задержки условные. ' +
        'Материнская плата в симуляции использует сокет LGA1200 и память DDR4.</p></div>'
      );
      api.body.appendChild(root);
      root.querySelector('[data-my="shop"]').addEventListener('click', function () { api.open('shop'); });
      root.querySelector('[data-my="workbench"]').addEventListener('click', function () { api.open('workbench'); });
      root.querySelector('[data-my="arcade"]').addEventListener('click', function () { api.open('arcade'); });
      update = render;
      listen(update);
      render();
    }
    function close() { unlisten(update); update = null; root = null; api = null; }
    return { mount: mount, close: close };
  })();

  const Workbench = (function () {
    let root = null;
    let api = null;
    let selectedId = null;
    let preferred = null;
    let stage = -1;
    let picked = false;
    let angle = 90;
    let update = null;
    const steps = [
      'Сними кулер с процессора.',
      'Открой фиксатор сокета LGA1200.',
      'Достань старый процессор из сокета.',
      'Выбери новый процессор, совмести золотой угол и вставь его в сокет.',
      'Закрой фиксатор сокета.',
      'Верни кулер на процессор.',
      'Замена завершена.'
    ];

    function message(text, tone) {
      const node = root.querySelector('[data-work="hint"]');
      node.textContent = text;
      node.classList.toggle('is-error', tone === 'error');
    }

    function renderChoices() {
      if (!root || !root.isConnected || stage >= 0 && stage < 6) return;
      const stock = root.querySelector('[data-work="choices"]');
      stock.replaceChildren();
      const options = G.partInventory('cpu');
      if (!options.length) {
        stock.appendChild(el('<p class="parts-empty">Нет запасного CPU. Сначала купи процессор в магазине комплектующих.</p>'));
      }
      options.forEach(function (p) {
        const button = el('<button class="work-choice" type="button"><strong></strong><span></span></button>');
        button.querySelector('strong').textContent = p.name;
        button.querySelector('span').textContent = p.detail;
        button.classList.toggle('selected', p.id === selectedId || p.id === preferred);
        button.addEventListener('click', function () { start(p.id); });
        stock.appendChild(button);
      });
      root.querySelector('[data-work="old"]').textContent = G.installedPart('cpu').name;
    }

    function renderScene() {
      if (!root || !root.isConnected) return;
      const scene = root.querySelector('[data-work="scene"]');
      scene.setAttribute('data-stage', String(stage));
      scene.classList.toggle('is-selected', picked);
      root.querySelector('[data-work="progress"]').style.width = (stage < 0 ? 0 : Math.round(stage / 6 * 100)) + '%';
      root.querySelector('[data-work="step"]').textContent = stage < 0 ? 'Выбери процессор в инвентаре' :
        'Шаг ' + Math.min(stage + 1, 6) + ' из 6';
      root.querySelector('[data-work="new"]').textContent = selectedId ? G.partById(selectedId).name : 'Не выбран';
      root.querySelector('[data-work="rotation"]').textContent = angle + '°';
      root.querySelector('[data-work="tray"]').style.setProperty('--rotation', angle + 'deg');
      root.querySelector('[data-work="choices"]').hidden = stage >= 0 && stage < 6;
      root.querySelector('[data-work="scene-wrap"]').hidden = stage < 0;
      root.querySelector('[data-work="restart"]').hidden = stage < 0;
      root.querySelector('[data-work="rotate"]').disabled = stage !== 3;
      root.querySelector('[data-work="tray"]').disabled = stage !== 3;
      root.querySelector('[data-work="cooler"]').disabled = stage !== 0 && stage !== 5;
      root.querySelector('[data-work="lever"]').disabled = stage !== 1 && stage !== 4;
      root.querySelector('[data-work="socket"]').disabled = stage !== 2 && stage !== 3;
      root.querySelector('[data-work="tray"]').classList.toggle('selected', picked);
      if (stage >= 0) message(steps[stage]);
    }

    function start(id) {
      const item = G.partById(id);
      if (!item || item.type !== 'cpu' || !G.partInventory('cpu').some(function (p) { return p.id === id; })) {
        if (root) message('Процессора нет в инвентаре.', 'error');
        return;
      }
      selectedId = id;
      preferred = id;
      stage = 0;
      angle = 90;
      picked = false;
      renderScene();
    }

    function reset() {
      selectedId = null;
      preferred = null;
      stage = -1;
      picked = false;
      renderScene();
      renderChoices();
      if (root) message('Выбери процессор в инвентаре, чтобы начать замену.');
    }

    function advance(action) {
      if (stage === 0 && action === 'cooler') stage = 1;
      else if (stage === 1 && action === 'lever') stage = 2;
      else if (stage === 2 && action === 'socket') stage = 3;
      else if (stage === 3 && action === 'tray') picked = true;
      else if (stage === 3 && action === 'rotate') angle = (angle + 90) % 360;
      else if (stage === 3 && action === 'socket') {
        if (!picked) { message('Сначала выбери новый процессор в лотке справа.', 'error'); return; }
        if (angle !== 0) { message('Золотой угол не совпадает. Поверни процессор так, чтобы получить 0°.', 'error'); return; }
        stage = 4;
      } else if (stage === 4 && action === 'lever') stage = 5;
      else if (stage === 5 && action === 'cooler') {
        const result = G.installCpuFromWorkbench(selectedId);
        if (!result.ok) { message(result.msg, 'error'); return; }
        stage = 6;
        UI.toast(result.msg, 'ok');
      } else return;
      renderScene();
      if (stage === 6) {
        message('Готово! ' + G.installedPart('cpu').name + ' установлен. Старый CPU теперь в инвентаре.');
        renderChoices();
      }
    }

    function mount(openApi) {
      api = openApi;
      root = el(
        '<div class="app work-app">' +
        '<div class="app-head"><div><h2>Мастерская: замена CPU</h2>' +
        '<p class="muted">Интерактивная сборка · сокет LGA1200</p></div>' +
        '<button type="button" class="btn" data-work="shop">Магазин</button></div>' +
        '<div class="work-topline"><div><span>Установлен</span><b data-work="old"></b></div>' +
        '<div><span>Новый процессор</span><b data-work="new">Не выбран</b></div></div>' +
        '<div class="work-progress"><i data-work="progress"></i></div>' +
        '<p class="work-step" data-work="step"></p>' +
        '<div class="work-choices" data-work="choices"></div>' +
        '<section class="work-scene-wrap" data-work="scene-wrap" hidden>' +
        '<div class="work-scene" data-work="scene" data-stage="0">' +
        '<div class="work-board"><span class="work-board-brand">ZARYA · LGA1200</span>' +
        '<div class="work-traces" aria-hidden="true"></div>' +
        '<div class="work-socket-frame"><span class="work-alignment">◆</span>' +
        '<button type="button" class="work-socket" data-work="socket" data-action="socket" title="Сокет процессора">' +
        '<span class="work-oldchip">OLD CPU</span><span class="work-newchip">NEW CPU</span>' +
        '<span class="work-socket-empty">СОКЕТ</span></button>' +
        '<button type="button" class="work-lever" data-work="lever" data-action="lever" title="Фиксатор сокета"></button></div>' +
        '<div class="work-ram-slots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
        '<button type="button" class="work-cooler" data-work="cooler" data-action="cooler" title="Кулер процессора">' +
        '<span class="work-fan"><i></i></span><small>COOLER</small></button></div>' +
        '<aside class="work-tray-area"><span>НОВАЯ ДЕТАЛЬ</span>' +
        '<button type="button" class="work-tray" data-work="tray" data-action="tray" draggable="true">' +
        '<span class="work-tray-chip"><i>◆</i><b>CPU</b></span><small>Взять процессор</small></button>' +
        '<button type="button" class="btn" data-work="rotate" data-action="rotate">Повернуть на 90°</button>' +
        '<small class="work-angle">Ориентация: <b data-work="rotation">90°</b></small>' +
        '</aside></div><p class="work-legend">Нажимай на подсвеченную деталь. CPU можно перетащить из лотка в сокет или выбрать и вставить кликом.</p></section>' +
        '<p class="work-hint" data-work="hint" role="status">Выбери процессор в инвентаре.</p>' +
        '<div class="pc-actions"><button type="button" class="btn" data-work="restart" hidden>Отменить замену</button>' +
        '<button type="button" class="btn btn--primary" data-work="pc">Мой ПК</button></div>' +
        '<p class="muted parts-footnote">Игровая симуляция замены CPU. Реальная сборка требует проверки совместимости, ' +
        'отключённого питания и соблюдения инструкции производителя.</p></div>'
      );
      api.body.appendChild(root);
      root.querySelector('[data-work="old"]').textContent = G.installedPart('cpu').name;
      root.querySelector('[data-work="shop"]').addEventListener('click', function () { api.open('shop'); });
      root.querySelector('[data-work="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-work="restart"]').addEventListener('click', reset);
      root.querySelectorAll('[data-action]').forEach(function (button) {
        button.addEventListener('click', function () { advance(button.getAttribute('data-action')); });
      });
      const tray = root.querySelector('[data-work="tray"]');
      const socket = root.querySelector('[data-work="socket"]');
      tray.addEventListener('dragstart', function (e) {
        if (stage !== 3) { e.preventDefault(); return; }
        picked = true;
        if (e.dataTransfer) e.dataTransfer.setData('text/plain', 'zarya-cpu');
        renderScene();
      });
      socket.addEventListener('dragover', function (e) {
        if (stage === 3) e.preventDefault();
      });
      socket.addEventListener('drop', function (e) {
        if (stage !== 3) return;
        e.preventDefault();
        picked = true;
        advance('socket');
      });
      update = renderChoices;
      listen(update);
      if (preferred && G.partInventory('cpu').some(function (p) { return p.id === preferred; })) start(preferred);
      else reset();
    }
    function close() {
      unlisten(update);
      update = null;
      root = null;
      api = null;
      selectedId = null;
      preferred = null;
      stage = -1;
    }
    function choose(id) {
      preferred = id;
      if (root && root.isConnected) start(id);
    }
    return { mount: mount, close: close, choose: choose };
  })();

  window.CPUWorkbench = { choose: Workbench.choose };
  window.APPICONS.pc = '<svg viewBox="0 0 32 32" aria-hidden="true">' + icons.cpu + '</svg>';
  window.APPICONS.workbench = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect x="3" y="4" width="26" height="24" rx="5" fill="#254257"/>' +
    '<path d="M7 23h18M11 8v11h10V8z" fill="#79d7fa" opacity=".75"/>' +
    '<path d="M14 13h4m-2-2v4" stroke="#0b263f" stroke-width="1.8"/>' +
    '</svg>';
  window.APPS.shop.name = 'Магазин комплектующих';
  window.APPS.shop.mount = Store.mount;
  window.APPS.shop.onClose = Store.close;
  window.APPS.shop.w = 960;
  window.APPS.shop.h = 620;
  window.APPS.pc.icon = window.APPICONS.pc;
  window.APPS.pc.mount = Computer.mount;
  window.APPS.pc.onClose = Computer.close;
  window.APPS.pc.w = 820;
  window.APPS.pc.h = 620;
  window.APPS.workbench = {
    name: 'Мастерская CPU',
    icon: window.APPICONS.workbench,
    w: 900, h: 650,
    mount: Workbench.mount,
    onClose: Workbench.close
  };
})();