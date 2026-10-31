/* Local workspace persistence. */
(function () {
  'use strict';

  const KEY = 'appello-ea-academy-v1';
  const LEGACY_KEY = 'northstar-ea-academy-v1';
  const SAVE_DELAY = 220;
  let state = null;
  let saveTimer = null;
  let lastError = null;

  function safeRecord(payload) {
    // Persist only compact, training-relevant detail. Full email bodies and
    // documents stay in the live state, not in the action log.
    const primitive = v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null;
    const whitelist = new Set([
      'id','emailId','subject','to','cc','bcc','from','eventId','title','date','start','end','room',
      'attendees','chatId','messageId','text','textPreview','priority','due','taskId','fileId','folder',
      'workbookId','sheetName','cell','formula','value','callId','caller','status','note','hasGreeting',
      'hasSubject','recipientCount','mode','source','valid','conflict','count','mins','files','type',
      'personId','channelId','teamId','linkedEvent','fromName','recipients','category','sheet','row','col'
    ]);
    const out = {};
    if (!payload || typeof payload !== 'object') return out;
    Object.keys(payload).forEach(k => {
      if (!whitelist.has(k)) return;
      const v = payload[k];
      if (primitive(v)) out[k] = typeof v === 'string' && v.length > 400 ? v.slice(0, 400) : v;
      else if (Array.isArray(v)) out[k] = v.slice(0, 30).map(x => primitive(x) ? x : (x && typeof x === 'object' ? (x.id || x.email || x.name || '') : '')).filter(x => x !== '');
      else if (v && typeof v === 'object') {
        out[k] = {};
        Object.keys(v).slice(0, 12).forEach(kk => { if (primitive(v[kk])) out[k][kk] = v[kk]; });
      }
    });
    return out;
  }

  function init() {
    try {
      let raw = localStorage.getItem(KEY);
      let migrated = false;
      if (!raw) {
        // Preserve training progress from the previous fictional company name,
        // while moving the saved identity to APPELLO / Elizabeth.
        raw = localStorage.getItem(LEGACY_KEY);
        migrated = !!raw;
      }
      if (raw) {
        if (migrated) {
          raw = raw
            .replace(/Northstar Meridian/g, 'APPELLO')
            .replace(/northstarmeridian\.com/g, 'appello.com')
            .replace(/Northstar EA Academy/g, 'APPELLO EA Academy')
            .replace(/Northstar/g, 'APPELLO')
            .replace(/Jordan Ellis/g, 'Elizabeth Hale')
            .replace(/jordan\.ellis/g, 'elizabeth.hale')
            .replace(/Jordan/g, 'Elizabeth')
            .replace(/northstar-ea-academy-v1/g, KEY);
        }
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && parsed.profile && parsed.mail) {
          state = parsed;
          // Guarantee fields added in later builds exist without wiping progress.
          const seed = Data.seed();
          hydrate(state, seed);
        } else {
          state = Data.seed();
        }
        if (migrated) localStorage.removeItem(LEGACY_KEY);
      } else {
        state = Data.seed();
      }
    } catch (err) {
      console.warn('Could not read saved training data; starting fresh.', err);
      state = Data.seed();
    }
    window.Store.state = state;
    // Give mail a deterministic selected email if old state points nowhere.
    ensureSelections();
    saveNow();
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
    return state;
  }

  function hydrate(target, seed) {
    // Light structural repair for a saved session. Never overwrite user content.
    for (const key of Object.keys(seed)) {
      if (!(key in target)) target[key] = seed[key];
    }
    if (!target.mail.customFolders) target.mail.customFolders = seed.mail.customFolders;
    if (!target.mail.rules) target.mail.rules = seed.mail.rules;
    if (!target.mail.signature) target.mail.signature = seed.mail.signature;
    if (!target.teams.incomingCalls || !target.teams.incomingCalls.length) target.teams.incomingCalls = seed.teams.incomingCalls;
    if (!target.training) target.training = seed.training;
    if (!target.training.actionLog) target.training.actionLog = [];
    if (!target.training.progress) target.training.progress = {};
    if (!target.training.skills) target.training.skills = {};
    if (!target.training.badges) target.training.badges = [];
    if (!target.ui) target.ui = seed.ui;
    if (!target.calendar.focusDate) target.calendar.focusDate = seed.calendar.focusDate;
    // Data repair for workbooks if a future code version adds a template.
    const existingWb = new Set((target.workbooks || []).map(w => w.id));
    for (const wb of seed.workbooks) if (!existingWb.has(wb.id)) target.workbooks.push(wb);
    // Keep contacts/rooms canonical but preserve notes typed by the learner.
    for (const c of seed.contacts) {
      const saved = (target.contacts || []).find(x => x.id === c.id);
      if (saved) { saved.notes = saved.notes || c.notes; }
    }
  }

  function ensureSelections() {
    const emails = state.mail.emails;
    if (!emails.find(e => e.id === state.mail.selectedId)) state.mail.selectedId = emails[0] ? emails[0].id : null;
    if (!state.activeWorkbookId || !state.workbooks.find(w => w.id === state.activeWorkbookId)) state.activeWorkbookId = state.workbooks[0].id;
    if (!state.teams.selectedChatId || !state.teams.chats.find(c => c.id === state.teams.selectedChatId)) state.teams.selectedChatId = state.teams.chats[0].id;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, SAVE_DELAY);
  }

  function saveNow() {
    if (!state) return;
    clearTimeout(saveTimer);
    try {
      state.lastSavedAt = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(state));
      lastError = null;
    } catch (err) {
      lastError = err;
      console.warn('Training data could not be saved. Browser storage may be full or blocked.', err);
      if (window.OS && OS.toast) OS.toast('Could not save progress', 'Your browser blocked local storage. Use a local web server or allow storage for this page.', { kind: 'error', duration: 7000 });
    }
  }

  function update(mutator, options) {
    if (!state) return;
    try { mutator(state); } catch (err) { console.error('State update failed', err); throw err; }
    scheduleSave();
    if (options && options.emit) Bus.emit(options.emit, options.detail || {});
    return state;
  }

  function commit() { scheduleSave(); }

  function logAction(type, detail) {
    if (!state || !state.training) return;
    const log = state.training.actionLog;
    log.push({ type, at: new Date().toISOString(), detail: safeRecord(detail) });
    if (log.length > 1200) log.splice(0, log.length - 1200);
    scheduleSave();
  }

  function touchFile(fileId) {
    if (!fileId) return;
    const recent = state.recentFiles || (state.recentFiles = []);
    state.recentFiles = [fileId, ...recent.filter(id => id !== fileId)].slice(0, 10);
    const f = state.files.find(x => x.id === fileId);
    if (f) f.updatedAt = new Date().toISOString();
    scheduleSave();
  }

  function fileById(id) { return state.files.find(f => f.id === id); }
  function workbookById(id) { return state.workbooks.find(w => w.id === id); }
  function eventById(id) { return state.calendar.events.find(e => e.id === id); }
  function contactById(id) { return state.contacts.find(c => c.id === id); }
  function emailById(id) { return state.mail.emails.find(e => e.id === id); }
  function chatById(id) { return state.teams.chats.find(c => c.id === id); }

  function reset() {
    clearTimeout(saveTimer);
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state = Data.seed();
    window.Store.state = state;
    ensureSelections();
    saveNow();
    Bus.emit('store:reset', {});
    return state;
  }

  function clearAllCustomActivity() {
    // Alias kept intentionally explicit for Reset Training Data.
    return reset();
  }

  function exportState() {
    return JSON.stringify(state, null, 2);
  }

  window.Store = {
    init, saveNow, scheduleSave, update, commit, reset, clearAllCustomActivity,
    logAction, touchFile, fileById, workbookById, eventById, contactById, emailById, chatById,
    exportState, KEY,
    get state() { return state; },
    set state(value) { state = value; },
    get ready() { return !!state; },
    get lastError() { return lastError; }
  };
  // Support window.Store.state direct reads while allowing setter above.
  window.Store.init();
})();
