/* Notes — quick notes, meeting-linked notes, and searched snippets. */
(function () {
  'use strict';
  const { esc, toast, modal, confirm, Bus, openHelp, fmtDate, parseISO, uid, debounce, simNowIso } = Utils;
  let instance = null;

  function notes() { return Store.state.notes || []; }
  function selectedNote() { return notes().find(n => n.id === instance.selectedId) || notes()[0] || null; }

  function render() {
    const root = instance.root;
    if (!root) return;
    let list = notes().slice().sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt));
    if (instance.search) {
      const q = instance.search.toLowerCase();
      list = list.filter(n => `${n.title} ${n.content} ${(n.tags||[]).join(' ')}`.toLowerCase().includes(q));
    }
    if (!selectedNote() && list[0]) instance.selectedId = list[0].id;
    const note = selectedNote();
    const linked = note && note.linkedEvent ? Store.eventById(note.linkedEvent) : null;
    root.innerHTML = `
      <div class="notes-app">
        <header class="notes-appbar">
          <div class="notes-brand"><span class="notes-mark">📝</span><div><strong>Notes</strong><small>Quick notes & meeting context</small></div></div>
          <div class="notes-search"><span>⌕</span><input id="notes-search" value="${esc(instance.search)}" placeholder="Search notes" aria-label="Search notes" data-tip="Search note titles, text, and tags."></div>
          <div class="notes-appbar-right"><button class="help-btn" data-help-notes data-tip="How to keep useful meeting notes.">What is this?</button><button class="btn primary small" data-new-note data-tip="Create a quick note, optionally linked to a calendar meeting.">+ New note</button></div>
        </header>
        <div class="notes-body">
          <aside class="notes-list">
            <div class="notes-list-head"><h2>All notes</h2><span class="pill">${notes().length}</span></div>
            ${list.length ? list.map(n => {
              const ev = n.linkedEvent ? Store.eventById(n.linkedEvent) : null;
              return `<button class="note-list-item ${note && note.id === n.id ? 'active' : ''}" data-note="${n.id}">
                <div class="note-list-top"><strong>${n.pinned ? '📌 ' : ''}${esc(n.title)}</strong><small>${esc(Utils.relativeTime(n.updatedAt))}</small></div>
                <p>${esc((n.content || '').replace(/\n/g, ' ').slice(0, 110))}</p>
                <div class="note-list-tags">${(n.tags || []).slice(0,3).map(t => `<span>${esc(t)}</span>`).join('')}${ev ? `<span class="note-event-tag">▦ ${esc(ev.title.slice(0,26))}</span>` : ''}</div>
              </button>`;
            }).join('') : `<div class="empty-state" style="padding:35px 18px"><div class="empty-icon">🔎</div><h3>No matching notes</h3><p>Try a shorter search.</p></div>`}
          </aside>
          <main class="notes-editor">
            ${note ? `
              <div class="notes-editor-head">
                <div class="notes-title-wrap"><span class="eyebrow">${esc((note.tags || [])[0] || 'Note')}</span><h1 class="notes-title" contenteditable="true" id="note-title" data-tip="Edit the note title.">${esc(note.title)}</h1></div>
                <div class="notes-actions"><button class="icon-btn ${note.pinned ? 'active' : ''}" data-pin-note data-tip="${note.pinned ? 'Unpin this note.' : 'Pin this note for quick access.'}" aria-label="Pin note">📌</button><button class="icon-btn" data-note-menu aria-label="More note actions" data-tip="Link, duplicate, or delete this note.">⋯</button></div>
              </div>
              <div class="note-meta-row">
                <label class="note-link-select"><span>Linked meeting</span><select id="note-linked-event" data-tip="Connecting a note to a meeting keeps the context together. You can link a note later."><option value="">No linked meeting</option>${Store.state.calendar.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e => `<option value="${e.id}" ${note.linkedEvent === e.id ? 'selected' : ''}>${esc(fmtDate(parseISO(e.date), 'medium'))} · ${esc(e.title)}</option>`).join('')}</select></label>
                <span class="note-save-state" id="note-save-state">Saved</span>
              </div>
              ${linked ? `<div class="linked-event-banner">▦ <div><strong>${esc(linked.title)}</strong><small>${esc(fmtDate(parseISO(linked.date), 'long'))} · ${esc(Utils.fmtTime(linked.start))}–${esc(Utils.fmtTime(linked.end))} · ${esc(linked.location || '')}</small></div><button class="btn small" data-open-linked-event>Open calendar</button></div>` : ''}
              <textarea class="note-textarea" id="note-content" aria-label="Note content" data-tip="Capture decisions first. Then actions with an owner and a date. Use plain language." placeholder="Start writing…">${esc(note.content)}</textarea>
              <div class="note-tags-edit"><span class="eyebrow">Tags</span><div class="note-tags-row">${(note.tags || []).map(t => `<span class="chip">${esc(t)} <button data-remove-tag="${esc(t)}" aria-label="Remove tag">✕</button></span>`).join('')}<input id="new-tag" class="note-tag-input" placeholder="Add a tag + Enter" aria-label="Add tag" data-tip="Tags help you group notes by project or topic."></div></div>
              <div class="notes-editor-footer"><span>Last saved ${esc(Utils.relativeTime(note.updatedAt))}</span><span>Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save now</span></div>
            ` : `<div class="empty-state" style="height:100%"><div class="empty-icon">📝</div><h3>No note selected</h3><p>Create a note to capture a meeting decision, a phone message, or something you need to remember.</p><button class="btn primary" data-new-note>New note</button></div>`}
          </main>
        </div>
        <footer class="notes-footer"><span>${notes().length} notes · saved in this browser</span><span>Keep decisions and actions together; a note is not a substitute for a calendar invite.</span></footer>
      </div>`;
    bind();
  }

  function bind() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    root.querySelectorAll('[data-help-notes]').forEach(b => b.onclick = () => openHelp('notes'));
    root.querySelectorAll('[data-new-note]').forEach(b => b.onclick = newNote);
    root.querySelectorAll('[data-note]').forEach(b => b.onclick = () => { saveCurrent(); instance.selectedId = b.dataset.note; render(); });
    const search = $('#notes-search');
    if (search) search.oninput = debounce(() => { instance.search = search.value; render(); setTimeout(() => { const i = instance.root.querySelector('#notes-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length,i.value.length); } }, 0); }, 160);
    const title = $('#note-title');
    if (title) {
      title.oninput = () => { markDirty(); };
      title.onblur = () => saveCurrent();
    }
    const content = $('#note-content');
    if (content) {
      content.oninput = () => { markDirty(); scheduleSave(); };
      content.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const start = content.selectionStart; content.value = content.value.slice(0, start) + '  ' + content.value.slice(content.selectionEnd); content.selectionStart = content.selectionEnd = start + 2; } };
    }
    const eventSelect = $('#note-linked-event');
    if (eventSelect) eventSelect.onchange = () => {
      Store.update(s => { const n = s.notes.find(x => x.id === instance.selectedId); if (n) { n.linkedEvent = eventSelect.value || null; n.updatedAt = simNowIso(); } });
      Bus.emit('note:linked', { noteId:instance.selectedId, eventId:eventSelect.value || null });
      render(); toast('Note linked', eventSelect.value ? 'The meeting context is now connected to this note.' : 'The note is no longer linked.', { kind:'success', duration:2600 });
    };
    root.querySelectorAll('[data-pin-note]').forEach(b => b.onclick = () => {
      const n = selectedNote(); if (!n) return;
      Store.update(s => { const note = s.notes.find(x => x.id === n.id); if (note) { note.pinned = !note.pinned; note.updatedAt = simNowIso(); } });
      Bus.emit('note:pinned', { noteId:n.id, pinned:!n.pinned });
      render();
    });
    root.querySelectorAll('[data-note-menu]').forEach(b => b.onclick = e => {
      const n = selectedNote(); if (!n) return;
      const r = b.getBoundingClientRect();
      OS.contextMenu(r.left - 150, r.bottom + 3, [
        { label:n.pinned ? 'Unpin note' : 'Pin note', icon:'📌', action:() => { Store.update(s => { const note = s.notes.find(x => x.id === n.id); if (note) note.pinned = !note.pinned; }); render(); } },
        { label:'Duplicate note', icon:'⧉', action:() => {
          const copy = Object.assign({}, n, { id:uid('note'), title:n.title + ' (copy)', pinned:false, updatedAt:simNowIso() });
          Store.update(s => s.notes.unshift(copy)); instance.selectedId = copy.id; render(); toast('Note duplicated', copy.title, { kind:'success' });
        }},
        { separator:true },
        { label:'Delete note', icon:'🗑', danger:true, action:() => deleteNote(n.id) }
      ]);
    });
    const openLinked = $('[data-open-linked-event]');
    if (openLinked) openLinked.onclick = () => { if (selectedNote() && selectedNote().linkedEvent) { OS.openApp('mail', { view:'calendar' }); } };
    root.querySelectorAll('[data-remove-tag]').forEach(b => b.onclick = () => {
      const n = selectedNote(); if (!n) return;
      Store.update(s => { const note = s.notes.find(x => x.id === n.id); if (note) note.tags = note.tags.filter(t => t !== b.dataset.removeTag); });
      render();
    });
    const tagInput = $('#new-tag');
    if (tagInput) tagInput.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = tagInput.value.trim(); if (!val) return;
        Store.update(s => { const note = s.notes.find(x => x.id === instance.selectedId); if (note && !note.tags.includes(val)) note.tags.push(val); });
        tagInput.value = ''; render();
      }
    };
    root.onkeydown = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveCurrent(true); }
    };
    if (content) setTimeout(() => content.focus(), 20);
  }

  function markDirty() {
    const state = instance.root.querySelector('#note-save-state');
    if (state) { state.textContent = 'Saving…'; state.classList.add('saving'); }
  }
  function scheduleSave() {
    if (instance.saveTimer) clearTimeout(instance.saveTimer);
    instance.saveTimer = setTimeout(() => saveCurrent(), 600);
  }
  function saveCurrent(showToast) {
    const n = selectedNote();
    if (!n || !instance.root) return;
    const title = instance.root.querySelector('#note-title');
    const content = instance.root.querySelector('#note-content');
    if (!title || !content) return;
    Store.update(s => {
      const note = s.notes.find(x => x.id === n.id);
      if (note) { note.title = title.textContent.trim() || 'Untitled note'; note.content = content.value; note.updatedAt = simNowIso(); }
    });
    const state = instance.root.querySelector('#note-save-state');
    if (state) { state.textContent = 'Saved'; state.classList.remove('saving'); }
    Bus.emit('note:saved', { noteId:n.id, title:title.textContent.trim(), linkedEvent:n.linkedEvent || null, length:content.value.length });
    if (showToast) toast('Note saved', 'Your note is up to date.', { kind:'success', duration:2300 });
  }

  function newNote() {
    modal({
      title:'New note',
      subtitle:'A quick note can hold a phone message, a decision, or context for a meeting.',
      size:'wide',
      body:`<div class="form-grid"><div class="field span-2"><label for="new-note-title">Title</label><input id="new-note-title" class="input" placeholder="e.g. Call from Noah about covenant page" data-tip="Make the title specific enough to find later."></div><div class="field span-2"><label for="new-note-link">Link to a meeting (optional)</label><select id="new-note-link" class="select"><option value="">No linked meeting</option>${Store.state.calendar.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e => `<option value="${e.id}">${esc(fmtDate(parseISO(e.date), 'medium'))} · ${esc(e.title)}</option>`).join('')}</select></div><div class="field span-2"><label for="new-note-tags">Tags</label><input id="new-note-tags" class="input" placeholder="Board, Client, Travel (comma separated)" data-tip="Tags group notes across meetings and projects."></div><div class="field span-2"><label for="new-note-content">Note</label><textarea id="new-note-content" class="textarea" style="min-height:130px" placeholder="Decisions, context, and next steps…" data-tip="Write the facts you will need later. Separate decisions from actions."></textarea></div></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-create>Create note</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-create]').onclick = () => {
          const title = el.querySelector('#new-note-title').value.trim();
          if (!title) { toast('Title required', 'A note needs a title so you can find it later.', { kind:'error' }); return; }
          const note = { id:uid('note'), title, linkedEvent:el.querySelector('#new-note-link').value || null, tags:el.querySelector('#new-note-tags').value.split(',').map(x => x.trim()).filter(Boolean), content:el.querySelector('#new-note-content').value, pinned:false, updatedAt:simNowIso() };
          Store.update(s => s.notes.unshift(note));
          instance.selectedId = note.id;
          close(); render();
          Bus.emit('note:created', { noteId:note.id, title, linkedEvent:note.linkedEvent, tags:note.tags });
          toast('Note created', 'It is saved in this browser.', { kind:'success' });
        };
        setTimeout(() => el.querySelector('#new-note-title').focus(), 30);
      }
    });
  }

  async function deleteNote(id) {
    const n = notes().find(x => x.id === id);
    if (!n) return;
    const ok = await confirm({ title:'Delete note?', message:`“${esc(n.title)}” will be removed. If it contains a decision, make sure the decision is captured somewhere else first.`, okText:'Delete note', danger:true });
    if (!ok) return;
    Store.update(s => { s.notes = s.notes.filter(x => x.id !== id); });
    instance.selectedId = null;
    Bus.emit('note:deleted', { noteId:id, title:n.title });
    render(); toast('Note deleted', n.title, { kind:'success', duration:2400 });
  }

  const app = {
    mount(container, win, params) {
      instance = { root:document.createElement('div'), win, selectedId:null, search:'', saveTimer:null };
      instance.root.className = 'notes-root app-fill';
      container.innerHTML = '';
      container.appendChild(instance.root);
      if (params && params.noteId) instance.selectedId = params.noteId;
      else instance.selectedId = Store.state.notes[0] ? Store.state.notes[0].id : null;
      render();
    },
    reopen(params) {
      if (!instance) return;
      if (params && params.noteId) { saveCurrent(); instance.selectedId = params.noteId; }
      render();
    },
    destroy() { if (instance) { saveCurrent(); if (instance.saveTimer) clearTimeout(instance.saveTimer); } instance = null; }
  };
  App.register('notes', app);
})();
