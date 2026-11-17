/* ЗАРЯ OS — иконки. Только SVG: цветные «приложения» и монохромные глифы интерфейса. */
(function () {
  function line(inner, sw) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="' + (sw || 1.4) + '" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>'
    );
  }

  function solid(inner) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>'
    );
  }

  /* — глифы интерфейса (наследуют цвет текста) — */
  const ICONS = {
    min: line('<path d="M5.5 12h13"/>'),
    max: line('<rect x="5.5" y="5.5" width="13" height="13" rx="1.4"/>'),
    restore: line(
      '<rect x="4.2" y="8.4" width="11.4" height="11.4" rx="1.4"/>' +
      '<path d="M8 8.4V5.8A1.6 1.6 0 0 1 9.6 4.2h8.6A1.6 1.6 0 0 1 19.8 5.8v8.6a1.6 1.6 0 0 1-1.6 1.6h-2.8"/>'
    ),
    close: line('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    search: line('<circle cx="10.6" cy="10.6" r="6.4"/><path d="M15.4 15.4L20.2 20.2"/>'),
    chevron: line('<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>'),
    chevronDown: line('<path d="M5.5 9.5l6.5 6.5 6.5-6.5"/>'),
    arrowLeft: line('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    arrowUp: line('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    plus: line('<path d="M12 5.5v13M5.5 12h13"/>'),
    trash: line(
      '<path d="M4.6 7h14.8M9.6 7V4.8h4.8V7M6.9 7l.9 12.2h8.4L17.1 7"/>' +
      '<path d="M10.5 10.6v5.6M13.5 10.6v5.6"/>'
    ),
    refresh: line('<path d="M20 11.5A8 8 0 1 0 18 17"/><path d="M20 5v6.5h-6.5"/>'),
    check: line('<path d="M5 12.6l4.6 4.6L19 7.4"/>'),
    power: line('<path d="M12 3.4v8.4"/><path d="M6.6 6.9a7.7 7.7 0 1 0 10.8 0"/>'),
    edit: line('<path d="M15.5 4.8l3.7 3.7-9.8 9.8-4.6 1 1-4.6z"/><path d="M13.6 6.7l3.7 3.7"/>'),
    folderPlus: line(
      '<path d="M3 8.4A2.4 2.4 0 0 1 5.4 6h3l1.8 2h7.4A2.4 2.4 0 0 1 20 10.4v6.8a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 17.2z"/>' +
      '<path d="M11.5 12v4.4M9.3 14.2h4.4"/>'
    ),
    filePlus: line(
      '<path d="M6.5 3h7.2L19 8.3V21H6.5z"/><path d="M13.7 3v5.3H19"/>' +
      '<path d="M12.7 12v5M10.2 14.5h5"/>'
    ),
    paint: line(
      '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
      '<path d="M3 15l4.6-4.6 4.2 4.2 2.9-2.9L21 18"/>' +
      '<circle cx="8.4" cy="8.6" r="1.3"/>'
    ),
    monitor: line(
      '<rect x="3" y="4.5" width="18" height="12" rx="2"/>' +
      '<path d="M9 20.5h6M12 16.5v4"/>'
    ),
    wifi: line(
      '<path d="M3.4 9.2a13.2 13.2 0 0 1 17.2 0"/>' +
      '<path d="M6.8 12.7a8.4 8.4 0 0 1 10.4 0"/>' +
      '<path d="M10.1 16.1a3.9 3.9 0 0 1 3.8 0"/>' +
      '<circle cx="12" cy="19.2" r="1.15" fill="currentColor" stroke="none"/>'
    ),
    volume: line(
      '<path d="M4 9.6h2.8L11 6.1v11.8L6.8 14.4H4z"/>' +
      '<path d="M14.4 9.4a4 4 0 0 1 0 5.2"/><path d="M17.2 6.8a7.6 7.6 0 0 1 0 10.4"/>'
    ),
    battery: line(
      '<rect x="2.4" y="7.6" width="17.2" height="8.8" rx="2.2"/>' +
      '<path d="M21.6 10.6v2.8"/>' +
      '<rect x="5" y="10.1" width="9.6" height="3.8" rx="1" fill="currentColor" stroke="none"/>'
    ),
    bluetooth: line('<path d="M8 6.6l8 5.4-8 5.4"/><path d="M8 17.4l8-5.4-8-5.4"/><path d="M12 3v18"/>'),
    plane: line(
      '<path d="M12 3.4c.9 0 1.6 1.1 1.6 2.4v3.7l6.9 3.6v2.3l-6.9-1.9v4l2.5 1.8v1.9L12 20.3l-4.1 1.9v-1.9l2.5-1.8v-4L3.5 16.4v-2.3l6.9-3.6V5.8c0-1.3.7-2.4 1.6-2.4z"/>'
    ),
    moon: line('<path d="M20 14.4A8.4 8.4 0 0 1 9.6 4 8.6 8.6 0 1 0 20 14.4z"/>'),
    sun: line(
      '<circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>'
    ),
    user: line('<circle cx="12" cy="8.6" r="3.9"/><path d="M4.6 20.2a7.8 7.8 0 0 1 14.8 0"/>'),
    palette: line(
      '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.3 0 2-.9 2-2 0-1.1-.8-1.6-.8-2.6 0-1 .8-1.7 1.9-1.7h1.5a4.2 4.2 0 0 0 4.2-4.2c0-4-4.2-7.1-8.8-7.1z"/>' +
      '<circle cx="8.4" cy="10" r="1.1" fill="currentColor" stroke="none"/>' +
      '<circle cx="11.6" cy="7.4" r="1.1" fill="currentColor" stroke="none"/>' +
      '<circle cx="15.4" cy="8.6" r="1.1" fill="currentColor" stroke="none"/>'
    ),
    grid: line(
      '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.2"/>' +
      '<rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.2"/>' +
      '<rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.2"/>' +
      '<rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.2"/>'
    ),
    lock: line('<rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2.2"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>')
  };

  /* — логотип «Пуск»: четыре квадрата — */
  ICONS.start = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="2.6" y="2.6" width="8.4" height="8.4" rx="1.1" fill="currentColor"/>' +
    '<rect x="13" y="2.6" width="8.4" height="8.4" rx="1.1" fill="currentColor"/>' +
    '<rect x="2.6" y="13" width="8.4" height="8.4" rx="1.1" fill="currentColor"/>' +
    '<rect x="13" y="13" width="8.4" height="8.4" rx="1.1" fill="currentColor"/>' +
    '</svg>'
  );

  /* — цветные иконки приложений — */
  const APP = {};

  APP.files = solid(
    '<path d="M2.5 9.4a2.4 2.4 0 0 1 2.4-2.4h6.3l2.4 2.4h11.5a2.4 2.4 0 0 1 2.4 2.4v13.3a2.4 2.4 0 0 1-2.4 2.4H4.9a2.4 2.4 0 0 1-2.4-2.4z" fill="#0f6cbd"/>' +
    '<path d="M4.2 12.6h24.6l-2.1 12.1a2.4 2.4 0 0 1-2.4 2H4.9a2.4 2.4 0 0 1-2.4-2.4V15a2.4 2.4 0 0 1 1.7-2.4z" fill="#4cc2ff"/>' +
    '<path d="M4.2 12.6h24.6l-.4 2.6H4.2z" fill="#d8f1ff" opacity=".55"/>'
  );

  APP.terminal = solid(
    '<rect x="2" y="4" width="28" height="24" rx="4.5" fill="#2a323c"/>' +
    '<rect x="4.2" y="6.2" width="23.6" height="19.6" rx="3" fill="#10151b"/>' +
    '<path d="M8.6 12.4l3 2.9-3 2.9" fill="none" stroke="#4cc2ff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M14.4 18.4h5.6" fill="none" stroke="#e8eef6" stroke-width="1.9" stroke-linecap="round"/>'
  );

  APP.notes = solid(
    '<path d="M6.4 3.2h13.2L26 9.6V28.8H6.4z" fill="#f7f9fb"/>' +
    '<path d="M19.6 3.2L26 9.6h-6.4z" fill="#b9cbe0"/>' +
    '<path d="M9.8 13.4h9.6M9.8 17.4h9.6M9.8 21.4h6" stroke="#8fa3b8" stroke-width="1.5" stroke-linecap="round"/>'
  );

  APP.calc = solid(
    '<rect x="3" y="2.4" width="26" height="27.2" rx="4" fill="#2b7cd3"/>' +
    '<rect x="7" y="6.2" width="18" height="6.2" rx="1.8" fill="#0b2b4a" opacity=".55"/>' +
    '<g fill="#dcecfa">' +
    '<circle cx="9.6" cy="16.6" r="1.9"/><circle cx="16" cy="16.6" r="1.9"/><circle cx="22.4" cy="16.6" r="1.9"/>' +
    '<circle cx="9.6" cy="22.6" r="1.9"/><circle cx="16" cy="22.6" r="1.9"/><circle cx="22.4" cy="22.6" r="1.9"/>' +
    '</g>'
  );

  APP.settings = solid(
    '<g fill="none" stroke="#c9d2dc" stroke-width="2.2" stroke-linecap="round">' +
    '<path d="M6 10.4h7M19.4 10.4h6.6M6 21.6h4.6M16.8 21.6h9.2"/>' +
    '</g>' +
    '<circle cx="16.2" cy="10.4" r="3.6" fill="#4cc2ff"/>' +
    '<circle cx="11.6" cy="21.6" r="3.6" fill="#4cc2ff"/>'
  );

  APP.game = solid(
    '<rect x="2" y="6.4" width="28" height="19.2" rx="8" fill="#107c10"/>' +
    '<path d="M8.4 12.4v7.2M4.8 16h7.2" fill="none" stroke="#e8f6e4" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="21" cy="14" r="1.7" fill="#e8f6e4"/>' +
    '<circle cx="24.4" cy="18" r="1.7" fill="#e8f6e4"/>'
  );

  APP.about = solid(
    '<rect x="2.4" y="5.6" width="27.2" height="17.6" rx="3.2" fill="#0f6cbd"/>' +
    '<rect x="5" y="8.2" width="22" height="12.4" rx="1.8" fill="#bfe6ff"/>' +
    '<path d="M11.6 26.6h8.8" stroke="#c9d2dc" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M16 23.2v3.4" stroke="#c9d2dc" stroke-width="2.4"/>'
  );

  APP.mail = solid(
    '<rect x="2.4" y="7.2" width="27.2" height="18.4" rx="3.4" fill="#2b7cd3"/>' +
    '<path d="M4.2 9.8l11.8 7.9 11.8-7.9" fill="none" stroke="#cbe9ff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="2.4" y="7.2" width="27.2" height="18.4" rx="3.4" fill="none" stroke="#1b5f9e" stroke-width="1"/>'
  );

  APP.netmap = solid(
    '<rect x="2" y="3.2" width="28" height="25.6" rx="3.6" fill="#121a23"/>' +
    '<g stroke="#3f8fd6" stroke-width="1.4" opacity=".75">' +
    '<path d="M9.6 20.4l6.4-6.6 6.2 4.4"/>' +
    '<path d="M9.6 20.4l6.2-10.8 6.4 10.8"/>' +
    '</g>' +
    '<circle cx="9.6" cy="20.4" r="2.2" fill="#4cc2ff"/>' +
    '<circle cx="16" cy="9.6" r="2.2" fill="#7ce38b"/>' +
    '<circle cx="22.4" cy="18.2" r="2.2" fill="#4cc2ff"/>' +
    '<circle cx="16" cy="9.6" r="5" fill="none" stroke="#7ce38b" stroke-width=".9" opacity=".5"/>'
  );

  APP.shop = solid(
    '<path d="M5.4 12.4h21.2L24.4 28a2 2 0 0 1-2 1.6H9.6a2 2 0 0 1-2-1.6z" fill="#ffb347"/>' +
    '<path d="M11 12.4V9.6a5 5 0 0 1 10 0v2.8" fill="none" stroke="#e08a1e" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M12.6 16.6h7.2" stroke="#8a4f06" stroke-width="1.8" stroke-linecap="round" opacity=".65"/>'
  );

  APP.folderMini = solid(
    '<path d="M2.5 9.4a2.4 2.4 0 0 1 2.4-2.4h6.3l2.4 2.4h11.5a2.4 2.4 0 0 1 2.4 2.4v13.3a2.4 2.4 0 0 1-2.4 2.4H4.9a2.4 2.4 0 0 1-2.4-2.4z" fill="#0f6cbd"/>' +
    '<path d="M4.2 12.6h24.6l-2.1 12.1a2.4 2.4 0 0 1-2.4 2H4.9a2.4 2.4 0 0 1-2.4-2.4V15a2.4 2.4 0 0 1 1.7-2.4z" fill="#4cc2ff"/>'
  );

  APP.fileMini = solid(
    '<path d="M7 3h10.6L25 10.4V29H7z" fill="#e9eef4"/>' +
    '<path d="M17.6 3L25 10.4h-7.4z" fill="#b9cbe0"/>' +
    '<path d="M10.6 15h10.8M10.6 19h10.8M10.6 23h7" stroke="#8fa3b8" stroke-width="1.6" stroke-linecap="round"/>'
  );

  APP.noteMini = solid(
    '<path d="M6.4 3.2h13.2L26 9.6V28.8H6.4z" fill="#f7f9fb" stroke="#c9d2dc" stroke-width="1"/>' +
    '<path d="M19.6 3.2L26 9.6h-6.4z" fill="#b9cbe0"/>' +
    '<path d="M9.8 14h9.6M9.8 18h9.6M9.8 22h6" stroke="#4cc2ff" stroke-width="1.6" stroke-linecap="round"/>'
  );

  window.ICONS = ICONS;
  window.APPICONS = APP;
})();
