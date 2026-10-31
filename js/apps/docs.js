/* Docs — a focused word processor for memos, agendas, and meeting notes. */
(function () {
  'use strict';
  const { esc, toast, modal, confirm, Bus, openHelp, fmtDate, uid, debounce, sanitizeDocHtml } = Utils;
  let instance = null;

  function docFile() { return instance && instance.fileId ? Store.fileById(instance.fileId) : null; }
  function docs() { return Store.state.files.filter(f => f.type === 'doc' && !f.deletedAt); }
  function folderName(id) { const f = id ? Store.fileById(id) : null; return f ? f.name : 'Home'; }
  function wordStats(html) {
    const text = Utils.stripHtml(html || '');
    const words = text ? text.trim().split(/\s+/).length : 0;
    return { words, chars:text.length, minutes:Math.max(1, Math.ceil(words / 200)) };
  }

  function render() {
    const root = instance.root;
    if (!root) return;
    const file = docFile();
    if (!file) {
      root.innerHTML = `<div class="docs-app docs-empty"><div class="empty-state"><div class="empty-icon">📄</div><h3>No document open</h3><p>Open an existing document or create a new memo, agenda, or meeting notes page.</p><div class="inline-actions" style="justify-content:center;margin-top:12px"><button class="btn primary" data-doc-new>New document</button><button class="btn" data-doc-open>Open a document</button></div></div></div>`;
      bind();
      return;
    }
    const html = sanitizeDocHtml(file.content || '');
    const stats = wordStats(html);
    const title = file.name.replace(/\.docx$/i, '');
    root.innerHTML = `
      <div class="docs-app">
        <header class="docs-appbar">
          <div class="docs-brand"><span class="docs-mark">D</span><div><strong>Docs</strong><small>${esc(folderName(file.parentId))}</small></div></div>
          <div class="docs-doc-title" title="${esc(file.name)}">${esc(title)}</div>
          <div class="docs-appbar-right">
            <span class="doc-save-state" id="doc-save-state"><i></i>${instance.dirty ? 'Unsaved changes' : 'Saved'}</span>
            <button class="help-btn" data-doc-help data-tip="Plain-language help for writing memos, agendas, and notes.">What is this?</button>
            <button class="btn small" data-doc-open data-tip="Open another document from the training drive.">Open</button>
            <button class="btn primary small" data-doc-save data-tip="Save the document to Files.">Save</button>
          </div>
        </header>
        <div class="ribbon-tabs docs-ribbon-tabs" role="tablist" aria-label="Document ribbon tabs">
          <button class="active" data-ribbon-tab="home" role="tab">Home</button>
          <button data-ribbon-tab="insert" role="tab">Insert</button>
          <button data-ribbon-tab="review" role="tab">Review</button>
          <button data-ribbon-tab="view" role="tab">View</button>
        </div>
        <div class="docs-ribbon" data-active-ribbon="home" role="toolbar" aria-label="Document formatting">
          <div class="ribbon-group" data-ribbon="home">
            <button class="ribbon-btn" data-doc-new data-tip="Create a new document from a template.">＋ New</button>
            <button class="ribbon-btn" data-doc-open data-tip="Open a saved document.">📂 Open</button>
          </div>
          <div class="ribbon-sep" data-ribbon="home"></div>
          <div class="ribbon-group" data-ribbon="home">
            <select class="ribbon-select" id="doc-block" aria-label="Paragraph style" data-tip="Change the selected paragraph to a heading, body text, or quote.">
              <option value="p">Body text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="blockquote">Quote</option>
            </select>
          </div>
          <div class="ribbon-sep" data-ribbon="home"></div>
          <div class="ribbon-group" data-ribbon="home">
            <button class="ribbon-btn" data-cmd="bold" data-tip="Bold selected text."><b>B</b></button>
            <button class="ribbon-btn" data-cmd="italic" data-tip="Italicize selected text."><i>I</i></button>
            <button class="ribbon-btn" data-cmd="underline" data-tip="Underline selected text."><u>U</u></button>
            <button class="ribbon-btn" data-cmd="strikeThrough" data-tip="Strike through selected text."><s>S</s></button>
          </div>
          <div class="ribbon-sep" data-ribbon="home"></div>
          <div class="ribbon-group" data-ribbon="home">
            <button class="ribbon-btn" data-cmd="insertUnorderedList" data-tip="Create a bulleted list.">• List</button>
            <button class="ribbon-btn" data-cmd="insertOrderedList" data-tip="Create a numbered list.">1. List</button>
            <button class="ribbon-btn" data-cmd="justifyLeft" data-tip="Align left.">≡</button>
            <button class="ribbon-btn" data-cmd="justifyCenter" data-tip="Center the selected paragraphs.">≣</button>
          </div>
          <div class="ribbon-sep" data-ribbon="home"></div>
          <div class="ribbon-group" data-ribbon="home">
            <button class="ribbon-btn" data-cmd="undo" data-tip="Undo the last formatting change.">↶</button>
            <button class="ribbon-btn" data-cmd="redo" data-tip="Redo.">↷</button>
          </div>
          <div class="ribbon-group" data-ribbon="insert">
            <button class="ribbon-btn" data-doc-insert-table data-tip="Insert a simple agenda or action table.">▦ Table</button>
            <button class="ribbon-btn" data-doc-insert-action data-tip="Insert a decisions + actions block for meeting notes.">✓ Action block</button>
            <button class="ribbon-btn" data-doc-insert-heading data-tip="Insert a meeting heading with date and purpose.">⌘ Meeting heading</button>
          </div>
          <div class="ribbon-group" data-ribbon="review">
            <button class="ribbon-btn" data-doc-comment data-tip="Add a comment about the selected text. Comments stay local to this training file.">💬 New comment</button>
            <button class="ribbon-btn" data-doc-history data-tip="View saved versions of this document and restore an earlier one.">🕘 Version history</button>
          </div>
          <div class="ribbon-group" data-ribbon="view">
            <button class="ribbon-btn" data-doc-download data-tip="Download a plain HTML copy of this document.">⤓ Download</button>
            <span class="muted-small doc-view-note">Training preview · saved in this browser</span>
          </div>
          <div class="spacer"></div>
          <div class="ribbon-group doc-zoom"><span class="muted-small">Saved in this browser</span></div>
        </div>
        <div class="docs-workspace">
          <main class="docs-page-wrap">
            <div class="docs-page-meta"><span>${esc(file.name)}</span><span>Last saved ${esc(fmtDate(file.updatedAt || file.createdAt, 'medium'))}</span></div>
            <article class="docs-page" id="doc-editor" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" aria-label="Document content" data-tip="Click and type. Your formatting appears on the page. Use the toolbar for headings, lists, and emphasis.">${html}</article>
          </main>
          <aside class="docs-side">
            <div class="doc-side-card"><span class="eyebrow">Document</span><h3>${esc(title)}</h3><p>${esc(folderName(file.parentId))} · ${esc(stats.words)} words</p><div class="doc-side-row"><span>Reading time</span><strong>${stats.minutes} min</strong></div><div class="doc-side-row"><span>Characters</span><strong>${stats.chars}</strong></div><div class="doc-side-row"><span>Status</span><strong class="${instance.dirty ? 'dirty' : 'saved'}">${instance.dirty ? 'Unsaved' : 'Saved'}</strong></div></div>
            <div class="doc-side-card doc-comments-card"><div class="doc-comments-head"><span class="eyebrow">Comments (${(file.comments || []).filter(c => !c.resolved).length})</span><button class="icon-btn" data-doc-comment aria-label="Add comment" data-tip="Comment on the selected text.">＋</button></div><div class="doc-comment-list">${(file.comments || []).length ? (file.comments || []).slice(-8).map(c => `<div class="doc-comment ${c.resolved ? 'resolved' : ''}"><div class="doc-comment-meta"><strong>${esc(c.author || 'Elizabeth Hale')}</strong><small>${esc(fmtDate(c.at || Utils.simNowIso(), 'medium'))}</small></div>${c.quote ? `<blockquote>${esc(c.quote)}</blockquote>` : ''}<p>${esc(c.body)}</p><div class="doc-comment-actions"><button data-comment-resolve="${c.id}">${c.resolved ? 'Reopen' : 'Resolve'}</button><button data-comment-delete="${c.id}">Delete</button></div></div>`).join('') : '<p class="doc-comments-empty">Select text and click Comment to leave a note for the author. Comments are saved with the file.</p>'}</div></div>
            <div class="doc-side-card"><span class="eyebrow">EA writing checklist</span><div class="doc-check">✓ Does the first line state the purpose?</div><div class="doc-check">✓ Is every action assigned to a person?</div><div class="doc-check">✓ Does every action have a date?</div><div class="doc-check">✓ Would the executive know what to decide?</div></div>
            <div class="inline-actions"><button class="btn full small" data-doc-download data-tip="Download a plain HTML copy of this document.">Download a copy</button><button class="btn full small" data-doc-history data-tip="View earlier saved versions.">Version history</button></div>
          </aside>
        </div>
        <footer class="docs-footer"><span id="doc-word-count">${stats.words} words · ${stats.chars} characters</span><span>Use clear headings. Keep executive documents short enough to scan.</span></footer>
      </div>`;
    bind();
    instance.editor = root.querySelector('#doc-editor');
    if (instance.editor) {
      instance.editor.addEventListener('input', onEditorInput);
      instance.editor.addEventListener('keyup', () => updateDocsCount());
      instance.editor.addEventListener('mouseup', () => updateToolbarState());
      instance.editor.addEventListener('keyup', () => updateToolbarState());
    }
  }

  function bind() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    root.querySelectorAll('[data-doc-help]').forEach(b => b.onclick = () => openHelp('docs'));
    root.querySelectorAll('[data-ribbon-tab]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-ribbon-tab]').forEach(x => x.classList.toggle('active', x === b));
      const ribbon = root.querySelector('.docs-ribbon');
      if (ribbon) ribbon.dataset.activeRibbon = b.dataset.ribbonTab;
    });
    root.querySelectorAll('[data-doc-insert-table]').forEach(b => b.onclick = () => {
      if (!instance.editor) return;
      instance.editor.focus();
      document.execCommand('insertHTML', false, '<table><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody><tr><td>Confirm materials</td><td>Elizabeth</td><td>Wed 17:00</td><td>In progress</td></tr><tr><td>Approve wording</td><td>Clara</td><td>Wed 12:00</td><td>Waiting</td></tr></tbody></table><p></p>');
      markDirty();
    });
    root.querySelectorAll('[data-doc-insert-heading]').forEach(b => b.onclick = () => {
      if (!instance.editor) return;
      instance.editor.focus();
      document.execCommand('insertHTML', false, `<h1>Board pack working session</h1><p class="doc-subtitle">Monday, November 9, 2026 · APPELLO · Prepared by Elizabeth Hale</p><h2>Purpose</h2><p>Agree the final board pack contents and owners.</p>`);
      markDirty();
    });
    root.querySelectorAll('[data-doc-new]').forEach(b => b.onclick = newDoc);
    root.querySelectorAll('[data-doc-open]').forEach(b => b.onclick = openDoc);
    root.querySelectorAll('[data-doc-save]').forEach(b => b.onclick = saveDoc);
    root.querySelectorAll('[data-cmd]').forEach(b => {
      b.onmousedown = e => e.preventDefault();
      b.onclick = () => {
        if (instance.editor) instance.editor.focus();
        document.execCommand(b.dataset.cmd, false, null);
        markDirty();
        updateToolbarState();
      };
    });
    const block = $('#doc-block');
    if (block) block.onchange = () => {
      if (!instance.editor) return;
      instance.editor.focus();
      document.execCommand('formatBlock', false, '<' + block.value + '>');
      markDirty();
    };
    root.querySelectorAll('[data-doc-comment]').forEach(b => b.onclick = addComment);
    root.querySelectorAll('[data-comment-resolve]').forEach(b => b.onclick = () => {
      const current = instance.editor ? sanitizeDocHtml(instance.editor.innerHTML) : null;
      Store.update(s => { const f = s.files.find(x => x.id === instance.fileId); const c = f && (f.comments || []).find(x => x.id === b.dataset.commentResolve); if (c) c.resolved = !c.resolved; if (f && current != null) f.content = current; });
      Store.saveNow(); instance.dirty = false; render();
    });
    root.querySelectorAll('[data-comment-delete]').forEach(b => b.onclick = () => {
      const current = instance.editor ? sanitizeDocHtml(instance.editor.innerHTML) : null;
      Store.update(s => { const f = s.files.find(x => x.id === instance.fileId); if (f) { f.comments = (f.comments || []).filter(x => x.id !== b.dataset.commentDelete); if (current != null) f.content = current; } });
      Store.saveNow(); instance.dirty = false; render();
      toast('Comment deleted', 'The comment was removed from this document.', { duration:2200 });
    });
    root.querySelectorAll('[data-doc-history]').forEach(b => b.onclick = openHistory);
    root.querySelectorAll('[data-doc-insert-action]').forEach(b => b.onclick = () => {
      if (!instance.editor) return;
      const html = `<h2>Decisions</h2><ul><li>Decision — owner</li></ul><h2>Actions</h2><table><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody><tr><td>…</td><td>…</td><td>…</td><td>Not started</td></tr></tbody></table><h2>Follow-up</h2><p>Send a short email within 24 hours. Put decisions first, then actions with an owner and due date.</p>`;
      instance.editor.innerHTML += html;
      markDirty();
    });
    root.querySelectorAll('[data-doc-download]').forEach(b => b.onclick = () => {
      const file = docFile(); if (!file || !instance.editor) return;
      Utils.downloadFile(file.name.replace(/\.docx$/i, '.html'), `<!doctype html><meta charset="utf-8"><title>${esc(file.name)}</title><style>body{font:16px/1.6 Georgia,serif;max-width:760px;margin:50px auto;padding:0 25px;color:#222}h1,h2,h3{font-family:Segoe UI,Arial,sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style>${sanitizeDocHtml(instance.editor.innerHTML)}`, 'text/html');
      Bus.emit('doc:downloaded', { fileId:file.id, title:file.name });
    });
  }

  function updateToolbarState() {
    const block = instance.root.querySelector('#doc-block');
    if (!block) return;
    try {
      const value = (document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, '');
      block.value = ['h1','h2','h3','blockquote'].includes(value) ? value : 'p';
    } catch (e) { /* ignore */ }
  }

  function onEditorInput() {
    markDirty();
    updateDocsCount();
    scheduleAutosave();
  }

  function updateDocsCount() {
    if (!instance.editor) return;
    const stats = wordStats(instance.editor.innerHTML);
    const count = instance.root.querySelector('#doc-word-count');
    if (count) count.textContent = `${stats.words} words · ${stats.chars} characters`;
    const side = instance.root.querySelector('.doc-side-card p');
    if (side) side.textContent = `${folderName(docFile() ? docFile().parentId : null)} · ${stats.words} words`;
  }

  function markDirty() {
    instance.dirty = true;
    const state = instance.root.querySelector('#doc-save-state');
    if (state) { state.classList.add('dirty'); state.innerHTML = '<i></i>Unsaved changes'; }
    const status = instance.root.querySelector('.doc-side-row .dirty, .doc-side-row .saved');
    if (status) { status.classList.remove('saved'); status.classList.add('dirty'); status.textContent = 'Unsaved'; }
  }

  function scheduleAutosave() {
    if (instance.autosaveTimer) clearTimeout(instance.autosaveTimer);
    instance.autosaveTimer = setTimeout(() => saveDoc(true), 900);
  }

  function saveDoc(silent) {
    if (!instance.editor) return;
    const file = docFile();
    if (!file) return;
    const html = sanitizeDocHtml(instance.editor.innerHTML);
    const stats = wordStats(html);
    const previous = file.content || '';
    Store.update(s => {
      const f = s.files.find(x => x.id === file.id);
      if (f) {
        if (!silent && previous && previous !== html) {
          f.revisions = (f.revisions || []).slice(-9);
          f.revisions.push({ id:uid('rev'), at:Utils.simNowIso(), content:previous, words:wordStats(previous).words });
        }
        f.content = html; f.updatedAt = Utils.simNowIso(); f.name = f.name;
      }
      s.docs.selectedFileId = file.id;
      s.recentFiles = [file.id, ...(s.recentFiles || []).filter(id => id !== file.id)].slice(0,10);
    });
    Store.saveNow();
    instance.dirty = false;
    const state = instance.root.querySelector('#doc-save-state');
    if (state) { state.classList.remove('dirty'); state.innerHTML = '<i></i>Saved'; }
    const status = instance.root.querySelector('.doc-side-row .dirty, .doc-side-row .saved');
    if (status) { status.classList.remove('dirty'); status.classList.add('saved'); status.textContent = 'Saved'; }
    const meta = instance.root.querySelector('.docs-page-meta span:last-child');
    if (meta) meta.textContent = 'Last saved just now';
    if (!silent) {
      Bus.emit('doc:saved', { fileId:file.id, title:file.name, folder:file.parentId || null, wordCount:stats.words, contentText:Utils.stripHtml(html).slice(0, 800) });
      toast('Document saved', `${file.name} is saved in ${folderName(file.parentId)}.`, { kind:'success' });
    }
  }

  function addComment() {
    if (!instance.editor) return;
    const selection = window.getSelection();
    const quote = selection && selection.rangeCount && instance.editor.contains(selection.anchorNode) ? selection.toString().trim().slice(0, 220) : '';
    modal({
      title:'Add a comment',
      subtitle:'Comments are saved with this training document. They are not sent to anyone.',
      size:'narrow',
      body:`${quote ? `<div class="comment-quote-preview"><span class="eyebrow">Selected text</span><blockquote>${esc(quote)}</blockquote></div>` : '<p class="muted-small">Tip: select a phrase first to anchor your comment to it.</p>'}<label class="field-label" for="new-comment-text">Comment</label><textarea id="new-comment-text" class="textarea" rows="5" placeholder="What should the author change, check, or decide?" data-tip="Write a specific, respectful comment. Explain the risk and the next action."></textarea>`,
      footer:`<button class="btn" data-cancel-comment>Cancel</button><button class="btn primary" data-save-comment>Add comment</button>`,
      onOpen({ modal: el, close }) {
        const text = el.querySelector('#new-comment-text');
        setTimeout(() => text.focus(), 50);
        el.querySelector('[data-cancel-comment]').onclick = close;
        el.querySelector('[data-save-comment]').onclick = () => {
          if (!text.value.trim()) { toast('Add a comment', 'Write the note before saving.', { kind:'error' }); text.focus(); return; }
          const comment = { id:uid('cmt'), quote, body:text.value.trim(), author:Store.state.profile.name, at:Utils.simNowIso(), resolved:false };
          const current = instance.editor ? sanitizeDocHtml(instance.editor.innerHTML) : null;
          Store.update(s => { const f = s.files.find(x => x.id === instance.fileId); if (f) { f.comments = [...(f.comments || []), comment]; if (current != null) f.content = current; } });
          Store.saveNow(); instance.dirty = false; close(); render();
          Bus.emit('doc:comment-added', { fileId:instance.fileId, quote, body:comment.body });
          toast('Comment added', 'The comment is saved on the document.', { kind:'success', duration:2600 });
        };
      }
    });
  }
  function openHistory() {
    const file = docFile();
    if (!file) return;
    const revisions = (file.revisions || []).slice().reverse();
    modal({
      title:'Version history',
      subtitle:'Manual saves keep up to ten earlier versions in this browser.',
      size:'wide',
      body: revisions.length ? `<div class="doc-version-list">${revisions.map((rev, i) => `<div class="doc-version-row"><span class="doc-version-time">${esc(fmtDate(rev.at, 'medium'))} · ${esc(rev.words || 0)} words</span><div class="doc-version-preview">${esc(Utils.stripHtml(rev.content || '').slice(0, 180)) || 'Empty document'}</div><button class="btn small" data-restore-version="${rev.id}">Restore</button></div>`).join('')}</div>` : '<p class="muted-small">No earlier versions yet. Click Save after editing to keep a restore point.</p>',
      footer:`<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close]').onclick = close;
        el.querySelectorAll('[data-restore-version]').forEach(b => b.onclick = () => {
          const rev = (file.revisions || []).find(x => x.id === b.dataset.restoreVersion);
          if (!rev) return;
          Store.update(s => { const f = s.files.find(x => x.id === file.id); if (f) { f.content = rev.content; f.updatedAt = Utils.simNowIso(); } });
          Store.saveNow(); close(); render();
          toast('Version restored', 'The earlier version is back on the page. Save it if you want to keep it.', { kind:'success' });
        });
      }
    });
  }

  function openDoc() {
    const list = docs();
    modal({
      title:'Open a document',
      subtitle:'Choose a document from the simulated Files drive.',
      size:'wide',
      body:`<div class="doc-open-list">${list.map(f => `<button class="doc-open-row" data-open-doc="${f.id}"><span class="doc-open-icon">📄</span><span><strong>${esc(f.name)}</strong><small>${esc(folderName(f.parentId))} · modified ${esc(fmtDate(f.updatedAt || f.createdAt, 'medium'))}</small></span><span>Open ↗</span></button>`).join('')}</div>`,
      footer:`<button class="btn" data-cancel>Cancel</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelectorAll('[data-open-doc]').forEach(b => b.onclick = () => { close(); openFile(b.dataset.openDoc); });
      }
    });
  }

  function openFile(id) {
    const f = Store.fileById(id);
    if (!f) return;
    if (instance.dirty) saveDoc(true);
    instance.fileId = id;
    instance.dirty = false;
    Store.update(s => { s.docs.selectedFileId = id; });
    Store.touchFile(id);
    render();
    Bus.emit('doc:opened', { fileId:id, title:f.name });
  }

  function newDoc() {
    const folders = Store.state.files.filter(f => f.type === 'folder' && !f.deletedAt);
    const templates = Store.state.files.filter(f => f.type === 'doc' && f.parentId === 'f-templates' && !f.deletedAt);
    modal({
      title:'New document',
      subtitle:'Start blank or use a professional structure. You can edit every part.',
      size:'wide',
      body:`<div class="form-grid"><div class="field"><label for="new-doc-name">Document name</label><input id="new-doc-name" class="input" value="Untitled document" data-tip="Name the document so you can find it later. Include the project or date when it matters."></div><div class="field"><label for="new-doc-folder">Save in</label><select id="new-doc-folder" class="select">${folders.map(f => `<option value="${f.id}" ${f.id === 'f-exec' ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></div><div class="field span-2"><label for="new-doc-template">Start from</label><select id="new-doc-template" class="select"><option value="">Blank document</option>${templates.map(t => `<option value="${t.id}">${esc(t.name.replace(/\.docx$/i,''))}</option>`).join('')}</select></div></div><div class="help-callout" style="margin-top:12px"><span>📝</span><div>A good executive document starts with the purpose and the decision needed. Put supporting detail below.</div></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-create>Create document</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-create]').onclick = () => {
          const name = el.querySelector('#new-doc-name').value.trim() || 'Untitled document';
          const folder = el.querySelector('#new-doc-folder').value;
          const templateId = el.querySelector('#new-doc-template').value;
          const t = templateId ? Store.fileById(templateId) : null;
          const content = t ? t.content : `<h1>${esc(name)}</h1><p><strong>Purpose:</strong> State why this document exists and what decision is needed.</p><h2>Background</h2><p>Add only the context the reader needs.</p><h2>Recommendation</h2><p>Lead with the recommended action, then the rationale.</p><h2>Next steps</h2><ul><li>Owner — action — due date</li></ul>`;
          const id = uid('f');
          const fileName = /\.docx$/i.test(name) ? name : name + '.docx';
          Store.update(s => {
            s.files.push({ id, parentId:folder, name:fileName, type:'doc', content, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
            s.docs.selectedFileId = id;
          });
          instance.fileId = id; instance.dirty = false;
          close(); render();
          Bus.emit('doc:created', { fileId:id, title:fileName, folder, fromTemplate:templateId || null });
          toast('Document created', `${fileName} is ready in ${folderName(folder)}.`, { kind:'success' });
        };
      }
    });
  }

  function appMount(container, win, params) {
    instance = { root:document.createElement('div'), win, fileId:null, dirty:false, editor:null, autosaveTimer:null };
    instance.root.className = 'docs-root app-fill';
    container.innerHTML = '';
    container.appendChild(instance.root);
    let fileId = params && params.fileId;
    if (!fileId) fileId = Store.state.docs.selectedFileId;
    if (!fileId || !Store.fileById(fileId)) fileId = Store.state.files.find(f => f.type === 'doc' && !f.deletedAt)?.id;
    instance.fileId = fileId || null;
    render();
  }

  const app = {
    mount: appMount,
    reopen(params) {
      if (!instance) return;
      if (params && params.fileId) {
        if (instance.dirty) saveDoc(true);
        instance.fileId = params.fileId;
        instance.dirty = false;
        Store.update(s => { s.docs.selectedFileId = params.fileId; });
        Store.touchFile(params.fileId);
        render();
        Bus.emit('doc:opened', { fileId:params.fileId });
      } else if (params && params.newDoc) { newDoc(); }
    },
    beforeClose() { if (instance) saveDoc(true); },
    destroy() { if (instance && instance.autosaveTimer) clearTimeout(instance.autosaveTimer); instance = null; }
  };
  App.register('docs', app);

  window.DocsApp = {
    openFile(id) { if (!OS.isOpen('docs')) OS.openApp('docs', { fileId:id }); else app.reopen({ fileId:id }); },
    newDoc() { if (!OS.isOpen('docs')) OS.openApp('docs'); setTimeout(newDoc, 120); }
  };
})();
