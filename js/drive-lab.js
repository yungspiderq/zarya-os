/* ЗАРЯ OS 1.5 — мини-игра установки накопителя. Все действия происходят в виртуальном ПК. */
(function () {
  'use strict';
  const G = window.Game;

  function element(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const DriveLab = (function () {
    let root = null;
    let api = null;
    let choice = null;
    let desired = null;
    let stage = -1;
    let unsubscribe = null;

    function current() {
      return choice ? G.partById(choice) : null;
    }
    function hint(text, isError) {
      if (!root) return;
      const h = root.querySelector('[data-dl="hint"]');
      h.textContent = text;
      h.classList.toggle('is-error', !!isError);
    }
    function stageText() {
      const p = current();
      if (!p) return 'Купи накопитель и выбери его в инвентаре.';
      const slot = p.interface === 'M.2' ? 'разъём M.2' : 'разъём SATA';
      return [
        'Выключи виртуальный ПК кнопкой питания.',
        'Найди на материнской плате ' + slot + '.',
        'Возьми ' + p.name + ' из лотка.',
        'Установи ' + p.name + ' в выбранный разъём.',
        p.interface === 'M.2' ? 'Закрепи модуль M.2 винтом.' : 'Подключи виртуальный SATA-кабель.',
        'Включи виртуальный компьютер, чтобы проверить результат.',
        'Монтаж завершён. Скорость загрузки обновилась.'
      ][stage] || '';
    }
    function showChoices() {
      if (!root || !root.isConnected || (stage >= 0 && stage < 6)) return;
      const list = root.querySelector('[data-dl="inventory"]');
      list.replaceChildren();
      const arr = G.partInventory('ssd');
      if (!arr.length) list.appendChild(element('<p class="parts-empty">Нет свободных накопителей. Купи SATA SSD или NVMe в магазине.</p>'));
      arr.forEach(function (p) {
        const b = element('<button type="button" class="dl-item"><strong></strong><span></span><small></small></button>');
        b.querySelector('strong').textContent = p.name;
        b.querySelector('span').textContent = p.detail;
        const check = G.partCompatibility(p.id);
        b.querySelector('small').textContent = check.ok ? 'Совместим с твоим ПК' : check.msg;
        b.classList.toggle('unfit', !check.ok);
        b.addEventListener('click', function () { start(p.id); });
        list.appendChild(b);
      });
    }
    function draw() {
      if (!root || !root.isConnected) return;
      const p = current();
      const game = root.querySelector('[data-dl="scene"]');
      game.hidden = stage < 0;
      root.querySelector('[data-dl="inventory"]').hidden = stage >= 0 && stage < 6;
      root.querySelector('[data-dl="restart"]').hidden = stage < 0;
      root.querySelector('[data-dl="progress"]').style.width = stage < 0 ? '0%' : Math.min(100, Math.round(stage / 6 * 100)) + '%';
      root.querySelector('[data-dl="step"]').textContent = stage < 0 ? 'Выбор накопителя' : stage < 6 ? 'Этап ' + (stage + 1) + ' из 6' : 'Готово';
      root.querySelector('[data-dl="installed"]').textContent = G.installedPart('ssd').name;
      root.querySelector('[data-dl="new"]').textContent = p ? p.name : 'Не выбран';
      root.querySelector('[data-dl="board"]').textContent = G.installedPart('board').name;
      game.setAttribute('data-stage', String(stage));
      game.setAttribute('data-interface', p ? p.interface : 'SATA');
      root.querySelector('[data-dl="tray-label"]').textContent = p ? p.name : 'Накопитель';
      ['power', 'sata', 'm2', 'tray', 'fit', 'fasten'].forEach(function (action) {
        const button = root.querySelector('[data-dl="' + action + '"]');
        if (!button) return;
        button.disabled = !(
          (action === 'power' && (stage === 0 || stage === 5)) ||
          (action === 'sata' && stage === 1 && p && p.interface === 'SATA') ||
          (action === 'm2' && stage === 1 && p && p.interface === 'M.2') ||
          (action === 'tray' && stage === 2) ||
          (action === 'fit' && stage === 3) ||
          (action === 'fasten' && stage === 4)
        );
      });
      root.querySelector('[data-dl="fasten"]').textContent = p && p.interface === 'M.2' ? 'Зафиксировать винт M.2' : 'Подключить SATA-кабель';
      root.querySelector('[data-dl="fit"]').textContent = p && p.interface === 'M.2' ? 'Вставить в M.2' : 'Установить в SATA';
      hint(stage < 0 ? 'Выбери накопитель из инвентаря.' : stageText());
      if (stage === 6) showChoices();
    }
    function start(id) {
      if (!G.partInventory('ssd').some(function (p) { return p.id === id; })) {
        hint('Этот накопитель отсутствует в инвентаре.', true);
        return;
      }
      const check = G.partCompatibility(id);
      if (!check.ok) {
        hint('Нельзя начать монтаж: ' + check.msg, true);
        return;
      }
      choice = id;
      desired = id;
      stage = 0;
      draw();
    }
    function action(which) {
      const expected = [
        'power',
        current() && current().interface === 'M.2' ? 'm2' : 'sata',
        'tray',
        'fit',
        'fasten',
        'power'
      ];
      if (stage < 0 || stage >= 6) return;
      if (which !== expected[stage]) {
        hint('Сначала: ' + stageText(), true);
        return;
      }
      if (stage === 5) {
        const result = G.installDriveFromWorkbench(choice);
        if (!result.ok) {
          hint('Установить не удалось: ' + result.msg, true);
          return;
        }
        window.UI.toast('Установлено: ' + current().name + '. Старый диск в инвентаре.', 'ok');
      }
      stage++;
      draw();
    }
    function reset() {
      stage = -1;
      choice = null;
      desired = null;
      showChoices();
      draw();
    }
    function mount(openApi) {
      api = openApi;
      root = element(
        '<div class="app dl-app">' +
        ' <div class="app-head"><div><h2>Мастерская накопителей</h2>' +
        ' <p class="muted">Замена SATA / NVMe · шесть игровых действий</p></div>' +
        ' <button type="button" class="btn" data-dl="shop">Магазин</button></div>' +
        ' <div class="dl-stats"><div><span>Материнская плата</span><b data-dl="board">—</b></div>' +
        ' <div><span>Установлен</span><b data-dl="installed">—</b></div>' +
        ' <div><span>Для установки</span><b data-dl="new">—</b></div></div>' +
        ' <div class="work-progress"><i data-dl="progress"></i></div>' +
        ' <p class="work-step" data-dl="step">Выбор накопителя</p>' +
        ' <div data-dl="inventory" class="dl-inventory"></div>' +
        ' <div data-dl="scene" class="dl-scene" hidden data-stage="0">' +
        ' <div class="dl-motherboard"><span class="dl-title">ZARYA · STORAGE LAB</span>' +
        ' <div class="dl-pcb-lines" aria-hidden="true"></div>' +
        ' <div class="dl-cpu" aria-hidden="true">CPU</div>' +
        ' <div class="dl-ram" aria-hidden="true"><i></i><i></i></div>' +
        ' <button type="button" data-dl="m2" data-action="m2" class="dl-m2">M.2 SLOT</button>' +
        ' <button type="button" data-dl="sata" data-action="sata" class="dl-sata">SATA PORT</button>' +
        ' <button type="button" data-dl="fit" data-action="fit" class="dl-fit">Установить накопитель</button>' +
        ' </div><div class="dl-tools">' +
        ' <button type="button" data-dl="power" data-action="power" class="dl-power">' +
        ' <span aria-hidden="true">⏻</span> Питание</button>' +
        ' <button type="button" data-dl="tray" data-action="tray" class="dl-tray"><span class="dl-drive" aria-hidden="true">SSD</span>' +
        ' <small data-dl="tray-label">Накопитель</small></button>' +
        ' <button type="button" data-dl="fasten" data-action="fasten" class="dl-fasten">Закрепить накопитель</button>' +
        ' </div></div>' +
        ' <p class="work-hint" role="status" data-dl="hint">Выбери диск из инвентаря.</p>' +
        ' <div class="pc-actions"><button class="btn" type="button" data-dl="restart" hidden>Отменить монтаж</button>' +
        ' <button class="btn btn--primary" type="button" data-dl="pc">Мой ПК</button></div>' +
        ' <p class="muted parts-footnote">Это виртуальная мини-игра, а не инструкция по работе с реальной электроникой.</p>' +
        ' </div>'
      );
      api.body.appendChild(root);
      root.querySelector('[data-dl="shop"]').addEventListener('click', function () { api.open('shop'); });
      root.querySelector('[data-dl="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-dl="restart"]').addEventListener('click', reset);
      root.querySelectorAll('[data-action]').forEach(function (b) {
        b.addEventListener('click', function () { action(b.getAttribute('data-action')); });
      });
      unsubscribe = showChoices;
      window.addEventListener('zarya:hardware', unsubscribe);
      if (desired && G.partInventory('ssd').some(function (p) { return p.id === desired; })) start(desired);
      else reset();
    }
    function close() {
      if (unsubscribe) window.removeEventListener('zarya:hardware', unsubscribe);
      unsubscribe = null;
      root = null;
      api = null;
      stage = -1;
      choice = null;
      desired = null;
    }
    function choose(id) {
      desired = id;
      if (root && root.isConnected) start(id);
    }
    return { mount: mount, close: close, choose: choose };
  })();

  window.DriveWorkbench = { choose: DriveLab.choose };
  window.APPICONS.drivelab =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="4" fill="#215872"/>' +
    '<rect x="8" y="10" width="16" height="8" rx="1" fill="#5fd5e8"/>' +
    '<path d="M9 22h14" stroke="#d2f8ff" stroke-width="2.1"/><circle cx="24" cy="22" r="1.3" fill="#a3e3af"/></svg>';
  window.APPS['drive-lab'] = {
    name: 'Монтаж SSD',
    icon: window.APPICONS.drivelab,
    w: 940, h: 640,
    mount: DriveLab.mount,
    onClose: DriveLab.close
  };
})();