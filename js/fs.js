/* ЗАРЯ OS — виртуальная файловая система (localStorage). */
(function () {
  const KEY = 'zarya.fs.v3';

  const NOTES =
    '# Заметки\n\n' +
    'Пароли не храню. Всё, что нашёл — в /home/loot.\n\n' +
    'Памятка по терминалу:\n' +
    '  scan <ip>            посмотреть порты узла\n' +
    '  connect <ip>         подключиться\n' +
    '  brute                подобрать пароль\n' +
    '  login <логин> <пароль>\n' +
    '  ls / cat <файл>      осмотреть узел\n' +
    '  download <файл>      забрать файл себе\n' +
    '  hide                 сбросить след\n' +
    '  shop / buy <id>      апгрейды\n\n' +
    'Если след дойдёт до 100% — тебя вычислят и оштрафуют.\n';

  const README =
    'ЗАРЯ OS 1.1 «Ночная смена» — карманная операционная система.\n' +
    'Собрана на HTML, CSS и чистом JavaScript.\n\n' +
    'Файлы, заметки, прогресс и настройки лежат в localStorage браузера.\n' +
    'Никаких серверов, никакого интернета: вся сеть внутри игры.\n';

  function seed() {
    return {
      type: 'dir',
      name: '',
      children: [
        {
          type: 'dir',
          name: 'home',
          children: [
            {
              type: 'dir',
              name: 'notes',
              children: [{ type: 'file', name: 'заметки.md', body: NOTES }]
            },
            { type: 'dir', name: 'loot', children: [] },
            { type: 'file', name: 'readme.txt', body: README }
          ]
        },
        {
          type: 'dir',
          name: 'system',
          children: [
            { type: 'file', name: 'version.txt', body: 'ЗАРЯ OS 1.1 build 20261118' },
            { type: 'file', name: 'hosts.txt', body: 'zarya   127.0.0.1\nrelay   10.0.0.1' }
          ]
        }
      ]
    };
  }

  let root;
  let broken = false;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      const data = JSON.parse(raw);
      if (!data || data.type !== 'dir' || !Array.isArray(data.children)) return seed();
      return data;
    } catch (e) {
      broken = true;
      return seed();
    }
  }

  root = load();

  function persist() {
    if (broken) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(root));
    } catch (e) {
      broken = true;
    }
    window.dispatchEvent(new CustomEvent('zarya:fs'));
  }

  function norm(path, cwd) {
    if (!path) path = '/';
    let p = String(path);
    if (p === '~') p = '/home';
    else if (p.indexOf('~/') === 0) p = '/home/' + p.slice(2);
    if (p.charAt(0) !== '/') p = (cwd || '/') + '/' + p;
    const out = [];
    p.split('/').forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') out.pop();
      else out.push(part);
    });
    return '/' + out.join('/');
  }

  function nodeAt(path) {
    const parts = norm(path).split('/').filter(Boolean);
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      if (!cur || cur.type !== 'dir') return null;
      const next = cur.children.find(function (c) { return c.name === parts[i]; });
      if (!next) return null;
      cur = next;
    }
    return cur;
  }

  function parentOf(path) {
    const p = norm(path);
    if (p === '/') return { parent: null, name: '' };
    const idx = p.lastIndexOf('/');
    const dir = idx === 0 ? '/' : p.slice(0, idx);
    return { parent: nodeAt(dir), name: p.slice(idx + 1), dir: dir };
  }

  const FS = {
    norm: norm,
    exists: function (path) { return !!nodeAt(path); },
    node: nodeAt,
    isDir: function (path) { const n = nodeAt(path); return !!n && n.type === 'dir'; },

    list: function (path) {
      const n = nodeAt(path);
      if (!n || n.type !== 'dir') return [];
      return n.children.slice().sort(function (a, b) {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name, 'ru');
      });
    },

    read: function (path) {
      const n = nodeAt(path);
      if (!n || n.type !== 'file') return null;
      return n.body || '';
    },

    write: function (path, body) {
      const info = parentOf(path);
      if (!info.parent || info.parent.type !== 'dir') return false;
      let n = info.parent.children.find(function (c) { return c.name === info.name; });
      if (!n) {
        n = { type: 'file', name: info.name, body: '' };
        info.parent.children.push(n);
      }
      if (n.type !== 'file') return false;
      n.body = String(body);
      persist();
      return true;
    },

    touch: function (path) {
      if (nodeAt(path)) return false;
      return FS.write(path, '');
    },

    mkdir: function (path) {
      const info = parentOf(path);
      if (!info.parent || info.parent.type !== 'dir') return false;
      if (info.parent.children.some(function (c) { return c.name === info.name; })) return false;
      info.parent.children.push({ type: 'dir', name: info.name, children: [] });
      persist();
      return true;
    },

    rm: function (path) {
      const info = parentOf(path);
      if (!info.parent) return false;
      const i = info.parent.children.findIndex(function (c) { return c.name === info.name; });
      if (i < 0) return false;
      info.parent.children.splice(i, 1);
      persist();
      return true;
    },

    rename: function (path, nextName) {
      const clean = String(nextName || '').trim().replace(/[\\/]/g, '');
      if (!clean) return false;
      const info = parentOf(path);
      if (!info.parent) return false;
      if (clean === info.name) return true;
      if (info.parent.children.some(function (c) { return c.name === clean; })) return false;
      const node = info.parent.children.find(function (c) { return c.name === info.name; });
      if (!node) return false;
      node.name = clean;
      persist();
      return true;
    },

    size: function () {
      try { return JSON.stringify(root).length; } catch (e) { return 0; }
    },

    reset: function () {
      root = seed();
      persist();
    },

    formatBytes: function (n) {
      if (n < 1024) return n + ' Б';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' КБ';
      return (n / 1048576).toFixed(2) + ' МБ';
    }
  };

  window.FS = FS;
})();
