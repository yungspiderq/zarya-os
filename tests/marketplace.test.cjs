/* Zarya OS 1.9: deterministic market, inspection, resale, used-parts wear and repair tests. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const hardware = fs.readFileSync(path.join(__dirname, '..', 'js/hardware.js'), 'utf8');
const market = fs.readFileSync(path.join(__dirname, '..', 'js/marketplace.js'), 'utf8');

function boot(opts = {}) {
  const data = opts.data || new Map();
  let balance = opts.balance === undefined ? 7500 : opts.balance;
  let resetCount = 0, credited = 0;
  const events = [];
  const G = {
    money: () => balance,
    shop: () => [{ id: 'cpu', max: 4 }, { id: 'proxy', max: 3 }],
    level: () => 0,
    buy: () => ({ ok: true }),
    spendFunds: price => {
      if (!Number.isSafeInteger(price) || price < 0 || balance < price) {
        return { ok: false, msg: 'Недостаточно средств.' };
      }
      balance -= price;
      return { ok: true };
    },
    creditMarketSale: amount => {
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1500) {
        return { ok: false, msg: 'Некорректная сумма.' };
      }
      balance += amount;
      credited += amount;
      return { ok: true };
    },
    reset: () => { resetCount++; balance = 0; }
  };
  const window = {
    Game: G, APPS: {}, APPICONS: {},
    UI: { toast: () => {} }, dispatchEvent: e => events.push(e.type)
  };
  const localStorage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  const ctx = {
    window, localStorage,
    CustomEvent: class { constructor(type) { this.type = type; } },
    Date, Math, JSON, Number, Object, Array, Set
  };
  vm.runInNewContext(hardware, ctx, { filename: 'hardware.js' });
  vm.runInNewContext(market, ctx, { filename: 'marketplace.js' });
  return { G, data, events, balance: () => balance, credited: () => credited,
    resetCount: () => resetCount, window };
}

function inspect(G, id) {
  let count = 0;
  while (count++ < 3) {
    const d = G.marketInspection(id);
    if (d.completed) break;
    const note = d.question.observation;
    const pass = /Контакты чистые|пройден без предупреждений|не обнаружили критических/.test(note);
    if (d.step === 0) {
      assert.equal(G.marketCheck(id, !pass).ok, false, 'wrong diagnosis cannot progress');
      assert.equal(G.marketInspection(id).step, 0);
    }
    const result = G.marketCheck(id, pass);
    assert.equal(result.ok, true, 'correct diagnosis: ' + note);
  }
  const inspected = G.marketInspection(id);
  assert.equal(inspected.completed, true);
  assert.ok(inspected.condition >= 45 && inspected.condition <= 90);
}

(function testOffersAndStorefront() {
  const { G, data, window } = boot();
  const offers = G.marketOffers();
  assert.equal(G.version, '1.9.0');
  assert.equal(G.partsCatalog().length, 34);
  assert.equal(offers.length, 7);
  assert.equal(new Set(offers.map(x => x.type)).size, 7);
  assert.equal(new Set(offers.map(x => x.id)).size, 7);
  assert.ok(window.APPS['flea-market']);
  for (const o of offers) {
    assert.ok(o.price < o.retail, 'sale is cheaper than store: ' + o.name);
    assert.ok(o.price >= Math.floor(o.retail * .25));
    assert.equal(o.step, 0);
    assert.equal(o.condition, null, 'condition is hidden until diagnostic mini-game');
    assert.equal(o.sold, false);
  }
  const second = Array.from(boot({ data }).G.marketOffers(), x => x.id);
  assert.deepEqual(second, Array.from(offers, x => x.id), 'daily stock must be stable after reload');
  assert.equal(G.marketInspection('unknown'), null);
  assert.equal(G.marketCheck('unknown', true).ok, false);
})();

(function testBudgetOwnershipResaleAndPersistence() {
  const data = new Map();
  let app = boot({ data, balance: 1500 });
  const G = app.G;
  const item = G.marketOffers().find(x => x.type === 'gpu');
  assert.equal(G.marketBuyOffer(item.id).ok, false, 'cannot skip inspection');
  inspect(G, item.id);
  const fundsBefore = app.balance();
  const expectedPrice = item.price;
  assert.equal(G.marketBuyOffer(item.id).ok, true);
  assert.equal(app.balance(), fundsBefore - expectedPrice, 'debit correct market price');
  assert.equal(G.partInventory('gpu')[0].id, item.id);
  assert.equal(G.installedPart('gpu').id, 'gpu0', 'buying must not auto-install');
  assert.equal(G.marketCondition(item.id).paid, item.price);
  assert.equal(G.marketOffers().find(x => x.id === item.id).sold, true);
  assert.equal(G.marketBuyOffer(item.id).ok, false, 'no duplicate purchase');
  const quote = G.marketSaleQuote(item.id);
  assert.equal(quote.ok, true);
  assert.ok(quote.price > 0 && quote.price < item.price, 'flipping loses money');
  app = boot({ data, balance: 0 });
  assert.equal(app.G.partInventory('gpu')[0].id, item.id, 'part survives reload');
  assert.equal(app.G.marketCondition(item.id).paid, item.price, 'purchase metadata survives reload');
  assert.equal(app.G.marketOffers().find(x => x.id === item.id).sold, true);
  assert.equal(app.G.marketResell(item.id).ok, true);
  assert.equal(app.balance(), quote.price, 'sale credits main balance');
  assert.equal(app.credited(), quote.price);
  assert.equal(app.G.marketSaleQuote(item.id).ok, false, 'double sale blocked');
  assert.equal(app.G.partInventory('gpu').length, 0);
  assert.equal(app.G.marketCondition(item.id), null);
})();

(function testInstalledCannotBeSoldAndStarterUnsellable() {
  const { G } = boot({ balance: 900 });
  assert.equal(G.marketSaleQuote('cpu0').ok, false);
  assert.equal(G.marketSellPart('cpu0').ok, false);
  assert.equal(G.buyPart('ram2').ok, true);
  assert.equal(G.installPart('ram2').ok, true);
  assert.equal(G.marketSaleQuote('ram2').ok, false, 'installed parts cannot be sold');
  assert.equal(G.marketSellPart('ram2').ok, false);
  assert.equal(G.partInventory('ram')[0].id, 'ram0');
  assert.equal(G.marketSaleQuote('ram0').ok, false, 'free starter component cannot be sold');
  assert.equal(G.installPart('ram0').ok, true);
  const quote = G.marketSaleQuote('ram2');
  assert.equal(quote.ok, true);
  assert.ok(quote.price < G.partById('ram2').price, 'new part loses value when sold');
  assert.equal(G.marketSellPart('ram2').ok, true);
  assert.equal(G.marketSellPart('ram2').ok, false);
})();

(function testUsedWearAndThreeStageRefurb() {
  const { G } = boot();
  const item = G.marketOffers().find(x => x.type === 'cpu');
  inspect(G, item.id);
  assert.equal(G.marketBuyOffer(item.id).ok, true);
  assert.equal(G.installCpuFromWorkbench(item.id).ok, true);
  const quality = G.marketCondition(item.id).condition;
  const penalty = G.marketWearPenalty();
  assert.ok(penalty >= 2, 'used CPU produces a small in-game FPS penalty');
  const theoretical = Math.round(12 + G.level('cpu') * 4);
  assert.equal(G.performance().fps, Math.max(8, theoretical - penalty));
  assert.equal(G.marketSaleQuote(item.id).ok, false, 'cannot sell installed CPU');
  assert.equal(G.installCpuFromWorkbench('cpu0').ok, true, 'old CPU returns from inventory');
  const repairs = G.marketRepairables();
  assert.ok(repairs.some(x => x.id === item.id && x.condition === quality));
  assert.equal(G.marketRefurbAction('test').ok, false);
  assert.equal(G.marketRefurbStart(item.id).ok, true);
  assert.equal(G.marketRefurbStart(item.id).ok, false);
  assert.equal(G.marketRefurbAction('test').ok, false, 'stages cannot be skipped');
  assert.equal(G.marketRefurbAction('inspect').ok, true);
  assert.equal(G.marketRefurbAction('clean').ok, true);
  assert.equal(G.marketRefurbAction('test').ok, true);
  assert.equal(G.marketRefurbState(), null);
  assert.equal(G.marketCondition(item.id).condition, 100);
  assert.equal(G.marketCondition(item.id).serviced, true);
  assert.equal(G.marketRefurbStart(item.id).ok, false, 'only one restoration per part');
  assert.equal(G.installCpuFromWorkbench(item.id).ok, true);
  assert.equal(G.marketWearPenalty(), 0, 'refurbished part has no FPS wear');
  assert.equal(G.performance().fps, theoretical);
})();

(function testResetAndOldSaves() {
  const data = new Map();
  data.set('zarya.components.v2', JSON.stringify({
    v: 2, installed: {cpu:'cpu2',gpu:'gpu1',ram:'ram2',board:'board0',psu:'psu0',ssd:'ssd0',cooler:'cooler0'},
    inventory: ['ram3'], credits: 50, best: {}, paidAt: {}
  }));
  let app = boot({ data, balance: 0 });
  assert.equal(app.G.installedPart('cpu').id, 'cpu2');
  assert.equal(app.G.marketCondition('cpu2'), null, 'old installed hardware is always treated as new');
  assert.equal(app.G.marketSellPart('cpu2').ok, false);
  assert.equal(app.G.marketSaleQuote('ram3').ok, true);
  app.G.reset();
  assert.equal(app.resetCount(), 1);
  assert.equal(app.G.installedPart('cpu').id, 'cpu0');
  assert.equal(app.G.partInventory().length, 0);
  assert.equal(app.G.marketOffers().filter(x => x.sold).length, 0);
})();

console.log('Zarya OS 1.9: daily listings, inspection, ownership, resale, repair, FPS wear and reset tests passed.');
