/* ЗАРЯ OS — оконный менеджер в духе Windows 11: снап, кнопки заголовка, панель задач. */
(function () {
  const layer = document.getElementById('windowsLayer');
  const tasksBox = document.getElementById('tasks');
  const desk = document.querySelector('.desk');
  const preview = document.getElementById('snapPreview');

  const wins = new Map();
  const SNAP_EDGE = 22;
  let zTop = 20;
  let activeId = null;
  let cascade = 0;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function focus(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (rec.minimized) {
      rec.minimized = false;
      rec.el.classList.remove('is-min');
      rec.taskEl.classList.remove('is-min');
    }
    zTop += 1;
    if (zTop > 110) {
      const arr = Array.from(wins.values()).sort(function (a, b) {
        return (parseInt(a.el.style.zIndex, 10) || 0) - (parseInt(b.el.style.zIndex, 10) || 0);
      });
      let z = 21;
      arr.forEach(function (r) { r.el.style.zIndex = String(z++); });
      zTop = z;
    }
    rec.el.style.zIndex = String(zTop);
    wins.forEach(function (r) {
      const on = r === rec;
      r.el.classList.toggle('is-active', on);
      r.taskEl.classList.toggle('is-active', on);
    });
    activeId = id;
    if (rec.def.onFocus) {
      try { rec.def.onFocus(rec.api); } catch (e) { console.error(e); }
    }
    window.dispatchEvent(new CustomEvent('zarya:focus', { detail: { id: id } }));
  }

  function minimize(rec) {
    rec.minimized = true;
    rec.el.classList.add('is-min');
    rec.taskEl.classList.add('is-min');
    rec.el.classList.remove('is-active');
    rec.taskEl.classList.remove('is-active');
    if (activeId === rec.id) activeId = null;
  }

  function restoreRect(rec) {
    const p = rec.prev || {};
    rec.el.classList.remove('is-max');
    rec.maximized = false;
    rec.maxBtn.innerHTML = window.ICONS.max;
    rec.maxBtn.setAttribute('aria-label', 'Развернуть');
    rec.el.style.left = (p.left || 120) + 'px';
    rec.el.style.top = (p.top || 80) + 'px';
    rec.el.style.width = (p.width || 760) + 'px';
    rec.el.style.height = (p.height || 500) + 'px';
  }

  function setMaximized(rec) {
    if (!rec.maximized) {
      rec.prev = {
        left: rec.el.offsetLeft,
        top: rec.el.offsetTop,
        width: rec.el.offsetWidth,
        height: rec.el.offsetHeight
      };
    }
    rec.maximized = true;
    rec.el.classList.add('is-max');
    rec.el.style.left = '0px';
    rec.el.style.top = '0px';
    rec.el.style.width = desk.clientWidth + 'px';
    rec.el.style.height = desk.clientHeight + 'px';
    rec.maxBtn.innerHTML = window.ICONS.restore;
    rec.maxBtn.setAttribute('aria-label', 'Восстановить');
  }

  function toggleMaximize(rec) {
    if (rec.maximized) restoreRect(rec);
    else setMaximized(rec);
  }

  function snapTo(rec, zone) {
    if (zone === 'max') {
      setMaximized(rec);
      return;
    }
    if (!rec.maximized) {
      rec.prev = {
        left: rec.el.offsetLeft,
        top: rec.el.offsetTop,
        width: rec.el.offsetWidth,
        height: rec.el.offsetHeight
      };
    }
    rec.maximized = false;
    rec.el.classList.remove('is-max');
    rec.maxBtn.innerHTML = window.ICONS.max;
    const gap = 8;
    const halfW = Math.floor((desk.clientWidth - gap * 3) / 2);
    const h = desk.clientHeight - gap * 2;
    rec.el.style.top = gap + 'px';
    rec.el.style.width = halfW + 'px';
    rec.el.style.height = h + 'px';
    rec.el.style.left = (zone === 'left' ? gap : desk.clientWidth - halfW - gap) + 'px';
  }

  function zoneAt(x, y) {
    if (y <= 8) return 'max';
    if (x <= SNAP_EDGE) return 'left';
    if (x >= desk.clientWidth - SNAP_EDGE) return 'right';
    return null;
  }

  function showPreview(zone) {
    const gap = 8;
    if (!zone) {
      preview.classList.remove('is-on');
      return;
    }
    if (zone === 'max') {
      preview.style.left = '0px';
      preview.style.top = '0px';
      preview.style.width = '100%';
      preview.style.height = '100%';
    } else {
      const halfW = Math.floor((desk.clientWidth - gap * 3) / 2);
      preview.style.top = gap + 'px';
      preview.style.width = halfW + 'px';
      preview.style.height = desk.clientHeight - gap * 2 + 'px';
      preview.style.left = (zone === 'left' ? gap : desk.clientWidth - halfW - gap) + 'px';
    }
    preview.classList.add('is-on');
  }

  function close(id) {
    const rec = wins.get(id);
    if (!rec) return;
    if (rec.def.onClose) {
      try { rec.def.onClose(rec.api); } catch (e) { console.error(e); }
    }
    rec.el.remove();
    rec.taskEl.remove();
    wins.delete(id);
    window.dispatchEvent(new CustomEvent('zarya:close', { detail: { id: id } }));
    if (activeId === id) {
      activeId = null;
      const rest = Array.from(wins.values()).filter(function (r) { return !r.minimized; });
      if (rest.length) focus(rest[rest.length - 1].id);
    }
  }

  function buildWindow(def) {
    const dw = desk.clientWidth;
    const dh = desk.clientHeight;
    const w = clamp(def.w || 760, 340, Math.max(360, dw - 32));
    const h = clamp(def.h || 500, 240, Math.max(280, dh - 32));
    const step = (cascade++ % 5) * 28;

    const el = document.createElement('article');
    el.className = 'win';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', def.name);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = clamp(Math.round((dw - w) / 2) + step - 40, 8, Math.max(8, dw - w - 8)) + 'px';
    el.style.top = clamp(Math.round((dh - h) / 3) + step, 8, Math.max(8, dh - h - 8)) + 'px';

    const bar = document.createElement('header');
    bar.className = 'win-bar';
    bar.innerHTML =
      '<span class="win-ico">' + (def.icon || window.APPICONS.files) + '</span>' +
      '<span class="win-title"></span>' +
      '<span class="win-ctrls">' +
      '  <button type="button" class="win-btn" data-act="min" title="Свернуть" aria-label="Свернуть">' + window.ICONS.min + '</button>' +
      '  <button type="button" class="win-btn" data-act="max" title="Развернуть" aria-label="Развернуть">' + window.ICONS.max + '</button>' +
      '  <button type="button" class="win-btn win-btn--close" data-act="close" title="Закрыть" aria-label="Закрыть">' + window.ICONS.close + '</button>' +
      '</span>';
    bar.querySelector('.win-title').textContent = def.name;

    const body = document.createElement('div');
    body.className = 'win-body';

    const grip = document.createElement('div');
    grip.className = 'win-grip';
    grip.setAttribute('aria-hidden', 'true');

    el.appendChild(bar);
    el.appendChild(body);
    el.appendChild(grip);
    layer.appendChild(el);

    const taskEl = document.createElement('button');
    taskEl.type = 'button';
    taskEl.className = 'task';
    taskEl.title = def.name;
    taskEl.innerHTML =
      '<span class="task-ico">' + (def.icon || window.APPICONS.files) + '</span>' +
      '<span class="task-pip"></span>';
    taskEl.querySelector('.task-ico').setAttribute('aria-hidden', 'true');
    taskEl.setAttribute('aria-label', def.name);
    tasksBox.appendChild(taskEl);

    return { el: el, bar: bar, body: body, grip: grip, taskEl: taskEl };
  }

  function open(id) {
    if (wins.has(id)) {
      focus(id);
      return wins.get(id).api;
    }

    const def = window.APPS[id];
    if (!def) {
      window.UI.toast('Приложение не найдено: ' + id);
      return null;
    }

    const parts = buildWindow(def);
    const rec = {
      id: id,
      def: def,
      el: parts.el,
      body: parts.body,
      taskEl: parts.taskEl,
      minimized: false,
      maximized: false,
      prev: null
    };

    rec.maxBtn = parts.bar.querySelector('[data-act="max"]');

    rec.api = {
      id: id,
      el: parts.el,
      body: parts.body,
      open: open,
      close: function () { close(id); },
      focus: function () { focus(id); },
      setTitle: function (text) {
        parts.el.querySelector('.win-title').textContent = text;
        parts.el.setAttribute('aria-label', text);
        parts.taskEl.setAttribute('aria-label', text);
        parts.taskEl.title = text;
      },
      onClose: function (fn) { rec.def.onClose = fn; }
    };

    wins.set(id, rec);
    window.dispatchEvent(new CustomEvent('zarya:open', { detail: { id: id } }));

    parts.bar.querySelectorAll('.win-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const act = btn.getAttribute('data-act');
        if (act === 'min') minimize(rec);
        else if (act === 'max') { toggleMaximize(rec); focus(id); }
        else close(id);
      });
    });

    parts.bar.addEventListener('dblclick', function (e) {
      if (e.target.closest('.win-btn')) return;
      toggleMaximize(rec);
    });

    parts.el.addEventListener('mousedown', function () { if (activeId !== id) focus(id); });

    /* Перетаскивание заголовка + снап к краям */
    parts.bar.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('.win-btn')) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      let startLeft = parts.el.offsetLeft;
      let startTop = parts.el.offsetTop;
      let baseX = startX;
      let baseY = startY;
      let moved = false;
      let zone = null;

      parts.bar.setPointerCapture(e.pointerId);
      focus(id);

      function move(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        parts.el.classList.add('is-dragging');

        if (rec.maximized) {
          /* вытаскиваем окно из максимизации под курсор */
          restoreRect(rec);
          startLeft = clamp(ev.clientX - parts.el.offsetWidth / 2, 0, desk.clientWidth - 140);
          startTop = Math.max(0, ev.clientY - 20);
          baseX = ev.clientX;
          baseY = ev.clientY;
          parts.el.style.left = startLeft + 'px';
          parts.el.style.top = startTop + 'px';
          return;
        }

        const nx = clamp(startLeft + (ev.clientX - baseX), -parts.el.offsetWidth + 110, desk.clientWidth - 110);
        const ny = clamp(startTop + (ev.clientY - baseY), 0, desk.clientHeight - 44);
        parts.el.style.left = nx + 'px';
        parts.el.style.top = ny + 'px';

        zone = zoneAt(ev.clientX, ev.clientY);
        showPreview(zone);
      }

      function up() {
        parts.bar.removeEventListener('pointermove', move);
        parts.bar.removeEventListener('pointerup', up);
        parts.bar.removeEventListener('pointercancel', up);
        parts.el.classList.remove('is-dragging');
        showPreview(null);
        if (moved && zone) snapTo(rec, zone);
        zone = null;
      }

      parts.bar.addEventListener('pointermove', move);
      parts.bar.addEventListener('pointerup', up);
      parts.bar.addEventListener('pointercancel', up);
    });

    /* Изменение размера */
    parts.grip.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const w0 = parts.el.offsetWidth;
      const h0 = parts.el.offsetHeight;
      const left0 = parts.el.offsetLeft;
      const top0 = parts.el.offsetTop;

      parts.grip.setPointerCapture(e.pointerId);
      parts.el.classList.add('is-resizing');

      function move(ev) {
        const nw = clamp(w0 + ev.clientX - startX, 340, desk.clientWidth - left0);
        const nh = clamp(h0 + ev.clientY - startY, 220, desk.clientHeight - top0);
        parts.el.style.width = nw + 'px';
        parts.el.style.height = nh + 'px';
      }
      function up() {
        parts.grip.removeEventListener('pointermove', move);
        parts.grip.removeEventListener('pointerup', up);
        parts.grip.removeEventListener('pointercancel', up);
        parts.el.classList.remove('is-resizing');
      }
      parts.grip.addEventListener('pointermove', move);
      parts.grip.addEventListener('pointerup', up);
      parts.grip.addEventListener('pointercancel', up);
    });

    /* Панель задач */
    parts.taskEl.addEventListener('click', function () {
      if (activeId === id && !rec.minimized) minimize(rec);
      else focus(id);
    });
    parts.taskEl.addEventListener('auxclick', function (e) {
      if (e.button === 1) close(id);
    });

    if (rec.def.mount) rec.def.mount(rec.api);
    focus(id);
    return rec.api;
  }

  window.addEventListener('resize', function () {
    wins.forEach(function (rec) {
      if (rec.maximized) {
        rec.el.style.width = desk.clientWidth + 'px';
        rec.el.style.height = desk.clientHeight + 'px';
        return;
      }
      if (rec.el.offsetLeft > desk.clientWidth - 120) {
        rec.el.style.left = Math.max(0, desk.clientWidth - 120) + 'px';
      }
      if (rec.el.offsetTop > desk.clientHeight - 60) {
        rec.el.style.top = Math.max(0, desk.clientHeight - 60) + 'px';
      }
    });
  });

  window.WM = {
    open: open,
    close: close,
    focus: focus,
    isActive: function (id) { return activeId === id; },
    activeId: function () { return activeId; },
    minimizeAll: function () { wins.forEach(minimize); },
    list: function () { return Array.from(wins.keys()); },
    minimize: function (id) { const r = wins.get(id); if (r) minimize(r); },
    toggleMaximize: function (id) { const r = wins.get(id); if (r) { toggleMaximize(r); focus(id); } }
  };
})();
