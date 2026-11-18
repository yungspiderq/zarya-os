/* ZARYA OS 2.1 — one-time season reset at first updated launch per browser origin. */
(function () {
  'use strict';
  const KEY = 'zarya.reset.v2.1';
  const result = { performed: false, removed: 0, failed: false };
  try {
    // This code executes before any app initializes its localStorage state.
    if (localStorage.getItem(KEY) !== '1') {
      const keys = [];
      for (let i=0; i<localStorage.length; i++) {
        const key=localStorage.key(i);
        if (typeof key==='string' && key.startsWith('zarya.')) keys.push(key);
      }
      keys.forEach(function(key) {
        localStorage.removeItem(key);
      });
      localStorage.setItem(KEY,'1');
      result.performed=true;
      result.removed=keys.length;
    }
  } catch (error) {
    // Do not initialize an incompatible mixed-version profile after an incomplete reset.
    result.failed=true;
    result.message='Не удалось сбросить старый прогресс. Проверь доступ браузера к хранилищу сайта.';
  }
  window.ZaryaSeasonReset=result;
})();