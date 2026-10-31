/* Files — simulated local drive with folders, documents, spreadsheets, and Recycle Bin. */
(function () {
  'use strict';
  const { esc, fmtDate, fmtTime, parseISO, uid, toast, modal, confirm, Bus, debounce, openHelp } = Utils;
  const instances = {};

  function fileMeta(file) {
    if (file.type === 'folder') return 'Folder';
    if (file.type === 'sheet') return 'Sheets workbook';
    if (file.type === 'doc') return 'Docs document';
    return 'File';
  }
  function fileIcon(file, size) {
    const cls = size || 'file-icon';
    if (file.type === 'folder') return `<span class="${cls} folder-ic" style="--folder:${file.color || '#d9a53a'}">${Icons.icons.folder}</span>`;
    if (file.type === 'sheet') return `<span class="${cls}">${Icons.icons.sheet}</span>`;
    return `<span class="${cls}">${Icons.icons.doc}</span>`;
  }
  function childrenOf(parentId) {
    return Store.state.files.filter(f => f.parentId === parentId && !f.deletedAt);
  }
  function findFile(id) { return Store.fileById(id); }
  function pathOf(folderId) {
    const path = [];
    let cur = folderId ? findFile(folderId) : null;
    let guard = 0;
    while (cur && guard++ < 20) { path.unshift(cur); cur = cur.parentId ? findFile(cur.parentId) : null; }
    return path;
  }
  function uniqueName(base, parentId, ext) {
    const existing = new Set(childrenOf(parentId).map(f => f.name.toLowerCase()));
    let name = base + (ext || '');
    let n = 2;
    while (existing.has(name.toLowerCase())) { name = `${base} ${n++}${ext || ''}`; }
    return name;
  }
  function storageEstimate() {
    try {
      const raw = localStorage.getItem(Store.KEY) || '';
      return Math.min(99, Math.max(3, Math.round(raw.length / 1024 / 12)));
    } catch (e) { return 8; }
  }

  function createFilesApp(config) {
    const mode = config.mode || 'files'; // files | recycle
    let activeFolder = null;
    let view = 'grid';
    let search = '';
    let selectedId = null;
    let root, cleanupFns = [];
    let sortMode = 'name';
    let clipboard = null;
    let navHistory = [];
    let navIndex = -1;
    let filesTab = 'home';

    function currentLocation() { return { folder:activeFolder, search }; }
    function recordNav() {
      const loc = currentLocation();
      const prev = navHistory[navIndex];
      if (prev && prev.folder === loc.folder && prev.search === loc.search) return;
      navHistory = navHistory.slice(0, navIndex + 1);
      navHistory.push(loc); navIndex = navHistory.length - 1;
    }
    function goHistory(delta) {
      const next = navIndex + delta;
      if (next < 0 || next >= navHistory.length) return;
      navIndex = next;
      activeFolder = navHistory[next].folder;
      search = navHistory[next].search || '';
      selectedId = null;
      rerender();
    }
    function goUp() {
      if (search) { search = ''; recordNav(); rerender(); return; }
      if (!activeFolder || String(activeFolder).startsWith('__')) { activeFolder = null; recordNav(); rerender(); return; }
      const p = pathOf(activeFolder);
      activeFolder = p.length > 1 ? p[p.length - 2].id : null;
      selectedId = null; recordNav(); rerender();
    }

    function rerender() {
      if (!root) return;
      const state = Store.state;
      if (mode === 'recycle') { renderRecycle(); return; }
      let files;
      let title;
      if (search) {
        files = state.files.filter(f => !f.deletedAt && f.name.toLowerCase().includes(search.toLowerCase()));
        title = `Search results for “${search}”`;
      } else if (activeFolder === '__recent') {
        files = (state.recentFiles || []).map(id => findFile(id)).filter(f => f && !f.deletedAt);
        title = 'Recent';
      } else if (activeFolder === '__shared') {
        files = state.files.filter(f => !f.deletedAt && f.parentId === 'f-shared');
        title = 'Shared with Me';
      } else {
        files = childrenOf(activeFolder);
        title = activeFolder ? (findFile(activeFolder) || {}).name : 'Home';
      }
      files = files.slice().sort((a, b) => {
        if (sortMode === 'date') {
          const ad = String(a.updatedAt || a.createdAt || ''), bd = String(b.updatedAt || b.createdAt || '');
          if (ad !== bd) return bd.localeCompare(ad);
        } else if (sortMode === 'type') {
          if (a.type !== b.type) return String(a.type).localeCompare(String(b.type));
        } else {
          if (a.type === 'folder' && b.type !== 'folder') return -1;
          if (b.type === 'folder' && a.type !== 'folder') return 1;
        }
        return a.name.localeCompare(b.name);
      });
      if (!activeFolder && !search && filesTab === 'thispc') title = 'This PC';
      const crumbs = activeFolder && !activeFolder.startsWith('__') ? pathOf(activeFolder) : [];
      root.innerHTML = `
        <div class="files-tabstrip" role="tablist" aria-label="Explorer tabs">
          <button class="files-tab ${filesTab === 'home' ? 'active' : ''}" data-files-tab="home"><span>⌂</span>Home</button>
          <button class="files-tab ${filesTab === 'thispc' ? 'active' : ''}" data-files-tab="thispc"><span>▤</span>This PC</button>
          <button class="files-tab-add" data-files-tab-add aria-label="New tab">＋</button>
        </div>
        <div class="files-shell">
          <aside class="files-side">
            <nav class="files-nav" aria-label="File locations">
              <button class="${activeFolder === null && !search ? 'active' : ''}" data-nav="home" data-tip="Your top-level folders."><span>🏠</span>Home</button>
              <button class="${activeFolder === '__recent' ? 'active' : ''}" data-nav="recent" data-tip="Files you opened recently, newest first."><span>🕘</span>Recent</button>
              <button class="${activeFolder === '__shared' ? 'active' : ''}" data-nav="shared" data-tip="Files shared with you by teammates."><span>👥</span>Shared with Me</button>
              <div class="files-nav-label">Folders</div>
              ${state.files.filter(f => f.type === 'folder' && !f.deletedAt && !f.parentId).map(f => `<button class="${activeFolder === f.id ? 'active' : ''}" data-folder="${f.id}" data-tip="Open the ${esc(f.name)} folder."><span class="nav-folder" style="color:${f.color || '#d9a53a'}">${Icons.icons.folder}</span>${esc(f.name)}</button>`).join('')}
            </nav>
            <div class="files-storage">
              <div class="storage-head"><span>Training storage</span><strong>${storageEstimate()}%</strong></div>
              <div class="storage-bar"><span style="width:${storageEstimate()}%"></span></div>
              <small>Everything stays in this browser.</small>
              <button class="files-trash-link" data-nav="trash" data-tip="Deleted files stay in the Recycle Bin until you restore or empty it."><span>🗑</span>Recycle Bin <span class="pill">${state.files.filter(f => f.deletedAt).length}</span></button>
            </div>
          </aside>
          <section class="files-main">
            <div class="files-toolbar">
              <div class="files-nav-controls">
                <button class="files-nav-btn" data-f-back aria-label="Back" data-tip="Go back" ${navIndex <= 0 ? 'disabled' : ''}>‹</button>
                <button class="files-nav-btn" data-f-forward aria-label="Forward" data-tip="Go forward" ${navIndex >= navHistory.length - 1 ? 'disabled' : ''}>›</button>
                <button class="files-nav-btn" data-f-up aria-label="Up one level" data-tip="Go up one folder" ${!activeFolder && !search ? 'disabled' : ''}>↑</button>
                <div class="files-address"><span class="files-address-icon">▤</span><div class="files-breadcrumb">
                  <button data-crumb-root>This PC</button>
                  ${crumbs.map(c => `<span>›</span><button data-crumb="${c.id}">${esc(c.name)}</button>`).join('')}
                  ${activeFolder && activeFolder.startsWith('__') ? `<span>›</span><strong>${esc(title)}</strong>` : ''}
                  ${search ? `<span>›</span><strong>Search results</strong>` : ''}
                </div><button class="files-address-refresh" data-f-refresh aria-label="Refresh" data-tip="Refresh this folder">↻</button></div>
              </div>
              <div class="files-toolbar-actions">
                <div class="files-search"><span>⌕</span><input id="files-search" type="search" value="${esc(search)}" placeholder="Search" aria-label="Search files" data-tip="Search by file name across all folders."></div>
                <button class="icon-btn ${view === 'grid' ? 'selected-icon' : ''}" data-view="grid" aria-label="Grid view" data-tip="Show files as large icons.">▦</button>
                <button class="icon-btn ${view === 'list' ? 'selected-icon' : ''}" data-view="list" aria-label="List view" data-tip="Show files in a compact list with details.">☷</button>
                <button class="help-btn" data-help-files data-tip="Learn how this simulated drive works.">What is this?</button>
              </div>
            </div>
            <div class="files-commandbar">
              <button data-f-new data-tip="Create a folder, document, or spreadsheet."><span>＋</span>New</button>
              <span class="files-command-sep"></span>
              <button data-f-cut data-tip="Cut the selected item"><span>✂</span>Cut</button>
              <button data-f-copy data-tip="Copy the selected item"><span>⧉</span>Copy</button>
              <button data-f-paste data-tip="Paste into this folder" ${clipboard ? '' : 'disabled'}><span>📋</span>Paste</button>
              <button data-f-rename data-tip="Rename the selected item"><span>✎</span>Rename</button>
              <button data-f-delete data-tip="Move the selected item to the Recycle Bin"><span>🗑</span>Delete</button>
              <span class="files-command-spacer"></span>
              <label class="files-sort">Sort by <select data-files-sort data-tip="Sort this folder by name, date modified, or type."><option value="name" ${sortMode === 'name' ? 'selected' : ''}>Name</option><option value="date" ${sortMode === 'date' ? 'selected' : ''}>Date modified</option><option value="type" ${sortMode === 'type' ? 'selected' : ''}>Type</option></select></label>
              <button data-f-refresh data-tip="Refresh the file list"><span>↻</span>Refresh</button>
            </div>
            <div class="files-header">
              <div><h2>${esc(title)}</h2><p>${files.length} item${files.length === 1 ? '' : 's'}${activeFolder ? '' : ' · Double-click a folder to open it, or a file to open it in its app.'}</p></div>
              <div class="files-header-actions"><span class="files-selected-hint">${selectedId ? '1 item selected' : 'Select an item for more actions'}</span></div>
            </div>
            <div class="files-content ${view === 'list' ? 'list-view' : 'grid-view'}" id="files-content">
              ${files.length ? files.map(f => fileCard(f)).join('') : emptyState(search, activeFolder)}
            </div>
          </section>
        </div>`;
      bindFiles();
    }

    function fileCard(file) {
      const selected = selectedId === file.id;
      const when = file.updatedAt || file.createdAt;
      if (view === 'list') {
        return `<button class="file-row ${selected ? 'selected' : ''}" data-file="${file.id}" data-tip="${esc(fileMeta(file))} · double-click to open. Right-click for more actions.">
          ${fileIcon(file, 'file-icon-sm')}
          <span class="file-row-name"><strong>${esc(file.name)}</strong><small>${esc(fileMeta(file))}</small></span>
          <span class="file-row-type">${esc(fileMeta(file))}</span>
          <span class="file-row-date">${when ? esc(fmtDate(when, 'medium')) : '—'}</span>
          <span class="file-row-menu">⋯</span>
        </button>`;
      }
      return `<div class="file-card ${selected ? 'selected' : ''}" role="button" tabindex="0" data-file="${file.id}" aria-label="${esc(file.name)}. ${esc(fileMeta(file))}" data-tip="${esc(fileMeta(file))} · double-click to open. Right-click for more actions.">
        <div class="file-card-preview ${file.type}">${file.type === 'folder' ? fileIcon(file, 'file-icon-lg') : `<div class="file-paper">${file.type === 'sheet' ? sheetPreview(file) : docPreview(file)}</div>`}</div>
        <div class="file-card-meta"><strong>${esc(file.name)}</strong><small>${esc(fileMeta(file))} · ${when ? esc(fmtDate(when, 'medium')) : '—'}</small></div>
        <button class="file-more" data-file-menu="${file.id}" aria-label="More actions for ${esc(file.name)}" data-tip="More actions: open, rename, delete.">⋯</button>
      </div>`;
    }

    function docPreview(file) {
      const content = file.content || '';
      const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 130);
      return `<div class="preview-page"><div class="preview-bar"></div><div class="preview-title">${esc(file.name.replace(/\.docx$/i, ''))}</div><div class="preview-lines">${esc(text).slice(0, 120)}</div></div>`;
    }
    function sheetPreview(file) {
      const wb = Store.workbookById(file.workbookId);
      const sheet = wb ? wb.sheets[wb.activeSheet] : null;
      const cells = sheet ? Object.keys(sheet.cells).slice(0, 16) : [];
      return `<div class="preview-sheet"><div class="preview-sheet-head"></div><div class="preview-grid">${cells.map(k => `<i>${esc((sheet.cells[k].v || '').toString().slice(0, 6))}</i>`).join('')}</div></div>`;
    }

    function emptyState(isSearch, folder) {
      if (isSearch) return `<div class="empty-state"><div class="empty-icon">⌕</div><h3>No files match that search</h3><p>Try a shorter word, or browse one of the folders on the left.</p></div>`;
      if (folder === '__recent') return `<div class="empty-state"><div class="empty-icon">🕘</div><h3>No recent files yet</h3><p>Open a document or spreadsheet and it will appear here.</p></div>`;
      return `<div class="empty-state"><div class="empty-icon">📁</div><h3>This folder is empty</h3><p>Use <strong>+ New</strong> to add a document or folder. Your work saves automatically to this browser.</p></div>`;
    }

    function bindFiles() {
      const $ = s => root.querySelector(s);
      const $$ = s => Array.from(root.querySelectorAll(s));
      $$('[data-nav]').forEach(b => b.onclick = () => {
        const nav = b.dataset.nav;
        if (nav === 'trash') { OS.openApp('recycle'); return; }
        activeFolder = nav === 'home' ? null : nav === 'recent' ? '__recent' : '__shared';
        filesTab = nav === 'home' ? 'home' : filesTab;
        search = ''; selectedId = null; recordNav(); rerender();
      });
      $$('[data-folder]').forEach(b => b.onclick = () => { activeFolder = b.dataset.folder; filesTab = 'home'; search = ''; selectedId = null; recordNav(); rerender(); });
      $$('[data-help-files]').forEach(b => b.onclick = () => openHelp('files'));
      $$('[data-crumb]').forEach(b => b.onclick = () => { activeFolder = b.dataset.crumb; search = ''; recordNav(); rerender(); });
      $('[data-crumb-root]').onclick = () => { activeFolder = null; search = ''; recordNav(); rerender(); };
      $$('[data-files-tab]').forEach(b => b.onclick = () => {
        filesTab = b.dataset.filesTab;
        activeFolder = null; search = ''; selectedId = null; recordNav(); rerender();
      });
      const tabAdd = $('[data-files-tab-add]'); if (tabAdd) tabAdd.onclick = () => toast('One training workspace', 'This workspace keeps all company files in a single local drive. Use This PC to return to the drive root.', { duration:3800 });
      const searchInput = $('#files-search');
      searchInput.oninput = debounce(e => { search = e.target.value; recordNav(); rerender(); setTimeout(() => { const i = root.querySelector('#files-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 180);
      $$('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; Store.update(s => { s.ui.filesView = view; }); rerender(); });
      $$('[data-f-new]').forEach(b => b.onclick = newMenu);
      $$('[data-f-refresh]').forEach(b => b.onclick = () => { rerender(); toast('Files refreshed', 'Showing the latest saved items.', { kind:'success', duration:2200 }); });
      const back = $('[data-f-back]'); if (back) back.onclick = () => goHistory(-1);
      const forward = $('[data-f-forward]'); if (forward) forward.onclick = () => goHistory(1);
      const up = $('[data-f-up]'); if (up) up.onclick = goUp;
      $$('[data-f-cut]').forEach(b => b.onclick = () => setClipboard(true));
      $$('[data-f-copy]').forEach(b => b.onclick = () => setClipboard(false));
      $$('[data-f-paste]').forEach(b => b.onclick = pasteClipboard);
      $$('[data-f-rename]').forEach(b => b.onclick = () => { if (!selectedId) { toast('Select an item', 'Choose a file or folder first.', { kind:'error', duration:2500 }); return; } renameFile(selectedId); });
      $$('[data-f-delete]').forEach(b => b.onclick = () => { if (!selectedId) { toast('Select an item', 'Choose a file or folder first.', { kind:'error', duration:2500 }); return; } deleteFile(selectedId); });
      const sort = $('[data-files-sort]'); if (sort) sort.onchange = () => { sortMode = sort.value; rerender(); };
      $$('[data-file]').forEach(el => {
        el.onclick = () => { selectedId = el.dataset.file; $$('[data-file]').forEach(x => x.classList.toggle('selected', x.dataset.file === selectedId)); };
        el.ondblclick = e => { e.preventDefault(); openFile(el.dataset.file); };
        el.onkeydown = e => {
          if (e.key === 'Enter') { e.preventDefault(); openFile(el.dataset.file); }
          if (e.key === ' ') { e.preventDefault(); selectedId = el.dataset.file; el.classList.add('selected'); }
          if (e.key === 'F2') { e.preventDefault(); selectedId = el.dataset.file; renameFile(el.dataset.file); }
          if (e.key === 'Delete') { e.preventDefault(); selectedId = el.dataset.file; deleteFile(el.dataset.file); }
          if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); selectedId = el.dataset.file; clipboard = { id:el.dataset.file, cut:false }; toast('Copied', 'Ready to paste in another folder.', { duration:1800 }); }
          if (e.ctrlKey && e.key.toLowerCase() === 'x') { e.preventDefault(); selectedId = el.dataset.file; clipboard = { id:el.dataset.file, cut:true }; toast('Cut', 'Ready to move.', { duration:1800 }); }
          if (e.ctrlKey && e.key.toLowerCase() === 'v' && clipboard) { e.preventDefault(); pasteClipboard(); }
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = el.getBoundingClientRect(); fileContextMenu(el.dataset.file, r.left + 20, r.top + 20); }
        };
        el.oncontextmenu = e => { e.preventDefault(); selectedId = el.dataset.file; fileContextMenu(el.dataset.file, e.clientX, e.clientY); };
      });
      $$('[data-file-menu]').forEach(b => b.onclick = e => { e.stopPropagation(); const r = b.getBoundingClientRect(); fileContextMenu(b.dataset.fileMenu, r.left - 150, r.bottom + 2); });
    }

    function setClipboard(cut) {
      if (!selectedId) { toast('Select an item', 'Choose a file or folder first.', { kind:'error', duration:2500 }); return; }
      clipboard = { id:selectedId, cut };
      toast(cut ? 'Cut' : 'Copied', `${findFile(selectedId) ? findFile(selectedId).name : 'Item'} is ready to paste.`, { duration:2200 });
      rerender();
    }
    function descendantOf(folderId, ancestorId) {
      let cur = folderId;
      while (cur) {
        if (cur === ancestorId) return true;
        const f = findFile(cur);
        cur = f ? f.parentId : null;
      }
      return false;
    }
    function pasteClipboard() {
      if (!clipboard) return;
      const source = findFile(clipboard.id);
      if (!source) { clipboard = null; rerender(); return; }
      const target = activeFolder && !String(activeFolder).startsWith('__') ? activeFolder : null;
      if (source.type === 'folder' && target && descendantOf(target, source.id)) { toast('Cannot paste there', 'A folder cannot be moved inside itself.', { kind:'error' }); return; }
      if (clipboard.cut) {
        Store.update(s => { const f = s.files.find(x => x.id === source.id); if (f) { f.parentId = target; f.updatedAt = Utils.simNowIso(); } });
        Bus.emit('file:moved', { fileId:source.id, name:source.name, folder:target });
        toast('Item moved', `${source.name} was moved to this folder.`, { kind:'success', duration:2600 });
      } else {
        const newId = cloneTree(source.id, target);
        Bus.emit('file:created', { fileId:newId, name:'Copy of ' + source.name, type:source.type, folder:target, copied:true });
        toast('Item pasted', `A copy of ${source.name} was created.`, { kind:'success', duration:2600 });
      }
      Store.saveNow(); clipboard = null; rerender();
    }
    function cloneTree(id, parentId) {
      const src = findFile(id);
      if (!src) return null;
      const newId = Utils.uid('f');
      const clone = Object.assign({}, src, { id:newId, parentId:parentId || null, name:'Copy of ' + src.name, createdAt:Utils.simNowIso(), updatedAt:Utils.simNowIso(), deletedAt:null, comments:[], revisions:[] });
      if (src.type === 'sheet' && src.workbookId) {
        const wb = Store.workbookById(src.workbookId);
        if (wb) {
          const newWb = JSON.parse(JSON.stringify(wb));
          newWb.id = Utils.uid('wb'); newWb.fileId = newId; newWb.name = clone.name.replace(/\.xlsx$/i, '') + ' copy';
          Store.update(s => s.workbooks.push(newWb));
          clone.workbookId = newWb.id;
        }
      }
      Store.update(s => s.files.push(clone));
      if (src.type === 'folder') {
        Store.state.files.filter(f => f.parentId === src.id && !f.deletedAt).forEach(child => cloneTree(child.id, newId));
      }
      return newId;
    }
    function openFile(id) {
      const file = findFile(id);
      if (!file) return;
      if (file.type === 'folder') { activeFolder = file.id; recordNav(); rerender(); Bus.emit('file:folder-opened', { fileId: id, name:file.name }); return; }
      Store.touchFile(id);
      if (file.type === 'doc') { OS.openApp('docs', { fileId: id }); Bus.emit('file:opened', { fileId:id, type:'doc', name:file.name }); }
      else if (file.type === 'sheet') { OS.openApp('sheets', { fileId: id }); Bus.emit('file:opened', { fileId:id, type:'sheet', name:file.name }); }
      else { OS.openApp('docs', { fileId: id }); }
      rerender();
    }

    function fileContextMenu(id, x, y) {
      const f = findFile(id);
      if (!f) return;
      const items = [
        { label:'Open', icon:'↗', action:() => openFile(id) },
        { separator:true },
        { label:'Cut', icon:'✂', shortcut:'Ctrl+X', action:() => { selectedId = id; setClipboard(true); } },
        { label:'Copy', icon:'⧉', shortcut:'Ctrl+C', action:() => { selectedId = id; setClipboard(false); } },
        { label:'Rename', icon:'✎', shortcut:'F2', action:() => renameFile(id) },
        { label:'Open file location', icon:'📁', action:() => { activeFolder = f.parentId; recordNav(); rerender(); } },
        { label:'Properties', icon:'ⓘ', action:() => fileProperties(id) },
        { separator:true },
        { label:'Delete', icon:'🗑', shortcut:'Del', action:() => deleteFile(id), danger:true }
      ];
      if (window.OS) OS.contextMenu(x, y, items);
    }

    function renameFile(id) {
      const f = findFile(id);
      if (!f) return;
      modal({
        title:'Rename',
        size:'narrow',
        body:`<div class="field"><label for="rename-input">New name</label><input id="rename-input" class="input" value="${esc(f.name)}" data-tip="Use a clear, descriptive file name. Include the date when versions matter."></div>`,
        footer:`<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok>Rename</button>`,
        onOpen({ modal: el, close }) {
          const input = el.querySelector('#rename-input');
          el.querySelector('[data-cancel]').onclick = close;
          const go = () => {
            const name = input.value.trim();
            if (!name) { toast('Name required', 'A file needs a name.', { kind:'error' }); return; }
            Store.update(s => { const file = s.files.find(x => x.id === id); if (file) { file.name = name; file.updatedAt = new Date().toISOString(); } });
            Bus.emit('file:renamed', { fileId:id, name });
            close(); rerender(); toast('File renamed', name, { kind:'success' });
          };
          el.querySelector('[data-ok]').onclick = go;
          input.onkeydown = e => { if (e.key === 'Enter') go(); };
          setTimeout(() => { input.focus(); input.select(); }, 30);
        }
      });
    }

    function deleteFile(id) {
      const f = findFile(id);
      if (!f) return;
      Store.update(s => { const file = s.files.find(x => x.id === id); if (file) { file.deletedAt = new Date().toISOString(); file.deletedFrom = file.parentId; } });
      Bus.emit('file:deleted', { fileId:id, name:f.name });
      rerender();
      toast('Moved to Recycle Bin', `${f.name} can be restored from the Recycle Bin.`, { kind:'success', duration:4000 });
    }

    function fileProperties(id) {
      const f = findFile(id);
      if (!f) return;
      modal({
        title:f.name, subtitle:fileMeta(f), size:'narrow',
        body:`<div class="properties-grid">
          <span>Type</span><strong>${esc(fileMeta(f))}</strong>
          <span>Location</span><strong>${esc((findFile(f.parentId) || {name:'Home'}).name)}</strong>
          <span>Created</span><strong>${esc(fmtDate(f.createdAt || '2026-11-09', 'long'))}</strong>
          <span>Modified</span><strong>${esc(fmtDate(f.updatedAt || f.createdAt || '2026-11-09', 'long'))}</strong>
          <span>Saved</span><strong>In this browser (localStorage)</strong>
        </div>`,
        footer:`<button class="btn primary" data-close>Close</button>`,
        onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
      });
    }

    function newMenu() {
      modal({
        title:'Create new', subtitle:'New items are created in the current folder and saved in this browser.', size:'narrow',
        body:`<div class="new-menu-list">
          <button data-new-folder><span class="new-ic">📁</span><span><strong>New folder</strong><small>Group related files together.</small></span></button>
          <button data-new-doc><span class="new-ic">📄</span><span><strong>Blank document</strong><small>Open a memo or notes page in Docs.</small></span></button>
          <button data-new-sheet><span class="new-ic">▦</span><span><strong>Blank spreadsheet</strong><small>Open a new workbook in Sheets.</small></span></button>
          <button data-new-from-template><span class="new-ic">✨</span><span><strong>From a template</strong><small>Start with the memo, agenda, or meeting notes format.</small></span></button>
        </div>`,
        footer:`<button class="btn" data-close>Cancel</button>`,
        onOpen({ modal: el, close }) {
          const folderId = (activeFolder && !activeFolder.startsWith('__')) ? activeFolder : null;
          el.querySelector('[data-new-folder]').onclick = () => { close(); createFolder(folderId); };
          el.querySelector('[data-new-doc]').onclick = () => { close(); createDoc(folderId); };
          el.querySelector('[data-new-sheet]').onclick = () => { close(); createSheet(folderId); };
          el.querySelector('[data-new-from-template]').onclick = () => { close(); createFromTemplate(folderId); };
          el.querySelector('[data-close]').onclick = close;
        }
      });
    }

    function createFolder(parentId) {
      const name = uniqueName('New folder', parentId);
      const newFile = { id:uid('f'), parentId, name, type:'folder', color:'#d9a53a', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      Store.update(s => s.files.push(newFile));
      Bus.emit('file:created', { fileId:newFile.id, name, type:'folder', folder:parentId });
      rerender();
      toast('Folder created', `${name} is ready.`, { kind:'success' });
      setTimeout(() => renameFile(newFile.id), 220);
    }

    function createDoc(parentId) {
      const id = uid('f');
      const name = uniqueName('Untitled document', parentId, '.docx');
      const file = { id, parentId, name, type:'doc', content:'<h1>Untitled document</h1><p>Start writing here. Use the toolbar for headings and lists.</p>', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      Store.update(s => s.files.push(file));
      Bus.emit('file:created', { fileId:id, name, type:'doc', folder:parentId });
      OS.openApp('docs', { fileId:id });
      rerender();
    }

    function createSheet(parentId) {
      const wbId = uid('wb');
      const name = uniqueName('Untitled workbook', parentId, '.xlsx');
      const id = uid('f');
      const wb = {
        id:wbId, name:name.replace(/\.xlsx$/i, ''), fileId:id, activeSheet:'Sheet1',
        sheets:{ Sheet1:{ name:'Sheet1', cells:{}, colWidths:{A:150,B:150,C:150,D:150,E:150,F:150}, rowHeights:{}, freeze:{row:0,col:0}, conditionalFormats:[], chart:null, filter:null, hiddenRows:[] } }
      };
      const file = { id, parentId, name, type:'sheet', workbookId:wbId, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      Store.update(s => { s.workbooks.push(wb); s.files.push(file); });
      Bus.emit('file:created', { fileId:id, name, type:'sheet', folder:parentId });
      OS.openApp('sheets', { fileId:id });
      rerender();
    }

    function createFromTemplate(parentId) {
      const templates = Store.state.files.filter(f => f.parentId === 'f-templates' && !f.deletedAt);
      modal({
        title:'Choose a template', subtitle:'Templates give you a professional starting structure. You can edit every part.',
        size:'wide',
        body:`<div class="template-list">${templates.map(f => `<button class="template-option" data-template="${f.id}">${fileIcon(f, 'file-icon')}<span><strong>${esc(f.name)}</strong><small>${esc(fileMeta(f))}</small></span></button>`).join('')}</div>`,
        footer:`<button class="btn" data-close>Cancel</button>`,
        onOpen({ modal: el, close }) {
          el.querySelectorAll('[data-template]').forEach(b => b.onclick = () => {
            const t = findFile(b.dataset.template);
            if (!t) return;
            const newId = uid('f');
            const base = t.name.replace(/\.(docx|xlsx)$/i, '');
            const ext = t.type === 'sheet' ? '.xlsx' : '.docx';
            const name = uniqueName(base, parentId, ext);
            if (t.type === 'sheet') {
              const src = Store.workbookById(t.workbookId);
              if (src) {
                const clone = JSON.parse(JSON.stringify(src));
                clone.id = uid('wb'); clone.fileId = newId; clone.name = name.replace(/\.xlsx$/,''); clone.template = false;
                Store.update(s => s.workbooks.push(clone));
                Store.update(s => s.files.push({ id:newId, parentId, name, type:'sheet', workbookId:clone.id, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }));
                close(); OS.openApp('sheets', { fileId:newId }); rerender();
              }
            } else {
              Store.update(s => s.files.push({ id:newId, parentId, name, type:'doc', content:t.content || '', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }));
              close(); OS.openApp('docs', { fileId:newId }); rerender();
            }
            Bus.emit('file:created', { fileId:newId, name, type:t.type, folder:parentId, fromTemplate:t.id });
          });
          el.querySelector('[data-close]').onclick = close;
        }
      });
    }

    function renderRecycle() {
      const deleted = Store.state.files.filter(f => f.deletedAt);
      root.innerHTML = `
        <div class="files-shell recycle-shell">
          <aside class="files-side recycle-side">
            <div class="recycle-brand"><span class="recycle-big">${Icons.icons.recycle.replace('class="icon-tile"','class="recycle-big-icon"')}</span><h2>Recycle Bin</h2><p>${deleted.length} deleted item${deleted.length === 1 ? '' : 's'}</p></div>
            <button class="btn full" data-restore-all data-tip="Restore every item in the Recycle Bin to its original folder." ${deleted.length ? '' : 'disabled'}>Restore all</button>
            <button class="btn danger full" data-empty-bin data-tip="Permanently delete everything in the Recycle Bin. This cannot be undone." ${deleted.length ? '' : 'disabled'}>Empty Recycle Bin</button>
            <div class="recycle-note">Items deleted from Files and the Desktop appear here. In this workspace, the Recycle Bin is your safety net.</div>
          </aside>
          <section class="files-main recycle-main">
            <div class="files-toolbar"><div class="files-breadcrumb"><strong>Recycle Bin</strong></div><div class="files-toolbar-actions"><button class="help-btn" data-help-files data-tip="Learn how deletion and restore work in this workspace.">What is this?</button><button class="btn small" data-back-files data-tip="Return to your folders.">Back to Files</button></div></div>
            <div class="files-header"><div><h2>Deleted items</h2><p>Restore a file to put it back where it came from.</p></div></div>
            <div class="recycle-list">
              ${deleted.length ? deleted.map(f => `
                <div class="recycle-row">
                  ${fileIcon(f, 'file-icon')}
                  <div class="recycle-meta"><strong>${esc(f.name)}</strong><small>${esc(fileMeta(f))} · deleted ${esc(fmtDate(f.deletedAt, 'medium'))}${f.deletedFrom ? ` · from ${esc((findFile(f.deletedFrom) || {name:'Home'}).name)}` : ''}</small></div>
                  <button class="btn small" data-restore="${f.id}" data-tip="Put this item back in its original folder.">Restore</button>
                  <button class="btn small danger" data-purge="${f.id}" data-tip="Delete this item permanently.">Delete forever</button>
                </div>`).join('') : `<div class="empty-state"><div class="empty-icon">🗑</div><h3>The Recycle Bin is empty</h3><p>When you delete a file, it comes here first. Nothing is gone until you empty the bin.</p></div>`}
            </div>
          </section>
        </div>`;
      bindRecycle();
    }

    function bindRecycle() {
      const $ = s => root.querySelector(s);
      const $$ = s => Array.from(root.querySelectorAll(s));
      $('[data-back-files]').onclick = () => OS.openApp('files');
      root.querySelectorAll('[data-help-files]').forEach(b => b.onclick = () => openHelp('files'));
      $$('[data-restore]').forEach(b => b.onclick = () => {
        const id = b.dataset.restore;
        const f = findFile(id);
        Store.update(s => { const file = s.files.find(x => x.id === id); if (file) { file.deletedAt = null; } });
        Bus.emit('file:restored', { fileId:id, name:f ? f.name : '' });
        renderRecycle(); toast('Item restored', `${f ? f.name : 'The file'} is back in its folder.`, { kind:'success' });
      });
      $$('[data-purge]').forEach(b => b.onclick = async () => {
        const f = findFile(b.dataset.purge);
        const ok = await confirm({ title:'Delete permanently?', message:`“${esc(f ? f.name : 'This item')}” will be removed permanently. This cannot be undone.`, okText:'Delete forever', danger:true });
        if (!ok) return;
        Store.update(s => { s.files = s.files.filter(x => x.id !== b.dataset.purge); });
        Bus.emit('file:purged', { fileId:b.dataset.purge, name:f ? f.name : '' });
        renderRecycle();
      });
      const restoreAll = $('[data-restore-all]');
      if (restoreAll) restoreAll.onclick = () => {
        Store.update(s => s.files.forEach(f => { if (f.deletedAt) f.deletedAt = null; }));
        renderRecycle(); toast('All items restored', 'Everything in the Recycle Bin is back in its folder.', { kind:'success' });
      };
      const empty = $('[data-empty-bin]');
      if (empty) empty.onclick = async () => {
        const ok = await confirm({ title:'Empty the Recycle Bin?', message:'Every deleted item will be removed permanently. In a real job, check the bin before emptying it — people sometimes delete the wrong file.', okText:'Empty bin', danger:true });
        if (!ok) return;
        Store.update(s => { s.files = s.files.filter(f => !f.deletedAt); });
        renderRecycle(); toast('Recycle Bin emptied', 'All deleted items were permanently removed.', { kind:'success' });
      };
    }

    function mount(container, win, params) {
      root = document.createElement('div');
      root.className = 'files-app app-fill';
      container.innerHTML = '';
      container.appendChild(root);
      view = (Store.state.ui && Store.state.ui.filesView) || 'grid';
      if (params && params.folderId) activeFolder = params.folderId;
      if (params && params.mode === 'trash') activeFolder = null;
      if (params && params.search) search = params.search;
      if (!navHistory.length) { navIndex = -1; recordNav(); }
      rerender();
      const off = Bus.on('file:updated', () => rerender());
      cleanupFns.push(off);
      instances[mode] = {
        rerender,
        navigate(folderId) { activeFolder = folderId || null; search = ''; rerender(); },
        openFile,
        setSearch(q) { search = q; rerender(); }
      };
    }

    function reopen(params) {
      if (!instances[mode] || !root) return;
      if (params && params.folderId) { activeFolder = params.folderId; search = ''; }
      if (params && params.recent) activeFolder = '__recent';
      rerender();
      if (params && params.renameId) setTimeout(() => renameFile(params.renameId), 200);
    }

    return { mount, reopen, destroy() { cleanupFns.forEach(fn => fn()); root = null; } };
  }

  App.register('files', createFilesApp({ mode:'files' }));
  App.register('recycle', createFilesApp({ mode:'recycle' }));
})();
