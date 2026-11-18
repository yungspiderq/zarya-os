/* Unit tests for Zarya OS virtual component store, no dependencies needed. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'hardware.js'), 'utf8');

function boot(opts = {}) {
  const data = opts.data || new Map();
  const legacyLevel = opts.legacyLevel || 0;
  const moneyStart = opts.money === undefined ? 800 : opts.money;
  let balance = moneyStart;
  let resetCount = 0;
  const events = [];
  const localStorage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  const game = {
    money: () => balance,
    level: id => id === 'cpu' ? legacyLevel : 0,
    shop: () => [
      { id: 'cpu', costs: [120, 320], levels: ['1 ядро', '2 ядра'] },
      { id: 'proxy', costs: [160], levels: ['нет', '1 узел'] }
    ],
    buy: id => ({ ok: true, msg: 'software: ' + id }),
    spendFunds: amount => {
      if (!Number.isSafeInteger(amount) || amount < 0 || balance < amount) {
        return { ok: false, msg: 'Insufficient balance' };
      }
      balance -= amount;
      return { ok: true };
    },
    reset: () => { resetCount++; balance = 0; }
  };
  const window = { Game: game, dispatchEvent: ev => events.push(ev.type) };
  vm.runInNewContext(source, {
    window,
    localStorage,
    CustomEvent: class { constructor(type) { this.type = type; } },
    Date,
    Math,
    Number,
    JSON,
    Array,
    Object,
    Set
  }, { filename: 'hardware.js' });
  return { G: game, data, events, balance: () => balance, resetCount: () => resetCount };
}

(function testFreshSaveAndCatalog() {
  const { G } = boot();
  assert.equal(G.installedPart('cpu').id, 'cpu0');
  assert.equal(G.installedPart('gpu').id, 'gpu0');
  assert.equal(G.installedPart('ram').id, 'ram0');
  assert.equal(G.partsCatalog('cpu').length, 5);
  assert.equal(G.partsCatalog().length, 15);
  assert.equal(G.shop().length, 1);
  assert.equal(G.shop()[0].id, 'proxy');
  assert.equal(G.level('cpu'), 0);
  assert.equal(G.installPart('cpu1').ok, false);
  assert.equal(G.buyPart('unknown').ok, false);
  assert.equal(G.buyPart('cpu0').ok, false);
})();

(function testPurchaseNeverAutoInstallsAndUsesBothCurrencies() {
  const data = new Map();
  data.set('zarya.hardware.v1', JSON.stringify({ credits: 90, gpu: 0, ram: 0 }));
  const { G, balance } = boot({ money: 500, data });
  const buy = G.buyPart('cpu2');
  assert.equal(buy.ok, true);
  assert.equal(G.installedPart('cpu').id, 'cpu0', 'buying cannot change installed CPU');
  assert.deepEqual(G.partInventory('cpu').map(p => p.id), ['cpu2']);
  assert.equal(G.hardwareCredits(), 0);
  assert.equal(balance(), 230, '360 total = 90 arcade credits + 270 currency');
  assert.equal(G.buyPart('cpu2').ok, false, 'buying duplicate parts is forbidden');
  assert.equal(G.installPart('cpu2').ok, false, 'CPU requires workbench');
  assert.equal(G.installCpuFromWorkbench('cpu2').ok, true);
  assert.equal(G.level('cpu'), 2);
  assert.equal(G.partInventory('cpu')[0].id, 'cpu0', 'previous CPU returns to inventory');
  assert.equal(G.installCpuFromWorkbench('cpu0').ok, true, 'reinstalling old CPU is supported');
  assert.equal(G.level('cpu'), 0);
  assert.equal(G.partInventory('cpu')[0].id, 'cpu2');
})();

(function testGPUAndRAMInventory() {
  const { G } = boot({ money: 600 });
  const before = G.performance().fps;
  assert.equal(G.buyPart('gpu2').ok, true);
  assert.equal(G.level('gpu'), 0);
  assert.equal(G.installPart('gpu2').ok, true);
  assert.equal(G.level('gpu'), 2);
  assert.ok(G.performance().fps > before);
  assert.equal(G.buyPart('ram2').ok, true);
  assert.equal(G.installPart('ram2').ok, true);
  assert.equal(G.installedPart('ram').id, 'ram2');
  assert.equal(G.partInventory('ram')[0].id, 'ram0');
  assert.equal(G.installPart('ram0').ok, true);
})();

(function testInsufficientFundsAndLegacyMigration() {
  const data = new Map();
  data.set('zarya.hardware.v1', JSON.stringify({
    credits: 17, gpu: 3, ram: 2, best: { snake: 20 }, paidAt: {}
  }));
  const { G, balance } = boot({ money: 0, data, legacyLevel: 4 });
  assert.equal(G.installedPart('cpu').id, 'cpu4');
  assert.equal(G.installedPart('gpu').id, 'gpu3');
  assert.equal(G.installedPart('ram').id, 'ram2');
  assert.equal(G.arcadeBest('snake'), 20);
  assert.equal(G.buyPart('gpu4').ok, false);
  assert.equal(balance(), 0);
  assert.equal(G.hardwareCredits(), 17);
  assert.equal(G.partInventory().length, 0);
})();

(function testPersistenceAndReset() {
  const data = new Map();
  let runtime = boot({ money: 400, data });
  assert.equal(runtime.G.buyPart('gpu1').ok, true);
  assert.equal(runtime.G.installPart('gpu1').ok, true);
  assert.equal(runtime.G.buyPart('cpu1').ok, true);
  const saved = data.get('zarya.components.v2');
  assert.ok(saved);
  runtime = boot({ money: 0, data });
  assert.equal(runtime.G.installedPart('gpu').id, 'gpu1');
  assert.equal(runtime.G.partInventory('cpu')[0].id, 'cpu1');
  assert.equal(runtime.G.installCpuFromWorkbench('cpu1').ok, true);
  runtime.G.reset();
  assert.equal(runtime.G.installedPart('gpu').id, 'gpu0');
  assert.equal(runtime.G.installedPart('cpu').id, 'cpu0');
  assert.equal(runtime.G.partInventory().length, 0);
  assert.equal(runtime.resetCount(), 1);
})();

console.log('All component store and CPU installation tests passed.');
