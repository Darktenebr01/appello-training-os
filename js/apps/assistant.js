/* APPELLO Assist — a lightweight assistant built into this training workspace.
   It reads the training state and responds with summaries and local actions. */
(function () {
  'use strict';
  const { esc, fmtDate, fmtTime, parseISO, simNow, toast, uid } = Utils;
  let instance = null;

  const SUGGESTIONS = [
    { icon:'▤', label:'Summarize my inbox', prompt:'Summarize my inbox' },
    { icon:'◷', label:'Plan my day', prompt:'Plan my day' },
    { icon:'✉', label:'Draft a reply', prompt:'Draft a reply to my latest email' },
    { icon:'☑', label:'What is due?', prompt:'What should I prioritize today?' },
    { icon:'⌕', label:'Find the board pack', prompt:'Find the board pack' },
    { icon:'▦', label:'Open my calendar', prompt:'Open my calendar' }
  ];

  function appNameFor(id) {
    const app = Data.appCatalog.find(a => a.id === id);
    return app ? app.name : 'desktop';
  }
  function contextLabel() {
    const win = OS.activeWindow;
    if (!win) return 'Desktop';
    let extra = '';
    if (win.id === 'mail' && window.MailApp) extra = ' · Inbox';
    if (win.id === 'files' || win.id === 'drive') extra = ' · Files';
    return appNameFor(win.id) + extra;
  }
  function greeting() {
    const hour = simNow().getHours();
    return hour < 12 ? 'Good morning, Elizabeth.' : hour < 18 ? 'Good afternoon, Elizabeth.' : 'Good evening, Elizabeth.';
  }
  function openMailInbox() { const emails = Store.state.mail.emails.filter(e => e.folder === 'inbox'); return emails.slice().sort((a,b) => String(b.at).localeCompare(String(a.at))); }
  function todayEvents() {
    const date = Store.state.company.simulationDate;
    return Store.state.calendar.events.filter(e => e.date === date).sort((a,b) => a.start.localeCompare(b.start));
  }
  function openTasks() { return (Store.state.todos || []).filter(t => !t.completed); }
  function firstName(name) { return String(name || '').split(/\s+/)[0]; }

  function summarizeInbox() {
    const inbox = openMailInbox();
    const unread = inbox.filter(e => !e.read);
    const flagged = inbox.filter(e => e.flagged);
    const latest = inbox.slice(0, 4);
    return {
      text: `${greeting()} Your inbox has **${inbox.length} messages**, **${unread.length} unread**, and **${flagged.length} flagged**. Here are the latest items worth a look:`,
      html: `<div class="assist-list">${latest.map(e => `<button class="assist-item" data-assist-mail="${esc(e.id)}"><span class="assist-item-dot ${e.read ? '' : 'unread'}"></span><span><strong>${esc(e.subject || '(no subject)')}</strong><small>${esc(e.from.name)} · ${esc(fmtDate(parseISO(e.date), 'medium'))} ${esc(fmtTime(e.time))}</small></span></button>`).join('')}</div><div class="assist-actions"><button class="assist-action" data-assist-action="open-mail">Open Inbox</button><button class="assist-action" data-assist-action="draft-reply">Draft a reply</button></div>`
    };
  }
  function planDay() {
    const events = todayEvents();
    const tasks = openTasks().sort((a,b) => String(a.due || '9999').localeCompare(String(b.due || '9999')));
    const topTasks = tasks.slice(0, 4);
    return {
      text: `${greeting()} Here is your APPELLO day at a glance: **${events.length} calendar items** and **${tasks.length} open tasks**.`,
      html: `<div class="assist-section"><span class="assist-eyebrow">Today · ${esc(fmtDate(Store.state.company.simulationDate, 'long'))}</span>${events.length ? events.map(e => `<div class="assist-line"><span class="assist-time">${esc(fmtTime(e.start))}</span><span>${esc(e.title)}</span></div>`).join('') : '<p class="assist-muted">No calendar events today.</p>'}</div><div class="assist-section"><span class="assist-eyebrow">Priority tasks</span>${topTasks.length ? topTasks.map(t => `<div class="assist-line"><span class="assist-dot ${esc(t.priority || 'medium')}"></span><span>${esc(t.title)}${t.due ? `<small>Due ${esc(fmtDate(parseISO(t.due), 'medium'))}</small>` : ''}</span></div>`).join('') : '<p class="assist-muted">No open tasks.</p>'}</div><div class="assist-actions"><button class="assist-action" data-assist-action="open-calendar">Open calendar</button><button class="assist-action" data-assist-action="open-todo">Open Tasks</button></div>`
    };
  }
  function draftReply() {
    const inbox = openMailInbox();
    const latest = inbox[0];
    if (!latest) return { text:'There are no inbox messages to reply to.' };
    const draft = `Hi ${firstName(latest.from.name)},\n\nThank you for your note. I’m reviewing this now and will come back to you with a clear next step today.\n\nBest regards,\nElizabeth Hale\nExecutive Assistant to the CEO\nAPPELLO`;
    return {
      text: `I found the latest message from **${latest.from.name}** about “${latest.subject}”. Here is a short, professional reply you can edit and send:`,
      html: `<div class="assist-draft">${esc(draft).replace(/\n/g, '<br>')}</div><div class="assist-actions"><button class="assist-action primary" data-assist-action="open-draft" data-assist-mail-id="${esc(latest.id)}">Open in Mail</button><button class="assist-action" data-assist-action="copy-draft" data-draft="${esc(draft)}">Copy text</button></div>`
    };
  }
  function priorities() {
    const tasks = openTasks();
    const high = tasks.filter(t => t.priority === 'high');
    const due = tasks.filter(t => t.due && t.due <= Store.state.company.simulationDate);
    return {
      text: `You have **${high.length} high-priority tasks** and **${due.length} items due today or overdue**. My recommendation: protect the first 45 minutes for the highest-risk item, then clear the quick replies.`,
      html: `<div class="assist-list">${tasks.slice(0, 5).map(t => `<button class="assist-item" data-assist-action="open-todo"><span class="assist-dot ${esc(t.priority || 'medium')}"></span><span><strong>${esc(t.title)}</strong><small>${esc(t.due ? 'Due ' + fmtDate(parseISO(t.due), 'medium') : 'No due date')} · ${esc(t.priority || 'medium')} priority</small></span></button>`).join('')}</div><div class="assist-actions"><button class="assist-action" data-assist-action="open-todo">Open Tasks</button></div>`
    };
  }
  function findFiles(query) {
    const q = String(query || '').replace(/^find\s+/i, '').trim().toLowerCase();
    const files = Store.state.files.filter(f => !f.deletedAt && f.name.toLowerCase().includes(q || 'board'));
    if (!files.length) return { text:`I couldn’t find a file matching **${q}**. Try a shorter name, or search from the Files app.` };
    return {
      text: `I found **${files.length} file${files.length === 1 ? '' : 's'}** matching “${q || 'board'}”:`,
      html: `<div class="assist-list">${files.slice(0, 6).map(f => `<button class="assist-item" data-assist-file="${esc(f.id)}"><span class="assist-file-icon">${f.type === 'sheet' ? '▦' : f.type === 'folder' ? '▤' : '📄'}</span><span><strong>${esc(f.name)}</strong><small>${esc(f.type)} · updated ${esc(fmtDate(f.updatedAt || f.createdAt, 'medium'))}</small></span></button>`).join('')}</div><div class="assist-actions"><button class="assist-action" data-assist-action="open-files">Open Files</button></div>`
    };
  }
  function openSomething(text) {
    const t = text.toLowerCase();
    const pairs = [
      ['mail', /mail|inbox|outlook|email app/], ['teams', /teams|chat/], ['calendar', /calendar/],
      ['files', /files|explorer/], ['drive', /drive|onedrive|cloud/], ['sheets', /sheets|excel|spreadsheet/],
      ['docs', /docs|word|document/], ['todo', /to do|tasks/], ['training', /training|academy|learn/],
      ['settings', /settings/], ['clock', /clock|time zone/], ['calculator', /calculator/]
    ];
    const found = pairs.find(([id, re]) => re.test(t));
    if (!found) return false;
    if (found[0] === 'calendar') { OS.openApp('mail', { view:'calendar' }); return true; }
    OS.openApp(found[0]); return true;
  }
  function scheduleMeeting() {
    setTimeout(() => { if (window.CalendarView && CalendarView.openEventModal) CalendarView.openEventModal({ defaultDate:Store.state.company.simulationDate, defaultStart:'10:00', context:'mail' }); }, 250);
    return { text:'Opening a new Calendar event for **today**. Add the title, attendees, and time. I’ll keep the training calendar open behind it.' };
  }
  function addTask(text) {
    const title = String(text).replace(/^(add|create)\s+(a\s+)?task\s*/i, '').replace(/^remind me to\s*/i, '').trim() || 'Follow up';
    Store.update(s => { s.todos.unshift({ id:uid('task'), title, priority:'medium', due:Store.state.company.simulationDate, category:'Assist', completed:false, myDay:false, notes:'Added by APPELLO Assist.', createdAt:simNow().toISOString() }); });
    Store.saveNow();
    return { text:`Added **${title}** to Tasks for today. You can open it to set a different priority or due date.`, html:`<div class="assist-actions"><button class="assist-action" data-assist-action="open-todo">Open Tasks</button></div>` };
  }
  function respond(text) {
    const q = text.trim();
    const lower = q.toLowerCase();
    if (!q) return { text:'Ask me to summarize, plan, draft, find, or open something in the training desktop.' };
    if (/^(hi|hello|hey|good morning|good afternoon)\b/.test(lower)) return { text:`${greeting()} I’m your local APPELLO assistant. I can read the training inbox, calendar, tasks, files, and training progress — but nothing leaves this browser. What would you like to do?` };
    if (/summar|inbox|unread|email/.test(lower) && !/draft|write|reply/.test(lower)) return summarizeInbox();
    if (/plan (my )?day|schedule my day|what.*today|agenda/.test(lower)) return planDay();
    if (/draft|write.*reply|reply.*email|respond to/.test(lower)) return draftReply();
    if (/priorit|what should i do|focus|urgent|due/.test(lower)) return priorities();
    if (/find|search|locate|where.*file/.test(lower)) return findFiles(q);
    if (/new meeting|schedule.*meeting|create.*meeting|book.*room/.test(lower)) return scheduleMeeting();
    if (/add.*task|remind me/.test(lower)) return addTask(q);
    if (/open|launch|go to|show me/.test(lower)) {
      if (openSomething(lower)) return { text:`Opening **${contextLabel().replace(' · Inbox','')}** for you.` };
    }
    if (/training|scenario|practice/.test(lower)) {
      const progress = Store.state.training.progress || {};
      const complete = Object.values(progress).filter(p => p.completed).length;
      return { text:`You have completed **${complete} of ${window.Training ? 21 : 21} training scenarios**. Keep going from the Training Hub — the next scenario is chosen for you.`, html:`<div class="assist-actions"><button class="assist-action" data-assist-action="open-training">Open Training Hub</button></div>` };
    }
    if (/calendar/.test(lower)) return { text:`Opening your calendar. Today has **${todayEvents().length} events**, including the CEO desk review at 09:30.`, html:`<div class="assist-actions"><button class="assist-action" data-assist-action="open-calendar">Open calendar</button></div>` };
    return {
      text: `I can help with the training workstation. Try one of these:`,
      html: `<div class="assist-suggestions-inline">${SUGGESTIONS.slice(0, 4).map(s => `<button class="assist-action" data-assist-prompt="${esc(s.prompt)}">${s.icon} ${esc(s.label)}</button>`).join('')}</div><p class="assist-muted">APPELLO Assist works from the data in this training workspace.</p>`
    };
  }

  function addMessage(role, content) {
    const list = instance.root.querySelector('#assist-messages');
    if (!list) return;
    const el = document.createElement('div');
    el.className = `assist-msg ${role}`;
    el.innerHTML = role === 'user' ? `<div class="assist-bubble">${esc(content)}</div>` : `<div class="assist-orb">✦</div><div class="assist-bubble">${content.text ? `<p>${formatText(content.text)}</p>` : ''}${content.html || ''}</div>`;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    bindActions(el);
  }
  function formatText(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
  function ask(text) {
    if (!text.trim()) return;
    const list = instance.root.querySelector('#assist-messages');
    if (list && list.querySelector('.assist-welcome')) list.querySelector('.assist-welcome').remove();
    addMessage('user', text);
    instance.input.value = '';
    const thinking = document.createElement('div');
    thinking.className = 'assist-msg assistant thinking';
    thinking.innerHTML = `<div class="assist-orb">✦</div><div class="assist-bubble"><span class="assist-typing"><i></i><i></i><i></i></span></div>`;
    list.appendChild(thinking); list.scrollTop = list.scrollHeight;
    setTimeout(() => {
      thinking.remove();
      addMessage('assistant', respond(text));
    }, 420 + Math.min(500, text.length * 8));
  }
  function bindActions(scope) {
    scope.querySelectorAll('[data-assist-action]').forEach(b => b.onclick = () => {
      const action = b.dataset.assistAction;
      if (action === 'open-mail') OS.openApp('mail', { folder:'inbox' });
      else if (action === 'open-calendar') OS.openApp('mail', { view:'calendar' });
      else if (action === 'open-todo') OS.openApp('todo');
      else if (action === 'open-files') OS.openApp('files');
      else if (action === 'open-training') OS.openApp('training');
      else if (action === 'open-draft') {
        const email = Store.state.mail.emails.find(e => e.id === b.dataset.assistMailId);
        if (email && window.MailApp) MailApp.openCompose({ mode:'reply', original:email });
      } else if (action === 'copy-draft') {
        Utils.copyText(b.dataset.draft || '').then(() => toast('Copied', 'The draft is on your clipboard.', { kind:'success' }));
      }
    });
    scope.querySelectorAll('[data-assist-prompt]').forEach(b => b.onclick = () => ask(b.dataset.assistPrompt));
    scope.querySelectorAll('[data-assist-mail]').forEach(b => b.onclick = () => OS.openApp('mail', { emailId:b.dataset.assistMail }));
    scope.querySelectorAll('[data-assist-file]').forEach(b => b.onclick = () => OS.openFile(b.dataset.assistFile));
  }
  function mount(container, win) {
    instance = { root:document.createElement('div'), win };
    instance.root.className = 'assistant-root app-fill';
    container.innerHTML = ''; container.appendChild(instance.root);
    instance.root.innerHTML = `<div class="assistant-app">
      <header class="assistant-header"><div class="assistant-brand"><span class="assistant-orb-big">✦</span><div><strong>APPELLO Assist</strong><small>Local workspace assistant</small></div></div><span class="assistant-local">Local only · no network</span></header>
      <div class="assistant-context"><span class="assistant-context-dot"></span>Working with <strong>${esc(contextLabel())}</strong></div>
      <div class="assistant-messages" id="assist-messages">
        <div class="assist-welcome"><span class="assistant-orb-big">✦</span><h2>${esc(greeting())}</h2><p>I can summarize the inbox, plan the day, draft a reply, find a file, add a task, or open the right app. I use only the training data saved in this browser.</p><div class="assist-suggestions">${SUGGESTIONS.map(s => `<button data-assist-prompt="${esc(s.prompt)}"><span>${s.icon}</span>${esc(s.label)}</button>`).join('')}</div></div>
      </div>
      <form class="assistant-compose" id="assist-form"><textarea id="assist-input" rows="1" placeholder="Ask Assist about your workday…" aria-label="Ask Assist"></textarea><button type="submit" class="assistant-send" aria-label="Send">↑</button></form>
      <div class="assistant-foot">APPELLO Assist · built into this training workspace.</div>
    </div>`;
    instance.input = instance.root.querySelector('#assist-input');
    const form = instance.root.querySelector('#assist-form');
    form.onsubmit = e => { e.preventDefault(); ask(instance.input.value); };
    instance.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(instance.input.value); } });
    instance.input.addEventListener('input', () => { instance.input.style.height = 'auto'; instance.input.style.height = Math.min(110, instance.input.scrollHeight) + 'px'; });
    bindActions(instance.root);
    setTimeout(() => instance.input.focus(), 200);
  }
  App.register('assistant', { mount, destroy(){ instance = null; } });
  window.AssistantApp = { open(){ OS.openApp('assistant'); }, ask(text){ if (!OS.isOpen('assistant')) OS.openApp('assistant'); setTimeout(() => { if (instance && instance.input) { ask(text); } }, 350); } };
})();
