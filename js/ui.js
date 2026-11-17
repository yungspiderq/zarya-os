/* ЗАРЯ OS — мелкий интерфейсный слой: тосты, диалоги, контекстное меню. */
(function () {
  const toastBox = function () { return document.getElementById('toasts'); };

  function toast(text, kind) {
    const box = toastBox();
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = text;
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 260);
    }, 2600);
  }

  let dialogOpen = false;

  function dialog(opts) {
    if (dialogOpen) return Promise.resolve(null);
    dialogOpen = true;

    return new Promise(function (resolve) {
      const layer = document.getElementById('dialogLayer');
      const wrap = document.createElement('div');
      wrap.className = 'dlg-wrap';
      wrap.innerHTML =
        '<form class="dlg" role="dialog" aria-modal="true">' +
        '  <div class="dlg-title"></div>' +
        '  <p class="dlg-text"></p>' +
        '  <input class="dlg-input" type="text" autocomplete="off" spellcheck="false">' +
        '  <div class="dlg-actions">' +
        '    <button type="button" class="btn" data-act="cancel">Отмена</button>' +
        '    <button type="submit" class="btn btn--primary" data-act="ok">Готово</button>' +
        '  </div>' +
        '</form>';

      const form = wrap.querySelector('form');
      const title = wrap.querySelector('.dlg-title');
      const text = wrap.querySelector('.dlg-text');
      const input = wrap.querySelector('.dlg-input');

      title.textContent = opts.title || 'ЗАРЯ OS';
      if (opts.text) text.textContent = opts.text;
      else text.remove();

      if (opts.kind === 'confirm') {
        input.remove();
        wrap.querySelector('[data-act="ok"]').textContent = opts.okLabel || 'Да';
        wrap.querySelector('[data-act="cancel"]').textContent = opts.cancelLabel || 'Нет';
      } else {
        input.value = opts.value || '';
        input.placeholder = opts.placeholder || '';
      }

      function done(value) {
        dialogOpen = false;
        wrap.remove();
        document.removeEventListener('keydown', onKey, true);
        resolve(value);
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(null); }
      }

      wrap.addEventListener('mousedown', function (e) {
        if (e.target === wrap) done(null);
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        done(opts.kind === 'confirm' ? true : input.value.trim());
      });

      wrap.querySelector('[data-act="cancel"]').addEventListener('click', function () {
        done(opts.kind === 'confirm' ? false : null);
      });

      document.addEventListener('keydown', onKey, true);
      layer.appendChild(wrap);

      if (opts.kind !== 'confirm') {
        input.focus();
        input.select();
      } else {
        wrap.querySelector('[data-act="ok"]').focus();
      }
    });
  }

  function prompt(title, value, placeholder) {
    return dialog({ title: title, value: value, placeholder: placeholder });
  }

  function confirmBox(title, text, okLabel) {
    return dialog({ title: title, text: text, kind: 'confirm', okLabel: okLabel });
  }

  /* Контекстное меню: items = [{label, icon, act, sep}] */
  let ctxEl = null;

  function contextMenu(x, y, items) {
    closeContextMenu();
    const el = document.createElement('div');
    el.className = 'ctxmenu';

    items.forEach(function (item) {
      if (item.sep) {
        const s = document.createElement('div');
        s.className = 'ctxmenu-sep';
        el.appendChild(s);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ctxmenu-item' + (item.danger ? ' is-danger' : '');
      b.innerHTML = '<span class="ctxmenu-ico">' + (item.icon || '') + '</span><span></span>';
      b.lastChild.textContent = item.label;
      b.addEventListener('click', function () {
        closeContextMenu();
        if (item.act) item.act();
      });
      el.appendChild(b);
    });

    document.getElementById('overlayLayer').appendChild(el);
    const rect = el.getBoundingClientRect();
    el.style.left = Math.min(x, window.innerWidth - rect.width - 8) + 'px';
    el.style.top = Math.min(y, window.innerHeight - rect.height - 8) + 'px';
    ctxEl = el;

    setTimeout(function () {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onEsc);
    }, 0);
  }

  function onDown(e) {
    if (ctxEl && !ctxEl.contains(e.target)) closeContextMenu();
  }

  function onEsc(e) {
    if (e.key === 'Escape') closeContextMenu();
  }

  function closeContextMenu() {
    if (!ctxEl) return;
    ctxEl.remove();
    ctxEl = null;
    document.removeEventListener('mousedown', onDown);
    document.removeEventListener('keydown', onEsc);
  }

  window.UI = {
    toast: toast,
    prompt: prompt,
    confirm: confirmBox,
    dialog: dialog,
    contextMenu: contextMenu,
    closeContextMenu: closeContextMenu
  };
})();
