/* Mail — inbox, folders, composing, etiquette coach, calendar, contacts, settings. */
(function () {
  'use strict';
  const { esc, fmtDate, fmtTime, fmtTimeRange, relativeTime, simNow, parseISO, dateKey, addDays,
    toast, modal, confirm, Bus, debounce, openHelp, timeZoneLabel, getLocalTimeForZone, paragraphHtml } = Utils;

  let instance = null;

  function deliverScheduled(emailId, quiet) {
    let delivered = null;
    Store.update(s => {
      const e = s.mail.emails.find(x => x.id === emailId);
      if (!e || e.folder !== 'scheduled') return;
      e.folder = 'sent';
      e.date = Utils.dateKey(Utils.simNow());
      e.time = Utils.fmtTime(Utils.simNowIso().slice(11, 16));
      e.at = Utils.simNowIso();
      e.read = true;
      e.scheduledFor = null;
      e.labels = (e.labels || []).filter(l => !/scheduled/i.test(l));
      delivered = { emailId:e.id, to:e.to, cc:e.cc, subject:e.subject, body:e.body, hasGreeting:true, hasSubject:true, mode:'scheduled', recipientCount:e.to.length, attachments:e.attachments || [], scheduled:true };
    });
    if (!delivered) return;
    Store.saveNow();
    Bus.emit('mail:sent', delivered);
    if (instance) {
      instance.folder = 'sent';
      instance.selectedId = emailId;
      render();
    }
    if (!quiet) toast('Scheduled message sent', delivered.subject || 'Your scheduled email was sent.', { kind:'success' });
  }

  function sweepScheduled() {
    if (!window.Store || !Store.ready) return;
    const nowKey = Utils.simNowIso().slice(0, 19);
    const due = Store.state.mail.emails.filter(e => e.folder === 'scheduled' && e.scheduledFor && e.scheduledFor.slice(0, 19) <= nowKey);
    due.forEach(e => deliverScheduled(e.id, true));
  }
  // Catch up messages that became due while the tab was closed. Delivery is
  // completed the next time this local training workstation opens.
  setTimeout(sweepScheduled, 1200);
  const scheduledTimer = setInterval(sweepScheduled, 15000);

  function formatBytes(n) {
    if (!n && n !== 0) return 'File';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function contactForEmail(email) {
    return Data.contacts.find(c => c.email.toLowerCase() === String(email).toLowerCase()) || null;
  }
  function toneFor(email) {
    const c = contactForEmail(email);
    return c ? c.tone : 5;
  }
  function nameFor(email) {
    const c = contactForEmail(email);
    return c ? c.name : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  }
  function recipientText(list) { return (list || []).map(nameFor).join(', '); }
  function myEmail() { return Store.state.profile.email; }

  function folderMeta() {
    const s = Store.state.mail;
    return [
      { id:'inbox', name:'Inbox', icon:'✉', tip:'New messages that need your attention.' },
      { id:'flagged', name:'Flagged', icon:'⚑', tip:'Messages you marked to come back to.' },
      { id:'sent', name:'Sent', icon:'➤', tip:'Messages you have sent. This is your proof of what was agreed.' },
      { id:'drafts', name:'Drafts', icon:'✎', tip:'Unsent messages. Finish and send them when ready.' },
      { id:'archive', name:'Archive', icon:'▣', tip:'Finished messages kept for the record.' },
      { id:'deleted', name:'Deleted', icon:'🗑', tip:'Deleted messages. You can still read them in this simulation.' },
      { id:'scheduled', name:'Scheduled', icon:'⏲', tip:'Messages waiting to send. Due messages deliver while this workstation is open; anything missed is sent the next time it opens.' },
      ...s.customFolders.map(f => ({ id:'custom-' + f.id, name:f.name, icon:'▤', tip:'Custom folder. Rules can move matching messages here.', custom:true }))
    ];
  }

  function visibleEmails() {
    const s = Store.state;
    const folder = instance.folder;
    let emails = s.mail.emails.filter(e => {
      if (folder === 'flagged') return e.flagged && e.folder !== 'deleted';
      if (folder === 'inbox') return e.folder === 'inbox';
      if (folder.startsWith('custom-')) return e.folder === folder;
      return e.folder === folder;
    });
    if (folder === 'inbox') {
      const now = simNow().getTime();
      emails = emails.filter(e => !e.snoozedUntil || new Date(e.snoozedUntil).getTime() <= now);
    }
    if (instance.search) {
      const q = instance.search.toLowerCase();
      emails = emails.filter(e => `${e.subject} ${e.body} ${e.from.name} ${e.from.email} ${(e.to || []).join(' ')}`.toLowerCase().includes(q));
    }
    if (instance.filter === 'unread') emails = emails.filter(e => !e.read);
    if (instance.filter === 'attachments') emails = emails.filter(e => e.attachments && e.attachments.length);
    if (instance.filter === 'flagged') emails = emails.filter(e => e.flagged);
    emails.sort((a, b) => {
      if (instance.sort === 'oldest') return new Date(a.at) - new Date(b.at);
      if (instance.sort === 'sender') return a.from.name.localeCompare(b.from.name);
      if (instance.sort === 'subject') return a.subject.localeCompare(b.subject);
      return new Date(b.at) - new Date(a.at);
    });
    return emails;
  }

  function counts(folder) {
    const e = Store.state.mail.emails;
    if (folder === 'inbox') return e.filter(x => x.folder === 'inbox' && !x.read).length;
    if (folder === 'flagged') return e.filter(x => x.flagged && x.folder !== 'deleted').length;
    if (folder === 'drafts') return e.filter(x => x.folder === 'drafts').length;
    if (folder === 'scheduled') return e.filter(x => x.folder === 'scheduled').length;
    if (folder.startsWith('custom-')) return e.filter(x => x.folder === folder && !x.read).length;
    return 0;
  }

  function currentEmail() {
    if (!instance.selectedId) return null;
    return Store.state.mail.emails.find(e => e.id === instance.selectedId) || null;
  }

  function render() {
    const root = instance.root;
    if (!root) return;
    if (instance.calendarController) { instance.calendarController.destroy(); instance.calendarController = null; }
    const s = Store.state;
    const folder = folderMeta().find(f => f.id === instance.folder);
    let content = '';
    if (instance.view === 'calendar') content = `<div id="mail-calendar" class="mail-calendar"></div>`;
    else if (instance.view === 'contacts') content = renderContacts();
    else content = renderMailPanes();
    root.innerHTML = `
      <div class="mail-app outlook-app">
        <header class="outlook-topbar">
          <div class="outlook-brand"><span class="outlook-logo">✉</span><strong>Mail</strong></div>
          <nav class="outlook-menubar" aria-label="Mail menus">
            <button data-outlook-menu="file">File</button>
            <button class="active" data-outlook-menu="home">Home</button>
            <button data-outlook-menu="view">View</button>
            <button data-outlook-menu="help">Help</button>
          </nav>
          <label class="mail-global-search"><span>⌕</span><input id="mail-search" type="search" value="${esc(instance.search)}" placeholder="Search" aria-label="Search mail" data-tip="Search subject, sender, recipients, and message text in the current folder.">${instance.search ? `<button data-clear-search aria-label="Clear search">✕</button>` : ''}</label>
          <div class="outlook-top-actions">
            <button class="outlook-assist-btn" data-open-app="assistant" data-tip="Ask APPELLO Assist about this mailbox.">✦ Assist</button>
            <button class="icon-btn" data-help-mail aria-label="Help" data-tip="Plain-language help for Mail, folders, etiquette, and the calendar.">?</button>
            <button class="icon-btn" data-mail-settings aria-label="Mailbox settings" data-tip="Out-of-office, email signature, and executive mailbox preferences.">⚙</button>
            ${Icons.avatar('Elizabeth Hale', 'avatar-sm', 2)}
          </div>
        </header>
        <div class="outlook-ribbon">
          <div class="outlook-ribbon-group">
            <div class="outlook-command-row">
              <button class="outlook-command tall" data-compose><span class="oc-icon">✉</span><span>New mail</span></button>
              <button class="outlook-command tall" data-ribbon-event><span class="oc-icon">▦</span><span>New event</span></button>
              <button class="outlook-command tall" data-ribbon-contact><span class="oc-icon">◉</span><span>New contact</span></button>
            </div>
            <span class="outlook-group-label">New</span>
          </div>
          <div class="outlook-ribbon-sep"></div>
          <div class="outlook-ribbon-group">
            <button class="outlook-command" data-ribbon-delete><span>🗑</span>Delete</button>
            <button class="outlook-command" data-ribbon-archive><span>⌫</span>Archive</button>
          </div>
          <div class="outlook-ribbon-sep"></div>
          <div class="outlook-ribbon-group">
            <span class="outlook-group-label">Respond</span>
            <div class="outlook-command-row">
              <button class="outlook-command" data-ribbon-reply><span>↩</span>Reply</button>
              <button class="outlook-command" data-ribbon-reply-all><span>↩↩</span>Reply all</button>
              <button class="outlook-command" data-ribbon-forward><span>↪</span>Forward</button>
            </div>
          </div>
          <div class="outlook-ribbon-sep"></div>
          <div class="outlook-ribbon-group">
            <span class="outlook-group-label">Teamspace</span>
            <div class="outlook-command-row">
              <button class="outlook-command" data-ribbon-teams><span>👥</span>Meet now</button>
              <button class="outlook-command" data-ribbon-chat><span>💬</span>Chat</button>
            </div>
          </div>
          <div class="outlook-ribbon-sep"></div>
          <div class="outlook-ribbon-group">
            <span class="outlook-group-label">Move</span>
            <div class="outlook-command-row">
              <button class="outlook-command" data-ribbon-move><span>▣</span>Move</button>
              <button class="outlook-command" data-rules><span>⚗</span>Rules</button>
            </div>
          </div>
          <div class="outlook-ribbon-sep"></div>
          <div class="outlook-ribbon-group">
            <span class="outlook-group-label">Quick steps</span>
            <div class="outlook-command-row">
              <button class="outlook-command" data-ribbon-flag><span>⚑</span>Flag</button>
              <button class="outlook-command" data-ribbon-markread><span>✓</span>Mark read</button>
            </div>
          </div>
          <div class="outlook-ribbon-flex"></div>
          <button class="outlook-ribbon-help" data-help-mail>What is this?</button>
        </div>
        <div class="outlook-body">
          <nav class="outlook-rail" aria-label="Apps">
            <button class="outlook-rail-btn ${instance.view === 'mail' ? 'active' : ''}" data-mail-view="mail" data-tip="Mail"><span>✉</span></button>
            <button class="outlook-rail-btn ${instance.view === 'calendar' ? 'active' : ''}" data-mail-view="calendar" data-tip="Calendar"><span>▦</span><i class="rail-alert">${conflictCount()}</i></button>
            <button class="outlook-rail-btn ${instance.view === 'contacts' ? 'active' : ''}" data-mail-view="contacts" data-tip="People"><span>◉</span></button>
            <button class="outlook-rail-btn" data-open-app="todo" data-tip="Tasks"><span>☑</span></button>
            <button class="outlook-rail-btn" data-open-app="drive" data-tip="Cloud Drive"><span>☁</span></button>
            <button class="outlook-rail-btn" data-open-app="assistant" data-tip="APPELLO Assist"><span>✦</span></button>
            <div class="outlook-rail-spacer"></div>
            <button class="outlook-rail-btn" data-mail-settings data-tip="Mailbox settings"><span>⚙</span></button>
          </nav>
          <aside class="mail-sidebar outlook-sidebar">
            <div class="outlook-account"><span class="outlook-account-avatar">${Icons.avatar('Elizabeth Hale', 'avatar-sm', 2)}</span><div><strong>Elizabeth Hale</strong><small>elizabeth.hale@appello.com</small></div><span class="outlook-account-chevron">⌄</span></div>
            <div class="outlook-folder-label">Favorites</div>
            <nav class="mail-nav" aria-label="Mail folders">
              ${folderMeta().slice(0, 6).map(f => `<button class="mail-folder ${instance.folder === f.id && instance.view === 'mail' ? 'active' : ''}" data-folder="${f.id}" data-tip="${esc(f.tip)}"><span class="folder-ico">${f.icon}</span><span>${esc(f.name)}</span>${counts(f.id) ? `<span class="mail-count ${f.id === 'inbox' ? 'unread' : ''}">${counts(f.id)}</span>` : ''}</button>`).join('')}
            </nav>
            <div class="outlook-folder-label">All folders</div>
            <nav class="mail-nav" aria-label="More mail folders">
              ${folderMeta().slice(6).map(f => `<button class="mail-folder ${instance.folder === f.id && instance.view === 'mail' ? 'active' : ''}" data-folder="${f.id}" data-tip="${esc(f.tip)}"><span class="folder-ico">${f.icon}</span><span>${esc(f.name)}</span>${counts(f.id) ? `<span class="mail-count">${counts(f.id)}</span>` : ''}</button>`).join('')}
            </nav>
            <button class="mail-add-folder" data-new-folder data-tip="Create a custom folder and an optional rule that files matching emails automatically.">＋ Add folder</button>
            <div class="outlook-sidebar-foot"><button data-mail-settings>⚙ Settings</button><button data-rules>⚗ Rules</button></div>
          </aside>
          <section class="mail-workspace">
            ${content}
          </section>
        </div>
      </div>`;
    bindGlobal();
    if (instance.view === 'calendar') {
      const cal = root.querySelector('#mail-calendar');
      if (cal) instance.calendarController = CalendarView.mount(cal, { context:'mail' });
    } else if (instance.view === 'mail') {
      bindMail();
    } else if (instance.view === 'contacts') {
      bindContacts();
    }
  }

  function conflictCount() {
    const events = Store.state.calendar.events;
    const seen = new Set();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (Utils.eventsOverlap(events[i], events[j])) { seen.add(events[i].id); seen.add(events[j].id); }
      }
    }
    return seen.size;
  }

  function bindGlobal() {
    const root = instance.root;
    root.querySelectorAll('[data-compose]').forEach(b => b.onclick = () => openCompose({ mode:'new' }));
    root.querySelectorAll('[data-folder]').forEach(b => b.onclick = () => {
      instance.view = 'mail';
      instance.folder = b.dataset.folder;
      instance.selectedId = null;
      instance.search = '';
      render();
      Bus.emit('mail:folder-opened', { folder: instance.folder });
    });
    root.querySelectorAll('[data-mail-view]').forEach(b => b.onclick = () => {
      instance.view = b.dataset.mailView;
      render();
      Bus.emit('mail:view-changed', { view: instance.view });
    });
    root.querySelectorAll('[data-help-mail]').forEach(b => b.onclick = () => openHelp('mail'));
    root.querySelectorAll('[data-mail-settings]').forEach(b => b.onclick = openSettings);
    root.querySelectorAll('[data-rules]').forEach(b => b.onclick = openRules);
    root.querySelectorAll('[data-new-folder]').forEach(b => b.onclick = openRules);
    root.querySelectorAll('[data-open-app]').forEach(b => b.onclick = () => { if (window.OS) OS.openApp(b.dataset.openApp); });
    root.querySelectorAll('[data-outlook-menu]').forEach(b => b.onclick = () => {
      const item = b.dataset.outlookMenu;
      if (item === 'home') { instance.view = 'mail'; render(); }
      else if (item === 'help') openHelp('mail');
      else if (item === 'view') toast('View options', 'Use the filter and sort controls in the message list. Calendar and People are in the left app rail.', { duration:3600 });
      else toast('File menu', 'Mail settings, rules, signatures, and out-of-office are available from the gear and Rules buttons.', { duration:3600 });
    });
    const selectedForRibbon = () => currentEmail();
    root.querySelectorAll('[data-ribbon-event]').forEach(b => b.onclick = () => {
      instance.view = 'calendar'; render();
      setTimeout(() => { if (window.CalendarView) CalendarView.openEventModal({ defaultDate:Store.state.company.simulationDate, defaultStart:'10:00', context:'mail' }); }, 220);
    });
    root.querySelectorAll('[data-ribbon-contact]').forEach(b => b.onclick = () => { instance.view = 'contacts'; render(); toast('People', 'Choose a contact to see their time zone and communication style. New contacts are not editable in this training build.', { duration:4200 }); });
    root.querySelectorAll('[data-ribbon-delete]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) deleteEmail(e); else toast('Select a message', 'Open an email before deleting it.', { duration:2200 }); });
    root.querySelectorAll('[data-ribbon-archive]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) archiveEmail(e); else toast('Select a message', 'Open an email before archiving it.', { duration:2200 }); });
    root.querySelectorAll('[data-ribbon-reply]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) openCompose({ mode:'reply', original:e }); });
    root.querySelectorAll('[data-ribbon-reply-all]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) openCompose({ mode:'replyAll', original:e }); });
    root.querySelectorAll('[data-ribbon-forward]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) openCompose({ mode:'forward', original:e }); });
    root.querySelectorAll('[data-ribbon-teams]').forEach(b => b.onclick = () => { if (window.OS) OS.openApp('teams'); });
    root.querySelectorAll('[data-ribbon-chat]').forEach(b => b.onclick = () => { if (window.OS) OS.openApp('teams', { section:'chat' }); });
    root.querySelectorAll('[data-ribbon-move]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (!e) return; const r = b.getBoundingClientRect(); moveMenu(e, r.left, r.bottom + 4); });
    root.querySelectorAll('[data-ribbon-flag]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) toggleFlag(e); });
    root.querySelectorAll('[data-ribbon-markread]').forEach(b => b.onclick = () => { const e = selectedForRibbon(); if (e) toggleRead(e); });
    const search = root.querySelector('#mail-search');
    if (search) {
      search.oninput = debounce(e => {
        instance.search = e.target.value;
        render();
        setTimeout(() => {
          const i = instance.root.querySelector('#mail-search');
          if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
        }, 0);
      }, 180);
    }
    const clear = root.querySelector('[data-clear-search]');
    if (clear) clear.onclick = () => { instance.search = ''; render(); };
  }

  /* ------------------------------ mail panes ---------------------------- */
  function renderMailPanes() {
    const folder = folderMeta().find(f => f.id === instance.folder) || { name:'Inbox', tip:'' };
    const emails = visibleEmails();
    if (!emails.find(e => e.id === instance.selectedId)) instance.selectedId = emails[0] ? emails[0].id : null;
    const selected = currentEmail();
    return `
      <div class="mail-panes">
        <section class="mail-list-pane" aria-label="${esc(folder.name)} messages">
          <div class="mail-list-head">
            <div><h2>${esc(folder.name)} ${counts(instance.folder) ? `<span class="mail-head-count">${counts(instance.folder)} unread</span>` : ''}</h2><p>${esc(folder.tip)}</p></div>
            <button class="icon-btn" data-mark-all-read data-tip="Mark every message in this folder as read." aria-label="Mark all read">✓</button>
          </div>
          <div class="mail-list-controls">
            <select class="select sm" data-mail-filter aria-label="Filter messages" data-tip="Show only unread, flagged, or attachment messages.">
              <option value="all" ${instance.filter === 'all' ? 'selected' : ''}>All messages</option>
              <option value="unread" ${instance.filter === 'unread' ? 'selected' : ''}>Unread</option>
              <option value="flagged" ${instance.filter === 'flagged' ? 'selected' : ''}>Flagged</option>
              <option value="attachments" ${instance.filter === 'attachments' ? 'selected' : ''}>Has attachments</option>
            </select>
            <select class="select sm" data-mail-sort aria-label="Sort messages" data-tip="Sort by newest, oldest, sender, or subject.">
              <option value="newest" ${instance.sort === 'newest' ? 'selected' : ''}>Newest first</option>
              <option value="oldest" ${instance.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
              <option value="sender" ${instance.sort === 'sender' ? 'selected' : ''}>Sender A–Z</option>
              <option value="subject" ${instance.sort === 'subject' ? 'selected' : ''}>Subject A–Z</option>
            </select>
          </div>
          <div class="mail-list" id="mail-list">
            ${emails.length ? emails.map(e => emailRow(e, selected && selected.id === e.id)).join('') : `<div class="empty-state"><div class="empty-icon">✉</div><h3>No messages here</h3><p>${instance.search ? 'Try a shorter search, or clear the search box.' : 'This folder is clear. Use New email to start a message.'}</p></div>`}
          </div>
        </section>
        <section class="mail-reading-pane" aria-label="Reading pane">
          ${selected ? readingPane(selected) : `<div class="empty-state mail-empty-reading"><div class="empty-icon">📬</div><h3>Select a message</h3><p>Choose an email to read it. A clear reading pane shows who sent it, what they need, and what you should do next.</p></div>`}
        </section>
      </div>`;
  }

  function emailRow(e, selected) {
    const contact = contactForEmail(e.from.email);
    const unread = !e.read;
    return `<div class="mail-row ${unread ? 'unread' : ''} ${selected ? 'selected' : ''}" role="button" tabindex="0" data-email="${e.id}" aria-label="${esc((unread ? 'Unread. ' : '') + e.from.name + '. ' + e.subject)}" data-tip="Open this email. ${esc(e.subject)}">
      <div class="mail-row-avatar">${Icons.avatar(e.from.name, 'avatar-md', contact ? contact.tone : 5)}${unread ? '<i class="unread-dot" aria-label="Unread"></i>' : ''}</div>
      <div class="mail-row-main">
        <div class="mail-row-top"><strong>${esc(e.from.name)}</strong><span>${esc(e.date && e.date !== dateKey(simNow()) ? fmtDate(parseISO(e.date), 'medium') : (e.time || fmtTime(e.at.split('T')[1].slice(0,5))))}</span></div>
        <div class="mail-row-subject">${e.flagged ? '<span class="mail-flag">⚑</span>' : ''}${esc(e.subject || '(no subject)')}${e.attachments && e.attachments.length ? '<span class="mail-attach-ico">📎</span>' : ''}</div>
        <div class="mail-row-preview">${esc((e.body || '').replace(/\n/g, ' ').slice(0, 125))}</div>
        <div class="mail-row-labels">${(e.labels || []).slice(0, 3).map(l => `<span class="mail-label ${/urgent|high|confidential/i.test(l) ? 'red' : /board|legal/i.test(l) ? 'purple' : /client/i.test(l) ? 'green' : 'blue'}">${esc(l)}</span>`).join('')}${e.folder === 'scheduled' ? '<span class="mail-label amber">Scheduled</span>' : ''}${e.snoozedUntil && new Date(e.snoozedUntil) > simNow() ? '<span class="mail-label amber">Snoozed</span>' : ''}</div>
      </div>
    </div>`;
  }

  function readingPane(e) {
    const contact = contactForEmail(e.from.email);
    const isSent = e.folder === 'sent' || e.folder === 'scheduled';
    return `<div class="mail-read">
      <div class="mail-read-toolbar">
        <div class="mail-read-actions">
          ${e.folder === 'scheduled' ? `<button class="btn primary small" data-send-scheduled data-tip="Send this scheduled message now instead of waiting for its send time.">Send now</button>` : e.folder === 'drafts' ? `<button class="btn primary small" data-edit-draft data-tip="Continue editing this draft.">Continue editing</button>` : `<button class="btn small" data-reply data-tip="Reply only to the sender.">↩ Reply</button><button class="btn small" data-reply-all data-tip="Reply to everyone in To and CC. Use only when everyone needs the answer.">Reply all</button><button class="btn small" data-forward data-tip="Send this message to someone new.">Forward</button>`}
        </div>
        <div class="mail-read-actions">
          <button class="icon-btn ${e.flagged ? 'flagged' : ''}" data-flag-email aria-label="${e.flagged ? 'Unflag' : 'Flag'}" data-tip="${e.flagged ? 'Remove the follow-up flag.' : 'Flag this message to return to it later.'}">${e.flagged ? '⚑' : '⚐'}</button>
          <button class="icon-btn" data-read-toggle aria-label="${e.read ? 'Mark unread' : 'Mark read'}" data-tip="${e.read ? 'Mark this message unread.' : 'Mark this message read.'}">${e.read ? '✉' : '●'}</button>
          <button class="icon-btn" data-snooze aria-label="Snooze" data-tip="Hide this message temporarily, then bring it back later.">⏲</button>
          <button class="icon-btn" data-move-email aria-label="Move to folder" data-tip="File this message into another folder.">▣</button>
          <button class="icon-btn" data-archive-email aria-label="Archive" data-tip="Archive this message. It leaves the inbox but stays in the record.">⌫</button>
          <button class="icon-btn" data-delete-email aria-label="Delete" data-tip="Move this message to Deleted.">🗑</button>
        </div>
      </div>
      <div class="mail-subject-line">
        <h1>${esc(e.subject || '(no subject)')}</h1>
        <div class="mail-subject-labels">${(e.labels || []).map(l => `<span class="mail-label ${/urgent|high|confidential/i.test(l) ? 'red' : /board|legal/i.test(l) ? 'purple' : /client/i.test(l) ? 'green' : 'blue'}">${esc(l)}</span>`).join('')}${e.flagged ? '<span class="mail-label amber">⚑ Follow up</span>' : ''}</div>
      </div>
      <div class="mail-sender-row">
        ${Icons.avatar(e.from.name, 'avatar-lg', contact ? contact.tone : 5)}
        <div class="mail-sender-meta">
          <strong>${esc(isSent ? 'You' : e.from.name)} <span>&lt;${esc(e.from.email)}&gt;</span></strong>
          <small>To: ${esc(recipientText(e.to))}${e.cc && e.cc.length ? ` · CC: ${esc(recipientText(e.cc))}` : ''}${e.bcc && e.bcc.length ? ' · BCC recipients hidden' : ''}</small>
        </div>
        <div class="mail-sender-time">${e.date ? esc(fmtDate(parseISO(e.date), 'medium')) + ' · ' : ''}${esc(fmtTime(e.time))}${e.scheduledFor ? `<small>Scheduled for ${esc(fmtDate(parseISO(e.scheduledFor.slice(0,10)), 'medium'))} ${esc(fmtTime(e.scheduledFor.slice(11,16)))}</small>` : ''}</div>
      </div>
      ${e.snoozedUntil && new Date(e.snoozedUntil) > simNow() ? `<div class="mail-snooze-banner">⏲ Snoozed until ${esc(fmtDate(new Date(e.snoozedUntil), 'medium'))} at ${esc(new Date(e.snoozedUntil).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }))}</div>` : ''}
      <div class="mail-body-text">${esc(e.body || '')}</div>
      ${e.attachments && e.attachments.length ? `<div class="mail-attachments"><span class="eyebrow">Attachments (${e.attachments.length})</span>${e.attachments.map((a, idx) => `<button class="attachment-card" data-attachment="${idx}" data-tip="${a.dataUrl ? 'Download this locally stored attachment.' : 'Open the simulated attachment.'}"><span class="attachment-icon">${a.kind === 'sheet' ? '▦' : a.dataUrl ? '📎' : '📄'}</span><span><strong>${esc(a.name)}</strong><small>${esc(a.size || 'File')} · ${a.dataUrl ? esc((a.mime || 'file').split('/').pop().toUpperCase()) : a.kind === 'sheet' ? 'Spreadsheet' : 'Document'}</small></span><span class="attachment-open">${a.dataUrl ? 'Download' : 'Open'}</span></button>`).join('')}</div>` : ''}
      <div class="mail-read-footer">
        <div class="mail-read-hint">Training mailbox · fictional correspondence for practice.</div>
        <button class="btn small" data-help-mail>What is this?</button>
      </div>
    </div>`;
  }

  function bindMail() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    const $$ = s => Array.from(root.querySelectorAll(s));
    $$('[data-email]').forEach(row => {
      row.onclick = () => selectEmail(row.dataset.email);
      row.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectEmail(row.dataset.email); }
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = row.getBoundingClientRect(); emailContext(row.dataset.email, r.left + 20, r.top + 20); }
      };
      row.oncontextmenu = e => { e.preventDefault(); emailContext(row.dataset.email, e.clientX, e.clientY); };
    });
    const filter = $('[data-mail-filter]');
    if (filter) filter.onchange = () => { instance.filter = filter.value; render(); };
    const sort = $('[data-mail-sort]');
    if (sort) sort.onchange = () => { instance.sort = sort.value; render(); };
    const markAll = $('[data-mark-all-read]');
    if (markAll) markAll.onclick = () => {
      const ids = visibleEmails().map(e => e.id);
      Store.update(s => s.mail.emails.forEach(e => { if (ids.includes(e.id)) e.read = true; }));
      Bus.emit('mail:all-read', { folder: instance.folder, count: ids.length });
      toast('Marked all as read', `${ids.length} message${ids.length === 1 ? '' : 's'} in ${instance.folder}.`, { kind:'success' });
      render();
    };
    const e = currentEmail();
    if (!e) return;
    $$('[data-reply]').forEach(b => b.onclick = () => openCompose({ mode:'reply', original:e }));
    $$('[data-reply-all]').forEach(b => b.onclick = () => openCompose({ mode:'replyAll', original:e }));
    $$('[data-forward]').forEach(b => b.onclick = () => openCompose({ mode:'forward', original:e }));
    $$('[data-edit-draft]').forEach(b => b.onclick = () => openCompose({ mode:'draft', draft:e }));
    $$('[data-send-scheduled]').forEach(b => b.onclick = () => deliverScheduled(e.id));
    $$('[data-flag-email]').forEach(b => b.onclick = () => toggleFlag(e));
    $$('[data-read-toggle]').forEach(b => b.onclick = () => toggleRead(e));
    $$('[data-snooze]').forEach(b => b.onclick = () => snoozeEmail(e));
    $$('[data-move-email]').forEach(b => b.onclick = ev => { const r = ev.currentTarget.getBoundingClientRect(); moveMenu(e, r.left, r.bottom + 4); });
    $$('[data-archive-email]').forEach(b => b.onclick = () => archiveEmail(e));
    $$('[data-delete-email]').forEach(b => b.onclick = () => deleteEmail(e));
    $$('[data-attachment]').forEach(b => b.onclick = () => {
      const a = (e.attachments || [])[Number(b.dataset.attachment)];
      if (!a) return;
      if (a.dataUrl) {
        const link = document.createElement('a');
        link.href = a.dataUrl;
        link.download = a.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        Bus.emit('mail:attachment-downloaded', { emailId:e.id, name:a.name, size:a.sizeBytes || 0, type:a.mime || '' });
        toast('Attachment downloaded', `${a.name} was saved through your browser.`, { kind:'success', duration:3000 });
      } else if (a.fileId && Store.fileById(a.fileId)) { OS.openFile(a.fileId); }
      else toast('Simulated attachment', `${a.name} is a seeded training attachment. There is no external file to download.`, { duration:4200 });
    });
    $$('[data-help-mail]').forEach(b => b.onclick = () => openHelp('mail'));
  }

  function selectEmail(id) {
    instance.selectedId = id;
    const e = currentEmail();
    if (e && !e.read) {
      Store.update(s => { const m = s.mail.emails.find(x => x.id === id); if (m) m.read = true; });
      Bus.emit('mail:read', { emailId:id, from:e.from.name, subject:e.subject, flagged:e.flagged });
    }
    if (e && e.folder === 'drafts') { openCompose({ mode:'draft', draft:e }); }
    render();
  }

  function toggleFlag(e) {
    Store.update(s => { const m = s.mail.emails.find(x => x.id === e.id); if (m) m.flagged = !m.flagged; });
    Bus.emit('mail:flagged', { emailId:e.id, flagged:!e.flagged, subject:e.subject });
    toast(e.flagged ? 'Flag removed' : 'Email flagged', e.flagged ? 'The follow-up marker is cleared.' : 'You can find it in Flagged. This tells no one else.', { kind:'success', duration:3000 });
    render();
  }
  function toggleRead(e) {
    Store.update(s => { const m = s.mail.emails.find(x => x.id === e.id); if (m) m.read = !m.read; });
    Bus.emit('mail:read-toggled', { emailId:e.id, read:!e.read, subject:e.subject });
    if (e.read) toast('Marked unread', 'It will stay in the list as something to return to.', { duration:2800 });
    render();
  }
  function archiveEmail(e) {
    const from = e.folder;
    Store.update(s => { const m = s.mail.emails.find(x => x.id === e.id); if (m) { m.folder = 'archive'; m.deletedFrom = from; } });
    Bus.emit('mail:archived', { emailId:e.id, subject:e.subject, from:from });
    instance.selectedId = null;
    toast('Email archived', 'It left the inbox but is still in Archive. Nothing was deleted.', { kind:'success' });
    render();
  }
  function deleteEmail(e) {
    Store.update(s => { const m = s.mail.emails.find(x => x.id === e.id); if (m) { m.deletedFrom = m.folder; m.folder = 'deleted'; } });
    Bus.emit('mail:deleted', { emailId:e.id, subject:e.subject, from:e.folder });
    instance.selectedId = null;
    toast('Moved to Deleted', 'You can still find the message in the Deleted folder.', { kind:'success' });
    render();
  }
  function moveEmail(e, folder) {
    Store.update(s => { const m = s.mail.emails.find(x => x.id === e.id); if (m) { m.folder = folder; m.deletedFrom = null; } });
    Bus.emit('mail:moved', { emailId:e.id, subject:e.subject, folder });
    toast('Email filed', `Moved to ${folder === 'archive' ? 'Archive' : folder.replace('custom-', '').replace(/-/g, ' ')}.`, { kind:'success' });
    render();
  }
  function moveMenu(e, x, y) {
    const items = [
      { label:'Inbox', icon:'✉', action:() => moveEmail(e, 'inbox') },
      { label:'Archive', icon:'▣', action:() => moveEmail(e, 'archive') },
      { label:'Deleted', icon:'🗑', action:() => moveEmail(e, 'deleted'), danger:true },
      { separator:true },
      ...Store.state.mail.customFolders.map(f => ({ label:f.name, icon:'▤', action:() => moveEmail(e, 'custom-' + f.id) }))
    ];
    OS.contextMenu(x, y, items);
  }
  function emailContext(id, x, y) {
    const e = Store.state.mail.emails.find(x => x.id === id);
    if (!e) return;
    OS.contextMenu(x, y, [
      { label:'Open', icon:'↗', action:() => selectEmail(id) },
      { label:e.read ? 'Mark unread' : 'Mark read', icon:'●', action:() => toggleRead(e) },
      { label:e.flagged ? 'Remove flag' : 'Flag for follow-up', icon:'⚑', action:() => toggleFlag(e) },
      { label:'Snooze…', icon:'⏲', action:() => snoozeEmail(e) },
      { label:'Move to archive', icon:'▣', action:() => archiveEmail(e) },
      { separator:true },
      { label:'Delete', icon:'🗑', action:() => deleteEmail(e), danger:true }
    ]);
  }

  function snoozeEmail(e) {
    const today = dateKey(simNow());
    const tomorrow = dateKey(addDays(simNow(), 1));
    const ref = modal({
      title:'Snooze this email', subtitle:'Snoozing hides the message and brings it back later. It is not a reminder for the sender.',
      size:'narrow',
      body:`<div class="snooze-options">
        <button data-snooze-opt="today-18"><span>🌆</span><span><strong>This evening</strong><small>Today at 6:00 PM</small></span></button>
        <button data-snooze-opt="tomorrow-08"><span>🌅</span><span><strong>Tomorrow morning</strong><small>Tuesday at 8:00 AM</small></span></button>
        <button data-snooze-opt="tomorrow-13"><span>🕐</span><span><strong>Tomorrow afternoon</strong><small>Tuesday at 1:00 PM</small></span></button>
        <button data-snooze-opt="week"><span>📅</span><span><strong>Next Monday</strong><small>November 16 at 8:00 AM</small></span></button>
      </div><div class="help-callout" style="margin-top:12px"><span>💡</span><div>Use snooze for things that are not actionable yet. If someone needs a reply today, do not snooze — reply or schedule a task.</div></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button>`,
      onOpen({ modal: el, close }) {
        const opts = {
          'today-18': `${today}T18:00:00`,
          'tomorrow-08': `${tomorrow}T08:00:00`,
          'tomorrow-13': `${tomorrow}T13:00:00`,
          'week': `${dateKey(addDays(simNow(), 7))}T08:00:00`
        };
        el.querySelectorAll('[data-snooze-opt]').forEach(b => b.onclick = () => {
          const until = opts[b.dataset.snoozeOpt];
          Store.update(s => { const m = s.mail.emails.find(x => x.id === e.id); if (m) m.snoozedUntil = until; });
          Bus.emit('mail:snoozed', { emailId:e.id, subject:e.subject, until });
          close(); instance.selectedId = null; render();
          toast('Email snoozed', `It will return on ${fmtDate(new Date(until), 'medium')}.`, { kind:'success' });
        });
        el.querySelector('[data-cancel]').onclick = close;
      }
    });
  }

  /* ----------------------------- contacts ------------------------------- */
  function renderContacts() {
    const contacts = Store.state.contacts;
    if (!instance.contactId || !contacts.find(c => c.id === instance.contactId)) instance.contactId = 'alexandra';
    const selected = contacts.find(c => c.id === instance.contactId) || contacts[0];
    const groups = [
      { label:'Executive office', type:'executive' },
      { label:'APPELLO teammates', type:'team' },
      { label:'Clients', type:'client' },
      { label:'Vendors & partners', type:'vendor' }
    ];
    return `<div class="contacts-view">
      <aside class="contacts-list">
        <div class="contacts-list-head"><h2>People</h2><p>${contacts.length} people · time zones and working styles</p></div>
        <div class="contacts-groups">
          ${groups.map(g => {
            const people = contacts.filter(c => c.type === g.type).filter(c => !instance.contactSearch || `${c.name} ${c.company} ${c.title}`.toLowerCase().includes(instance.contactSearch.toLowerCase()));
            if (!people.length) return '';
            return `<div class="contact-group"><span class="contact-group-label">${g.label}</span>${people.map(c => `<button class="contact-row ${selected.id === c.id ? 'active' : ''}" data-contact="${c.id}">${Icons.avatar(c.name, 'avatar-md', c.tone)}<span><strong>${esc(c.name)}</strong><small>${esc(c.title)} · ${esc(c.company)}</small></span></button>`).join('')}</div>`;
          }).join('')}
        </div>
      </aside>
      <section class="contact-detail">
        <div class="contact-hero">
          ${Icons.avatar(selected.name, 'avatar-xl', selected.tone)}
          <div class="contact-hero-copy"><span class="eyebrow">${esc(selected.type)}</span><h1>${esc(selected.name)}</h1><p>${esc(selected.title)} · ${esc(selected.company)}</p>
            <div class="contact-hero-actions"><button class="btn primary small" data-contact-email>✉ Send email</button><button class="btn small" data-contact-meeting>▦ Schedule meeting</button></div>
          </div>
          <div class="contact-time"><span class="eyebrow">Local time</span><strong>${esc(getLocalTimeForZone(selected.timezone))}</strong><small>${esc(selected.timezoneLabel)}</small></div>
        </div>
        <div class="contact-detail-grid">
          <div class="contact-info-card">
            <span class="eyebrow">Contact</span>
            <div class="contact-info-row"><span>Email</span><a href="#" data-contact-email-link>${esc(selected.email)}</a></div>
            <div class="contact-info-row"><span>Phone</span><b>${esc(selected.phone)}</b></div>
            <div class="contact-info-row"><span>Working hours</span><b>${esc(selected.work)} · ${esc(selected.timezoneLabel)}</b></div>
            <div class="contact-info-row"><span>Time zone</span><b>${esc(selected.timezone)}</b></div>
          </div>
          <div class="contact-info-card">
            <span class="eyebrow">Communication style</span>
            <p class="contact-style">${esc(selected.style)}</p>
            <div class="help-callout" style="margin-top:9px"><span>🧭</span><div>Match the person’s style, but keep your own standards: clear subject, greeting, and a next step.</div></div>
          </div>
          <div class="contact-info-card span-2">
            <div class="contact-notes-head"><span class="eyebrow">EA notes</span><span class="muted-small">Only you can see these</span></div>
            <textarea class="textarea contact-notes" id="contact-notes" data-tip="Private notes about preferences, time zones, and working style. These are not sent to the person.">${esc(selected.notes || '')}</textarea>
            <div class="contact-notes-foot"><button class="btn small primary" data-save-contact-notes>Save note</button><span class="muted-small" id="contact-note-status">Saved in this browser</span></div>
          </div>
        </div>
      </section>
    </div>`;
  }

  function bindContacts() {
    const root = instance.root;
    root.querySelectorAll('[data-contact]').forEach(b => b.onclick = () => { instance.contactId = b.dataset.contact; render(); });
    const selected = Store.state.contacts.find(c => c.id === instance.contactId) || Store.state.contacts[0];
    root.querySelectorAll('[data-contact-email]').forEach(b => b.onclick = () => openCompose({ mode:'new', to:[selected.email] }));
    root.querySelectorAll('[data-contact-email-link]').forEach(b => b.onclick = e => { e.preventDefault(); openCompose({ mode:'new', to:[selected.email] }); });
    root.querySelectorAll('[data-contact-meeting]').forEach(b => b.onclick = () => CalendarView.openEventModal({ defaultDate:Store.state.calendar.focusDate, context:'mail' }));
    const save = root.querySelector('[data-save-contact-notes]');
    if (save) save.onclick = () => {
      const val = root.querySelector('#contact-notes').value;
      Store.update(s => { const c = s.contacts.find(x => x.id === selected.id); if (c) c.notes = val; });
      Bus.emit('contact:note-saved', { personId:selected.id, name:selected.name });
      toast('Contact note saved', `Your private notes for ${selected.name} are updated.`, { kind:'success', duration:3000 });
      root.querySelector('#contact-note-status').textContent = 'Saved just now';
    };
  }

  /* ----------------------------- compose -------------------------------- */
  function parseEmails(text) {
    return String(text || '').split(/[;,]/).map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/<([^>]+)>/);
      return m ? m[1].trim() : s;
    }).filter(s => /@/.test(s) && !/\s/.test(s) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  }
  function validEmails(text) {
    const raw = String(text || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
    return raw.length > 0 && raw.every(s => /@[^\s@]+\.[^\s@]+/.test(s));
  }
  function signatureFor(mode) { return Store.state.settings.signature || Store.state.mail.signature; }

  function quoted(original) {
    return `\n\n-----Original message-----\nFrom: ${original.from.name} <${original.from.email}>\nSent: ${fmtDate(parseISO(original.date), 'full')} ${fmtTime(original.time)}\nTo: ${original.to.join('; ')}\nSubject: ${original.subject}\n\n${original.body}`;
  }

  function evaluateEtiquette({ subject, body, to, cc, mode, attachments }) {
    const issues = [];
    if (!String(subject || '').trim()) issues.push({ severity:'error', code:'missing-subject', text:'Add a subject line. High-performing EAs make the subject state the topic or decision.' });
    const text = String(body || '').trim();
    const greeting = /^(hi|hello|dear|good morning|good afternoon|good evening|morning|afternoon)\b[\s,]/i.test(text);
    if (!greeting && text) issues.push({ severity:'warn', code:'missing-greeting', text:'Open with a greeting such as “Hi Daniel,” or “Dear Dr. Petrova,”.' });
    const recipients = [...parseEmails(to), ...parseEmails(cc)];
    if (!recipients.length) issues.push({ severity:'error', code:'missing-recipient', text:'Add at least one person in To.' });
    const external = recipients.filter(e => !e.toLowerCase().endsWith('@appello.com'));
    if (mode === 'replyAll' && recipients.length > 6) issues.push({ severity:'warn', code:'reply-all-too-broad', text:`Reply All would reach ${recipients.length} people. Use it only when everyone needs the answer; otherwise reply to the sender.` });
    if (mode === 'replyAll' && external.length > 2) issues.push({ severity:'warn', code:'reply-all-external', text:`This Reply All includes ${external.length} external addresses. Check that no client or vendor sees internal-only information.` });
    if (!/(best|regards|thank|appreciate|sincerely|warmly|cheers)[\s,]/i.test(text.slice(-260)) && text) issues.push({ severity:'info', code:'missing-closing', text:'Add a short closing such as “Best regards,” before your signature.' });
    if (/attached|attachment/i.test(text) && !(attachments && attachments.length)) issues.push({ severity:'warn', code:'missing-attachment', text:'Your message mentions an attachment, but none is attached.' });
    if (subject && subject === subject.toUpperCase() && /[A-Z]{5,}/.test(subject)) issues.push({ severity:'info', code:'all-caps-subject', text:'Avoid an all-caps subject. Use sentence case; it is easier to read and less alarming.' });
    return issues;
  }

  function openCompose(options) {
    const opts = options || {};
    const mode = opts.mode || 'new';
    let original = opts.original || null;
    let draft = opts.draft || null;
    const settings = Store.state.settings;
    let toList = [];
    let ccList = [];
    let bccList = [];
    let subject = '';
    let body = '';
    let attachments = [];
    let scheduledFor = null;
    let forceSend = false;
    let showSchedule = false;
    let showAttachments = false;
    let editingDraftId = draft ? draft.id : null;

    if (draft) {
      toList = draft.to.slice(); ccList = draft.cc.slice(); bccList = draft.bcc.slice();
      subject = draft.subject; body = draft.body; attachments = (draft.attachments || []).slice();
      original = null;
    } else if (mode === 'reply' || mode === 'replyAll' || mode === 'forward') {
      original = opts.original;
      if (mode === 'forward') {
        subject = original.subject.startsWith('Fwd:') ? original.subject : 'Fwd: ' + original.subject;
        body = `\n\n${quoted(original)}`;
      } else {
        toList = [original.from.email];
        if (mode === 'replyAll') {
          const others = [...original.to, ...(original.cc || [])].filter(e => e.toLowerCase() !== myEmail().toLowerCase() && e.toLowerCase() !== original.from.email.toLowerCase());
          ccList = Array.from(new Set(others));
        }
        subject = original.subject.match(/^re:/i) ? original.subject : 'Re: ' + original.subject;
        const first = original.from.name.split(' ')[0];
        body = `Hi ${first},\n\n\n\n${signatureFor('new')}${quoted(original)}`;
      }
    } else {
      if (opts.to) toList = opts.to.slice();
      if (opts.cc) ccList = opts.cc.slice();
      if (opts.subject) subject = opts.subject;
      body = (opts.body ? String(opts.body) + '\n\n' : '\n\n') + signatureFor('new');
    }
    if (!body.includes(signatureFor('new')) && (mode === 'new' || mode === 'draft')) body += `\n\n${signatureFor('new')}`;

    const frequent = ['alexandra','daniel','priya','marcus','isabel','liam'].map(id => Store.contactById(id)).filter(Boolean);

    const bodyHtml = `
      <form id="compose-form" class="compose-form" autocomplete="off">
        <div class="compose-main">
          <div class="compose-recipient-row">
            <span class="compose-label">To</span>
            <input id="compose-to" class="compose-input" value="${esc(toList.join('; '))}" placeholder="Name or email address" aria-label="To recipients" data-tip="Who needs to act or read this? Put the main recipient in To.">
            <button type="button" class="compose-field-toggle" data-toggle-cc data-tip="CC keeps someone informed. BCC hides their address from other recipients.">Cc/Bcc</button>
          </div>
          <div class="compose-recipient-row ${ccList.length ? '' : 'hidden'}" data-cc-row><span class="compose-label">Cc</span><input id="compose-cc" class="compose-input" value="${esc(ccList.join('; '))}" placeholder="Keep someone informed" aria-label="CC recipients" data-tip="Use CC for people who need visibility, not action."></div>
          <div class="compose-recipient-row ${bccList.length ? '' : 'hidden'}" data-bcc-row><span class="compose-label">Bcc</span><input id="compose-bcc" class="compose-input" value="${esc(bccList.join('; '))}" placeholder="Hidden recipients" aria-label="BCC recipients" data-tip="BCC hides the address from other recipients. Use sparingly and transparently."></div>
          <div class="compose-recipient-row"><span class="compose-label">Subject</span><input id="compose-subject" class="compose-input compose-subject" value="${esc(subject)}" placeholder="What is this about?" aria-label="Subject" data-tip="State the topic or decision. “Quick question” is not a useful subject."></div>
          <div class="compose-body-wrap">
            <textarea id="compose-body" class="compose-body" aria-label="Email body" data-tip="Open with a greeting, state the ask or decision, then close with a next step. Keep it scannable.">${esc(body)}</textarea>
          </div>
          <div id="compose-attachments" class="compose-attachments">${attachments.map((a, i) => `<span class="attachment-chip">📎 ${esc(a.name)} <button type="button" data-remove-attach="${i}" aria-label="Remove attachment">✕</button></span>`).join('')}</div>
          <div id="attachment-picker" class="attachment-picker" hidden>
            <div class="attachment-picker-head"><strong>Attach a file</strong><span class="muted-small">Stays in this browser</span></div>
            <div class="attachment-upload">
              <input type="file" id="compose-file-input" multiple aria-label="Upload files from this device" data-tip="Choose files from this device. Files are stored locally in this browser and are never uploaded.">
              <label for="compose-file-input" class="attachment-upload-label"><span>⇧</span><div><strong>Upload from this device</strong><small>Any file type · up to 1.5 MB each</small></div></label>
            </div>
            <div class="attachment-picker-divider"><span>or attach a training file</span></div>
            ${Store.state.files.filter(f => !f.deletedAt && f.type !== 'folder').slice(0, 12).map(f => `<label class="attachment-option"><input type="checkbox" value="${f.id}" ${attachments.some(a => a.fileId === f.id) ? 'checked' : ''}><span>${f.type === 'sheet' ? '▦' : '📄'}</span><span><strong>${esc(f.name)}</strong><small>${f.type === 'sheet' ? 'Workbook' : 'Document'}</small></span></label>`).join('')}
          </div>
          <div id="schedule-panel" class="schedule-panel" hidden>
            <div class="schedule-row"><span class="eyebrow">Schedule send</span><button type="button" class="icon-btn" data-close-schedule aria-label="Close schedule panel">✕</button></div>
            <div class="schedule-options"><button type="button" data-schedule="1h">In 1 hour</button><button type="button" data-schedule="tomorrow">Tomorrow 8:00 AM</button><button type="button" data-schedule="custom">Choose date & time</button></div>
            <div class="schedule-custom" hidden><input type="date" id="schedule-date" class="input sm" value="${dateKey(addDays(simNow(), 1))}"><input type="time" id="schedule-time" class="input sm" value="08:00"><button type="button" class="btn small primary" data-set-custom-schedule>Set</button></div>
            <div id="schedule-status" class="muted-small" style="margin-top:7px">${scheduledFor ? 'Will send at ' + esc(scheduledFor.replace('T', ' ')) : 'The message waits in Scheduled. Due messages send while the workstation is open; if it is closed, they send the next time it opens.'}</div>
          </div>
          <div id="compose-warning" class="compose-warning" hidden></div>
        </div>
        <aside class="compose-side">
          <div class="compose-side-section">
            <div class="etiquette-head"><span>Email etiquette check</span><span id="etiquette-score" class="pill green">Ready</span></div>
            <div id="etiquette-list" class="etiquette-panel"></div>
            <p class="compose-side-hint">The checker is a coach, not a gatekeeper. You can still send after reviewing a warning.</p>
          </div>
          <div class="compose-side-section">
            <span class="eyebrow">Quick add</span>
            <div class="compose-people">${frequent.map(c => `<button type="button" class="compose-person" data-add-person="${c.id}">${Icons.avatar(c.name, 'avatar-sm', c.tone)}<span>${esc(c.name.split(' ')[0])}<small>${esc(c.company)}</small></span><span>+</span></button>`).join('')}</div>
          </div>
          <div class="compose-side-section compose-meta">
            <span class="eyebrow">From</span>
            <p>Elizabeth Hale<br><small>elizabeth.hale@appello.com</small></p>
            <span class="eyebrow" style="margin-top:12px">Tip</span>
            <p class="muted-small">A good executive email leads with the decision, states the deadline, and makes the next action obvious.</p>
          </div>
        </aside>
      </form>`;

    const ref = modal({
      title: mode === 'reply' ? 'Reply' : mode === 'replyAll' ? 'Reply all' : mode === 'forward' ? 'Forward' : draft ? 'Edit draft' : 'New message',
      subtitle: 'Draft a clear, professional message for the training mailbox.',
      size: 'wide',
      body: bodyHtml,
      footer: `<div class="left-actions"><button type="button" class="btn ghost small" data-attach data-tip="Attach a simulated file from the training drive.">📎 Attach</button><button type="button" class="btn ghost small" data-schedule-toggle data-tip="Send this message later instead of immediately.">⏲ Schedule</button><button type="button" class="btn ghost small" data-save-draft data-tip="Save this message in Drafts to finish later.">Save draft</button><button type="button" class="btn ghost small" data-discard data-tip="Discard this message. If it is a draft, it stays in Drafts.">Discard</button></div><button type="button" class="btn" data-cancel-compose>Cancel</button><button type="button" class="btn primary" data-send-email data-tip="Send the message. The etiquette checker reviews subject, greeting, and recipients.">Send</button>`,
      onOpen({ modal: el, close }) {
        const $ = sel => el.querySelector(sel);
        const $$ = sel => Array.from(el.querySelectorAll(sel));
        const toInput = $('#compose-to'), ccInput = $('#compose-cc'), bccInput = $('#compose-bcc');
        const subjectInput = $('#compose-subject'), bodyInput = $('#compose-body');
        const scorePill = $('#etiquette-score'), list = $('#etiquette-list');
        const warning = $('#compose-warning');
        const sendBtn = el.querySelector('[data-send-email]');
        let ccVisible = ccList.length > 0, bccVisible = bccList.length > 0;

        function values() {
          return { subject:subjectInput.value, body:bodyInput.value, to:toInput.value, cc:ccInput.value, mode, attachments };
        }
        function updateEtiquette() {
          const issues = evaluateEtiquette(values());
          const errors = issues.filter(i => i.severity === 'error');
          const warnings = issues.filter(i => i.severity === 'warn');
          if (errors.length) { scorePill.className = 'pill red'; scorePill.textContent = errors.length + ' fix'; }
          else if (warnings.length) { scorePill.className = 'pill amber'; scorePill.textContent = warnings.length + ' check'; }
          else { scorePill.className = 'pill green'; scorePill.textContent = 'Professional'; }
          list.innerHTML = `
            <div class="etiquette-item ${subjectInput.value.trim() ? '' : 'error'}"><span class="e-dot"></span><span><strong>${subjectInput.value.trim() ? 'Clear subject line' : 'Missing subject'}</strong>${subjectInput.value.trim() ? ' — recipients know the topic.' : ' — add a specific topic or decision.'}</span></div>
            <div class="etiquette-item ${issues.some(i => i.code === 'missing-greeting') ? 'warn' : ''}"><span class="e-dot"></span><span><strong>${issues.some(i => i.code === 'missing-greeting') ? 'Add a greeting' : 'Greeting present'}</strong>${issues.some(i => i.code === 'missing-greeting') ? ' — “Hi Daniel,” takes one second and sets the tone.' : ' — the reader is addressed politely.'}</span></div>
            <div class="etiquette-item ${issues.some(i => i.code.startsWith('reply-all')) ? 'warn' : ''}"><span class="e-dot"></span><span><strong>${issues.some(i => i.code.startsWith('reply-all')) ? 'Check Reply All' : 'Recipients look intentional'}</strong>${issues.some(i => i.code.startsWith('reply-all')) ? ' — only use Reply All when everyone needs the answer.' : ' — everyone included has a reason to be there.'}</span></div>
            <div class="etiquette-item ${issues.some(i => i.code === 'missing-attachment') ? 'error' : ''}"><span class="e-dot"></span><span><strong>${issues.some(i => i.code === 'missing-attachment') ? 'Mentioned attachment missing' : 'Attachment check'}</strong>${issues.some(i => i.code === 'missing-attachment') ? ' — attach the file before sending.' : ' — what you mention matches what is attached.'}</span></div>
            ${issues.filter(i => !['missing-subject','missing-greeting','missing-attachment'].includes(i.code) && !i.code.startsWith('reply-all')).map(i => `<div class="etiquette-item ${i.severity === 'warn' ? 'warn' : ''}"><span class="e-dot"></span><span>${esc(i.text)}</span></div>`).join('')}`;
          sendBtn.textContent = scheduledFor ? 'Schedule send' : 'Send';
          return { issues, errors, warnings };
        }

        function addPerson(id) {
          const c = Store.contactById(id);
          if (!c) return;
          const current = parseEmails(toInput.value);
          if (!current.includes(c.email)) { toInput.value = [...current, c.email].join('; '); toast('Added', `${c.name} is now a recipient. If they only need visibility, use CC instead.`, { duration:3000 }); }
          updateEtiquette();
        }

        $$('[data-add-person]').forEach(b => b.onclick = () => addPerson(b.dataset.addPerson));
        toInput.oninput = updateEtiquette;
        ccInput.oninput = updateEtiquette;
        subjectInput.oninput = updateEtiquette;
        bodyInput.oninput = updateEtiquette;

        $$('[data-toggle-cc]').forEach(b => b.onclick = () => {
          const ccRow = $('[data-cc-row]'), bccRow = $('[data-bcc-row]');
          if (!ccVisible) { ccVisible = true; ccRow.classList.remove('hidden'); }
          else if (!bccVisible) { bccVisible = true; bccRow.classList.remove('hidden'); }
          else { ccVisible = false; bccVisible = false; ccRow.classList.add('hidden'); bccRow.classList.add('hidden'); }
        });

        $$('[data-attach]').forEach(b => b.onclick = () => {
          showAttachments = !showAttachments;
          $('#attachment-picker').hidden = !showAttachments;
          if (showAttachments) setTimeout(() => { const up = $('#compose-file-input'); if (up) up.focus(); }, 50);
        });
        const fileInput = $('#compose-file-input');
        if (fileInput) fileInput.onchange = () => {
          const picked = Array.from(fileInput.files || []);
          if (!picked.length) return;
          const max = 1.5 * 1024 * 1024;
          let active = 0;
          picked.forEach(file => {
            const existingBytes = attachments.reduce((n, a) => n + (a.sizeBytes || 0), 0);
            if (existingBytes + file.size > 3 * 1024 * 1024) { toast('Attachment storage limit', 'This local training mailbox keeps attachments under 3 MB per message. Remove a file or choose a smaller one.', { kind:'error', duration:5200 }); return; }
            if (file.size > max) { toast('File is too large', `${file.name} is ${formatBytes(file.size)}. This training browser stores attachments locally, so the limit is 1.5 MB.`, { kind:'error', duration:5200 }); return; }
            active++;
            const reader = new FileReader();
            reader.onload = () => {
              attachments.push({ name:file.name, size:formatBytes(file.size), sizeBytes:file.size, mime:file.type || 'application/octet-stream', kind:'file', dataUrl:String(reader.result) });
              renderAttachmentChips(); updateEtiquette();
              if (--active === 0) fileInput.value = '';
              Bus.emit('mail:attachment-added', { name:file.name, size:file.size, type:file.type || 'application/octet-stream' });
            };
            reader.onerror = () => { active--; toast('Could not read file', `${file.name} could not be attached in this browser.`, { kind:'error' }); };
            reader.readAsDataURL(file);
          });
          renderAttachmentChips();
        };
        $$('[data-schedule-toggle]').forEach(b => b.onclick = () => {
          showSchedule = !showSchedule;
          $('#schedule-panel').hidden = !showSchedule;
        });
        $$('.attachment-option input').forEach(cb => cb.onchange = () => {
          const f = Store.fileById(cb.value);
          if (!f) return;
          if (cb.checked) attachments.push({ name:f.name, kind:f.type === 'sheet' ? 'sheet' : 'doc', size:'Simulated', fileId:f.id });
          else attachments = attachments.filter(a => a.fileId !== f.id);
          renderAttachmentChips();
          updateEtiquette();
        });

        function renderAttachmentChips() {
          $('#compose-attachments').innerHTML = attachments.map((a, i) => `<span class="attachment-chip">📎 ${esc(a.name)} <button type="button" data-remove-attach="${i}" aria-label="Remove attachment">✕</button></span>`).join('');
          $$('[data-remove-attach]').forEach(b => b.onclick = () => { attachments.splice(Number(b.dataset.removeAttach), 1); renderAttachmentChips(); updateEtiquette(); });
        }
        renderAttachmentChips();

        $$('[data-save-draft]').forEach(b => b.onclick = () => saveDraft(true));
        $$('[data-discard]').forEach(b => b.onclick = async () => {
          const ok = await confirm({ title:'Discard this message?', message:'Any unsent changes will be lost. If you want to finish it later, choose Save draft instead.', okText:'Discard', danger:true });
          if (ok) close();
        });
        $$('[data-cancel-compose]').forEach(b => b.onclick = () => close());
        $('[data-close-schedule]').onclick = () => { showSchedule = false; $('#schedule-panel').hidden = true; };

        $$('[data-schedule]').forEach(b => b.onclick = () => {
          const kind = b.dataset.schedule;
          if (kind === '1h') {
            const t = simNow(); t.setHours(t.getHours() + 1);
            scheduledFor = `${dateKey(t)}T${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:00`;
          } else if (kind === 'tomorrow') {
            scheduledFor = `${dateKey(addDays(simNow(), 1))}T08:00:00`;
          } else {
            $('.schedule-custom').hidden = false;
            return;
          }
          $('#schedule-status').innerHTML = `Will send <strong>${esc(fmtDate(new Date(scheduledFor), 'medium'))} at ${esc(fmtTime(scheduledFor.slice(11,16)))}</strong>. The message waits in Scheduled.`;
          updateEtiquette();
        });
        $('[data-set-custom-schedule]').onclick = () => {
          const d = $('#schedule-date').value, t = $('#schedule-time').value;
          if (!d || !t) { toast('Choose a date and time', 'Scheduled send needs both.', { kind:'error' }); return; }
          scheduledFor = `${d}T${t}:00`;
          $('#schedule-status').innerHTML = `Will send <strong>${esc(fmtDate(parseISO(d), 'medium'))} at ${esc(fmtTime(t))}</strong>.`;
          updateEtiquette();
        };

        function saveDraft(closeAfter) {
          const draftObj = {
            id: editingDraftId || Utils.uid('draft'),
            folder:'drafts', from:{ name:Store.state.profile.name, email:Store.state.profile.email },
            to:parseEmails(toInput.value), cc:parseEmails(ccInput.value), bcc:parseEmails(bccInput.value),
            subject:subjectInput.value, body:bodyInput.value, date:dateKey(simNow()), time:Utils.nowTime(),
            at:Utils.simNowIso(), read:true, flagged:false, attachments, labels:['Draft'], threadId:editingDraftId || Utils.uid('thread')
          };
          Store.update(s => {
            const existing = s.mail.emails.find(e => e.id === editingDraftId);
            if (existing) Object.assign(existing, draftObj);
            else s.mail.emails.push(draftObj);
            s.mail.selectedId = draftObj.id;
          });
          editingDraftId = draftObj.id;
          Bus.emit('mail:draft-saved', { emailId:draftObj.id, subject:draftObj.subject, recipientCount:draftObj.to.length });
          if (closeAfter) close();
          toast('Draft saved', 'You can finish it from the Drafts folder.', { kind:'success' });
          instance.folder = 'drafts'; instance.view = 'mail'; instance.selectedId = draftObj.id; render();
        }

        function send(force) {
          const v = values();
          const checkedIssues = evaluateEtiquette(v);
          const errors = checkedIssues.filter(i => i.severity === 'error');
          const warnings = checkedIssues.filter(i => i.severity === 'warn');
          if (!validEmails(v.to) && parseEmails(v.to).length === 0) {
            warning.hidden = false;
            warning.className = 'compose-warning error';
            warning.innerHTML = `<strong>Add at least one recipient</strong><p>An email needs someone in the To field. Use a full address such as name@company.com.</p>`;
            toInput.focus(); return;
          }
          if (errors.length) {
            warning.hidden = false;
            warning.className = 'compose-warning error';
            warning.innerHTML = `<strong>Fix ${errors.length === 1 ? 'one item' : errors.length + ' items'} before sending</strong><ul>${errors.map(i => `<li>${esc(i.text)}</li>`).join('')}</ul>`;
            warning.scrollIntoView({ block:'nearest', behavior:'smooth' });
            if (errors.some(i => i.code === 'missing-subject')) subjectInput.focus();
            Bus.emit('training:mistake', { code:errors[0].code, message:errors.map(i=>i.text).join(' '), standard:'A professional email has a clear subject, a greeting, a named recipient, and an obvious next step.' });
            return;
          }
          if (warnings.length && !force && !forceSend) {
            forceSend = true;
            warning.hidden = false;
            warning.className = 'compose-warning warn';
            warning.innerHTML = `<strong>One professional check before you send</strong><ul>${warnings.map(i => `<li>${esc(i.text)}</li>`).join('')}</ul><p>You can fix these, or click <strong>Send</strong> again to send anyway. The coach will record the learning point.</p>`;
            warning.scrollIntoView({ block:'nearest', behavior:'smooth' });
            return;
          }
          if (warnings.length) {
            warnings.forEach(i => Bus.emit('training:mistake', { code:i.code, message:i.text, standard:'Use a greeting, keep Reply All intentional, and check attachments before sending.' }));
          }
          const to = parseEmails(v.to), cc = parseEmails(ccInput.value), bcc = parseEmails(bccInput.value);
          const sent = {
            id: Utils.uid('msg'), folder: scheduledFor ? 'scheduled' : 'sent',
            from:{ name:Store.state.profile.name, email:Store.state.profile.email },
            to, cc, bcc,
            subject: v.subject.trim(), body: v.body,
            date: dateKey(simNow()), time: Utils.nowTime(), at: Utils.simNowIso(),
            read:true, flagged:false, attachments, labels: scheduledFor ? ['Scheduled'] : [],
            threadId: original ? original.threadId : Utils.uid('thread'),
            scheduledFor: scheduledFor || null,
            replyTo: original ? original.id : null
          };
          Store.update(s => {
            s.mail.emails.push(sent);
            if (original) { const o = s.mail.emails.find(x => x.id === original.id); if (o) o.read = true; }
            if (editingDraftId) s.mail.emails = s.mail.emails.filter(e => e.id !== editingDraftId);
          });
          const detail = {
            emailId:sent.id, to, cc, subject:sent.subject, body:true, mode,
            recipientCount:to.length + cc.length + bcc.length,
            hasGreeting: /^(hi|hello|dear|good morning|good afternoon)\b[\s,]/i.test(v.body.trim()),
            hasSubject: !!v.subject.trim(), attachments:attachments.length, scheduled:!!scheduledFor
          };
          Bus.emit('mail:sent', detail);
          if (mode === 'reply' || mode === 'replyAll') Bus.emit('mail:replied', detail);
          close();
          if (scheduledFor) {
            instance.folder = 'scheduled'; instance.view = 'mail';
            toast('Send scheduled', `This message will wait in Scheduled until ${fmtDate(new Date(scheduledFor), 'medium')} at ${fmtTime(scheduledFor.slice(11,16))}.`, { kind:'success', duration:6000 });
          } else {
            toast('Message sent', `“${sent.subject}” is saved in Sent.`, {
              kind:'success', duration:5200,
              onClick: () => { instance.folder = 'sent'; instance.view = 'mail'; instance.selectedId = sent.id; render(); }
            });
          }
          render();
        }

        sendBtn.onclick = () => send(false);
        updateEtiquette();
        setTimeout(() => {
          if (mode === 'new' && !subjectInput.value) subjectInput.focus();
          else if (mode === 'new') bodyInput.focus();
        }, 70);
      }
    });
    return ref;
  }

  /* -------------------------- mailbox settings -------------------------- */
  function openSettings() {
    const s = Store.state.settings;
    modal({
      title:'Mailbox settings',
      subtitle:'Signature, out-of-office, and the standards for the executive mailbox. Changes save to this browser.',
      size:'wide',
      body:`<div class="settings-tabs tabs"><button class="active" data-settings-tab="signature">Signature</button><button data-settings-tab="ooo">Out of office</button><button data-settings-tab="standards">Email standards</button></div>
        <div class="settings-pane" data-pane="signature">
          <div class="field"><label for="sig-full">Full signature (client-facing)</label><textarea id="sig-full" class="textarea" style="min-height:110px" data-tip="Use the full signature for clients and external email. Include your role and the executive office line.">${esc(s.signature)}</textarea><span class="field-hint">This is added to new messages. Keep it short enough to scan.</span></div>
          <div class="field" style="margin-top:13px"><label for="sig-short">Short signature (internal one-liners)</label><textarea id="sig-short" class="textarea" style="min-height:64px" data-tip="A shorter signature is appropriate for quick internal notes.">${esc(s.signatureShort)}</textarea></div>
        </div>
        <div class="settings-pane" data-pane="ooo" hidden>
          <label class="checkbox-row" style="font-size:12.5px"><input type="checkbox" id="ooo-enabled" ${s.outOfOffice.enabled ? 'checked' : ''} data-tip="Turns on an automatic reply while you are away. Set it before you travel, not after."><span><strong>Turn on automatic out-of-office replies</strong><small class="field-hint">Tell people when you are away and who is covering urgent matters.</small></span></label>
          <div class="form-grid" style="margin-top:14px"><div class="field"><label for="ooo-start">First day away</label><input id="ooo-start" class="input" type="date" value="${esc(s.outOfOffice.start)}"></div><div class="field"><label for="ooo-end">Return day</label><input id="ooo-end" class="input" type="date" value="${esc(s.outOfOffice.end)}"></div></div>
          <div class="field" style="margin-top:13px"><label for="ooo-message">Automatic reply message</label><textarea id="ooo-message" class="textarea" style="min-height:120px" data-tip="Name the person covering urgent matters and how to reach them. Do not leave people without a next step.">${esc(s.outOfOffice.message)}</textarea></div>
          <div class="help-callout" style="margin-top:11px"><span>✈</span><div>Alexandra travels Nov 16–21. A good OOO names Daniel Kim as the urgent contact and sets expectations for response time.</div></div>
        </div>
        <div class="settings-pane" data-pane="standards" hidden>
          <div class="settings-standard-grid">
            <div class="help-card"><strong>Subject line</strong><p>State the topic or decision. Include the deadline if there is one.</p></div>
            <div class="help-card"><strong>Greeting</strong><p>“Hi Daniel,” for colleagues; “Dear Dr. Petrova,” for formal external contacts.</p></div>
            <div class="help-card"><strong>Reply All</strong><p>Only when every recipient needs the answer. Check for external addresses before sending.</p></div>
            <div class="help-card"><strong>Next step</strong><p>Close with who does what by when. “Let me know” is weaker than “Please confirm by Tuesday 12:00.”</p></div>
            <div class="help-card"><strong>Attachments</strong><p>If you mention an attachment, attach it. If it is confidential, check the recipient list twice.</p></div>
            <div class="help-card"><strong>Out of office</strong><p>Set it at least 24 hours before travel. Include a named cover contact.</p></div>
          </div>
        </div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-save-settings>Save settings</button>`,
      onOpen({ modal: el, close }) {
        const $$ = s => Array.from(el.querySelectorAll(s));
        $$('[data-settings-tab]').forEach(b => b.onclick = () => {
          $$('[data-settings-tab]').forEach(x => x.classList.toggle('active', x === b));
          $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.settingsTab);
        });
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-save-settings]').onclick = () => {
          const enabled = el.querySelector('#ooo-enabled').checked;
          Store.update(state => {
            state.settings.signature = el.querySelector('#sig-full').value;
            state.settings.signatureShort = el.querySelector('#sig-short').value;
            state.mail.signature = state.settings.signature;
            state.settings.outOfOffice = {
              enabled,
              start: el.querySelector('#ooo-start').value,
              end: el.querySelector('#ooo-end').value,
              message: el.querySelector('#ooo-message').value
            };
          });
          Bus.emit('mail:settings-saved', { outOfOffice:enabled });
          close(); toast('Mailbox settings saved', enabled ? 'Out-of-office is now on.' : 'Signature and preferences updated.', { kind:'success' });
        };
      }
    });
  }

  function openRules() {
    const s = Store.state.mail;
    modal({
      title:'Rules & folders',
      subtitle:'Custom folders sort mail into buckets that match your work. A rule is a simple automatic instruction.',
      size:'wide',
      body:`<div class="rules-layout">
        <div class="rules-left">
          <span class="eyebrow">New custom folder</span>
          <div class="field" style="margin-top:8px"><label for="rule-folder-name">Folder name</label><input id="rule-folder-name" class="input" placeholder="e.g. Vendor invoices" data-tip="Choose a short, specific name you will recognise later."></div>
          <div class="field"><label for="rule-contains">Move mail when the sender contains</label><input id="rule-contains" class="input" placeholder="e.g. invoice or a vendor name" data-tip="This is a simple contains rule. Start broad, then refine if it catches too much."></div>
          <label class="checkbox-row" style="margin-top:8px"><input type="checkbox" id="rule-existing" checked><span>Also move matching messages already in the inbox</span></label>
          <button class="btn primary" style="margin-top:12px" data-create-rule>Create folder & rule</button>
          <div class="help-callout" style="margin-top:14px"><span>💡</span><div>A folder without a rule still works: you can move messages into it yourself. A rule simply saves repetitive work.</div></div>
        </div>
        <div class="rules-right">
          <span class="eyebrow">Current folders</span>
          <div class="rules-list">
            ${s.customFolders.length ? s.customFolders.map(f => `<div class="rule-row"><span class="rule-color" style="background:${f.color}"></span><div><strong>${esc(f.name)}</strong><small>${s.emails.filter(e => e.folder === 'custom-' + f.id).length} messages${f.rule ? ` · rule: sender contains “${esc(f.rule.contains)}”` : ''}</small></div><button class="icon-btn" data-delete-folder="${f.id}" aria-label="Delete folder" data-tip="Delete this custom folder. Messages return to the Inbox.">✕</button></div>`).join('') : '<p class="muted-small">No custom folders yet.</p>'}
          </div>
          <span class="eyebrow" style="display:block;margin-top:18px">Built-in folders</span>
          <p class="muted-small" style="margin-top:5px;line-height:1.6">Inbox · Flagged · Sent · Drafts · Archive · Deleted · Scheduled</p>
        </div>
      </div>`,
      footer:`<button class="btn" data-close-rules>Close</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close-rules]').onclick = close;
        el.querySelector('[data-create-rule]').onclick = () => {
          const name = el.querySelector('#rule-folder-name').value.trim();
          const contains = el.querySelector('#rule-contains').value.trim();
          const applyExisting = el.querySelector('#rule-existing').checked;
          if (!name) { toast('Name the folder', 'A folder needs a short, recognisable name.', { kind:'error' }); return; }
          const id = Utils.uid('folder').replace(/^folder-/, '');
          const folderId = 'custom-' + id;
          Store.update(state => {
            state.mail.customFolders.push({ id, name, color:'#2f7fd3', rule:contains ? { field:'from', contains, moveTo:id } : null });
            if (contains) {
              state.mail.rules.push({ id:Utils.uid('rule'), name, fromContains:contains, moveTo:id, enabled:true });
              if (applyExisting) {
                state.mail.emails.forEach(e => {
                  if (e.folder === 'inbox' && (`${e.from.name} ${e.from.email} ${e.subject}`).toLowerCase().includes(contains.toLowerCase())) e.folder = folderId;
                });
              }
            }
          });
          Bus.emit('mail:folder-created', { name, rule:contains || null, applyExisting });
          close();
          instance.folder = folderId; instance.view = 'mail'; instance.selectedId = null; render();
          toast('Custom folder created', contains ? `Matching messages will be filed automatically.` : `${name} is ready.`, { kind:'success' });
        };
        el.querySelectorAll('[data-delete-folder]').forEach(b => b.onclick = () => {
          const id = b.dataset.deleteFolder;
          Store.update(state => {
            state.mail.emails.forEach(e => { if (e.folder === 'custom-' + id) e.folder = 'inbox'; });
            state.mail.customFolders = state.mail.customFolders.filter(f => f.id !== id);
            state.mail.rules = state.mail.rules.filter(r => r.moveTo !== id);
          });
          close(); instance.folder = 'inbox'; render();
          toast('Custom folder removed', 'Messages were returned to the Inbox.', { kind:'success' });
        });
      }
    });
  }

  /* ------------------------------- app ---------------------------------- */
  const app = {
    mount(container, win, params) {
      instance = {
        root: document.createElement('div'), win,
        view:'mail', folder:'inbox', filter:'all', sort:'newest', search:'', selectedId:null,
        contactId:'alexandra', contactSearch:'', calendarController:null
      };
      instance.root.className = 'mail-root app-fill';
      container.innerHTML = '';
      container.appendChild(instance.root);
      if (params) this.reopen(params);
      else render();
    },
    reopen(params) {
      if (!instance) return;
      if (params && params.view) instance.view = params.view;
      if (params && params.folder) instance.folder = params.folder;
      if (params && params.emailId) { instance.folder = 'inbox'; instance.view = 'mail'; instance.selectedId = params.emailId; }
      if (params && params.contactId) { instance.view = 'contacts'; instance.contactId = params.contactId; }
      if (params && params.compose) {
        render();
        setTimeout(() => openCompose({ mode:'new' }), 120);
        return;
      }
      if (!params || !params.view) instance.view = 'mail';
      render();
    },
    destroy() { if (instance && instance.calendarController) instance.calendarController.destroy(); instance = null; }
  };
  App.register('mail', app);

  // Expose a tiny API for training/other apps.
  window.MailApp = {
    openCompose: (opts) => { if (!OS.isOpen('mail')) OS.openApp('mail'); setTimeout(() => openCompose(opts || { mode:'new' }), 120); },
    openRules: () => { if (!OS.isOpen('mail')) OS.openApp('mail'); setTimeout(openRules, 100); },
    openSettings: () => { if (!OS.isOpen('mail')) OS.openApp('mail'); setTimeout(openSettings, 100); }
  };
})();
