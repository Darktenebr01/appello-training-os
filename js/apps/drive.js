/* Cloud Drive — a cloud-drive-style local file hub for the training station. */
(function () {
  'use strict';
  const { esc, fmtDate, toast } = Utils;
  let instance = null;

  function filesAll() { return Store.state.files.filter(f => !f.deletedAt); }
  function folderOf(id) { const f = id ? Store.fileById(id) : null; return f ? f.name : 'Home'; }
  function fileKind(f) {
    if (f.type === 'folder') return 'Folder';
    if (f.type === 'sheet') return 'Workbook';
    if (f.type === 'doc') return 'Document';
    return 'File';
  }
  function fileIcon(f) {
    if (f.type === 'folder') return `<span class="drive-file-icon folder">${Icons.icons.folder}</span>`;
    if (f.type === 'sheet') return `<span class="drive-file-icon sheet">▦</span>`;
    return `<span class="drive-file-icon doc">▤</span>`;
  }
  function recentFiles() {
    const ids = (Store.state.recentFiles || []).slice(0, 8);
    const byId = ids.map(id => Store.fileById(id)).filter(f => f && !f.deletedAt);
    const rest = filesAll().filter(f => f.type !== 'folder' && !ids.includes(f.id)).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return byId.concat(rest).slice(0, 10);
  }
  function forYou() {
    return filesAll().filter(f => f.type !== 'folder').sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))).slice(0, 4);
  }
  function render() {
    const root = instance.root;
    if (!root) return;
    const tab = instance.tab;
    let files = filesAll();
    if (tab === 'mine') files = files.filter(f => !f.parentId || f.type === 'folder');
    else if (tab === 'shared') files = files.filter(f => ['f-shared','f-exec'].includes(f.parentId));
    else if (tab === 'recent') files = recentFiles();
    if (instance.search) files = files.filter(f => f.name.toLowerCase().includes(instance.search.toLowerCase()));
    const featured = tab === 'home' ? forYou() : files.filter(f => f.type !== 'folder').slice(0, 4);
    const list = tab === 'home' ? recentFiles() : files.slice(0, 12);
    root.innerHTML = `<div class="drive-app">
      <header class="drive-topbar">
        <div class="drive-brand"><span class="drive-mark">${Icons.icons.onedrive}</span><strong>Cloud Drive</strong></div>
        <label class="drive-search"><span>⌕</span><input id="drive-search" placeholder="Search" value="${esc(instance.search)}" aria-label="Search files"></label>
        <div class="drive-top-right"><button class="help-btn" data-drive-help>What is this?</button>${Icons.avatar('Elizabeth Hale', 'avatar-sm', 2)}</div>
      </header>
      <div class="drive-body">
        <aside class="drive-side">
          <button class="drive-new" data-drive-new>＋ New</button>
          <nav class="drive-nav">
            <button class="${tab === 'home' ? 'active' : ''}" data-drive-tab="home"><span>⌂</span>Home</button>
            <button class="${tab === 'mine' ? 'active' : ''}" data-drive-tab="mine"><span>▤</span>My files</button>
            <button class="${tab === 'recent' ? 'active' : ''}" data-drive-tab="recent"><span>◷</span>Recent</button>
            <button class="${tab === 'shared' ? 'active' : ''}" data-drive-tab="shared"><span>♧</span>Shared</button>
            <button data-drive-recycle><span>🗑</span>Recycle bin</button>
          </nav>
          <div class="drive-side-label">Quick access</div>
          <div class="drive-quick">${Store.state.files.filter(f => f.type === 'folder' && !f.deletedAt && !f.parentId).slice(0, 5).map(f => `<button data-drive-folder="${f.id}"><span style="color:${f.color || '#d9a53a'}">${Icons.icons.folder}</span>${esc(f.name)}</button>`).join('')}</div>
          <div class="drive-side-label">Browse by</div>
          <div class="drive-browse"><span>👥 People</span><span>◷ Meetings</span><span>▦ Media</span></div>
          <div class="drive-storage"><span>Storage</span><b>${Math.min(97, 18 + filesAll().length)}% used</b><i><em style="width:${Math.min(97, 18 + filesAll().length)}%"></em></i><small>Local training storage</small></div>
        </aside>
        <main class="drive-main">
          ${tab === 'home' ? `<section class="drive-greeting"><div><h1>For you</h1><p>Files your executive team has been working on.</p></div><button class="btn small" data-drive-refresh>↻ Refresh</button></section>` : `<section class="drive-greeting"><div><h1>${tab === 'mine' ? 'My files' : tab === 'shared' ? 'Shared with me' : 'Recent'}</h1><p>${tab === 'shared' ? 'Files shared by the APPELLO executive office.' : tab === 'recent' ? 'Recently opened files in this workspace.' : 'Folders and documents in the training drive.'}</p></div><span class="drive-count">${files.length} items</span></section>`}
          ${featured.length && tab === 'home' ? `<div class="drive-featured-label"><span>Recent files</span><button data-drive-all>See all</button></div><div class="drive-cards">${featured.map(f => `<button class="drive-card" data-drive-file="${f.id}"><div class="drive-card-preview ${f.type}">${f.type === 'sheet' ? `<span class="mini-grid">${'<i></i>'.repeat(12)}</span>` : `<span class="mini-page"><b>${esc((f.name || '').slice(0, 22))}</b><i></i><i></i><i></i><i></i></span>`}</div><div class="drive-card-foot"><div><strong>${esc(f.name)}</strong><small>${esc(folderOf(f.parentId))} · ${esc(ownerFor(f))}</small></div><span class="drive-card-open">Open</span></div></button>`).join('')}</div>` : ''}
          <div class="drive-list-head"><div class="drive-tabs"><button class="${tab !== 'shared' ? 'active' : ''}" data-drive-tab="recent">Recent</button><button data-drive-tab="shared">Shared</button><button data-drive-tab="mine">My files</button></div><div class="drive-list-actions"><span>Name ↑</span><span>Modified</span><span>Owner</span></div></div>
          <div class="drive-table">
            <div class="drive-table-head"><span>Name</span><span>Modified</span><span>Owner</span><span>Activity</span></div>
            ${list.length ? list.map(f => `<button class="drive-row" data-drive-file="${f.id}"><span class="drive-row-name-cell">${fileIcon(f)}<span class="drive-row-name"><strong>${esc(f.name)}</strong><small>${esc(folderOf(f.parentId))} · ${esc(fileKind(f))}</small></span></span><span class="drive-row-date">${esc(fmtDate(f.updatedAt || f.createdAt, 'medium'))}</span><span class="drive-row-owner">${esc(ownerFor(f))}</span><span class="drive-row-activity">${f.imported ? 'Imported' : f.updatedAt ? 'Edited' : 'Shared'}</span></button>`).join('') : `<div class="drive-empty"><span>▤</span><h3>No files to show</h3><p>Try another view or clear the search.</p></div>`}
          </div>
        </main>
      </div>
    </div>`;
    bind();
  }
  function ownerFor(f) {
    const names = ['Alexandra Morgan','Daniel Kim','Priya Raman','Marcus Chen','Elizabeth Hale'];
    let sum = 0; for (const c of String(f.id || '')) sum += c.charCodeAt(0);
    return names[sum % names.length];
  }
  function bind() {
    const root = instance.root;
    root.querySelectorAll('[data-drive-tab]').forEach(b => b.onclick = () => { instance.tab = b.dataset.driveTab; render(); });
    root.querySelectorAll('[data-drive-file]').forEach(b => b.onclick = () => OS.openFile(b.dataset.driveFile));
    root.querySelectorAll('[data-drive-folder]').forEach(b => b.onclick = () => OS.openApp('files', { folderId:b.dataset.driveFolder }));
    root.querySelectorAll('[data-drive-recycle]').forEach(b => b.onclick = () => OS.openApp('recycle'));
    const search = root.querySelector('#drive-search'); if (search) search.oninput = Utils.debounce(e => { instance.search = e.target.value; render(); setTimeout(() => { const i = root.querySelector('#drive-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 160);
    const help = root.querySelector('[data-drive-help]'); if (help) help.onclick = () => toast('Cloud Drive', 'This is a local training cloud. Files, folders, and recent activity come from the same fictional drive used by Files and the Office apps.', { duration:4200 });
    const fresh = root.querySelector('[data-drive-refresh]'); if (fresh) fresh.onclick = () => { render(); toast('Cloud Drive refreshed', 'Showing the latest local files.', { kind:'success', duration:2000 }); };
    const all = root.querySelector('[data-drive-all]'); if (all) all.onclick = () => { instance.tab = 'recent'; render(); };
    const nw = root.querySelector('[data-drive-new]'); if (nw) nw.onclick = () => OS.openApp('files');
  }
  function mount(container) {
    instance = { root:document.createElement('div'), tab:'home', search:'' };
    instance.root.className = 'drive-root app-fill';
    container.innerHTML = ''; container.appendChild(instance.root);
    render();
  }
  App.register('drive', { mount, destroy(){ instance = null; } });
})();
