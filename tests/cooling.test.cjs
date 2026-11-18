/* Zarya OS 1.8: cooler compatibility, thermal wear, game saves and maintenance. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const hardware = fs.readFileSync(path.join(__dirname, '..', 'js/hardware.js'), 'utf8');
const cooling = fs.readFileSync(path.join(__dirname, '..', 'js/cooling.js'), 'utf8');
function boot(opts = {}) {
  const data = opts.data || new Map();
  let balance = opts.money === undefined ? 8000 : opts.money;
  let resets = 0, benchmarks = 0;
  const G = {
    money: () => balance,
    level: () => 0,
    shop: () => [{ id: 'cpu', levels: ['none'] }, { id: 'proxy', levels: ['off'] }],
    buy: id => ({ ok: true, msg: id }),
    spendFunds: n => {
      if (!Number.isSafeInteger(n) || n < 0 || n > balance) return { ok: false, msg: 'funds' };
      balance -= n;
      return { ok: true };
    },
    benchmarkSave: mode => {
      if (mode !== 'gaming') return { ok: false, msg: 'invalid mode' };
      benchmarks++;
      return { ok: true };
    },
    reset: () => { resets++; balance = 0; }
  };
  const eventNames = [];
  const window = {
    Game: G, APPICONS: {}, APPS: {},
    dispatchEvent: e => eventNames.push(e.type)
  };
  const localStorage = {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  const context = {
    window, localStorage, CustomEvent: class { constructor(type) { this.type = type; } },
    Math, JSON, Date, Object, Number, Set, Array
  };
  vm.runInNewContext(hardware, context, { filename: 'hardware.js' });
  vm.runInNewContext(cooling, context, { filename: 'cooling.js' });
  return { G, data, eventNames, balance: () => balance, resets: () => resets, benchmarks: () => benchmarks };
}

(function testNewStockAndInventory() {
  const { G } = boot();
  assert.equal(G.partsCatalog().length, 34);
  assert.equal(G.partsCatalog('cooler').length, 5);
  assert.equal(G.installedPart('cooler').id, 'cooler0');
  assert.equal(G.coolingStatus().dust, 18);
  assert.equal(G.coolingStatus().paste, 90);
  assert.ok(G.coolingStatus().cpuTemp > 20);
  assert.equal(G.installPart('cooler1').ok, false);
  assert.equal(G.completeCoolerChange('cooler1', 5).ok, false, 'must buy first');
  assert.equal(G.completeDustCleaning(5).ok, false, 'cannot skip dust spots');
  assert.equal(G.coolingWear(-1, 0).ok, false);
  assert.equal(G.coolingWear(9, 0).ok, false);
})();

(function testCoolerInstallRequiresFullMiniGame() {
  const { G } = boot();
  assert.equal(G.buyPart('cooler2').ok, true);
  assert.equal(G.installedPart('cooler').id, 'cooler0', 'buying never auto-installs');
  assert.equal(G.partInventory('cooler').length, 1);
  assert.equal(G.installPart('cooler2').ok, false, 'normal inventory install is blocked');
  assert.equal(G.completeCoolerChange('cooler2', 3).ok, false, 'cannot skip install stages');
  assert.equal(G.installedPart('cooler').id, 'cooler0');
  const done = G.completeCoolerChange('cooler2', 5);
  assert.equal(done.ok, true, done.msg);
  assert.equal(G.installedPart('cooler').id, 'cooler2');
  assert.equal(G.partInventory('cooler')[0].id, 'cooler0');
  assert.equal(G.coolingStatus().paste, 100);
  assert.equal(G.coolingStatus().swaps, 1);
  assert.equal(G.completeCoolerChange('cooler2', 5).ok, false, 'cannot repeat without an owned spare');
  assert.equal(G.completeCoolerChange('gpu1', 5).ok, false);
  assert.equal(G.completeCoolerChange('cooler0', 5).ok, true, 'old cooler can be reinstalled');
})();

(function testDustThrottleAndRepair() {
  const { G } = boot();
  assert.equal(G.buyPart('psu2').ok, true);
  assert.equal(G.installPart('psu2').ok, true);
  assert.equal(G.buyPart('gpu4').ok, true);
  assert.equal(G.installPart('gpu4').ok, true);
  assert.equal(G.buyPart('cpu4').ok, true);
  assert.equal(G.installCpuFromWorkbench('cpu4').ok, true);
  const before = G.performance().fps;
  for (let i = 0; i < 9; i++) assert.equal(G.coolingWear(8, 5).ok, true);
  const hot = G.coolingStatus();
  assert.ok(hot.cpuTemp >= 78, 'stock cooler should struggle with high-end CPU when dirty');
  assert.ok(hot.fpsPenalty > 0, 'overheating reduces simulated FPS');
  assert.ok(G.performance().fps < before, 'simulated throttling applies to arcade and benchmark FPS');
  assert.equal(G.completeDustCleaning(6).ok, true);
  assert.equal(G.coolingStatus().dust, 0);
  assert.equal(G.coolingStatus().cleanings, 1);
  assert.equal(G.buyPart('cooler4').ok, true);
  assert.equal(G.completeCoolerChange('cooler4', 5).ok, true);
  assert.equal(G.coolingStatus().paste, 100);
  assert.ok(G.coolingStatus().cpuTemp < hot.cpuTemp, 'cooler lowers simulated temperature');
  assert.equal(G.coolingStatus().fpsPenalty, 0);
})();

(function testBenchmarkWearAndPersistence() {
  const data = new Map();
  let runtime = boot({ data });
  const { G } = runtime;
  const before = G.coolingStatus().dust;
  assert.equal(G.benchmarkSave('invalid').ok, false);
  assert.equal(G.coolingStatus().dust, before, 'failed benchmark does not add wear');
  assert.equal(G.benchmarkSave('gaming').ok, true);
  assert.equal(G.coolingStatus().dust, before + 4);
  assert.equal(G.coolingStatus().paste, 89);
  G.awardArcade('snake', 5);
  assert.equal(G.coolingStatus().dust, before + 5);
  assert.equal(G.buyPart('cooler1').ok, true);
  assert.equal(G.completeCoolerChange('cooler1', 5).ok, true);
  runtime = boot({ data, money: 0 });
  assert.equal(runtime.G.installedPart('cooler').id, 'cooler1');
  assert.equal(runtime.G.coolingStatus().dust, before + 5);
  assert.equal(runtime.G.coolingStatus().swaps, 1);
  runtime.G.reset();
  assert.equal(runtime.resets(), 1);
  assert.equal(runtime.G.coolingStatus().dust, 18);
  assert.equal(runtime.G.installedPart('cooler').id, 'cooler0');
  assert.equal(runtime.G.partInventory().length, 0);
  assert.ok(runtime.eventNames.includes('zarya:cooling'));
})();

console.log('Zarya OS 1.8 cooling, mini-game progression, thermal throttle, saves and reset tests passed.');
