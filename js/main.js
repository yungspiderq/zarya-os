/* ЗАРЯ OS — оболочка: загрузка, вход, рабочий стол, «Пуск», панель задач, быстрые настройки. */
(function () {
  const boot = document.getElementById('boot');
  const lock = document.getElementById('lock');
  const shell = document.getElementById('shell');
  const startMenu = document.getElementById('startMenu');
  const quickPanel = document.getElementById('quickPanel');
  const deskIcons = document.getElementById('deskIcons');
  const clockEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');
  const lockClock = document.getElementById('lockClock');
  const lockDate = document.getElementById('lockDate');

  const DESKTOP_ORDER = ['mail', 'terminal', 'netmap', 'files', 'notes', 'shop', 'pc', 'workbench', 'drive-lab', 'service', 'pc-orders', 'benchmark', 'arcade', 'settings', 'about'];

  const qs = { wifi: true, bluetooth: false, plane: false, eco: false };
  let started = false;

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    const d = new Date();
    const st = window.Settings.all();
    const hh = st.clock24 ? pad(d.getHours()) : pad(((d.getHours() + 11) % 12) + 1);
    const time = hh + ':' + pad(d.getMinutes());
    const date = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
    if (clockEl) clockEl.textContent = time;
    if (dateEl) dateEl.textContent = date;
    if (lockClock) lockClock.textContent = time;
    if (lockDate) {
      const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
      lockDate.textContent = days[d.getDay()] + ', ' + d.getDate() + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
    }
  }

  /* ——— рабочий стол ——— */
  function buildDesktop() {
    deskIcons.innerHTML = '';
    DESKTOP_ORDER.forEach(function (id) {
      const def = window.APPS[id];
      if (!def) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dicon';
      btn.setAttribute('data-app', id);
      btn.innerHTML =
        '<span class="dicon-img">' + def.icon + '</span>' +
        '<span class="dicon-label"></span>' +
        (id === 'mail' ? '<span class="dicon-badge" data-badge="mail"></span>' : '');
      btn.querySelector('.dicon-label').textContent = def.name;
      btn.addEventListener('click', function () {
        deskIcons.querySelectorAll('.dicon').forEach(function (x) { x.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
      });
      btn.addEventListener('dblclick', function () {
        window.WM.open(id);
        btn.classList.remove('is-selected');
      });
      btn.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        window.UI.contextMenu(e.clientX, e.clientY, [
          { label: 'Открыть', icon: window.ICONS.chevron, act: function () { window.WM.open(id); } },
          { label: 'Закрепить на панели задач', icon: window.ICONS.grid, act: function () { window.UI.toast('Уже закреплено'); } },
          { sep: true },
          { label: 'Свойства', icon: window.ICONS.monitor, act: function () { window.WM.open('about'); } }
        ]);
      });
      deskIcons.appendChild(btn);
    });
  }

  function refreshBadges() {
    const unread = window.Game.mails().some(function (m) { return !window.Game.readFlag(m.id); });
    document.querySelectorAll('[data-badge="mail"]').forEach(function (b) {
      b.classList.toggle('is-on', unread);
    });
  }

  /* ——— «Пуск» ——— */
  function buildStart() {
    const grid = document.getElementById('startGrid');
    grid.innerHTML = '';
    DESKTOP_ORDER.forEach(function (id) {
      const def = window.APPS[id];
      if (!def) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'start-app';
      b.setAttribute('data-app', id);
      b.setAttribute('data-search', (def.name + ' ' + id).toLowerCase());
      b.innerHTML = '<span class="start-app-ico">' + def.icon + '</span><span class="start-app-label"></span>';
      b.querySelector('.start-app-label').textContent = def.name;
      b.addEventListener('click', function () {
        window.WM.open(id);
        toggleStart(false);
      });
      grid.appendChild(b);
    });

    const search = document.getElementById('startSearch');
    search.addEventListener('input', function () {
      const q = search.value.trim().toLowerCase();
      grid.querySelectorAll('.start-app').forEach(function (b) {
        b.hidden = !!q && b.getAttribute('data-search').indexOf(q) < 0;
      });
    });
    search.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      const first = Array.prototype.find.call(grid.querySelectorAll('.start-app'), function (b) { return !b.hidden; });
      if (first) {
        window.WM.open(first.getAttribute('data-app') || 'terminal');
        toggleStart(false);
      }
    });

    renderRecommended();
  }

  function renderRecommended() {
    const box = document.getElementById('startRec');
    if (!box) return;
    box.innerHTML = '';
    const G = window.Game;
    const active = G.activeMissions();
    const items = [];

    if (active.length) {
      active.slice(0, 2).forEach(function (m) {
        items.push({
          title: 'Заказ: ' + m.subject,
          sub: m.server + ' · ' + m.reward + ' ₡',
          icon: window.APPICONS.netmap,
          act: function () { window.WM.open('netmap'); }
        });
      });
    } else {
      const next = G.missions().filter(function (m) { return m.status === 'available'; })[0];
      if (next) {
        items.push({
          title: 'Новый заказ: ' + next.subject,
          sub: 'Почта · ' + next.reward + ' ₡',
          icon: window.APPICONS.mail,
          act: function () { window.WM.open('mail'); }
        });
      }
    }

    const loot = window.FS.list('/home/loot');
    if (loot.length) {
      items.push({
        title: 'Добыча: ' + loot[loot.length - 1].name,
        sub: 'папка ~/loot',
        icon: window.APPICONS.files,
        act: function () { window.WM.open('files'); }
      });
    } else {
      items.push({
        title: 'Заметки и памятка',
        sub: 'команды терминала',
        icon: window.APPICONS.notes,
        act: function () { window.WM.open('notes'); }
      });
    }

    items.forEach(function (it) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rec-item';
      b.innerHTML = '<span class="rec-ico">' + it.icon + '</span><span class="rec-text"><b></b><span></span></span>';
      b.querySelector('b').textContent = it.title;
      b.querySelector('.rec-text span').textContent = it.sub;
      b.addEventListener('click', function () {
        it.act();
        toggleStart(false);
      });
      box.appendChild(b);
    });
  }

  function toggleStart(force) {
    const show = typeof force === 'boolean' ? force : startMenu.hidden;
    startMenu.hidden = !show;
    document.getElementById('startBtn').classList.toggle('is-open', show);
    if (show) {
      toggleQuick(false);
      renderRecommended();
      const s = document.getElementById('startSearch');
      s.value = '';
      document.querySelectorAll('.start-app').forEach(function (b) { b.hidden = false; });
      s.focus();
    }
  }

  /* ——— быстрые настройки ——— */
  function buildQuick() {
    const tiles = document.querySelectorAll('.qs-tile');
    tiles.forEach(function (tile) {
      tile.addEventListener('click', function () {
        const key = tile.getAttribute('data-qs');
        qs[key] = !qs[key];
        if (key === 'plane' && qs.plane) { qs.wifi = false; qs.bluetooth = false; }
        if ((key === 'wifi' || key === 'bluetooth') && qs[key]) qs.plane = false;
        syncQuick();
      });
    });

    const bright = document.getElementById('qsBright');
    bright.addEventListener('input', function () {
      document.documentElement.style.setProperty('--dim', (0.55 + bright.value / 100 * 0.45).toFixed(2));
      document.getElementById('qsBrightVal').textContent = bright.value + '%';
    });

    const vol = document.getElementById('qsVol');
    vol.addEventListener('input', function () {
      document.getElementById('qsVolVal').textContent = vol.value + '%';
    });

    document.getElementById('qsTheme').addEventListener('click', function () {
      window.Settings.set('theme', window.Settings.get('theme') === 'dark' ? 'light' : 'dark');
      syncQuick();
    });
    document.getElementById('qsSettings').addEventListener('click', function () {
      window.WM.open('settings');
      toggleQuick(false);
    });

    syncQuick();
  }

  function syncQuick() {
    document.querySelectorAll('.qs-tile').forEach(function (tile) {
      tile.classList.toggle('is-on', !!qs[tile.getAttribute('data-qs')]);
    });
    const dark = window.Settings.get('theme') === 'dark';
    const themeBtn = document.getElementById('qsTheme');
    themeBtn.innerHTML = '<span class="qs-ico">' + (dark ? window.ICONS.sun : window.ICONS.moon) + '</span>' +
      '<span>' + (dark ? 'Светлая тема' : 'Тёмная тема') + '</span>';
  }

  function toggleQuick(force) {
    const show = typeof force === 'boolean' ? force : quickPanel.hidden;
    quickPanel.hidden = !show;
    document.getElementById('trayGroup').classList.toggle('is-open', show);
    if (show) { toggleStart(false); syncQuick(); }
  }

  /* ——— панель задач: закреплённые ярлыки ——— */
  function syncPins() {
    const running = window.WM.list();
    document.querySelectorAll('.tb-pin').forEach(function (pin) {
      pin.classList.toggle('is-hidden', running.indexOf(pin.getAttribute('data-pin')) >= 0);
    });
  }

  function buildPins() {
    const box = document.getElementById('pins');
    ['files', 'terminal', 'mail', 'netmap'].forEach(function (id) {
      const def = window.APPS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tb-btn tb-pin';
      b.setAttribute('data-pin', id);
      b.title = def.name;
      b.setAttribute('aria-label', def.name);
      b.innerHTML = def.icon;
      b.addEventListener('click', function () { window.WM.open(id); });
      box.appendChild(b);
    });
  }

  /* ——— индикатор следа и денег ——— */
  function updateHud() {
    const G = window.Game;
    const t = Math.round(G.trace());
    const chip = document.getElementById('hudChip');
    if (!chip) return;
    chip.classList.toggle('is-hot', t > 65);
    chip.classList.toggle('is-cold', t === 0);
    chip.querySelector('[data-el="traceVal"]').textContent = t + '%';
    chip.querySelector('[data-el="traceFill"]').style.width = t + '%';
    chip.querySelector('[data-el="money"]').textContent = fmt(G.money()) + ' ₡';

    const widget = document.getElementById('deskWidget');
    if (widget) {
      const stats = G.stats();
      const side = G.missions().filter(function (m) { return m.side; });
      const sideDone = side.filter(function (m) { return m.status === 'done'; }).length;
      widget.querySelector('[data-el="dwMoney"]').textContent = fmt(G.money()) + ' ₡';
      widget.querySelector('[data-el="dwTrace"]').textContent = t + '%';
      widget.querySelector('[data-el="dwPwned"]').textContent = stats.pwned + ' / ' + stats.total;
      widget.querySelector('[data-el="dwSide"]').textContent = sideDone + ' / ' + side.length;
      const bar = widget.querySelector('[data-el="dwBar"]');
      bar.style.width = t + '%';
      bar.classList.toggle('is-hot', t > 65);
    }

    refreshBadges();
  }

  /* ——— приветствие / вход ——— */
  function enterSystem() {
    if (started) return;
    started = true;
    boot.classList.add('is-gone');
    lock.hidden = true;
    shell.hidden = false;
    setTimeout(function () { boot.remove(); }, 600);
    tick();
    window.dispatchEvent(new Event('zarya:ready'));

    let seen = '1';
    try { seen = localStorage.getItem('zarya.seen'); } catch (e) {}
    if (!seen) {
      try { localStorage.setItem('zarya.seen', '1'); } catch (e) {}
      window.WM.open('terminal');
      setTimeout(function () {
        window.UI.toast('Новое письмо: «первый заказ» — открой Почту', 'ok');
      }, 1400);
    }
  }

  function showLock() {
    lock.hidden = false;
    shell.hidden = true;
    started = false;
    tick();
    lock.focus();
  }

  function bootSequence() {
    const log = document.getElementById('bootSteps');
    const steps = ['ядро', 'сеть', 'оболочка', 'готово'];
    let i = 0;
    const timer = setInterval(function () {
      if (i >= steps.length) {
        clearInterval(timer);
        setTimeout(function () {
          boot.classList.add('is-done');
          lock.hidden = false;
          tick();
          lock.focus();
        }, 260);
        return;
      }
      const line = document.createElement('span');
      line.textContent = steps[i];
      log.appendChild(line);
      i++;
    }, 260);
  }

  /* ——— контекстное меню рабочего стола ——— */
  function bindDesktopMenu() {
    const desk = document.getElementById('desk');
    desk.addEventListener('contextmenu', function (e) {
      if (e.target.closest('.win')) return;
      e.preventDefault();
      window.UI.contextMenu(e.clientX, e.clientY, [
        { label: 'Обновить', icon: window.ICONS.refresh, act: function () { renderRecommended(); window.UI.toast('Рабочий стол обновлён'); } },
        { sep: true },
        { label: 'Открыть терминал', icon: window.APPICONS.terminal, act: function () { window.WM.open('terminal'); } },
        { label: 'Новая заметка', icon: window.APPICONS.notes, act: function () { window.WM.open('notes'); } },
        { label: 'Проводник', icon: window.APPICONS.files, act: function () { window.WM.open('files'); } },
        { sep: true },
        { label: 'Персонализация', icon: window.APPICONS.settings, act: function () { window.WM.open('settings'); } },
        { label: 'О системе', icon: window.APPICONS.about, act: function () { window.WM.open('about'); } }
      ]);
    });

    desk.addEventListener('mousedown', function (e) {
      if (e.target.closest('.dicon') || e.target.closest('.win')) return;
      deskIcons.querySelectorAll('.dicon').forEach(function (x) { x.classList.remove('is-selected'); });
      toggleStart(false);
      toggleQuick(false);
    });
  }

  /* ——— события игры ——— */
  function bindGameEvents() {
    window.addEventListener('zarya:game', function () {
      updateHud();
      if (startMenu && !startMenu.hidden) renderRecommended();
    });

    window.addEventListener('zarya:mission', function (e) {
      window.UI.toast('Заказ выполнен! +' + fmt(e.detail.reward) + ' ₡', 'ok');
      setTimeout(function () {
        const G = window.Game;
        const next = G.missions().filter(function (m) { return m.status === 'available'; })[0];
        if (next) window.UI.toast('Доступен новый заказ: ' + next.subject);
      }, 2200);
    });

    window.addEventListener('zarya:caught', function (e) {
      window.UI.toast('Тебя вычислили. Штраф ' + fmt(e.detail.penalty) + ' ₡', 'err');
    });

    window.addEventListener('zarya:settings', function () {
      syncQuick();
      tick();
    });
  }

  /* ——— панель задач: обработчики ——— */
  function bindChrome() {
    document.getElementById('startBtn').addEventListener('click', function () { toggleStart(); });
    document.getElementById('trayGroup').addEventListener('click', function (e) {
      if (e.target.closest('#hudChip')) { window.WM.open('netmap'); return; }
      if (e.target.closest('#trayClock')) { toggleQuick(); return; }
      toggleQuick();
    });
    document.getElementById('hudChip').addEventListener('click', function () { window.WM.open('netmap'); });
    const widget = document.getElementById('deskWidget');
    if (widget) widget.addEventListener('click', function () { window.WM.open('netmap'); });

    document.getElementById('powerBtn').addEventListener('click', async function () {
      const yes = await window.UI.confirm('Завершить сессию?', 'Система вернётся к экрану входа. Прогресс сохранится.', 'Заблокировать');
      if (yes) showLock();
    });

    document.getElementById('lockBtn').addEventListener('click', enterSystem);
    lock.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      enterSystem();
    });
    lock.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterSystem(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        toggleStart(false);
        toggleQuick(false);
        window.UI.closeContextMenu();
      }
    });

    document.addEventListener('mousedown', function (e) {
      if (!startMenu.hidden && !e.target.closest('#startMenu') && !e.target.closest('#startBtn')) toggleStart(false);
      if (!quickPanel.hidden && !e.target.closest('#quickPanel') && !e.target.closest('#trayGroup')) toggleQuick(false);
    });

    window.addEventListener('zarya:open', syncPins);
    window.addEventListener('zarya:close', syncPins);
    window.addEventListener('zarya:fs', refreshBadges);
  }

  /* ——— запуск ——— */
  function init() {
    window.Settings.apply();
    buildDesktop();
    buildStart();
    buildPins();
    buildQuick();
    bindDesktopMenu();
    bindGameEvents();
    bindChrome();

    tick();
    setInterval(tick, 15000);
    updateHud();
    syncPins();
    bootSequence();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
