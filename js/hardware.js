/* ЗАРЯ OS — отдельные товары, инвентарь и установленные комплектующие. */
(function () {
  'use strict';
  const G = window.Game;
  G.version = '1.4.0';

  const KEY = 'zarya.components.v2';
  const OLD_KEY = 'zarya.hardware.v1';
  const PARTS = [
    { id: 'cpu0', type: 'cpu', name: 'Intel Celeron G5905', price: 0, power: 0, detail: '2 ядра · LGA1200', socket: 'LGA1200' },
    { id: 'cpu1', type: 'cpu', name: 'Intel Core i3-10100', price: 160, power: 1, detail: '4 ядра / 8 потоков · LGA1200', socket: 'LGA1200' },
    { id: 'cpu2', type: 'cpu', name: 'Intel Core i5-10400', price: 360, power: 2, detail: '6 ядер / 12 потоков · LGA1200', socket: 'LGA1200' },
    { id: 'cpu3', type: 'cpu', name: 'Intel Core i7-10700', price: 790, power: 3, detail: '8 ядер / 16 потоков · LGA1200', socket: 'LGA1200' },
    { id: 'cpu4', type: 'cpu', name: 'Intel Core i9-10900K', price: 1650, power: 4, detail: '10 ядер / 20 потоков · LGA1200', socket: 'LGA1200' },
    { id: 'gpu0', type: 'gpu', name: 'Intel UHD Graphics 610', price: 0, power: 0, detail: 'Встроенная графика', builtin: true },
    { id: 'gpu1', type: 'gpu', name: 'NVIDIA GeForce GT 1030', price: 130, power: 1, detail: '2 ГБ видеопамяти' },
    { id: 'gpu2', type: 'gpu', name: 'AMD Radeon RX 580', price: 300, power: 2, detail: '8 ГБ видеопамяти' },
    { id: 'gpu3', type: 'gpu', name: 'NVIDIA GeForce GTX 1660 SUPER', price: 640, power: 3, detail: '6 ГБ видеопамяти' },
    { id: 'gpu4', type: 'gpu', name: 'NVIDIA GeForce RTX 3060', price: 1280, power: 4, detail: '12 ГБ видеопамяти' },
    { id: 'ram0', type: 'ram', name: '2 ГБ DDR4', price: 0, power: 0, detail: 'Стартовый модуль · DDR4' },
    { id: 'ram1', type: 'ram', name: '4 ГБ DDR4', price: 65, power: 1, detail: '1×4 ГБ · DDR4' },
    { id: 'ram2', type: 'ram', name: '8 ГБ DDR4', price: 145, power: 2, detail: '1×8 ГБ · DDR4' },
    { id: 'ram3', type: 'ram', name: '16 ГБ DDR4', price: 325, power: 3, detail: '2×8 ГБ · DDR4' },
    { id: 'ram4', type: 'ram', name: '32 ГБ DDR4', price: 690, power: 4, detail: '2×16 ГБ · DDR4' }
  ];

  const original = {
    shop: G.shop.bind(G),
    level: G.level.bind(G),
    buy: G.buy.bind(G),
    reset: G.reset.bind(G)
  };

  function part(id) { return PARTS.find(function (p) { return p.id === id; }) || null; }
  function validType(type) { return type === 'cpu' || type === 'gpu' || type === 'ram'; }
  function clampLevel(level) { return Math.max(0, Math.min(4, Math.floor(Number(level) || 0))); }
  function fresh() {
    return {
      v: 2,
      installed: { cpu: 'cpu0', gpu: 'gpu0', ram: 'ram0' },
      inventory: [],
      credits: 0,
      best: {},
      paidAt: {}
    };
  }

  function migrate() {
    const next = fresh();
    next.installed.cpu = 'cpu' + clampLevel(original.level('cpu'));
    try {
      const old = JSON.parse(localStorage.getItem(OLD_KEY));
      if (old && typeof old === 'object') {
        next.installed.gpu = 'gpu' + clampLevel(old.gpu);
        next.installed.ram = 'ram' + clampLevel(old.ram);
        next.credits = Math.max(0, Math.floor(Number(old.credits) || 0));
        if (old.best && typeof old.best === 'object') next.best = old.best;
        if (old.paidAt && typeof old.paidAt === 'object') next.paidAt = old.paidAt;
      }
    } catch (e) {}
    return next;
  }

  let state = null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.v === 2 && raw.installed) state = Object.assign(fresh(), raw);
  } catch (e) {}
  if (!state) state = migrate();

  // Не доверяем устаревшим, дублированным и случайно испорченным ID в сохранении.
  ['cpu', 'gpu', 'ram'].forEach(function (type) {
    if (!part(state.installed[type]) || part(state.installed[type]).type !== type) {
      state.installed[type] = type + '0';
    }
  });
  if (!Array.isArray(state.inventory)) state.inventory = [];
  state.inventory = Array.from(new Set(state.inventory)).filter(function (id) {
    const p = part(id);
    return p && !p.builtin && !Object.values(state.installed).includes(id);
  });
  state.credits = Math.max(0, Math.floor(Number(state.credits) || 0));
  if (!state.best || typeof state.best !== 'object') state.best = {};
  if (!state.paidAt || typeof state.paidAt !== 'object') state.paidAt = {};

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zarya:hardware'));
  }

  G.partsCatalog = function (type) {
    return PARTS.filter(function (p) { return !type || p.type === type; }).map(function (p) {
      return Object.assign({}, p);
    });
  };
  G.partById = function (id) {
    const p = part(id);
    return p ? Object.assign({}, p) : null;
  };
  G.installedPart = function (type) {
    if (!validType(type)) return null;
    return G.partById(state.installed[type]);
  };
  G.partInventory = function (type) {
    return state.inventory.map(G.partById).filter(function (p) {
      return p && (!type || p.type === type);
    });
  };
  G.hasPart = function (id) {
    return state.inventory.includes(id) || Object.values(state.installed).includes(id);
  };
  G.shop = function () {
    return original.shop().filter(function (item) { return item.id !== 'cpu'; });
  };
  G.level = function (id) {
    if (validType(id)) return G.installedPart(id).power;
    return original.level(id);
  };
  G.buy = function (id) {
    if (validType(id)) return { ok: false, msg: 'Комплектующие покупаются по моделям в приложении «Магазин».' };
    return original.buy(id);
  };
  G.hardwareCredits = function () { return state.credits; };
  G.buyPart = function (id) {
    const p = part(id);
    if (!p || p.builtin || p.price <= 0) return { ok: false, msg: 'Этот компонент нельзя купить.' };
    if (G.hasPart(id)) return { ok: false, msg: 'Этот компонент уже есть в инвентаре или установлен.' };
    const arcade = Math.min(state.credits, p.price);
    const cash = p.price - arcade;
    if (G.money() < cash) {
      return {
        ok: false,
        msg: 'Не хватает ' + (cash - G.money()) + ' ₡. Оплата: кредиты Аркады + баланс контрактов.'
      };
    }
    const payment = G.spendFunds(cash);
    if (!payment.ok) return payment;
    state.credits -= arcade;
    state.inventory.push(id);
    save();
    return { ok: true, msg: p.name + ' куплен и добавлен в инвентарь. Перейди в «Мой ПК» для установки.' };
  };

  function equip(id, type) {
    const p = part(id);
    if (!p || p.type !== type) return { ok: false, msg: 'Неверный тип комплектующего.' };
    if (state.installed[type] === id) return { ok: false, msg: 'Деталь уже установлена.' };
    if (!state.inventory.includes(id)) return { ok: false, msg: 'Деталь отсутствует в инвентаре.' };
    const old = state.installed[type];
    state.inventory = state.inventory.filter(function (x) { return x !== id; });
    const previous = part(old);
    if (previous && !previous.builtin && !state.inventory.includes(old)) state.inventory.push(old);
    state.installed[type] = id;
    save();
    return { ok: true, msg: 'Установлено: ' + p.name + '. Старая деталь возвращена в инвентарь.' };
  }

  G.installPart = function (id) {
    const p = part(id);
    if (!p) return { ok: false, msg: 'Компонент не найден.' };
    if (p.type === 'cpu') return { ok: false, msg: 'Для процессора открой «Мастерскую» и пройди замену.' };
    return equip(id, p.type);
  };
  G.installCpuFromWorkbench = function (id) {
    const p = part(id);
    if (!p || p.type !== 'cpu' || p.socket !== 'LGA1200') {
      return { ok: false, msg: 'Процессор несовместим с сокетом LGA1200.' };
    }
    return equip(id, 'cpu');
  };

  G.performance = function () {
    const fps = Math.min(120, Math.round(12 + G.level('gpu') * 22 + G.level('cpu') * 4 + G.level('ram') * 3));
    const latency = Math.max(0, 150 - G.level('cpu') * 22 - G.level('ram') * 17);
    return {
      fps: fps,
      latency: latency,
      tier: fps < 35 ? 'Слабая конфигурация' : fps < 65 ? 'Средняя конфигурация' : 'Мощная конфигурация'
    };
  };
  G.arcadeBest = function (mode) { return Math.max(0, Number(state.best[mode]) || 0); };
  G.awardArcade = function (mode, score) {
    if (mode !== 'snake' && mode !== 'reaction') return { ok: false, msg: 'Неизвестная мини-игра.' };
    const points = Math.max(0, Math.min(5000, Math.floor(Number(score) || 0)));
    state.best[mode] = Math.max(G.arcadeBest(mode), points);
    const now = Date.now();
    if (now - (Number(state.paidAt[mode]) || 0) < 60000) {
      save();
      return { ok: false, msg: 'Рекорд сохранён. Выплаты доступны раз в 60 секунд для каждой игры.' };
    }
    const reward = Math.min(100, Math.round(points * (mode === 'snake' ? 1.5 : 1)));
    if (!reward) {
      save();
      return { ok: false, msg: 'Сначала набери очки, чтобы получить награду.' };
    }
    state.paidAt[mode] = now;
    state.credits += reward;
    save();
    return { ok: true, msg: '+' + reward + ' аркадных кредитов. Рекорд: ' + state.best[mode] };
  };

  G.reset = function () {
    state = fresh();
    try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (e) {}
    original.reset();
    save();
  };
  save();
})();