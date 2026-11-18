/* ЗАРЯ OS: самостоятельная система виртуальных комплектующих и аркадных кредитов. */
(function () {
  'use strict';
  const G = window.Game;
  const KEY = 'zarya.hardware.v1';
  const ITEMS = [
    {
      id: 'gpu', name: 'Видеокарта', effect: 'Повышает FPS мини-игр',
      desc: 'Реальные модели видеокарт. Увеличивает плавность отрисовки.',
      costs: [20, 45, 85, 155], max: 4,
      levels: ['Intel UHD Graphics 610', 'NVIDIA GeForce GT 1030', 'AMD Radeon RX 580', 'NVIDIA GeForce GTX 1660 SUPER', 'NVIDIA GeForce RTX 3060']
    },
    {
      id: 'ram', name: 'Оперативная память', effect: 'Снижает задержку ввода',
      desc: 'Увеличивает объём оперативной памяти игрового ПК.',
      costs: [15, 35, 70, 120], max: 4,
      levels: ['2 ГБ DDR4', '4 ГБ DDR4', '8 ГБ DDR4', '16 ГБ DDR4', '32 ГБ DDR4']
    }
  ];
  const original = {
    shop: G.shop.bind(G), level: G.level.bind(G),
    buy: G.buy.bind(G), reset: G.reset.bind(G)
  };
  function fresh() { return { gpu: 0, ram: 0, credits: 0, best: {}, paidAt: {} }; }
  let state = fresh();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored && typeof stored === 'object') state = Object.assign(fresh(), stored);
  } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zarya:hardware'));
  }
  G.shop = function () {
    return original.shop().map(function (item) {
      if (item.id !== 'cpu') return item;
      return Object.assign({}, item, {
        name: 'Процессор',
        desc: 'Реальные CPU. Ускоряет подбор в терминале и уменьшает задержку мини-игр.',
        levels: ['Intel Celeron G5905', 'Intel Core i3-10100F', 'AMD Ryzen 5 3600', 'Intel Core i5-12400F', 'AMD Ryzen 7 5800X']
      });
    }).concat(ITEMS);
  };
  G.level = function (id) {
    return id === 'gpu' || id === 'ram' ? Math.max(0, Math.min(4, Number(state[id]) || 0)) : original.level(id);
  };
  G.hardwareCredits = function () { return Math.max(0, Number(state.credits) || 0); };
  G.buy = function (id) {
    const item = ITEMS.find(function (it) { return it.id === id; });
    if (!item) return original.buy(id);
    const level = G.level(id);
    if (level >= item.max) return { ok: false, msg: 'Максимальный уровень уже установлен.' };
    const cost = item.costs[level];
    if (G.hardwareCredits() < cost) {
      return { ok: false, msg: 'Нужно ' + cost + ' аркадных кредитов. Играй в Аркаде, чтобы заработать.' };
    }
    state.credits -= cost;
    state[id] = level + 1;
    save();
    return { ok: true, msg: 'Установлено: ' + item.levels[level + 1] + ' (−' + cost + ' аркадных кредитов)' };
  };
  G.performance = function () {
    const fps = Math.min(120, Math.round(12 + G.level('gpu') * 22 + G.level('cpu') * 4 + G.level('ram') * 3));
    const latency = Math.max(0, 150 - G.level('cpu') * 22 - G.level('ram') * 17);
    return {
      fps: fps, latency: latency,
      tier: fps < 35 ? 'Слабая конфигурация' : fps < 65 ? 'Средняя конфигурация' : 'Мощная конфигурация'
    };
  };
  G.arcadeBest = function (mode) { return Number(state.best[mode]) || 0; };
  G.awardArcade = function (mode, score) {
    if (mode !== 'snake' && mode !== 'reaction') return { ok: false, msg: 'Неизвестная игра.' };
    const points = Math.max(0, Math.min(5000, Math.floor(Number(score) || 0)));
    state.best[mode] = Math.max(G.arcadeBest(mode), points);
    const now = Date.now();
    if (now - (Number(state.paidAt[mode]) || 0) < 60000) {
      save();
      return { ok: false, msg: 'Рекорд сохранён. Выплаты по каждой игре — раз в 60 секунд.' };
    }
    const payout = Math.min(100, Math.round(points * (mode === 'snake' ? 1.5 : 1)));
    if (!payout) {
      save();
      return { ok: false, msg: 'Чтобы получить награду, набери очки.' };
    }
    state.paidAt[mode] = now;
    state.credits += payout;
    save();
    return { ok: true, msg: '+' + payout + ' аркадных кредитов. Рекорд: ' + state.best[mode] };
  };
  G.reset = function () {
    state = fresh();
    try { localStorage.removeItem(KEY); } catch (e) {}
    original.reset();
    save();
  };
})();