/* Teamspace — chats, channels, presence, meetings, calls, shared files. */
(function () {
  'use strict';
  const { esc, fmtDate, fmtTime, parseISO, dateKey, simNow, nowTime, toast, modal, confirm, Bus, debounce,
    openHelp, convertZoned, getLocalTimeForZone, addMinutes } = Utils;

  let instance = null;

  const SECTIONS = [
    { id:'activity', label:'Activity', icon:'🔔', tip:'Mentions, replies, and things that need your attention.' },
    { id:'chat', label:'Chat', icon:'💬', tip:'Private one-to-one and group conversations.' },
    { id:'teams', label:'Teamspace', icon:'👥', tip:'Shared channels organised by team.' },
    { id:'calendar', label:'Calendar', icon:'▦', tip:'Meetings, conflicts, and room bookings shared with Mail.' },
    { id:'calls', label:'Calls', icon:'☎', tip:'Simulated incoming calls, transfers, and messages.' },
    { id:'files', label:'Files', icon:'📁', tip:'Documents and workbooks shared with the team.' }
  ];
  const STATUSES = ['Available','Busy','In a Meeting','Away','Do Not Disturb'];

  function statusClass(s) {
    return ({ Available:'available', Busy:'busy', 'In a Meeting':'meeting', Away:'away', 'Do Not Disturb':'dnd' })[s] || 'available';
  }
  function contact(id) { return Store.contactById(id); }
  function name(id) { if (id === 'me') return 'You'; const c = contact(id); return c ? c.name : id; }
  function first(id) { return name(id).split(' ')[0]; }
  function tone(id) { const c = contact(id); return c ? c.tone : 3; }

  function initialsCircle(text, cls, toneId) {
    return Icons.avatar(text, cls || 'avatar-md', toneId || 3);
  }

  function chatTitle(chat) {
    if (chat.name) return chat.name;
    const others = chat.members.filter(m => m !== 'me');
    return others.map(name).join(', ');
  }
  function chatAvatar(chat) {
    const others = chat.members.filter(m => m !== 'me');
    if (chat.type === 'group') {
      return `<span class="group-avatar">${others.slice(0,2).map((id, i) => Icons.avatar(name(id), 'avatar-sm', tone(id))).join('')}</span>`;
    }
    return Icons.avatar(name(others[0] || 'Teamspace'), 'avatar-md', tone(others[0]));
  }
  function lastMessage(chat) {
    return chat.messages && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;
  }
  function lastActivity(chat) {
    const m = lastMessage(chat);
    return m ? m.at : '2026-11-01T00:00';
  }

  function senderFor(chat) {
    const others = chat.members.filter(m => m !== 'me');
    if (!others.length) return 'daniel';
    return others[0];
  }

  function scriptedReply(text, chat) {
    const lower = String(text || '').toLowerCase();
    const others = chat.members.filter(m => m !== 'me');
    let responder = others[0] || 'daniel';
    if (/legal|clara|privileged|disclos/.test(lower) && others.includes('clara')) responder = 'clara';
    else if (/budget|variance|finance|covenant|cost/.test(lower) && others.includes('marcus')) responder = 'marcus';
    else if (/board|pack|attendee|liam/.test(lower) && others.includes('liam')) responder = 'liam';
    else if (/travel|flight|ticket|dubai|london|singapore/.test(lower) && others.includes('omar')) responder = 'omar';
    else if (/isabel|coffee|vela|atlas/.test(lower) && others.includes('alexandra')) responder = 'alexandra';
    else if (/people|dietary|naomi/.test(lower) && others.includes('naomi')) responder = 'naomi';
    else if (/seating|gala|dinner|fiona/.test(lower) && others.includes('fiona')) responder = 'fiona';
    let reply;
    if (/thank|appreciate/.test(lower)) reply = ['Happy to help.', 'Of course — thank you for the quick turnaround.', 'Anytime. Let me know if anything else comes up.'][Math.floor(Math.random() * 3)];
    else if (/board|pack|legal|disclos|clara/.test(lower)) reply = ['Understood. I’ll keep the distribution on hold until we have written approval.', 'I can review the language this afternoon. Please do not send the pack before then.', 'That matches my understanding. I’ll confirm in writing once I have checked page 14.'][Math.floor(Math.random() * 3)];
    else if (/budget|variance|finance|covenant/.test(lower)) reply = ['The one-line story is ready: travel is over because the three-city tour moved to Q4. I’ll send the exact wording.', 'I’ll send the corrected FY27 covenant page. Use one page number, not two versions.', 'Numbers look right. Let’s protect the wording — the lender will read it closely.'][Math.floor(Math.random() * 3)];
    else if (/meeting|calendar|schedule|available|time|invite/.test(lower)) reply = ['I can make that work. Please send the invite with the time zone shown so there’s no confusion.', 'That time is free on my calendar. Add the agenda and the pre-read if you can.', 'I’m in back-to-back blocks at 2, but 3 works. Send the invite and I’ll accept.'][Math.floor(Math.random() * 3)];
    else if (/isabel|coffee|move|3:00|3 pm/.test(lower)) reply = ['Isabel confirmed 3:00 works. Please keep the budget review protected.', 'Perfect. A coffee is better than a conference room for this conversation.', 'Thank you — please confirm it in writing so she has it on her phone.'][Math.floor(Math.random() * 3)];
    else if (/travel|flight|ticket|dubai|london|singapore/.test(lower)) reply = ['The fare releases at 08:00 ET tomorrow. I can hold it only until then.', 'I have the three-city holds in place. Confirm the budget and I’ll ticket immediately.', 'London and Dubai are straightforward. Singapore is the one with the tighter connection.'][Math.floor(Math.random() * 3)];
    else if (/urgent|asap|now/.test(lower)) reply = ['Understood — I’ll treat it as urgent. Send me the deadline and the decision you need.', 'I’m on it. I’ll come back within the hour with a status, even if the answer is not final.', 'Got it. I’ll protect this and tell you immediately if I see a risk.'][Math.floor(Math.random() * 3)];
    else if (/file|attach|document|spreadsheet/.test(lower)) reply = ['Got the file. I’ll review it and send comments by the end of the day.', 'Thanks — I can open it. Give me 20 minutes to look at the numbers.', 'I’ve saved it to the shared folder. I’ll flag any changes in the thread.'][Math.floor(Math.random() * 3)];
    else if (/\?$/.test(lower.trim())) reply = ['Let me check and come back to you within the hour.', 'Good question. I’ll confirm rather than guess — give me a few minutes.', 'I have the detail in the board folder. I’ll pull it and send it over.'][Math.floor(Math.random() * 3)];
    else if (/hello|hi |morning|good afternoon/.test(lower)) reply = ['Morning! What do you need from me?', 'Hi — good timing. I was about to message you.', 'Hello. I’m here and free for the next ten minutes.'][Math.floor(Math.random() * 3)];
    else reply = ['Noted — thanks for the update.', 'That works for me. Keep me posted on any change.', 'Understood. I’ll take care of my part and update the tracker.', 'Received. I’ll come back to you if I need anything else.'][Math.floor(Math.random() * 4)];
    return { from: responder, text: reply };
  }

  function renderText(text) {
    let safe = esc(text || '');
    const names = Store.state.contacts.map(c => c.name).concat('Elizabeth').sort((a, b) => b.length - a.length);
    names.forEach(n => {
      const re = new RegExp('@' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      safe = safe.replace(re, m => `<span class="mention">${m}</span>`);
    });
    return safe.replace(/\n/g, '<br>');
  }

  function allActivities() {
    const s = Store.state.teams;
    const items = [];
    s.chats.forEach(chat => {
      (chat.messages || []).slice(-4).forEach(m => {
        if (m.from !== 'me' && /@|urgent|board|approve|confirm|decision|deadline/i.test(m.text)) {
          items.push({ id:m.id, type:'chat', chatId:chat.id, text:m.text, from:m.from, at:m.at });
        }
      });
    });
    Object.entries(s.channelPosts).forEach(([channelId, posts]) => {
      posts.slice(-3).forEach(p => {
        if (p.from !== 'me') items.push({ id:p.id, type:'channel', channelId, text:p.text, from:p.from, at:p.at });
      });
    });
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20);
  }

  /* ------------------------------- render ------------------------------- */
  function render() {
    const root = instance.root;
    if (!root) return;
    if (instance.calendarController) { instance.calendarController.destroy(); instance.calendarController = null; }
    if (instance.meeting) { renderMeeting(); return; }
    const s = Store.state.teams;
    const presence = s.presence || Store.state.settings.presence || 'Available';
    let content = '';
    if (instance.section === 'activity') content = renderActivity();
    else if (instance.section === 'chat') content = renderChatSection();
    else if (instance.section === 'teams') content = renderTeamspaceSection();
    else if (instance.section === 'calendar') content = `<div class="teams-calendar-wrap"><div class="teams-calendar-head"><div><span class="eyebrow">Shared executive calendar</span><h2>Calendar</h2><p>Meetings created here also appear in Mail. Conflicts are checked before saving.</p></div><button class="btn teams small" data-meet-now data-tip="Start an instant simulated meeting room.">Meet now</button></div><div id="teams-calendar" class="teams-calendar-body"></div></div>`;
    else if (instance.section === 'calls') content = renderCalls();
    else if (instance.section === 'files') content = renderFiles();
    root.innerHTML = `
      <div class="teams-app">
        <aside class="teams-rail">
          <div class="teams-brand"><span class="teams-tile">T</span></div>
          <nav class="teams-rail-nav" aria-label="Teamspace sections">
            ${SECTIONS.map(sec => `<button class="teams-rail-btn ${instance.section === sec.id ? 'active' : ''}" data-section="${sec.id}" data-tip="${esc(sec.tip)}" aria-label="${esc(sec.label)}"><span class="rail-icon">${sec.icon}</span><span>${esc(sec.label)}</span>${sec.id === 'activity' && allActivities().length ? `<i class="rail-badge">${Math.min(9, allActivities().length)}</i>` : ''}${sec.id === 'calls' && instance.ringing ? '<i class="rail-badge red">!</i>' : ''}</button>`).join('')}
          </nav>
          <div class="teams-rail-bottom">
            <button class="rail-presence" data-presence data-tip="Change your presence so people know whether you are available."><span class="presence-dot ${statusClass(presence)}"></span>${Icons.avatar('Elizabeth Hale', 'avatar-sm', 2)}<span class="rail-presence-text"><strong>${esc(presence)}</strong><small>Elizabeth Hale</small></span></button>
          </div>
        </aside>
        <div class="teams-shell">
          <header class="teams-topbar">
            <div class="teams-topbar-left"><span class="teams-title-mark">T</span><strong>Teamspace</strong><span class="teams-crumb">${esc(SECTIONS.find(x => x.id === instance.section).label)}</span></div>
            <div class="teams-search"><span>⌕</span><input id="teams-search" type="search" value="${esc(instance.search)}" placeholder="Search chats and messages" aria-label="Search Teamspace" data-tip="Search conversation names and message text."></div>
            <div class="teams-topbar-right">
              <button class="teams-presence-btn" data-presence data-tip="Change your Teamspace presence status."><span class="presence-dot ${statusClass(presence)}"></span>${esc(presence)}</button>
              <button class="teams-assist-btn" data-open-app="assistant" data-tip="Ask APPELLO Assist about this conversation.">✦ Assist</button>
              <button class="help-btn" data-help-teams data-tip="Plain-language help for chats, channels, meetings, and calls.">What is this?</button>
              <button class="icon-btn" data-teams-files data-tip="Open shared files." aria-label="Shared files">📁</button>
            </div>
          </header>
          <div class="teams-content">${content}</div>
        </div>
      </div>`;
    bindGlobal();
    if (instance.section === 'calendar') {
      const el = root.querySelector('#teams-calendar');
      if (el) instance.calendarController = CalendarView.mount(el, { context:'teams' });
    }
    if (instance.section === 'chat') bindChat();
    if (instance.section === 'teams') bindTeamspace();
    if (instance.section === 'calls') bindCalls();
    if (instance.section === 'files') bindFiles();
    if (instance.section === 'activity') bindActivity();
  }

  function bindGlobal() {
    const root = instance.root;
    root.querySelectorAll('[data-section]').forEach(b => b.onclick = () => {
      instance.section = b.dataset.section;
      Store.update(s => { s.teams.selectedSection = instance.section; });
      render();
      Bus.emit('teams:section-opened', { section:instance.section });
    });
    root.querySelectorAll('[data-presence]').forEach(b => b.onclick = e => {
      const r = b.getBoundingClientRect();
      OS.contextMenu(r.left, Math.min(window.innerHeight - 240, r.bottom + 4), STATUSES.map(status => ({
        label:status, icon:status === (Store.state.settings.presence || 'Available') ? '●' : '', action:() => setPresence(status)
      })));
    });
    root.querySelectorAll('[data-help-teams]').forEach(b => b.onclick = () => openHelp('teams'));
    root.querySelectorAll('[data-open-app]').forEach(b => b.onclick = () => { if (window.OS) OS.openApp(b.dataset.openApp); });
    root.querySelectorAll('[data-teams-files]').forEach(b => b.onclick = () => { instance.section = 'files'; render(); });
    const search = root.querySelector('#teams-search');
    if (search) search.oninput = debounce(e => { instance.search = e.target.value; render(); setTimeout(() => { const i = instance.root.querySelector('#teams-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); }, 180);
    const meetNow = root.querySelector('[data-meet-now]');
    if (meetNow) meetNow.onclick = () => startMeeting(null);
  }

  function setPresence(status) {
    Store.update(s => { s.teams.presence = status; s.settings.presence = status; });
    Bus.emit('teams:presence', { status });
    toast('Presence updated', `You are now ${status}.`, { kind:'success', duration:2600 });
    render();
  }

  /* ------------------------------ activity ------------------------------ */
  function renderActivity() {
    const activities = allActivities().filter(a => !instance.search || `${name(a.from)} ${a.text}`.toLowerCase().includes(instance.search.toLowerCase()));
    return `<div class="activity-view">
      <div class="activity-head"><div><span class="eyebrow">Your attention</span><h2>Activity</h2><p>Mentions, decisions, and messages worth a second look.</p></div><span class="pill purple">${activities.length} items</span></div>
      <div class="activity-tabs tabs"><button class="active">All activity</button><button>Mentions</button><button>Replies</button></div>
      <div class="activity-list">
        ${activities.length ? activities.map(a => `<button class="activity-item" data-activity-type="${a.type}" data-activity-id="${a.chatId || a.channelId}" data-message-id="${a.id}">
          ${initialsCircle(name(a.from), 'avatar-md', tone(a.from))}
          <div class="activity-copy"><div><strong>${esc(name(a.from))}</strong><span>${a.type === 'channel' ? ' in a channel' : ' in a chat'}</span><small>${esc(relativeTeamTime(a.at))}</small></div><p>${renderText(a.text.length > 190 ? a.text.slice(0, 187) + '…' : a.text)}</p></div>
          <span class="activity-open">Open ↗</span>
        </button>`).join('') : `<div class="empty-state"><div class="empty-icon">🔔</div><h3>You’re all caught up</h3><p>When someone mentions you or a conversation needs a decision, it will appear here.</p></div>`}
      </div>
    </div>`;
  }
  function bindActivity() {
    instance.root.querySelectorAll('[data-activity-type]').forEach(b => b.onclick = () => {
      if (b.dataset.activityType === 'chat') { instance.section = 'chat'; instance.selectedChatId = b.dataset.activityId; }
      else {
        const channelId = b.dataset.activityId;
        const found = findChannel(channelId);
        if (found) { instance.section = 'teams'; instance.selectedTeamId = found.team.id; instance.selectedChannelId = channelId; }
      }
      render();
    });
  }
  function relativeTeamTime(iso) {
    const diff = Math.max(0, simNow() - new Date(iso));
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return fmtDate(new Date(iso), 'medium');
  }

  /* -------------------------------- chat -------------------------------- */
  function renderChatSection() {
    const s = Store.state.teams;
    const chats = s.chats.filter(c => {
      if (!instance.search) return true;
      const q = instance.search.toLowerCase();
      return chatTitle(c).toLowerCase().includes(q) || (c.messages || []).some(m => m.text.toLowerCase().includes(q));
    }).sort((a, b) => new Date(lastActivity(b)) - new Date(lastActivity(a)));
    if (!chats.find(c => c.id === instance.selectedChatId)) instance.selectedChatId = chats[0] ? chats[0].id : null;
    const chat = chats.find(c => c.id === instance.selectedChatId) || null;
    return `<div class="teams-two-col">
      <aside class="teams-list-pane">
        <div class="teams-list-head"><div><h2>Chat</h2><p>${s.chats.length} conversations</p></div><button class="icon-btn" data-new-chat data-tip="Start a new one-to-one or group chat." aria-label="New chat">✎</button></div>
        <div class="chat-list">
          ${chats.length ? chats.map(c => {
            const lm = lastMessage(c);
            return `<button class="chat-list-item ${c.id === instance.selectedChatId ? 'active' : ''}" data-chat="${c.id}" data-tip="Open conversation with ${esc(chatTitle(c))}.">
              <span class="chat-avatar-wrap">${chatAvatar(c)}${c.pinned ? '<i class="mini-pin">📌</i>' : ''}</span>
              <span class="chat-list-copy"><span class="chat-list-top"><strong>${esc(chatTitle(c))}</strong><small>${lm ? esc(relativeTeamTime(lm.at)) : ''}</small></span><span class="chat-list-preview">${lm ? (lm.from === 'me' ? 'You: ' : '') + esc((lm.text || 'Shared a file').slice(0, 54)) : 'No messages yet'}</span></span>
              ${c.type === 'group' ? `<span class="chat-member-count">${c.members.length}</span>` : ''}
            </button>`;
          }).join('') : `<div class="empty-state" style="padding:30px 16px"><p>No chats match your search.</p></div>`}
        </div>
        <div class="teams-list-footer"><button class="btn primary full small" data-new-chat data-tip="Start a new chat with one person or a group.">+ New chat</button></div>
      </aside>
      <section class="teams-conversation">
        ${chat ? conversation(chat) : `<div class="empty-state"><div class="empty-icon">💬</div><h3>No conversation selected</h3><p>Choose a chat on the left, or start a new one.</p></div>`}
      </section>
      ${instance.threadContext && chat ? threadPanel(chat) : ''}
    </div>`;
  }

  function conversation(chat) {
    const members = chat.members.filter(m => m !== 'me').map(m => contact(m)).filter(Boolean);
    const pinned = (chat.messages || []).filter(m => m.pinned);
    const typing = !!instance.typing[chat.id];
    return `<div class="convo-head">
        <div class="convo-person">${chat.type === 'group' ? `<span class="group-avatar lg">${members.slice(0,2).map(m => Icons.avatar(m.name, 'avatar-md', m.tone)).join('')}</span>` : Icons.avatar(members[0] ? members[0].name : 'Chat', 'avatar-lg', members[0] ? members[0].tone : 3)}
          <div><h3>${esc(chatTitle(chat))}</h3><p>${chat.type === 'group' ? `${chat.members.length} members` : `${esc(members[0] ? members[0].title : '')} · ${esc(members[0] ? members[0].timezoneLabel : '')}`}</p></div>
        </div>
        <div class="convo-actions">
          <button class="icon-btn" data-convo-search data-tip="Search inside this conversation." aria-label="Search conversation">⌕</button>
          <button class="icon-btn" data-convo-call data-tip="Start a simulated call with this chat." aria-label="Call">☎</button>
          <button class="icon-btn" data-convo-info data-tip="See members and pinned messages." aria-label="Conversation info">ⓘ</button>
        </div>
      </div>
      ${pinned.length ? `<div class="pinned-strip" data-pinned-strip><span>📌 ${pinned.length} pinned</span><p>${esc(pinned[pinned.length - 1].text)}</p><button data-toggle-pinned data-tip="Show or hide pinned messages">⌄</button></div>` : ''}
      <div class="message-scroll" id="message-scroll">
        <div class="convo-day"><span>Today · ${esc(fmtDate(simNow(), 'long'))}</span></div>
        ${(chat.messages || []).map(m => messageBubble(m, chat, 'chat')).join('')}
        ${typing ? `<div class="typing-row">${Icons.avatar(name(senderFor(chat)), 'avatar-sm', tone(senderFor(chat)))}<span class="typing-bubble"><i></i><i></i><i></i></span><small>${esc(name(senderFor(chat)))} is typing…</small></div>` : ''}
      </div>
      <div class="composer-area">
        ${instance.attachOpen ? inlineFilePicker('chat') : ''}
        ${instance.mentionOpen ? inlineMentionMenu(chat) : ''}
        <div class="composer">
          <div class="composer-tools">
            <button class="icon-btn" data-attach-toggle data-tip="Share a simulated file in this conversation." aria-label="Attach file">📎</button>
            <button class="icon-btn" data-mention-toggle data-tip="Insert an @mention. Use it only when the person needs to act or read." aria-label="Mention someone">@</button>
            <button class="icon-btn" data-emoji-toggle data-tip="Insert a reaction or emoji." aria-label="Emoji">☺</button>
          </div>
          <textarea id="teams-composer" placeholder="Type a message… Use @ to mention someone" aria-label="Message" data-tip="Enter sends. Shift+Enter adds a new line. Be clear and kind; chat is still a work record.">${esc(instance.draft[chat.id] || '')}</textarea>
          <button class="btn teams send-btn" data-send-chat data-tip="Send the message.">Send</button>
        </div>
        <div class="composer-hint"><span>Chats are saved in this browser.</span><span><kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line</span></div>
      </div>
      ${instance.threadContext ? '' : ''}`;
  }

  function messageBubble(m, chat, kind) {
    const isMe = m.from === 'me';
    const reactions = m.reactions || {};
    return `<div class="message ${isMe ? 'mine' : ''} ${m.pinned ? 'pinned' : ''}" data-message="${m.id}">
      ${!isMe ? Icons.avatar(name(m.from), 'avatar-md', tone(m.from)) : ''}
      <div class="message-body">
        <div class="message-meta"><strong>${esc(name(m.from))}</strong><span>${esc(relativeTeamTime(m.at))}</span>${m.pinned ? '<span class="pin-mark">📌 Pinned</span>' : ''}</div>
        <div class="message-text">${renderText(m.text)}</div>
        ${m.attachment ? `<button class="message-attachment" data-open-file="${esc(m.attachment.fileId || '')}" data-tip="Open the attached file."><span>${m.attachment.kind === 'sheet' ? '▦' : '📄'}</span><span><strong>${esc(m.attachment.name)}</strong><small>Shared file · simulated</small></span><span>Open</span></button>` : ''}
        ${Object.keys(reactions).length ? `<div class="reactions">${Object.entries(reactions).map(([emoji, people]) => `<button class="reaction" data-reaction="${esc(emoji)}" data-msg="${m.id}" data-tip="${esc((people || []).map(p => p === 'me' ? 'You' : name(p)).join(', '))}">${emoji} ${(people || []).length}</button>`).join('')}</div>` : ''}
        <div class="message-actions">
          <button data-react-btn="${m.id}" data-chat-id="${chat.id}" data-tip="Add a reaction.">☺ React</button>
          <button data-thread-btn="${m.id}" data-chat-id="${chat.id}" data-tip="Reply in a thread so the main chat stays readable.">↩ Reply in thread${m.thread && m.thread.length ? ` (${m.thread.length})` : ''}</button>
          <button data-pin-btn="${m.id}" data-chat-id="${chat.id}" data-tip="Pin or unpin this message for quick reference.">📌 ${m.pinned ? 'Unpin' : 'Pin'}</button>
        </div>
        ${instance.reactPicker === m.id ? `<div class="react-picker">${['👍','✅','👏','❤️','😂','👀','🙏','🎉'].map(e => `<button data-add-reaction="${e}" data-msg="${m.id}" data-chat-id="${chat.id}" data-tip="React with ${e}">${e}</button>`).join('')}</div>` : ''}
      </div>
      ${isMe ? Icons.avatar('Elizabeth Hale', 'avatar-md', 2) : ''}
    </div>`;
  }

  function threadPanel(chat) {
    const ctx = instance.threadContext;
    const message = (chat.messages || []).find(m => m.id === ctx.messageId);
    if (!message) return '';
    return `<aside class="thread-panel">
      <div class="thread-head"><div><span class="eyebrow">Thread</span><strong>${esc(name(message.from))}’s message</strong></div><button class="icon-btn" data-close-thread aria-label="Close thread">✕</button></div>
      <div class="thread-original">${renderText(message.text)}</div>
      <div class="thread-messages">
        ${(message.thread || []).length ? message.thread.map(r => `<div class="thread-reply">${Icons.avatar(name(r.from), 'avatar-sm', tone(r.from))}<div><strong>${esc(name(r.from))}</strong><p>${renderText(r.text)}</p><small>${esc(relativeTeamTime(r.at))}</small></div></div>`).join('') : `<div class="empty-state" style="padding:26px 14px"><p>No replies yet. Keep the side conversation here so the main chat stays clear.</p></div>`}
      </div>
      <div class="thread-composer"><textarea id="thread-input" placeholder="Reply in thread…" aria-label="Thread reply">${esc(instance.threadDraft || '')}</textarea><button class="btn teams small" data-send-thread>Reply</button></div>
    </aside>`;
  }

  function bindChat() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    const $$ = s => Array.from(root.querySelectorAll(s));
    $$('[data-chat]').forEach(b => b.onclick = () => {
      saveDraft();
      instance.selectedChatId = b.dataset.chat;
      instance.threadContext = null;
      instance.mentionOpen = false; instance.attachOpen = false;
      Store.update(s => { s.teams.selectedChatId = instance.selectedChatId; });
      render();
      Bus.emit('teams:chat-opened', { chatId:instance.selectedChatId });
    });
    $$('[data-new-chat]').forEach(b => b.onclick = newChat);
    const composer = $('#teams-composer');
    if (composer) {
      composer.oninput = () => { instance.draft[instance.selectedChatId] = composer.value; autoGrow(composer); };
      composer.onkeydown = e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
      };
      autoGrow(composer);
      setTimeout(() => { composer.focus(); composer.setSelectionRange(composer.value.length, composer.value.length); }, 50);
    }
    $$('[data-send-chat]').forEach(b => b.onclick = sendChat);
    $$('[data-attach-toggle]').forEach(b => b.onclick = () => { instance.attachOpen = !instance.attachOpen; instance.mentionOpen = false; render(); });
    $$('[data-mention-toggle]').forEach(b => b.onclick = () => { instance.mentionOpen = !instance.mentionOpen; instance.attachOpen = false; render(); });
    $$('[data-emoji-toggle]').forEach(b => b.onclick = () => insertText('🙂'));
    $$('[data-mention-person]').forEach(b => b.onclick = () => { insertText('@' + name(b.dataset.mentionPerson) + ' '); instance.mentionOpen = false; render(); });
    $$('[data-file-share]').forEach(b => b.onclick = () => shareFile(b.dataset.fileShare, 'chat'));
    $$('[data-react-btn]').forEach(b => b.onclick = () => { instance.reactPicker = instance.reactPicker === b.dataset.reactBtn ? null : b.dataset.reactBtn; render(); });
    $$('[data-add-reaction]').forEach(b => b.onclick = () => addReaction(b.dataset.chatId, b.dataset.msg, b.dataset.addReaction));
    $$('[data-thread-btn]').forEach(b => b.onclick = () => {
      saveDraft();
      const chat = Store.chatById(b.dataset.chatId);
      const m = chat.messages.find(x => x.id === b.dataset.threadBtn);
      instance.threadContext = { kind:'chat', chatId:chat.id, messageId:m.id };
      instance.threadDraft = '';
      render();
    });
    $$('[data-pin-btn]').forEach(b => b.onclick = () => togglePin(b.dataset.chatId, b.dataset.pinBtn));
    const closeThread = $('[data-close-thread]'); if (closeThread) closeThread.onclick = () => { saveDraft(); instance.threadContext = null; render(); };
    const threadInput = $('#thread-input'); if (threadInput) {
      threadInput.oninput = () => { instance.threadDraft = threadInput.value; };
      threadInput.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendThread(); } };
    }
    const sendThread = $('[data-send-thread]'); if (sendThread) sendThread.onclick = sendThreadMessage;
    $$('[data-open-file]').forEach(b => b.onclick = () => { if (b.dataset.openFile) OS.openFile(b.dataset.openFile); });
    const pinStrip = $('[data-toggle-pinned]');
    if (pinStrip) pinStrip.onclick = () => showPinned(instance.selectedChatId);
    const convoInfo = $('[data-convo-info]');
    if (convoInfo) convoInfo.onclick = () => conversationInfo(Store.chatById(instance.selectedChatId));
    const convoCall = $('[data-convo-call]');
    if (convoCall) convoCall.onclick = () => { instance.section = 'calls'; simulateIncoming(null); };
    // Restore scroll to latest message
    const ms = $('#message-scroll');
    if (ms) setTimeout(() => { ms.scrollTop = ms.scrollHeight; }, 30);
  }

  function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(130, Math.max(36, el.scrollHeight)) + 'px'; }
  function saveDraft() {
    const el = instance.root && instance.root.querySelector('#teams-composer');
    if (el && instance.selectedChatId) instance.draft[instance.selectedChatId] = el.value;
  }
  function insertText(text) {
    const el = instance.root.querySelector('#teams-composer');
    if (!el) return;
    const start = el.selectionStart || el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(el.selectionEnd || start);
    el.focus();
    el.selectionStart = el.selectionEnd = start + text.length;
    if (instance.selectedChatId) instance.draft[instance.selectedChatId] = el.value;
  }

  function sendChat() {
    const chat = Store.chatById(instance.selectedChatId);
    if (!chat) return;
    const input = instance.root.querySelector('#teams-composer');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { toast('Write a message first', 'Even a short acknowledgement needs words.', { kind:'error' }); input.focus(); return; }
    const msg = { id:Utils.uid('m'), from:'me', text, at:Utils.simNowIso(), reactions:{}, pinned:false, thread:[], attachment:null };
    const chatId = chat.id;
    Store.update(s => { const c = s.teams.chats.find(x => x.id === chatId); if (c) c.messages.push(msg); });
    instance.draft[chatId] = '';
    instance.mentionOpen = false;
    instance.attachOpen = false;
    render();
    setTimeout(() => { const i = instance.root.querySelector('#teams-composer'); if (i && instance.selectedChatId === chatId) i.focus(); }, 40);
    const mentioned = text.includes('@');
    Bus.emit('teams:message-sent', { chatId, messageId:msg.id, text, mention:mentioned, attachment:false, recipientCount:chat.members.length - 1 });
    scheduleReply(chatId, text, false);
  }

  function scheduleReply(chatId, text, isThread) {
    instance.typing[chatId] = true;
    render();
    setTimeout(() => {
      const chat = Store.chatById(chatId);
      if (!chat) { instance.typing[chatId] = false; return; }
      const reply = scriptedReply(text, chat);
      const replyMsg = { id:Utils.uid('m'), from:reply.from, text:reply.text, at:Utils.simNowIso(), reactions:{}, pinned:false, thread:[] };
      Store.update(s => {
        const c = s.teams.chats.find(x => x.id === chatId);
        if (c) c.messages.push(replyMsg);
      });
      delete instance.typing[chatId];
      if (instance.selectedChatId === chatId) {
        render();
        setTimeout(() => { const ms = instance.root.querySelector('#message-scroll'); if (ms) ms.scrollTop = ms.scrollHeight; }, 20);
      }
      Bus.emit('teams:message-received', { chatId, messageId:replyMsg.id, from:reply.from, text:reply.text });
    }, 1550 + Math.random() * 700);
  }

  function sendThreadMessage() {
    const ctx = instance.threadContext;
    if (!ctx) return;
    const input = instance.root.querySelector('#thread-input');
    const text = input ? input.value.trim() : (instance.threadDraft || '').trim();
    if (!text) return;
    const chat = Store.chatById(ctx.chatId);
    if (!chat) return;
    const parent = chat.messages.find(m => m.id === ctx.messageId);
    if (!parent) return;
    const reply = { id:Utils.uid('m'), from:'me', text, at:Utils.simNowIso() };
    Store.update(s => {
      const c = s.teams.chats.find(x => x.id === ctx.chatId);
      const m = c && c.messages.find(x => x.id === ctx.messageId);
      if (m) { m.thread = m.thread || []; m.thread.push(reply); }
    });
    instance.threadDraft = '';
    render();
    Bus.emit('teams:thread-replied', { chatId:ctx.chatId, messageId:ctx.messageId, text });
    setTimeout(() => {
      const c = Store.chatById(ctx.chatId);
      if (!c) return;
      const sr = scriptedReply(text, c);
      const reply2 = { id:Utils.uid('m'), from:sr.from, text:sr.text, at:Utils.simNowIso() };
      Store.update(s => {
        const c2 = s.teams.chats.find(x => x.id === ctx.chatId);
        const m = c2 && c2.messages.find(x => x.id === ctx.messageId);
        if (m) m.thread.push(reply2);
      });
      render();
      Bus.emit('teams:thread-reply-received', { chatId:ctx.chatId, from:sr.from, text:sr.text });
    }, 1800);
  }

  function addReaction(chatId, messageId, emoji) {
    Store.update(s => {
      const c = s.teams.chats.find(x => x.id === chatId);
      const m = c && c.messages.find(x => x.id === messageId);
      if (!m) return;
      m.reactions = m.reactions || {};
      const list = m.reactions[emoji] || [];
      const idx = list.indexOf('me');
      if (idx >= 0) list.splice(idx, 1); else list.push('me');
      if (list.length) m.reactions[emoji] = list; else delete m.reactions[emoji];
    });
    instance.reactPicker = null;
    Bus.emit('teams:reaction', { chatId, messageId, emoji });
    render();
  }
  function togglePin(chatId, messageId) {
    Store.update(s => {
      const c = s.teams.chats.find(x => x.id === chatId);
      const m = c && c.messages.find(x => x.id === messageId);
      if (m) m.pinned = !m.pinned;
    });
    Bus.emit('teams:message-pinned', { chatId, messageId });
    render();
  }
  function showPinned(chatId) {
    const chat = Store.chatById(chatId);
    const pinned = (chat.messages || []).filter(m => m.pinned);
    modal({
      title:'Pinned messages', subtitle:'Pinned messages stay easy to find. Pin only what the team needs repeatedly.', size:'wide',
      body:`<div class="pinned-modal-list">${pinned.length ? pinned.map(m => `<div class="pinned-modal-item"><div><strong>${esc(name(m.from))}</strong><small>${esc(relativeTeamTime(m.at))}</small></div><p>${renderText(m.text)}</p></div>`).join('') : '<p class="muted">No pinned messages.</p>'}</div>`,
      footer:`<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
    });
  }
  function conversationInfo(chat) {
    const members = chat.members.map(m => m === 'me' ? { name:'Elizabeth Hale', title:'Executive Assistant', tone:2 } : contact(m)).filter(Boolean);
    modal({
      title:chatTitle(chat), subtitle:chat.type === 'group' ? 'Group chat' : 'One-to-one chat', size:'narrow',
      body:`<div class="convo-info-members">${members.map(c => `<div class="convo-info-member">${Icons.avatar(c.name, 'avatar-md', c.tone)}<div><strong>${esc(c.name)}</strong><small>${esc(c.title || '')} · ${esc(c.timezoneLabel || 'New York (ET)')}</small></div></div>`).join('')}</div><div class="help-callout" style="margin-top:12px"><span>🔒</span><div>This is a simulated private conversation. In a real company, chat is still a work record and can be subject to legal review.</div></div>`,
      footer:`<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
    });
  }

  function inlineMentionMenu(chat) {
    const members = chat.members.filter(m => m !== 'me');
    return `<div class="mention-menu"><div class="mention-head">Mention someone</div>${members.map(id => `<button data-mention-person="${id}">${Icons.avatar(name(id), 'avatar-sm', tone(id))}<span>${esc(name(id))}</span><small>${esc(contact(id) ? contact(id).title : '')}</small></button>`).join('')}</div>`;
  }
  function inlineFilePicker(kind) {
    const files = Store.state.files.filter(f => !f.deletedAt && f.type !== 'folder').slice(0, 8);
    return `<div class="share-file-menu"><div class="mention-head">Share a simulated file</div>${files.map(f => `<button data-file-share="${f.id}"><span>${f.type === 'sheet' ? '▦' : '📄'}</span><span>${esc(f.name)}<small>${f.type === 'sheet' ? 'Workbook' : 'Document'}</small></span></button>`).join('')}</div>`;
  }
  function shareFile(fileId, kind) {
    const f = Store.fileById(fileId);
    if (!f) return;
    if (kind === 'chat') {
      const chatId = instance.selectedChatId;
      const msg = { id:Utils.uid('m'), from:'me', text:`I’m sharing ${f.name} for review.`, at:Utils.simNowIso(), reactions:{}, pinned:false, thread:[], attachment:{ name:f.name, kind:f.type, fileId:f.id } };
      Store.update(s => { const c = s.teams.chats.find(x => x.id === chatId); if (c) c.messages.push(msg); });
      instance.attachOpen = false;
      render();
      Bus.emit('teams:file-shared', { chatId, fileId, fileName:f.name, messageId:msg.id });
      toast('File shared', `${f.name} was shared in the chat.`, { kind:'success' });
    } else {
      const channelId = instance.selectedChannelId;
      const post = { id:Utils.uid('p'), from:'me', text:`Shared for review: ${f.name}`, at:Utils.simNowIso(), reactions:{}, pinned:false, thread:[], attachment:{ name:f.name, kind:f.type, fileId:f.id } };
      Store.update(s => { (s.teams.channelPosts[channelId] = s.teams.channelPosts[channelId] || []).push(post); });
      instance.attachOpen = false;
      render();
      Bus.emit('teams:file-shared', { channelId, fileId, fileName:f.name, messageId:post.id });
      toast('File shared', `${f.name} was shared in the channel.`, { kind:'success' });
    }
  }

  function newChat() {
    const contacts = Store.state.contacts.filter(c => c.id !== 'alexandra');
    const selected = new Set();
    modal({
      title:'New chat',
      subtitle:'Start a one-to-one conversation or choose several people for a group chat.',
      size:'wide',
      body:`<div class="field"><label for="new-chat-search">People</label><input id="new-chat-search" class="input" placeholder="Search by name or company" data-tip="Search the training directory."></div>
        <div class="new-chat-people" id="new-chat-people">
          ${contacts.map(c => `<label class="attendee-row"><input type="checkbox" value="${c.id}">${Icons.avatar(c.name, 'avatar-sm', c.tone)}<span class="attendee-person"><strong>${esc(c.name)}</strong><small>${esc(c.title)} · ${esc(c.company)}</small></span><span class="attendee-zone">${esc(c.timezoneLabel)}</span></label>`).join('')}
        </div><div class="help-callout" style="margin-top:10px"><span>💡</span><div>A group chat should have a purpose. If the conversation is about a project, a channel is usually better because it stays findable.</div></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn teams" data-create-chat>Start chat</button>`,
      onOpen({ modal: el, close }) {
        const search = el.querySelector('#new-chat-search');
        search.oninput = () => {
          const q = search.value.toLowerCase();
          el.querySelectorAll('#new-chat-people .attendee-row').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
        };
        el.querySelectorAll('#new-chat-people input').forEach(cb => cb.onchange = () => { if (cb.checked) selected.add(cb.value); else selected.delete(cb.value); });
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-create-chat]').onclick = () => {
          if (!selected.size) { toast('Choose a person', 'A chat needs at least one other person.', { kind:'error' }); return; }
          const members = ['me', ...Array.from(selected)];
          const chat = { id:Utils.uid('chat'), name: null, type:members.length > 2 ? 'group' : 'dm', members, pinned:false, messages:[] };
          Store.update(s => s.teams.chats.unshift(chat));
          instance.selectedChatId = chat.id;
          close(); render();
          Bus.emit('teams:chat-created', { chatId:chat.id, members, group:members.length > 2 });
          toast('Chat started', `You can now message ${members.filter(m => m !== 'me').map(name).join(', ')}.`, { kind:'success' });
        };
      }
    });
  }

  /* ------------------------------- teams -------------------------------- */
  function findChannel(channelId) {
    for (const team of Store.state.teams.teams) {
      const channel = team.channels.find(c => c.id === channelId);
      if (channel) return { team, channel };
    }
    return null;
  }

  function renderTeamspaceSection() {
    const s = Store.state.teams;
    let team = s.teams.find(t => t.id === instance.selectedTeamId) || s.teams[0];
    let channel = team.channels.find(c => c.id === instance.selectedChannelId) || team.channels[0];
    instance.selectedTeamId = team.id; instance.selectedChannelId = channel.id;
    const posts = (s.channelPosts[channel.id] || []);
    return `<div class="teams-two-col channel-layout">
      <aside class="teams-list-pane channel-list-pane">
        <div class="teams-list-head"><div><h2>Teamspace</h2><p>${s.teams.length} teams</p></div><button class="icon-btn" data-new-channel data-tip="Create a channel in the selected team." aria-label="New channel">✎</button></div>
        <div class="team-list">
          ${s.teams.map(t => `<div class="team-block ${t.id === team.id ? 'active' : ''}">
            <button class="team-name-row" data-team="${t.id}"><span class="team-letter">${esc(t.icon)}</span><span><strong>${esc(t.name)}</strong><small>${t.channels.length} channels</small></span><span>⌄</span></button>
            ${t.id === team.id ? `<div class="channel-list">${t.channels.map(c => `<button class="channel-row ${c.id === channel.id ? 'active' : ''}" data-channel="${c.id}" data-tip="${esc(c.description)}"><span>#</span>${esc(c.name)}</button>`).join('')}<button class="channel-add" data-new-channel>+ Add channel</button></div>` : ''}
          </div>`).join('')}
        </div>
      </aside>
      <section class="teams-conversation channel-convo">
        <div class="convo-head channel-head">
          <div><span class="team-context">${esc(team.name)}</span><h3># ${esc(channel.name)}</h3><p>${esc(channel.description)}</p></div>
          <div class="convo-actions"><button class="icon-btn" data-channel-pin data-tip="Show pinned channel messages." aria-label="Pinned messages">📌</button><button class="icon-btn" data-channel-files data-tip="See files shared in this team." aria-label="Channel files">📁</button><button class="icon-btn" data-channel-info data-tip="Channel details." aria-label="Channel info">ⓘ</button></div>
        </div>
        <div class="channel-tabs tabs"><button class="${instance.channelTab === 'posts' ? 'active' : ''}" data-channel-tab="posts">Posts</button><button class="${instance.channelTab === 'files' ? 'active' : ''}" data-channel-tab="files">Files</button></div>
        ${instance.channelTab === 'files' ? renderChannelFiles(team, channel) : `
          <div class="message-scroll channel-posts" id="message-scroll">
            <div class="channel-welcome"><span class="team-badge">${esc(team.icon)}</span><div><h4>Welcome to ${esc(channel.name)}</h4><p>${esc(channel.description)}</p><span class="muted-small">This is a shared channel. Be clear, assume the executive can read it, and keep decisions findable.</span></div></div>
            ${posts.map(p => channelPost(p, channel)).join('')}
            ${instance.typing['channel-' + channel.id] ? `<div class="typing-row">${Icons.avatar('Priya Raman', 'avatar-sm', 3)}<span class="typing-bubble"><i></i><i></i><i></i></span><small>Someone is typing…</small></div>` : ''}
          </div>
          <div class="composer-area">
            ${instance.attachOpen ? inlineFilePicker('channel') : ''}
            <div class="channel-composer-label">Post to <strong>${esc(channel.name)}</strong></div>
            <div class="composer">
              <div class="composer-tools"><button class="icon-btn" data-channel-attach data-tip="Share a file in this channel." aria-label="Attach file">📎</button><button class="icon-btn" data-channel-mention data-tip="Mention someone in the channel." aria-label="Mention">@</button></div>
              <textarea id="channel-composer" placeholder="Share an update with the channel…" aria-label="Channel post" data-tip="Channel posts are visible to the team. Use them for decisions and updates, not private coordination."></textarea>
              <button class="btn teams send-btn" data-send-post>Post</button>
            </div>
            <div class="composer-hint"><span>Everyone in #${esc(channel.name)} can see this.</span><span><kbd>Enter</kbd> post</span></div>
          </div>`}
      </section>
      ${instance.threadContext && instance.threadContext.kind === 'channel' ? channelThreadPanel(posts) : ''}
    </div>`;
  }

  function channelPost(p, channel) {
    return `<div class="channel-post ${p.pinned ? 'pinned' : ''}" data-message="${p.id}">
      <div class="channel-post-head">${Icons.avatar(name(p.from), 'avatar-md', tone(p.from))}<div><strong>${esc(name(p.from))}</strong><span>${esc(contact(p.from) ? contact(p.from).title : '')} · ${esc(relativeTeamTime(p.at))}</span></div>${p.pinned ? '<span class="pin-mark">📌 Pinned</span>' : ''}</div>
      <div class="message-text">${renderText(p.text)}</div>
      ${p.attachment ? `<button class="message-attachment" data-open-file="${esc(p.attachment.fileId)}"><span>${p.attachment.kind === 'sheet' ? '▦' : '📄'}</span><span><strong>${esc(p.attachment.name)}</strong><small>Shared file</small></span><span>Open</span></button>` : ''}
      ${p.reactions && Object.keys(p.reactions).length ? `<div class="reactions">${Object.entries(p.reactions).filter(([, people]) => (people || []).length).map(([emoji, people]) => `<button class="reaction" data-post-reaction="${esc(emoji)}" data-post-id="${p.id}">${emoji} ${(people || []).length}</button>`).join('')}</div>` : ''}
      <div class="channel-post-actions">
        <button data-post-thread="${p.id}">↩ ${p.thread && p.thread.length ? p.thread.length + ' replies' : 'Reply'}</button>
        <button data-post-react="${p.id}">☺ React</button>
        <button data-post-pin="${p.id}">📌 ${p.pinned ? 'Unpin' : 'Pin'}</button>
      </div>
    </div>`;
  }

  function channelThreadPanel(posts) {
    const ctx = instance.threadContext;
    const parent = posts.find(p => p.id === ctx.messageId);
    if (!parent) return '';
    return `<aside class="thread-panel channel-thread">
      <div class="thread-head"><div><span class="eyebrow">Channel thread</span><strong>${esc(name(parent.from))}’s post</strong></div><button class="icon-btn" data-close-channel-thread aria-label="Close thread">✕</button></div>
      <div class="thread-original">${renderText(parent.text)}</div>
      <div class="thread-messages">${(parent.thread || []).length ? parent.thread.map(r => `<div class="thread-reply">${Icons.avatar(name(r.from), 'avatar-sm', tone(r.from))}<div><strong>${esc(name(r.from))}</strong><p>${renderText(r.text)}</p><small>${esc(relativeTeamTime(r.at))}</small></div></div>`).join('') : '<div class="empty-state" style="padding:22px"><p>No replies yet.</p></div>'}</div>
      <div class="thread-composer"><textarea id="thread-input" placeholder="Reply to the channel post…" aria-label="Thread reply">${esc(instance.threadDraft || '')}</textarea><button class="btn teams small" data-send-channel-thread>Reply</button></div>
    </aside>`;
  }

  function bindTeamspace() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    const $$ = s => Array.from(root.querySelectorAll(s));
    $$('[data-team]').forEach(b => b.onclick = () => {
      instance.selectedTeamId = b.dataset.team;
      const team = Store.state.teams.teams.find(t => t.id === instance.selectedTeamId);
      instance.selectedChannelId = team.channels[0].id;
      render();
    });
    $$('[data-channel]').forEach(b => b.onclick = () => { instance.selectedChannelId = b.dataset.channel; instance.threadContext = null; instance.channelTab='posts'; render(); Bus.emit('teams:channel-opened', { channelId:b.dataset.channel }); });
    $$('[data-new-channel]').forEach(b => b.onclick = newChannel);
    $$('[data-channel-tab]').forEach(b => b.onclick = () => { instance.channelTab = b.dataset.channelTab; render(); });
    const composer = $('#channel-composer');
    if (composer) {
      composer.oninput = () => {
        if (!instance.channelDraft) instance.channelDraft = {};
        instance.channelDraft[instance.selectedChannelId] = composer.value;
        autoGrow(composer);
      };
      if (instance.channelDraft && instance.channelDraft[instance.selectedChannelId]) composer.value = instance.channelDraft[instance.selectedChannelId];
      composer.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChannelPost(); } };
      autoGrow(composer);
      setTimeout(() => { composer.focus(); composer.setSelectionRange(composer.value.length, composer.value.length); }, 40);
    }
    $$('[data-send-post]').forEach(b => b.onclick = sendChannelPost);
    $$('[data-channel-attach]').forEach(b => b.onclick = () => { instance.attachOpen = !instance.attachOpen; render(); });
    $$('[data-file-share]').forEach(b => b.onclick = () => shareFile(b.dataset.fileShare, 'channel'));
    $$('[data-channel-mention]').forEach(b => b.onclick = () => insertChannelText('@'));
    $$('[data-post-thread]').forEach(b => b.onclick = () => {
      instance.threadContext = { kind:'channel', channelId:instance.selectedChannelId, messageId:b.dataset.postThread };
      instance.threadDraft = ''; render();
    });
    $$('[data-post-pin]').forEach(b => b.onclick = () => toggleChannelPin(b.dataset.postPin));
    $$('[data-post-react]').forEach(b => b.onclick = () => toggleChannelReaction(b.dataset.postReact, '👍'));
    $$('[data-post-reaction]').forEach(b => b.onclick = () => toggleChannelReaction(b.dataset.postId, b.dataset.postReaction));
    const closeThread = $('[data-close-channel-thread]'); if (closeThread) closeThread.onclick = () => { instance.threadContext = null; render(); };
    const threadInput = $('#thread-input'); if (threadInput) { threadInput.oninput = () => { instance.threadDraft = threadInput.value; }; threadInput.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChannelThread(); } }; }
    const sendThread = $('[data-send-channel-thread]'); if (sendThread) sendThread.onclick = sendChannelThread;
    $$('[data-open-file]').forEach(b => b.onclick = () => { if (b.dataset.openFile) OS.openFile(b.dataset.openFile); });
    const pinBtn = $('[data-channel-pin]'); if (pinBtn) pinBtn.onclick = () => showChannelPinned();
    const filesBtn = $('[data-channel-files]'); if (filesBtn) filesBtn.onclick = () => { instance.channelTab = 'files'; render(); };
    const infoBtn = $('[data-channel-info]'); if (infoBtn) infoBtn.onclick = channelInfo;
    const ms = $('#message-scroll');
    if (ms) setTimeout(() => { ms.scrollTop = ms.scrollHeight; }, 30);
  }

  function insertChannelText(text) {
    const el = instance.root.querySelector('#channel-composer');
    if (!el) return;
    el.value += text;
    el.focus();
  }
  function sendChannelPost() {
    const el = instance.root.querySelector('#channel-composer');
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    const post = { id:Utils.uid('p'), from:'me', text, at:Utils.simNowIso(), reactions:{}, pinned:false, thread:[] };
    const channelId = instance.selectedChannelId;
    Store.update(s => { (s.teams.channelPosts[channelId] = s.teams.channelPosts[channelId] || []).push(post); });
    if (instance.channelDraft) instance.channelDraft[channelId] = '';
    instance.attachOpen = false;
    render();
    Bus.emit('teams:channel-posted', { channelId, postId:post.id, text, mention:text.includes('@') });
    scheduleChannelReply(channelId, text);
  }
  function scheduleChannelReply(channelId, text) {
    instance.typing['channel-' + channelId] = true;
    render();
    setTimeout(() => {
      const found = findChannel(channelId);
      const chatLike = { members:['me', 'priya', 'liam'] };
      const reply = scriptedReply(text, chatLike);
      const post = { id:Utils.uid('p'), from:reply.from, text:reply.text, at:Utils.simNowIso(), reactions:{}, pinned:false, thread:[] };
      Store.update(s => { (s.teams.channelPosts[channelId] = s.teams.channelPosts[channelId] || []).push(post); });
      delete instance.typing['channel-' + channelId];
      if (instance.selectedChannelId === channelId) render();
      Bus.emit('teams:channel-reply', { channelId, postId:post.id, from:reply.from, text:reply.text });
    }, 1900);
  }
  function sendChannelThread() {
    const ctx = instance.threadContext; if (!ctx) return;
    const input = instance.root.querySelector('#thread-input');
    const text = input ? input.value.trim() : (instance.threadDraft || '').trim();
    if (!text) return;
    const reply = { id:Utils.uid('m'), from:'me', text, at:Utils.simNowIso() };
    Store.update(s => {
      const posts = s.teams.channelPosts[ctx.channelId] || [];
      const p = posts.find(x => x.id === ctx.messageId);
      if (p) { p.thread = p.thread || []; p.thread.push(reply); }
    });
    instance.threadDraft = '';
    render();
    Bus.emit('teams:channel-thread-replied', { channelId:ctx.channelId, postId:ctx.messageId, text });
    setTimeout(() => {
      const sr = scriptedReply(text, { members:['me','priya','liam'] });
      Store.update(s => {
        const posts = s.teams.channelPosts[ctx.channelId] || [];
        const p = posts.find(x => x.id === ctx.messageId);
        if (p) p.thread.push({ id:Utils.uid('m'), from:sr.from, text:sr.text, at:Utils.simNowIso() });
      });
      render();
    }, 1800);
  }
  function toggleChannelReaction(postId, emoji) {
    Store.update(s => {
      const c = s.teams.channels.find(x => x.id === instance.selectedChannelId);
      const p = c && c.posts.find(x => x.id === postId);
      if (!p) return;
      p.reactions = p.reactions || {};
      const list = p.reactions[emoji] || [];
      const idx = list.indexOf('me');
      if (idx >= 0) list.splice(idx, 1); else list.push('me');
      if (list.length) p.reactions[emoji] = list; else delete p.reactions[emoji];
    });
    Bus.emit('teams:channel-reacted', { channelId:instance.selectedChannelId, messageId:postId, emoji });
    render();
  }

  function toggleChannelPin(postId) {
    const channelId = instance.selectedChannelId;
    Store.update(s => { const p = (s.teams.channelPosts[channelId] || []).find(x => x.id === postId); if (p) p.pinned = !p.pinned; });
    render();
  }
  function showChannelPinned() {
    const posts = Store.state.teams.channelPosts[instance.selectedChannelId] || [];
    const pinned = posts.filter(p => p.pinned);
    modal({
      title:'Pinned in this channel', size:'wide', body:`${pinned.length ? pinned.map(p => `<div class="pinned-modal-item"><strong>${esc(name(p.from))}</strong><p>${renderText(p.text)}</p></div>`).join('') : '<p class="muted">No pinned posts.</p>'}`,
      footer:`<button class="btn primary" data-close>Close</button>`, onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
    });
  }
  function channelInfo() {
    const found = findChannel(instance.selectedChannelId);
    if (!found) return;
    modal({
      title:`# ${found.channel.name}`, subtitle:found.team.name, size:'narrow',
      body:`<p style="font-size:12px;line-height:1.6;color:#46576c">${esc(found.channel.description)}</p><div class="help-callout" style="margin-top:12px"><span>#</span><div>Channels are shared. Do not post privileged legal material or confidential board documents here. Use email or a secure link.</div></div>`,
      footer:`<button class="btn primary" data-close>Close</button>`, onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
    });
  }
  function newChannel() {
    modal({
      title:'New channel', subtitle:`Create a channel inside ${Store.state.teams.teams.find(t => t.id === instance.selectedTeamId).name}.`, size:'narrow',
      body:`<div class="field"><label for="channel-name">Channel name</label><input id="channel-name" class="input" placeholder="e.g. Board logistics" data-tip="Use a short, specific name. Channels should have a clear purpose."></div><div class="field"><label for="channel-desc">Purpose</label><textarea id="channel-desc" class="textarea" style="min-height:65px" placeholder="Who is this channel for, and what belongs here?"></textarea></div>`,
      footer:`<button class="btn" data-cancel>Cancel</button><button class="btn teams" data-create-channel>Create channel</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        el.querySelector('[data-create-channel]').onclick = () => {
          const nameEl = el.querySelector('#channel-name'); const nameVal = nameEl.value.trim().replace(/\s+/g, '-').toLowerCase();
          if (!nameVal) { toast('Name the channel', 'A channel needs a name.', { kind:'error' }); return; }
          const channel = { id:Utils.uid('ch'), name:nameVal, description:el.querySelector('#channel-desc').value.trim() || 'A new team channel.' };
          Store.update(s => {
            const team = s.teams.teams.find(t => t.id === instance.selectedTeamId);
            team.channels.push(channel);
            s.teams.channelPosts[channel.id] = [];
          });
          instance.selectedChannelId = channel.id;
          close(); render();
          Bus.emit('teams:channel-created', { teamId:instance.selectedTeamId, channelId:channel.id, name:nameVal });
          toast('Channel created', `#${nameVal} is ready.`, { kind:'success' });
        };
      }
    });
  }

  function renderChannelFiles(team, channel) {
    const files = Store.state.files.filter(f => !f.deletedAt && f.type !== 'folder');
    return `<div class="channel-files"><div class="channel-files-head"><div><h3>Files shared with ${esc(team.name)}</h3><p>Simulated drive files. Opening one uses the Docs or Sheets app.</p></div><button class="btn teams small" data-channel-attach>Share a file</button></div><div class="channel-file-grid">${files.map(f => `<button class="channel-file-card" data-open-file="${f.id}"><span class="file-icon">${f.type === 'sheet' ? Icons.icons.sheet : Icons.icons.doc}</span><span><strong>${esc(f.name)}</strong><small>${f.type === 'sheet' ? 'Workbook' : 'Document'} · updated ${esc(fmtDate(f.updatedAt || f.createdAt, 'medium'))}</small></span><span>Open ↗</span></button>`).join('')}</div></div>`;
  }

  /* ------------------------------- calls -------------------------------- */
  function callerInfo(id) {
    if (id === 'external-reporter') return { name:'Business Weekend reporter', title:'External call', tone:5, company:'Business Weekend' };
    const c = contact(id);
    return c || { name:id, title:'', tone:5, company:'' };
  }

  function renderCalls() {
    const s = Store.state.teams;
    const calls = s.calls || [];
    if (instance.ringing) {
      const c = callerInfo(instance.ringing.caller);
      return `<div class="calls-view calls-ringing-view">
        <div class="incoming-card ${instance.takingMessage ? 'message-mode' : ''}">
          <div class="ring-waves"><i></i><i></i><i></i></div>
          ${Icons.avatar(c.name, 'avatar-xl', c.tone)}
          <span class="eyebrow">Incoming call</span>
          <h2>${esc(c.name)}</h2>
          <p>${esc(c.title)}${c.company ? ' · ' + esc(c.company) : ''}</p>
          <div class="ring-purpose">${esc(instance.ringing.purpose)}</div>
          ${instance.takingMessage ? `<div class="take-message-panel"><label for="call-message">Message for Alexandra</label><textarea id="call-message" class="textarea" placeholder="Who called, what they need, and by when. Capture a call-back number or next step." data-tip="A useful message includes the caller, the ask, the deadline, and how to reach them.">${esc(instance.callMessageDraft || '')}</textarea><div class="inline-actions"><button class="btn teams" data-save-call-message>Save message</button><button class="btn" data-cancel-message>Back</button></div></div>` : `
            <div class="call-actions">
              <button class="call-btn answer" data-answer-call data-tip="Answer the simulated call."><span>☎</span>Answer</button>
              <button class="call-btn" data-take-message data-tip="Write down who called and what they need, instead of answering."><span>✎</span>Take message</button>
              <button class="call-btn decline" data-decline-call data-tip="Decline the call. A missed call is still logged."><span>✕</span>Decline</button>
            </div>`}
          <p class="call-hint">Practice the call flow, then log the outcome.</p>
        </div>
      </div>`;
    }
    if (instance.activeCall) {
      const c = callerInfo(instance.activeCall.caller);
      return `<div class="calls-view calls-active-view">
        <div class="active-call-card">
          <div class="active-call-top"><span class="live-pill"><i></i> ON CALL</span><span id="call-timer" class="call-timer">${esc(callElapsed())}</span></div>
          <div class="active-call-person">${Icons.avatar(c.name, 'avatar-xl', c.tone)}<h2>${esc(c.name)}</h2><p>${esc(c.title)}</p><span class="presence-dot available"></span><small>${esc(c.company)}</small></div>
          <div class="call-controls">
            <button class="call-control ${instance.callMuted ? 'off' : ''}" data-call-mute data-tip="Mute or unmute your simulated microphone."><span>${instance.callMuted ? '🔇' : '🎙'}</span><small>${instance.callMuted ? 'Unmute' : 'Mute'}</small></button>
            <button class="call-control" data-call-keypad data-tip="Open a simulated keypad."><span>⌨</span><small>Keypad</small></button>
            <button class="call-control" data-call-hold data-tip="Put the simulated call on hold."><span>⏸</span><small>Hold</small></button>
            <button class="call-control danger" data-end-call data-tip="End the call and log it."><span>☎</span><small>End</small></button>
          </div>
          <div class="call-transfer-panel">
            <span class="eyebrow">Transfer call</span>
            <div class="inline-actions"><select class="select" id="transfer-to" data-tip="Choose a colleague to transfer the caller to.">${Store.state.contacts.filter(x => x.type !== 'vendor').slice(0, 8).map(x => `<option value="${x.id}">${esc(x.name)} — ${esc(x.title)}</option>`).join('')}</select><button class="btn teams small" data-transfer-call>Transfer</button><button class="btn small" data-active-take-message>Take message</button></div>
          </div>
          <p class="call-hint">${esc(instance.activeCall.purpose)}</p>
        </div>
      </div>`;
    }
    return `<div class="calls-view">
      <div class="calls-head"><div><span class="eyebrow">Telephone</span><h2>Calls</h2><p>Answer professionally, transfer with context, or take a useful message.</p></div><button class="btn teams" data-ring-desk data-tip="Simulate an incoming call so you can practise answering, transferring, or taking a message.">☎ Ring my desk</button></div>
      <div class="calls-layout">
        <section class="call-card-panel">
          <div class="call-empty-art"><span>☎</span><div class="sound-wave">${Array.from({length:16}, (_,i) => `<i style="animation-delay:${i * .08}s"></i>`).join('')}</div></div>
          <h3>Practice receiving calls</h3>
          <p>Incoming calls follow this week’s training scenario. The caller will have a purpose drawn from this week’s work: Isabel’s coffee, Noah’s covenant page, a reporter, or Daniel’s urgent question.</p>
          <button class="btn teams" data-ring-desk>Simulate incoming call</button>
        </section>
        <section class="call-history-panel">
          <div class="call-history-head"><h3>Recent calls</h3><span class="muted-small">Today and yesterday</span></div>
          <div class="call-history">
            ${calls.length ? calls.slice(0, 8).map(c => `<div class="call-history-row"><span class="call-history-icon ${c.status === 'message' ? 'message' : c.status === 'missed' ? 'missed' : ''}">${c.status === 'message' ? '✎' : c.status === 'missed' || c.status === 'declined' ? '↙' : '↗'}</span><div><strong>${esc(callerInfo(c.caller).name)}</strong><small>${esc(c.direction)} · ${esc(c.status === 'message' ? 'Message taken' : c.status === 'transferred' ? 'Transferred' : c.status === 'declined' ? 'Declined' : c.duration || c.status)} · ${esc(relativeTeamTime(c.at))}</small>${c.note ? `<p>“${esc(c.note)}”</p>` : ''}</div></div>`).join('') : '<p class="muted-small">No calls yet.</p>'}
          </div>
        </section>
      </div>
    </div>`;
  }

  function bindCalls() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    const $$ = s => Array.from(root.querySelectorAll(s));
    $$('[data-ring-desk]').forEach(b => b.onclick = () => simulateIncoming(null));
    const answer = $('[data-answer-call]'); if (answer) answer.onclick = answerCall;
    const decline = $('[data-decline-call]'); if (decline) decline.onclick = declineCall;
    const take = $('[data-take-message]'); if (take) take.onclick = () => { instance.takingMessage = true; render(); };
    const cancelMsg = $('[data-cancel-message]'); if (cancelMsg) cancelMsg.onclick = () => { instance.takingMessage = false; instance.callMessageDraft = ''; render(); };
    const saveMsg = $('[data-save-call-message]'); if (saveMsg) saveMsg.onclick = saveCallMessage;
    const msgInput = $('#call-message'); if (msgInput) { msgInput.oninput = () => { instance.callMessageDraft = msgInput.value; }; setTimeout(() => msgInput.focus(), 50); }
    const end = $('[data-end-call]'); if (end) end.onclick = endCall;
    const transfer = $('[data-transfer-call]'); if (transfer) transfer.onclick = transferCall;
    const activeTake = $('[data-active-take-message]'); if (activeTake) activeTake.onclick = () => { instance.takingMessage = true; instance.ringing = instance.activeCall; instance.activeCall = null; render(); };
    const mute = $('[data-call-mute]'); if (mute) mute.onclick = () => { instance.callMuted = !instance.callMuted; render(); };
    const hold = $('[data-call-hold]'); if (hold) hold.onclick = () => toast('Call on hold', 'On a call, tell the caller before putting them on hold. Then come back within a minute.', { duration:3500 });
    const keypad = $('[data-call-keypad]'); if (keypad) keypad.onclick = () => toast('Keypad', 'Use the practice keypad for phone menus or extensions.', { duration:3200 });
    if (instance.callInterval) { clearInterval(instance.callInterval); instance.callInterval = null; }
    const timer = $('#call-timer');
    if (timer && instance.activeCall) {
      instance.callInterval = setInterval(() => {
        const el = instance.root && instance.root.querySelector('#call-timer');
        if (el) el.textContent = callElapsed();
      }, 1000);
    }
  }

  function simulateIncoming(template) {
    const used = new Set((Store.state.teams.calls || []).map(c => c.caller));
    let pick = template;
    if (!pick) {
      const candidates = Store.state.teams.incomingCalls || Data.incomingCalls;
      pick = candidates.find(c => !used.has(c.caller)) || candidates[Math.floor(Math.random() * candidates.length)];
    }
    instance.ringing = pick;
    instance.takingMessage = false;
    instance.callMessageDraft = '';
    instance.section = 'calls';
    render();
    Bus.emit('teams:call-ringing', { callId:pick.id, caller:pick.caller, purpose:pick.purpose });
  }

  function answerCall() {
    const call = instance.ringing;
    if (!call) return;
    instance.ringing = null;
    instance.takingMessage = false;
    instance.activeCall = Object.assign({}, call, { startedAt:new Date(), purpose:call.purpose });
    instance.callMuted = false;
    render();
    Bus.emit('teams:call-answered', { callId:call.id, caller:call.caller });
    toast('Call answered', 'Greet the caller, say who you are, and ask how you can help. In a real call, take notes.', { kind:'success', duration:4200 });
  }

  function endCall() {
    if (!instance.activeCall) return;
    const call = instance.activeCall;
    const status = 'answered';
    const duration = callElapsed();
    Store.update(s => { s.teams.calls.unshift({ id:Utils.uid('call'), caller:call.caller, direction:'incoming', at:Utils.simNowIso(), status, duration, note:'' }); });
    instance.activeCall = null;
    if (instance.callInterval) { clearInterval(instance.callInterval); instance.callInterval = null; }
    render();
    Bus.emit('teams:call-ended', { callId:call.id, caller:call.caller, status, duration });
    toast('Call ended', 'The call was logged without a message. If action is needed, add a task or send a follow-up.', { duration:3600 });
  }

  function transferCall() {
    const to = instance.root.querySelector('#transfer-to');
    if (!to || !instance.activeCall) return;
    const target = Store.contactById(to.value);
    const call = instance.activeCall;
    Store.update(s => { s.teams.calls.unshift({ id:Utils.uid('call'), caller:call.caller, direction:'incoming', at:Utils.simNowIso(), status:'transferred', duration:callElapsed(), transferredTo:target ? target.id : null, note:`Transferred to ${target ? target.name : to.value}.` }); });
    instance.activeCall = null;
    if (instance.callInterval) { clearInterval(instance.callInterval); instance.callInterval = null; }
    render();
    Bus.emit('teams:call-transferred', { callId:call.id, caller:call.caller, transferredTo:target ? target.id : null });
    toast('Call transferred', `The simulated caller was transferred to ${target ? target.name : 'a colleague'}. Always tell the caller who they are being transferred to.`, { kind:'success', duration:4300 });
  }

  function declineCall() {
    const call = instance.ringing;
    if (!call) return;
    Store.update(s => { s.teams.calls.unshift({ id:Utils.uid('call'), caller:call.caller, direction:'incoming', at:Utils.simNowIso(), status:'declined', duration:'00:00', note:'Declined.' }); });
    instance.ringing = null; instance.takingMessage = false;
    render();
    Bus.emit('teams:call-declined', { callId:call.id, caller:call.caller });
    toast('Call declined', 'The call was logged as declined. In real life, follow up if the caller matters.', { duration:3300 });
  }

  function saveCallMessage() {
    const call = instance.ringing || instance.activeCall;
    if (!call) return;
    const input = instance.root.querySelector('#call-message');
    const note = input ? input.value.trim() : (instance.callMessageDraft || '').trim();
    if (!note) { toast('Write the message', 'Include who called, what they need, and by when.', { kind:'error' }); return; }
    Store.update(s => { s.teams.calls.unshift({ id:Utils.uid('call'), caller:call.caller, direction:'incoming', at:Utils.simNowIso(), status:'message', duration:instance.activeCall ? callElapsed() : '00:00', note }); });
    instance.ringing = null; instance.activeCall = null; instance.takingMessage = false; instance.callMessageDraft = '';
    if (instance.callInterval) { clearInterval(instance.callInterval); instance.callInterval = null; }
    render();
    Bus.emit('teams:call-message', { callId:call.id, caller:call.caller, note, text:note });
    toast('Message taken', 'The call and message were saved to the call history. In a real office, send the message to the executive promptly.', { kind:'success', duration:4200 });
  }

  /* ------------------------------ meetings ------------------------------ */
  function startMeeting(event) {
    const ev = event || {
      id:Utils.uid('meet'), title:'Ad-hoc meeting', date:dateKey(simNow()), start:nowTime(), end:Utils.addMinutes(nowTime(), 30),
      tz:'America/New_York', attendees:['alexandra','daniel','priya','marcus'], teams:true, note:'Instant simulated meeting.'
    };
    instance.meeting = {
      event: ev, muted:true, camera:false, hand:false, sharing:false, panel:'chat', notes:'',
      chat:[{ id:Utils.uid('mc'), from:'daniel', text:'Can everyone see the board pack on screen?', at:Utils.simNowIso() }],
      start:Date.now()
    };
    instance.threadContext = null;
    render();
    Bus.emit('teams:meeting-joined', { eventId:ev.id, title:ev.title });
  }

  function renderMeeting() {
    const root = instance.root;
    const m = instance.meeting;
    if (!m) { render(); return; }
    if (instance.calendarController) { instance.calendarController.destroy(); instance.calendarController = null; }
    const ev = m.event;
    let attendees = (ev.attendees || []).filter(id => id !== 'me');
    if (attendees.length < 3) attendees = Array.from(new Set([...attendees, 'daniel', 'priya']));
    attendees = attendees.slice(0, 6);
    const participantCount = attendees.length + 1;
    root.innerHTML = `<div class="meeting-stage ${m.sharing ? 'sharing' : ''}">
      <header class="meeting-topbar">
        <div class="meeting-title"><span class="teams-title-mark">T</span><div><strong>${esc(ev.title)}</strong><small>${esc(fmtDate(parseISO(ev.date), 'medium'))} · ${esc(fmtTime(ev.start))} – ${esc(fmtTime(ev.end))} ${esc(Utils.timeZoneAbbr(ev.tz))}</small></div></div>
        <div class="meeting-top-right"><span class="meeting-timer" id="meeting-timer">${esc(instanceMeetingElapsed(true))}</span><span class="pill">${participantCount} participants</span><button class="icon-btn" data-meeting-help data-tip="Help for the simulated meeting room.">?</button><button class="btn danger small" data-leave-meeting data-tip="Leave the simulated meeting. Nothing is recorded.">Leave</button></div>
      </header>
      <div class="meeting-content">
        <div class="meeting-main">
          ${m.sharing ? `<div class="share-stage"><div class="share-label"><span class="live-pill"><i></i> SHARING</span><span>Elizabeth is sharing: Board pack — page 14</span><button class="btn small" data-stop-sharing>Stop sharing</button></div><div class="mock-slide"><span class="eyebrow">APPELLO · Board pack</span><h2>Project Atlas — integration update</h2><p>The Atlas integration is on track, with two workstreams remaining in validation.</p><div class="mock-chart">${[65, 78, 54, 88, 72, 92].map((n,i) => `<i style="height:${n}%;animation-delay:${i*.1}s"></i>`).join('')}</div><small>Legal-approved language · Page 14 of 42</small></div></div>` : `<div class="video-grid count-${Math.min(6, participantCount)}">
            <div class="video-tile self ${m.camera ? 'camera-on' : ''} ${m.hand ? 'hand-raised' : ''}"><div class="video-avatar">${Icons.avatar('Elizabeth Hale', 'avatar-xl', 2)}</div><span class="video-name">You (Elizabeth) ${m.muted ? '<i class="mic-muted">🔇</i>' : '<i class="mic-live">🎙</i>'}</span>${m.hand ? '<span class="hand-badge">✋</span>' : ''}</div>
            ${attendees.map((id, i) => {
              const c = contact(id) || { name:id, tone:3 };
              const speaking = i === 0;
              return `<div class="video-tile ${speaking ? 'speaking' : ''}"><div class="video-avatar">${Icons.avatar(c.name, 'avatar-xl', c.tone)}</div><span class="video-name">${esc(c.name)} ${i === 1 ? '<i class="mic-muted">🔇</i>' : ''}</span>${i === 1 ? '<span class="hand-badge">✋</span>' : ''}${speaking ? '<span class="speaking-bars"><i></i><i></i><i></i></span>' : ''}</div>`;
            }).join('')}
          </div>`}
        </div>
        ${m.panel ? `<aside class="meeting-side">
          <div class="meeting-side-tabs"><button class="${m.panel === 'chat' ? 'active' : ''}" data-meeting-panel="chat">Chat</button><button class="${m.panel === 'notes' ? 'active' : ''}" data-meeting-panel="notes">Notes</button><button class="${m.panel === 'people' ? 'active' : ''}" data-meeting-panel="people">People</button><button class="icon-btn" data-close-meeting-panel aria-label="Close panel">✕</button></div>
          ${m.panel === 'chat' ? `<div class="meeting-chat"><div class="meeting-chat-list" id="meeting-chat-list">${m.chat.map(msg => `<div class="meeting-chat-msg ${msg.from === 'me' ? 'mine' : ''}">${msg.from !== 'me' ? Icons.avatar(name(msg.from), 'avatar-sm', tone(msg.from)) : ''}<div><strong>${esc(name(msg.from))}</strong><p>${esc(msg.text)}</p><small>${esc(fmtTime(msg.at.slice(11,16)))}</small></div></div>`).join('')}</div><div class="meeting-chat-input"><input id="meeting-chat-input" class="input sm" placeholder="Send a message" aria-label="Meeting chat message"><button class="btn teams small" data-send-meeting-chat>Send</button></div></div>` : ''}
          ${m.panel === 'notes' ? `<div class="meeting-notes"><p class="muted-small">Capture decisions first, then actions with an owner and due date. Save the notes to the Notes app when you leave.</p><textarea id="meeting-notes" class="textarea" placeholder="Decisions&#10;• …&#10;&#10;Actions&#10;• [owner] — [action] — due [date]">${esc(m.notes)}</textarea><button class="btn teams small full" data-save-meeting-notes>Save notes to Notes app</button><button class="btn small full" data-insert-action-note>Insert action template</button></div>` : ''}
          ${m.panel === 'people' ? `<div class="meeting-people"><div class="meeting-person">${Icons.avatar('Elizabeth Hale', 'avatar-md', 2)}<div><strong>Elizabeth Hale</strong><small>You · Organizer</small></div><span class="pill green">Host</span></div>${attendees.map((id, i) => { const c = contact(id) || { name:id, tone:3 }; return `<div class="meeting-person">${Icons.avatar(c.name, 'avatar-md', c.tone)}<div><strong>${esc(c.name)}</strong><small>${esc(c.title || 'Attendee')}</small></div>${i === 1 ? '<span class="pill amber">Muted</span>' : '<span class="pill">Present</span>'}</div>`; }).join('')}</div>` : ''}
        </aside>` : ''}
      </div>
      <footer class="meeting-controls">
        <button class="meeting-control ${m.muted ? 'active' : ''}" data-mmute data-tip="Mute or unmute your simulated microphone. Muting is a courtesy when you are not speaking."><span>${m.muted ? '🔇' : '🎙'}</span><small>${m.muted ? 'Unmute' : 'Mute'}</small></button>
        <button class="meeting-control ${m.camera ? 'active' : ''}" data-mcamera data-tip="Turn your practice camera on or off."><span>${m.camera ? '📹' : '📷'}</span><small>Camera</small></button>
        <button class="meeting-control ${m.hand ? 'active hand' : ''}" data-mhand data-tip="Raise your hand to signal that you want to speak."><span>✋</span><small>Raise hand</small></button>
        <button class="meeting-control ${m.sharing ? 'active' : ''}" data-mshare data-tip="Simulate sharing your screen. Do not share confidential material without checking."><span>🖥</span><small>${m.sharing ? 'Stop share' : 'Share'}</small></button>
        <button class="meeting-control" data-mchat data-tip="Open the meeting chat."><span>💬</span><small>Chat</small></button>
        <button class="meeting-control" data-mnotes data-tip="Take meeting notes with decisions and actions."><span>📝</span><small>Notes</small></button>
        <button class="meeting-control" data-mpeople data-tip="See who is in the meeting."><span>👥</span><small>People</small></button>
        <button class="meeting-control leave" data-leave-meeting data-tip="Leave the simulated meeting."><span>☎</span><small>Leave</small></button>
      </footer>
    </div>`;
    bindMeeting();
    const ch = root.querySelector('#meeting-chat-list');
    if (ch) setTimeout(() => ch.scrollTop = ch.scrollHeight, 30);
    if (instance.meetingInterval) clearInterval(instance.meetingInterval);
    instance.meetingInterval = setInterval(() => {
      const el = instance.root && instance.root.querySelector('#meeting-timer');
      if (el) el.textContent = instanceMeetingElapsed(true);
    }, 1000);
  }

  function bindMeeting() {
    const root = instance.root;
    const m = instance.meeting;
    const $ = s => root.querySelector(s);
    const $$ = s => Array.from(root.querySelectorAll(s));
    const rerender = () => renderMeeting();
    $$('[data-mmute]').forEach(b => b.onclick = () => { m.muted = !m.muted; rerender(); Bus.emit('teams:meeting-muted', { muted:m.muted }); });
    $$('[data-mcamera]').forEach(b => b.onclick = () => { m.camera = !m.camera; rerender(); Bus.emit('teams:meeting-camera', { camera:m.camera }); });
    $$('[data-mhand]').forEach(b => b.onclick = () => { m.hand = !m.hand; rerender(); Bus.emit('teams:meeting-hand', { raised:m.hand }); });
    $$('[data-mshare]').forEach(b => b.onclick = () => { m.sharing = !m.sharing; rerender(); Bus.emit('teams:meeting-share', { sharing:m.sharing }); });
    $$('[data-stop-sharing]').forEach(b => b.onclick = () => { m.sharing = false; rerender(); });
    $$('[data-mchat]').forEach(b => b.onclick = () => { m.panel = 'chat'; rerender(); });
    $$('[data-mnotes]').forEach(b => b.onclick = () => { m.panel = 'notes'; rerender(); });
    $$('[data-mpeople]').forEach(b => b.onclick = () => { m.panel = 'people'; rerender(); });
    $$('[data-close-meeting-panel]').forEach(b => b.onclick = () => { m.panel = null; rerender(); });
    $$('[data-meeting-panel]').forEach(b => b.onclick = () => { m.panel = b.dataset.meetingPanel; rerender(); });
    $$('[data-leave-meeting]').forEach(b => b.onclick = () => leaveMeeting());
    const notes = $('#meeting-notes');
    if (notes) notes.oninput = () => { m.notes = notes.value; };
    const saveNotes = $('[data-save-meeting-notes]'); if (saveNotes) saveNotes.onclick = saveMeetingNotes;
    const insert = $('[data-insert-action-note]'); if (insert) insert.onclick = () => { m.notes += '\n\nActions\n• [owner] — [action] — due [date]'; rerender(); };
    const chatInput = $('#meeting-chat-input'); if (chatInput) chatInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); sendMeetingChat(); } };
    const send = $('[data-send-meeting-chat]'); if (send) send.onclick = sendMeetingChat;
    const help = $('[data-meeting-help]'); if (help) help.onclick = () => openHelp('teams');
  }

  function sendMeetingChat() {
    const input = instance.root.querySelector('#meeting-chat-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    instance.meeting.chat.push({ id:Utils.uid('mc'), from:'me', text, at:Utils.simNowIso() });
    renderMeeting();
    Bus.emit('teams:meeting-chat-sent', { text });
  }

  function saveMeetingNotes() {
    const m = instance.meeting;
    if (!m) return;
    const notesEl = instance.root.querySelector('#meeting-notes');
    if (notesEl) m.notes = notesEl.value;
    if (!m.notes.trim()) { toast('No notes to save', 'Write at least one decision or action first.', { kind:'error' }); return; }
    const note = {
      id:Utils.uid('note'), title:`${m.event.title} — meeting notes`, linkedEvent:m.event.id,
      tags:['Meeting'], pinned:false, updatedAt:Utils.simNowIso(), content:m.notes
    };
    Store.update(s => s.notes.unshift(note));
    Bus.emit('teams:meeting-notes-saved', { eventId:m.event.id, noteId:note.id, length:m.notes.length });
    toast('Notes saved', 'Find them in the Notes app, linked to this meeting.', { kind:'success' });
  }

  function leaveMeeting() {
    if (!instance.meeting) return;
    const eventId = instance.meeting.event.id;
    instance.meeting = null;
    if (instance.meetingInterval) { clearInterval(instance.meetingInterval); instance.meetingInterval = null; }
    instance.section = 'calendar';
    render();
    Bus.emit('teams:meeting-left', { eventId });
    toast('Meeting left', 'The simulated call ended. No audio or video was recorded.', { duration:3000 });
  }

  /* -------------------------------- files ------------------------------- */
  function renderFiles() {
    const files = Store.state.files.filter(f => !f.deletedAt && f.type !== 'folder');
    const filtered = files.filter(f => !instance.search || f.name.toLowerCase().includes(instance.search.toLowerCase()));
    return `<div class="teams-files-view">
      <div class="teams-files-head"><div><span class="eyebrow">Shared workspace</span><h2>Files</h2><p>Files from the executive office, travel, board, and client folders. Opening one uses Docs or Sheets.</p></div><div class="files-search"><span>⌕</span><input id="teams-files-search" type="search" value="${esc(instance.search)}" placeholder="Search files" aria-label="Search files" data-tip="Search shared file names."></div></div>
      <div class="teams-files-grid">${filtered.map(f => `<button class="team-file-card" data-open-file="${f.id}"><span class="team-file-icon ${f.type}">${f.type === 'sheet' ? '▦' : '📄'}</span><span class="team-file-copy"><strong>${esc(f.name)}</strong><small>${f.type === 'sheet' ? 'Workbook' : 'Document'} · updated ${esc(fmtDate(f.updatedAt || f.createdAt, 'medium'))}</small><span class="team-file-people">${Icons.avatar('Alexandra Morgan','avatar-sm',2)}${Icons.avatar('Elizabeth Hale','avatar-sm',2)}${Icons.avatar('Daniel Kim','avatar-sm',1)}</span></span><span class="team-file-open">Open ↗</span></button>`).join('')}</div>
    </div>`;
  }
  function bindFiles() {
    const root = instance.root;
    root.querySelectorAll('[data-open-file]').forEach(b => b.onclick = () => OS.openFile(b.dataset.openFile));
    const search = root.querySelector('#teams-files-search');
    if (search) search.oninput = debounce(() => { instance.search = search.value; render(); setTimeout(() => { const i = instance.root.querySelector('#teams-files-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length,i.value.length); } }, 0); }, 180);
  }

  /* -------------------------------- app --------------------------------- */
  const app = {
    mount(container, win, params) {
      instance = {
        root: document.createElement('div'), win, section:'chat', selectedChatId:'chat-alexandra',
        selectedTeamId:'exec-office', selectedChannelId:'exec-announcements',
        search:'', threadContext:null, threadDraft:'', draft:{}, channelDraft:{}, typing:{},
        reactPicker:null, attachOpen:false, mentionOpen:false, channelTab:'posts',
        ringing:null, activeCall:null, callInterval:null, meeting:null, meetingInterval:null,
        callMuted:false, takingMessage:false, callMessageDraft:'',
        calendarController:null
      };
      instance.root.className = 'teams-root app-fill';
      container.innerHTML = '';
      container.appendChild(instance.root);
      const saved = Store.state.teams.selectedSection || 'chat';
      instance.section = (params && params.section) || saved || 'chat';
      if (params && params.joinEventId) {
        const ev = Store.eventById(params.joinEventId);
        if (ev) { startMeeting(ev); return; }
      }
      render();
    },
    reopen(params) {
      if (!instance) return;
      if (params && params.joinEventId) {
        const ev = Store.eventById(params.joinEventId);
        if (ev) { startMeeting(ev); return; }
      }
      if (params && params.section) instance.section = params.section;
      if (params && params.chatId) { instance.section = 'chat'; instance.selectedChatId = params.chatId; }
      if (params && params.call) { simulateIncoming(null); return; }
      render();
    },
    destroy() {
      if (instance) {
        if (instance.calendarController) instance.calendarController.destroy();
        if (instance.meetingInterval) clearInterval(instance.meetingInterval);
        if (instance.callInterval) clearInterval(instance.callInterval);
      }
      instance = null;
    }
  };
  App.register('teams', app);

  window.TeamspaceApp = {
    openSection(section) { if (!OS.isOpen('teams')) OS.openApp('teams'); setTimeout(() => { if (instance) { instance.section = section; render(); } }, 120); },
    joinEvent(eventId) { if (!OS.isOpen('teams')) OS.openApp('teams', { joinEventId:eventId }); else { const ev = Store.eventById(eventId); if (ev) startMeeting(ev); } }
  };

  function instanceMeetingElapsed() {
    if (!instance || !instance.meeting) return '00:00';
    const secs = Math.floor((Date.now() - instance.meeting.start) / 1000);
    return `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
  }
  function callElapsed() {
    if (!instance || !instance.activeCall) return '00:00';
    const secs = Math.floor((Date.now() - instance.activeCall.startedAt.getTime()) / 1000);
    return `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
  }
})();
