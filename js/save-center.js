/* ZARYA OS 2.1 — archive export with settings-only import to protect game economy. */
(function () {
  'use strict';
  const KEYS = [
    'zarya.seen','zarya.settings.v2','zarya.fs.v3','zarya.game.v1',
    'zarya.hardware.v1','zarya.components.v2',
    'zarya.service.v1','zarya.pc-orders.v1','zarya.cooling.v1',
    'zarya.market.v1','zarya.company.v1','zarya.pro-workshop.v1','zarya.ops.v1'
  ];
  const MAX_FILE = 3 * 1024 * 1024;
  const MAX_VALUE = 2 * 1024 * 1024;
  const FORMAT = 'zarya-os-save';
  const S = {
    keys: KEYS.slice(),
    getSummary: function () {
      const items = [];
      KEYS.forEach(function (key) {
        let raw = null;
        try { raw = localStorage.getItem(key); } catch (e) {}
        if (raw !== null) items.push({ key: key, size: raw.length });
      });
      return { count: items.length, items: items, length: items.reduce((n, i) => n + i.size, 0) };
    },
    makeBackup: function () {
      const records = Object.create(null);
      KEYS.forEach(function (key) {
        const raw = localStorage.getItem(key);
        if (raw !== null) records[key] = raw;
      });
      const backup = {
        format: FORMAT, schema: 1, version: '2.2.0',
        exportedAt: new Date().toISOString(), data: records
      };
      const serialized = JSON.stringify(backup, null, 2);
      if (serialized.length > MAX_FILE) throw new Error('Слишком большое сохранение для одного архива.');
      return serialized;
    },
    validate: function (text) {
      if (typeof text !== 'string' || text.length > MAX_FILE || text.length < 10) {
        return { ok: false, msg: 'Файл не подходит или превышает ограничение 3 МБ.' };
      }
      let backup;
      try { backup = JSON.parse(text); } catch (e) {
        return { ok: false, msg: 'Файл содержит некорректный JSON.' };
      }
      if (!backup || typeof backup !== 'object' || Array.isArray(backup) ||
          backup.format !== FORMAT || backup.schema !== 1 ||
          !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
        return { ok: false, msg: 'Файл не является резервной копией Zarya OS.' };
      }
      const keys = Object.keys(backup.data);
      if (!keys.length) return { ok: false, msg: 'В резервной копии нет данных.' };
      if (keys.some(key => !KEYS.includes(key))) {
        return { ok: false, msg: 'Архив содержит неизвестные ключи сохранений.' };
      }
      const values = Object.create(null);
      let total = 0;
      for (const key of keys) {
        const value = backup.data[key];
        if (key === 'zarya.seen') {
          if (value !== '0' && value !== '1') return { ok: false, msg: 'Повреждённый флаг приветствия.' };
          values[key] = value;
          total += 1;
          continue;
        }
        if (typeof value !== 'string' || value.length > MAX_VALUE || value.length < 2) {
          return { ok: false, msg: 'Повреждённый или слишком большой блок: ' + key };
        }
        let parsed;
        try { parsed = JSON.parse(value); } catch (e) {
          return { ok: false, msg: 'Некорректные данные в блоке: ' + key };
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { ok: false, msg: 'Неподдерживаемый формат блока: ' + key };
        }
        const versions = {
          'zarya.game.v1': ['v', 1],
          'zarya.components.v2': ['v', 2],
          'zarya.company.v1': ['v', 1],
          'zarya.pro-workshop.v1': ['v', 1],
          'zarya.ops.v1': ['v', 1],
          'zarya.market.v1': ['v', 1],
          'zarya.service.v1': ['version', 1],
          'zarya.pc-orders.v1': ['version', 1],
          'zarya.cooling.v1': ['version', 1]
        };
        if (versions[key] && parsed[versions[key][0]] !== versions[key][1]) {
          return { ok: false, msg: 'Неподдерживаемая версия блока: ' + key };
        }
        total += value.length;
        if (total > MAX_FILE) return { ok: false, msg: 'Слишком большой архив данных.' };
        values[key] = value;
      }
      return {
        ok: true, data: values, count: keys.length, size: total,
        restorable: typeof values['zarya.settings.v2'] === 'string',
        exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : '',
        version: typeof backup.version === 'string' ? backup.version : '?',
        msg: 'Найдено ' + keys.length + ' разделов сохранения.'
      };
    },
    restore: function (validated) {
      if (!validated || validated.ok !== true || !validated.data ||
          typeof validated.data !== 'object') return { ok: false, msg: 'Сначала проверь архив.' };
      // JSON money, achievements, missions and hardware never reach persistent storage.
      // A local file is not a server-authenticated source of funds.
      const raw=validated.data['zarya.settings.v2'];
      if (typeof raw !== 'string') return {
        ok: false, msg: 'В этом архиве нет настроек. Игровой прогресс импортировать запрещено.'
      };
      let parsed;
      try { parsed=JSON.parse(raw); } catch(e) {
        return { ok: false, msg: 'Повреждён раздел настроек.' };
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, msg: 'Формат настроек не поддерживается.' };
      }
      try {
        localStorage.setItem('zarya.settings.v2',raw);
        return { ok: true, msg: 'Настройки импортированы. Деньги, детали и достижения не изменены.' };
      } catch (e) {
        return { ok: false, msg: 'Не удалось сохранить настройки.' };
      }
    }
  };
  window.SaveCenterCore = S;

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  const App = (function () {
    let root = null, picked = null;
    function status(s, error) {
      if (!root) return;
      const out = root.querySelector('[data-save="status"]');
      out.textContent = s;
      out.classList.toggle('error', !!error);
    }
    function summary() {
      if (!root) return;
      const info = S.getSummary();
      root.querySelector('[data-save="count"]').textContent = String(info.count);
      root.querySelector('[data-save="size"]').textContent = Math.round(info.length / 1024) + ' КБ';
      const list = root.querySelector('[data-save="list"]');
      list.replaceChildren();
      info.items.forEach(function(item) {
        const row = el('<div class="sv-key"><span></span><b></b></div>');
        row.querySelector('span').textContent = item.key;
        row.querySelector('b').textContent = Math.max(1, Math.round(item.size / 1024)) + ' КБ';
        list.appendChild(row);
      });
      if (!info.count) list.appendChild(el('<p class="muted">Пока нет локальных сохранений.</p>'));
    }
    function exportClick() {
      try {
        const text = S.makeBackup();
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'zarya-os-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
        status('Архив создан. Браузер сохранил JSON-файл локально.');
      } catch (e) {
        status('Не удалось создать архив: ' + (e.message || 'ошибка доступа'), true);
      }
    }
    function preview(text, name) {
      const validated = S.validate(text);
      picked = validated.ok ? validated : null;
      root.querySelector('[data-save="restore"]').disabled = !validated.restorable;
      root.querySelector('[data-save="preview"]').replaceChildren();
      if (validated.ok) {
        const content = el('<div class="sv-preview"><strong></strong><span></span><small></small></div>');
        content.querySelector('strong').textContent = name;
        content.querySelector('span').textContent =
          validated.count + ' разделов · ' + Math.round(validated.size / 1024) + ' КБ';
        content.querySelector('small').textContent = 'Создан: ' + (validated.exportedAt || 'неизвестно') +
          ' · Версия игры: ' + validated.version;
        root.querySelector('[data-save="preview"]').appendChild(content);
      }
      status(validated.ok
        ? validated.msg + (validated.restorable
            ? ' Можно восстановить только оформление и настройки.'
            : ' Игровой прогресс импортировать нельзя.')
        : validated.msg, !validated.ok);
    }
    function mount(api) {
      root = el('<div class="app sv-app"><header class="app-head"><div><h2>Центр сохранений</h2>' +
        '<p class="muted">Архив прогресса и безопасный импорт настроек · версия 2.1</p></div>' +
        '<div class="sv-counter"><strong data-save="count">0</strong><span>разделов</span></div></header>' +
        '<section class="sv-hero"><div class="sv-disk-art"><span>2.0</span></div><div>' +
        '<h3>Экспортируй архив игрового прогресса</h3>' +
        '<p>Деньги, инвентарь, задания, достижения, состояние компьютера, настройки и записи. ' +
        'Файл остаётся на твоём устройстве. Ради честной экономики импорт игровых данных отключён.</p>' +
        '<span>Объём данных: <b data-save="size"></b></span></div></section>' +
        '<div class="sv-actions"><section><h3>Создать резервную копию</h3>' +
        '<p>Экспортирует все известные разделы в один JSON-файл.</p>' +
        '<button type="button" class="btn btn--primary" data-save="export">Скачать архив</button></section>' +
        '<section><h3>Импортировать настройки</h3>' +
        '<p>Выбери JSON-архив. Для защиты экономики можно восстановить только настройки — не деньги, детали и достижения.</p>' +
        '<input type="file" accept=".json,application/json" data-save="file">' +
        '<div data-save="preview"></div><button type="button" class="btn" data-save="restore" disabled>' +
        'Восстановить настройки</button></section></div>' +
        '<p class="sv-warning">Импорт не меняет деньги или достижения. Старые игровые сохранения восстановить нельзя. ' +
        'Сначала сделай резервную копию нынешнего сохранения.</p>' +
        '<p class="sv-status" data-save="status" role="status">Готово к работе.</p>' +
        '<section class="sv-saved-keys"><h3>Разделы, которые попадут в архив</h3>' +
        '<div data-save="list"></div></section></div>');
      api.body.appendChild(root);
      root.querySelector('[data-save="export"]').addEventListener('click', exportClick);
      root.querySelector('[data-save="file"]').addEventListener('change', function () {
        const file = this.files && this.files[0];
        picked = null;
        root.querySelector('[data-save="restore"]').disabled = true;
        if (!file) return;
        if (file.size > MAX_FILE) { status('Файл слишком большой. Максимум 3 МБ.', true); return; }
        const reader = new FileReader();
        reader.onload = function () { preview(String(reader.result || ''), file.name); };
        reader.onerror = function () { status('Не удалось прочитать файл.', true); };
        reader.readAsText(file, 'utf-8');
      });
      root.querySelector('[data-save="restore"]').addEventListener('click', function () {
        if (!picked) return;
        window.UI.confirm('Заменить настройки?',
          'Только настройки интерфейса будут заменены данными архива. Деньги, компания и инвентарь останутся без изменений. Продолжить?',
          'Импортировать').then(function(ok) {
          if (!ok) return;
          const result = S.restore(picked);
          status(result.msg, !result.ok);
          if (result.ok) window.location.reload();
        });
      });
      summary();
    }
    function close() { root = null; picked = null; }
    return { mount: mount, close: close };
  })();

  window.APPICONS.saveCenter = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect x="4" y="3" width="24" height="26" rx="4" fill="#4a5c91"/>' +
    '<path d="M9 4v9h14V4M9 25h14M9 18h14" stroke="#b8e5f9" stroke-width="2"/>' +
    '<rect x="13" y="5" width="6" height="5" rx="1" fill="#8ddfd2"/></svg>';
  window.APPS['save-center'] = {
    name: 'Центр сохранений',icon:window.APPICONS.saveCenter,
    w:850,h:660,mount:App.mount,onClose:App.close
  };
})();