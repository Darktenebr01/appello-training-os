/* Settings — a Windows-style local training settings app. */
(function () {
  'use strict';
  const { esc, toast, modal, confirm, Bus, simNow, fmtDate } = Utils;
  let instance = null;

  const SECTIONS = [
    { id:'home', icon:'⌂', label:'Home' },
    { id:'system', icon:'▣', label:'System' },
    { id:'personalization', icon:'◐', label:'Personalization' },
    { id:'apps', icon:'▦', label:'Apps' },
    { id:'accounts', icon:'◉', label:'Accounts' },
    { id:'time', icon:'◷', label:'Time & language' },
    { id:'accessibility', icon:'♿', label:'Accessibility' },
    { id:'privacy', icon:'⛨', label:'Privacy & security' },
    { id:'update', icon:'↻', label:'Windows Update' },
    { id:'about', icon:'ⓘ', label:'About' }
  ];
  const WALLS = [
    { id:'aurora', name:'Bloom', css:'linear-gradient(135deg,#09214c 0%,#14509a 46%,#3976c6 68%,#0a2146 100%)' },
    { id:'dusk', name:'Dusk', css:'linear-gradient(135deg,#221b34 0%,#573e77 48%,#d58b6d 100%)' },
    { id:'tide', name:'Tide', css:'linear-gradient(135deg,#062b32 0%,#0f6b78 52%,#5fb0b8 100%)' }
  ];
  const ACCENTS = ['#1169c9','#0f7b6c','#7c4dcc','#b14a72','#c26b18','#4b6584'];

  function root() { return instance && instance.root; }
  function rerender() { render(); }
  function settingCard(icon, title, body, control) {
    return `<div class="settings-card"><div class="settings-card-icon">${icon}</div><div class="settings-card-copy"><strong>${title}</strong><p>${body}</p></div>${control || ''}</div>`;
  }
  function toggleRow(id, label, detail, checked) {
    return `<label class="settings-toggle-row"><span><strong>${esc(label)}</strong><small>${esc(detail)}</small></span><input type="checkbox" data-setting-toggle="${esc(id)}" ${checked ? 'checked' : ''}><span class="switch"></span></label>`;
  }
  function getQ() { return Store.state.ui.quickSettings || (Store.state.ui.quickSettings = { wifi:true, bluetooth:false, airplane:false, batterySaver:false, nightLight:false, volume:72, brightness:100 }); }

  function render(sectionOverride) {
    if (!instance || !instance.root) return;
    instance.section = sectionOverride || instance.section;
    const section = instance.section;
    const state = Store.state;
    const q = getQ();
    const sectionHtml = section === 'home' ? homeHtml() : section === 'system' ? systemHtml(q) : section === 'personalization' ? personalizationHtml() : section === 'apps' ? appsHtml() : section === 'accounts' ? accountsHtml() : section === 'time' ? timeHtml() : section === 'accessibility' ? accessibilityHtml() : section === 'privacy' ? privacyHtml() : section === 'update' ? updateHtml() : aboutHtml();
    instance.root.innerHTML = `<div class="settings-app">
      <header class="settings-appbar"><div class="settings-brand"><span class="settings-mark">⚙</span><div><strong>Settings</strong><small>APPELLO training workstation</small></div></div><div class="settings-appbar-actions"><span class="pill green">Local only</span><button class="help-btn" data-settings-help>What is this?</button></div></header>
      <div class="settings-body">
        <aside class="settings-side">${SECTIONS.map(s => `<button class="${s.id === section ? 'active' : ''}" data-settings-section="${s.id}"><span>${s.icon}</span>${s.label}</button>`).join('')}<div class="settings-side-foot">${esc(state.profile.name)}<small>${state.signedIn ? 'Signed in' : 'Signed out'}</small></div></aside>
        <main class="settings-main"><div class="settings-page-head"><span class="eyebrow">Settings</span><h1>${esc((SECTIONS.find(s => s.id === section) || {}).label || 'Settings')}</h1><p>This panel changes the training desktop only.</p></div>${sectionHtml}</main>
      </div>
    </div>`;
    bind();
  }
  function homeHtml() {
    return `<div class="settings-home-grid">
      <button class="settings-home-card" data-settings-section="personalization"><span class="settings-home-icon">◐</span><strong>Personalization</strong><small>Wallpaper, accent colour, night light</small></button>
      <button class="settings-home-card" data-settings-section="accessibility"><span class="settings-home-icon">♿</span><strong>Accessibility</strong><small>Text size, motion, contrast, keyboard</small></button>
      <button class="settings-home-card" data-settings-section="accounts"><span class="settings-home-icon">◉</span><strong>Accounts</strong><small>Shift status and simulated sign-in</small></button>
      <button class="settings-home-card" data-settings-section="privacy"><span class="settings-home-icon">⛨</span><strong>Privacy & security</strong><small>Local data, export, reset</small></button>
      <button class="settings-home-card" data-settings-section="update"><span class="settings-home-icon">↻</span><strong>Windows Update</strong><small>Training build status</small></button>
      <button class="settings-home-card" data-settings-section="about"><span class="settings-home-icon">ⓘ</span><strong>About</strong><small>Version and workspace notice</small></button>
    </div>
    <div class="settings-info-banner"><span>🛡</span><div><strong>Your practice data stays in this browser.</strong><p>All company names, people, and messages are fictional practice data.</p></div></div>`;
  }
  function systemHtml(q) {
    return `<div class="settings-card"><div class="settings-card-icon">▣</div><div class="settings-card-copy"><strong>Display</strong><p>Brightness affects this training desktop only.</p></div><span class="pill">${q.brightness}%</span></div>
      <div class="settings-slider-row"><span>Brightness</span><input type="range" min="25" max="100" value="${q.brightness}" data-setting-range="brightness"><b>${q.brightness}%</b></div>
      <div class="settings-card"><div class="settings-card-icon">🔊</div><div class="settings-card-copy"><strong>Volume</strong><p>Sound is simulated. Training feedback is visual.</p></div><span class="pill">${q.volume === 0 ? 'Muted' : q.volume + '%'}</span></div>
      <div class="settings-slider-row"><span>Volume</span><input type="range" min="0" max="100" value="${q.volume}" data-setting-range="volume"><b>${q.volume === 0 ? 'Mute' : q.volume}</b></div>
      ${toggleRow('nightLight','Night light','Warm tint to reduce blue light on the training desktop.', q.nightLight)}
      ${toggleRow('batterySaver','Battery saver','Simulated only; battery is 92%.', q.batterySaver)}
      ${settingCard('🔔','Notifications','Training feedback and work updates appear in the Notification Center.','<button class="btn small" data-settings-calendar>Open calendar</button>')}
      <div class="settings-subhead">Power & battery</div><div class="settings-list-row"><span>Battery</span><strong>92% · About 6h 12m left</strong></div><div class="settings-list-row"><span>Power mode</span><strong>${q.batterySaver ? 'Battery saver' : 'Balanced'}</strong></div>`;
  }
  function personalizationHtml() {
    const current = Store.state.ui.wallpaper || 'aurora';
    return `<div class="settings-subhead">Background</div><div class="settings-wall-grid">${WALLS.map(w => `<button class="settings-wall ${current === w.id ? 'active' : ''}" data-settings-wall="${w.id}"><span style="background:${w.css}"></span><strong>${w.name}</strong><small>${current === w.id ? 'Current' : 'Apply'}</small></button>`).join('')}</div>
      <div class="settings-subhead">Accent colour</div><div class="settings-accent-row">${ACCENTS.map(c => `<button class="settings-accent ${Store.state.ui.accent === c ? 'active' : ''}" style="--swatch:${c}" data-settings-accent="${c}" aria-label="Accent ${c}"></button>`).join('')}</div>
      ${toggleRow('nightLight','Night light','Warm tint for evening practice.',getQ().nightLight)}
      <div class="settings-list-row"><span>Desktop icons</span><strong>${(Data.desktopIcons || []).length} shortcuts</strong></div>
      <div class="settings-list-row"><span>Taskbar</span><strong>Centered · Windows style</strong></div>`;
  }
  function appsHtml() {
    return `<div class="settings-app-list">${Data.appCatalog.slice().sort((a,b) => a.name.localeCompare(b.name)).map(a => `<div class="settings-app-row">${Icons.icon(a.icon)}<div><strong>${esc(a.name)}</strong><small>Original training app · local</small></div><code>${esc(a.id)}</code><button class="btn small" data-settings-open-app="${a.id}">Open</button></div>`).join('')}</div>`;
  }
  function accountsHtml() {
    return `<div class="settings-account-hero">${Icons.avatar(Store.state.profile.name, 'avatar-xl', 2)}<div><h2>${esc(Store.state.profile.name)}</h2><p>Executive Assistant to Alexandra Morgan · APPELLO</p><span class="pill ${Store.state.signedIn ? 'green' : 'amber'}">${Store.state.signedIn ? 'Shift active' : 'Shift not started'}</span></div></div>
      <div class="settings-list-row"><span>Email</span><strong>${esc(Store.state.profile.email)}</strong></div>
      <div class="settings-list-row"><span>Timezone</span><strong>New York (ET)</strong></div>
      <div class="settings-list-row"><span>Teamspace presence</span><strong>${esc(Store.state.settings.presence || 'Available')}</strong></div>
      <div class="settings-account-actions"><button class="btn primary" data-settings-signin>${Store.state.signedIn ? 'Sign out' : 'Sign in for today’s shift'}</button><button class="btn" data-settings-presence>Change presence</button></div>
      <div class="settings-info-banner"><span>ℹ</span><div><strong>Training account.</strong><p>Signing in marks the training shift on this desktop.</p></div></div>`;
  }
  function timeHtml() {
    return `<div class="settings-time-hero"><div class="settings-time-now">${esc(simNow().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }))}</div><div>${esc(simNow().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }))}</div></div>
      <div class="settings-list-row"><span>Time zone</span><strong>Eastern Time (US & Canada)</strong></div>
      <div class="settings-list-row"><span>Simulated date</span><strong>Monday, November 9, 2026</strong></div>
      <div class="settings-list-row"><span>24-hour time</span><strong>Off</strong></div>
      <p class="settings-note">The workday date is fixed for the training scenario. Clock time follows your local time so the workspace stays current.</p>
      <button class="btn" data-settings-clock>Open World Clock</button>`;
  }
  function accessibilityHtml() {
    const a = Store.state.ui.accessibility || (Store.state.ui.accessibility = { textScale:'normal', reduceMotion:false, highContrast:false, keyboard:true });
    return `${toggleRow('reduceMotion','Reduce motion','Turn off window and panel animations.', a.reduceMotion)}
      ${toggleRow('highContrast','High contrast','Increase contrast for the training desktop.', a.highContrast)}
      <div class="settings-subhead">Text size</div><div class="settings-text-scale">${['normal','large','larger'].map(v => `<button class="${a.textScale === v ? 'active' : ''}" data-text-scale="${v}">${v === 'normal' ? '100%' : v === 'large' ? '115%' : '130%'}</button>`).join('')}</div>
      <div class="settings-subhead">Keyboard</div><p class="settings-note">Window move and resize are keyboard accessible: press <kbd>Alt</kbd>+<kbd>Space</kbd>, choose Move or Size, use arrow keys, then Enter. <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+arrows snaps windows.</p><button class="btn small" data-settings-shortcuts>Open keyboard shortcuts</button>`;
  }
  function privacyHtml() {
    return `<div class="settings-info-banner"><span>🛡</span><div><strong>Everything is local.</strong><p>Mail, Teamspace, calendar, files, notes, and training progress are stored in this browser’s localStorage. No data is transmitted.</p></div></div>
      <div class="settings-list-row"><span>Storage key</span><strong><code>appello-ea-academy-v1</code></strong></div>
      <div class="settings-list-row"><span>Notifications</span><strong>${Store.state.notifications.length}</strong></div>
      <div class="settings-list-row"><span>Action log</span><strong>${Store.state.training.actionLog.length} entries</strong></div>
      <div class="settings-subhead">Training data</div><button class="btn" data-settings-export>Download my training data</button><button class="btn danger" data-settings-reset>Reset all training data</button>
      <p class="settings-note">Reset erases every practice change and restores the original fictional company. This cannot be undone.</p>`;
  }
  function updateHtml() {
    return `<div class="settings-update-hero"><span class="update-shield">✓</span><div><h2>You’re up to date</h2><p>Training build 2026.11 · last checked ${esc(fmtDate(simNow(), 'medium'))}</p></div></div>
      <div class="settings-list-row"><span>Current build</span><strong>EA Academy 2026.11</strong></div>
      <div class="settings-list-row"><span>Channel</span><strong>Local training preview</strong></div>
      <div class="settings-list-row"><span>Last check</span><strong>Just now</strong></div>
      <p class="settings-note">Use Reset training data to restore the seeded company.</p>`;
  }
  function aboutHtml() {
    return `<div class="settings-about-hero"><div class="settings-about-mark">A</div><div><h2>APPELLO</h2><p>Executive Assistant Training Workstation</p><span class="pill purple">Training workspace</span></div></div>
      <div class="settings-list-row"><span>Version</span><strong>2026.11</strong></div>
      <div class="settings-list-row"><span>Company</span><strong>${esc(Data.company.name)}</strong></div>
      <div class="settings-list-row"><span>Learner</span><strong>${esc(Store.state.profile.name)}</strong></div>
      <div class="settings-callout"><strong>APPELLO training workspace.</strong><p>This is an original training interface inspired by modern desktop conventions. All names, emails, messages, meetings, and files are fictional practice data.</p></div>`;
  }

  function bind() {
    const el = instance.root;
    el.querySelectorAll('[data-settings-section]').forEach(b => b.onclick = () => render(b.dataset.settingsSection));
    const help = el.querySelector('[data-settings-help]'); if (help) help.onclick = () => Utils.openHelp('settings');
    el.querySelectorAll('[data-setting-toggle]').forEach(input => input.onchange = () => {
      const key = input.dataset.settingToggle;
      if (key === 'nightLight' || key === 'batterySaver') { getQ()[key] = input.checked; OS.applyDisplaySettings(); }
      else { const a = Store.state.ui.accessibility || (Store.state.ui.accessibility = {}); a[key] = input.checked; applyAccessibility(); }
      Store.commit(); rerender();
    });
    el.querySelectorAll('[data-setting-range]').forEach(range => range.oninput = () => {
      const q = getQ(); q[range.dataset.settingRange] = Number(range.value); OS.applyDisplaySettings(); Store.commit();
      const b = range.parentElement.querySelector('b');
      if (b) b.textContent = range.dataset.settingRange === 'volume' ? (range.value === '0' ? 'Mute' : range.value) : range.value + '%';
    });
    el.querySelectorAll('[data-settings-wall]').forEach(b => b.onclick = () => { Store.update(s => { s.ui.wallpaper = b.dataset.settingsWall; }); OS.applyWallpaper(); rerender(); toast('Background changed', 'The training desktop wallpaper was updated.', { duration:2200 }); });
    el.querySelectorAll('[data-settings-accent]').forEach(b => b.onclick = () => { Store.update(s => { s.ui.accent = b.dataset.settingsAccent; }); OS.applyAccent(); rerender(); });
    el.querySelectorAll('[data-settings-open-app]').forEach(b => b.onclick = () => OS.openApp(b.dataset.settingsOpenApp));
    el.querySelectorAll('[data-settings-signin]').forEach(b => b.onclick = () => { if (Store.state.signedIn) OS.signOut(); else OS.signIn(); });
    el.querySelectorAll('[data-settings-presence]').forEach(b => b.onclick = () => { const statuses = ['Available','Busy','In a Meeting','Away','Do Not Disturb']; const current = Store.state.settings.presence; const next = statuses[(statuses.indexOf(current) + 1) % statuses.length]; Store.update(s => { s.settings.presence = next; s.teams.presence = next; }); OS.refresh(); rerender(); toast('Presence updated', `You are now ${next}.`, { duration:2200 }); });
    el.querySelectorAll('[data-settings-clock]').forEach(b => b.onclick = () => OS.openApp('clock'));
    el.querySelectorAll('[data-settings-calendar]').forEach(b => b.onclick = () => OS.openApp('mail', { view:'calendar' }));
    el.querySelectorAll('[data-settings-shortcuts]').forEach(b => b.onclick = () => Utils.openShortcuts());
    el.querySelectorAll('[data-text-scale]').forEach(b => b.onclick = () => { const a = Store.state.ui.accessibility || (Store.state.ui.accessibility = {}); a.textScale = b.dataset.textScale; applyAccessibility(); Store.commit(); rerender(); });
    el.querySelectorAll('[data-settings-export]').forEach(b => b.onclick = () => Utils.download('appello-training-data.json', Store.exportState(), 'application/json'));
    el.querySelectorAll('[data-settings-reset]').forEach(b => b.onclick = () => OS.confirmReset());
  }
  function applyAccessibility() {
    const a = Store.state.ui.accessibility || {};
    document.body.classList.toggle('reduce-motion', !!a.reduceMotion);
    document.body.classList.toggle('high-contrast', !!a.highContrast);
    document.body.dataset.textScale = a.textScale || 'normal';
  }

  App.register('settings', {
    mount(container, win, params) {
      instance = { root:document.createElement('div'), win, section:(params && params.section) || 'home' };
      instance.root.className = 'settings-root app-fill';
      container.innerHTML = '';
      container.appendChild(instance.root);
      render();
      applyAccessibility();
    },
    reopen(params) { if (params && params.section) instance.section = params.section; render(); },
    destroy() { instance = null; }
  });
  window.SettingsApp = { open(section) { OS.openApp('settings', section ? { section } : {}); }, applyAccessibility };
  // Apply persisted accessibility on reload even before Settings is opened.
  setTimeout(() => { try { applyAccessibility(); } catch (e) {} }, 0);
})();
