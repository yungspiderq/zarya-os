/* ЗАРЯ OS 1.6 — service-contract and benchmark regression tests. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'service-center.js'), 'utf8');
function boot(opts = {}) {
  const data = opts.data || new Map();
  const paid = opts.paid || new Set();
  const levels = opts.levels || { cpu: 0, gpu: 0, ram: 0, ssd: 0 };
  const machine = {
    fps: 12 + (levels.gpu || 0) * 22 + (levels.cpu || 0) * 4 + (levels.ram || 0) * 3,
    latency: Math.max(0, 150 - (levels.cpu || 0) * 22 - (levels.ram || 0) * 17),
    bootSeconds: Math.max(5, 48 - (levels.ssd || 0) * 9),
    storageSpeed: [110, 450, 560, 3000, 3500][levels.ssd || 0] || 110
  };
  let earned = 0, resetCount = 0;
  const G = {
    money: () => earned,
    performance: () => machine,
    level: type => levels[type] || 0,
    systemHealth: () => ({
      requiredWatts: 170, suppliedWatts: 300,
      bootSeconds: machine.bootSeconds, storageSpeed: machine.storageSpeed
    }),
    awardServiceContract: (id, amount) => {
      if (paid.has(id)) return { ok: false, alreadyPaid: true, msg: 'Already paid' };
      paid.add(id);
      earned += amount;
      return { ok: true, reward: amount };
    },
    reset: () => { resetCount++; earned = 0; paid.clear(); }
  };
  const window = {
    Game: G, APPS: {}, APPICONS: {},
    dispatchEvent: () => {},
    UI: { toast: () => {} }
  };
  const localStorage = {
    getItem: key => data.get(key) || null,
    setItem: (key, val) => data.set(key, String(val)),
    removeItem: key => data.delete(key)
  };
  vm.runInNewContext(source, {
    window, localStorage, CustomEvent: class { constructor(type) { this.type = type; } },
    Date, Math, Set, JSON, Object, Array
  }, { filename: 'service-center.js' });
  return { G, data, paid, levels, earned: () => earned, resetCount: () => resetCount, window };
}
function expectOk(out, label) { assert.equal(out.ok, true, label + ': ' + out.msg); }
const correct = [
  ['svc-01', 'hdd', 'sata-ssd'], ['svc-02', 'psu', 'psu-new'],
  ['svc-03', 'slot', 'board'], ['svc-04', 'gpu', 'gpu-new'],
  ['svc-05', 'memory', 'ram-more'], ['svc-06', 'cooler', 'cooler-mount'],
  ['svc-07', 'sata-limit', 'nvme'], ['svc-08', 'power-budget', 'power-budget-fix']
];

(function testStateMachineAndPayouts() {
  const { G, earned } = boot();
  assert.equal(G.serviceCases().length, 8);
  assert.equal(G.serviceCases()[0].status, 'available');
  assert.equal(G.serviceCases()[1].status, 'available');
  assert.equal(G.serviceCases()[2].status, 'locked');
  assert.equal(G.serviceStart('svc-08').ok, false);
  assert.equal(G.serviceStart('invalid').ok, false);
  expectOk(G.serviceStart('svc-01'), 'start');
  assert.equal(G.serviceRepair('svc-01', 'sata-ssd').ok, false, 'repair cannot bypass diagnosis');
  assert.equal(G.serviceDiagnose('svc-01', 'cpu').ok, false);
  assert.equal(G.serviceProgress().mistakes, 1);
  assert.equal(G.serviceStart('svc-02').ok, false, 'only one active ticket at a time');
  expectOk(G.serviceDiagnose('svc-01', 'hdd'), 'diagnosis');
  assert.equal(G.serviceProgress().active.phase, 'repair');
  assert.equal(G.serviceRepair('svc-01', 'cpu').ok, false);
  expectOk(G.serviceRepair('svc-01', 'sata-ssd'), 'repair');
  assert.equal(G.serviceProgress().completed, 1);
  assert.equal(earned(), 110);
  assert.equal(G.serviceRepair('svc-01', 'sata-ssd').ok, false, 'cannot repeatedly claim reward');
  assert.equal(G.serviceCases()[2].status, 'available');
  for (const [id, diagnosis, fix] of correct.slice(1)) {
    expectOk(G.serviceStart(id), id + ' start');
    expectOk(G.serviceDiagnose(id, diagnosis), id + ' diagnose');
    expectOk(G.serviceRepair(id, fix), id + ' repair');
  }
  assert.equal(G.serviceProgress().completed, 8);
  assert.equal(earned(), 1670, 'every fixed ticket should pay exactly once');
})();

(function testPersistenceResumeCancellationAndReset() {
  const data = new Map(), paid = new Set();
  let runtime = boot({ data, paid });
  expectOk(runtime.G.serviceStart('svc-01'), 'begin before reboot');
  expectOk(runtime.G.serviceDiagnose('svc-01', 'hdd'), 'diagnose before reboot');
  assert.ok(data.has('zarya.service.v1'));
  runtime = boot({ data, paid });
  assert.equal(runtime.G.serviceProgress().active.phase, 'repair');
  expectOk(runtime.G.serviceCancel(), 'cancel');
  assert.equal(runtime.G.serviceProgress().active, null);
  assert.equal(runtime.G.serviceProgress().completed, 0);
  expectOk(runtime.G.serviceStart('svc-01'), 'restart');
  expectOk(runtime.G.serviceDiagnose('svc-01', 'hdd'), 're-diagnose');
  expectOk(runtime.G.serviceRepair('svc-01', 'sata-ssd'), 'finish');
  runtime = boot({ data, paid });
  assert.equal(runtime.G.serviceProgress().completed, 1);
  assert.equal(runtime.G.serviceStart('svc-01').ok, false);
  assert.equal(runtime.G.benchmarkRecord('gaming'), null);
  expectOk(runtime.G.benchmarkSave('gaming'), 'save benchmark');
  assert.ok(runtime.G.benchmarkRecord('gaming').score > 0);
  runtime.G.reset();
  assert.equal(runtime.G.serviceProgress().completed, 0);
  assert.equal(runtime.G.benchmarkRecord('gaming'), null);
  assert.equal(runtime.resetCount(), 1);
})();

(function testBenchmarksTrackActualInstalledComponents() {
  const basic = boot();
  const upgraded = boot({ levels: { cpu: 3, gpu: 3, ram: 4, ssd: 4 } });
  assert.equal(basic.G.benchmarkModes().length, 3);
  for (const mode of ['gaming', 'office', 'disk']) {
    const low = basic.G.benchmarkResult(mode);
    const high = upgraded.G.benchmarkResult(mode);
    assert.ok(high.score > low.score, mode + ' score must increase with better installed parts');
    expectOk(upgraded.G.benchmarkSave(mode), mode);
    assert.equal(upgraded.G.benchmarkRecord(mode).score, high.score);
  }
  assert.equal(basic.G.benchmarkResult('invalid'), null);
  assert.equal(basic.G.benchmarkSave('invalid').ok, false);
  assert.ok(upgraded.window.APPS.service);
  assert.ok(upgraded.window.APPS.benchmark);
})();

console.log('Service desk progression, one-time payouts, persistence and benchmark tests passed.');
