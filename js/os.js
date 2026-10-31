/* Desktop shell, window manager, Start menu, notifications, keyboard control. */
(function () {
  'use strict';
  const { esc, fmtDate, fmtTime, dateKey, simNow, toast, modal, confirm, Bus, openGlossary, openShortcuts, openHelp,
    clamp, debounce, $, $$ } = Utils;

  const windows = new Map();
  let zCounter = 20;
  let activeId = null;
  let altTab = { active:false, index:0 };
  let lastFocusedBeforeFlyout = null;
  let clockTimer = null;
  let initialized = false;
  let startView = 'pinned';
  let keyboardMove = null;
  const TASKBAR_PINNED = ['mail', 'teams', 'calendar', 'browser', 'sheets', 'files', 'docs', 'todo', 'drive', 'training', 'assistant'];

  function catalog(id) { return Data.appCatalog.find(a => a.id === id); }
  function appIconHtml(id, cls) {
    const meta = catalog(id);
    return Icons.icon(meta ? meta.icon : id, cls || '');
  }
  function desktopSize() {
    const d = document.getElementById('desktop');
    return { w:d ? d.clientWidth : window.innerWidth, h:d ? d.clientHeight : window.innerHeight };
  }

  function init() {
    if (initialized) return;
    initialized = true;
    applyWallpaper();
    applyAccent();
    renderDesktopIcons();
    renderTaskbarApps();
    renderStart();
    renderNotif();
    renderAccount();
    renderPresence();
    renderClock();
    quickSettingsState();
    applyDisplaySettings();
    bindShell();
    bindKeyboard();
    bindGlobalActions();
    document.addEventListener('mouseup', () => { document.querySelectorAll('.window').forEach(w => w.classList.remove('dragging')); });
    // Restore or seed the workspace windows.
    const ui = Store.state.ui;
    if (!ui.hasBooted) {
      ui.hasBooted = true;
      ui.openWindows = ['training'];
      Store.saveNow();
    }
    const restore = Array.isArray(ui.openWindows) ? ui.openWindows.slice(0, 5) : [];
    if (restore.length) {
      restore.forEach((id, i) => {
        if (!App.get(id)) return;
        setTimeout(() => openApp(id), 100 + i * 80);
      });
    }
    window.addEventListener('resize', debounce(clampAllWindows, 120));
    clockTimer = setInterval(renderClock, 10000);
    Bus.on('store:reset', () => { renderDesktopIcons(); renderTaskbarApps(); renderNotif(); renderAccount(); });
    Bus.on('teams:presence', renderPresence);
    setTimeout(() => { hideBoot(); updateBadges(); }, 380);
  }

  function hideBoot() {
    const boot = document.getElementById('boot-screen');
    if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 460); }
    if (!Store.state.signedIn && !sessionStorage.getItem('appello-welcome-shown')) {
      sessionStorage.setItem('appello-welcome-shown', '1');
      setTimeout(() => {
        toast('Welcome to your training workstation', 'You are signed out. Open Training Hub or choose Sign in from Start to begin your simulated shift. No password is needed.', { duration:6200, kind:'training', icon:'🎓' });
      }, 700);
    }
  }

  /* ------------------------------ wallpaper ----------------------------- */
  function applyWallpaper() {
    const wall = document.querySelector('.wallpaper');
    if (!wall) return;
    wall.className = 'wallpaper theme-' + (Store.state.ui.wallpaper || 'aurora');
  }
  function applyAccent() {
    const accent = Store.state.ui.accent || '#1169c9';
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-strong', accent);
    document.documentElement.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} 13%, white)`);
    document.documentElement.style.setProperty('--accent-softer', `color-mix(in srgb, ${accent} 7%, white)`);
  }
  function personalize() {
    const themes = [
      { id:'aurora', name:'APPELLO Aurora', colors:['#07162f','#1d4f92','#8b5cf6'] },
      { id:'dusk', name:'Executive Dusk', colors:['#221b34','#573e77','#d58b6d'] },
      { id:'tide', name:'Tidewater', colors:['#062b32','#0f6b78','#5fb0b8'] }
    ];
    modal({
      title:'Personalize this desktop',
      subtitle:'A calm desktop is part of the training environment. Choose a wallpaper; it saves in this browser.',
      size:'wide',
      body:`<div class="personalize-grid">${themes.map(t => `<button class="wallpaper-option ${Store.state.ui.wallpaper === t.id ? 'selected' : ''}" data-wallpaper="${t.id}" style="background:linear-gradient(135deg,${t.colors.join(',')})"><span class="wallpaper-option-mark">A</span><strong>${esc(t.name)}</strong><span>${Store.state.ui.wallpaper === t.id ? 'Current' : 'Apply'}</span></button>`).join('')}</div>
        <div class="help-callout" style="margin-top:14px"><span>🎨</span><div>Display settings change this training desktop only.</div></div>`,
      footer:`<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close]').onclick = close;
        el.querySelectorAll('[data-wallpaper]').forEach(b => b.onclick = () => {
          Store.update(s => { s.ui.wallpaper = b.dataset.wallpaper; });
          applyWallpaper(); close(); toast('Wallpaper changed', 'The training desktop has a new look.', { kind:'success', duration:2400 });
        });
      }
    });
  }

  /* ---------------------------- desktop icons ---------------------------- */
  function renderDesktopIcons() {
    const holder = document.getElementById('desktop-icons');
    if (!holder) return;
    const order = Store.state.ui.desktopIconOrder || [];
    const icons = (Data.desktopIcons || []).slice().sort((a, b) => {
      const ai = order.indexOf(a.app), bi = order.indexOf(b.app);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    const iconFor = item => Icons.icon(item.icon || (catalog(item.app) || {}).icon || item.app, 'icon-tile');
    const mobileTap = window.matchMedia('(max-width: 760px)').matches;
    const launchItem = item => {
      if (item.external) {
        Utils.openExternal(item.external);
        Bus.emit('browser:external-opened', { url:item.external, label:item.label });
        return;
      }
      openApp(item.app);
    };
    holder.innerHTML = icons.map(item => `<button class="desktop-icon ${item.external ? 'executable' : ''}" data-desktop-app="${item.app}" ${item.external ? `data-external="${esc(item.external)}"` : ''} data-tip="${mobileTap ? 'Tap' : 'Double-click'} to ${item.external ? 'run' : 'open'} ${esc(item.label)}. Right-click for more options.">
      ${iconFor(item)}
      <span class="label">${esc(item.label)}</span>
    </button>`).join('');
    holder.querySelectorAll('[data-desktop-app]').forEach(el => {
      const item = icons.find(i => i.app === el.dataset.desktopApp);
      if (!item) return;
      el.onclick = () => {
        holder.querySelectorAll('.desktop-icon').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        if (mobileTap) launchItem(item);
      };
      if (!mobileTap) el.ondblclick = () => launchItem(item);
      el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); launchItem(item); } };
      el.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
        holder.querySelectorAll('.desktop-icon').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        if (item.external) {
          contextMenu(e.clientX, e.clientY, [
            { label:'Run', icon:'▶', action:() => launchItem(item) },
            { label:'Copy link', icon:'⧉', action:() => { if (navigator.clipboard) navigator.clipboard.writeText(item.external); toast('Link copied', item.external, { duration:3000 }); } },
            { separator:true },
            { label:'Properties', icon:'ⓘ', action:() => toast(item.label, 'Executable-style shortcut. It is allowed to open only its linked page.', { duration:3500 }) }
          ]);
          return;
        }
        contextMenu(e.clientX, e.clientY, [
          { label:'Open', icon:'↗', action:() => launchItem(item) },
          { label:'Pin to Start', icon:'📌', action:() => toast('Pinned to Start', `${(catalog(item.app) || {}).name || item.label} is already available in Start.`, { duration:2400 }) },
          { separator:true },
          { label:'Properties', icon:'ⓘ', action:() => toast((catalog(item.app) || {}).name || item.label, 'This shortcut opens an APPELLO training app.', { duration:3500 }) }
        ]);
      };
    });
    document.getElementById('desktop').onclick = e => {
      if (e.target.id === 'desktop' || e.target.classList.contains('wallpaper') || e.target.closest('.wallpaper')) {
        holder.querySelectorAll('.desktop-icon').forEach(x => x.classList.remove('selected'));
        closeFlyouts();
      }
    };
    document.getElementById('desktop').oncontextmenu = e => {
      if (e.target.closest('.window') || e.target.closest('.desktop-icon') || e.target.closest('.taskbar') || e.target.closest('.training-banner')) return;
      e.preventDefault();
      desktopContext(e.clientX, e.clientY);
    };
  }

  function desktopContext(x, y) {
    contextMenu(x, y, [
      { label:'Refresh', icon:'↻', action:() => { renderDesktopIcons(); renderTaskbarApps(); toast('Refreshed', 'Desktop icons and the taskbar are up to date.', { duration:1800 }); } },
      { label:'Sort icons by name', icon:'⇅', action:sortDesktopIcons },
      { separator:true },
      { label:'New folder', icon:'📁', action:createDesktopFolder },
      { label:'New document', icon:'📄', action:createDesktopDoc },
      { separator:true },
      { label:'Personalize', icon:'🎨', action:personalize },
      { label:'Open Training Hub', icon:'🎓', action:() => openApp('training') },
      { label:'Display settings', icon:'⚙', action:personalize }
    ]);
  }
  function sortDesktopIcons() {
    Store.update(s => {
      const icons = (Data.desktopIcons || []).slice().sort((a,b) => a.label.localeCompare(b.label));
      s.ui.desktopIconOrder = icons.map(i => i.app);
    });
    renderDesktopIcons();
    toast('Desktop sorted', 'Icons are now in alphabetical order.', { kind:'success', duration:2200 });
  }
  function rootFolder() { return Store.state.files.find(f => f.type === 'folder' && !f.parentId && !f.deletedAt); }
  function createDesktopFolder() {
    const name = uniqueFileName('New folder', null);
    const f = { id:Utils.uid('f'), parentId:null, name, type:'folder', color:'#d9a53a', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    Store.update(s => s.files.push(f));
    Bus.emit('file:created', { fileId:f.id, name, type:'folder', source:'desktop' });
    toast('Folder created', `${name} is in Files.`, { kind:'success', duration:2600 });
  }
  function createDesktopDoc() {
    const name = uniqueFileName('Untitled document', null, '.docx');
    const id = Utils.uid('f');
    Store.update(s => s.files.push({ id, parentId:null, name, type:'doc', content:'<h1>Untitled document</h1><p>Start writing here.</p>', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }));
    Bus.emit('file:created', { fileId:id, name, type:'doc', source:'desktop' });
    openApp('docs', { fileId:id });
  }
  function uniqueFileName(base, parentId, ext) {
    const existing = new Set(Store.state.files.filter(f => f.parentId === parentId).map(f => f.name.toLowerCase()));
    let name = base + (ext || ''), n = 2;
    while (existing.has(name.toLowerCase())) name = `${base} ${n++}${ext || ''}`;
    return name;
  }

  /* ------------------------------ windows -------------------------------- */
  function makeWindowRect(appId) {
    const meta = catalog(appId) || {};
    const desktop = desktopSize();
    const saved = Store.state.ui.windowRects && Store.state.ui.windowRects[appId];
    const offset = (windows.size % 4) * 26;
    const width = clamp(saved ? saved.width : (meta.defaultWidth || 860), 340, desktop.w - 20);
    const height = clamp(saved ? saved.height : (meta.defaultHeight || 620), 240, desktop.h - 18);
    const x = clamp(saved ? saved.x : Math.round((desktop.w - width) / 2) + offset, 6, Math.max(6, desktop.w - width - 6));
    const y = clamp(saved ? saved.y : Math.max(10, Math.round((desktop.h - height) / 2) - 16 + offset), 6, Math.max(6, desktop.h - height - 6));
    return { x, y, width, height, maximized: !!(saved && saved.maximized) };
  }

  function openApp(appId, params) {
    const def = App.get(appId);
    const meta = catalog(appId);
    if (!def) { toast('App unavailable', 'That app is not registered in this training build.', { kind:'error' }); return null; }
    closeFlyouts();
    if (windows.has(appId)) {
      const win = windows.get(appId);
      if (win.minimized) restoreWindow(win);
      focusWindow(win);
      if (def.reopen) { try { def.reopen(params, win); } catch (e) { console.error(e); } }
      Bus.emit('app:focused', { appId, params: params || null });
      return win;
    }
    const rect = makeWindowRect(appId);
    const layer = document.getElementById('window-layer');
    const el = document.createElement('section');
    el.className = 'window active-window';
    el.id = 'window-' + appId;
    el.dataset.windowId = appId;
    el.setAttribute('role', 'dialog');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-label', (meta ? meta.name : appId) + ' window');
    el.style.left = rect.x + 'px';
    el.style.top = rect.y + 'px';
    el.style.width = rect.width + 'px';
    el.style.height = rect.height + 'px';
    el.style.zIndex = String(++zCounter);
    el.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title-icon">${appIconHtml(appId)}</span>
        <div class="window-title">${esc(meta ? meta.name : appId)}</div>
        <div class="window-controls">
          <button class="window-control" data-win-min aria-label="Minimize" data-tip="Minimize this window."><svg viewBox="0 0 10 10"><path d="M1 5h8"/></svg></button>
          <button class="window-control" data-win-max aria-label="Maximize" data-tip="Maximize or restore. Hover for snap layouts."><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx=".5"/></svg></button>
          <button class="window-control close" data-win-close aria-label="Close" data-tip="Close this window (Alt+F4)."><svg viewBox="0 0 10 10"><path d="m1 1 8 8M9 1 1 9"/></svg></button>
        </div>
        <div class="snap-flyout" data-snap-flyout hidden>
          <div class="snap-flyout-head">Snap layout</div>
          <div class="snap-options">
            <button data-snap="left" class="snap-option" aria-label="Snap left half"><span class="snap-diagram"><i style="width:48%"></i></span></button>
            <button data-snap="right" class="snap-option" aria-label="Snap right half"><span class="snap-diagram"><i style="width:48%;margin-left:auto"></i></span></button>
            <button data-snap="tl" class="snap-option" aria-label="Snap top left"><span class="snap-diagram split"><i></i><i></i></span></button>
            <button data-snap="full" class="snap-option" aria-label="Maximize"><span class="snap-diagram"><i style="width:100%"></i></span></button>
          </div>
        </div>
      </div>
      <div class="window-body"></div>
      ${['n','s','e','w','ne','nw','se','sw'].map(d => `<div class="window-resize ${d}" data-resize="${d}"></div>`).join('')}`;
    layer.appendChild(el);
    const win = {
      id: appId, element: el, body: el.querySelector('.window-body'), def, meta,
      minimized:false, maximized:rect.maximized, previousRect:null,
      setTitle(title, subtitle) {
        const t = el.querySelector('.window-title');
        if (t) t.innerHTML = esc(title) + (subtitle ? `<small>${esc(subtitle)}</small>` : '');
      },
      focus() { focusWindow(win); },
      close() { closeWindow(win); },
      minimize() { minimizeWindow(win); },
      maximize() { maximizeWindow(win); }
    };
    windows.set(appId, win);
    bindWindow(win);
    if (rect.maximized) setMaximizedState(win, true, false);
    try {
      def.mount(win.body, win, params || {});
    } catch (err) {
      console.error('App failed to mount:', appId, err);
      win.body.innerHTML = `<div class="empty-state" style="height:100%"><div class="empty-icon">⚠</div><h3>This app hit an error</h3><p>${esc(err.message || 'Unknown error')}</p><button class="btn" onclick="location.reload()">Reload training OS</button></div>`;
      toast('App error', 'A training app failed to load. Reload the page or reset the data.', { kind:'error', duration:6000 });
    }
    focusWindow(win);
    persistWindows();
    Bus.emit('app:opened', { appId, title:meta ? meta.name : appId, params:params || null });
    return win;
  }

  function bindWindow(win) {
    const el = win.element;
    el.addEventListener('mousedown', () => focusWindow(win), true);
    el.querySelector('[data-win-min]').onclick = e => { e.stopPropagation(); minimizeWindow(win); };
    el.querySelector('[data-win-max]').onclick = e => { e.stopPropagation(); maximizeWindow(win); };
    el.querySelector('[data-win-close]').onclick = e => { e.stopPropagation(); closeWindow(win); };
    const titlebar = el.querySelector('.window-titlebar');
    const maxBtn = el.querySelector('[data-win-max]');
    const snapFlyout = el.querySelector('[data-snap-flyout]');
    if (maxBtn && snapFlyout) {
      let hideTimer = null;
      const showSnap = () => { clearTimeout(hideTimer); snapFlyout.hidden = false; };
      const hideSnap = () => { hideTimer = setTimeout(() => { snapFlyout.hidden = true; }, 160); };
      maxBtn.addEventListener('mouseenter', showSnap);
      maxBtn.addEventListener('mouseleave', hideSnap);
      snapFlyout.addEventListener('mouseenter', showSnap);
      snapFlyout.addEventListener('mouseleave', hideSnap);
      snapFlyout.querySelectorAll('[data-snap]').forEach(b => b.onclick = e => {
        e.stopPropagation(); snapFlyout.hidden = true; snapWindow(win, b.dataset.snap);
      });
      titlebar.addEventListener('mouseleave', hideSnap);
    }
    titlebar.addEventListener('dblclick', e => { if (!window.matchMedia('(max-width: 760px)').matches && !e.target.closest('.window-control')) maximizeWindow(win); });
    titlebar.addEventListener('mousedown', e => {
      if (e.target.closest('.window-control') || e.button !== 0) return;
      if (window.matchMedia('(max-width: 760px)').matches) return;
      if (win.maximized) return;
      focusWindow(win);
      const startX = e.clientX, startY = e.clientY;
      const startLeft = parseFloat(el.style.left) || 0, startTop = parseFloat(el.style.top) || 0;
      el.classList.add('dragging');
      const move = ev => {
        const d = desktopSize();
        const width = el.offsetWidth, height = el.offsetHeight;
        el.style.left = clamp(startLeft + ev.clientX - startX, -width + 120, d.w - 120) + 'px';
        el.style.top = clamp(startTop + ev.clientY - startY, 0, d.h - 50) + 'px';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        el.classList.remove('dragging');
        saveWindowRect(win);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    });
    el.querySelectorAll('[data-resize]').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        if (win.maximized || window.matchMedia('(max-width: 760px)').matches) return;
        e.preventDefault(); e.stopPropagation();
        focusWindow(win);
        const dir = handle.dataset.resize;
        const startX = e.clientX, startY = e.clientY;
        const startLeft = parseFloat(el.style.left) || 0, startTop = parseFloat(el.style.top) || 0;
        const startW = el.offsetWidth, startH = el.offsetHeight;
        const d0 = desktopSize();
        el.classList.add('resizing');
        const move = ev => {
          let x = startLeft, y = startTop, w = startW, h = startH;
          if (dir.includes('e')) w = clamp(startW + ev.clientX - startX, 360, d0.w - startLeft - 4);
          if (dir.includes('s')) h = clamp(startH + ev.clientY - startY, 260, d0.h - startTop - 4);
          if (dir.includes('w')) { const nw = clamp(startW - (ev.clientX - startX), 360, startLeft + startW - 4); x = startLeft + startW - nw; w = nw; }
          if (dir.includes('n')) { const nh = clamp(startH - (ev.clientY - startY), 260, startTop + startH - 4); y = startTop + startH - nh; h = nh; }
          el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
        };
        const up = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
          el.classList.remove('resizing');
          saveWindowRect(win);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    });
    el.querySelector('.window-titlebar').addEventListener('contextmenu', e => {
      e.preventDefault();
      contextMenu(e.clientX, e.clientY, [
        { label:'Restore', icon:'⤢', action:() => maximizeWindow(win) },
        { label:'Minimize', icon:'—', action:() => minimizeWindow(win) },
        { separator:true },
        { label:'Close', icon:'✕', action:() => closeWindow(win), danger:true }
      ]);
    });
  }

  function focusWindow(win) {
    if (!win) return;
    activeId = win.id;
    windows.forEach(w => {
      w.element.classList.toggle('active-window', w === win);
      w.element.classList.toggle('inactive', w !== win);
    });
    if (win.minimized) restoreWindow(win);
    win.element.style.zIndex = String(++zCounter);
    win.element.focus({ preventScroll:true });
    renderTaskbarApps();
    Store.update(s => { s.ui.activeWindow = win.id; });
  }
  function minimizeWindow(win) {
    win.minimized = true;
    win.element.classList.add('minimized');
    if (activeId === win.id) {
      activeId = null;
      const other = Array.from(windows.values()).filter(w => !w.minimized).sort((a,b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
      if (other) focusWindow(other);
    }
    renderTaskbarApps(); persistWindows();
    Bus.emit('app:minimized', { appId:win.id });
  }
  function restoreWindow(win) {
    win.minimized = false;
    win.element.classList.remove('minimized');
    focusWindow(win);
  }
  function maximizeWindow(win) {
    setMaximizedState(win, !win.maximized, true);
    Bus.emit('app:maximized', { appId:win.id, maximized:win.maximized });
  }
  function setMaximizedState(win, on, save) {
    const el = win.element;
    if (on) {
      win.previousRect = { x:parseFloat(el.style.left) || 0, y:parseFloat(el.style.top) || 0, width:el.offsetWidth, height:el.offsetHeight };
      win.maximized = true;
      el.classList.add('maximized');
      el.style.left = '0px'; el.style.top = '0px'; el.style.width = '100%'; el.style.height = '100%';
    } else {
      win.maximized = false;
      el.classList.remove('maximized');
      if (win.previousRect) { el.style.left = win.previousRect.x + 'px'; el.style.top = win.previousRect.y + 'px'; el.style.width = win.previousRect.width + 'px'; el.style.height = win.previousRect.height + 'px'; }
      else { const r = makeWindowRect(win.id); el.style.left = r.x+'px'; el.style.top = r.y+'px'; el.style.width = r.width+'px'; el.style.height = r.height+'px'; }
    }
    if (save) saveWindowRect(win);
  }
  function snapWindow(win, kind) {
    if (!win) return;
    if (kind === 'full') { if (!win.maximized) maximizeWindow(win); return; }
    const d = desktopSize();
    const gap = 3;
    const halfW = Math.floor((d.w - gap * 3) / 2);
    const halfH = Math.floor((d.h - gap * 3) / 2);
    let x = gap, y = gap, width = halfW, height = halfH;
    if (kind === 'right') { x = halfW + gap * 2; width = d.w - x - gap; height = d.h - gap * 2; }
    else if (kind === 'left') { width = halfW; height = d.h - gap * 2; }
    else if (kind === 'tr') { x = halfW + gap * 2; width = d.w - x - gap; }
    else if (kind === 'bl') { y = halfH + gap * 2; height = d.h - y - gap; }
    else if (kind === 'br') { x = halfW + gap * 2; y = halfH + gap * 2; width = d.w - x - gap; height = d.h - y - gap; }
    if (!win.maximized) win.previousRect = { x:parseFloat(win.element.style.left) || 0, y:parseFloat(win.element.style.top) || 0, width:win.element.offsetWidth, height:win.element.offsetHeight };
    win.maximized = false;
    win.element.classList.remove('maximized');
    win.element.style.left = x + 'px'; win.element.style.top = y + 'px';
    win.element.style.width = width + 'px'; win.element.style.height = height + 'px';
    saveWindowRect(win);
    focusWindow(win);
    Bus.emit('app:snapped', { appId:win.id, snap:kind });
  }
  function showDesktop() {
    const visible = Array.from(windows.values()).filter(w => !w.minimized);
    if (visible.length) {
      visible.forEach(w => minimizeWindow(w));
      toast('Desktop', 'Windows minimized. Click the taskbar or press Ctrl+Alt+D again to restore.', { duration:2200 });
    } else {
      Array.from(windows.values()).forEach(w => restoreWindow(w));
    }
  }
  function activeWindowForKeyboard() { return activeId ? windows.get(activeId) : null; }
  function systemMenu() {
    const win = activeWindowForKeyboard();
    if (!win) return;
    const rect = win.element.getBoundingClientRect();
    contextMenu(rect.left + 24, rect.top + 38, [
      { label:'Restore', icon:'❐', action:() => { if (win.maximized) setMaximizedState(win, false, true); else restoreWindow(win); } },
      { label:'Move', icon:'✥', shortcut:'M', action:() => startKeyboardMove(win, 'move') },
      { label:'Size', icon:'⤡', shortcut:'S', action:() => startKeyboardMove(win, 'resize') },
      { label:'Minimize', icon:'—', shortcut:'N', action:() => minimizeWindow(win) },
      { label:'Maximize', icon:'□', shortcut:'X', action:() => { if (!win.maximized) maximizeWindow(win); } },
      { separator:true },
      { label:'Close', icon:'✕', shortcut:'C', danger:true, action:() => closeWindow(win) }
    ]);
  }
  function startKeyboardMove(win, type) {
    keyboardMove = { win, type };
    toast(type === 'move' ? 'Keyboard move' : 'Keyboard resize', 'Use the arrow keys. Hold Shift for larger steps. Press Enter or Escape when finished.', { duration:5200 });
    win.element.classList.add('keyboard-managed');
  }
  function closeWindow(win) {
    if (!win) return;
    if (win.def && win.def.beforeClose) { try { win.def.beforeClose(win); } catch (e) { console.error(e); } }
    if (win.def && win.def.destroy) { try { win.def.destroy(); } catch (e) { console.error(e); } }
    win.element.classList.add('closing');
    const id = win.id;
    setTimeout(() => win.element.remove(), 170);
    windows.delete(id);
    if (activeId === id) {
      activeId = null;
      const next = Array.from(windows.values()).filter(w => !w.minimized).sort((a,b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
      if (next) focusWindow(next);
    }
    renderTaskbarApps(); persistWindows();
    Bus.emit('app:closed', { appId:id });
  }
  function saveWindowRect(win) {
    if (!win || win.maximized) {
      if (win) {
        Store.update(s => {
          s.ui.windowRects = s.ui.windowRects || {};
          s.ui.windowRects[win.id] = Object.assign({}, s.ui.windowRects[win.id], { maximized:win.maximized });
        });
      }
      return;
    }
    Store.update(s => {
      s.ui.windowRects = s.ui.windowRects || {};
      s.ui.windowRects[win.id] = { x:parseFloat(win.element.style.left) || 0, y:parseFloat(win.element.style.top) || 0, width:win.element.offsetWidth, height:win.element.offsetHeight, maximized:false };
    });
  }
  function persistWindows() {
    Store.update(s => { s.ui.openWindows = Array.from(windows.keys()); });
  }
  function clampAllWindows() {
    const d = desktopSize();
    windows.forEach(win => {
      if (win.maximized) return;
      const el = win.element;
      let x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
      let w = Math.min(el.offsetWidth, d.w - 4), h = Math.min(el.offsetHeight, d.h - 4);
      x = clamp(x, -w + 140, Math.max(6, d.w - 140));
      y = clamp(y, 0, Math.max(0, d.h - 50));
      el.style.left = x+'px'; el.style.top = y+'px'; el.style.width = w+'px'; el.style.height = h+'px';
    });
  }

  /* ------------------------------ taskbar -------------------------------- */
  function renderTaskbarApps() {
    const holder = document.getElementById('taskbar-apps');
    if (!holder) return;
    const openIds = Array.from(windows.keys());
    const ids = TASKBAR_PINNED.concat(openIds.filter(id => !TASKBAR_PINNED.includes(id)));
    holder.innerHTML = ids.map(id => {
      const win = windows.get(id);
      const meta = catalog(id);
      const running = !!win;
      const active = running && id === activeId && !win.minimized;
      return `<button class="taskbar-app ${running ? 'running' : 'pinned-only'} ${active ? 'active' : ''}" data-taskbar-app="${id}" data-tip="${esc(meta ? meta.name : id)}${running && win.minimized ? ' (minimized)' : ''}" aria-label="${esc(meta ? meta.name : id)}">
        ${appIconHtml(id)}<span class="running-dot"></span>
      </button>`;
    }).join('');
    holder.querySelectorAll('[data-taskbar-app]').forEach(btn => {
      const id = btn.dataset.taskbarApp;
      const win = windows.get(id);
      btn.onclick = () => {
        if (!win) { openApp(id); return; }
        if (win.minimized) restoreWindow(win);
        else if (activeId === id) minimizeWindow(win);
        else focusWindow(win);
      };
      btn.oncontextmenu = e => {
        e.preventDefault();
        contextMenu(e.clientX, e.clientY - 110, win ? [
          { label:'Open / focus', icon:'↗', action:() => { restoreWindow(win); focusWindow(win); } },
          { label:win.minimized ? 'Restore' : 'Minimize', icon:'—', action:() => win.minimized ? restoreWindow(win) : minimizeWindow(win) },
          { separator:true },
          { label:'Close window', icon:'✕', action:() => closeWindow(win), danger:true }
        ] : [{ label:'Open', icon:'↗', action:() => openApp(id) }, { label:'Pin to taskbar', icon:'📌', action:() => toast('Already pinned', `${catalog(id) ? catalog(id).name : id} is pinned to the taskbar.`, { duration:2200 }) }]);
      };
    });
  }
  function renderClock() {
    const now = simNow();
    const time = document.getElementById('taskbar-time');
    const date = document.getElementById('taskbar-date');
    if (time) time.textContent = fmtTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    if (date) date.textContent = 'Mon, Nov 9';
  }
  function renderPresence() {
    const status = Store.state.settings.presence || 'Available';
    const dot = document.getElementById('presence-dot');
    const label = document.getElementById('presence-label');
    if (dot) dot.className = 'presence-dot ' + Utils.statusColor(status);
    if (label) label.textContent = status;
    const hasCalls = false;
  }
  function presenceMenu(anchor) {
    const current = Store.state.settings.presence || 'Available';
    const rect = anchor.getBoundingClientRect();
    contextMenu(rect.left, rect.top - 205, ['Available','Busy','In a Meeting','Away','Do Not Disturb'].map(status => ({
      label:status, icon:status === current ? '●' : '', action:() => {
        Store.update(s => { s.settings.presence = status; s.teams.presence = status; });
        renderPresence();
        Bus.emit('teams:presence', { status });
        toast('Presence updated', `You are now ${status}.`, { kind:'success', duration:2400 });
      }
    })));
  }

  /* -------------------------------- start -------------------------------- */
  function openStart(focusSearch) {
    const menu = document.getElementById('start-menu');
    if (!menu) return;
    closeOtherFlyouts('start');
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    document.getElementById('start-button').setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      startView = 'pinned';
      showStartView('pinned');
      renderStart();
      lastFocusedBeforeFlyout = document.activeElement;
      Bus.emit('ui:start-opened', {});
      if (focusSearch !== false) setTimeout(() => { const input = document.getElementById('start-search-input'); if (input) { input.focus(); input.select(); } }, 30);
    }
  }
  function showStartView(view) {
    startView = view;
    const defaults = document.getElementById('start-default-content');
    const all = document.getElementById('start-all-apps');
    const results = document.getElementById('start-search-results');
    if (defaults) defaults.hidden = view !== 'pinned';
    if (all) all.hidden = view !== 'all';
    if (results) results.hidden = true;
    const search = document.getElementById('start-search-input');
    if (search && !search.value) search.value = '';
  }
  function renderStart() {
    const pinned = document.getElementById('start-pinned');
    const allList = document.getElementById('start-all-list');
    if (!pinned) return;
    const apps = Data.appCatalog;
    const pinnedApps = apps.filter(app => app.pinned !== false);
    pinned.innerHTML = pinnedApps.map(app => `<button class="start-app" data-start-app="${app.id}" data-tip="Open ${esc(app.name)}.">${appIconHtml(app.id)}<span>${esc(app.name)}</span></button>`).join('');
    pinned.querySelectorAll('[data-start-app]').forEach(b => b.onclick = () => { document.getElementById('start-menu').hidden = true; openApp(b.dataset.startApp); });
    if (allList) {
      const sorted = apps.slice().sort((a, b) => a.name.localeCompare(b.name));
      let letter = '';
      allList.innerHTML = sorted.map(app => {
        const first = app.name[0].toUpperCase();
        const heading = first !== letter ? `<div class="start-all-letter">${esc(first)}</div>` : '';
        letter = first;
        return `${heading}<button class="start-all-row" data-start-app="${app.id}" data-tip="Open ${esc(app.name)}.">${appIconHtml(app.id)}<span><strong>${esc(app.name)}</strong><small>${esc(appDesc(app.id))}</small></span></button>`;
      }).join('');
      allList.querySelectorAll('[data-start-app]').forEach(b => b.onclick = () => { document.getElementById('start-menu').hidden = true; openApp(b.dataset.startApp); });
    }
    const recent = document.getElementById('start-recent');
    const recentIds = (Store.state.recentFiles || []).slice(0, 6);
    const files = recentIds.map(id => Store.fileById(id)).filter(f => f && !f.deletedAt);
    recent.innerHTML = files.length ? files.map(f => `<button class="recent-item" data-recent-file="${f.id}" data-tip="Open ${esc(f.name)} in its app.">${fileTile(f)}<span class="ri-meta"><strong>${esc(f.name)}</strong><small>${fileKind(f)} · ${folderOf(f)}</small></span></button>`).join('')
      : `<div class="muted-small" style="padding:8px 4px;grid-column:span 2">Open a file and it will appear here.</div>`;
    recent.querySelectorAll('[data-recent-file]').forEach(b => b.onclick = () => { document.getElementById('start-menu').hidden = true; openFile(b.dataset.recentFile); });
    const account = document.getElementById('account-status');
    if (account) account.textContent = Store.state.signedIn ? 'Training EA · Signed in' : 'Training EA · Signed out';
    const count = document.getElementById('notif-count');
    if (count) count.textContent = Store.state.notifications.filter(n => !n.read).length;
  }
  function fileTile(f) {
    if (f.type === 'folder') return `<span class="icon-tile" style="width:27px;height:27px">${Icons.icons.folder}</span>`;
    if (f.type === 'sheet') return `<span class="icon-tile" style="width:27px;height:27px">${Icons.icons.sheet}</span>`;
    return `<span class="icon-tile" style="width:27px;height:27px">${Icons.icons.doc}</span>`;
  }
  function fileKind(f) { return f.type === 'sheet' ? 'Workbook' : f.type === 'folder' ? 'Folder' : 'Document'; }
  function folderOf(f) { const p = f.parentId ? Store.fileById(f.parentId) : null; return p ? p.name : 'Home'; }

  function startSearch(value) {
    const results = document.getElementById('start-search-results');
    const defaults = document.getElementById('start-default-content');
    if (!results) return;
    const q = String(value || '').trim().toLowerCase();
    const allApps = document.getElementById('start-all-apps');
    if (!q) {
      results.hidden = true;
      defaults.hidden = startView !== 'pinned';
      if (allApps) allApps.hidden = startView !== 'all';
      return;
    }
    if (defaults) defaults.hidden = true;
    if (allApps) allApps.hidden = true;
    results.hidden = false;
    const found = [];
    Data.appCatalog.forEach(app => { if (app.name.toLowerCase().includes(q)) found.push({ kind:'app', id:app.id, title:app.name, sub:'App', icon:appIconHtml(app.id), run:() => openApp(app.id) }); });
    Store.state.files.filter(f => !f.deletedAt && f.name.toLowerCase().includes(q)).slice(0, 8).forEach(f => {
      found.push({ kind:'file', id:f.id, title:f.name, sub:fileKind(f) + ' · ' + folderOf(f), icon:fileTile(f), run:() => openFile(f.id) });
    });
    Store.state.contacts.filter(c => `${c.name} ${c.company} ${c.title}`.toLowerCase().includes(q)).slice(0, 6).forEach(c => {
      found.push({ kind:'contact', id:c.id, title:c.name, sub:c.title + ' · ' + c.company, icon:Icons.avatar(c.name, 'avatar-sm', c.tone), run:() => openApp('mail', { view:'contacts', contactId:c.id }) });
    });
    Store.state.mail.emails.filter(e => (e.subject + ' ' + e.from.name).toLowerCase().includes(q)).slice(0, 8).forEach(e => {
      found.push({ kind:'email', id:e.id, title:e.subject || '(no subject)', sub:'Mail · ' + e.from.name, icon:appIconHtml('mail'), run:() => openApp('mail', { emailId:e.id }) });
    });
    if (window.Training && Training.searchScenarios) {
      Training.searchScenarios(q).slice(0, 6).forEach(s => found.push({ kind:'training', id:s.id, title:s.title, sub:'Training · Level ' + s.level, icon:appIconHtml('training'), run:() => { openApp('training'); setTimeout(() => Training.openScenario(s.id), 180); } }));
    }
    results.innerHTML = found.length ? found.slice(0, 16).map((r, i) => `<button class="search-result" data-search-index="${i}" data-tip="Open this result.">${r.icon}<span class="sr-meta"><strong>${esc(r.title)}</strong><small>${esc(r.sub)}</small></span></button>`).join('')
      : `<div class="search-empty"><div style="font-size:28px;opacity:.5">⌕</div><p style="font-size:12px;margin-top:7px">No results for “${esc(value)}”.</p><p class="muted-small" style="margin-top:4px">Try an app, a person, a subject, or a training skill.</p></div>`;
    results.hidden = false; defaults.hidden = true;
    results.querySelectorAll('[data-search-index]').forEach(b => b.onclick = () => {
      const r = found[Number(b.dataset.searchIndex)];
      document.getElementById('start-menu').hidden = true;
      if (r && r.run) r.run();
    });
    results._found = found;
  }

  /* ---------------------------- notifications ---------------------------- */
  function openNotifications() {
    const panel = document.getElementById('notification-center');
    if (!panel) return;
    closeOtherFlyouts('notif');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      lastFocusedBeforeFlyout = document.activeElement;
      renderNotif();
      Store.update(s => { s.notifications.forEach(n => n.read = true); });
      updateBadges();
    }
  }
  function renderNotif(tab) {
    const holder = document.getElementById('notif-list');
    if (!holder) return;
    const activeTab = tab || document.querySelector('.notif-tabs button.active')?.dataset.notifTab || 'all';
    document.querySelectorAll('.notif-tabs button').forEach(b => b.classList.toggle('active', b.dataset.notifTab === activeTab));
    const list = Store.state.notifications.filter(n => activeTab === 'all' || n.type === activeTab);
    holder.innerHTML = list.length ? list.map(n => `<button class="notif-item ${n.read ? '' : 'unread'}" data-notif="${n.id}" data-tip="Open this notification."><span class="icon-tile">${appIconHtml(n.app)}</span><span class="notif-copy"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${esc(Utils.relativeTime(n.at))}</small></span></button>`).join('')
      : `<div class="notif-empty"><div style="font-size:31px;opacity:.45;margin-bottom:8px">🔔</div><strong style="font-size:12px">Nothing here</strong><p style="font-size:11px;margin-top:4px">New training feedback and work updates will appear here.</p></div>`;
    holder.querySelectorAll('[data-notif]').forEach(b => b.onclick = () => openNotification(b.dataset.notif));
    const count = document.getElementById('notif-count');
    if (count) count.textContent = Store.state.notifications.length;
    renderNotifCalendar();
    updateBadges();
  }
  function openNotification(id) {
    const n = Store.state.notifications.find(x => x.id === id);
    if (!n) return;
    Store.update(s => { const note = s.notifications.find(x => x.id === id); if (note) note.read = true; });
    document.getElementById('notification-center').hidden = true;
    if (n.app === 'mail') openApp('mail', { view:'mail', folder:'inbox' });
    else if (n.app === 'calendar') openApp('mail', { view:'calendar' });
    else if (n.app === 'teams') openApp('teams');
    else if (n.app === 'training') openApp('training');
    else if (n.app === 'todo') openApp('todo');
    else openApp(n.app);
    updateBadges();
  }
  function notify(title, body, options) {
    const opts = options || {};
    const n = { id:Utils.uid('notif'), app:opts.app || 'training', type:opts.type || 'training', title, body, at:new Date().toISOString(), read:false };
    Store.update(s => s.notifications.unshift(n));
    renderNotif();
    updateBadges();
    if (!Store.state.settings.focusAssist || opts.force) {
      toast(title, body, { kind:opts.kind || 'training', icon:opts.icon || '🔔', duration:opts.duration || 5200 });
    }
    return n;
  }
  function updateBadges() {
    const unread = Store.state.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.hidden = unread === 0; badge.textContent = unread > 9 ? '9+' : String(unread); }
    const count = document.getElementById('notif-count');
    if (count) count.textContent = unread;
  }

  /* ------------------------------- account ------------------------------- */
  function renderAccount() {
    const name = document.getElementById('account-name');
    const status = document.getElementById('account-status');
    const panelShift = document.getElementById('account-panel-shift');
    const signed = Store.state.signedIn;
    if (name) name.textContent = Store.state.profile.name;
    if (status) status.textContent = signed ? 'Training EA · Signed in' : 'Training EA · Signed out';
    if (panelShift) panelShift.textContent = signed ? 'Shift active · Available' : 'Shift not started';
  }
  function openAccount() {
    const panel = document.getElementById('account-panel');
    if (!panel) return;
    closeOtherFlyouts('account');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { renderAccount(); lastFocusedBeforeFlyout = document.activeElement; Bus.emit('ui:account-opened', {}); }
  }
  function signIn() {
    const ref = modal({
      title:'Start your simulated shift',
      subtitle:'No password, account, or personal data is required. This sign-in exists only for the training scenario.',
      size:'narrow',
      body:`<div class="signin-hero"><div class="signin-mark">A</div><h2>${esc(Store.state.profile.name)}</h2><p>Executive Assistant to Alexandra Morgan<br>APPELLO · Executive Office</p></div>
        <div class="signin-body"><div class="user-choice">${Icons.avatar(Store.state.profile.name, 'avatar-lg', 2)}<div><strong>${esc(Store.state.profile.name)}</strong><small>Training profile · no password needed</small></div></div>
        <label class="checkbox-row"><input type="checkbox" checked id="signin-ack"><span>I understand this is a fictional training workplace and no data leaves this browser.</span></label><p class="muted-small" style="margin-top:12px;line-height:1.5">Signing in marks the start of your shift and helps the Training Hub track your progress. You can sign out at any time from Start.</p></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-signin>Sign in as Elizabeth</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-signin]').onclick = () => {
          if (!el.querySelector('#signin-ack').checked) { toast('Please acknowledge', 'This is a fictional training environment.', { kind:'error' }); return; }
          Store.update(s => { s.signedIn = true; s.signedInAt = new Date().toISOString(); s.settings.presence = 'Available'; s.teams.presence = 'Available'; });
          close(); renderAccount(); renderPresence();
          document.querySelectorAll('#toasts .toast').forEach(node => node.remove());
          const startMenu = document.getElementById('start-menu');
          const accountPanel = document.getElementById('account-panel');
          if (startMenu) startMenu.hidden = true;
          if (accountPanel) accountPanel.hidden = true;
          Bus.emit('session:signed-in', { name:Store.state.profile.name });
          toast('Shift started', 'You are signed in as Elizabeth Hale, Executive Assistant. Open Training Hub to begin.', { kind:'success', duration:4600, icon:'✓' });
        };
      }
    });
  }
  function signOut() {
    if (!Store.state.signedIn) { toast('Already signed out', 'Start a simulated shift from the account panel whenever you are ready.', { duration:2800 }); return; }
    Store.update(s => { s.signedIn = false; s.signedInAt = null; s.settings.presence = 'Away'; s.teams.presence = 'Away'; });
    renderAccount(); renderPresence();
    Bus.emit('session:signed-out', {});
    document.getElementById('account-panel').hidden = true;
    toast('Shift ended', 'You are signed out. Your training data is still saved in this browser.', { kind:'success', duration:3400 });
  }

  /* ---------------------- Windows 11 shell panels ------------------------ */
  function quickSettingsState() {
    const ui = Store.state.ui;
    if (!ui.quickSettings) ui.quickSettings = { wifi:true, bluetooth:false, airplane:false, batterySaver:false, nightLight:false, volume:72, brightness:100 };
    const q = ui.quickSettings;
    if (q.volume == null) q.volume = 72;
    if (q.brightness == null) q.brightness = 100;
    return q;
  }
  function applyDisplaySettings() {
    const q = quickSettingsState();
    document.documentElement.style.setProperty('--screen-dim', String(((100 - Number(q.brightness || 100)) / 100) * .58));
    document.body.classList.toggle('night-light', !!q.nightLight);
    const network = document.getElementById('tray-network');
    if (network) network.classList.toggle('offline', !q.wifi || !!q.airplane);
    const volume = document.getElementById('tray-volume');
    if (volume) volume.classList.toggle('muted', Number(q.volume) === 0);
    const battery = document.getElementById('tray-battery');
    if (battery) {
      const b = battery.querySelector('b');
      if (b) b.textContent = '92';
      battery.classList.toggle('charging', false);
    }
  }
  function qsIcon(name) {
    const paths = {
      wifi:'<path d="M2.5 8.5a14 14 0 0 1 19 0M5.5 11.7a9.5 9.5 0 0 1 13 0M8.7 14.8a4.8 4.8 0 0 1 6.6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="18.2" r="1.35" fill="currentColor"/>',
      bluetooth:'<path d="M7 7.2 17 16.8l-5 4.2V3l5 4.2L7 16.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      airplane:'<path d="m12 3 2 7 5.5 3.2v2L14 14l-1 5 2 1.6V22l-3-1-3 1v-1.4L11 19l-1-5-5.5 1.2v-2L10 10l2-7Z" fill="currentColor"/>',
      battery:'<rect x="3" y="8" width="16" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M21 11v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="5.5" y="10.5" width="10" height="4" rx=".7" fill="currentColor"/>',
      moon:'<path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.6 8.6 0 1 0 20 15.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
      accessibility:'<circle cx="12" cy="4.8" r="1.8" fill="currentColor"/><path d="M5 8h14M12 8v6M12 14l-3.6 6M12 14l3.6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      brightness:'<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      volume:'<path d="M4 9.5h3.3L12 5.8v12.4l-4.7-3.7H4V9.5Z" fill="currentColor"/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.8 6.8a8 8 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      gear:Icons.icons.settings,
      power:'<path d="M12 2.8v8.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6.1 6.4a7.5 7.5 0 1 0 11.8 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`;
  }
  function renderQuickSettings() {
    const panel = document.getElementById('quick-settings');
    if (!panel) return;
    const q = quickSettingsState();
    const tile = (key, icon, label, sub) => `<button class="qs-tile ${q[key] ? 'on' : ''}" data-qs-toggle="${key}" data-tip="${esc(label)}: ${q[key] ? 'On' : 'Off'}"><span class="qs-icon">${qsIcon(icon)}</span><span class="qs-label">${esc(label)}</span><small>${esc(sub)}</small></button>`;
    panel.innerHTML = `<div class="qs-head"><strong>Quick settings</strong><button type="button" class="icon-btn" data-qs-settings data-tip="Open all Settings.">${qsIcon('gear')}</button></div>
      <div class="qs-connections"><button class="qs-connection" data-qs-settings><span>${qsIcon('wifi')}</span><div><strong>${q.airplane ? 'Airplane mode' : q.wifi ? 'APPELLO-Guest' : 'Wi-Fi off'}</strong><small>${q.airplane ? 'Wireless off' : q.wifi ? 'Connected, secured' : 'Not connected'}</small></div><span class="qs-chevron">›</span></button><button class="qs-connection" data-qs-settings><span>${qsIcon('bluetooth')}</span><div><strong>${q.bluetooth ? 'Bluetooth' : 'Bluetooth off'}</strong><small>${q.bluetooth ? 'Ready to pair' : 'Not connected'}</small></div><span class="qs-chevron">›</span></button></div>
      <div class="qs-grid">${tile('wifi','wifi','Wi-Fi', q.wifi ? 'Connected' : 'Off')}${tile('bluetooth','bluetooth','Bluetooth', q.bluetooth ? 'On' : 'Off')}${tile('airplane','airplane','Airplane mode', q.airplane ? 'On' : 'Off')}${tile('batterySaver','battery','Battery saver', q.batterySaver ? 'On' : '92%')}${tile('nightLight','moon','Night light', q.nightLight ? 'On' : 'Off')}<button class="qs-tile" data-qs-accessibility data-tip="Open accessibility settings."><span class="qs-icon">${qsIcon('accessibility')}</span><span class="qs-label">Accessibility</span><small>Settings</small></button></div>
      <div class="qs-sliders"><label><span>${qsIcon('brightness')}</span><input id="qs-brightness" type="range" min="25" max="100" value="${Number(q.brightness)}" aria-label="Brightness"></label><label><span>${qsIcon('volume')}</span><input id="qs-volume" type="range" min="0" max="100" value="${Number(q.volume)}" aria-label="Volume"><b>${q.volume === 0 ? 'Mute' : q.volume}</b></label></div>
      <div class="qs-footer"><span class="qs-battery"><b>92%</b><small>About 6h 12m left</small></span><button type="button" class="icon-btn" data-qs-settings aria-label="Settings">${qsIcon('gear')}</button><button type="button" class="icon-btn" data-qs-power aria-label="Power">${qsIcon('power')}</button></div>`;
    panel.querySelectorAll('[data-qs-toggle]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.qsToggle;
      if (key === 'airplane' && !q.airplane) { q.airplane = true; q.wifi = false; q.bluetooth = false; }
      else q[key] = !q[key];
      Store.commit(); applyDisplaySettings(); renderQuickSettings();
      Bus.emit('ui:quick-setting', { setting:key, value:q[key] });
    });
    panel.querySelectorAll('[data-qs-settings]').forEach(btn => btn.onclick = () => { panel.hidden = true; openApp('settings'); });
    panel.querySelectorAll('[data-qs-accessibility]').forEach(btn => btn.onclick = () => { panel.hidden = true; openApp('settings', { section:'accessibility' }); });
    panel.querySelectorAll('[data-qs-power]').forEach(btn => btn.onclick = () => { panel.hidden = true; openPowerMenu(); });
    const brightness = panel.querySelector('#qs-brightness');
    if (brightness) brightness.oninput = () => { q.brightness = Number(brightness.value); applyDisplaySettings(); Store.commit(); };
    const volume = panel.querySelector('#qs-volume');
    if (volume) volume.oninput = () => { q.volume = Number(volume.value); applyDisplaySettings(); const badge = panel.querySelector('.qs-sliders label:last-child b'); if (badge) badge.textContent = q.volume === 0 ? 'Mute' : q.volume; Store.commit(); };
  }
  function openQuickSettings() {
    const panel = document.getElementById('quick-settings');
    if (!panel) return;
    closeOtherFlyouts('quick');
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    if (willOpen) { renderQuickSettings(); applyDisplaySettings(); }
  }
  function calendarMiniHtml() {
    const now = simNow();
    const year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const today = dateKey(now);
    const busy = new Set(Store.state.calendar.events.map(e => e.date));
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = dateKey(d);
      days.push(`<button class="mini-day ${d.getMonth() !== month ? 'outside' : ''} ${key === today ? 'today' : ''} ${busy.has(key) ? 'busy' : ''}" data-mini-date="${key}" data-tip="${esc(fmtDate(d, 'full'))}${busy.has(key) ? ' · has events' : ''}">${d.getDate()}<i></i></button>`);
    }
    return `<div class="mini-weekdays">${['S','M','T','W','T','F','S'].map(x => `<span>${x}</span>`).join('')}</div><div class="mini-days">${days.join('')}</div>`;
  }
  function agendaHtml(limit) {
    const today = dateKey(simNow());
    const items = Store.state.calendar.events.filter(e => e.date === today).sort((a,b) => a.start.localeCompare(b.start)).slice(0, limit || 4);
    if (!items.length) return `<div class="agenda-empty">No meetings today. Protect some focus time.</div>`;
    return items.map(ev => `<button class="agenda-item" data-agenda-event="${ev.id}"><span class="agenda-time">${esc(fmtTime(ev.start))}</span><span class="agenda-copy"><strong>${esc(ev.title)}</strong><small>${esc(ev.room || ev.location || 'Executive calendar')}</small></span></button>`).join('');
  }
  function renderNotifCalendar() {
    const cal = document.getElementById('notif-mini-calendar');
    if (!cal) return;
    const now = simNow();
    cal.innerHTML = calendarMiniHtml();
    const month = document.getElementById('notif-cal-month');
    if (month) month.textContent = now.toLocaleDateString('en-US', { month:'long', year:'numeric' });
    const agenda = document.getElementById('notif-agenda');
    if (agenda) agenda.innerHTML = `<div class="agenda-head"><strong>Today</strong><span>${esc(now.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }))}</span></div>${agendaHtml(3)}`;
    cal.querySelectorAll('[data-mini-date]').forEach(b => b.onclick = () => { const panel = document.getElementById('notification-center'); if (panel) panel.hidden = true; openApp('mail', { view:'calendar', focusDate:b.dataset.miniDate }); });
    const ag = document.getElementById('notif-agenda');
    if (ag) ag.querySelectorAll('[data-agenda-event]').forEach(b => b.onclick = () => { const panel = document.getElementById('notification-center'); if (panel) panel.hidden = true; openApp('mail', { view:'calendar', focusDate:simNow ? (Store.eventById(b.dataset.agendaEvent) || {}).date : undefined }); });
  }

  function openWidgets() {
    const panel = document.getElementById('widgets-panel');
    if (!panel) return;
    closeOtherFlyouts('widgets');
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    if (!willOpen) return;
    const today = simNow().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    const todo = Store.state.todos.filter(t => !t.done);
    panel.innerHTML = `<div class="widgets-head"><div><strong>Widgets</strong><small>${esc(today)}</small></div><button class="icon-btn" data-close-widgets aria-label="Close widgets">✕</button></div>
      <div class="widgets-grid">
        <article class="widget widget-weather"><div class="widget-weather-top"><span class="widget-sun">☁</span><div><strong>14°</strong><small>Light rain</small></div></div><div class="widget-weather-meta"><span>New York</span><span>H:17° L:9°</span></div><p>Rain clears by 13:00. Alexandra has a car at 15:30.</p></article>
        <article class="widget widget-calendar"><div class="widget-title"><strong>Calendar</strong><button class="link-btn" data-widget-action="calendar">Open</button></div>${calendarMiniHtml()}<div class="widget-agenda">${agendaHtml(2)}</div></article>
        <article class="widget widget-todo"><div class="widget-title"><strong>Tasks</strong><button class="link-btn" data-widget-action="todo">Open</button></div><div class="widget-todo-count">${todo.filter(t => t.myDay).length}<span>My Day</span></div><div class="widget-todo-list">${todo.slice(0,3).map(t => `<button data-widget-action="todo"><span class="priority-dot ${t.priority}"></span><span>${esc(t.title)}</span><small>${esc(t.due || '')}</small></button>`).join('')}</div></article>
        <article class="widget widget-training"><div class="widget-title"><strong>Training</strong><button class="link-btn" data-widget-action="training">Open</button></div><p class="widget-train-eyebrow">NEXT SCENARIO</p><h3>${esc((Training.scenarios.find(s => !Training.progress[s.id]?.completed) || Training.scenarios[0]).title)}</h3><p>Keep the executive office moving. The coach will guide every step.</p><button class="btn primary small" data-widget-action="training">Continue learning</button></article>
      </div>`;
    panel.querySelector('[data-close-widgets]').onclick = () => { panel.hidden = true; };
    panel.querySelectorAll('[data-widget-action]').forEach(b => b.onclick = () => {
      const type = b.dataset.widgetAction;
      panel.hidden = true;
      if (type === 'calendar') openApp('mail', { view:'calendar' });
      else if (type === 'todo') openApp('todo');
      else openApp('training');
    });
    panel.querySelectorAll('[data-mini-date]').forEach(b => b.onclick = () => { panel.hidden = true; openApp('mail', { view:'calendar', focusDate:b.dataset.miniDate }); });
  }

  function openTaskView() {
    const overlay = document.getElementById('task-view');
    if (!overlay) return;
    closeOtherFlyouts('taskview');
    const list = Array.from(windows.values());
    overlay.hidden = false;
    overlay.innerHTML = `<div class="taskview-shell"><div class="taskview-head"><div><span class="eyebrow">Task view</span><h2>Desktop 1</h2></div><div class="inline-actions"><button class="btn small" data-taskview-new>+ New desktop</button><button class="icon-btn" data-taskview-x aria-label="Close task view">✕</button></div></div>
      <div class="taskview-grid">${list.length ? list.map(w => {
        const meta = w.meta || { name:w.id };
        return `<article class="taskview-card ${w.id === activeId ? 'active' : ''}" data-taskview-window="${w.id}" data-tip="Switch to ${esc(meta.name)}."><div class="taskview-preview" style="--preview-hue:${(meta.name.length * 31) % 360}"><span>${appIconHtml(w.id)}</span><div class="taskview-preview-lines"><i></i><i></i><i></i></div></div><div class="taskview-card-foot"><strong>${esc(meta.name)}</strong><small>${w.minimized ? 'Minimized' : 'Open'}</small><button type="button" class="taskview-close" data-taskview-close="${w.id}" aria-label="Close ${esc(meta.name)}">✕</button></div></article>`;
      }).join('') : '<div class="taskview-empty">No open windows. Open an app from Start.</div>'}</div>
      <div class="taskview-desktops"><button class="taskview-desktop active"><span class="desktop-thumb"></span><strong>Desktop 1</strong><small>Current</small></button><button class="taskview-desktop new" data-taskview-new><span class="desktop-thumb plus">+</span><strong>New desktop</strong></button></div></div>`;
    overlay.querySelector('[data-taskview-x]').onclick = () => { overlay.hidden = true; };
    overlay.querySelectorAll('[data-taskview-new]').forEach(b => b.onclick = () => toast('Desktop 2', 'Virtual desktops are not needed in this single-workspace training desktop.', { duration:3000 }));
    overlay.querySelectorAll('[data-taskview-window]').forEach(card => card.onclick = () => {
      const win = windows.get(card.dataset.taskviewWindow);
      overlay.hidden = true;
      if (win) { restoreWindow(win); focusWindow(win); }
    });
    overlay.querySelectorAll('[data-taskview-close]').forEach(btn => btn.onclick = e => {
      e.stopPropagation();
      const win = windows.get(btn.dataset.taskviewClose);
      if (win) closeWindow(win);
      openTaskView();
    });
    overlay.onclick = e => { if (e.target === overlay) overlay.hidden = true; };
  }

  function openPowerMenu() {
    const panel = document.getElementById('power-menu');
    if (!panel) return;
    closeOtherFlyouts('power');
    panel.hidden = false;
    panel.innerHTML = `<div class="power-menu-head"><span class="avatar avatar-sm">EH</span><div><strong>${esc(Store.state.profile.name)}</strong><small>Training session</small></div></div><button data-power-action="lock"><span>🔒</span>Lock</button><button data-power-action="signout"><span>↪</span>Sign out</button><button data-power-action="restart"><span>⟳</span>Restart</button><button data-power-action="shutdown"><span>⏻</span>Shut down</button>`;
    panel.querySelectorAll('[data-power-action]').forEach(b => b.onclick = () => { panel.hidden = true; powerAction(b.dataset.powerAction); });
  }
  function powerAction(action) {
    if (action === 'lock') return lockWorkstation();
    if (action === 'signout') return signOut();
    if (action === 'restart') {
      confirm({ title:'Restart the training workstation?', message:'Your saved work will remain. The desktop will reload with the same training data.', okText:'Restart' }).then(ok => { if (ok) location.reload(); });
      return;
    }
    if (action === 'shutdown') {
      const overlay = document.createElement('div');
      overlay.className = 'shutdown-screen';
      overlay.innerHTML = `<div class="shutdown-content"><div class="shutdown-mark">A</div><h2>Shutting down</h2><p>All training data is saved in this browser.</p><div class="shutdown-spinner"></div><button data-power-on>Power on</button></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-power-on]').onclick = () => location.reload();
    }
  }
  function lockWorkstation() {
    const overlay = document.createElement('div');
    overlay.className = 'lock-screen';
    overlay.innerHTML = `<div class="lock-time">${esc(fmtTime(new Date().toTimeString().slice(0,5)))}</div><div class="lock-date">${esc(new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }))}</div><div class="lock-user"><span class="avatar avatar-lg">EH</span><strong>Elizabeth Hale</strong><small>Training Executive Assistant</small></div><button data-unlock>Click to unlock</button>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-unlock]').onclick = () => { overlay.classList.add('unlocking'); setTimeout(() => overlay.remove(), 260); };
  }

  /* ------------------------------- flyouts ------------------------------- */
  function closeOtherFlyouts(except) {
    if (except !== 'start') { const s = document.getElementById('start-menu'); if (s) s.hidden = true; }
    if (except !== 'notif') { const n = document.getElementById('notification-center'); if (n) n.hidden = true; }
    if (except !== 'account') { const a = document.getElementById('account-panel'); if (a) a.hidden = true; }
    if (except !== 'context') { const c = document.getElementById('context-menu'); if (c) c.hidden = true; }
    if (except !== 'quick') { const q = document.getElementById('quick-settings'); if (q) q.hidden = true; }
    if (except !== 'widgets') { const w = document.getElementById('widgets-panel'); if (w) w.hidden = true; }
    if (except !== 'power') { const p = document.getElementById('power-menu'); if (p) p.hidden = true; }
    if (except !== 'taskview') { const t = document.getElementById('task-view'); if (t) t.hidden = true; }
    if (except !== 'start') { const b = document.getElementById('start-button'); if (b) b.setAttribute('aria-expanded', 'false'); }
  }
  function closeFlyouts() { closeOtherFlyouts(); }

  /* ------------------------------ context menus -------------------------- */
  function contextMenu(x, y, items) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    closeOtherFlyouts('context');
    menu.innerHTML = items.map((item, i) => item.separator ? `<div class="context-sep"></div>` : `<button class="context-item ${item.danger ? 'danger-item' : ''}" role="menuitem" data-context-index="${i}"><span class="context-icon">${esc(item.icon || '')}</span><span>${esc(item.label)}</span>${item.shortcut ? `<kbd>${esc(item.shortcut)}</kbd>` : ''}</button>`).join('');
    menu.hidden = false;
    menu.style.left = Math.min(x, window.innerWidth - 260) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 12) + 'px';
    menu.querySelectorAll('[data-context-index]').forEach(b => b.onclick = () => {
      const item = items[Number(b.dataset.contextIndex)];
      menu.hidden = true;
      if (item && item.action) item.action();
    });
    const close = e => {
      if (!menu.contains(e.target)) { menu.hidden = true; document.removeEventListener('mousedown', close); }
    };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    menu.tabIndex = -1;
    menu.onkeydown = e => {
      const items = Array.from(menu.querySelectorAll('.context-item'));
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = e.key === 'ArrowDown' ? (idx < 0 ? 0 : (idx + 1) % items.length) : (idx <= 0 ? items.length - 1 : idx - 1);
        items[next].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault(); menu.hidden = true;
      }
    };
    menu.focus();
  }

  /* ------------------------------- bindings ------------------------------ */
  function bindShell() {
    const startBtn = document.getElementById('start-button');
    startBtn.onclick = () => openStart(true);
    const accountBtn = document.getElementById('account-menu-button');
    if (accountBtn) accountBtn.onclick = openAccount;
    const startSearch = document.getElementById('start-search-input');
    if (startSearch) {
      startSearch.oninput = () => startSearch(startSearch.value);
      startSearch.onkeydown = e => {
        if (e.key === 'Escape') { openStart(false); startSearch.blur(); document.getElementById('start-menu').hidden = true; }
        if (e.key === 'Enter') {
          const results = document.getElementById('start-search-results');
          const first = results && results.querySelector('.search-result');
          if (first) first.click();
        }
        if (e.key === 'ArrowDown') {
          const results = document.getElementById('start-search-results');
          const first = results && results.querySelector('.search-result');
          if (first) { e.preventDefault(); first.focus(); }
        }
      };
    }
    document.querySelectorAll('[data-notif-tab]').forEach(b => b.onclick = () => renderNotif(b.dataset.notifTab));
    document.querySelectorAll('[data-action="clear-notifications"]').forEach(b => b.onclick = () => {
      Store.update(s => { s.notifications = []; });
      renderNotif(); updateBadges();
      toast('Notifications cleared', 'The center is empty. New training feedback will appear here.', { duration:2600 });
    });
    const focusAssist = document.getElementById('focus-assist');
    if (focusAssist) focusAssist.onchange = () => {
      Store.update(s => { s.settings.focusAssist = focusAssist.checked; });
      toast(focusAssist.checked ? 'Focus assist on' : 'Focus assist off', focusAssist.checked ? 'Practice notifications will collect quietly in the Notification Center.' : 'Notifications will appear as toasts again.', { duration:3000 });
    };
    document.querySelectorAll('[data-presence]').forEach(b => b.onclick = () => presenceMenu(b));
    document.querySelectorAll('[data-action="all-apps"]').forEach(b => b.onclick = () => { showStartView('all'); });
    document.querySelectorAll('[data-action="start-back"]').forEach(b => b.onclick = () => { showStartView('pinned'); renderStart(); });
    document.querySelectorAll('[data-action="start-more-recent"]').forEach(b => b.onclick = () => { openApp('files', { folderId:null, view:'recent' }); document.getElementById('start-menu').hidden = true; });
    document.addEventListener('mousedown', e => {
      const target = e.target;
      if (!target.closest('#start-menu') && !target.closest('#start-button') && !target.closest('#taskbar-search')) { const s = document.getElementById('start-menu'); if (s && !s.hidden) { s.hidden = true; startBtn.setAttribute('aria-expanded','false'); } }
      if (!target.closest('#notification-center') && !target.closest('[data-action="notifications"]')) { const n = document.getElementById('notification-center'); if (n && !n.hidden) n.hidden = true; }
      if (!target.closest('#account-panel') && !target.closest('#account-menu-button') && !target.closest('[data-action="lock"]')) { const a = document.getElementById('account-panel'); if (a && !a.hidden) a.hidden = true; }
      if (!target.closest('#quick-settings') && !target.closest('#quick-settings-button')) { const q = document.getElementById('quick-settings'); if (q && !q.hidden) q.hidden = true; }
      if (!target.closest('#widgets-panel') && !target.closest('#weather-widget')) { const w = document.getElementById('widgets-panel'); if (w && !w.hidden) w.hidden = true; }
      if (!target.closest('#power-menu') && !target.closest('[data-action="power-menu"]')) { const p = document.getElementById('power-menu'); if (p && !p.hidden) p.hidden = true; }
    });
  }

  function appDesc(id) {
    return ({
      training:'Learn, practise, and test EA scenarios.', mail:'Email, calendar, contacts, and etiquette.',
      teams:'Chats, channels, meetings, and calls.', sheets:'Working spreadsheets and templates.',
      files:'Folders, documents, and Recycle Bin.', docs:'Memos, agendas, and meeting notes.',
      todo:'Tasks, priorities, and My Day.', notes:'Quick notes linked to meetings.',
      calculator:'A standard calculator.', clock:'World clock and meeting planner.', recycle:'Restore deleted files.',
      calendar:'APPELLO executive calendar and room schedule.', drive:'Cloud files, recents, and shared folders.',
      assistant:'A local helper for mail, calendar, tasks, files, and training.',
      browser:'A locked Chromium shell with the two game destinations.',
      settings:'Desktop, display, sound, accessibility, accounts, and training data.'
    })[id] || 'Training app';
  }

  function bindGlobalActions() {
    document.addEventListener('click', e => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const a = action.dataset.action;
      if (a === 'glossary') { e.preventDefault(); openGlossary(); }
      else if (a === 'shortcuts') { e.preventDefault(); openShortcuts(); }
      else if (a === 'reset-data') { e.preventDefault(); confirmReset(); }
      else if (a === 'training-hub') { e.preventDefault(); openApp('training'); }
      else if (a === 'assistant') { e.preventDefault(); openApp('assistant'); }
      else if (a === 'notifications') { e.preventDefault(); openNotifications(); }
      else if (a === 'clock') { e.preventDefault(); openApp('clock'); }
      else if (a === 'search') { e.preventDefault(); openStart(true); }
      else if (a === 'sign-in') { e.preventDefault(); signIn(); }
      else if (a === 'lock') { e.preventDefault(); lockWorkstation(); }
      else if (a === 'presence') { e.preventDefault(); presenceMenu(action); }
      else if (a === 'all-apps') { e.preventDefault(); showStartView('all'); }
      else if (a === 'start-back') { e.preventDefault(); showStartView('pinned'); renderStart(); }
      else if (a === 'start-more-recent') { e.preventDefault(); openApp('files'); document.getElementById('start-menu').hidden = true; }
      else if (a === 'widgets') { e.preventDefault(); openWidgets(); }
      else if (a === 'quick-settings') { e.preventDefault(); openQuickSettings(); }
      else if (a === 'task-view') { e.preventDefault(); openTaskView(); }
      else if (a === 'power-menu') { e.preventDefault(); openPowerMenu(); }
      else if (a === 'settings-app') { e.preventDefault(); openApp('settings'); }
      else if (a === 'mail-calendar') { e.preventDefault(); openApp('mail', { view:'calendar' }); }
      else if (a === 'show-desktop') { e.preventDefault(); showDesktop(); }
      else if (a === 'clear-notifications') { e.preventDefault(); Store.update(s => { s.notifications = []; }); renderNotif(); updateBadges(); }
    });
  }
  function confirmReset() {
    try { sessionStorage.removeItem('appello-welcome-shown'); } catch (e) {}
    modal({
      title:'Reset all training data?',
      subtitle:'This is the one destructive action in this workspace.',
      size:'narrow',
      body:`<div class="reset-warning"><span>⚠</span><div><strong>Everything you have practised will be erased.</strong><p>Emails you sent, spreadsheet edits, calendar changes, tasks, notes, training scores, and window positions will return to the original starting state.</p></div></div><p class="muted-small" style="margin-top:12px;line-height:1.55">This cannot be undone. In a real workplace, you would never reset a colleague’s mailbox — this button exists only so you can practise again from a clean save.</p>`,
      footer:`<button class="btn" data-cancel>Keep my work</button><button class="btn danger" data-reset-now>Reset training data</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-reset-now]').onclick = () => {
          close();
          setTimeout(() => { try { Store.reset(); } catch (err) { console.error(err); localStorage.removeItem(Store.KEY); } location.reload(); }, 120);
        };
      }
    });
  }

  /* ------------------------------- keyboard ------------------------------ */
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      const modalOpen = Utils.modalOpen();
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag) || (document.activeElement && document.activeElement.isContentEditable);
      if (keyboardMove) {
        const win = keyboardMove.win;
        const step = e.shiftKey ? 48 : 12;
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
          e.preventDefault();
          const el = win.element;
          let x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0, w = el.offsetWidth, h = el.offsetHeight;
          if (keyboardMove.type === 'move') {
            if (e.key === 'ArrowLeft') x -= step; if (e.key === 'ArrowRight') x += step;
            if (e.key === 'ArrowUp') y -= step; if (e.key === 'ArrowDown') y += step;
            const d = desktopSize();
            x = clamp(x, -w + 120, d.w - 120); y = clamp(y, 0, d.h - 50);
            el.style.left = x + 'px'; el.style.top = y + 'px';
          } else {
            if (e.key === 'ArrowLeft') w = Math.max(360, w - step);
            if (e.key === 'ArrowRight') w = Math.min(desktopSize().w - x, w + step);
            if (e.key === 'ArrowUp') h = Math.max(260, h - step);
            if (e.key === 'ArrowDown') h = Math.min(desktopSize().h - y, h + step);
            el.style.width = w + 'px'; el.style.height = h + 'px';
          }
          return;
        }
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault(); win.element.classList.remove('keyboard-managed'); saveWindowRect(win); keyboardMove = null; return;
        }
      }
      if (e.altKey && e.key === ' ') { e.preventDefault(); systemMenu(); return; }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        cycleAltTab(e.shiftKey);
        return;
      }
      if (e.key === 'Escape') {
        if (modalOpen) { Utils.closeTopModal(); return; }
        const menu = document.getElementById('context-menu');
        if (menu && !menu.hidden) { menu.hidden = true; return; }
        if (altTab.active) { hideAltTab(); return; }
        closeFlyouts();
        return;
      }
      if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); openStart(true); return; }
      if (e.key === 'F1') { e.preventDefault(); openShortcuts(); return; }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); openApp('assistant'); return; }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); openApp('browser'); return; }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') { e.preventDefault(); openGlossary(); return; }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); confirmReset(); return; }
      if (e.ctrlKey && e.altKey && e.key === 'Tab') { e.preventDefault(); openTaskView(); return; }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); showDesktop(); return; }
      if (e.ctrlKey && e.altKey && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        const win = activeWindowForKeyboard();
        if (win) {
          e.preventDefault();
          const kind = e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'full' : 'restore';
          if (kind === 'restore') { if (win.maximized) setMaximizedState(win, false, true); }
          else snapWindow(win, kind);
        }
        return;
      }
      if (typing) return;
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === 'k') { e.preventDefault(); openStart(true); return; }
        if (['1','2','3','4'].includes(e.key)) { e.preventDefault(); openApp(['mail','teams','sheets','training'][Number(e.key)-1]); return; }
      }
      if (e.altKey && e.key === 'F4') { e.preventDefault(); if (activeId && windows.has(activeId)) closeWindow(windows.get(activeId)); return; }
      if (e.altKey && e.key === 'Enter') { e.preventDefault(); if (activeId && windows.has(activeId)) maximizeWindow(windows.get(activeId)); return; }
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Alt' && altTab.active) { e.preventDefault(); activateAltTab(); }
    });
  }
  function cycleAltTab(reverse) {
    const list = Array.from(windows.values()).filter(w => !w.minimized);
    if (!list.length) return;
    if (!altTab.active) { altTab.active = true; altTab.index = 0; }
    else altTab.index = (altTab.index + (reverse ? -1 : 1) + list.length) % list.length;
    const overlay = document.getElementById('alt-tab');
    overlay.hidden = false;
    overlay.innerHTML = `<div class="alt-tab-head">Switch windows · release Alt to open · Shift+Alt+Tab to go back</div><div class="alt-tab-grid">${list.map((w, i) => `<div class="alt-tab-card ${i === altTab.index ? 'current' : ''}" data-alt-index="${i}">${appIconHtml(w.id)}<strong>${esc(w.meta ? w.meta.name : w.id)}</strong><small>${w.minimized ? 'Minimized' : 'Open'}</small></div>`).join('')}</div>`;
    overlay.querySelectorAll('[data-alt-index]').forEach(card => card.onclick = () => { altTab.index = Number(card.dataset.altIndex); activateAltTab(); });
    altTab.list = list;
  }
  function activateAltTab() {
    if (!altTab.active) return;
    const overlay = document.getElementById('alt-tab');
    const win = altTab.list && altTab.list[altTab.index];
    if (win) focusWindow(win);
    hideAltTab();
  }
  function hideAltTab() { altTab.active = false; const o = document.getElementById('alt-tab'); if (o) o.hidden = true; }

  /* ------------------------------- file open ----------------------------- */
  function openFile(id) {
    const f = Store.fileById(id);
    if (!f || f.deletedAt) { toast('File unavailable', 'This file may have been deleted.', { kind:'error' }); return; }
    Store.touchFile(id);
    if (f.type === 'folder') openApp('files', { folderId:id });
    else if (f.type === 'sheet') openApp('sheets', { fileId:id });
    else openApp('docs', { fileId:id });
  }

  window.OS = {
    init, openApp, closeApp:(id) => { const w = windows.get(id); if (w) closeWindow(w); },
    isOpen:(id) => windows.has(id), focusApp:(id) => { const w = windows.get(id); if (w) focusWindow(w); },
    openFile, toast, notify, contextMenu, openStart, closeFlyouts, signIn, signOut,
    confirmReset, personalize, applyWallpaper, applyAccent, applyDisplaySettings, openQuickSettings, openWidgets, openTaskView,
    get windows() { return Array.from(windows.values()); },
    get activeWindow() { return activeId ? windows.get(activeId) : null; },
    refresh:() => { renderDesktopIcons(); renderTaskbarApps(); renderStart(); renderNotif(); renderAccount(); renderPresence(); applyDisplaySettings(); },
    appIconHtml
  };
})();
