/* ЗАРЯ OS — виртуальное железо и две локальные мини-игры. */
(function () {
  'use strict';

  function make(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function money(n) {
    return Math.round(n).toLocaleString('ru-RU') + ' ₡';
  }

  const Computer = (function () {
    let root = null;
    let refresh = null;

    function render() {
      if (!root || !root.isConnected) return;
      const G = window.Game;
      const perf = G.performance();
      root.querySelector('[data-pc="fps"]').textContent = perf.fps + ' FPS';
      root.querySelector('[data-pc="status"]').textContent = perf.tier;
      root.querySelector('[data-pc="balance"]').textContent = money(G.money());
      root.querySelector('[data-pc="meter"]').style.width = Math.round(perf.fps / 120 * 100) + '%';
      root.querySelector('[data-pc="warning"]').textContent = perf.fps < 35
        ? 'Слабое железо: в Аркаде будут заметны пропуски кадров и задержка реакции.'
        : perf.fps < 65
          ? 'Игры уже работают лучше, но в напряжённые моменты возможны просадки.'
          : 'Хорошая конфигурация: плавная графика и быстрая реакция в мини-играх.';
      const grid = root.querySelector('[data-pc="parts"]');
      grid.replaceChildren();
      G.shop().filter(function (item) {
        return ['cpu', 'gpu', 'ram'].indexOf(item.id) >= 0;
      }).forEach(function (item) {
        const lvl = G.level(item.id);
        const done = lvl >= item.max;
        const card = make(
          '<article class="pc-part">' +
          '  <div class="pc-part-kicker"></div>' +
          '  <h3 class="pc-part-model"></h3>' +
          '  <p class="muted pc-part-next"></p>' +
          '  <div class="pc-part-footer"><span class="pc-part-price"></span><button class="btn btn--primary btn--sm" type="button"></button></div>' +
          '</article>'
        );
        card.querySelector('.pc-part-kicker').textContent = item.name;
        card.querySelector('.pc-part-model').textContent = item.levels[lvl];
        card.querySelector('.pc-part-next').textContent = done
          ? 'Лучший доступный компонент установлен.'
          : 'Следующий: ' + item.levels[lvl + 1];
        card.querySelector('.pc-part-price').textContent = done ? 'Максимум' : money(item.costs[lvl]);
        const btn = card.querySelector('button');
        btn.textContent = done ? 'Установлено' : 'Купить';
        btn.disabled = done;
        btn.addEventListener('click', function () {
          const result = G.buy(item.id);
          window.UI.toast(result.msg, result.ok ? 'ok' : 'err');
          render();
        });
        grid.appendChild(card);
      });
    }

    function mount(api) {
      root = make(
        '<div class="app pc-app">' +
        ' <div class="app-head"><div><h2>Мой компьютер</h2><p class="muted">Виртуальный ПК · реальные названия комплектующих</p></div>' +
        ' <div class="balance"><span>Баланс</span><b data-pc="balance"></b></div></div>' +
        ' <section class="pc-overview"><div><span class="pc-eyebrow">ИГРОВОЙ БЕНЧМАРК</span>' +
        ' <strong data-pc="fps"></strong><p data-pc="status"></p></div>' +
        ' <div class="pc-chip-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>' +
        ' <div class="pc-fps-bar"><i data-pc="meter"></i></div>' +
        ' <p class="pc-warning" data-pc="warning"></p>' +
        ' <h3 class="pc-section-title">Установленные комплектующие</h3>' +
        ' <div class="pc-parts" data-pc="parts"></div>' +
        ' <div class="pc-actions"><button type="button" class="btn btn--primary" data-pc="arcade">Запустить Аркаду</button>' +
        ' <button type="button" class="btn" data-pc="shop">Магазин</button></div>' +
        ' <p class="muted pc-disclaimer">Модели комплектующих настоящие, цены и FPS — условная игровая симуляция. ' +
        'Обновления железа меняют только ЗАРЯ OS, а не ваш реальный компьютер.</p>' +
        '</div>'
      );
      api.body.appendChild(root);
      root.querySelector('[data-pc="arcade"]').addEventListener('click', function () { api.open('arcade'); });
      root.querySelector('[data-pc="shop"]').addEventListener('click', function () { api.open('shop'); });
      refresh = render;
      window.addEventListener('zarya:game', refresh);
      render();
    }

    function close() {
      if (refresh) window.removeEventListener('zarya:game', refresh);
      refresh = null;
      root = null;
    }

    return { mount: mount, close: close };
  })();

  const Arcade = (function () {
    let root = null;
    let api = null;
    let canvas = null;
    let ctx = null;
    let frame = 0;
    let running = false;
    let mode = 'snake';
    let lastDraw = 0;
    let lastStep = 0;
    let score = 0;
    let snake = [];
    let food = null;
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let phase = 'wait';
    let signalAt = 0;
    let nextSignal = 0;
    let rounds = 0;
    const W = 480;
    const H = 288;
    const CELL = 24;
    const COLS = W / CELL;
    const ROWS = H / CELL;

    function info(text) {
      if (root) root.querySelector('[data-arcade="info"]').textContent = text;
    }

    function hud() {
      if (!root) return;
      root.querySelector('[data-arcade="score"]').textContent = String(score);
      root.querySelector('[data-arcade="best"]').textContent = String(window.Game.arcadeBest(mode));
      root.querySelector('[data-arcade="fps"]').textContent = window.Game.performance().fps + ' FPS';
    }

    function drawBackground() {
      ctx.fillStyle = '#07101f';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(125,172,215,.11)';
      ctx.lineWidth = 1;
      for (let x = CELL; x < W; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = CELL; y < H; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    function randomFood() {
      const free = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!snake.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y });
        }
      }
      return free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function drawSnake() {
      drawBackground();
      if (food) {
        ctx.fillStyle = '#ffc857';
        ctx.fillRect(food.x * CELL + 5, food.y * CELL + 5, CELL - 10, CELL - 10);
      }
      snake.forEach(function (s, i) {
        ctx.fillStyle = i ? '#31b9ad' : '#76f0d2';
        ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
      });
    }

    function drawReaction() {
      drawBackground();
      const ready = phase === 'go';
      ctx.fillStyle = ready ? '#217a5c' : '#2b3e5e';
      ctx.fillRect(64, 55, W - 128, H - 110);
      ctx.strokeStyle = ready ? '#76f0d2' : '#6893cd';
      ctx.lineWidth = 3;
      ctx.strokeRect(64, 55, W - 128, H - 110);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 27px Segoe UI, sans-serif';
      ctx.fillText(ready ? 'ЖМИ СЕЙЧАС!' : 'ЖДИ СИГНАЛА', W / 2, 128);
      ctx.font = '15px Segoe UI, sans-serif';
      ctx.fillText('Раунд ' + Math.min(rounds + 1, 5) + ' / 5', W / 2, 159);
      ctx.textAlign = 'left';
    }

    function finish() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      const result = window.Game.awardArcade(mode, score);
      hud();
      info('Игра окончена. Счёт: ' + score + '. ' + result.msg);
      window.UI.toast(result.msg, result.ok ? 'ok' : 'info');
      root.querySelector('[data-arcade="restart"]').textContent = 'Играть ещё';
    }

    function stepSnake() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const grow = !!food && head.x === food.x && head.y === food.y;
      const body = grow ? snake : snake.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
          body.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        finish();
        return;
      }
      snake.unshift(head);
      if (grow) {
        score += 5;
        food = randomFood();
        if (!food) { finish(); return; }
      } else {
        snake.pop();
      }
      hud();
    }

    function loop(ts) {
      if (!running || !root || !root.isConnected) return;
      const perf = window.Game.performance();
      const minFrame = 1000 / perf.fps;
      if (ts - lastDraw < minFrame) {
        frame = requestAnimationFrame(loop);
        return;
      }
      lastDraw = ts;
      if (mode === 'snake') {
        // Логика движется по общему такту; слабая видеокарта пропускает отрисовку.
        if (ts - lastStep >= 150) {
          lastStep = ts;
          stepSnake();
        }
        if (running) drawSnake();
      } else {
        if (phase === 'wait' && ts >= nextSignal) {
          phase = 'go';
          signalAt = ts;
        }
        drawReaction();
      }
      if (running) frame = requestAnimationFrame(loop);
    }

    function start(kind) {
      if (frame) cancelAnimationFrame(frame);
      mode = kind;
      score = 0;
      rounds = 0;
      phase = 'wait';
      running = true;
      lastDraw = 0;
      lastStep = 0;
      snake = [{ x: 7, y: 6 }, { x: 6, y: 6 }, { x: 5, y: 6 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      food = randomFood();
      nextSignal = performance.now() + 900 + Math.random() * 1800;
      root.querySelector('[data-arcade="restart"]').textContent = 'Начать заново';
      root.querySelectorAll('[data-game]').forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-game') === kind);
      });
      root.querySelector('[data-arcade="controls"]').hidden = kind !== 'snake';
      info(kind === 'snake'
        ? 'Змейка: собирай жёлтые пиксели, не касайся стен и хвоста. Стрелки или WASD.'
        : 'Реакция: дождись зелёного сигнала и нажми на поле. Пять раундов.');
      hud();
      frame = requestAnimationFrame(loop);
    }

    function changeDir(dx, dy) {
      if (!running || mode !== 'snake') return;
      if (dir.x === -dx && dir.y === -dy) return;
      nextDir = { x: dx, y: dy };
    }

    function keydown(e) {
      if (!running || !api || !api.el.classList.contains('is-active')) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const dirs = {
        ArrowUp: [0, -1], KeyW: [0, -1],
        ArrowDown: [0, 1], KeyS: [0, 1],
        ArrowLeft: [-1, 0], KeyA: [-1, 0],
        ArrowRight: [1, 0], KeyD: [1, 0]
      };
      const key = e.key.length === 1 ? 'Key' + e.key.toUpperCase() : e.key;
      if (mode === 'snake' && dirs[key]) {
        e.preventDefault();
        changeDir(dirs[key][0], dirs[key][1]);
      }
      if (mode === 'reaction' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        react();
      }
    }

    function react() {
      if (!running || mode !== 'reaction') return;
      if (phase !== 'go') {
        score = Math.max(0, score - 2);
        nextSignal = performance.now() + 1000 + Math.random() * 1400;
        info('Рано! −2 очка. Дождись зелёного сигнала.');
        hud();
        return;
      }
      const delay = window.Game.performance().latency;
      const elapsed = Math.round(performance.now() - signalAt + delay);
      score += Math.max(1, Math.round((750 - elapsed) / 70));
      rounds++;
      if (rounds >= 5) {
        finish();
        return;
      }
      phase = 'wait';
      nextSignal = performance.now() + 900 + Math.random() * 1700;
      info('Отклик: ' + elapsed + ' мс (включая задержку железа). Следующий раунд.');
      hud();
    }

    function mount(openApi) {
      api = openApi;
      root = make(
        '<div class="app arcade-app">' +
        ' <div class="app-head"><div><h2>Аркада</h2><p class="muted">Локальные мини-игры · заработай кредиты на железо</p></div>' +
        ' <button type="button" class="btn" data-arcade="pc">Мой ПК</button></div>' +
        ' <div class="arcade-picker"><button type="button" data-game="snake">Пиксельная змейка</button>' +
        ' <button type="button" data-game="reaction">Тест реакции</button></div>' +
        ' <div class="arcade-hud"><span>Очки: <b data-arcade="score">0</b></span>' +
        ' <span>Рекорд: <b data-arcade="best">0</b></span>' +
        ' <span>Игровой FPS: <b data-arcade="fps">12 FPS</b></span></div>' +
        ' <canvas class="arcade-canvas" width="480" height="288" role="img" aria-label="Поле мини-игры"></canvas>' +
        ' <p class="arcade-info" data-arcade="info" role="status"></p>' +
        ' <div class="arcade-controls" data-arcade="controls"><button type="button" data-dir="up">↑</button>' +
        ' <div><button type="button" data-dir="left">←</button><button type="button" data-dir="down">↓</button>' +
        ' <button type="button" data-dir="right">→</button></div></div>' +
        ' <div class="pc-actions"><button type="button" class="btn btn--primary" data-arcade="restart">Начать заново</button>' +
        ' <button type="button" class="btn" data-arcade="stop">Остановить</button></div>' +
        ' <p class="muted arcade-footer">При слабой видеокарте симулируются пропуски кадров, а при слабом CPU и ОЗУ — задержка отклика. ' +
        'Награда зависит от очков; между выплатами в каждой игре действует пауза 60 секунд.</p>' +
        '</div>'
      );
      api.body.appendChild(root);
      canvas = root.querySelector('canvas');
      ctx = canvas.getContext('2d');
      root.querySelectorAll('[data-game]').forEach(function (b) {
        b.addEventListener('click', function () { start(b.getAttribute('data-game')); });
      });
      root.querySelector('[data-arcade="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-arcade="restart"]').addEventListener('click', function () { start(mode); });
      root.querySelector('[data-arcade="stop"]').addEventListener('click', function () {
        running = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        info('Игра остановлена без выплаты. Выбери мини-игру или начни заново.');
      });
      root.querySelectorAll('[data-dir]').forEach(function (b) {
        b.addEventListener('click', function () {
          const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[b.getAttribute('data-dir')];
          changeDir(v[0], v[1]);
        });
      });
      canvas.addEventListener('click', react);
      document.addEventListener('keydown', keydown);
      start('snake');
    }

    function close() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      document.removeEventListener('keydown', keydown);
      root = null;
      api = null;
      ctx = null;
      canvas = null;
    }

    return { mount: mount, close: close };
  })();

  window.APPS.pc = {
    name: 'Мой ПК',
    icon: window.APPICONS.about,
    w: 790, h: 580,
    mount: Computer.mount,
    onClose: Computer.close
  };
  window.APPS.arcade = {
    name: 'Аркада',
    icon: window.APPICONS.game,
    w: 700, h: 650,
    mount: Arcade.mount,
    onClose: Arcade.close
  };
})();