/* ЗАРЯ OS 1.8 — температуры, пыль и обслуживание виртуального компьютера. */
(function () {
  'use strict';
  const G = window.Game;
  const KEY = 'zarya.cooling.v1';
  const fresh = function () {
    return { version: 1, dust: 18, paste: 90, cleanings: 0, swaps: 0, lastService: 0 };
  };
  let state = fresh();
  try {
    const old = JSON.parse(localStorage.getItem(KEY));
    if (old && old.version === 1) state = Object.assign(fresh(), old);
  } catch (e) { /* Damaged or missing local save: use defaults. */ }

  function clamp(value, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;
  }
  state.dust = clamp(state.dust, 0, 100);
  state.paste = clamp(state.paste, 0, 100);
  state.cleanings = clamp(state.cleanings, 0, 100000);
  state.swaps = clamp(state.swaps, 0, 100000);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zarya:cooling'));
  }

  G.coolingStatus = function () {
    const cpu = G.installedPart('cpu');
    const gpu = G.installedPart('gpu');
    const cooler = G.installedPart('cooler');
    const cpuTemp = clamp(
      38 + cpu.power * 7 + gpu.power * 2 + state.dust * 0.25 +
      (100 - state.paste) * 0.19 - cooler.power * 8, 22, 110);
    const gpuTemp = clamp(40 + gpu.power * 9 + state.dust * 0.18, 25, 105);
    const over = Math.max(0, cpuTemp - 78, gpuTemp - 80);
    const penalty = Math.min(48, Math.round(over * 2.6));
    const condition = penalty > 0 ? 'Перегрев: игровой троттлинг' :
      Math.max(cpuTemp, gpuTemp) >= 69 ? 'Под нагрузкой: тепло' : 'Температуры в норме';
    return {
      cpuTemp: cpuTemp,
      gpuTemp: gpuTemp,
      dust: state.dust,
      paste: state.paste,
      cooler: cooler.name,
      coolerPower: cooler.power,
      fpsPenalty: penalty,
      condition: condition,
      cleanings: state.cleanings,
      swaps: state.swaps
    };
  };

  G.coolingWear = function (dust, paste) {
    if (!Number.isSafeInteger(dust) || dust < 0 || dust > 8 ||
        !Number.isSafeInteger(paste) || paste < 0 || paste > 5) {
      return { ok: false, msg: 'Недопустимый износ.' };
    }
    state.dust = clamp(state.dust + dust, 0, 100);
    state.paste = clamp(state.paste - paste, 0, 100);
    save();
    return { ok: true };
  };

  G.completeDustCleaning = function (collected) {
    if (collected !== 6) return { ok: false, msg: 'Нужно очистить все шесть участков.' };
    state.dust = 0;
    state.cleanings++;
    state.lastService = Date.now();
    save();
    return { ok: true, msg: 'Виртуальный ПК очищен от пыли. Температуры снижены.' };
  };

  G.completeCoolerChange = function (id, completedSteps) {
    if (completedSteps !== 5) return { ok: false, msg: 'Не все этапы установки кулера выполнены.' };
    const item = G.partById(id);
    if (!item || item.type !== 'cooler') return { ok: false, msg: 'Выбран неверный компонент.' };
    const result = G.installCoolerFromWorkshop(id);
    if (!result.ok) return result;
    state.paste = 100;
    state.swaps++;
    state.lastService = Date.now();
    save();
    return { ok: true, msg: 'Установлен ' + item.name + '. Термопаста обновлена.' };
  };

  const previousPerformance = G.performance.bind(G);
  G.performance = function () {
    const base = previousPerformance();
    const cooling = G.coolingStatus();
    if (!cooling.fpsPenalty) return base;
    return Object.assign({}, base, {
      fps: Math.max(8, base.fps - cooling.fpsPenalty),
      latency: base.latency + Math.round(cooling.fpsPenalty * 1.4),
      tier: 'Перегрев / игровой троттлинг'
    });
  };

  if (typeof G.benchmarkSave === 'function') {
    const benchmarkSave = G.benchmarkSave.bind(G);
    G.benchmarkSave = function (mode) {
      const output = benchmarkSave(mode);
      if (output && output.ok) G.coolingWear(4, 1);
      return output;
    };
  }
  if (typeof G.awardArcade === 'function') {
    const arcadeReward = G.awardArcade.bind(G);
    G.awardArcade = function (mode, score) {
      const output = arcadeReward(mode, score);
      if ((mode === 'snake' || mode === 'reaction') && Number(score) > 0) G.coolingWear(1, 0);
      return output;
    };
  }
  const originalReset = G.reset.bind(G);
  G.reset = function () {
    state = fresh();
    try { localStorage.removeItem(KEY); } catch (e) {}
    originalReset();
    save();
  };
  save();

  function node(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  const CoolApp = (function () {
    let root = null, api = null, update = null;
    let mode = 'dust', cleaned = new Set(), target = null, stage = -1;
    const actions = ['unlock', 'wipe', 'paste', 'mount', 'secure'];
    const instructions = [
      'Нажми на крепление старого кулера.',
      'Очисти виртуальный процессор от старой термопасты.',
      'Нанеси новую термопасту на виртуальный процессор.',
      'Помести купленный кулер на процессор.',
      'Закрепи кулер и проверь температурный режим.'
    ];
    function toast(r) {
      if (window.UI && window.UI.toast) window.UI.toast(r.msg, r.ok ? 'ok' : 'err');
    }
    function summary() {
      if (!root || !root.isConnected) return;
      const c = G.coolingStatus(), perf = G.performance();
      function txt(key, value) { root.querySelector('[data-cool="' + key + '"]').textContent = value; }
      txt('cpu', c.cpuTemp + ' °C');
      txt('gpu', c.gpuTemp + ' °C');
      txt('dust', c.dust + '%');
      txt('paste', c.paste + '%');
      txt('fps', perf.fps + ' FPS');
      txt('condition', c.condition);
      txt('installed', c.cooler);
      txt('cleanings', String(c.cleanings));
      txt('swaps', String(c.swaps));
      root.querySelector('[data-cool="cpu-bar"]').style.width = Math.min(100,c.cpuTemp) + '%';
      root.querySelector('[data-cool="dust-bar"]').style.width = c.dust + '%';
      root.querySelector('[data-cool="cpu-bar"]').classList.toggle('hot', c.cpuTemp >= 78);
      root.querySelector('[data-cool="dust-bar"]').classList.toggle('hot', c.dust >= 65);
    }
    function hint(msg, error) {
      if (!root) return;
      const h = root.querySelector('[data-cool="hint"]');
      h.textContent = msg;
      h.classList.toggle('bad', !!error);
    }
    function scene() {
      if (!root || !root.isConnected) return;
      root.querySelectorAll('[data-cool-mode]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-cool-mode') === mode);
      });
      const container = root.querySelector('[data-cool="work"]');
      container.replaceChildren();
      if (mode === 'dust') drawDust(container);
      else drawCooler(container);
    }
    function drawDust(parent) {
      const card = node('<section class="cool-work-panel"><h3>Мини-игра: очистка от пыли</h3>' +
        '<p class="muted">Найди и очисти шесть загрязнённых мест внутри виртуального компьютера.</p>' +
        '<div class="cool-board"><div class="cool-board-chip">CPU</div>' +
        '<div class="cool-board-gpu">GPU</div><div class="cool-board-memory">RAM</div>' +
        '<div class="cool-board-fan"></div><div class="cool-dust-spots"></div></div>' +
        '<div class="cool-actionbar"><strong data-clean-progress></strong>' +
        '<button class="btn" type="button" data-clean-restart>Заново</button></div></section>');
      const spots = card.querySelector('.cool-dust-spots');
      for (let i = 0; i < 6; i++) {
        const b = node('<button type="button" class="cool-spot"><span>✦</span></button>');
        b.classList.add('spot-' + (i + 1));
        b.setAttribute('aria-label', 'Очистить участок ' + (i + 1));
        const done = cleaned.has(i);
        b.classList.toggle('cleaned', done);
        b.disabled = done;
        b.addEventListener('click', function () {
          if (cleaned.has(i)) return;
          cleaned.add(i);
          b.disabled = true;
          b.classList.add('cleaned');
          card.querySelector('[data-clean-progress]').textContent = 'Участки: ' + cleaned.size + ' / 6';
          if (cleaned.size === 6) {
            const result = G.completeDustCleaning(cleaned.size);
            hint(result.msg, !result.ok);
            toast(result);
          } else hint('Очищено ' + cleaned.size + ' из 6 участков. Продолжай.');
        });
        spots.appendChild(b);
      }
      card.querySelector('[data-clean-progress]').textContent = 'Участки: ' + cleaned.size + ' / 6';
      card.querySelector('[data-clean-restart]').addEventListener('click', function () {
        cleaned = new Set();
        scene();
        hint('Очисти шесть пыльных участков.');
      });
      parent.appendChild(card);
    }
    function drawCooler(parent) {
      const panel = node('<section class="cool-work-panel"><h3>Мини-игра: замена кулера</h3>' +
        '<p class="muted">Купленный кулер можно установить только после всех пяти действий.</p>' +
        '<div class="cool-options"></div><div class="cool-swap-board" hidden>' +
        '<div class="cool-motherboard"><div class="cool-socket"><span>CPU</span></div>' +
        '<div class="cool-heatsink">FAN</div><div class="cool-paste-dot"></div></div>' +
        '<div class="cool-step-card"><span data-step-name></span><button type="button" class="btn btn--primary" data-step-action></button>' +
        '<div class="cool-stage-indicators"></div></div></div>' +
        '<div class="cool-actionbar"><span data-cool-selected></span><button type="button" class="btn" data-cool-cancel>Отменить замену</button></div></section>');
      const choices = panel.querySelector('.cool-options');
      const parts = G.partInventory('cooler');
      if (!parts.length && stage < 0) {
        choices.appendChild(node('<p class="parts-empty">В инвентаре нет запасных кулеров. Купи модель в магазине комплектующих.</p>'));
      }
      parts.forEach(function (p) {
        const b = node('<button type="button" class="cool-pick"><strong></strong><span></span></button>');
        b.querySelector('strong').textContent = p.name;
        b.querySelector('span').textContent = p.detail;
        b.classList.toggle('active', p.id === target);
        b.disabled = stage >= 0;
        b.addEventListener('click', function () {
          target = p.id;
          stage = 0;
          scene();
          hint(instructions[0]);
        });
        choices.appendChild(b);
      });
      const board = panel.querySelector('.cool-swap-board');
      board.hidden = stage < 0;
      choices.hidden = stage >= 0;
      panel.querySelector('[data-cool-selected]').textContent = target ? 'Новый кулер: ' + (G.partById(target) || {}).name : 'Кулер не выбран';
      if (stage >= 0) {
        const current = actions[stage];
        panel.querySelector('[data-step-name]').textContent = 'Шаг ' + (stage+1) + '/5. ' + instructions[stage];
        const btn = panel.querySelector('[data-step-action]');
        btn.textContent = ({
          unlock: 'Снять старый кулер', wipe: 'Очистить CPU',
          paste: 'Нанести термопасту', mount: 'Поставить новый кулер',
          secure: 'Закрепить и проверить'
        })[current];
        board.setAttribute('data-step', String(stage));
        const track = panel.querySelector('.cool-stage-indicators');
        actions.forEach(function (a, i) {
          const mark = node('<span></span>');
          mark.classList.toggle('done', i < stage);
          mark.classList.toggle('current', i === stage);
          track.appendChild(mark);
        });
        btn.addEventListener('click', function () {
          if (stage !== actions.indexOf(current)) return;
          if (stage === 4) {
            const res = G.completeCoolerChange(target,5);
            if (!res.ok) { hint(res.msg,true);toast(res);return; }
            toast(res);
            stage = -1;target = null;
            scene();hint('Кулер успешно установлен. Теперь можно проверить FPS в ЗАРЯ Bench.');
          } else {
            stage++;
            scene();
            hint(instructions[stage]);
          }
        });
      }
      panel.querySelector('[data-cool-cancel]').addEventListener('click', function () {
        stage = -1;target = null;scene();hint('Замена отменена. Установленный кулер не изменился.');
      });
      parent.appendChild(panel);
    }
    function mount(openApi) {
      api = openApi;
      cleaned = new Set(); stage = -1;
      root = node('<div class="app cool-app"><div class="app-head"><div><h2>Охлаждение ПК</h2>' +
        '<p class="muted">Игровые температуры · чистка пыли · замена кулера</p></div>' +
        '<button type="button" class="btn" data-cool="shop">Магазин</button></div>' +
        '<div class="cool-stat-grid">' +
        '<div><span>Процессор</span><strong data-cool="cpu"></strong></div>' +
        '<div><span>Видеокарта</span><strong data-cool="gpu"></strong></div>' +
        '<div><span>Пыль</span><strong data-cool="dust"></strong></div>' +
        '<div><span>Термопаста</span><strong data-cool="paste"></strong></div>' +
        '<div><span>Игровой FPS</span><strong data-cool="fps"></strong></div></div>' +
        '<div class="cool-bar"><span>Температура CPU</span><div><i data-cool="cpu-bar"></i></div></div>' +
        '<div class="cool-bar"><span>Пыль внутри ПК</span><div><i data-cool="dust-bar"></i></div></div>' +
        '<section class="cool-diagnosis"><strong data-cool="condition"></strong>' +
        '<p>Кулер: <span data-cool="installed"></span></p>' +
        '<small>Чисток: <b data-cool="cleanings"></b> · замен кулера: <b data-cool="swaps"></b></small></section>' +
        '<nav class="cool-tabs" aria-label="Выбери работу">' +
        '<button type="button" data-cool-mode="dust">Чистка пыли</button>' +
        '<button type="button" data-cool-mode="swap">Замена кулера</button></nav>' +
        '<div data-cool="work"></div><p class="cool-hint" data-cool="hint" role="status"></p>' +
        '<div class="pc-actions"><button type="button" class="btn" data-cool="pc">Мой ПК</button>' +
        '<button type="button" class="btn" data-cool="bench">ЗАРЯ Bench</button></div>' +
        '<p class="muted cool-disclaimer">Все температуры, пыль и FPS являются игровыми величинами. ' +
        'Никакие операции с реальным компьютером не выполняются.</p></div>');
      api.body.appendChild(root);
      root.querySelector('[data-cool="shop"]').addEventListener('click', function () { api.open('shop'); });
      root.querySelector('[data-cool="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-cool="bench"]').addEventListener('click', function () { api.open('benchmark'); });
      root.querySelectorAll('[data-cool-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
          mode = b.getAttribute('data-cool-mode');
          scene();
          hint(mode === 'dust' ? 'Найди все шесть пыльных участков.' : 'Выбери купленный кулер из инвентаря.');
        });
      });
      update = summary;
      window.addEventListener('zarya:cooling', update);
      window.addEventListener('zarya:hardware', update);
      summary();scene();
      hint(mode === 'dust' ? 'Найди все шесть пыльных участков.' : 'Выбери кулер в инвентаре.');
    }
    function close() {
      if (update) {
        window.removeEventListener('zarya:cooling', update);
        window.removeEventListener('zarya:hardware', update);
      }
      update = null;root = null;api = null;stage = -1;target = null;
    }
    function chooseCooler(id) {
      const exists=G.partInventory('cooler').some(function (p) { return p.id === id; });
      if (!exists) return;
      mode = 'swap';target = id;stage = 0;
      if (root && root.isConnected) { scene();hint(instructions[0]); }
    }
    return { mount: mount, close: close, chooseCooler: chooseCooler };
  })();

  window.CoolingLab = { chooseCooler: CoolApp.chooseCooler };
  window.APPICONS.cooling = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect x="4" y="4" width="24" height="24" rx="5" fill="#23576e"/>' +
    '<circle cx="16" cy="16" r="10" fill="#6ab9d3"/>' +
    '<path d="M16 8c5 0 5 6 0 8c-3 1-5 5-1 7M8 17c1-5 7-4 8-1c1 4 7 5 8 1" fill="none" stroke="#104b65" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="16" cy="16" r="3" fill="#11475d"/></svg>';
  window.APPS.cooling = {
    name: 'Охлаждение ПК', icon: window.APPICONS.cooling,
    w: 900, h: 720,
    mount: CoolApp.mount, onClose: CoolApp.close
  };
})();