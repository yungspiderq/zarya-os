/* ЗАРЯ OS — отдельные товары, инвентарь и установленные комплектующие. */
(function () {
  'use strict';
  const G = window.Game;
  G.version = '1.6.0';

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
    { id: 'ram4', type: 'ram', name: '32 ГБ DDR4', price: 690, power: 4, detail: '2×16 ГБ · DDR4', capacity: 32 },
    { id: 'board0', type: 'board', name: 'ASRock H410M-HDV', price: 0, power: 0, detail: 'LGA1200 · DDR4 · SATA', socket: 'LGA1200', m2: false, maxRam: 64 },
    { id: 'board1', type: 'board', name: 'MSI B460M PRO-VDH WIFI', price: 260, power: 1, detail: 'LGA1200 · DDR4 · M.2 NVMe', socket: 'LGA1200', m2: true, maxRam: 128 },
    { id: 'board2', type: 'board', name: 'ASUS TUF GAMING B560M-PLUS', price: 580, power: 2, detail: 'LGA1200 · DDR4 · M.2 NVMe', socket: 'LGA1200', m2: true, maxRam: 128 },
    { id: 'board3', type: 'board', name: 'MSI MAG Z490 TOMAHAWK', price: 980, power: 3, detail: 'LGA1200 · DDR4 · два разъёма M.2', socket: 'LGA1200', m2: true, maxRam: 128 },
    { id: 'psu0', type: 'psu', name: 'OEM 300W', price: 0, power: 0, detail: '300 Вт · стартовый блок', watts: 300 },
    { id: 'psu1', type: 'psu', name: 'Corsair CV450', price: 155, power: 1, detail: '450 Вт · 80 PLUS Bronze', watts: 450 },
    { id: 'psu2', type: 'psu', name: 'be quiet! System Power 10 550W', price: 340, power: 2, detail: '550 Вт · 80 PLUS Bronze', watts: 550 },
    { id: 'psu3', type: 'psu', name: 'Corsair CX650', price: 610, power: 3, detail: '650 Вт · 80 PLUS Bronze', watts: 650 },
    { id: 'psu4', type: 'psu', name: 'Seasonic FOCUS GX-750', price: 1050, power: 4, detail: '750 Вт · 80 PLUS Gold', watts: 750 },
    { id: 'ssd0', type: 'ssd', name: 'WD Blue 500GB HDD', price: 0, power: 0, detail: 'Жёсткий диск · 500 ГБ · SATA', interface: 'SATA', mbps: 110 },
    { id: 'ssd1', type: 'ssd', name: 'Kingston A400 480GB', price: 145, power: 1, detail: 'SSD · 480 ГБ · SATA', interface: 'SATA', mbps: 450 },
    { id: 'ssd2', type: 'ssd', name: 'Samsung 870 EVO 1TB', price: 385, power: 2, detail: 'SSD · 1 ТБ · SATA', interface: 'SATA', mbps: 560 },
    { id: 'ssd3', type: 'ssd', name: 'WD Blue SN570 1TB', price: 645, power: 3, detail: 'NVMe · 1 ТБ · M.2', interface: 'M.2', mbps: 3000 },
    { id: 'ssd4', type: 'ssd', name: 'Samsung 970 EVO Plus 2TB', price: 1050, power: 4, detail: 'NVMe · 2 ТБ · M.2', interface: 'M.2', mbps: 3500 }
  ];

  const original = {
    shop: G.shop.bind(G),
    level: G.level.bind(G),
    buy: G.buy.bind(G),
    reset: G.reset.bind(G)
  };

  function part(id) { return PARTS.find(function (p) { return p.id === id; }) || null; }
  function validType(type) { return ['cpu', 'gpu', 'ram', 'board', 'psu', 'ssd'].includes(type); }
  function clampLevel(level) { return Math.max(0, Math.min(4, Math.floor(Number(level) || 0))); }
  function fresh() {
    return {
      v: 2,
      installed: { cpu: 'cpu0', gpu: 'gpu0', ram: 'ram0', board: 'board0', psu: 'psu0', ssd: 'ssd0' },
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
  ['cpu', 'gpu', 'ram', 'board', 'psu', 'ssd'].forEach(function (type) {
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

  function powerNeeded(cpu, gpu) {
    // Simulated whole-PC requirement, deliberately not an electrical engineering calculator.
    const cpuWatts = [55, 65, 65, 65, 125][cpu.power] || 65;
    const gpuWatts = [0, 30, 185, 125, 170][gpu.power] || 0;
    return Math.ceil((85 + cpuWatts + gpuWatts) * 1.2);
  }

  function compatibility(id) {
    const next = part(id);
    if (!next) return { ok: false, msg: 'Комплектующее не найдено.' };
    const chosen = Object.assign({}, state.installed, { [next.type]: id });
    const board = part(chosen.board), cpu = part(chosen.cpu), ram = part(chosen.ram);
    const gpu = part(chosen.gpu), psu = part(chosen.psu), ssd = part(chosen.ssd);
    if (!board || !cpu || !ram || !gpu || !psu || !ssd) return { ok: false, msg: 'Не хватает данных о конфигурации.' };
    if (cpu.socket !== board.socket) {
      return { ok: false, msg: 'Несовместимый сокет: ' + cpu.socket + ' / ' + board.socket + '.' };
    }
    const ramGb = [2, 4, 8, 16, 32][ram.power] || 2;
    if (ramGb > board.maxRam) return { ok: false, msg: 'Эта материнская плата не поддерживает ' + ramGb + ' ГБ памяти.' };
    if (ssd.interface === 'M.2' && !board.m2) {
      return { ok: false, msg: 'Нужен слот M.2. Купи и установи материнскую плату с M.2.' };
    }
    const required = powerNeeded(cpu, gpu);
    if (psu.watts < required) {
      return { ok: false, msg: 'Не хватает мощности блока питания: требуется ' + required + ' Вт, доступно ' + psu.watts + ' Вт.' };
    }
    return { ok: true, msg: 'Совместимо с установленным компьютером.' };
  }
  G.partCompatibility = compatibility;
  G.systemHealth = function () {
    const cpu = G.installedPart('cpu');
    const gpu = G.installedPart('gpu');
    const psu = G.installedPart('psu');
    const drive = G.installedPart('ssd');
    const need = powerNeeded(cpu, gpu);
    return {
      requiredWatts: need,
      suppliedWatts: psu.watts,
      spareWatts: psu.watts - need,
      storageSpeed: drive.mbps,
      bootSeconds: Math.max(5, Math.round(48 - 9 * drive.power - G.level('cpu') * 1.2)),
      diskName: drive.name,
      status: psu.watts >= need ? 'Система стабильна' : 'Питание недостаточно'
    };
  };

  G.installPart = function (id) {
    const p = part(id);
    if (!p) return { ok: false, msg: 'Компонент не найден.' };
    if (p.type === 'cpu') return { ok: false, msg: 'Для процессора открой «Мастерскую» и пройди замену.' };
    if (p.type === 'ssd') return { ok: false, msg: 'Чтобы поставить накопитель, пройди мини-игру «Монтаж SSD».' };
    const check = compatibility(id);
    if (!check.ok) return check;
    return equip(id, p.type);
  };
  G.installCpuFromWorkbench = function (id) {
    const p = part(id);
    if (!p || p.type !== 'cpu' || p.socket !== 'LGA1200') {
      return { ok: false, msg: 'Процессор несовместим с сокетом LGA1200.' };
    }
    const check = compatibility(id);
    if (!check.ok) return check;
    return equip(id, 'cpu');
  };
  G.installDriveFromWorkbench = function (id) {
    const p = part(id);
    if (!p || p.type !== 'ssd') return { ok: false, msg: 'Выбери накопитель из инвентаря.' };
    const check = compatibility(id);
    if (!check.ok) return check;
    return equip(id, 'ssd');
  };

  G.performance = function () {
    const fps = Math.min(120, Math.round(12 + G.level('gpu') * 22 + G.level('cpu') * 4 + G.level('ram') * 3));
    const latency = Math.max(0, 150 - G.level('cpu') * 22 - G.level('ram') * 17);
    return {
      fps: fps,
      bootSeconds: G.systemHealth().bootSeconds,
      storageSpeed: G.systemHealth().storageSpeed,
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