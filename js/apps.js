/* ЗАРЯ OS — приложения: терминал, почта, сеть, проводник, заметки, магазин, настройки. */
(function () {
  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function bar(p, width) {
    const w = width || 22;
    const fill = Math.round(p * w);
    return '[' + '#'.repeat(fill) + '·'.repeat(Math.max(0, w - fill)) + ']';
  }

  /* — глифы типов заказов и ролей узлов — */
  const TYPE_GLYPH = {
    data: 'doc',
    intel: 'eye',
    stealth: 'mask',
    wipe: 'eraser',
    inject: 'chip',
    decrypt: 'key',
    system: 'chip'
  };

  const ROLE_GLYPH = {
    school: 'server',
    office: 'briefcase',
    market: 'cart',
    dc: 'rack',
    ghost: 'ghost',
    cafe: 'cafe',
    telco: 'antenna'
  };

  function glyph(name, cls) {
    const svg = window.ICONS[name] || '';
    return '<span class="glyph ' + (cls || '') + '" aria-hidden="true">' + svg + '</span>';
  }

  function typeGlyph(type, cls) {
    return glyph(TYPE_GLYPH[type] || 'chip', cls);
  }

  /* ===========================================================
     ТЕРМИНАЛ
     =========================================================== */
  const Terminal = (function () {
    let root = null;
    let out = null;
    let input = null;
    let promptEl = null;
    let connEl = null;
    let traceFill = null;
    let traceVal = null;
    let busy = false;
    const history = [];
    let hPos = 0;

    const HELP =
      'команды:\n' +
      '  help                      этот список\n' +
      '  clear                     очистить экран\n' +
      '  net                       карта известных узлов\n' +
      '  scan <ip>                 просканировать узел\n' +
      '  connect <ip>              подключиться к узлу\n' +
      '  brute                     подобрать пароль на узле\n' +
      '  login <логин> <пароль>    войти по известным данным\n' +
      '  ls                        файлы локально или на узле\n' +
      '  cat <файл>                прочитать файл\n' +
      '  download <файл>           скачать файл в ~/loot\n' +
      '  decrypt <файл>            вскрыть зашифрованный файл\n' +
      '  wipe <файл>               уничтожить файл на узле\n' +
      '  inject                    поставить имплант на узле\n' +
      '  disconnect                отключиться от узла\n' +
      '  hide                      сбросить след (80 ₡)\n' +
      '  missions                  активные заказы\n' +
      '  contracts                 побочные контракты\n' +
      '  shop / buy <id>           апгрейды и покупка\n' +
      '  money                     баланс\n' +
      '  whoami                    кто ты\n' +
      '  exit                      закрыть терминал';

    function print(text, cls) {
      if (!out) return null;
      const line = document.createElement('div');
      line.className = 'term-line' + (cls ? ' is-' + cls : '');
      line.textContent = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
      return line;
    }

    function updateHud() {
      if (!root || !root.isConnected) return;
      const s = window.Game.session();
      if (connEl) connEl.textContent = s ? s.ip + (s.authed ? ' · доступ' : ' · гость') : 'локально';
      if (root) root.classList.toggle('is-online', !!s);
      const t = Math.round(window.Game.trace());
      if (traceFill) {
        traceFill.style.width = t + '%';
      }
      const traceWrap = root.querySelector('.term-trace');
      if (traceWrap) traceWrap.classList.toggle('is-hot', t > 65);
      if (traceVal) traceVal.textContent = t + '%';
      if (promptEl) promptEl.textContent = s ? 'root@' + s.ip + ':~$' : 'root@zarya:~$';
    }

    function promptLine(cmd) {
      print((window.Game.session() ? 'root@' + window.Game.session().ip : 'root@zarya') + ':~$ ' + cmd, 'cmd');
    }

    async function cmdBrute() {
      const live = print('подбор пароля ' + bar(0), 'dim');
      busy = true;
      const res = await window.Game.brute(function (p) {
        if (live && live.isConnected) live.textContent = 'подбор пароля ' + bar(p) + ' ' + Math.round(p * 100) + '%';
      });
      busy = false;
      if (live && live.isConnected) live.remove();
      print(res.msg, res.ok ? 'ok' : 'err');
      updateHud();
    }

    async function run(raw) {
      const text = raw.trim();
      if (!text) return;
      promptLine(text);
      const parts = text.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      const G = window.Game;

      if (cmd === 'help') { print(HELP); return; }
      if (cmd === 'clear' || cmd === 'cls') { out.innerHTML = ''; return; }
      if (cmd === 'exit') { window.WM.close('terminal'); return; }
      if (cmd === 'whoami') { print('root · ЗАРЯ OS ' + (window.Game.version || '1.1') + ' · репутация ' + G.rep() + ' · ' + fmt(G.money()) + ' ₡'); return; }
      if (cmd === 'money' || cmd === 'balance') { print('баланс: ' + fmt(G.money()) + ' ₡'); return; }
      if (cmd === 'net') {
        const list = G.servers();
        print('карта сети:');
        list.forEach(function (s) {
          print('  ' + s.ip.padEnd(15) + ' ' + s.name.padEnd(22) + (s.pwned ? 'взломан' : s.known ? 'известен' : 'неизвестен'));
        });
        return;
      }
      if (cmd === 'missions') {
        const act = G.activeMissions();
        if (!act.length) print('активных заказов нет. Почта → принять заказ.', 'warn');
        else act.forEach(function (m) {
          print('  [' + m.id + '] ' + m.subject + ' → ' + m.server + ' · ' + m.goalText + ' · ' + m.reward + ' ₡');
        });
        return;
      }
      if (cmd === 'contracts' || cmd === 'side') {
        const side = G.missions().filter(function (m) { return m.side; });
        print('побочные контракты (не блокируют сюжет):');
        side.forEach(function (m) {
          const mark = m.status === 'done' ? 'выполнен' : m.status === 'active' ? 'в работе' : 'доступен';
          print('  [' + m.id + '] ' + m.subject.padEnd(22) + ' ' + m.typeLabel.padEnd(12) + m.reward + ' ₡ · ' + mark);
        });
        print('  взять контракт: Почта → заказ → «Принять заказ»', 'dim');
        return;
      }
      if (cmd === 'scan') {
        if (!args[0]) { print('нужен адрес: scan 10.0.0.7', 'err'); return; }
        const r = G.scan(args[0]);
        print(r.msg, r.ok ? 'ok' : 'err');
        updateHud();
        return;
      }
      if (cmd === 'connect') {
        if (!args[0]) { print('нужен адрес: connect 10.0.0.7', 'err'); return; }
        const r = G.connect(args[0]);
        print(r.msg, r.ok ? 'ok' : 'err');
        updateHud();
        return;
      }
      if (cmd === 'disconnect') {
        const r = G.disconnect();
        print(r.msg, r.ok ? 'ok' : 'err');
        updateHud();
        return;
      }
      if (cmd === 'brute') { await cmdBrute(); return; }
      if (cmd === 'login') {
        if (!args[0]) { print('нужно: login <логин> <пароль>', 'err'); return; }
        const r = G.login(args[0], args[1] || '');
        print(r.msg, r.ok ? 'ok' : 'err');
        updateHud();
        return;
      }
      if (cmd === 'ls' || cmd === 'dir') {
        if (G.session()) {
          const r = G.ls();
          print(r.msg, r.ok ? '' : 'err');
          updateHud();
        } else {
          print('локально (/home):');
          window.FS.list('/home').forEach(function (n) {
            print('  ' + (n.type === 'dir' ? 'd' : '-') + '  ' + n.name);
          });
          print('  …полный список — в Проводнике', 'dim');
        }
        return;
      }
      if (cmd === 'cat') {
        if (!args[0]) { print('нужно: cat <файл>', 'err'); return; }
        if (G.session()) {
          const r = G.cat(args[0]);
          print(r.msg, r.ok ? '' : 'err');
          if (r.mission) missionDone(r.mission);
        } else {
          const path = window.FS.norm(args[0], '/home');
          const body = window.FS.read(path);
          print(body === null ? 'файл не найден: ' + path : body, body === null ? 'err' : '');
        }
        updateHud();
        return;
      }
      if (cmd === 'download' || cmd === 'get') {
        if (!args[0]) { print('нужно: download <файл>', 'err'); return; }
        const r = G.download(args[0]);
        print(r.msg, r.ok ? 'ok' : 'err');
        if (r.mission) missionDone(r.mission);
        updateHud();
        return;
      }
      if (cmd === 'hide' || cmd === 'clean') {
        const r = G.hide();
        print(r.msg, r.ok ? 'ok' : 'err');
        updateHud();
        return;
      }
      if (cmd === 'wipe') {
        if (!args[0]) { print('нужно: wipe <файл>', 'err'); return; }
        const r = G.wipe(args[0]);
        print(r.msg, r.ok ? 'ok' : 'err');
        if (r.mission) missionDone(r.mission);
        updateHud();
        return;
      }
      if (cmd === 'inject') {
        const r = G.inject();
        print(r.msg, r.ok ? 'ok' : 'err');
        if (r.mission) missionDone(r.mission);
        updateHud();
        return;
      }
      if (cmd === 'decrypt') {
        if (!args[0]) { print('нужно: decrypt <файл>', 'err'); return; }
        const r = G.decrypt(args[0]);
        print(r.msg, r.ok ? 'ok' : 'err');
        if (r.mission) missionDone(r.mission);
        updateHud();
        return;
      }
      if (cmd === 'shop') {
        print('магазин:');
        G.shop().forEach(function (item) {
          const lvl = G.level(item.id);
          const cost = lvl >= item.max ? '—' : item.costs[lvl] + ' ₡';
          print('  ' + item.id.padEnd(8) + item.name.padEnd(18) + item.levels[lvl].padEnd(12) + cost);
        });
        print('  покупка: buy <id>', 'dim');
        return;
      }
      if (cmd === 'buy') {
        if (!args[0]) { print('нужно: buy cpu | proxy | scripts', 'err'); return; }
        const r = G.buy(args[0]);
        print(r.msg, r.ok ? 'ok' : 'err');
        return;
      }
      if (cmd === 'trace') {
        print('след: ' + Math.round(G.trace()) + '% · выявлений: ' + G.caughtCount());
        return;
      }
      if (cmd === 'sudo') { print('ты и так root. просто root.', 'warn'); return; }
      print('команда не найдена: ' + cmd + '. help — список.', 'err');
    }

    function missionDone(hit) {
      if (hit.rejected) {
        print('заказ не засчитан: нужен след ≤ ' + hit.need + '%, а сейчас ' + hit.trace + '%.', 'warn');
        return;
      }
      print('заказ выполнен: +' + fmt(hit.reward) + ' ₡ · репутация +' + hit.mission.rep, 'ok');
    }

    function mount(api) {
      root = h(
        '<div class="term">' +
        '  <div class="term-top">' +
        '    <span class="term-tag">zarya-term</span>' +
        '    <span class="term-conn" data-el="conn">локально</span>' +
        '    <span class="term-trace" title="Уровень следа">след<span class="meter"><i data-el="fill"></i></span><b data-el="val">0%</b></span>' +
        '  </div>' +
        '  <div class="term-out" data-el="out"></div>' +
        '  <form class="term-in">' +
        '    <span class="term-prompt" data-el="prompt">root@zarya:~$</span>' +
        '    <input class="term-input" data-el="input" autocomplete="off" spellcheck="false" aria-label="Команда">' +
        '  </form>' +
        '</div>'
      );

      out = root.querySelector('[data-el="out"]');
      input = root.querySelector('[data-el="input"]');
      promptEl = root.querySelector('[data-el="prompt"]');
      connEl = root.querySelector('[data-el="conn"]');
      traceFill = root.querySelector('[data-el="fill"]');
      traceVal = root.querySelector('[data-el="val"]');

      api.body.appendChild(root);

      print('ЗАРЯ OS · терминал ' + (window.Game.version || '1.1'), 'accent');
      print('help — команды · net — карта сети · missions — заказы', 'dim');
      print('', 'dim');

      root.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) return;
        const value = input.value;
        input.value = '';
        if (value.trim()) {
          history.push(value.trim());
          if (history.length > 60) history.shift();
          hPos = history.length;
        }
        run(value).catch(function (err) { console.error(err); });
        updateHud();      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!history.length) return;
          hPos = Math.max(0, hPos - 1);
          input.value = history[hPos] || '';
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          hPos = Math.min(history.length, hPos + 1);
          input.value = history[hPos] || '';
        }
      });

      root.addEventListener('mousedown', function (e) {
        if (e.target.closest('.term-out') && window.getSelection().toString()) return;
        input.focus();
      });

      api.el.addEventListener('pointerup', function () {
        if (window.getSelection().toString()) return;
        input.focus();
      });

      updateHud();
    }

    window.addEventListener('zarya:caught', function (e) {
      if (!root || !root.isConnected) return;
      print('ТЕБЯ ЗАСЕКЛИ. штраф ' + fmt(e.detail.penalty) + ' ₡, репутация −1.', 'err');
      updateHud();
    });

    window.addEventListener('zarya:game', updateHud);

    return {
      mount: mount,
      focus: function () { if (input) input.focus(); },
      exec: function (cmd) {
        window.WM.open('terminal');
        setTimeout(function () {
          if (!input) return;
          run(cmd).catch(function (err) { console.error(err); });
          updateHud();
        }, 50);
      }
    };
  })();

  /* ===========================================================
     ПОЧТА
     =========================================================== */
  const Mail = (function () {
    let root = null;
    let selected = 'mail-m1';

    function statusLabel(status) {
      if (status === 'done') return 'выполнен';
      if (status === 'active') return 'в работе';
      if (status === 'locked') return 'недоступен';
      return 'новый';
    }

    function render() {
      if (!root || !root.isConnected) return;
      const mails = window.Game.mails();
      const list = root.querySelector('[data-el="list"]');
      const body = root.querySelector('[data-el="body"]');
      list.innerHTML = '';

      mails.forEach(function (m) {
        const item = document.createElement('button');
        item.type = 'button';
        const type = m.type || 'system';
        item.className = 'mail-item' + (m.id === selected ? ' is-active' : '') +
          (window.Game.readFlag(m.id) ? '' : ' is-unread');
        item.innerHTML =
          '<span class="mail-ava t-' + type + '">' + typeGlyph(type) + '</span>' +
          '<span class="mail-main">' +
          '  <span class="mail-from"></span>' +
          '  <span class="mail-subj"></span>' +
          '  <span class="mail-chips">' +
          (m.typeLabel ? '<span class="chip chip--' + type + '">' + m.typeLabel + '</span>' : '') +
          (m.reward ? '<span class="chip chip--reward">' + fmt(m.reward) + ' ₡</span>' : '') +
          '  </span>' +
          '</span>';
        item.querySelector('.mail-from').textContent = m.from;
        item.querySelector('.mail-subj').textContent = m.subject;
        if (m.status) {
          const tag = document.createElement('span');
          tag.className = 'mail-tag is-' + m.status;
          tag.textContent = statusLabel(m.status);
          item.appendChild(tag);
        }
        item.addEventListener('click', function () {
          selected = m.id;
          window.Game.markRead(m.id);
          render();
        });
        list.appendChild(item);
      });

      const mail = mails.find(function (m) { return m.id === selected; }) || mails[0];
      if (!mail) return;
      window.Game.markRead(mail.id);

      const type = mail.type || 'system';
      const srv = mail.server ? window.Game.server(mail.server) : null;
      const chips =
        (mail.typeLabel ? '<span class="chip chip--' + type + '">' + typeGlyph(type) + mail.typeLabel + '</span>' : '') +
        (mail.reward ? '<span class="chip chip--reward">' + fmt(mail.reward) + ' ₡</span>' : '') +
        (srv ? '<span class="chip chip--sec">защита ' + srv.sec + ' / 5</span>' : '');

      const brief = mail.goal
        ? '<div class="mail-brief">' +
          '  <div class="mb-row"><span>цель</span><b>' + (mail.goalShort || mail.goalText) + '</b></div>' +
          '  <div class="mb-row"><span>узел</span><b>' + mail.server + (srv ? ' · ' + srv.name : '') + '</b></div>' +
          (mail.goal.maxTrace !== undefined
            ? '<div class="mb-row"><span>условие</span><b class="mb-warn">след к моменту чтения ≤ ' + mail.goal.maxTrace + '%</b></div>'
            : '') +
          '  <div class="mb-row"><span>награда</span><b class="mb-reward">' + fmt(mail.reward) + ' ₡</b></div>' +
          '</div>'
        : '';

      body.innerHTML =
        '<div class="mail-head">' +
        '  <span class="mail-ava mail-ava--lg t-' + type + '">' + typeGlyph(type) + '</span>' +
        '  <div class="mail-head-main">' +
        '    <h3 data-el="subject"></h3>' +
        '    <div class="mail-meta"><span data-el="from"></span> · <span data-el="addr"></span></div>' +
        '    <div class="mail-chips">' + chips + '</div>' +
        '  </div>' +
        '</div>' +
        brief +
        '<pre class="mail-text" data-el="text"></pre>' +
        '<div class="mail-actions" data-el="actions"></div>';

      body.querySelector('[data-el="subject"]').textContent = mail.subject;
      body.querySelector('[data-el="from"]').textContent = mail.from;
      body.querySelector('[data-el="addr"]').textContent = mail.fromMail;
      body.querySelector('[data-el="text"]').textContent = mail.body;

      const actions = body.querySelector('[data-el="actions"]');
      if (mail.mission) {
        const m = mail.mission;
        const hint = document.createElement('p');
        hint.className = 'mail-hint';
        hint.textContent = 'Подсказка: ' + mail.hint;
        actions.appendChild(hint);

        if (mail.status === 'available') {
          const btn = h('<button type="button" class="btn btn--primary">Принять заказ</button>');
          btn.addEventListener('click', function () {
            const r = window.Game.accept(m);
            window.UI.toast(r.ok ? 'Заказ принят' : r.msg, r.ok ? 'ok' : 'err');
            render();
          });
          actions.appendChild(btn);
        } else if (mail.status === 'active') {
          const btn = h('<button type="button" class="btn">К терминалу</button>');
          btn.addEventListener('click', function () {
            const srv = window.Game.server(window.Game.missions().find(function (x) { return x.id === m; }).server);
            Terminal.exec((window.Game.servers().find(function (x) { return x.ip === srv.ip; }).known ? 'connect ' : 'scan ') + srv.ip);
          });
          actions.appendChild(btn);
          const st = h('<span class="mail-state">в работе · цель ' + mail.server + '</span>');
          actions.appendChild(st);
        } else if (mail.status === 'done') {
          actions.appendChild(h('<span class="mail-state is-done">заказ выполнен, оплата получена</span>'));
        } else {
          actions.appendChild(h('<span class="mail-state">сначала выполни предыдущий заказ</span>'));
        }
      }

      const badge = document.querySelector('[data-badge="mail"]');
      const unread = mails.some(function (m) { return !window.Game.readFlag(m.id); });
      if (badge) badge.classList.toggle('is-on', unread);
    }

    function mount(api) {
      root = h(
        '<div class="mail">' +
        '  <div class="mail-list" data-el="list"></div>' +
        '  <div class="mail-body" data-el="body"></div>' +
        '</div>'
      );
      api.body.appendChild(root);
      render();
      window.addEventListener('zarya:game', render);
    }

    return { mount: mount, render: render };
  })();

  /* ===========================================================
     СЕТЬ (карта узлов)
     =========================================================== */
  const Netmap = (function () {
    let root = null;

    function render() {
      if (!root || !root.isConnected) return;
      const G = window.Game;
      const stats = G.stats();
      root.querySelector('[data-el="money"]').textContent = fmt(stats.money) + ' ₡';
      root.querySelector('[data-el="rep"]').textContent = String(stats.rep);
      root.querySelector('[data-el="pwned"]').textContent = stats.pwned + ' / ' + stats.total;
      const tr = Math.round(G.trace());
      const fill = root.querySelector('[data-el="trace"]');
      fill.style.width = tr + '%';
      fill.classList.toggle('is-hot', tr > 65);
      root.querySelector('[data-el="traceVal"]').textContent = tr + '%';

      const grid = root.querySelector('[data-el="grid"]');
      grid.innerHTML = '';

      G.servers().forEach(function (s) {
        const role = s.role || 'server';
        const roleIcon = window.ICONS[ROLE_GLYPH[role] || 'server'];
        const node = h(
          '<article class="node node--' + role + '">' +
          '  <span class="node-art" aria-hidden="true">' + roleIcon + '</span>' +
          '  <header class="node-head">' +
          '    <span class="node-role" aria-hidden="true">' + roleIcon + '</span>' +
          '    <span class="node-name"></span>' +
          '    <span class="node-state"></span>' +
          '  </header>' +
          '  <div class="node-ip"></div>' +
          '  <div class="node-sec" title="Уровень защиты"></div>' +
          '  <p class="node-ports"></p>' +
          '  <p class="node-note"></p>' +
          '  <div class="node-actions">' +
          '    <button type="button" class="btn btn--sm" data-act="scan">Сканировать</button>' +
          '    <button type="button" class="btn btn--sm btn--primary" data-act="go">Войти</button>' +
          '  </div>' +
          '</article>'
        );

        node.querySelector('.node-name').textContent = s.name;
        node.querySelector('.node-ip').textContent = s.ip;
        node.classList.toggle('is-pwned', !!s.pwned);
        const state = node.querySelector('.node-state');
        state.className = 'node-state ' + (s.pwned ? 'is-pwned' : s.known ? 'is-known' : 'is-unknown');
        state.textContent = s.pwned ? 'взломан' : s.known ? 'известен' : 'нет данных';

        const sec = node.querySelector('.node-sec');
        for (let i = 0; i < 5; i++) {
          const b = document.createElement('i');
          if (i < s.sec) b.className = 'on';
          sec.appendChild(b);
        }

        const ports = node.querySelector('.node-ports');
        if (s.known) {
          s.ports.forEach(function (p) {
            const chip = document.createElement('span');
            chip.className = 'port';
            chip.textContent = p.n + ' · ' + p.s;
            ports.appendChild(chip);
          });
          if (s.implant) {
            const chip = document.createElement('span');
            chip.className = 'port port--implant';
            chip.textContent = 'implant · zarya.svc';
            ports.appendChild(chip);
          }
        } else {
          ports.textContent = 'порты не просканированы';
        }

        node.querySelector('.node-note').textContent = s.known
          ? s.note
          : 'узел не просканирован — что это, пока неизвестно';

        node.querySelector('[data-act="scan"]').addEventListener('click', function () {
          Terminal.exec('scan ' + s.ip);
        });
        node.querySelector('[data-act="go"]').addEventListener('click', function () {
          Terminal.exec((s.known ? 'connect ' : 'scan ') + s.ip);
        });

        grid.appendChild(node);
      });
    }

    function mount(api) {
      root = h(
        '<div class="app net">' +
        '  <div class="net-title"><h2>Сеть</h2><span>карта узлов · всё вымышлено</span></div>' +
        '  <div class="net-head">' +
        '    <div class="stat"><span>Баланс</span><b data-el="money">0 ₡</b></div>' +
        '    <div class="stat"><span>Репутация</span><b data-el="rep">0</b></div>' +
        '    <div class="stat"><span>Взломано</span><b data-el="pwned">0 / 0</b></div>' +
        '    <div class="stat stat--trace"><span>След</span><b data-el="traceVal">0%</b>' +
        '      <div class="meter"><i data-el="trace"></i></div>' +
        '    </div>' +
        '    <div class="stat stat--act"><span>Чистка маршрута</span>' +
        '      <button type="button" class="btn btn--sm" data-act="hide">Сбросить след · 80 ₡</button>' +
        '    </div>' +
        '  </div>' +
        '  <div class="net-note">Все узлы вымышленные. Сеть живёт только внутри игры.</div>' +
        '  <div class="net-grid" data-el="grid"></div>' +
        '</div>'
      );
      api.body.appendChild(root);
      root.querySelector('[data-act="hide"]').addEventListener('click', function () {
        const r = window.Game.hide();
        window.UI.toast(r.msg, r.ok ? 'ok' : 'err');
        render();
      });
      render();
      window.addEventListener('zarya:game', render);
    }

    return { mount: mount, render: render };
  })();

  /* ===========================================================
     ПРОВОДНИК
     =========================================================== */
  const Files = (function () {
    let root = null;
    let cwd = '/home';
    let selected = null;

    function open(path) {
      const node = window.FS.node(path);
      if (!node) return;
      if (node.type === 'dir') {
        cwd = window.FS.norm(path);
        selected = null;
        render();
      } else if (path.indexOf('/home/notes/') === 0) {
        window.NOTES.open(path);
      } else {
        window.NOTES.open(path);
      }
    }

    function render() {
      if (!root || !root.isConnected) return;
      const FS = window.FS;
      const crumb = root.querySelector('[data-el="crumb"]');
      crumb.innerHTML = '';

      const segs = cwd.split('/').filter(Boolean);
      const home = h('<button type="button" class="crumb-seg">Этот компьютер</button>');
      home.addEventListener('click', function () { cwd = '/'; selected = null; render(); });
      crumb.appendChild(home);
      let acc = '';
      segs.forEach(function (seg) {
        acc += '/' + seg;
        const target = acc;
        crumb.appendChild(h('<span class="crumb-slash">/</span>'));
        const b = h('<button type="button" class="crumb-seg"></button>');
        b.textContent = seg;
        b.addEventListener('click', function () { cwd = target; selected = null; render(); });
        crumb.appendChild(b);
      });

      const list = root.querySelector('[data-el="list"]');
      list.innerHTML = '';

      const entries = FS.list(cwd);
      if (!entries.length) {
        list.appendChild(h('<div class="empty">Папка пуста. Здесь появятся скачанные файлы.</div>'));
      }

      entries.forEach(function (n) {
        const path = (cwd === '/' ? '' : cwd) + '/' + n.name;
        const row = h(
          '<button type="button" class="row">' +
          '  <span class="row-ico"></span>' +
          '  <span class="row-name"></span>' +
          '  <span class="row-meta"></span>' +
          '</button>'
        );
        row.querySelector('.row-ico').innerHTML = n.type === 'dir'
          ? window.APPICONS.folderMini
          : (path.endsWith('.md') ? window.APPICONS.noteMini : window.APPICONS.fileMini);
        row.querySelector('.row-name').textContent = n.name;
        row.querySelector('.row-meta').textContent = n.type === 'dir'
          ? 'папка'
          : FS.formatBytes((n.body || '').length);
        if (selected === path) row.classList.add('is-selected');
        row.addEventListener('click', function () { selected = path; render(); });
        row.addEventListener('dblclick', function () { open(path); });
        row.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          selected = path;
          render();
          window.UI.contextMenu(e.clientX, e.clientY, [
            {
              label: n.type === 'dir' ? 'Открыть' : 'Открыть в заметках',
              icon: window.ICONS.chevron,
              act: function () { open(path); }
            },
            {
              label: 'Переименовать',
              icon: window.ICONS.edit,
              act: function () { rename(path); }
            },
            { sep: true },
            {
              label: 'Удалить',
              icon: window.ICONS.trash,
              danger: true,
              act: function () { remove(path); }
            }
          ]);
        });
        list.appendChild(row);
      });
    }

    async function newDir() {
      const name = await window.UI.prompt('Новая папка', 'новая папка');
      if (!name) return;
      const path = window.FS.norm(name, cwd);
      if (!window.FS.mkdir(path)) window.UI.toast('Не получилось: имя занято', 'err');
      render();
    }

    async function newFile() {
      const name = await window.UI.prompt('Новый файл', 'файл.txt');
      if (!name) return;
      const path = window.FS.norm(name, cwd);
      if (!window.FS.touch(path)) window.UI.toast('Не получилось: имя занято', 'err');
      render();
    }

    async function rename(path) {
      const base = path.split('/').pop();
      const name = await window.UI.prompt('Переименовать', base);
      if (!name) return;
      if (!window.FS.rename(path, name)) window.UI.toast('Такое имя уже есть', 'err');
      render();
    }

    async function remove(path) {
      const yes = await window.UI.confirm('Удалить?', path, 'Удалить');
      if (!yes) return;
      window.FS.rm(path);
      selected = null;
      render();
    }

    function mount(api) {
      root = h(
        '<div class="app files">' +
        '  <div class="app-bar">' +
        '    <button type="button" class="btn btn--icon" data-act="up" title="Вверх" aria-label="Вверх">' + window.ICONS.arrowUp + '</button>' +
        '    <button type="button" class="btn btn--icon" data-act="refresh" title="Обновить" aria-label="Обновить">' + window.ICONS.refresh + '</button>' +
        '    <div class="crumb" data-el="crumb"></div>' +
        '    <div class="spacer"></div>' +
        '    <button type="button" class="btn btn--sm" data-act="newdir">Папка</button>' +
        '    <button type="button" class="btn btn--sm" data-act="newfile">Файл</button>' +
        '    <button type="button" class="btn btn--icon" data-act="del" title="Удалить" aria-label="Удалить">' + window.ICONS.trash + '</button>' +
        '  </div>' +
        '  <div class="list" data-el="list"></div>' +
        '</div>'
      );

      root.querySelector('[data-act="up"]').addEventListener('click', function () {
        cwd = window.FS.norm('..', cwd);
        selected = null;
        render();
      });
      root.querySelector('[data-act="refresh"]').addEventListener('click', render);
      root.querySelector('[data-act="newdir"]').addEventListener('click', newDir);
      root.querySelector('[data-act="newfile"]').addEventListener('click', newFile);
      root.querySelector('[data-act="del"]').addEventListener('click', function () {
        if (!selected) { window.UI.toast('Сначала выбери файл'); return; }
        remove(selected);
      });

      api.body.appendChild(root);
      render();
      window.addEventListener('zarya:fs', render);
    }

    return { mount: mount, render: render, open: open };
  })();

  /* ===========================================================
     ЗАМЕТКИ
     =========================================================== */
  const Notes = (function () {
    let root = null;
    let tabs = [];
    let active = null;
    let saveTimer = null;

    function noteFiles() {
      return window.FS.list('/home/notes');
    }

    function open(path) {
      window.WM.open('notes');
      if (tabs.indexOf(path) < 0) tabs.push(path);
      active = path;
      render();
    }

    function saveNow() {
      if (!root || !active) return;
      window.FS.write(active, root.querySelector('[data-el="body"]').value);
      const state = root.querySelector('[data-el="state"]');
      state.textContent = 'сохранено';
    }

    function render() {
      if (!root || !root.isConnected) return;
      if (!tabs.length) {
        const first = noteFiles()[0];
        if (first) tabs.push('/home/notes/' + first.name);
      }
      if (!active || tabs.indexOf(active) < 0) active = tabs[0] || null;

      const strip = root.querySelector('[data-el="tabs"]');
      strip.innerHTML = '';

      tabs.forEach(function (path) {
        const name = path.split('/').pop();
        const tab = h('<button type="button" class="tab"><span class="tab-name"></span><span class="tab-x">' + window.ICONS.close + '</span></button>');
        tab.querySelector('.tab-name').textContent = name;
        tab.classList.toggle('is-active', path === active);
        tab.querySelector('.tab-name').addEventListener('click', function () {
          active = path;
          render();
        });
        tab.querySelector('.tab-x').addEventListener('click', function (e) {
          e.stopPropagation();
          tabs = tabs.filter(function (t) { return t !== path; });
          if (active === path) active = tabs[0] || null;
          render();
        });
        strip.appendChild(tab);
      });

      const body = root.querySelector('[data-el="body"]');
      const state = root.querySelector('[data-el="state"]');
      if (!active) {
        body.value = 'Файлы не выбраны.\nНажми «+», чтобы создать заметку.';
        body.disabled = true;
        state.textContent = '';
        return;
      }
      body.disabled = false;
      body.value = window.FS.read(active) || '';
      state.textContent = 'сохранено';
    }

    function mount(api) {
      root = h(
        '<div class="app notes">' +
        '  <div class="tabs" data-el="tabs"></div>' +
        '  <textarea class="note-area" data-el="body" spellcheck="false" aria-label="Текст заметки"></textarea>' +
        '  <div class="statusbar">' +
        '    <span data-el="state">сохранено</span>' +
        '    <span class="spacer"></span>' +
        '    <button type="button" class="btn btn--sm" data-act="new">Новая заметка</button>' +
        '    <button type="button" class="btn btn--sm" data-act="del">Удалить</button>' +
        '  </div>' +
        '</div>'
      );

      root.querySelector('[data-el="body"]').addEventListener('input', function () {
        if (!active) return;
        const state = root.querySelector('[data-el="state"]');
        state.textContent = 'печатаешь…';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, 450);
      });

      root.querySelector('[data-act="new"]').addEventListener('click', async function () {
        const name = await window.UI.prompt('Новая заметка', 'заметка-' + (noteFiles().length + 1));
        if (!name) return;
        const file = (name.endsWith('.md') ? name : name + '.md');
        const path = '/home/notes/' + file;
        if (!window.FS.touch(path)) { window.UI.toast('Такая заметка уже есть', 'err'); return; }
        tabs.push(path);
        active = path;
        render();
        window.WM.focus('notes');
      });

      root.querySelector('[data-act="del"]').addEventListener('click', async function () {
        if (!active) return;
        const yes = await window.UI.confirm('Удалить заметку?', active, 'Удалить');
        if (!yes) return;
        window.FS.rm(active);
        tabs = tabs.filter(function (t) { return t !== active; });
        active = tabs[0] || null;
        render();
      });

      api.body.appendChild(root);
      tabs = ['/home/notes/заметки.md'];
      active = tabs[0];
      render();
      window.addEventListener('zarya:fs', function () {
        if (root && root.isConnected) render();
      });
    }

    return { mount: mount, open: open, render: render };
  })();

  window.NOTES = Notes;

  /* ===========================================================
     МАГАЗИН
     =========================================================== */
  const Shop = (function () {
    let root = null;

    const ART = {
      cpu:
        '<svg viewBox="0 0 240 120" fill="none" aria-hidden="true">' +
        '<defs>' +
        '<radialGradient id="artCpuGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0" stop-color="var(--accent)" stop-opacity=".5"/>' +
        '<stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<linearGradient id="artCpuDie" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="var(--accent)" stop-opacity=".95"/>' +
        '<stop offset="1" stop-color="var(--accent)" stop-opacity=".35"/>' +
        '</linearGradient>' +
        '</defs>' +
        '<ellipse cx="120" cy="62" rx="98" ry="46" fill="url(#artCpuGlow)"/>' +
        '<g stroke="var(--accent)" stroke-opacity=".32" stroke-width="1.3" stroke-linecap="round">' +
        '<path d="M24 30h28l12 12M24 90h28l12-12M216 30h-28l-12 12M216 90h-28l-12-12M24 60h16M216 60h-16"/>' +
        '<circle cx="24" cy="30" r="2" fill="var(--accent)" stroke="none"/>' +
        '<circle cx="24" cy="90" r="2" fill="var(--accent)" stroke="none"/>' +
        '<circle cx="216" cy="30" r="2" fill="var(--accent)" stroke="none"/>' +
        '<circle cx="216" cy="90" r="2" fill="var(--accent)" stroke="none"/>' +
        '</g>' +
        '<rect x="80" y="20" width="80" height="80" rx="11" fill="#0c1a25" stroke="var(--accent)" stroke-opacity=".55"/>' +
        '<rect x="92" y="32" width="56" height="56" rx="6" fill="url(#artCpuDie)" opacity=".22"/>' +
        '<rect x="104" y="44" width="32" height="32" rx="5" fill="url(#artCpuDie)"/>' +
        '<g stroke="#0a141c" stroke-width="2.4" opacity=".6">' +
        '<path d="M110 52h8M122 52h8M110 60h20M110 68h8M122 68h8"/>' +
        '</g>' +
        '<g stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-opacity=".75">' +
        '<path d="M96 10v10M112 10v10M128 10v10M144 10v10M96 100v10M112 100v10M128 100v10M144 100v10"/>' +
        '<path d="M70 36h10M70 52h10M70 68h10M70 84h10M160 36h10M160 52h10M160 68h10M160 84h10"/>' +
        '</g>' +
        '</svg>',
      proxy:
        '<svg viewBox="0 0 240 120" fill="none" aria-hidden="true">' +
        '<defs><radialGradient id="artProxyGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0" stop-color="var(--accent)" stop-opacity=".38"/>' +
        '<stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>' +
        '</radialGradient></defs>' +
        '<ellipse cx="120" cy="60" rx="104" ry="46" fill="url(#artProxyGlow)"/>' +
        '<path d="M50 78L92 40l52 36 46-44" stroke="var(--accent)" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="5 5" stroke-linecap="round"/>' +
        '<g>' +
        '<circle cx="50" cy="78" r="21" stroke="var(--accent)" stroke-opacity=".18"/>' +
        '<circle cx="50" cy="78" r="12" fill="#0c1a25" stroke="var(--accent)" stroke-opacity=".7"/>' +
        '<circle cx="50" cy="78" r="4.5" fill="var(--accent)"/>' +
        '<circle cx="92" cy="40" r="16" stroke="var(--accent)" stroke-opacity=".2"/>' +
        '<circle cx="92" cy="40" r="9" fill="#0c1a25" stroke="var(--accent)" stroke-opacity=".6"/>' +
        '<circle cx="92" cy="40" r="3.4" fill="var(--accent)"/>' +
        '<circle cx="144" cy="76" r="24" stroke="var(--accent)" stroke-opacity=".16"/>' +
        '<circle cx="144" cy="76" r="13" fill="#0c1a25" stroke="var(--accent)" stroke-opacity=".7"/>' +
        '<circle cx="144" cy="76" r="5" fill="var(--accent)"/>' +
        '<circle cx="190" cy="32" r="20" stroke="var(--accent)" stroke-opacity=".18"/>' +
        '<circle cx="190" cy="32" r="11" fill="#0c1a25" stroke="var(--accent)" stroke-opacity=".7"/>' +
        '<circle cx="190" cy="32" r="4.2" fill="var(--accent)"/>' +
        '</g>' +
        '<g stroke="var(--accent)" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round">' +
        '<path d="M186 96h28M196 88h8M200 104h20"/>' +
        '<path d="M26 40h22M30 32h14"/>' +
        '</g>' +
        '</svg>',
      scripts:
        '<svg viewBox="0 0 240 120" fill="none" aria-hidden="true">' +
        '<defs><radialGradient id="artScrGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/>' +
        '<stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>' +
        '</radialGradient></defs>' +
        '<ellipse cx="120" cy="62" rx="98" ry="48" fill="url(#artScrGlow)"/>' +
        '<rect x="44" y="22" width="152" height="80" rx="9" fill="#0c1a25" stroke="var(--accent)" stroke-opacity=".5"/>' +
        '<path d="M44 38h152" stroke="var(--accent)" stroke-opacity=".3"/>' +
        '<g fill="var(--accent)" opacity=".55">' +
        '<circle cx="56" cy="30" r="2.6"/><circle cx="66" cy="30" r="2.6"/><circle cx="76" cy="30" r="2.6"/>' +
        '</g>' +
        '<g stroke-linecap="round" stroke-width="3">' +
        '<path d="M58 52h44" stroke="var(--accent)" stroke-opacity=".85"/>' +
        '<path d="M58 63h72" stroke="var(--accent)" stroke-opacity=".45"/>' +
        '<path d="M58 74h56" stroke="var(--accent)" stroke-opacity=".6"/>' +
        '<path d="M58 85h32" stroke="var(--accent)" stroke-opacity=".35"/>' +
        '</g>' +
        '<path d="M154 46l-22 30h18l-8 26 26-34h-18z" fill="var(--accent)" fill-opacity=".85" stroke="#0c1a25" stroke-width="2" stroke-linejoin="round"/>' +
        '<g stroke="var(--accent)" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round">' +
        '<path d="M24 30h10M24 40h6M206 88h12M212 78h8"/>' +
        '</g>' +
        '</svg>',
      ice:
        '<svg viewBox="0 0 240 120" fill="none" aria-hidden="true">' +
        '<defs>' +
        '<linearGradient id="artIceA" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#8fe9ff" stop-opacity=".85"/>' +
        '<stop offset="1" stop-color="#2f9fe0" stop-opacity=".18"/>' +
        '</linearGradient>' +
        '<linearGradient id="artIceB" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#c8f4ff" stop-opacity=".9"/>' +
        '<stop offset="1" stop-color="#4cc2ff" stop-opacity=".15"/>' +
        '</linearGradient>' +
        '<radialGradient id="artIceGlow" cx="50%" cy="60%" r="50%">' +
        '<stop offset="0" stop-color="#7fe3ff" stop-opacity=".4"/>' +
        '<stop offset="1" stop-color="#7fe3ff" stop-opacity="0"/>' +
        '</radialGradient>' +
        '</defs>' +
        '<ellipse cx="120" cy="76" rx="98" ry="38" fill="url(#artIceGlow)"/>' +
        '<path d="M22 96h196" stroke="#7fe3ff" stroke-opacity=".35" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M64 96l24-58 26 58z" fill="url(#artIceA)" stroke="#bff2ff" stroke-opacity=".55"/>' +
        '<path d="M104 96l30-74 34 74z" fill="url(#artIceB)" stroke="#dff9ff" stroke-opacity=".7"/>' +
        '<path d="M152 96l20-44 24 44z" fill="url(#artIceA)" stroke="#bff2ff" stroke-opacity=".5"/>' +
        '<g stroke="#e9fcff" stroke-opacity=".45" stroke-width="1.2" stroke-linecap="round">' +
        '<path d="M134 22v30M134 60v28M78 58l12 20M166 52l-10 22"/>' +
        '</g>' +
        '<g stroke="#bff2ff" stroke-width="1.6" stroke-linecap="round" stroke-opacity=".7">' +
        '<path d="M34 34l8 8M42 34l-8 8M196 30l6 6M202 30l-6 6M184 72l5 5M189 72l-5 5"/>' +
        '</g>' +
        '</svg>'
    };

    function render() {
      if (!root || !root.isConnected) return;
      const G = window.Game;
      root.querySelector('[data-el="money"]').textContent = fmt(G.money()) + ' ₡';
      const grid = root.querySelector('[data-el="grid"]');
      grid.innerHTML = '';

      G.shop().forEach(function (item) {
        const lvl = G.level(item.id);
        const maxed = lvl >= item.max;
        const cost = maxed ? 0 : item.costs[lvl];
        const card = h(
          '<article class="shop-card">' +
          '  <div class="shop-art">' + (ART[item.id] || '') + '</div>' +
          '  <header><h3></h3><span class="lvl"></span></header>' +
          '  <p class="desc"></p>' +
          (item.effect ? '  <span class="shop-effect">' + item.effect + '</span>' : '') +
          '  <div class="pips"></div>' +
          '  <footer><b class="cost"></b><button type="button" class="btn btn--primary btn--sm">Купить</button></footer>' +
          '</article>'
        );
        card.querySelector('h3').textContent = item.name;
        card.querySelector('.lvl').textContent = item.levels[lvl];
        card.querySelector('.desc').textContent = item.desc;
        const pips = card.querySelector('.pips');
        for (let i = 0; i < item.max; i++) {
          const p = document.createElement('i');
          if (i < lvl) p.className = 'on';
          pips.appendChild(p);
        }
        card.querySelector('.cost').textContent = maxed ? 'максимум' : (item.id === 'gpu' || item.id === 'ram' ? fmt(cost) + ' арк. кр.' : fmt(cost) + ' ₡');
        const btn = card.querySelector('button');
        btn.textContent = maxed ? 'Установлено' : 'Улучшить';
        btn.disabled = maxed;
        btn.addEventListener('click', function () {
          const r = G.buy(item.id);
          window.UI.toast(r.msg, r.ok ? 'ok' : 'err');
          render();
        });
        grid.appendChild(card);
      });

      const bonuses = [
        { label: 'скорость brute', value: G.level('cpu') * 45, max: 180, sign: '+' },
        { label: 'снижение следа', value: G.level('proxy') * 18, max: 72, sign: '−' },
        { label: 'награда за заказ', value: G.level('scripts') * 15, max: 30, sign: '+' },
        { label: 'след от download', value: G.level('ice') * 30, max: 60, sign: '−' }
      ];
      const bonusBox = root.querySelector('[data-el="bonus"]');
      bonusBox.innerHTML = '';
      bonuses.forEach(function (b) {
        const row = h(
          '<div class="bonus">' +
          '  <span></span>' +
          '  <b></b>' +
          '  <div class="bonus-bar"><i></i></div>' +
          '</div>'
        );
        row.querySelector('span').textContent = b.label;
        row.querySelector('b').textContent = b.value ? b.sign + b.value + '%' : '0%';
        row.querySelector('.bonus-bar i').style.width = Math.min(100, (b.value / b.max) * 100) + '%';
        bonusBox.appendChild(row);
      });
    }

    function mount(api) {
      root = h(
        '<div class="app shop">' +
        '  <div class="app-head">' +
        '    <div><h2>Магазин</h2><p class="muted">Железо, прокси и скрипты. Оплата из баланса.</p></div>' +
        '    <div class="balance"><span>Баланс</span><b data-el="money">0 ₡</b></div>' +
        '  </div>' +
        '  <div class="shop-grid" data-el="grid"></div>' +
        '  <section class="shop-bonuses">' +
        '    <h3>Текущие бонусы</h3>' +
        '    <div class="bonus-grid" data-el="bonus"></div>' +
        '  </section>' +
        '  <p class="shop-note">Апгрейды покупаются один раз и работают до конца сессии. ' +
        'Деньги приходят только за выполненные заказы. Если след дойдёт до 100% — штраф 35% баланса.</p>' +
        '</div>'
      );
      api.body.appendChild(root);
      render();
      window.addEventListener('zarya:game', render);
    }

    return { mount: mount, render: render };
  })();

  /* ===========================================================
     НАСТРОЙКИ
     =========================================================== */
  const SettingsApp = (function () {
    let root = null;

    function render() {
      if (!root || !root.isConnected) return;
      const S = window.Settings;
      const st = S.all();
      root.querySelectorAll('[data-theme-opt]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-theme-opt') === st.theme);
      });
      root.querySelectorAll('[data-wall-opt]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-wall-opt') === st.wall);
      });
      root.querySelectorAll('[data-accent-opt]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-accent-opt') === st.accent);
      });
      root.querySelector('[data-switch="transparency"]').checked = st.transparency;
      root.querySelector('[data-switch="motion"]').checked = st.motion;
      const stats = window.Game.stats();
      root.querySelector('[data-el="stats"]').textContent =
        'Заказов выполнено: ' + stats.missionsDone + ' / ' + stats.missionsTotal +
        ' · узлов взломано: ' + stats.pwned + ' / ' + stats.total +
        ' · заработано: ' + fmt(stats.earned) + ' ₡ · выявлений: ' + stats.caught;
    }

    function mount(api) {
      const accents = window.Settings.accents.map(function (a) {
        return '<button type="button" class="swatch" data-accent-opt="' + a.id + '" title="' + a.label + '" ' +
          'style="--sw:' + a.swatch + '"><i></i></button>';
      }).join('');

      const walls = window.Settings.walls.map(function (w) {
        return '<button type="button" class="wall-opt" data-wall-opt="' + w.id + '">' +
          '<span class="wall-thumb is-' + w.id + '"></span>' +
          '<span class="wall-label">' + w.label + '</span>' +
          '<span class="wall-hint">' + w.hint + '</span>' +
          '</button>';
      }).join('');

      root = h(
        '<div class="app settings">' +
        '  <div class="set-body">' +
        '    <h2>Персонализация</h2>' +
        '    <section class="set-sec">' +
        '      <h3>Тема</h3>' +
        '      <div class="theme-opts">' +
        '        <button type="button" class="theme-opt" data-theme-opt="light"><span class="theme-prev is-light"></span>Светлая</button>' +
        '        <button type="button" class="theme-opt" data-theme-opt="dark"><span class="theme-prev is-dark"></span>Тёмная</button>' +
        '      </div>' +
        '    </section>' +
        '    <section class="set-sec">' +
        '      <h3>Цвет акцента</h3>' +
        '      <div class="swatches">' + accents + '</div>' +
        '    </section>' +
        '    <section class="set-sec">' +
        '      <h3>Обои</h3>' +
        '      <div class="wall-opts">' + walls + '</div>' +
        '    </section>' +
        '    <section class="set-sec">' +
        '      <h3>Эффекты</h3>' +
        '      <label class="switch-row"><span>Прозрачность и размытие</span>' +
        '        <input type="checkbox" class="switch" data-switch="transparency"><i></i></label>' +
        '      <label class="switch-row"><span>Анимации</span>' +
        '        <input type="checkbox" class="switch" data-switch="motion"><i></i></label>' +
        '    </section>' +
        '    <section class="set-sec">' +
        '      <h3>Игра</h3>' +
        '      <p class="muted" data-el="stats"></p>' +
        '      <div class="set-actions">' +
        '        <button type="button" class="btn" data-act="reset-theme">Сбросить оформление</button>' +
        '        <button type="button" class="btn btn--danger" data-act="reset-game">Начать заново</button>' +
        '      </div>' +
        '    </section>' +
        '    <p class="set-foot">ЗАРЯ OS 1.2 · всё вымышлено, все узлы и пароли — часть игры.</p>' +
        '  </div>' +
        '</div>'
      );

      root.querySelectorAll('[data-theme-opt]').forEach(function (b) {
        b.addEventListener('click', function () { window.Settings.set('theme', b.getAttribute('data-theme-opt')); render(); });
      });
      root.querySelectorAll('[data-accent-opt]').forEach(function (b) {
        b.addEventListener('click', function () { window.Settings.set('accent', b.getAttribute('data-accent-opt')); render(); });
      });
      root.querySelectorAll('[data-wall-opt]').forEach(function (b) {
        b.addEventListener('click', function () { window.Settings.set('wall', b.getAttribute('data-wall-opt')); render(); });
      });
      root.querySelectorAll('.switch').forEach(function (sw) {
        sw.addEventListener('change', function () {
          window.Settings.set(sw.getAttribute('data-switch'), sw.checked);
          render();
        });
      });

      root.querySelector('[data-act="reset-theme"]').addEventListener('click', function () {
        window.Settings.reset();
        render();
        window.UI.toast('Оформление сброшено');
      });
      root.querySelector('[data-act="reset-game"]').addEventListener('click', async function () {
        const yes = await window.UI.confirm('Начать заново?', 'Прогресс, деньги и взломанные узлы обнулятся.', 'Начать заново');
        if (!yes) return;
        window.Game.reset();
        window.FS.reset();
        window.UI.toast('Новая игра');
        render();
      });

      api.body.appendChild(root);
      render();
      window.addEventListener('zarya:settings', render);
      window.addEventListener('zarya:game', render);
    }

    return { mount: mount, render: render };
  })();

  /* ===========================================================
     О СИСТЕМЕ
     =========================================================== */
  const About = (function () {
    function mount(api) {
      const stats = window.Game.stats();
      const box = h(
        '<div class="app about">' +
        '  <div class="about-head">' +
        '    <span class="about-logo">' + window.ICONS.start + '</span>' +
        '    <div><h2>ЗАРЯ OS</h2><p class="muted">версия 1.4 «Сборка ПК» · сборка 20261118</p></div>' +
        '  </div>' +
        '  <div class="about-grid">' +
        '    <div><span>Процессор</span><b data-el="cpu">1 ядро</b></div>' +
        '    <div><span>Память и файлы</span><b data-el="fs">0</b></div>' +
        '    <div><span>Узлов взломано</span><b data-el="pwned">0</b></div>' +
        '    <div><span>Заказов закрыто</span><b data-el="miss">0</b></div>' +
        '    <div><span>Баланс</span><b data-el="money">0 ₡</b></div>' +
        '    <div><span>Репутация</span><b data-el="rep">0</b></div>' +
        '  </div>' +
        '  <div class="about-text">' +
        '    <p>ЗАРЯ OS — вымышленная система и хакер-симулятор в одном флаконе. ' +
        'Никаких реальных сетей, адресов и уязвимостей: всё, что происходит в терминале, живёт только в этом файле.</p>' +
        '    <p>Прогресс хранится в localStorage браузера. Сбросить — в Настройках.</p>' +
        '  </div>' +
        '</div>'
      );
      box.querySelector('[data-el="cpu"]').textContent = window.Game.installedPart('cpu').name;
      box.querySelector('[data-el="fs"]').textContent = window.FS.formatBytes(window.FS.size());
      box.querySelector('[data-el="pwned"]').textContent = stats.pwned + ' / ' + stats.total;
      box.querySelector('[data-el="miss"]').textContent = stats.missionsDone + ' / ' + stats.missionsTotal;
      box.querySelector('[data-el="money"]').textContent = fmt(stats.money) + ' ₡';
      box.querySelector('[data-el="rep"]').textContent = String(stats.rep);
      api.body.appendChild(box);
      window.addEventListener('zarya:game', function () {
        if (!box.isConnected) return;
        const s = window.Game.stats();
        box.querySelector('[data-el="pwned"]').textContent = s.pwned + ' / ' + s.total;
        box.querySelector('[data-el="money"]').textContent = fmt(s.money) + ' ₡';
        box.querySelector('[data-el="rep"]').textContent = String(s.rep);
      });
    }
    return { mount: mount };
  })();

  /* ===========================================================
     РЕЕСТР
     =========================================================== */
  window.APPS = {
    terminal: {
      name: 'Терминал',
      icon: window.APPICONS.terminal,
      w: 780,
      h: 520,
      mount: Terminal.mount,
      onFocus: Terminal.focus
    },
    mail: {
      name: 'Почта',
      icon: window.APPICONS.mail,
      w: 880,
      h: 560,
      mount: Mail.mount
    },
    netmap: {
      name: 'Сеть',
      icon: window.APPICONS.netmap,
      w: 900,
      h: 580,
      mount: Netmap.mount
    },
    files: {
      name: 'Проводник',
      icon: window.APPICONS.files,
      w: 820,
      h: 540,
      mount: Files.mount
    },
    notes: {
      name: 'Заметки',
      icon: window.APPICONS.notes,
      w: 760,
      h: 540,
      mount: Notes.mount
    },
    shop: {
      name: 'Магазин',
      icon: window.APPICONS.shop,
      w: 820,
      h: 540,
      mount: Shop.mount
    },
    settings: {
      name: 'Настройки',
      icon: window.APPICONS.settings,
      w: 780,
      h: 580,
      mount: SettingsApp.mount
    },
    about: {
      name: 'О системе',
      icon: window.APPICONS.about,
      w: 620,
      h: 500,
      mount: About.mount
    }
  };
})();
