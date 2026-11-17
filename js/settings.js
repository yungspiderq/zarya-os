/* ЗАРЯ OS — настройки: тема, акцент, обои, оформление. */
(function () {
  const KEY = 'zarya.settings.v2';

  const DEFAULTS = {
    theme: 'dark',
    accent: 'blue',
    wall: 'bloom',
    clock24: true,
    motion: true,
    transparency: true
  };

  const ACCENTS = [
    { id: 'blue', label: 'Синий', swatch: '#4cc2ff' },
    { id: 'teal', label: 'Бирюзовый', swatch: '#00b7c3' },
    { id: 'green', label: 'Зелёный', swatch: '#6ccb5f' },
    { id: 'purple', label: 'Сиреневый', swatch: '#b47bff' },
    { id: 'orange', label: 'Оранжевый', swatch: '#ff9f45' },
    { id: 'pink', label: 'Розовый', swatch: '#ff8fbd' }
  ];

  const WALLS = [
    { id: 'bloom', label: 'Bloom', hint: 'синий цветок Windows' },
    { id: 'dawn', label: 'Рассвет', hint: 'тёплый градиент' },
    { id: 'mono', label: 'Графит', hint: 'спокойный тёмный' },
    { id: 'solid', label: 'Акцент', hint: 'цвет системы' }
  ];

  let state = Object.assign({}, DEFAULTS);

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign({}, DEFAULTS, JSON.parse(raw) || {});
  } catch (e) { /* хранилище недоступно — остаёмся на значениях по умолчанию */ }

  function apply() {
    const el = document.documentElement;
    el.setAttribute('data-theme', state.theme);
    el.setAttribute('data-accent', state.accent);
    el.setAttribute('data-wall', state.wall);
    el.classList.toggle('no-motion', !state.motion);
    document.body.classList.toggle('no-transparency', !state.transparency);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#202020' : '#f3f3f3');
  }

  const Settings = {
    all: function () { return Object.assign({}, state); },
    get: function (key) { return state[key]; },
    set: function (key, value) {
      state[key] = value;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      apply();
      window.dispatchEvent(new CustomEvent('zarya:settings'));
    },
    toggle: function (key) {
      Settings.set(key, !state[key]);
    },
    reset: function () {
      state = Object.assign({}, DEFAULTS);
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      apply();
      window.dispatchEvent(new CustomEvent('zarya:settings'));
    },
    accents: ACCENTS,
    walls: WALLS,
    apply: apply
  };

  apply();
  window.Settings = Settings;
})();
