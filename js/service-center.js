/* ЗАРЯ OS 1.6 — сервисные заказы и игровой бенчмарк. */
(function () {
  'use strict';
  const G = window.Game;
  const KEY = 'zarya.service.v1';
  const CASES = [
    {
      id: 'svc-01', unlock: 0, title: 'Компьютер загружается вечность', client: 'Студия «Север»',
      symptom: 'После включения рабочий стол появляется почти через минуту. Программы открываются медленно.',
      evidence: ['Накопитель: старый SATA HDD', 'CPU и ОЗУ работают нормально', 'Ошибок питания нет'],
      diagnosis: 'hdd', fix: 'sata-ssd', reward: 110,
      choices: [['hdd', 'Устаревший жёсткий диск'], ['cpu', 'Неисправность процессора'], ['power', 'Слишком слабый блок питания']],
      fixes: [['sata-ssd', 'Заменить системный HDD на SATA SSD'], ['cpu', 'Заменить процессор'], ['power', 'Поставить блок питания 750 Вт']],
      clue: 'Обрати внимание на устройство хранения и долгую загрузку.',
      explanation: 'Медленный HDD ограничивал доступ к файлам. После установки SSD загрузка стала быстрее.'
    },
    {
      id: 'svc-02', unlock: 0, title: 'ПК выключается под нагрузкой', client: 'Киберклуб «Полюс»',
      symptom: 'При запуске тяжёлой игры компьютер внезапно выключается. В простое проблем нет.',
      evidence: ['GPU: AMD Radeon RX 580', 'Блок питания: OEM 300 Вт', 'Температуры в пределах нормы'],
      diagnosis: 'psu', fix: 'psu-new', reward: 140,
      choices: [['overheat', 'Перегрев процессора'], ['psu', 'Недостаточный запас мощности БП'], ['ram', 'Мало оперативной памяти']],
      fixes: [['psu-new', 'Поставить более мощный совместимый БП'], ['ram', 'Добавить память'], ['ssd', 'Установить SSD']],
      clue: 'Сравни мощность БП с потребностями видеокарты.',
      explanation: 'Блок питания не обеспечивал достаточный запас мощности при высокой нагрузке.'
    },
    {
      id: 'svc-03', unlock: 1, title: 'Новый NVMe не обнаружен', client: 'Фотостудия «Объектив»',
      symptom: 'Клиент купил M.2 NVMe накопитель, но в старой системе его некуда установить.',
      evidence: ['Материнская плата: ASRock H410M-HDV', 'Разъём M.2: отсутствует', 'Купленный накопитель: WD Blue SN570'],
      diagnosis: 'slot', fix: 'board', reward: 170,
      choices: [['port', 'Не работает USB-порт'], ['slot', 'На плате отсутствует слот M.2'], ['capacity', 'Переполнен диск']],
      fixes: [['sata', 'Подключить NVMe к обычному SATA без переходника'], ['board', 'Установить совместимую плату со слотом M.2'], ['format', 'Отформатировать HDD']],
      clue: 'Посмотри, какие разъёмы реально есть у материнской платы.',
      explanation: 'Для NVMe нужен совместимый M.2-разъём. Новая плата обеспечивает его поддержку.'
    },
    {
      id: 'svc-04', unlock: 2, title: 'Игра работает рывками', client: 'Игрок «Тень»',
      symptom: 'Низкая частота кадров даже при исправном CPU. Компьютер использует простую дискретную видеокарту.',
      evidence: ['GPU: GeForce GT 1030', 'CPU: Core i5-10400', 'ОЗУ: 16 ГБ DDR4'],
      diagnosis: 'gpu', fix: 'gpu-new', reward: 195,
      choices: [['gpu', 'Недостаточная мощность видеокарты'], ['ram', 'Недостаток ОЗУ'], ['disk', 'Нужен дефрагментатор']],
      fixes: [['cpu', 'Купить более мощный процессор'], ['gpu-new', 'Заменить GPU на подходящую более мощную модель'], ['disk', 'Удалить все сохранения игр']],
      clue: 'CPU и память уже достаточны, проверь графическую подсистему.',
      explanation: 'Мощная видеокарта улучшила игровой FPS. Совместимость с блоком питания проверена.'
    },
    {
      id: 'svc-05', unlock: 3, title: 'Редактор тормозит с проектами', client: 'Монтажная «Пиксель»',
      symptom: 'При открытии нескольких программ компьютер часто начинает обращаться к диску.',
      evidence: ['ОЗУ: 2 ГБ DDR4', 'CPU: Core i5', 'SSD: Samsung 870 EVO'],
      diagnosis: 'memory', fix: 'ram-more', reward: 215,
      choices: [['memory', 'Недостаточный объём ОЗУ'], ['power', 'Слишком мощный блок питания'], ['network', 'Слабый Wi-Fi']],
      fixes: [['ram-more', 'Установить совместимую память 16 ГБ'], ['disk', 'Поменять SATA-кабель'], ['network', 'Поменять сетевую карту']],
      clue: 'Если приложений много, им нужна память, а не только быстрый диск.',
      explanation: 'Большее количество оперативной памяти уменьшило обращения к диску при многозадачности.'
    },
    {
      id: 'svc-06', unlock: 4, title: 'Процессор перегревается', client: 'Стример «Радио»',
      symptom: 'Через несколько минут работы CPU сильно нагревается, а вентилятор шумит.',
      evidence: ['Кулер: закреплён неплотно', 'В корпусе есть вентиляция', 'Блок питания исправен'],
      diagnosis: 'cooler', fix: 'cooler-mount', reward: 240,
      choices: [['cooler', 'Неправильно установлен кулер'], ['ram', 'Ошибки ОЗУ'], ['ssd', 'Переполненный SSD']],
      fixes: [['cooler-mount', 'Правильно закрепить совместимое охлаждение'], ['ram', 'Заменить RAM'], ['psu', 'Заменить БП']],
      clue: 'Подсказка — состояние крепления охлаждения.',
      explanation: 'Плотный контакт кулера с процессором восстановил нормальное охлаждение.'
    },
    {
      id: 'svc-07', unlock: 5, title: 'Новый накопитель всё равно медленный', client: 'Офис «Спектр»',
      symptom: 'Клиент хотел очень быстрый системный диск, но установил SATA-модель и не получил скорость NVMe.',
      evidence: ['Накопитель: Kingston A400 SATA', 'Материнская плата: с поддержкой M.2 NVMe', 'Копирование больших файлов идёт медленнее ожидаемого'],
      diagnosis: 'sata-limit', fix: 'nvme', reward: 270,
      choices: [['sata-limit', 'Ограничение скорости интерфейса SATA'], ['psu', 'Нехватка мощности БП'], ['screen', 'Низкая герцовка монитора']],
      fixes: [['nvme', 'Установить совместимый NVMe SSD в M.2'], ['monitor', 'Купить новый монитор'], ['cpu', 'Разогнать процессор']],
      clue: 'Проверь интерфейс накопителя: SATA и NVMe отличаются.',
      explanation: 'Совместимый NVMe SSD обеспечивает более высокие последовательные скорости в этой симуляции.'
    },
    {
      id: 'svc-08', unlock: 6, title: 'Апгрейд не включается', client: 'Лаборатория «Орбита»',
      symptom: 'После установки мощной видеокарты компьютер не может стабильно работать под нагрузкой.',
      evidence: ['GPU: GeForce RTX 3060', 'CPU: Core i9-10900K', 'БП: OEM 300 Вт'],
      diagnosis: 'power-budget', fix: 'power-budget-fix', reward: 330,
      choices: [['power-budget', 'Общий энергобюджет системы превышен'], ['hdd', 'Накопитель слишком медленный'], ['cooler', 'Низкая скорость вентилятора корпуса']],
      fixes: [['power-budget-fix', 'Подобрать БП с достаточным запасом мощности'], ['hdd', 'Заменить HDD'], ['ram', 'Сократить количество ОЗУ']],
      clue: 'Нужно учесть не только GPU, но и потребление мощного CPU.',
      explanation: 'Достаточный запас мощности стабилизировал работу собранного ПК.'
    }
  ];

  function byId(id) { return CASES.find(function (t) { return t.id === id; }) || null; }
  function fresh() { return { version: 1, completed: [], active: null, mistakes: 0, benchmarks: {} }; }
  let state = fresh();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (parsed && parsed.version === 1) state = Object.assign(fresh(), parsed);
  } catch (e) { /* Use default state when storage is blocked or malformed. */ }

  if (!Array.isArray(state.completed)) state.completed = [];
  state.completed = Array.from(new Set(state.completed)).filter(function (id) { return !!byId(id); });
  if (!state.active || !byId(state.active.id) || state.completed.includes(state.active.id) ||
      !['diagnosis', 'repair'].includes(state.active.phase)) state.active = null;
  if (!state.benchmarks || typeof state.benchmarks !== 'object') state.benchmarks = {};
  state.mistakes = Math.max(0, Number(state.mistakes) || 0);

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* in-memory fallback */ }
    window.dispatchEvent(new CustomEvent('zarya:service'));
  }
  function status(id) {
    if (state.completed.includes(id)) return 'done';
    if (state.active && state.active.id === id) return 'active';
    const item = byId(id);
    return state.completed.length >= item.unlock ? 'available' : 'locked';
  }
  G.serviceCases = function () {
    return CASES.map(function (t) {
      return {
        id: t.id, title: t.title, client: t.client, symptom: t.symptom,
        evidence: t.evidence.slice(), diagnoses: t.choices.map(function (x) { return x.slice(); }),
        fixes: t.fixes.map(function (x) { return x.slice(); }),
        reward: t.reward, unlock: t.unlock, explanation: t.explanation,
        status: status(t.id)
      };
    });
  };
  G.serviceProgress = function () {
    return { completed: state.completed.length, total: CASES.length, mistakes: state.mistakes,
      active: state.active ? Object.assign({}, state.active) : null };
  };
  G.serviceStart = function (id) {
    const t = byId(id);
    if (!t) return { ok: false, msg: 'Заказ не найден.' };
    if (status(id) === 'done') return { ok: false, msg: 'Этот заказ уже закрыт.' };
    if (status(id) === 'locked') return { ok: false, msg: 'Сначала выполни предыдущие заказы.' };
    if (state.active && state.active.id !== id) return { ok: false, msg: 'Сначала заверши или отмени текущий заказ.' };
    if (!state.active) state.active = { id: id, phase: 'diagnosis' };
    save();
    return { ok: true, msg: 'Заказ принят. Изучи симптомы и выбери причину.' };
  };
  G.serviceDiagnose = function (id, answer) {
    if (!state.active || state.active.id !== id || state.active.phase !== 'diagnosis') {
      return { ok: false, msg: 'Сначала начни диагностику этого заказа.' };
    }
    const t = byId(id);
    if (answer !== t.diagnosis) {
      state.mistakes++;
      save();
      return { ok: false, msg: 'Диагноз не подходит. ' + t.clue };
    }
    state.active.phase = 'repair';
    save();
    return { ok: true, msg: 'Причина найдена! Теперь выбери подходящий ремонт.' };
  };
  G.serviceRepair = function (id, answer) {
    if (!state.active || state.active.id !== id || state.active.phase !== 'repair') {
      return { ok: false, msg: 'Сначала правильно определи неисправность.' };
    }
    const t = byId(id);
    if (answer !== t.fix) {
      state.mistakes++;
      save();
      return { ok: false, msg: 'Этот ремонт не устранит причину. Проверь результаты диагностики.' };
    }
    const payout = G.awardServiceContract(id, t.reward);
    if (!payout.ok && !payout.alreadyPaid) return payout;
    state.completed.push(id);
    state.active = null;
    save();
    return {
      ok: true, reward: payout.ok ? t.reward : 0,
      msg: (payout.ok ? '+' + t.reward + ' ₡. ' : 'Оплата уже получена. ') + t.explanation
    };
  };
  G.serviceCancel = function () {
    if (!state.active) return { ok: false, msg: 'Нет активного заказа.' };
    state.active = null;
    save();
    return { ok: true, msg: 'Заказ отменён. Можешь вернуться к нему позже.' };
  };

  const MODES = {
    gaming: { label: 'Графика и игры', description: 'Симуляция игрового FPS, GPU, CPU и памяти' },
    office: { label: 'Рабочие программы', description: 'CPU, ОЗУ и отзывчивость накопителя' },
    disk: { label: 'Накопитель', description: 'Скорость доступа к данным и загрузка ОС' }
  };
  G.benchmarkModes = function () {
    return Object.keys(MODES).map(function (id) { return Object.assign({ id: id }, MODES[id]); });
  };
  G.benchmarkResult = function (mode) {
    if (!MODES[mode]) return null;
    const perf = G.performance();
    const health = G.systemHealth();
    const cpu = G.level('cpu'), gpu = G.level('gpu'), ram = G.level('ram'), disk = G.level('ssd');
    const scores = {
      gaming: Math.round(perf.fps * 10 + cpu * 90 + gpu * 45 + ram * 20),
      office: Math.round(180 + cpu * 190 + ram * 135 + disk * 55),
      disk: Math.round(100 + health.storageSpeed / 3 + disk * 40)
    };
    const score = scores[mode];
    const grade = score < 400 ? 'Базовый' : score < 900 ? 'Средний' : score < 1450 ? 'Высокий' : 'Отличный';
    return {
      mode: mode, name: MODES[mode].label, score: score, grade: grade,
      fps: perf.fps, latency: perf.latency,
      bootSeconds: health.bootSeconds, storageSpeed: health.storageSpeed,
      power: health.requiredWatts + '/' + health.suppliedWatts + ' Вт'
    };
  };
  G.benchmarkRecord = function (mode) {
    const r = state.benchmarks[mode];
    return r && Number.isFinite(r.score) && r.score >= 0
      ? { score: r.score, date: r.date, grade: r.grade } : null;
  };
  G.benchmarkSave = function (mode) {
    const score = G.benchmarkResult(mode);
    if (!score) return { ok: false, msg: 'Такого теста нет.' };
    const old = G.benchmarkRecord(mode);
    if (!old || score.score > old.score) {
      state.benchmarks[mode] = { score: score.score, grade: score.grade, date: Date.now() };
      save();
    }
    return { ok: true, result: score, record: G.benchmarkRecord(mode) };
  };

  const resetOriginal = G.reset.bind(G);
  G.reset = function () {
    state = fresh();
    try { localStorage.removeItem(KEY); } catch (e) {}
    resetOriginal();
    save();
  };
  save();

  function node(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const ServiceUI = (function () {
    let root = null;
    let api = null;
    let selected = 'svc-01';
    let listener = null;
    function render() {
      if (!root || !root.isConnected) return;
      const cases = G.serviceCases(), info = G.serviceProgress();
      const selectedCase = cases.find(function (x) { return x.id === selected; }) || cases[0];
      root.querySelector('[data-svc="progress"]').textContent = info.completed + ' / ' + info.total;
      root.querySelector('[data-svc="money"]').textContent = G.money().toLocaleString('ru-RU') + ' ₡';
      const list = root.querySelector('[data-svc="list"]');
      list.replaceChildren();
      cases.forEach(function (t) {
        const b = node('<button type="button" class="svc-ticket"><span class="svc-ticket-num"></span><strong></strong><small></small></button>');
        b.querySelector('.svc-ticket-num').textContent = t.id.toUpperCase() + ' · ' + ({ done:'ГОТОВО', active:'В РАБОТЕ', locked:'ЗАКРЫТО', available:'ДОСТУПНО' })[t.status];
        b.querySelector('strong').textContent = t.title;
        b.querySelector('small').textContent = t.client + ' · ' + t.reward + ' ₡';
        b.classList.toggle('selected', t.id === selected);
        b.classList.toggle('is-done', t.status === 'done');
        b.addEventListener('click', function () { selected = t.id; render(); });
        list.appendChild(b);
      });
      const detail = root.querySelector('[data-svc="detail"]');
      detail.replaceChildren();
      const main = node('<div class="svc-detail"><span class="part-kicker"></span><h3></h3><p class="svc-symptom"></p><div class="svc-evidence"></div><div class="svc-actions"></div><p class="svc-hint" role="status"></p></div>');
      main.querySelector('.part-kicker').textContent = selectedCase.client + ' · награда ' + selectedCase.reward + ' ₡';
      main.querySelector('h3').textContent = selectedCase.title;
      main.querySelector('.svc-symptom').textContent = selectedCase.symptom;
      const evidence = main.querySelector('.svc-evidence');
      selectedCase.evidence.forEach(function (line) {
        const row = node('<div class="svc-evidence-line"></div>');
        row.textContent = line;
        evidence.appendChild(row);
      });
      const actions = main.querySelector('.svc-actions');
      const hint = main.querySelector('.svc-hint');
      function response(r) {
        if (r.ok) {
          window.UI.toast(r.msg, 'ok');
          render();
        } else hint.textContent = r.msg;
      }
      const active = info.active && info.active.id === selectedCase.id ? info.active : null;
      if (selectedCase.status === 'done') {
        const text = node('<p class="svc-complete"></p>');
        text.textContent = 'Заказ закрыт. ' + selectedCase.explanation;
        actions.appendChild(text);
      } else if (selectedCase.status === 'locked') {
        hint.textContent = 'Для открытия нужно закрыть не менее ' + selectedCase.unlock + ' других заказов.';
      } else if (!active) {
        const begin = node('<button type="button" class="btn btn--primary">Начать диагностику</button>');
        begin.addEventListener('click', function () { response(G.serviceStart(selectedCase.id)); });
        actions.appendChild(begin);
      } else {
        const isDiagnosis = active.phase === 'diagnosis';
        const heading = node('<h4 class="svc-stage-heading"></h4>');
        heading.textContent = isDiagnosis ? 'Шаг 1 · Что вызвало проблему?' : 'Шаг 2 · Как устранить проблему?';
        actions.appendChild(heading);
        (isDiagnosis ? selectedCase.diagnoses : selectedCase.fixes).forEach(function (opt) {
          const b = node('<button type="button" class="svc-option"></button>');
          b.textContent = opt[1];
          b.addEventListener('click', function () {
            response(isDiagnosis ? G.serviceDiagnose(selectedCase.id, opt[0]) : G.serviceRepair(selectedCase.id, opt[0]));
          });
          actions.appendChild(b);
        });
        const cancel = node('<button type="button" class="btn svc-cancel">Отменить заказ</button>');
        cancel.addEventListener('click', function () { response(G.serviceCancel()); });
        actions.appendChild(cancel);
      }
      detail.appendChild(main);
    }
    function mount(openApi) {
      api = openApi;
      const current = G.serviceProgress().active;
      if (current) selected = current.id;
      root = node('<div class="app svc-app"><div class="app-head"><div><h2>Сервисный центр</h2>' +
        '<p class="muted">Диагностируй чужие ПК и получай оплату за ремонт</p></div>' +
        '<div class="svc-summary"><b data-svc="progress">0 / 8</b><span data-svc="money">0 ₡</span></div></div>' +
        '<div class="svc-columns"><div class="svc-tickets" data-svc="list"></div>' +
        '<section class="svc-detail-scroll" data-svc="detail"></section></div>' +
        '<p class="muted svc-note">Это учебная игровая симуляция. Решения относятся к вымышленным компьютерам клиентов.</p></div>');
      api.body.appendChild(root);
      listener = render;
      window.addEventListener('zarya:service', listener);
      window.addEventListener('zarya:game', listener);
      render();
    }
    function close() {
      if (listener) {
        window.removeEventListener('zarya:service', listener);
        window.removeEventListener('zarya:game', listener);
      }
      listener = null; root = null; api = null;
    }
    return { mount: mount, close: close };
  })();

  const BenchUI = (function () {
    let root = null;
    let mode = 'gaming';
    let frame = 0;
    let running = false;
    let listener = null;
    const duration = 1750;
    function metrics() {
      const result = G.benchmarkResult(mode);
      if (!result || !root) return;
      root.querySelector('[data-bench="score"]').textContent = result.score.toLocaleString('ru-RU');
      root.querySelector('[data-bench="tier"]').textContent = result.grade;
      root.querySelector('[data-bench="fps"]').textContent = result.fps + ' FPS';
      root.querySelector('[data-bench="latency"]').textContent = result.latency + ' мс';
      root.querySelector('[data-bench="disk"]').textContent = result.storageSpeed + ' МБ/с';
      root.querySelector('[data-bench="boot"]').textContent = result.bootSeconds + ' с';
      root.querySelector('[data-bench="power"]').textContent = result.power;
      const record = G.benchmarkRecord(mode);
      root.querySelector('[data-bench="record"]').textContent = record ? record.score.toLocaleString('ru-RU') : '—';
      root.querySelectorAll('[data-bench-mode]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-bench-mode') === mode);
      });
    }
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      running = false;
      if (root) root.querySelector('[data-bench="start"]').disabled = false;
    }
    function start() {
      if (!root || running) return;
      running = true;
      root.querySelector('[data-bench="start"]').disabled = true;
      root.querySelector('[data-bench="status"]').textContent = 'Выполняется виртуальный тест. Настоящее железо не нагружается.';
      let firstTime = null;
      function tick(time) {
        if (!root || !root.isConnected) { stop(); return; }
        if (firstTime === null) firstTime = time;
        const p = Math.min(1, (time - firstTime) / duration);
        root.querySelector('[data-bench="bar"]').style.width = Math.round(p * 100) + '%';
        root.querySelector('[data-bench="percent"]').textContent = Math.round(p * 100) + '%';
        if (p < 1) {
          frame = requestAnimationFrame(tick);
          return;
        }
        running = false; frame = 0;
        const saved = G.benchmarkSave(mode);
        root.querySelector('[data-bench="start"]').disabled = false;
        root.querySelector('[data-bench="status"]').textContent = saved.ok
          ? 'Тест завершён. Результат рассчитан по установленным компонентам и сохранён.' : saved.msg;
        metrics();
      }
      frame = requestAnimationFrame(tick);
    }
    function mount(api) {
      root = node('<div class="app bench-app"><div class="app-head"><div><h2>ЗАРЯ Bench</h2>' +
        '<p class="muted">Виртуальный тест конфигурации · без нагрузки на настоящий ПК</p></div>' +
        '<button class="btn" type="button" data-bench="pc">Мой ПК</button></div>' +
        '<div class="bench-modes"><button type="button" data-bench-mode="gaming">Игры</button>' +
        '<button type="button" data-bench-mode="office">Работа</button><button type="button" data-bench-mode="disk">Накопитель</button></div>' +
        '<section class="bench-hero"><div><span>ИГРОВОЙ ИНДЕКС</span><strong data-bench="score">0</strong>' +
        '<small data-bench="tier"></small></div><div class="bench-icon" aria-hidden="true"><span></span><span></span><span></span><span></span></div></section>' +
        '<div class="bench-progress"><i data-bench="bar"></i></div><div class="bench-progress-meta"><span data-bench="status">' +
        'Нажми «Запустить тест», чтобы оценить компьютер.</span><b data-bench="percent">0%</b></div>' +
        '<div class="bench-metrics">' +
        '<div><span>FPS в Аркаде</span><strong data-bench="fps"></strong></div>' +
        '<div><span>Задержка</span><strong data-bench="latency"></strong></div>' +
        '<div><span>Диск</span><strong data-bench="disk"></strong></div>' +
        '<div><span>Загрузка ОС</span><strong data-bench="boot"></strong></div>' +
        '<div><span>Питание</span><strong data-bench="power"></strong></div>' +
        '<div><span>Лучший результат</span><strong data-bench="record"></strong></div></div>' +
        '<div class="pc-actions"><button type="button" class="btn btn--primary" data-bench="start">Запустить тест</button>' +
        '<button type="button" class="btn" data-bench="shop">Магазин комплектующих</button></div>' +
        '<p class="muted bench-footnote">Баллы — часть игры. Это не реальная частота кадров, ' +
        'не измерение скорости диска и не оценка возможностей физического устройства.</p></div>');
      api.body.appendChild(root);
      root.querySelector('[data-bench="pc"]').addEventListener('click', function () { api.open('pc'); });
      root.querySelector('[data-bench="shop"]').addEventListener('click', function () { api.open('shop'); });
      root.querySelector('[data-bench="start"]').addEventListener('click', start);
      root.querySelectorAll('[data-bench-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
          stop();
          mode = b.getAttribute('data-bench-mode');
          root.querySelector('[data-bench="bar"]').style.width = '0%';
          root.querySelector('[data-bench="percent"]').textContent = '0%';
          root.querySelector('[data-bench="status"]').textContent = 'Можно запускать новый тест.';
          metrics();
        });
      });
      listener = metrics;
      window.addEventListener('zarya:hardware', listener);
      metrics();
    }
    function close() {
      stop();
      if (listener) window.removeEventListener('zarya:hardware', listener);
      listener = null; root = null;
    }
    return { mount: mount, close: close };
  })();

  window.APPICONS.serviceCenter = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect x="4" y="6" width="24" height="22" rx="5" fill="#176b74"/>' +
    '<path d="M11 5V3h10v2M9 15h14M16 9v12M9 17h14" stroke="#c2fbf5" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  window.APPICONS.benchmark = '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<rect x="3" y="4" width="26" height="24" rx="6" fill="#334e85"/>' +
    '<path d="M8 23l5-8 5 4 6-11" fill="none" stroke="#8cf2da" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  window.APPS.service = {
    name: 'Сервисный центр', icon: window.APPICONS.serviceCenter,
    w: 1020, h: 660, mount: ServiceUI.mount, onClose: ServiceUI.close
  };
  window.APPS.benchmark = {
    name: 'ЗАРЯ Bench', icon: window.APPICONS.benchmark,
    w: 780, h: 620, mount: BenchUI.mount, onClose: BenchUI.close
  };
})();