/* ЗАРЯ OS — ядро игры «хакер-симулятор»: сеть, взлом, заказы, деньги, след. */
(function () {
  const KEY = 'zarya.game.v1';

  /* ——— узлы сети ——— */
  const SERVERS = [
    {
      ip: '10.0.0.7',
      name: 'Школьный сервер',
      os: 'Windows Server 2008',
      sec: 1,
      note: 'Машина из кабинета информатики. Пароль наверняка из учебника.',
      ports: [{ n: 21, s: 'ftp' }, { n: 80, s: 'http' }],
      users: [{ u: 'admin', p: 'school123' }, { u: 'guest', p: 'guest' }],
      files: [
        {
          name: 'grades.db',
          body:
            'id;ученик;класс;оценка\n' +
            '1;Иванов А.;9А;5\n2;Петрова М.;9А;5\n3;Сидоров К.;9Б;3\n' +
            '4;Орлова Е.;9Б;4\n5;Волков Д.;9А;2\n...\n' +
            '[дальше идёт компромат на половину школы]'
        },
        {
          name: 'passwords.txt',
          body: 'admin:school123\ndirector:qwerty777\nteacher:12345678\nwifi:school-guest-2026'
        }
      ]
    },
    {
      ip: '172.16.4.12',
      name: 'Бухгалтерия «Ромашка»',
      os: 'Windows 10 Pro',
      sec: 2,
      note: 'Бухгалтерия маленькой фирмы. Сервер подняли впопыхах.',
      ports: [{ n: 22, s: 'ssh' }, { n: 445, s: 'smb' }, { n: 3389, s: 'rdp' }],
      users: [{ u: 'buh', p: 'galina2019' }, { u: 'admin', p: 'Roma$hka' }],
      files: [
        {
          name: 'salary.xlsx',
          body:
            'Табель зарплат за квартал (выдержка):\n' +
            'Смирнова Г. — 68 400\nКовалёв П. — 91 200\nДиректор — 410 000 (не для документов)\n' +
            '...\nПриписка внизу: «Эти цифры не должны выйти из кабинета».'
        },
        {
          name: 'backup.zip',
          body: 'Архив. Внутри — бухгалтерская база за 4 года. Размер: 1.2 ГБ.'
        }
      ]
    },
    {
      ip: '45.13.88.2',
      name: 'Тёмный рынок',
      os: 'Debian 11 (nginx)',
      sec: 3,
      note: 'Закрытый маркетплейс. Хорошего там мало, но платят за данные.',
      ports: [{ n: 443, s: 'https' }, { n: 3306, s: 'mysql' }],
      users: [{ u: 'dealer', p: 'qwerty2020' }, { u: 'root', p: 'market#22' }],
      files: [
        {
          name: 'deals.log',
          body:
            '2026-10-02 03:11 [deal] lot=7182 buyer=anon_9 sum=4.5BTC status=escrow\n' +
            '2026-10-04 23:40 [deal] lot=7190 buyer=shadow sum=0.8BTC status=done\n' +
            '2026-10-11 04:02 [warn]  probe from 91.204.17.55 — сканер портов\n' +
            '2026-10-11 04:03 [info]  «Север» интересуется нашими логами. Убрать зеркало.'
        },
        { name: 'wallet.dat', body: 'Кошелёк: 4.5 BTC. Парольная фраза внутри контейнера.' }
      ]
    },
    {
      ip: '91.204.17.55',
      name: 'Дата-центр «Север»',
      os: 'Ubuntu Server 24.04',
      sec: 4,
      note: 'Промышленный узел. Здесь ходят чужие ключи.',
      ports: [{ n: 22, s: 'ssh' }, { n: 8080, s: 'api' }, { n: 9200, s: 'elastic' }],
      users: [{ u: 'root', p: 'n0rth-wind-26' }, { u: 'deploy', p: 'deploy!' }],
      files: [
        {
          name: 'keys.pem',
          body:
            '-----BEGIN OPENSSH PRIVATE KEY-----\n' +
            'b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz\n' +
            'c2gtZWQyNTUxOQAAACC4n1XqLmZaryaOS...\n' +
            '-----END OPENSSH PRIVATE KEY-----'
        },
        {
          name: 'manifest.json',
          body:
            '{\n  "project": "ЗАРЯ",\n  "nodes": 5,\n  "owner": "relay",\n' +
            '  "note": "узел 10.10.10.10 не трогать — он не наш"\n}'
        }
      ]
    },
    {
      ip: '10.10.10.10',
      name: 'УЗЕЛ 0',
      os: 'неизвестно',
      sec: 5,
      note: 'Порт открыт всегда. Отклик приходит раньше, чем запрос.',
      ports: [{ n: 1, s: '???' }, { n: 443, s: 'https' }],
      users: [{ u: 'null', p: 'zarya' }],
      files: [
        {
          name: 'truth.txt',
          body:
            'Ты не первый, кто сюда зашёл.\n\n' +
            'Все заказы, что тебе присылали, писал я. «Клиенты» — это скрипты.\n' +
            'Мне нужно было посмотреть, как ты работаешь.\n\n' +
            'Если читаешь это — ты дошёл до конца цепочки.\n' +
            'Оставь след в файле zarya.exe и уходи. Дверь за тобой закроется.\n\n' +
            '— relay'
        },
        { name: 'zarya.exe', body: 'Бинарник. Внутри — твоя же сессия, записанная заранее.' }
      ]
    },
    {
      ip: '192.168.88.14',
      name: 'Кофейня FreeWiFi',
      os: 'Linux Mint 21',
      sec: 2,
      note: 'Точка доступа в кофейне. Камера, роутер и чей-то ноутбук на одном пароле.',
      ports: [{ n: 22, s: 'ssh' }, { n: 8080, s: 'http-cam' }],
      users: [{ u: 'barista', p: 'latte2024' }, { u: 'camera', p: 'camera' }],
      files: [
        {
          name: 'wifi.log',
          body:
            '2026-11-16 19:04 [dhcp] 192.168.88.31  a4:5e:60:1c:8f:02\n' +
            '2026-11-16 19:06 [dhcp] 192.168.88.44  3c:22:fb:90:11:7d\n' +
            '2026-11-16 19:11 [auth] guest/guest — повторный вход\n' +
            '2026-11-16 19:12 [warn] клиент 192.168.88.44 собирает пакеты в promisc\n' +
            '2026-11-16 19:20 [dhcp] 192.168.88.52  8c:85:90:aa:03:bc\n' +
            '...\n' +
            '[в конце файла — чужая строка: «он ходит сюда каждый вторник»]'
        },
        {
          name: 'cam_feed.txt',
          body:
            'Поток с камеры у кассы, 1280x720, 12 кадров/с.\n\n' +
            'Кадр 00:42 — очередь из трёх человек, бармен считает мелочь.\n' +
            'Кадр 01:10 — кто-то в капюшоне садится у окна, ноутбук без наклеек.\n' +
            'Кадр 01:58 — экран в отражении витрины: тот же терминал, что у тебя.\n\n' +
            '[запись обрывается на 02:00]'
        }
      ]
    },
    {
      ip: '77.88.44.19',
      name: 'Оператор «Волна»',
      os: 'FreeBSD 13',
      sec: 4,
      note: 'Провинциальный оператор связи. Биллинг, детализация и много чужих номеров.',
      ports: [{ n: 25, s: 'smtp' }, { n: 443, s: 'https' }, { n: 5432, s: 'postgres' }],
      users: [{ u: 'ops', p: 'Volna#2026' }, { u: 'backup', p: 'volna-backup' }],
      files: [
        {
          name: 'subscribers.csv',
          body:
            'msisdn;тариф;баланс;город;флаг\n' +
            '+7 900 112-45-31;Базовый;120.50;Киров;0\n' +
            '+7 900 887-02-14;Семейный;0.00;Киров;1\n' +
            '+7 900 335-77-90;Базовый;340.10;Слободской;0\n' +
            '...\n' +
            '[241 883 строки. На некоторых стоит флаг 1 — принудительная блокировка]'
        },
        {
          name: 'billing.dump',
          body:
            'Дамп биллинга за ноябрь. 240 ГБ сжатых записей.\n' +
            'Внутри — детализация звонков, SMS и сессий по каждому абоненту.\n' +
            'Если это утечёт, пострадают не компании, а люди из списка.'
        }
      ]
    }
  ];

  /* ——— заказы ——— */
  const MISSIONS = [
    {
      id: 's1',
      side: true,
      from: 'БИРЖА',
      fromMail: 'board@zarya.local',
      subject: 'горячий Wi-Fi',
      body:
        'Побочный контракт. Не связан с основной цепочкой.\n\n' +
        'Кофейня на углу, 192.168.88.14. Нужен журнал подключений: wifi.log.\n' +
        'Машина слабая, но у неё общая сеть с камерой — не шуми.\n\n' +
        'Оплата скромная, зато заказ доступен сразу.',
      hint: 'scan 192.168.88.14 → connect → brute → download wifi.log',
      reward: 90,
      rep: 1,
      requires: null,
      server: '192.168.88.14',
      goal: { kind: 'download', file: 'wifi.log' }
    },
    {
      id: 's2',
      side: true,
      from: 'БИРЖА',
      fromMail: 'board@zarya.local',
      subject: 'камера в кофейне',
      body:
        'Побочный контракт.\n\n' +
        'Тот же адрес, 192.168.88.14. Прочитай cam_feed.txt прямо на узле, ' +
        'скачивать запись не нужно — её слишком много.\n\n' +
        'Говорят, в кадре есть кто-то знакомый.',
      hint: 'connect 192.168.88.14 → cat cam_feed.txt',
      reward: 130,
      rep: 0,
      requires: null,
      server: '192.168.88.14',
      goal: { kind: 'read', file: 'cam_feed.txt' }
    },
    {
      id: 's3',
      side: true,
      from: 'БИРЖА',
      fromMail: 'board@zarya.local',
      subject: 'абоненты «Волны»',
      body:
        'Побочный контракт. Оплата высокая, потому что узел злой.\n\n' +
        '77.88.44.19, региональный оператор связи. Нужен subscribers.csv — ' +
        'список абонентов с тарифами и балансами.\n\n' +
        'postgres наружу, пароли свежие. Без процессора и прокси не суйся.',
      hint: 'Узел уровня 4: подними cpu и proxy в магазине.',
      reward: 700,
      rep: 1,
      requires: null,
      server: '77.88.44.19',
      goal: { kind: 'download', file: 'subscribers.csv' }
    },
    {
      id: 'm1',
      from: 'relay',
      fromMail: 'relay@zarya.local',
      subject: 'первый заказ',
      body:
        'Здравствуй.\n\n' +
        'Нужен файл с одного старого сервера: grades.db, 10.0.0.7.\n' +
        'Платят немного, зато машина почти без защиты — разомнёшься.\n\n' +
        'Инструменты у тебя уже есть: терминал. Начни с scan.',
      hint: 'scan 10.0.0.7 → connect → brute → download grades.db',
      reward: 150,
      rep: 1,
      requires: null,
      server: '10.0.0.7',
      goal: { kind: 'download', file: 'grades.db' }
    },
    {
      id: 'm2',
      from: 'relay',
      fromMail: 'relay@zarya.local',
      subject: 'бухгалтерия',
      body:
        'Клиент просит табель зарплат из «Ромашки»: salary.xlsx на 172.16.4.12.\n\n' +
        'Там ssh и smb. Пароль бухгалтера — что-то из девяностых, подберётся быстро.\n' +
        'Аккуратнее: у них включён журнал подключений.',
      hint: 'Держи след ниже 100%. hide сбрасывает его за деньги.',
      reward: 320,
      rep: 1,
      requires: 'm1',
      server: '172.16.4.12',
      goal: { kind: 'download', file: 'salary.xlsx' }
    },
    {
      id: 'm3',
      from: 'relay',
      fromMail: 'relay@zarya.local',
      subject: 'тёмный рынок',
      body:
        '45.13.88.2. Забери deals.log — журнал сделок.\n\n' +
        'Узел злой: mysql наружу, пароли длинные. Без нормального процессора будешь брутить вечность.\n' +
        'Загляни в shop.',
      hint: 'Апгрейд cpu ускоряет brute в разы.',
      reward: 550,
      rep: 2,
      requires: 'm2',
      server: '45.13.88.2',
      goal: { kind: 'download', file: 'deals.log' }
    },
    {
      id: 'm4',
      from: 'relay',
      fromMail: 'relay@zarya.local',
      subject: 'север',
      body:
        'Дата-центр «Север», 91.204.17.55. Нужен закрытый ключ: keys.pem.\n\n' +
        'Там дежурят. Действуй быстро и не забудь про прокси.\n' +
        'Ключ — последнее, что мне нужно от тебя.',
      hint: 'Прокси-цепочка снижает прирост следа.',
      reward: 900,
      rep: 2,
      requires: 'm3',
      server: '91.204.17.55',
      goal: { kind: 'download', file: 'keys.pem' }
    },
    {
      id: 'm5',
      from: 'relay',
      fromMail: 'relay@zarya.local',
      subject: 'узел 0',
      body:
        '10.10.10.10.\n\n' +
        'Файл truth.txt. Прочитай его прямо там, скачивать не нужно.\n' +
        'Это последний заказ. Дальше — как решишь сам.',
      hint: 'cat truth.txt на узле. Пароль подбирается, но узел странный.',
      reward: 1800,
      rep: 4,
      requires: 'm4',
      server: '10.10.10.10',
      goal: { kind: 'read', file: 'truth.txt' }
    }
  ];

  const MAILS = [
    {
      id: 'welcome',
      from: 'СИСТЕМА',
      fromMail: 'system@zarya.local',
      subject: 'добро пожаловать в ЗАРЯ OS',
      body:
        'Система установлена. Пользователь: root.\n\n' +
        'Доступные приложения: Терминал, Почта, Сеть, Проводник, Заметки, Магазин.\n' +
        'Открой Терминал и введи help, если забыл команды.\n\n' +
        'След (trace) растёт от каждого действия на чужом узле.\n' +
        '100% — тебя находят.',
      when: 'сейчас'
    }
  ];

  const SHOP = [
    {
      id: 'cpu',
      name: 'Процессор',
      desc: 'Быстрее подбор пароля. Каждый уровень +45% к скорости brute.',
      costs: [120, 320, 780, 1700],
      max: 4,
      levels: ['1 ядро', '2 ядра', '4 ядра', '8 ядер', 'квантовый']
    },
    {
      id: 'proxy',
      name: 'Прокси-цепочка',
      desc: 'Снижает прирост следа. Каждый уровень −18% к trace.',
      costs: [160, 420, 980, 2400],
      max: 4,
      levels: ['нет', '1 узел', '3 узла', '6 узлов', ' onion']
    },
    {
      id: 'scripts',
      name: 'Скрипт-кит',
      desc: 'Готовые эксплойты. +15% к награде за заказ.',
      costs: [400, 1100],
      max: 2,
      levels: ['нет', 'базовый', 'боевой']
    },
    {
      id: 'ice',
      name: 'Ледокол',
      desc: 'Глушит журналы узла при скачивании. Каждый уровень −30% к следу от download.',
      costs: [260, 700],
      max: 2,
      levels: ['нет', 'лёгкий', 'тяжёлый']
    }
  ];

  const HIDE_COST = 80;

  function fresh() {
    return {
      v: 1,
      money: 0,
      rep: 0,
      trace: 0,
      cpu: 0,
      proxy: 0,
      scripts: 0,
      known: {},
      pwned: {},
      active: [],
      done: [],
      read: [],
      started: Date.now(),
      caughtCount: 0,
      earned: 0
    };
  }

  let st = fresh();
  let session = null; /* { ip, user, authed } — живёт только в памяти */

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.v === 1) st = Object.assign(fresh(), data);
    }
  } catch (e) { /* сохранение недоступно — играем без него */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('zarya:game'));
  }

  function server(ip) {
    return SERVERS.find(function (s) { return s.ip === ip; }) || null;
  }

  function traceFactor() {
    return Math.max(0.1, 1 - st.proxy * 0.18);
  }

  function addTrace(n) {
    st.trace = Math.max(0, Math.min(100, st.trace + n * traceFactor()));
    if (st.trace >= 100) {
      caught();
      return true;
    }
    save();
    return false;
  }

  function caught() {
    const penalty = Math.round(st.money * 0.35);
    st.money = Math.max(0, st.money - penalty);
    st.rep = Math.max(0, st.rep - 1);
    st.trace = 0;
    st.caughtCount += 1;
    session = null;
    save();
    window.dispatchEvent(new CustomEvent('zarya:caught', { detail: { penalty: penalty } }));
  }

  /* След медленно остывает */
  setInterval(function () {
    if (st.trace <= 0) return;
    const decay = session ? 0.35 : 1.1;
    st.trace = Math.max(0, st.trace - decay);
    save();
  }, 1000);

  function missionById(id) {
    return MISSIONS.find(function (m) { return m.id === id; }) || null;
  }

  function missionStatus(m) {
    if (st.done.indexOf(m.id) >= 0) return 'done';
    if (st.active.indexOf(m.id) >= 0) return 'active';
    if (m.requires && st.done.indexOf(m.requires) < 0) return 'locked';
    return 'available';
  }

  function matchGoal(kind, file, ip) {
    const hit = MISSIONS.filter(function (m) {
      return (
        st.active.indexOf(m.id) >= 0 &&
        m.server === ip &&
        m.goal.file === file &&
        m.goal.kind === kind
      );
    })[0];
    if (!hit) return null;
    st.active = st.active.filter(function (x) { return x !== hit.id; });
    st.done.push(hit.id);
    const reward = Math.round(hit.reward * (1 + st.scripts * 0.15));
    st.money += reward;
    st.rep += hit.rep;
    st.earned += reward;
    save();
    window.dispatchEvent(new CustomEvent('zarya:mission', { detail: { id: hit.id, reward: reward } }));
    return { mission: hit, reward: reward };
  }

  const Game = {
    servers: function () {
      return SERVERS.map(function (s) {
        return {
          ip: s.ip,
          name: s.name,
          os: s.os,
          sec: s.sec,
          note: s.note,
          ports: s.ports,
          known: !!st.known[s.ip],
          pwned: !!st.pwned[s.ip],
          files: s.files.length
        };
      });
    },
    server: server,
    session: function () { return session; },

    money: function () { return st.money; },
    rep: function () { return st.rep; },
    trace: function () { return st.trace; },
    caughtCount: function () { return st.caughtCount; },
    started: function () { return st.started; },
    earned: function () { return st.earned; },
    level: function (id) { return st[id] || 0; },
    shop: function () { return SHOP; },
    hideCost: HIDE_COST,
    version: '1.1.0',

    missions: function () {
      return MISSIONS.map(function (m) {
        return Object.assign({}, m, { status: missionStatus(m) });
      });
    },
    mails: function () {
      const out = MAILS.slice();
      MISSIONS.forEach(function (m) {
        out.push({
          id: 'mail-' + m.id,
          mission: m.id,
          from: m.from,
          fromMail: m.fromMail,
          subject: m.subject,
          body: m.body,
          status: missionStatus(m),
          hint: m.hint,
          reward: m.reward,
          server: m.server,
          goal: m.goal
        });
      });
      return out;
    },
    accept: function (id) {
      const m = missionById(id);
      if (!m) return { ok: false, msg: 'Заказа нет.' };
      if (missionStatus(m) === 'locked') return { ok: false, msg: 'Заказ ещё закрыт.' };
      if (missionStatus(m) === 'done') return { ok: false, msg: 'Заказ уже выполнен.' };
      if (missionStatus(m) === 'active') return { ok: false, msg: 'Заказ уже взят.' };
      st.active.push(id);
      save();
      return { ok: true, msg: 'Заказ взят: ' + m.subject + ' → ' + m.server };
    },
    activeMissions: function () {
      return MISSIONS.filter(function (m) { return st.active.indexOf(m.id) >= 0; });
    },

    scan: function (ip) {
      const s = server(ip);
      if (!s) return { ok: false, msg: 'Узел ' + ip + ' не отвечает.' };
      if (addTrace(2.5)) return { ok: false, msg: 'След переполнен. Соединение оборвано.' };
      const first = !st.known[ip];
      st.known[ip] = true;
      save();
      const lines = s.ports.map(function (p) {
        return '  ' + String(p.n).padEnd(6) + 'open   ' + p.s;
      });
      return {
        ok: true,
        msg:
          'сканирование ' + ip + ' ...\n' +
          lines.join('\n') +
          '\n  ОС: ' + s.os +
          '\n  защита: ' + '#'.repeat(s.sec) + '·'.repeat(5 - s.sec) +
          (first ? '\n  узел добавлен в карту сети' : '')
      };
    },

    connect: function (ip) {
      const s = server(ip);
      if (!s) return { ok: false, msg: 'Нет такого узла.' };
      if (!st.known[ip]) return { ok: false, msg: 'Сначала просканируй узел: scan ' + ip };
      if (session && session.ip === ip) return { ok: false, msg: 'Уже подключено к ' + ip + '.' };
      if (session) return { ok: false, msg: 'Сначала отключись: disconnect' };
      session = { ip: ip, user: null, authed: false };
      if (addTrace(3)) {
        session = null;
        return { ok: false, msg: 'След переполнен при подключении.' };
      }
      return {
        ok: true,
        msg:
          'подключение к ' + ip + ' ...\n' +
          'handshake ok · узел: ' + s.name + '\n' +
          (st.pwned[ip]
            ? 'ключи от узла уже сохранены — login не нужен, доступ открыт'
            : 'нужна авторизация: brute или login <логин> <пароль>')
      };
    },

    disconnect: function () {
      if (!session) return { ok: false, msg: 'Нет активного соединения.' };
      const ip = session.ip;
      session = null;
      save();
      return { ok: true, msg: 'отключено от ' + ip };
    },

    login: function (user, pass) {
      if (!session) return { ok: false, msg: 'Сначала connect <ip>.' };
      const s = server(session.ip);
      const ok = s.users.some(function (u) { return u.u === user && u.p === pass; });
      if (!ok) {
        addTrace(6);
        return { ok: false, msg: 'доступ запрещён: неверная пара логин/пароль' };
      }
      session.user = user;
      session.authed = true;
      st.pwned[s.ip] = true;
      save();
      return { ok: true, msg: 'доступ получен: ' + user + '@' + s.ip + '\nможно ls, cat, download' };
    },

    brute: function (onTick) {
      if (!session) return Promise.resolve({ ok: false, msg: 'Сначала connect <ip>.' });
      if (session.authed) return Promise.resolve({ ok: false, msg: 'Доступ уже получен.' });
      const s = server(session.ip);
      const speed = 1 + st.cpu * 0.45;
      const total = (2200 + s.sec * 1250) / speed;
      const target = session.ip;
      let passed = 0;
      const step = 110;

      return new Promise(function (resolve) {
        const timer = setInterval(function () {
          if (!session || session.ip !== target) {
            clearInterval(timer);
            resolve({ ok: false, msg: 'соединение потеряно во время подбора' });
            return;
          }
          passed += step;
          const p = Math.min(1, passed / total);
          if (onTick) onTick(p);
          addTrace(s.sec * 0.22);
          if (p >= 1) {
            clearInterval(timer);
            const cred = s.users[0];
            session.user = cred.u;
            session.authed = true;
            st.pwned[s.ip] = true;
            save();
            resolve({
              ok: true,
              msg: 'пароль найден: ' + cred.u + ' : ' + cred.p + '\nдоступ к ' + s.ip + ' открыт'
            });
          }
        }, step);
      });
    },

    ls: function () {
      if (!session) return { ok: false, msg: 'Нет соединения. Локальные файлы — в Проводнике.' };
      if (!session.authed) return { ok: false, msg: 'Сначала авторизуйся: brute' };
      const s = server(session.ip);
      addTrace(1.5);
      return {
        ok: true,
        msg: s.files.map(function (f, i) {
          return '  ' + String(i + 1).padStart(2, '0') + '  ' + f.name + '   ' + f.body.length + ' Б';
        }).join('\n')
      };
    },

    cat: function (name) {
      if (!session) return { ok: false, msg: 'Нет соединения.' };
      if (!session.authed) return { ok: false, msg: 'Сначала авторизуйся: brute' };
      const s = server(session.ip);
      const f = s.files.find(function (x) { return x.name === name; });
      if (!f) return { ok: false, msg: 'файл не найден: ' + name };
      if (addTrace(3)) return { ok: false, msg: 'След переполнен. Соединение сброшено.' };
      const hit = matchGoal('read', f.name, s.ip);
      return {
        ok: true,
        msg: '── ' + f.name + ' ──\n' + f.body,
        mission: hit
      };
    },

    download: function (name) {
      if (!session) return { ok: false, msg: 'Нет соединения.' };
      if (!session.authed) return { ok: false, msg: 'Сначала авторизуйся: brute' };
      const s = server(session.ip);
      const f = s.files.find(function (x) { return x.name === name; });
      if (!f) return { ok: false, msg: 'файл не найден: ' + name };
      const noise = 7 * Math.max(0.1, 1 - (st.ice || 0) * 0.3);
      if (addTrace(noise)) return { ok: false, msg: 'След переполнен во время скачивания.' };
      const dir = '/home/loot/' + s.ip;
      FS.mkdir(dir);
      FS.write(dir + '/' + f.name, f.body);
      const hit = matchGoal('download', f.name, s.ip);
      return {
        ok: true,
        msg: 'скачано: ' + s.ip + '/' + f.name + ' → ~/loot/' + s.ip + '/' + f.name,
        mission: hit
      };
    },

    hide: function () {
      if (st.money < HIDE_COST) {
        return { ok: false, msg: 'нужно ' + HIDE_COST + ' ₡, у тебя ' + st.money + ' ₡' };
      }
      st.money -= HIDE_COST;
      st.trace = 0;
      save();
      return { ok: true, msg: 'маршрут перестроен, след сброшен (−' + HIDE_COST + ' ₡)' };
    },

    buy: function (id) {
      const item = SHOP.find(function (s) { return s.id === id; });
      if (!item) return { ok: false, msg: 'В магазине нет «' + id + '».' };
      const lvl = st[item.id] || 0;
      if (lvl >= item.max) return { ok: false, msg: item.name + ': максимальный уровень.' };
      const cost = item.costs[lvl];
      if (st.money < cost) return { ok: false, msg: 'нужно ' + cost + ' ₡, у тебя ' + st.money + ' ₡' };
      st.money -= cost;
      st[item.id] = lvl + 1;
      save();
      return { ok: true, msg: item.name + ' улучшен до «' + item.levels[lvl + 1] + '» (−' + cost + ' ₡)' };
    },

    readFlag: function (key) {
      return st.read.indexOf(key) >= 0;
    },
    markRead: function (key) {
      if (st.read.indexOf(key) >= 0) return;
      st.read.push(key);
      save();
    },

    stats: function () {
      const pwned = Object.keys(st.pwned).length;
      const mins = Math.max(1, Math.round((Date.now() - st.started) / 60000));
      return {
        money: st.money,
        rep: st.rep,
        pwned: pwned,
        total: SERVERS.length,
        missionsDone: st.done.length,
        missionsTotal: MISSIONS.length,
        earned: st.earned,
        caught: st.caughtCount,
        minutes: mins
      };
    },

    reset: function () {
      st = fresh();
      session = null;
      save();
    }
  };

  window.Game = Game;
})();
