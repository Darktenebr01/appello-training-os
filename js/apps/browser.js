/* APPELLO Chromium shell — a deliberately locked two-destination browser. */
(function () {
  'use strict';
  const { esc, toast, Bus } = Utils;

  const GAMES = [
    {
      id: 'doom',
      tab: 'DOOM',
      title: 'DOOM',
      kicker: 'DOS.ZONE · MS-DOS GAME',
      meta: '1993 · id Software · playable in browser',
      url: 'https://dos.zone/doom-dec-1993/',
      art: 'assets/doom.png',
      icon: 'doom',
      accent: '#e2552f',
      description: 'The original 1993 demon-slaying classic, emulated in the browser. Move, shoot, and survive the Phobos base.',
      inline: false,
      blockedReason: 'DOS Zone sends a Content-Security-Policy frame-ancestors rule that prevents this page from being displayed inside another site.'
    },
    {
      id: 'cyberpunk',
      tab: 'CYBERPUNK',
      title: 'CYBERPUNK',
      kicker: 'CYBERPUNK2077.LOL · GAME PORTAL',
      meta: 'Night City · browser game portal',
      url: 'https://cyberpunk2077.lol/',
      art: 'assets/cyberpunk.png',
      icon: 'cyberpunk',
      accent: '#f3e600',
      description: 'Enter the Cyberpunk 2077 browser portal. The page is a single locked destination from this workstation.',
      inline: true
    }
  ];

  let instance = null;

  function gameById(id) {
    return GAMES.find(g => g.id === id) || GAMES[0];
  }

  function render() {
    if (!instance) return;
    const root = instance.root;
    const selected = gameById(instance.selected);
    const other = GAMES.find(g => g.id !== selected.id) || selected;
    root.innerHTML = `
      <div class="browser-app">
        <div class="browser-tabrow">
          <div class="browser-tabs" role="tablist" aria-label="Locked game tabs">
            ${GAMES.map(g => `<button class="browser-tab ${g.id === selected.id ? 'active' : ''}" data-browser-tab="${g.id}" role="tab" aria-selected="${g.id === selected.id}">
              <span class="browser-tab-icon">${Icons.icon(g.icon)}</span><span>${esc(g.tab)}</span>
            </button>`).join('')}
          </div>
          <span class="browser-lock-pill">2 sites only</span>
        </div>
        <div class="browser-toolbar">
          <button class="browser-nav" disabled aria-label="Back">‹</button>
          <button class="browser-nav" disabled aria-label="Forward">›</button>
          <button class="browser-nav" data-browser-reload aria-label="Reload" data-tip="Reload this locked game page.">↻</button>
          <div class="browser-address" aria-label="Locked address">
            <span class="browser-lock">▣</span>
            <span class="browser-url">${esc(selected.url)}</span>
            <span class="browser-verified">Locked</span>
          </div>
          <button class="browser-nav browser-star" disabled aria-label="Bookmark">☆</button>
          <button class="browser-nav" data-browser-menu aria-label="Browser menu" data-tip="This browser has no other destinations.">⋯</button>
        </div>
        <div class="browser-content">
          <section class="browser-page" style="--game-accent:${selected.accent};--game-art:url('${selected.art}')">
            <div class="browser-page-glow"></div>
            <div class="browser-page-art"><img src="${selected.art}" alt="${esc(selected.title)} artwork"></div>
            <div class="browser-page-copy">
              <span class="browser-kicker">${esc(selected.kicker)}</span>
              <h1>${esc(selected.title)}</h1>
              <p class="browser-meta">${esc(selected.meta)}</p>
              <p class="browser-description">${esc(selected.description)}</p>
              <div class="browser-actions">
                <button class="btn primary browser-run" data-browser-launch>▶ Run game</button>
                <button class="btn browser-open" data-browser-open>Open page ↗</button>
              </div>
              <p class="browser-hint">This Chromium shell is locked to two destinations. Run opens an in-tab game window; a publisher that blocks embedding is routed to its own window.</p>
            </div>
          </section>
          <aside class="browser-side">
            <span class="browser-side-label">Allowed destinations</span>
            <button class="browser-game-tile ${selected.id === 'doom' ? 'active' : ''}" data-browser-tab="doom">
              <span class="browser-game-art"><img src="assets/doom.png" alt=""></span>
              <span><strong>DOOM</strong><small>dos.zone · 1993</small></span>
              <span class="browser-tile-arrow">›</span>
            </button>
            <button class="browser-game-tile ${selected.id === 'cyberpunk' ? 'active' : ''}" data-browser-tab="cyberpunk">
              <span class="browser-game-art"><img src="assets/cyberpunk.png" alt=""></span>
              <span><strong>CYBERPUNK</strong><small>cyberpunk2077.lol</small></span>
              <span class="browser-tile-arrow">›</span>
            </button>
            <div class="browser-side-note">
              <strong>No address bar.</strong>
              <p>There is no free navigation, search, or third destination in this browser.</p>
            </div>
            <div class="browser-shortcuts">
              <span><kbd>Esc</kbd> close window</span>
              <span><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> reopen browser</span>
            </div>
          </aside>
        </div>
        <footer class="browser-statusbar">
          <span><i class="browser-status-dot"></i> Chromium shell · locked</span>
          <span>${GAMES.length} allowed pages · ${esc(selected.url)}</span>
        </footer>
        ${instance.inline ? inlineMarkup(gameById(instance.inline)) : ''}
      </div>`;
    bind();
    Bus.emit('browser:page-selected', { game: selected.id, url: selected.url });
  }

  function inlineMarkup(game) {
    const blocked = !game.inline;
    return `<div class="browser-inline-backdrop" data-inline-close></div>
      <section class="browser-inline-window" role="dialog" aria-modal="true" aria-label="${esc(game.title)} game window">
        <header class="browser-inline-titlebar">
          <span class="browser-inline-dots"><i></i><i></i><i></i></span>
          <strong>${esc(game.title)} — in-tab game window</strong>
          <button class="browser-inline-close" data-inline-close aria-label="Close game window">×</button>
        </header>
        <div class="browser-inline-address">
          <span class="browser-lock">▣</span><span class="browser-url">${esc(game.url)}</span><span class="browser-verified">Locked</span>
          <button class="browser-inline-external" data-inline-external>Open in window ↗</button>
        </div>
        <div class="browser-inline-body">
          ${blocked ? `<div class="browser-inline-blocked">
            <div class="browser-inline-blocked-icon">⛔</div>
            <span class="browser-kicker">PUBLISHER EMBED BLOCK</span>
            <h2>This game cannot run inside the tab.</h2>
            <p>${esc(game.blockedReason || 'The page does not allow itself to be embedded.')}</p>
            <div class="browser-inline-blocked-actions">
              <button class="btn primary browser-run" data-inline-external>Open game window</button>
              <button class="btn browser-open" data-inline-close>Back to Chromium</button>
            </div>
            <p class="browser-hint">The game page is still one of the two allowed destinations. It opens in its own permitted window.</p>
          </div>` : `<iframe class="browser-inline-frame" src="${esc(game.url)}" title="${esc(game.title)} game" loading="eager" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" allow="fullscreen; autoplay; gamepad"></iframe>`}
        </div>
      </section>`;
  }

  function bind() {
    if (!instance) return;
    const root = instance.root;
    root.querySelectorAll('[data-browser-tab]').forEach(b => b.onclick = () => {
      const id = b.dataset.browserTab;
      if (!gameById(id) || instance.selected === id) return;
      instance.selected = id;
      instance.inline = null;
      render();
    });
    root.querySelectorAll('[data-browser-launch]').forEach(b => b.onclick = () => {
      instance.inline = gameById(instance.selected).id;
      render();
    });
    root.querySelectorAll('[data-browser-open]').forEach(b => b.onclick = () => {
      Utils.openExternal(gameById(instance.selected).url);
    });
    root.querySelectorAll('[data-inline-close]').forEach(b => b.onclick = () => { instance.inline = null; render(); });
    root.querySelectorAll('[data-inline-external]').forEach(b => b.onclick = () => {
      Utils.openExternal(gameById(instance.inline || instance.selected).url);
    });
    const reload = root.querySelector('[data-browser-reload]');
    if (reload) reload.onclick = () => { render(); toast('Page reloaded', 'The locked game page is ready.', { duration:1800 }); };
    const menu = root.querySelector('[data-browser-menu]');
    if (menu) menu.onclick = () => toast('No other destinations', 'This Chromium shell contains only DOOM and Cyberpunk. There is no way to enter another address here.', { duration:3600 });
    // The browser chrome is deliberately read-only; no address field exists.
    root.oncontextmenu = e => { e.preventDefault(); toast('Locked browser', 'Only the two game destinations are available.', { duration:2400 }); };
    root.onkeydown = e => {
      if (e.key === 'Escape' && instance.inline) { e.preventDefault(); instance.inline = null; render(); return; }
      if ((e.ctrlKey || e.metaKey) && ['l','t','n'].includes(e.key.toLowerCase())) {
        e.preventDefault(); toast('Locked browser', 'This shell has only two fixed tabs.', { duration:2400 });
      }
    };
  }

  const app = {
    id: 'browser',
    mount(root, win, params) {
      instance = { root, win, selected: (params && params.game) || 'doom', inline:null };
      render();
    },
    reopen(params) {
      if (!instance) return;
      if (params && params.game && gameById(params.game)) instance.selected = params.game;
      instance.inline = null;
      render();
    },
    beforeClose() { instance = null; }
  };

  App.register('browser', app);

  window.BrowserApp = {
    open(gameId) { OS.openApp('browser', { game: gameId || 'doom' }); },
    games: GAMES.map(g => ({ id:g.id, title:g.title, url:g.url }))
  };
})();
