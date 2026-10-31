/* ============================================================
   Training Hub — Learn, Practice, Test.
   21 scenarios with automatic success criteria, three-level hints,
   guided targets, scoring, skills, badges, and progress.
   ============================================================ */
(function () {
  'use strict';
  const { esc, toast, modal, confirm, Bus, fmtDate, fmtTime, simNow, dateKey, parseISO, uid, openHelp, openGlossary } = Utils;

  let hubInstance = null;
  let session = null;
  let tickTimer = null;
  let checkTimer = null;

  const SKILLS = {
    email: { label:'Executive email', icon:'✉' },
    calendar: { label:'Calendar & time zones', icon:'▦' },
    teams: { label:'Teamspace communication', icon:'💬' },
    sheets: { label:'Spreadsheets & formulas', icon:'▦' },
    docs: { label:'Documents & files', icon:'📄' },
    prioritization: { label:'Prioritisation & triage', icon:'⚑' },
    operations: { label:'Executive operations', icon:'🎯' },
    calls: { label:'Calls & messages', icon:'☎' }
  };

  const BADGES = [
    { id:'first-steps', icon:'🌱', name:'First Steps', desc:'Complete your first scenario.', test:p => completedCount(p) >= 1 },
    { id:'level-one', icon:'🎓', name:'Desk Ready', desc:'Complete every Level 1 scenario.', test:p => levelComplete(p,1) },
    { id:'inbox-tamer', icon:'📥', name:'Inbox Tamer', desc:'Complete the 15-email triage sprint.', test:p => !!p['triage-sprint']?.completed },
    { id:'calendar-keeper', icon:'📅', name:'Calendar Keeper', desc:'Complete a calendar scheduling scenario.', test:p => ['three-timezones','book-a-room','resolve-conflict','five-conflicts'].some(id => p[id]?.completed) },
    { id:'conflict-resolver', icon:'🧩', name:'Conflict Resolver', desc:'Resolve a real scheduling conflict.', test:p => ['resolve-conflict','five-conflicts'].some(id => p[id]?.completed) },
    { id:'teams-ready', icon:'💬', name:'Teamspace Professional', desc:'Complete a Teamspace communication scenario.', test:p => ['teams-reply','take-a-message'].some(id => p[id]?.completed) },
    { id:'formula-fixer', icon:'ƒ', name:'Formula Fixer', desc:'Complete a spreadsheet repair or budget scenario.', test:p => ['spreadsheet-basics','three-city-budget','expense-audit'].some(id => p[id]?.completed) },
    { id:'board-ready', icon:'🏛', name:'Board-Ready', desc:'Assemble the board pack.', test:p => !!p['board-pack']?.completed },
    { id:'five-star', icon:'⭐', name:'Five-Star EA', desc:'Earn 90+ in any mode.', test:p => Object.values(p).some(x => (x.bestScore || 0) >= 90) },
    { id:'test-champion', icon:'🏆', name:'Test Champion', desc:'Earn 80+ in a timed test.', test:p => Object.values(p).some(x => (x.testBest || 0) >= 80) },
    { id:'zero-inbox', icon:'0', name:'CEO Inbox Zero', desc:'Complete the CEO inbox-zero scenario.', test:p => !!p['inbox-zero']?.completed },
    { id:'all-rounder', icon:'👑', name:'Complete EA', desc:'Complete all 21 scenarios.', test:p => completedCount(p) >= 21 }
  ];

  /* ------------------------- shared check helpers ----------------------- */
  function S() { return Store.state; }
  function logs(session, type) {
    if (!session) return [];
    return (S().training.actionLog || []).filter(a => a.type === type && a.at >= session.startedAtIso);
  }
  function logDetail(session, type, key, value) {
    return logs(session, type).map(a => a.detail || {}).filter(d => d[key] === value);
  }
  function unique(arr) { return Array.from(new Set(arr.filter(Boolean))); }
  function createdEvents(session) {
    const ids = unique(logs(session, 'calendar:event-created').map(x => x.detail.eventId));
    return ids.map(id => Store.eventById(id)).filter(Boolean);
  }
  function sentSince(session) {
    const ids = unique(logs(session, 'mail:sent').map(x => x.detail.emailId));
    return ids.map(id => Store.emailById(id)).filter(Boolean);
  }
  function editedCells(session, wbId, sheetName) {
    return logs(session, 'sheet:cell-edited').map(x => x.detail).filter(d => d.workbookId === wbId && (!sheetName || d.sheetName === sheetName));
  }
  function currentWb(id) { return Store.workbookById(id); }
  function cellRaw(wbId, sheetName, addr) {
    const wb = currentWb(wbId);
    return wb && wb.sheets[sheetName] && wb.sheets[sheetName].cells[addr] ? String(wb.sheets[sheetName].cells[addr].v || '') : '';
  }
  function sheetValue(wbId, sheetName, addr) {
    const wb = currentWb(wbId);
    if (!wb || !wb.sheets[sheetName]) return '';
    const computed = SheetEngine.evaluateSheet(wb.sheets[sheetName]);
    return computed[addr] ? computed[addr].value : '';
  }
  function anyFormulaError(wbId, sheetName) {
    const wb = currentWb(wbId);
    if (!wb || !wb.sheets[sheetName]) return false;
    const computed = SheetEngine.evaluateSheet(wb.sheets[sheetName]);
    return Object.values(computed).some(c => c.error);
  }
  function eventConflictFree(ev) {
    return !S().calendar.events.some(other => other.id !== ev.id && Utils.eventsOverlap(ev, other));
  }
  function eventAttendeeTimezones(ev) {
    return unique((ev.attendees || []).filter(id => id !== 'me').map(id => (Store.contactById(id) || {}).timezone));
  }
  function durationMins(ev) { return Utils.minutesBetween(ev.start, ev.end); }
  function isGreeting(text) { return /^(hi|hello|dear|good morning|good afternoon|good evening)\b[\s,]/i.test(String(text || '').trim()); }
  function professionalSent(e) { return e && e.subject && e.subject.trim() && isGreeting(e.body); }
  function inFolder(folderId) { return S().mail.emails.filter(e => e.folder === folderId); }
  function readIdsSince(session) {
    return unique(logs(session, 'mail:read').map(x => x.detail.emailId));
  }
  function triageActionsSince(session) {
    return unique([
      ...logs(session, 'mail:flagged').map(x => x.detail.emailId),
      ...logs(session, 'mail:archived').map(x => x.detail.emailId),
      ...logs(session, 'mail:moved').map(x => x.detail.emailId)
    ]);
  }
  function allDone(session) {
    const sc = scenarios.find(x => x.id === session.scenarioId);
    return sc.criteria.every(c => { try { return !!c.check(session); } catch (e) { return false; } });
  }
  function criteriaState(session) {
    const sc = scenarios.find(x => x.id === session.scenarioId);
    return sc.criteria.map(c => ({ ...c, met: (() => { try { return !!c.check(session); } catch (e) { return false; } })() }));
  }

  /* ------------------------------ scenarios ----------------------------- */
  const scenarios = [
    {
      id:'clock-in', level:1, title:'Clock In & Open Your Desk', app:'training', minutes:7, testMinutes:6, xp:60,
      skills:['operations'], icon:'🌅',
      summary:'Sign in for your simulated shift, open Mail, and learn where the help and glossary live.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'Start your shift and find the tools you will use today.', due:'Before the 09:30 desk review.' },
      setup(){},
      learn:[
        { title:'Open the Start menu', why:'Start is the front door to every app and to your training account. Windows EAs use it constantly.', target:'#start-button, [data-action="training-hub"]', check:() => !!logs(session,'ui:start-opened').length || !!logs(session,'ui:account-opened').length },
        { title:'Open your account panel', why:'Your account shows whether the shift has started. In a real role, this is where you confirm you are signed in.', target:'#account-menu-button', check:() => !!logs(session,'ui:account-opened').length || !!document.querySelector('#account-panel:not([hidden])') },
        { title:'Open the shift sign-in', why:'The sign-in panel confirms who is on duty for the training shift.', target:'[data-action="sign-in"]', check:() => !Store.state.signedIn && !!document.querySelector('.modal-overlay .modal-title, .modal-overlay [data-signin]') },
        { title:'Sign in as Elizabeth Hale', why:'A shift sign-in is the moment you take responsibility for the executive office. Use the training sign-in.', target:'[data-signin]', check:() => Store.state.signedIn },
        { title:'Open Mail from the desktop', why:'Mail is the record of decisions and commitments. Open it before the executive needs something.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => !!logs(session,'app:opened').find(x => x.detail.appId === 'mail') || OS.isOpen('mail') },
        { title:'Open the glossary', why:'You are not expected to know office jargon. Use the glossary whenever a term is unfamiliar — asking is a professional skill.', target:'[data-action="glossary"]', check:() => !!logs(session,'help:glossary-opened').length }
      ],
      criteria:[
        { id:'signed-in', label:'Sign in for the simulated shift.', check:() => Store.state.signedIn },
        { id:'mail-open', label:'Open Mail.', check:() => OS.isOpen('mail') || !!logs(session,'app:opened').find(x => x.detail.appId === 'mail') },
        { id:'glossary', label:'Open the glossary at least once.', check:() => !!logs(session,'help:glossary-opened').length }
      ],
      hints:[
        'Start from the bottom of the screen. The Windows logo is the Start button.',
        'Open Start → click the account chip at the bottom left → Sign in. Then double-click Mail on the desktop, and click Glossary in the amber training banner.',
        '1. Click Start. 2. Click “Elizabeth Hale — Training EA.” 3. Click “Sign in for today’s shift.” 4. Close the account panel. 5. Double-click Mail. 6. Click Glossary in the top banner.'
      ],
      next:'Read the CEO’s board-pack brief.'
    },
    {
      id:'ceo-brief', level:1, title:'Read the CEO’s Brief', app:'mail', minutes:6, testMinutes:6, xp:70,
      skills:['email','prioritization'], icon:'📌',
      summary:'Find Alexandra’s high-priority board-pack email, read it, and keep it flagged for follow-up.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'Read the board-pack brief and mark it so you do not lose it.', due:'Today, before 09:30.' },
      setup(){ Store.update(s => { const m = s.mail.emails.find(e => e.id === 'm01'); if (m) { m.read = false; m.flagged = false; m.folder = 'inbox'; } }); },
      learn:[
        { title:'Open Mail', why:'The executive’s brief is in the shared mailbox. Start with the source, not a summary someone else wrote.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Open Alexandra’s board-pack email', why:'Read for the three decisions and the deadline. Do not skim only the first line.', target:'[data-email="m01"]', check:() => !!logs(session,'mail:read').find(x => x.detail.emailId === 'm01') },
        { title:'Flag it for follow-up', why:'A flag is your private memory aid. It tells no one else, but it keeps important work visible.', target:'[data-flag-email]', check:() => { const m = Store.emailById('m01'); return !!(m && m.flagged) && !!logs(session,'mail:flagged').find(x => x.detail.emailId === 'm01'); } }
      ],
      criteria:[
        { id:'read-ceo', label:'Open and read Alexandra’s board-pack email.', check:() => !!logs(session,'mail:read').find(x => x.detail.emailId === 'm01') },
        { id:'flag-ceo', label:'Flag the board-pack email for follow-up.', check:() => { const m = Store.emailById('m01'); return !!(m && m.flagged) && !!logs(session,'mail:flagged').find(x => x.detail.emailId === 'm01'); } }
      ],
      hints:[
        'Look for the unread email from Alexandra Morgan near the top of the inbox.',
        'Click the email with subject “Board pack: final pass before Thursday.” Read it, then click the flag icon in the reading-pane toolbar.',
        'Open Mail → Inbox → click Alexandra’s “Board pack: final pass before Thursday” → click the ⚑ flag button at the top right of the reading pane.'
      ],
      next:'Send a professional email.'
    },
    {
      id:'send-email', level:1, title:'Send a Professional Email', app:'mail', minutes:8, testMinutes:8, xp:80,
      skills:['email'], icon:'✉',
      summary:'Compose a clear, polite email to Alexandra with a specific subject, greeting, next step, and correct recipient.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'Email me your one-line status on the board pack. I need it before 15:00.', due:'Today at 15:00.' },
      setup(){},
      learn:[
        { title:'Open Mail', why:'Email is still the formal record for decisions and confirmations. Chat is for coordination; email is for accountability.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Start a new email', why:'Use a new message for a new topic. A clear subject line helps the executive triage the day.', target:'[data-compose]', check:() => !!document.querySelector('#compose-form') },
        { title:'Write the email and send it', why:'Lead with the decision, name the deadline, and make the next action obvious. Then check the etiquette panel before sending.', target:'#compose-form, [data-send-email]', check:() => sentSince(session).some(e => e.to.includes('alexandra.morgan@appello.com') && professionalSent(e)) }
      ],
      criteria:[
        { id:'to-ceo', label:'Send an email to alexandra.morgan@appello.com.', check:() => sentSince(session).some(e => e.to.map(x => x.toLowerCase()).includes('alexandra.morgan@appello.com') && e.subject.trim()) },
        { id:'professional', label:'Include a greeting and a subject that states the topic.', check:() => sentSince(session).some(e => e.to.map(x => x.toLowerCase()).includes('alexandra.morgan@appello.com') && professionalSent(e)) }
      ],
      hints:[
        'Click New email. Put Alexandra in To, add a real subject, then open with “Hi Alexandra,”.',
        'Use a subject such as “Board pack status — on track.” In the body: greeting, the one-line status, the risk or decision, and a specific next step by 15:00.',
        '1. New email. 2. To: alexandra.morgan@appello.com. 3. Subject: Board pack status — on track. 4. Body: “Hi Alexandra,\\n\\nThe board pack is on track for Wednesday 17:00. Clara’s written approval is the only open item; I will flag it by 15:00 if it slips.\\n\\nBest regards,\\nElizabeth”. 5. Click Send.'
      ],
      next:'Reply professionally in Teamspace.'
    },
    {
      id:'teams-reply', level:1, title:'Reply Like a Pro in Teamspace', app:'teams', minutes:6, testMinutes:6, xp:70,
      skills:['teams'], icon:'💬',
      summary:'Open a chat, read the context, and send a clear, useful reply that acknowledges the ask and states a next step.',
      brief:{ from:'Naomi Brooks, Head of People', ask:'Confirm how you will protect the confidential people update.', due:'Today.' },
      setup(){},
      learn:[
        { title:'Open Teamspace', why:'Teamspace is where daily coordination happens. Chat is faster than email, but decisions still need a record.', target:'[data-desktop-app="teams"], [data-taskbar-app="teams"]', check:() => OS.isOpen('teams') },
        { title:'Open the chat with Naomi Brooks', why:'Read the context before replying. A quick reply that ignores the actual ask creates more work.', target:'[data-chat="chat-naomi"]', check:() => !!logs(session,'teams:chat-opened').find(x => x.detail.chatId === 'chat-naomi') || !!document.querySelector('.convo-head h3') && document.querySelector('.convo-head h3').textContent.includes('Naomi') },
        { title:'Send a professional reply', why:'Acknowledge the request, state the action you will take, and keep it short. Use @ only if someone needs to act.', target:'#teams-composer, [data-send-chat]', check:() => !!logs(session,'teams:message-sent').find(x => x.detail.chatId === 'chat-naomi' && String(x.detail.text || '').length >= 12) }
      ],
      criteria:[
        { id:'sent-teams', label:'Send a substantive reply in a Teamspace chat.', check:() => !!logs(session,'teams:message-sent').find(x => String(x.detail.text || '').trim().length >= 12) },
        { id:'context', label:'Reply in a chat with a teammate (Naomi’s chat recommended).', check:() => !!logs(session,'teams:message-sent').find(x => (x.detail.chatId || '').includes('naomi')) || !!logs(session,'teams:message-sent').length }
      ],
      hints:[
        'Open Teamspace, then click the Naomi Brooks chat on the left.',
        'Reply with two parts: what you will do, and when the person will hear from you. For Naomi: “I’ll keep it in the exec folder and limit access to Alexandra and me.”',
        'Open Teamspace → Chat → Naomi Brooks → type: “Understood. I’ll keep the people update in the executive folder and limit access to Alexandra and me. I’ll confirm once it is filed.” → Send.'
      ],
      next:'Open and save a spreadsheet.'
    },
    {
      id:'spreadsheet-basics', level:1, title:'Open & Save a Spreadsheet', app:'sheets', minutes:9, testMinutes:9, xp:80,
      skills:['sheets'], icon:'▦',
      summary:'Open the Executive Expense Report, change one actual cost, watch the SUM total recalculate and the chart redraw, then save.',
      brief:{ from:'Marcus Chen, CFO', ask:'Update the airfare actual to $9,000 and confirm the total recalculates.', due:'Before the Q4 expense cut-off.' },
      setup(){},
      learn:[
        { title:'Open Sheets', why:'Spreadsheets are the source of truth for budgets. Formula errors become board-level errors if no one checks.', target:'[data-desktop-app="sheets"], [data-taskbar-app="sheets"]', check:() => OS.isOpen('sheets') },
        { title:'Open the Executive Expense Report template', why:'Start from the right workbook. Working in the wrong version creates duplicate numbers.', target:'[data-template-gallery]', check:() => Store.state.activeWorkbookId === 'wb-expenses' },
        { title:'Change the airfare actual and save', why:'Use the formula bar or type directly into E2. The SUM in D11 and the chart should update instantly. Then save so the file has a new modified date.', target:'#formula-input, [data-save-sheet]', check:() => editedCells(session,'wb-expenses').length > 0 && !!logs(session,'sheet:saved').find(x => x.detail.workbookId === 'wb-expenses') }
      ],
      criteria:[
        { id:'edited', label:'Edit a cell in the Executive Expense Report.', check:() => editedCells(session,'wb-expenses').length > 0 },
        { id:'sum', label:'Keep the SUM total formula in D11 and E11.', check:() => cellRaw('wb-expenses','Expenses','D11').startsWith('=SUM(') && cellRaw('wb-expenses','Expenses','E11').startsWith('=SUM(') },
        { id:'saved', label:'Save the workbook.', check:() => !!logs(session,'sheet:saved').find(x => x.detail.workbookId === 'wb-expenses') }
      ],
      hints:[
        'Open Sheets and choose the Executive Expense Report from Templates. Select E2 — the airfare actual.',
        'In E2, type 9000 and press Enter. Watch D11 and E11 recalculate. Then click Save in the top-right.',
        'Open Sheets → Templates → Executive Expense Report. Click cell E2, type 9000, press Enter. Click Save. The total and the bar chart recalculate automatically.'
      ],
      next:'Create your first calendar event.'
    },
    {
      id:'calendar-event', level:1, title:'Create a Calendar Event', app:'mail', minutes:8, testMinutes:8, xp:80,
      skills:['calendar'], icon:'▦',
      summary:'Open the executive calendar and create a conflict-free meeting with a room and a clear title.',
      brief:{ from:'Daniel Kim, Chief of Staff', ask:'Put a 30-minute board-pack review on Tuesday at 3:00 PM in Boardroom B.', due:'Today.' },
      setup(){},
      learn:[
        { title:'Open the calendar', why:'The calendar is part of Mail. Every external meeting should have an owner, an agenda, and a room or link.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Open Calendar', why:'Check the executive’s day before adding anything. A conflict is easier to prevent than to undo.', target:'[data-mail-view="calendar"]', check:() => !!document.querySelector('#mail-calendar .calendar-app') },
        { title:'Create the meeting', why:'Use a specific title, a real room, and a conflict-free time. The app checks Alexandra’s calendar and the room.', target:'[data-cal-new]', check:() => !!document.querySelector('#event-form') || !!logs(session,'calendar:event-created').length },
        { title:'Save the meeting', why:'A meeting that is not saved is only a plan. Confirm it belongs on the calendar.', target:'[data-save-event], [data-cal-new]', check:() => !!logs(session,'calendar:event-created').find(x => { const ev = Store.eventById(x.detail.eventId); return ev && ev.title && ev.start && ev.end; }) }
      ],
      criteria:[
        { id:'created', label:'Create a new calendar event with a title and time.', check:() => !!logs(session,'calendar:event-created').find(x => { const ev = Store.eventById(x.detail.eventId); return ev && ev.title && ev.start && ev.end; }) },
        { id:'safe', label:'The new event must not double-book Alexandra.', check:() => !!logs(session,'calendar:event-created').find(x => { const ev = Store.eventById(x.detail.eventId); return ev && eventConflictFree(ev); }) }
      ],
      hints:[
        'Open Mail → Calendar → New meeting. Check the day before choosing a time.',
        'Use Tuesday, November 10 at 3:00 PM for 30 minutes. The budget review ends at 3:00, so this is conflict-free. Add Boardroom B and an agenda.',
        'Mail → Calendar → New meeting. Title: “Board pack review.” Date: 2026-11-10, 15:00–15:30. Room: Boardroom B. Attendees: Alexandra and Daniel. Teamspace link optional. Add an agenda. Save.'
      ],
      next:'Triage the executive inbox.'
    },

    {
      id:'triage-sprint', level:2, title:'Inbox Triage Sprint', app:'mail', minutes:20, testMinutes:20, xp:130,
      skills:['email','prioritization'], icon:'📥',
      summary:'Read at least 15 emails, take 5 meaningful triage actions, and clear every unread message from the CEO.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'Triage the overnight inbox before the desk review. I do not want to see 40 unread messages.', due:'In 20 minutes.' },
      setup(){},
      learn:[
        { title:'Open Mail', why:'Triage is a physical routine: read, decide, and move. Do not let email sit in a maybe pile.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Read five messages', why:'Reading is not the same as acting. Open the message, identify the ask, then make a decision.', target:'#mail-list', check:() => readIdsSince(session).length >= 5 },
        { title:'Flag or archive three messages', why:'Flag if you must return; archive if it is finished. Every message should leave the inbox with a decision.', target:'[data-flag-email], [data-archive-email]', check:() => triageActionsSince(session).length >= 3 },
        { title:'Finish the triage', why:'Aim for 15 reads across the inbox, 5 actions, and zero unread mail from Alexandra. The coach tracks each count.', target:'#mail-list', check:() => allDone(session) }
      ],
      criteria:[
        { id:'read15', label:'Read at least 15 distinct emails.', check:() => readIdsSince(session).length >= 15 },
        { id:'act5', label:'Flag, archive, or file at least 5 emails.', check:() => triageActionsSince(session).length >= 5 },
        { id:'ceo-zero', label:'Leave zero unread inbox emails from Alexandra.', check:() => !S().mail.emails.some(e => e.folder === 'inbox' && !e.read && e.from.email === 'alexandra.morgan@appello.com') }
      ],
      hints:[
        'Start with Alexandra, then clients, then vendors. Read one message, make one decision, move on.',
        'Click each email to mark it read. Use the flag button for follow-ups and the archive button for FYI messages. Use the “Mark all read” check at the top of the list only for the CEO’s mail if you have read the important ones.',
        'Open Mail. Read at least 15 emails. Flag urgent follow-ups and archive low-priority notices. When you see Alexandra’s emails, open each one (or use the ✓ Mark all read button) so none remain unread. Check the counts in the Training panel.'
      ],
      next:'Schedule across three time zones.'
    },
    {
      id:'three-timezones', level:2, title:'Schedule Across Three Time Zones', app:'mail', minutes:12, testMinutes:12, xp:140,
      skills:['calendar','operations'], icon:'🌍',
      summary:'Create a 45-minute Teamspace meeting with attendees in at least three different time zones, with no calendar conflict.',
      brief:{ from:'Priya Raman, VP Operations', ask:'Set up a 45-minute Q4 planning call with Marcus in San Francisco and me in London. Nothing before 11:00 New York.', due:'Today, for Wednesday.' },
      setup(){},
      learn:[
        { title:'Open Calendar', why:'Time zones are a calendar problem, not a memory problem. Use the conversion display in the meeting form.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Open the calendar and start a meeting', why:'Add the attendees first; the local-time chips show whether the meeting is reasonable for each person.', target:'[data-mail-view="calendar"], [data-cal-new]', check:() => !!document.querySelector('#mail-calendar .calendar-app') || !!document.querySelector('#event-form') },
        { title:'Choose a time and save', why:'Aim for a slot inside the working day for New York, San Francisco, and London. Use the Free time helper if you are unsure.', target:'#ev-start, [data-save-event]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'three-zones', label:'Create an event with attendees across at least 3 time zones.', check:() => createdEvents(session).some(ev => eventAttendeeTimezones(ev).length >= 3) },
        { id:'duration', label:'Set the meeting to 45–60 minutes.', check:() => createdEvents(session).some(ev => [45,60].includes(durationMins(ev)) && eventAttendeeTimezones(ev).length >= 3) },
        { id:'conflict-free', label:'The new event must be conflict-free.', check:() => createdEvents(session).some(ev => eventConflictFree(ev) && eventAttendeeTimezones(ev).length >= 3) }
      ],
      hints:[
        '11:00 New York is 08:00 San Francisco and 16:00 London. That works for all three. Check the local-time chips.',
        'Create the meeting on Wednesday, November 11 at 11:00 New York time for 45 minutes. Add Alexandra, Marcus (San Francisco), and Priya (London). Use a Teamspace link.',
        'Mail → Calendar → New meeting. Title “Q4 planning.” Date 2026-11-11, 11:00–11:45 ET. Attendees: Alexandra, Marcus Chen, Priya Raman. Add Teamspace. The form shows 08:00 San Francisco and 16:00 London. Save.'
      ],
      next:'Book a room without creating a conflict.'
    },
    {
      id:'book-a-room', level:2, title:'Book a Room', app:'mail', minutes:10, testMinutes:10, xp:120,
      skills:['calendar','operations'], icon:'🚪',
      summary:'Book a real room for a 30-minute meeting at 3:00 PM Tuesday, with the right attendees and no room conflict.',
      brief:{ from:'Ben Carter, Facilities Lead', ask:'Reserve a room for the board-pack review on Tuesday at 3:00 PM. Do not double-book the room or Alexandra.', due:'Today.' },
      setup(){},
      learn:[
        { title:'Open the calendar', why:'A room booking is only useful if the executive and the room are both free.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Start a new meeting', why:'The room selector checks capacity, video, and availability. Do not type a room name into a note; reserve it.', target:'[data-mail-view="calendar"], [data-cal-new]', check:() => !!document.querySelector('#event-form') },
        { title:'Choose Boardroom B and save', why:'Set the time, add the room, and watch for the green “No conflict” confirmation before saving.', target:'#ev-room, [data-save-event]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'room-event', label:'Create a Tuesday 3:00 PM event with a room selected.', check:() => createdEvents(session).some(ev => ev.date === '2026-11-10' && ev.start === '15:00' && ev.room) },
        { id:'no-conflict', label:'The time must be free for Alexandra and the room.', check:() => createdEvents(session).some(ev => ev.date === '2026-11-10' && ev.start === '15:00' && ev.room && eventConflictFree(ev)) },
        { id:'attendees', label:'Include at least Alexandra and one other attendee.', check:() => createdEvents(session).some(ev => ev.date === '2026-11-10' && ev.start === '15:00' && ev.room && (ev.attendees || []).length >= 2) }
      ],
      hints:[
        'The 3:00 PM slot on Tuesday is free because the budget review ends at 3:00.',
        'New meeting → November 10, 15:00–15:30 → Room: Boardroom B → add Alexandra and Daniel Kim. Look for the green no-conflict panel.',
        'Mail → Calendar → New meeting. Title “Board-pack review.” Date 2026-11-10. Start 15:00, end 15:30. Room Boardroom B. Attendees Alexandra and Daniel. Confirm the green no-conflict message. Save.'
      ],
      next:'Resolve a calendar conflict.'
    },
    {
      id:'resolve-conflict', level:2, title:'Resolve a Calendar Conflict', app:'mail', minutes:10, testMinutes:10, xp:130,
      skills:['calendar','prioritization'], icon:'⚔',
      summary:'Find the overlapping legal review and board pre-read, then reschedule one without creating a new conflict.',
      brief:{ from:'Clara Jensen, General Counsel', ask:'My legal review overlaps the board pre-read. Move one of them and tell me where to be.', due:'Before Tuesday.' },
      setup(){},
      learn:[
        { title:'Open the calendar', why:'A conflict is a decision problem. Identify what must happen live and what can move.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Open the legal review meeting', why:'Click a conflict to see who is affected. Do not move an executive meeting without knowing the attendees.', target:'[data-event-id="evt-legal-review"]', check:() => !!document.querySelector('#event-form') || !!document.querySelector('.event-detail-grid') || !!logs(session,'calendar:event-updated').find(x => x.detail.eventId === 'evt-legal-review') },
        { title:'Move it to 1:30 PM', why:'The client lunch ends at 1:30 and the budget review starts at 2:00. A 30-minute legal review fits cleanly between them.', target:'[data-edit-event], #ev-start', check:() => { const a = Store.eventById('evt-legal-review'), b = Store.eventById('evt-board-preread'); return a && b && !Utils.eventsOverlap(a,b); } }
      ],
      criteria:[
        { id:'no-overlap', label:'The legal review no longer overlaps the board pre-read.', check:() => { const a = Store.eventById('evt-legal-review'), b = Store.eventById('evt-board-preread'); return a && b && !Utils.eventsOverlap(a,b); } },
        { id:'updated', label:'Update or delete the conflicting event.', check:() => !!logs(session,'calendar:event-updated').find(x => x.detail.eventId === 'evt-legal-review') || !!logs(session,'calendar:event-deleted').find(x => x.detail.eventId === 'evt-legal-review') },
        { id:'safe', label:'The legal review must not create a new conflict.', check:() => { const a = Store.eventById('evt-legal-review'); return a ? eventConflictFree(a) : true; } }
      ],
      hints:[
        'Open Tuesday, Nov 10. Look for the red conflict between the board pre-read and the legal review.',
        'Click the legal review and choose Edit. Move it to 13:30–14:00, between the client lunch and the budget review.',
        'Mail → Calendar → Week view → click “Legal review — Atlas disclosure” → Edit → date 2026-11-10, start 13:30, end 14:00 → Save. The green no-conflict message confirms the fix.'
      ],
      next:'Handle an incoming call.'
    },
    {
      id:'take-a-message', level:2, title:'Take a Professional Message', app:'teams', minutes:8, testMinutes:8, xp:110,
      skills:['calls','teams'], icon:'☎',
      summary:'Receive a simulated call, take a useful message with the caller, the ask, and the next step, and save it.',
      brief:{ from:'Front desk (simulated)', ask:'A caller needs Alexandra. Answer, transfer, or take a message that she can act on.', due:'While the call is ringing.' },
      setup(){},
      learn:[
        { title:'Open Teamspace Calls', why:'A call is a live commitment. Capture it immediately; memory is not a system.', target:'[data-desktop-app="teams"], [data-taskbar-app="teams"]', check:() => OS.isOpen('teams') },
        { title:'Ring your desk', why:'In this scenario you start the incoming call.', target:'[data-section="calls"]', check:() => !!document.querySelector('.calls-view') },
        { title:'Answer or take a message', why:'A useful message names the caller, the ask, and the deadline. Never promise an outcome you cannot approve.', target:'[data-ring-desk]', check:() => !!logs(session,'teams:call-message').length || !!logs(session,'teams:call-answered').length || !!logs(session,'teams:call-transferred').length },
        { title:'Save a useful message', why:'Write the caller, the request, the deadline, and a call-back number if relevant. Then send it to the executive promptly.', target:'[data-save-call-message], [data-take-message]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'message', label:'Answer, transfer, or take a message of at least 15 characters.', check:() => !!logs(session,'teams:call-message').find(x => String(x.detail.note || '').length >= 15) || !!logs(session,'teams:call-answered').length || !!logs(session,'teams:call-transferred').length },
        { id:'note', label:'If you took a message, include the caller and a next step.', check:() => !!logs(session,'teams:call-message').find(x => String(x.detail.note || '').length >= 25) || !!logs(session,'teams:call-answered').length || !!logs(session,'teams:call-transferred').length }
      ],
      hints:[
        'Open Teamspace → Calls → Ring my desk. Then choose Take message.',
        'Write: who called, what they need, the deadline, and how to reach them. For example: “Isabel Rossi called. Flight moved; she can do 3:00 PM Tuesday. Please confirm.”',
        'Teamspace → Calls → Ring my desk → Take message → enter: “Isabel Rossi called about Tuesday coffee. Her flight moved and she can now do 3:00 PM. Please confirm with Alexandra and call her back.” → Save message.'
      ],
      next:'Build a task list that reflects real priorities.'
    },
    {
      id:'task-list', level:2, title:'Build a Task List', app:'todo', minutes:9, testMinutes:9, xp:110,
      skills:['prioritization'], icon:'✅',
      summary:'Create three tasks with real due dates and priorities, and commit at least one to My Day.',
      brief:{ from:'Daniel Kim, Chief of Staff', ask:'Get the open board tasks out of your head and into a tracked list with due dates.', due:'Before you leave today.' },
      setup(){},
      learn:[
        { title:'Open Tasks', why:'A task list is external memory. If it is not written down with a due date, it is a hope.', target:'[data-desktop-app="todo"], [data-taskbar-app="todo"]', check:() => OS.isOpen('todo') },
        { title:'Add a task', why:'Start with a verb and a deliverable. Then set a due date and a priority that means something.', target:'[data-new-task]', check:() => !!document.querySelector('#task-title') || !!logs(session,'todo:created').length },
        { title:'Add three prioritized tasks', why:'High priority should be reserved for real deadlines or risk. At least one task should be in My Day.', target:'[data-new-task], #quick-task', check:() => allDone(session) }
      ],
      criteria:[
        { id:'three', label:'Create at least three tasks.', check:() => unique(logs(session,'todo:created').map(x => x.detail.taskId)).length >= 3 },
        { id:'dated', label:'Every new task has a due date and a priority.', check:() => { const ids = unique(logs(session,'todo:created').map(x => x.detail.taskId)); const tasks = ids.map(id => Store.state.todos.find(t => t.id === id)).filter(Boolean); return tasks.length >= 3 && tasks.every(t => t.due && t.priority); } },
        { id:'myday', label:'Add at least one task to My Day.', check:() => unique(logs(session,'todo:created').map(x => x.detail.taskId)).some(id => { const t = Store.state.todos.find(x => x.id === id); return t && t.myDay; }) }
      ],
      hints:[
        'Use Add task for each item. A useful title starts with a verb: “Confirm,” “Send,” “Approve.”',
        'Create: Confirm Clara’s written approval (today, high, Board); Confirm Fiona’s dinner count (tomorrow, high, Event); Replace the covenant page (tomorrow, medium, Board). Put the first one in My Day.',
        'Tasks → Add task three times with those titles, due dates, priorities, and categories. Check “Commit to this today” for at least one, then save.'
      ],
      next:'Turn meeting notes into a follow-up email.'
    },
    {
      id:'follow-up-notes', level:2, title:'Follow Up from Notes', app:'notes', minutes:11, testMinutes:11, xp:120,
      skills:['docs','email','teams'], icon:'🔁',
      summary:'Create a meeting-linked note and send a follow-up email whose subject or body references the actions.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'Capture the board pre-read decisions, then send the follow-up. Do not leave it in your notebook.', due:'Within 24 hours of the meeting.' },
      setup(){},
      learn:[
        { title:'Open Notes', why:'Meeting notes are only useful if the decisions and actions survive the meeting. Link the note to the event.', target:'[data-desktop-app="notes"], [data-taskbar-app="notes"]', check:() => OS.isOpen('notes') },
        { title:'Create and link a note', why:'A linked note gives the next person the meeting context without hunting. Include decisions, owners, and dates.', target:'[data-new-note]', check:() => !!logs(session,'note:created').length || !!logs(session,'note:saved').find(x => x.detail.linkedEvent) },
        { title:'Send the follow-up', why:'Email is the formal record. Summarize decisions first, then the action list with owners and dates.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'note', label:'Create or save a note linked to a meeting.', check:() => !!logs(session,'note:created').length || !!logs(session,'note:saved').find(x => x.detail.linkedEvent) },
        { id:'email', label:'Send a follow-up email referencing the actions.', check:() => sentSince(session).some(e => /follow[- ]?up|action/i.test(e.subject + ' ' + e.body)) }
      ],
      hints:[
        'Create a note from the board pre-read. Put decisions first, then actions with owners and due dates.',
        'Link the note to “Board pre-read with Liam & Clara.” Then email the attendees with a subject such as “Board pre-read — actions and owners.”',
        'Notes → New note → title “Board pre-read actions” → link to the Nov 10 board pre-read → write decisions and actions → save. Then Mail → New email → To Daniel and Liam → subject “Board pre-read — actions and owners” → summarize the decisions and list each owner/date.'
      ],
      next:'Manage the five-conflict executive day.'
    },

    {
      id:'five-conflicts', level:3, title:'The Five-Conflict Executive Day', app:'mail', minutes:25, testMinutes:25, xp:180,
      skills:['calendar','prioritization','operations'], icon:'🧩',
      summary:'Resolve all five overlapping pairs in a simulated executive day without deleting the day’s work.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'I have five clashes on December 2. Fix the day. Do not simply delete my meetings.', due:'Before the end of the day.' },
      setup(){
        const base = [
          ['s14-1','APAC market briefing','08:30','09:30','focus-1','Focus Room 1',['alexandra','takeshi']],
          ['s14-2','Investor pre-call','09:00','09:45',null,'Teamspace',['alexandra','ahmed']],
          ['s14-3','Client strategy review','10:00','11:00','boardroom-a','Boardroom A',['alexandra','isabel','daniel']],
          ['s14-4','Legal catch-up','10:30','11:15','boardroom-b','Boardroom B',['alexandra','clara']],
          ['s14-5','Lunch with board chair','12:00','13:00','glasshouse','The Glasshouse',['alexandra','elena']],
          ['s14-6','Vendor contract call','12:30','13:15',null,'Teamspace',['alexandra','fiona','aisha']],
          ['s14-7','Budget deep dive','14:00','15:00','exec-suite','Executive Suite',['alexandra','marcus']],
          ['s14-8','Helio RFP final review','14:30','15:30',null,'Teamspace',['alexandra','priya','mei']],
          ['s14-9','Travel handover','16:00','16:30','focus-1','Focus Room 1',['alexandra','me','aisha']],
          ['s14-10','Gala seating review','16:15','16:45',null,'Teamspace',['alexandra','aisha','fiona']]
        ];
        Store.update(s => {
          base.forEach(([id,title,start,end,room,location,attendees]) => {
            if (!s.calendar.events.find(e => e.id === id)) {
              s.calendar.events.push({ id, title, date:'2026-12-02', start, end, tz:'America/New_York', type:'meeting', location, teams:location === 'Teamspace', room, organizer:'me', attendees, note:'Simulated executive-day conflict. Resolve by moving or shortening, not by deleting the work.', category:'Simulation', recurrence:null, scenario:'s14' });
            }
          });
          s.calendar.focusDate = '2026-12-02';
        });
      },
      learn:[
        { title:'Open the executive calendar', why:'Five conflicts is a system problem. Work through the day in order, protecting the highest-risk commitments.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Open December 2', why:'Use the calendar navigation to find the simulated day. Do not edit the wrong date.', target:'[data-mail-view="calendar"]', check:() => !!document.querySelector('#mail-calendar .calendar-app') },
        { title:'Resolve the first conflict', why:'Move one of the overlapping events to a free slot. Check that the new slot does not create a new conflict.', target:'[data-event-id="s14-4"], [data-event-id="s14-3"]', check:() => { const ids = ['s14-1','s14-2','s14-3','s14-4','s14-5','s14-6','s14-7','s14-8','s14-9','s14-10']; const evs = ids.map(id => Store.eventById(id)).filter(Boolean); return evs.length < 10 && !evs.some((a,i) => evs.some((b,j) => i<j && Utils.eventsOverlap(a,b))); } },
        { title:'Resolve every conflict', why:'The goal is a workable day, not a shorter one. Keep at least eight of the ten meetings and remove every overlap.', target:'[data-cal-view="day"]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'remaining', label:'Keep at least 8 of the 10 simulated meetings.', check:() => ['s14-1','s14-2','s14-3','s14-4','s14-5','s14-6','s14-7','s14-8','s14-9','s14-10'].filter(id => Store.eventById(id)).length >= 8 },
        { id:'no-overlap', label:'Remove every overlap among the remaining simulated meetings.', check:() => { const evs = ['s14-1','s14-2','s14-3','s14-4','s14-5','s14-6','s14-7','s14-8','s14-9','s14-10'].map(id => Store.eventById(id)).filter(Boolean); return !evs.some((a,i) => evs.some((b,j) => i<j && Utils.eventsOverlap(a,b))); } },
        { id:'worked', label:'Make at least three calendar changes to resolve the day.', check:() => logs(session,'calendar:event-updated').length + logs(session,'calendar:event-deleted').length >= 3 }
      ],
      hints:[
        'Open December 2. Work through the overlaps one pair at a time. Short meetings can move by 30–60 minutes; long meetings may need a different slot.',
        'Move the investor pre-call to 08:00; move legal to 11:30; move the vendor call to 13:30; move Helio RFP to 15:30; move gala seating to 17:00. Keep lunch and travel intact.',
        'Mail → Calendar → go to December 2. Move the five conflicting events: Investor pre-call to 08:00–08:45; Legal catch-up to 11:30–12:15; Vendor contract call to 13:30–14:15; Helio RFP final review to 15:30–16:30; Gala seating review to 17:00–17:30. Save each. Do not delete more than two meetings.'
      ],
      next:'Plan the three-city trip and budget.'
    },
    {
      id:'three-city-budget', level:3, title:'Three-City Trip & Budget', app:'sheets', minutes:25, testMinutes:25, xp:180,
      skills:['sheets','operations'], icon:'✈',
      summary:'The London–Dubai–Singapore budget is over cap after hotel and contingency changes. Bring it to $38,000 or below and save.',
      brief:{ from:'Omar Haddad, Skyline Travel', ask:'I need the final travel budget within the $38,000 cap before the ticketing deadline.', due:'Nov 10, 08:00 ET.' },
      setup(){
        Store.update(s => {
          const wb = s.workbooks.find(w => w.id === 'wb-travel');
          if (!wb) return;
          const sh = wb.sheets.Budget;
          sh.cells.C6 = { v:'5400', s:{ fmt:'currency', align:'right' } };
          sh.cells.C12 = { v:'3000', s:{ fmt:'currency', align:'right' } };
          s.activeWorkbookId = 'wb-travel';
          wb.activeSheet = 'Budget';
        });
      },
      learn:[
        { title:'Open Sheets', why:'A travel budget is a set of assumptions. Changing a hotel rate or contingency must flow through the formulas, not the total.', target:'[data-desktop-app="sheets"], [data-taskbar-app="sheets"]', check:() => OS.isOpen('sheets') },
        { title:'Open the travel workbook', why:'Use the pre-filled three-city workbook. Do not create a second budget from scratch.', target:'[data-template-gallery]', check:() => Store.state.activeWorkbookId === 'wb-travel' },
        { title:'Open the Budget sheet', why:'The Itinerary tells you where Alexandra is going; the Budget tells you whether it is approved.', target:'[data-sheet-tab="Budget"]', check:() => !!document.querySelector('.sheet-tab.active') && document.querySelector('.sheet-tab.active').textContent.includes('Budget') },
        { title:'Reduce the overage and save', why:'Change at least three cost lines. Keep the SUM formula and save so the file is current for ticketing.', target:'#formula-input, [data-save-sheet]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'under-cap', label:'Bring the confirmed total to $38,000 or less.', check:() => Number(sheetValue('wb-travel','Budget','C14')) <= 38000 && Number(sheetValue('wb-travel','Budget','C14')) > 0 },
        { id:'edits', label:'Edit at least 3 different budget line items.', check:() => unique(editedCells(session,'wb-travel','Budget').map(x => x.cell).filter(c => /^C([2-9]|1[0-2])$/.test(c))).length >= 3 },
        { id:'formula', label:'Keep the total as a SUM formula.', check:() => cellRaw('wb-travel','Budget','C14').startsWith('=SUM(') },
        { id:'saved', label:'Save the travel workbook.', check:() => !!logs(session,'sheet:saved').find(x => x.detail.workbookId === 'wb-travel') }
      ],
      hints:[
        'The confirmed total is over the cap. Look at the London hotel line, contingency, and ground transport. Reduce at least three lines.',
        'Reduce London hotel to $4,800, contingency to $2,500, and ground transport to $1,200. That brings the total to exactly $38,000. Keep the SUM formula.',
        'Open the Budget sheet. Change C6 to 4800, C12 to 2500, C9 to 1200. Confirm C14 shows $38,000 or less and B17 is non-negative. Click Save.'
      ],
      next:'Assemble the board pack.'
    },
    {
      id:'board-pack', level:3, title:'Assemble the Board Pack', app:'docs', minutes:20, testMinutes:20, xp:170,
      skills:['docs','operations'], icon:'🏛',
      summary:'Create a concise board-pack cover document with Agenda, Financials, and Governance sections, then save it to Board Docs.',
      brief:{ from:'Liam O’Connor, Board Relations', ask:'Create the board-pack cover memo and file it in Board Docs before materials freeze.', due:'Wednesday 17:00 ET.' },
      setup(){},
      learn:[
        { title:'Open Docs', why:'The board pack needs a clear narrative, not just a pile of attachments. Start with a cover memo.', target:'[data-desktop-app="docs"], [data-taskbar-app="docs"]', check:() => OS.isOpen('docs') },
        { title:'Create a new document', why:'Name it for the meeting and start from the agenda or memo structure.', target:'[data-doc-new]', check:() => !!document.querySelector('#new-doc-name') || !!logs(session,'doc:created').length },
        { title:'Write the three required sections', why:'The board needs Agenda, Financials, and Governance in a predictable order. Keep each section short and decision-oriented.', target:'#doc-editor', check:() => { const f = docSavedSince(session); return !!f; } },
        { title:'Save it to Board Docs', why:'A document that is not saved in the right folder is not part of the board pack.', target:'[data-doc-save]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'saved', label:'Save a document in the Board Docs folder.', check:() => { const f = docSavedSince(session); return !!f && f.parentId === 'f-board'; } },
        { id:'sections', label:'Include Agenda, Financials, and Governance sections.', check:() => { const f = docSavedSince(session); const t = f ? Utils.stripHtml(f.content).toLowerCase() : ''; return /agenda/.test(t) && /financial/.test(t) && /governance/.test(t); } }
      ],
      hints:[
        'Open Docs → New. Save it into Board Docs. Use headings for Agenda, Financials, and Governance.',
        'Create a document named “Board pack cover memo.” Add an H1 title, then H2 headings: Agenda, Financials, Governance. Save to Board Docs.',
        'Docs → New document → name “Board pack cover memo” → folder Board Docs. In the page add: purpose line, then headings “Agenda,” “Financials,” and “Governance” with one sentence under each. Click Save.'
      ],
      next:'Handle the urgent VIP request.'
    },
    {
      id:'vip-request', level:3, title:'The Urgent VIP Request', app:'mail', minutes:15, testMinutes:15, xp:160,
      skills:['email','calendar','prioritization'], icon:'⚡',
      summary:'Move Isabel’s coffee to 3:00 PM Tuesday, protect the budget review, and confirm in writing.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'Isabel moved her flight. Put coffee at 3:00 PM Tuesday without disturbing the budget review. Confirm in writing.', due:'Immediately — this is time-sensitive.' },
      setup(){},
      learn:[
        { title:'Read the urgent request', why:'Urgent does not mean “drop everything.” It means identify the decision and the trade-off.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Open Alexandra’s urgent email', why:'Read the exact constraint: 3:00 PM Tuesday and the budget review must stay intact.', target:'[data-email="m26"]', check:() => !!logs(session,'mail:read').find(x => x.detail.emailId === 'm26') || !!document.querySelector('.mail-subject-line h1') && document.querySelector('.mail-subject-line h1').textContent.includes('Isabel') },
        { title:'Move Isabel’s coffee to 3:00 PM', why:'Use the calendar, not a note. Check that the budget review ends at 3:00 and the new slot is free.', target:'[data-mail-view="calendar"]', check:() => { const ev = calendarIsabelSlot(); return !!ev && eventConflictFree(ev); } },
        { title:'Confirm to Alexandra or Isabel in writing', why:'The confirmation is part of the work. State the new time, the room, and that the budget review is protected.', target:'[data-compose]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'moved', label:'Put Isabel’s coffee at 3:00 PM on Tuesday, conflict-free.', check:() => { const ev = calendarIsabelSlot(); return !!ev && eventConflictFree(ev); } },
        { id:'budget-safe', label:'Leave the 2:00 PM budget review untouched.', check:() => { const ev = Store.eventById('evt-budget-review'); return !!ev && ev.date === '2026-11-10' && ev.start === '14:00' && ev.end === '15:00'; } },
        { id:'confirmed', label:'Send a confirmation to Alexandra or Isabel.', check:() => sentSince(session).some(e => [...e.to, ...(e.cc || [])].some(x => /alexandra\.morgan|isabel\.rossi/i.test(x))) }
      ],
      hints:[
        'The budget review is 2:00–3:00. Isabel can come at 3:00 without touching it.',
        'Edit the Isabel coffee event to 15:00–15:45 on Nov 10. Then reply to Alexandra with the confirmation.',
        'Mail → Calendar → Nov 10 → click “Coffee with Isabel Rossi” → Edit → start 15:00, end 15:45 → Save. Then Mail → Reply to Alexandra: “Isabel is confirmed for 3:00 PM Tuesday. Your 2:00 budget review is untouched. I will meet her in the lobby café.”'
      ],
      next:'Audit the expense report.'
    },
    {
      id:'expense-audit', level:3, title:'Audit the Expense Report', app:'sheets', minutes:18, testMinutes:18, xp:160,
      skills:['sheets','operations'], icon:'🔎',
      summary:'The expense total is missing the last category. Repair the formula, verify the numbers, and save the report.',
      brief:{ from:'Marcus Chen, CFO', ask:'The expense total does not match the lines. Fix it before the Q4 close and tell me what was wrong.', due:'Noon PT tomorrow.' },
      setup(){
        Store.update(s => {
          const wb = s.workbooks.find(w => w.id === 'wb-expenses');
          if (!wb) return;
          wb.sheets.Expenses.cells.D11 = { v:'=SUM(D2:D8)', s:{ b:true, bg:'#dce9f9', color:'#12365f', border:true, fmt:'currency' } };
          wb.sheets.Expenses.cells.G11 = { v:'Check range', s:{ b:true, bg:'#fde7e4', color:'#952b1e', border:true } };
          s.activeWorkbookId = 'wb-expenses';
        });
      },
      learn:[
        { title:'Open the expense workbook', why:'An audit starts by comparing the line items to the total. Never change a total blindly.', target:'[data-desktop-app="sheets"], [data-taskbar-app="sheets"]', check:() => OS.isOpen('sheets') },
        { title:'Inspect the total formula', why:'Select D11 and read the formula bar. It should include every expense row, D2 through D9.', target:'#formula-input, [data-template-gallery]', check:() => Store.state.activeWorkbookId === 'wb-expenses' },
        { title:'Fix the SUM range and save', why:'A total that omits a category is a reporting error. Correct the formula, check the chart, then save.', target:'#formula-input, [data-save-sheet]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'fixed', label:'Make the grand total include D2:D9.', check:() => cellRaw('wb-expenses','Expenses','D11').replace(/\s/g,'').includes('D2:D9') },
        { id:'errors', label:'Remove all formula errors from the Expenses sheet.', check:() => !anyFormulaError('wb-expenses','Expenses') },
        { id:'saved', label:'Save the corrected workbook.', check:() => !!logs(session,'sheet:saved').find(x => x.detail.workbookId === 'wb-expenses') }
      ],
      hints:[
        'Compare D11 with the eight line items above it. Count the rows the SUM covers.',
        'Select D11. Change =SUM(D2:D8) to =SUM(D2:D9). Press Enter. Confirm the chart redraws and the total increases by the miscellaneous row. Save.',
        'Open Sheets → Executive Expense Report. Click D11. In the formula bar change “=SUM(D2:D8)” to “=SUM(D2:D9)” and press Enter. Click Save. G11 can be cleared or set to “Verified.”'
      ],
      next:'Complete the board attendee tracker.'
    },
    {
      id:'board-attendees', level:3, title:'Fix the Board Attendee Tracker', app:'sheets', minutes:16, testMinutes:16, xp:150,
      skills:['sheets','operations'], icon:'👥',
      summary:'Restore missing hotel and dietary details for international board attendees, then save the tracker.',
      brief:{ from:'Liam O’Connor, Board Relations', ask:'Three international attendees are missing hotel details, and two dietary notes are blank. Fix the tracker and save.', due:'Tuesday 12:00.' },
      setup(){
        Store.update(s => {
          const wb = s.workbooks.find(w => w.id === 'wb-board');
          if (!wb) return;
          const sh = wb.sheets.Attendees;
          if (sh.cells.G3) sh.cells.G3.v = '';
          if (sh.cells.G4) sh.cells.G4.v = '';
          if (sh.cells.G5) sh.cells.G5.v = '';
          if (sh.cells.E3) sh.cells.E3.v = '—';
          if (sh.cells.E5) sh.cells.E5.v = '—';
          s.activeWorkbookId = 'wb-board';
          wb.activeSheet = 'Attendees';
        });
      },
      learn:[
        { title:'Open the board attendee tracker', why:'The tracker is the source of truth for the room, dietary needs, and the dinner. Incomplete rows create day-of problems.', target:'[data-desktop-app="sheets"], [data-taskbar-app="sheets"]', check:() => OS.isOpen('sheets') },
        { title:'Fill the missing details', why:'For each international attendee, use the known hotel and dietary information. Accuracy matters more than speed.', target:'#formula-input, [data-template-gallery]', check:() => Store.state.activeWorkbookId === 'wb-board' },
        { title:'Save the tracker', why:'Liam and Aisha need the corrected version, not a local edit that disappears.', target:'[data-save-sheet]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'hotels', label:'Fill hotel details for Dr. Petrova, Noah Williams, and Isabel Rossi.', check:() => ['G3','G4','G5'].every(addr => String(cellRaw('wb-board','Attendees',addr)).trim().length > 1) },
        { id:'diet', label:'Record Dr. Petrova as vegetarian and Isabel’s shellfish allergy.', check:() => /vegetarian/i.test(cellRaw('wb-board','Attendees','E3')) && /shellfish/i.test(cellRaw('wb-board','Attendees','E5')) },
        { id:'saved', label:'Save the board tracker.', check:() => !!logs(session,'sheet:saved').find(x => x.detail.workbookId === 'wb-board') }
      ],
      hints:[
        'The international attendees are Dr. Elena Petrova, Noah Williams, and Isabel Rossi. Their hotel is The Peninsula.',
        'Fill G3, G4, and G5 with “The Peninsula.” Set E3 to “Vegetarian” and E5 to “Shellfish allergy.” Then save.',
        'Sheets → Board Meeting Agenda & Attendees → Attendees sheet. G3 = The Peninsula; G4 = The Peninsula; G5 = The Peninsula; E3 = Vegetarian; E5 = Shellfish allergy. Click Save.'
      ],
      next:'Turn meeting notes into actions.'
    },
    {
      id:'notes-to-actions', level:3, title:'From Meeting Notes to Action Tracker', app:'notes', minutes:20, testMinutes:20, xp:170,
      skills:['docs','prioritization','email'], icon:'📋',
      summary:'Capture meeting notes, create at least two tracked actions with due dates, and send the follow-up email.',
      brief:{ from:'Daniel Kim, Chief of Staff', ask:'Turn Wednesday’s board dry run into a clean action list and send the follow-up before end of day.', due:'Today at 18:00.' },
      setup(){},
      learn:[
        { title:'Open Notes', why:'The meeting does not end when people leave the room. Capture decisions and actions while the context is fresh.', target:'[data-desktop-app="notes"], [data-taskbar-app="notes"]', check:() => OS.isOpen('notes') },
        { title:'Write and save a linked note', why:'Link the note to the dry-run event. Then separate decisions from actions.', target:'[data-new-note]', check:() => !!logs(session,'note:created').length || !!logs(session,'note:saved').length },
        { title:'Create at least two tracked tasks', why:'An action in a document is not a task until it has an owner and a due date in the task system.', target:'[data-desktop-app="todo"], [data-taskbar-app="todo"]', check:() => unique(logs(session,'todo:created').map(x => x.detail.taskId)).length >= 2 },
        { title:'Send the follow-up email', why:'Close the loop: decisions first, then owners and dates. This is the record people will refer back to.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'note', label:'Save a note with decisions and actions.', check:() => !!logs(session,'note:saved').length || !!logs(session,'note:created').length },
        { id:'tasks', label:'Create at least 2 tasks with due dates and priorities.', check:() => { const ids = unique(logs(session,'todo:created').map(x => x.detail.taskId)); const tasks = ids.map(id => Store.state.todos.find(t => t.id === id)).filter(Boolean); return tasks.length >= 2 && tasks.every(t => t.due && t.priority); } },
        { id:'follow-up', label:'Send a follow-up email with the action summary.', check:() => sentSince(session).some(e => /follow[- ]?up|action|next step/i.test(e.subject + ' ' + e.body)) }
      ],
      hints:[
        'Create the note first, then make each action a task. Finally, send one short email with the action table.',
        'Use a note titled “Board dry run actions.” Link it to the Nov 11 dry run. Create tasks for print proofs and Clara’s approval. Email Daniel with subject “Board dry run — actions.”',
        'Notes → New note → “Board dry run actions” → link to Nov 11 Board dry run → write decisions/actions → save. Tasks → add tasks for print proofs and Clara’s written approval with due dates and priorities. Mail → New email to Daniel, subject “Board dry run — actions and owners,” list each action with owner/date, send.'
      ],
      next:'Take the CEO inbox to zero.'
    },
    {
      id:'inbox-zero', level:3, title:'CEO Inbox Zero', app:'mail', minutes:20, testMinutes:20, xp:170,
      skills:['email','prioritization','operations'], icon:'0',
      summary:'Clear every unread CEO email, create a custom follow-up folder with at least 5 filed emails, and set the travel out-of-office.',
      brief:{ from:'Alexandra Morgan, CEO', ask:'I want a clean inbox before I travel. Set my out-of-office, file the board follow-ups, and leave no unread mail from me.', due:'Before Friday.' },
      setup(){},
      learn:[
        { title:'Clear the CEO’s mail', why:'Start with the sender who can create the most risk. Read or consciously dismiss every unread message from Alexandra.', target:'[data-desktop-app="mail"], [data-taskbar-app="mail"]', check:() => OS.isOpen('mail') },
        { title:'Create a follow-up folder', why:'A custom folder is where you put work that is waiting on someone else. Then move at least five messages into it.', target:'[data-new-folder]', check:() => !!logs(session,'mail:folder-created').length },
        { title:'Set the out-of-office', why:'Alexandra travels Nov 16–21. An OOO with a named cover contact prevents people from being left without a next step.', target:'[data-mail-settings]', check:() => Store.state.settings.outOfOffice.enabled && !!logs(session,'mail:settings-saved').find(x => x.detail.outOfOffice === true) },
        { title:'Finish inbox zero', why:'Check the counts. No unread CEO mail, at least five filed follow-ups, and OOO on.', target:'[data-action="training-hub"]', check:() => allDone(session) }
      ],
      criteria:[
        { id:'ceo-read', label:'Leave zero unread inbox messages from Alexandra.', check:() => !S().mail.emails.some(e => e.folder === 'inbox' && !e.read && e.from.email === 'alexandra.morgan@appello.com') },
        { id:'folder', label:'Create a custom folder and file at least 5 emails into custom folders.', check:() => !!logs(session,'mail:folder-created').length && S().mail.emails.filter(e => e.folder.startsWith('custom-')).length >= 5 },
        { id:'ooo', label:'Turn on out-of-office with a cover contact.', check:() => Store.state.settings.outOfOffice.enabled && /daniel|cover|urgent/i.test(Store.state.settings.outOfOffice.message) && !!logs(session,'mail:settings-saved').find(x => x.detail.outOfOffice === true) }
      ],
      hints:[
        'Use the Mark all read check for Alexandra’s mail after you review it. Then create a folder and move five follow-up emails. Finally, open Mailbox settings → Out of office.',
        'Create a folder called “Board follow-ups” and move at least five messages into it. Set OOO to mention Daniel Kim as the urgent contact. Ensure Alexandra’s inbox messages are read.',
        'Mail → Inbox → read Alexandra’s emails or click the ✓ Mark all read button. Click “+ Custom folder,” create “Board follow-ups,” and move at least five messages into it. Open Mailbox settings → Out of office → turn on, dates Nov 16–21, mention Daniel Kim, save.'
      ],
      next:'Review your progress and try a timed test.'
    }
  ];

  function docSavedSince(session) {
    const ids = unique(logs(session, 'doc:saved').map(x => x.detail.fileId));
    return ids.map(id => Store.fileById(id)).filter(Boolean).find(f => f.parentId === 'f-board') || null;
  }
  function calendarIsabelSlot() {
    return S().calendar.events.find(ev => ev.date === '2026-11-10' && ev.start === '15:00' && (ev.attendees || []).includes('isabel')) || null;
  }

  /* --------------------------- progress helpers ------------------------- */
  function progress() { return Store.state.training.progress || (Store.state.training.progress = {}); }
  function completedCount(p) { return Object.values(p).filter(x => x && x.completed).length; }
  function levelComplete(p, level) {
    const list = scenarios.filter(s => s.level === level);
    return list.every(s => p[s.id] && p[s.id].completed);
  }
  function xpLevel(xp) { return Math.min(10, Math.floor((xp || 0) / 400) + 1); }
  function nextScenario() {
    const p = progress();
    return scenarios.find(s => !p[s.id]?.completed) || scenarios[scenarios.length - 1];
  }
  function skillStats() {
    const p = progress();
    return Object.entries(SKILLS).map(([id, meta]) => {
      const relevant = scenarios.filter(s => s.skills.includes(id));
      const done = relevant.filter(s => p[s.id]?.completed).length;
      return { id, ...meta, done, total:relevant.length, pct: relevant.length ? Math.round(done / relevant.length * 100) : 0 };
    });
  }
  function computeBadges() {
    const p = progress();
    return BADGES.map(b => ({ ...b, unlocked: !!b.test(p) }));
  }
  function syncBadges() {
    const p = progress();
    const unlocked = Store.state.training.badges || [];
    BADGES.forEach(b => {
      if (b.test(p) && !unlocked.find(x => x.id === b.id)) {
        unlocked.push({ id:b.id, unlockedAt:new Date().toISOString() });
        toast('Badge earned', `${b.icon} ${b.name}`, { kind:'success', duration:4800, icon:'🏅' });
      }
    });
    Store.state.training.badges = unlocked;
  }

  /* ------------------------------ coach UI ------------------------------ */
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function resolveTarget(selector) {
    if (!selector) return null;
    const selectors = selector.split(',').map(s => s.trim());
    for (const sel of selectors) {
      try { const els = Array.from(document.querySelectorAll(sel)); const el = els.find(visible); if (el) return el; } catch (e) { /* bad selector */ }
    }
    return null;
  }
  function renderCoach() {
    const coach = document.getElementById('training-coach');
    const highlight = document.getElementById('training-highlight');
    if (!coach) return;
    if (!session) { coach.hidden = true; if (highlight) highlight.hidden = true; return; }
    if (session.mode !== 'learn') { coach.hidden = true; if (highlight) highlight.hidden = true; renderDock(); return; }
    const sc = scenarios.find(s => s.id === session.scenarioId);
    const step = sc.learn[session.stepIndex];
    if (!step) { coach.hidden = true; return; }
    coach.hidden = false;
    const done = session.stepIndex;
    const total = sc.learn.length;
    const canNext = step.advanceOn === 'next' || (() => { try { return !!step.check(session); } catch (e) { return false; } })();
    coach.innerHTML = `<div class="coach-head"><div class="coach-mode"><span>🎓</span> Learn mode</div><button class="coach-exit" data-coach-exit aria-label="Exit scenario" data-tip="Leave this guided scenario. Progress is saved only if you finish.">✕</button></div>
      <div class="coach-scenario"><span class="eyebrow">${esc(sc.title)}</span><h3>${esc(step.title)}</h3><div class="coach-progress">${Array.from({length:total}, (_,i) => `<i class="${i < done ? 'done' : i === done ? 'current' : ''}"></i>`).join('')}<span>Step ${done + 1} of ${total}</span></div></div>
      <div class="coach-why"><span>WHY IT MATTERS</span><p>${esc(step.why)}</p></div>
      <div class="coach-action">${canNext ? '<span class="coach-check">✓</span> This step is complete. Click Next to continue.' : '<span class="coach-wait">●</span> Try the highlighted control. The coach will move on when it is done.'}</div>
      <div id="coach-hint" class="coach-hint" hidden></div>
      ${session.lastMistake ? `<div class="coach-mistake"><strong>Professional standard</strong><p>${esc(session.lastMistake.standard)}</p></div>` : ''}
      <div class="coach-foot"><button class="btn small" data-coach-hint>Stuck? Hint ${session.hintsUsed ? `(${session.hintsUsed}/3)` : ''}</button><button class="btn small" data-coach-find data-tip="Scroll to and focus the highlighted target.">Show me</button><span class="spacer"></span><button class="btn primary small" data-coach-next ${canNext ? '' : 'disabled'}>Next ›</button></div>`;
    coach.querySelector('[data-coach-exit]').onclick = exitWithConfirm;
    coach.querySelector('[data-coach-hint]').onclick = () => showHint(sc);
    coach.querySelector('[data-coach-find]').onclick = focusTarget;
    coach.querySelector('[data-coach-next]').onclick = () => { if (!canNext) return; advanceLearn(); };
    highlightTarget(step.target);
  }
  function highlightTarget(selector) {
    const highlight = document.getElementById('training-highlight');
    if (!highlight) return;
    const el = resolveTarget(selector);
    if (!el) { highlight.hidden = true; return; }
    const r = el.getBoundingClientRect();
    highlight.hidden = false;
    highlight.style.left = Math.max(0, r.left - 5) + 'px';
    highlight.style.top = Math.max(0, r.top - 5) + 'px';
    highlight.style.width = (r.width + 10) + 'px';
    highlight.style.height = (r.height + 10) + 'px';
  }
  function focusTarget() {
    if (!session || session.mode !== 'learn') return;
    const step = scenarios.find(s => s.id === session.scenarioId).learn[session.stepIndex];
    const el = resolveTarget(step.target);
    if (el) { el.scrollIntoView({ block:'center', behavior:'smooth' }); el.focus({ preventScroll:true }); toast('Here it is', 'The glowing outline marks the next control.', { duration:2600 }); }
    else {
      const sc = scenarios.find(s => s.id === session.scenarioId);
      OS.openApp(sc.app);
      setTimeout(() => { renderCoach(); toast('Opening the right app', 'Use the highlighted control when it appears.', { duration:3000 }); }, 450);
    }
  }
  function showHint(sc) {
    if (!session) return;
    session.hintsUsed = Math.min(3, (session.hintsUsed || 0) + 1);
    persistSession();
    const text = sc.hints[session.hintsUsed - 1] || sc.hints[2];
    const box = document.getElementById('coach-hint');
    if (box) { box.hidden = false; box.innerHTML = `<strong>${session.hintsUsed === 1 ? 'Nudge' : session.hintsUsed === 2 ? 'Detailed hint' : 'Show solution'}</strong><p>${esc(text)}</p>`; }
    Bus.emit('training:hint-used', { scenarioId:sc.id, level:session.hintsUsed });
    renderCoach();
    const newBox = document.getElementById('coach-hint'); if (newBox) newBox.hidden = false;
    if (newBox) newBox.innerHTML = `<strong>${session.hintsUsed === 1 ? 'Nudge' : session.hintsUsed === 2 ? 'Detailed hint' : 'Show solution'}</strong><p>${esc(text)}</p>`;
  }
  function advanceLearn() {
    if (!session) return;
    const sc = scenarios.find(s => s.id === session.scenarioId);
    if (session.stepIndex >= sc.learn.length - 1) {
      if (allDone(session)) finishSession(true);
      else { renderCoach(); toast('A few criteria remain', 'Check the scenario brief and the coach. The next step is about the missing standard.', { kind:'error', duration:4200 }); }
      return;
    }
    session.stepIndex++;
    session.lastMistake = null;
    persistSession();
    Bus.emit('training:step-advanced', { scenarioId:sc.id, step:session.stepIndex });
    renderCoach();
    setTimeout(() => { if (session) { renderCoach(); checkLearnStep(); } }, 120);
  }
  function checkLearnStep() {
    if (!session || session.mode !== 'learn') return;
    const sc = scenarios.find(s => s.id === session.scenarioId);
    const step = sc.learn[session.stepIndex];
    if (!step || step.advanceOn === 'next') return;
    let done = false;
    try { done = !!step.check(session); } catch (e) { done = false; }
    if (done) {
      const coach = document.getElementById('training-coach');
      if (coach) coach.classList.add('coach-success');
      setTimeout(() => {
        if (!session) return;
        if (session.stepIndex >= sc.learn.length - 1) {
          if (allDone(session)) finishSession(true);
          else renderCoach();
        } else advanceLearn();
      }, 450);
    }
  }

  function renderDock() {
    const dock = document.getElementById('training-taskbar');
    if (!dock) return;
    if (!session || session.mode === 'learn') { dock.hidden = true; return; }
    const sc = scenarios.find(s => s.id === session.scenarioId);
    const criteria = criteriaState(session);
    const met = criteria.filter(c => c.met).length;
    const timer = session.mode === 'test' ? Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000)) : Math.floor((Date.now() - session.startedAt) / 1000);
    if (session.dockMin) {
      dock.hidden = false;
      dock.className = 'training-taskbar minimized';
      dock.innerHTML = `<button class="dock-pill" data-dock-restore><span>${session.mode === 'test' ? '⏱' : '🎯'}</span><strong>${esc(sc.title)}</strong><span class="dock-pill-time" data-dock-timer>${timeText(timer)}</span><span>＋</span></button>`;
      dock.querySelector('[data-dock-restore]').onclick = () => { session.dockMin = false; renderDock(); };
      return;
    }
    dock.hidden = false;
    dock.className = 'training-taskbar';
    dock.innerHTML = `<div class="dock-head"><div class="coach-mode ${session.mode}"><span>${session.mode === 'test' ? '⏱' : '🎯'}</span> ${session.mode === 'test' ? 'Test mode · no hints' : 'Practice mode'}</div><div class="dock-head-actions"><button class="icon-btn" data-dock-min data-tip="Minimize the task panel.">—</button><button class="icon-btn" data-dock-exit data-tip="Leave this scenario. No score is awarded on an abandoned attempt.">✕</button></div></div>
      <div class="dock-title"><span class="eyebrow">Level ${sc.level} · ${esc(sc.brief.from.split(',')[0])}</span><h3>${esc(sc.title)}</h3><p>${esc(sc.brief.ask)}</p></div>
      <div class="dock-progress-row"><span>Success criteria</span><strong>${met}/${criteria.length}</strong></div>
      <div class="dock-criteria">${criteria.map(c => `<div class="dock-criterion ${c.met ? 'met' : ''}"><span>${c.met ? '✓' : '○'}</span>${esc(c.label)}</div>`).join('')}</div>
      ${session.lastMistake ? `<div class="dock-mistake"><strong>Coach note</strong><p>${esc(session.lastMistake.message)}</p><small>${esc(session.lastMistake.standard)}</small></div>` : ''}
      <div class="dock-hint" id="dock-hint" ${session.hintText ? '' : 'hidden'}>${session.hintText ? `<strong>Hint ${session.hintLevel}</strong><p>${esc(session.hintText)}</p>` : ''}</div>
      <div class="dock-foot"><div class="dock-timer"><span>${session.mode === 'test' ? 'Time left' : 'Time'}</span><strong data-dock-timer>${timeText(timer)}</strong></div><div class="inline-actions">${session.mode === 'practice' ? `<button class="btn small" data-dock-hint>Hint${session.hintLevel ? ` (${session.hintLevel}/3)` : ''}</button><button class="btn small primary" data-dock-check>Check work</button>` : `<button class="btn small primary" data-dock-submit>Finish test</button>`}</div></div>`;
    dock.querySelector('[data-dock-min]').onclick = () => { session.dockMin = true; persistSession(); renderDock(); };
    dock.querySelector('[data-dock-exit]').onclick = exitWithConfirm;
    const hintBtn = dock.querySelector('[data-dock-hint]'); if (hintBtn) hintBtn.onclick = () => { session.hintLevel = Math.min(3, (session.hintLevel || 0) + 1); session.hintText = sc.hints[session.hintLevel - 1]; persistSession(); Bus.emit('training:hint-used', { scenarioId:sc.id, level:session.hintLevel }); renderDock(); };
    const check = dock.querySelector('[data-dock-check]'); if (check) check.onclick = checkPractice;
    const submit = dock.querySelector('[data-dock-submit]'); if (submit) submit.onclick = () => finishTest(false);
  }
  function timeText(seconds) {
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function tick() {
    if (!session) return;
    const timerEls = document.querySelectorAll('[data-dock-timer]');
    if (timerEls.length) {
      const seconds = session.mode === 'test' ? Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000)) : Math.floor((Date.now() - session.startedAt) / 1000);
      timerEls.forEach(el => el.textContent = timeText(seconds));
      if (session.mode === 'test' && seconds <= 0) finishTest(true);
    }
    if (session.mode === 'learn') highlightTarget(scenarios.find(s => s.id === session.scenarioId).learn[session.stepIndex]?.target);
  }
  function checkPractice() {
    if (!session) return;
    const criteria = criteriaState(session);
    const missing = criteria.filter(c => !c.met);
    if (!missing.length) finishSession(true);
    else {
      toast('Not quite there', `${missing.length} success ${missing.length === 1 ? 'criterion is' : 'criteria are'} still missing. Open the criteria list in the task panel.`, { kind:'error', duration:4200 });
      renderDock();
      const dock = document.getElementById('training-taskbar');
      if (dock) { dock.classList.add('shake'); setTimeout(() => dock.classList.remove('shake'), 400); }
    }
  }
  function finishTest(timedOut) {
    if (!session || session.mode !== 'test') return;
    const criteria = criteriaState(session);
    const met = criteria.filter(c => c.met).length;
    if (!timedOut && met < criteria.length) {
      const ok = confirm({ title:'Finish the test with missing criteria?', message:`You have met ${met} of ${criteria.length} criteria. You can keep working until the timer ends, or finish now and see your score.`, okText:'Finish now' });
      ok.then(yes => { if (yes) finishSession(met === criteria.length); });
      return;
    }
    finishSession(met === criteria.length);
  }
  function exitWithConfirm() {
    if (!session) return;
    const sc = scenarios.find(s => s.id === session.scenarioId);
    confirm({ title:'Leave this scenario?', message:`You are in the middle of “${esc(sc.title)}.” If you leave now, this attempt will not count toward your progress.`, okText:'Leave scenario' }).then(ok => { if (ok) abandonSession(); });
  }
  function abandonSession() {
    const sc = session ? scenarios.find(s => s.id === session.scenarioId) : null;
    session = null;
    if (Store.state.training) { Store.state.training.activeSession = null; Store.commit(); }
    document.getElementById('training-coach').hidden = true;
    document.getElementById('training-highlight').hidden = true;
    document.getElementById('training-taskbar').hidden = true;
    if (sc) Bus.emit('training:scenario-abandoned', { scenarioId:sc.id });
    if (hubInstance) hubInstance.render();
  }

  function persistSession() {
    if (!session) {
      if (Store.state.training) { Store.state.training.activeSession = null; Store.commit(); }
      return;
    }
    Store.update(s => {
      s.training.activeSession = {
        scenarioId:session.scenarioId, mode:session.mode,
        startedAt:session.startedAt, startedAtIso:session.startedAtIso, endsAt:session.endsAt || null,
        stepIndex:session.stepIndex, hintsUsed:session.hintsUsed || 0, hintLevel:session.hintLevel || 0,
        hintText:session.hintText || '', mistakes:session.mistakes || [], lastMistake:session.lastMistake || null,
        dockMin:!!session.dockMin
      };
    });
  }
  function restoreSession() {
    const saved = Store.state.training && Store.state.training.activeSession;
    if (!saved || session) return;
    const sc = scenarios.find(s => s.id === saved.scenarioId);
    if (!sc) { Store.state.training.activeSession = null; Store.commit(); return; }
    if (!saved.startedAtIso || Date.now() - Date.parse(saved.startedAtIso) > 12 * 60 * 60 * 1000) {
      Store.state.training.activeSession = null; Store.commit(); return;
    }
    session = {
      scenarioId:sc.id, mode:saved.mode, startedAt:saved.startedAt || Date.parse(saved.startedAtIso),
      startedAtIso:saved.startedAtIso, endsAt:saved.endsAt || null,
      stepIndex:saved.stepIndex || 0, hintsUsed:saved.hintsUsed || 0,
      hintLevel:saved.hintLevel || 0, hintText:saved.hintText || '',
      mistakes:saved.mistakes || [], lastMistake:saved.lastMistake || null,
      dockMin:!!saved.dockMin, ended:false
    };
    if (session.mode === 'test' && session.endsAt && session.endsAt <= Date.now()) {
      session = null; Store.state.training.activeSession = null; Store.commit();
      toast('Timed test expired', 'The previous timed attempt ended while the workstation was closed. Start a new test when you are ready.', { kind:'error', duration:5200 });
      return;
    }
    toast('Session resumed', `${sc.title} was restored exactly where you left it. Your timer and hints are preserved.`, { kind:'training', icon:'↩', duration:4800 });
    if (session.mode === 'learn') {
      setTimeout(() => { if (!session) return; renderCoach(); checkLearnStep(); }, 200);
    } else {
      setTimeout(() => { if (!session) return; renderDock(); }, 200);
    }
    Bus.emit('training:session-resumed', { scenarioId:sc.id, mode:session.mode });
  }

  /* ------------------------------- start -------------------------------- */
  function startScenario(id, mode) {
    const sc = scenarios.find(s => s.id === id);
    if (!sc) { toast('Scenario not found', 'That training scenario is not available.', { kind:'error' }); return; }
    if (session) { toast('A scenario is active', 'Finish or leave your current scenario first.', { kind:'error' }); return; }
    if (sc.setup) { try { sc.setup(); } catch (e) { console.error('Scenario setup failed', e); } }
    session = {
      scenarioId:id, mode, startedAt:Date.now(), startedAtIso:new Date().toISOString(),
      stepIndex:0, hintsUsed:0, hintLevel:0, hintText:'', mistakes:[], lastMistake:null,
      dockMin:false, ended:false
    };
    if (mode === 'test') session.endsAt = Date.now() + (sc.testMinutes || 20) * 60000;
    Store.update(s => { s.training.sessions = (s.training.sessions || []).slice(-20); s.training.sessions.push({ scenarioId:id, mode, startedAt:session.startedAtIso }); });
    persistSession();
    Bus.emit('training:scenario-started', { scenarioId:id, mode });
    if (mode === 'learn') {
      document.getElementById('training-taskbar').hidden = true;
      renderCoach();
      setTimeout(() => { if (session) { renderCoach(); checkLearnStep(); } }, 300);
      toast('Learn mode started', 'Follow the glowing target and the coach. You cannot get lost: the coach stays with you.', { kind:'training', duration:3800, icon:'🎓' });
    } else {
      document.getElementById('training-coach').hidden = true;
      document.getElementById('training-highlight').hidden = true;
      renderDock();
      toast(mode === 'test' ? 'Timed test started' : 'Practice started', mode === 'test' ? 'No hints. The timer is running. Finish when you are ready.' : 'Work independently. Hints are available if you need them.', { kind:'training', duration:3600, icon:mode === 'test' ? '⏱' : '🎯' });
    }
  }

  function finishSession(allMet) {
    if (!session || session.ended) return;
    const sc = scenarios.find(s => s.id === session.scenarioId);
    const criteria = criteriaState(session);
    const met = criteria.filter(c => c.met).length;
    if (!allMet && (session.mode === 'learn' || session.mode === 'practice')) return;
    const elapsed = Math.round((Date.now() - session.startedAt) / 1000);
    const timeTarget = (sc.testMinutes || sc.minutes) * 60;
    let score;
    if (session.mode === 'test') {
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / timeTarget));
      score = Math.round((met / criteria.length) * 80 + ratio * 20 - session.mistakes.length * 3);
    } else {
      const hintPenalty = (session.hintsUsed || session.hintLevel || 0) * 3;
      score = Math.max(50, Math.round(80 + Math.max(0, 20 - elapsed / Math.max(1, timeTarget) * 20) - hintPenalty - session.mistakes.length * 4));
    }
    score = Math.max(0, Math.min(100, score));
    const progressData = progress();
    const prev = progressData[sc.id] || { attempts:0, modeBest:{} };
    const wasCompleted = !!prev.completed;
    prev.attempts = (prev.attempts || 0) + 1;
    prev.lastPlayed = new Date().toISOString();
    prev.modeBest = prev.modeBest || {};
    prev[`${session.mode}Best`] = Math.max(prev[`${session.mode}Best`] || 0, score);
    prev.bestScore = Math.max(prev.bestScore || 0, score);
    prev.lastMode = session.mode;
    prev.lastTime = elapsed;
    if (met === criteria.length) prev.completed = true;
    progressData[sc.id] = prev;
    Store.state.training.completionCount = completedCount(progressData);
    if (met === criteria.length && !wasCompleted) {
      Store.state.training.xp = (Store.state.training.xp || 0) + sc.xp;
      (sc.skills || []).forEach(skill => { Store.state.training.skills[skill] = (Store.state.training.skills[skill] || 0) + 1; });
    }
    syncBadges();
    if (met === criteria.length) Store.state.training.streak = Math.max(1, Store.state.training.streak || 0);
    Store.saveNow();
    const completed = met === criteria.length;
    const sessionCopy = { ...session };
    session = null;
    if (Store.state.training) Store.state.training.activeSession = null;
    Store.commit();
    document.getElementById('training-coach').hidden = true;
    document.getElementById('training-highlight').hidden = true;
    document.getElementById('training-taskbar').hidden = true;
    Bus.emit('training:scenario-finished', { scenarioId:sc.id, mode:sessionCopy.mode, score, completed, met, total:criteria.length, elapsed });
    showResults(sc, criteria, met, score, elapsed, completed, sessionCopy);
    if (hubInstance) hubInstance.render();
  }

  function showResults(sc, criteria, met, score, elapsed, completed, finished) {
    const p = progress()[sc.id];
    const next = scenarios.find(s => s.id !== sc.id && !progress()[s.id]?.completed) || scenarios[0];
    const badgeList = computeBadges();
    const newBadges = badgeList.filter(b => b.unlocked).slice(-3);
    // The result card already shows badges and completion. Do not let transient
    // toasts cover its header or controls.
    document.querySelectorAll('#toasts .toast').forEach(node => node.remove());
    modal({
      title: completed ? 'Scenario complete' : 'Attempt finished',
      subtitle:`${sc.title} · ${finished.mode === 'learn' ? 'Learn' : finished.mode === 'practice' ? 'Practice' : 'Timed test'}`,
      size:'wide',
      body:`<div class="result-layout">
        <div class="result-score"><div class="score-ring" style="--score:${score}"><div><strong>${score}</strong><span>/ 100</span></div></div><p>${completed ? 'Success criteria met' : `${met} of ${criteria.length} criteria met`}</p><span class="pill ${completed ? 'green' : 'amber'}">${finished.mode === 'test' ? 'Test result' : completed ? (finished.mode === 'learn' ? 'Guided practice complete' : 'Practice complete') : 'Attempt result'}</span></div>
        <div class="result-main">
          <div class="result-stats"><div><span>Time</span><strong>${timeText(elapsed)}</strong></div><div><span>Criteria</span><strong>${met}/${criteria.length}</strong></div><div><span>Hints</span><strong>${finished.mode === 'test' ? 'None' : finished.hintsUsed || finished.hintLevel || 0}</strong></div><div><span>XP earned</span><strong>${completed && !finished.wasCompleted ? sc.xp : 0}</strong></div></div>
          <div class="result-criteria">${criteria.map(c => `<div class="result-criterion ${c.met ? 'met' : 'missed'}"><span>${c.met ? '✓' : '✕'}</span><div><strong>${esc(c.label)}</strong><small>${c.met ? 'Met' : 'Not met — this is the next thing to practise.'}</small></div></div>`).join('')}</div>
          ${finished.mistakes?.length ? `<div class="result-mistakes"><strong>Coach notes</strong>${finished.mistakes.slice(-3).map(m => `<p>${esc(m.message)} <em>${esc(m.standard)}</em></p>`).join('')}</div>` : ''}
          <div class="result-next"><span class="eyebrow">Practise next</span><strong>${esc(next.title)}</strong><p>${esc(next.summary)}</p><div class="inline-actions"><button class="btn primary small" data-result-next="${next.id}">Open next scenario</button><button class="btn small" data-result-practice="${sc.id}">Try this again in ${finished.mode === 'test' ? 'practice' : 'test'} mode</button></div></div>
          ${newBadges.length ? `<div class="result-badges">${newBadges.map(b => `<span class="result-badge" data-tip="${esc(b.desc)}">${b.icon} ${esc(b.name)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`,
      footer:`<button class="btn" data-result-hub>Back to Training Hub</button><button class="btn primary" data-result-close>Continue</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-result-close]').onclick = close;
        el.querySelector('[data-result-hub]').onclick = () => { close(); if (!OS.isOpen('training')) OS.openApp('training'); if (hubInstance) hubInstance.render(); };
        el.querySelectorAll('[data-result-next]').forEach(b => b.onclick = () => { close(); startScenario(b.dataset.resultNext, 'learn'); });
        el.querySelectorAll('[data-result-practice]').forEach(b => b.onclick = () => { close(); startScenario(b.dataset.resultPractice, finished.mode === 'test' ? 'practice' : 'test'); });
      }
    });
  }

  /* -------------------------------- hub --------------------------------- */
  function hubRender() {
    if (!hubInstance) return;
    const root = hubInstance.root;
    if (!root) return;
    const p = progress();
    const done = completedCount(p);
    const xp = Store.state.training.xp || 0;
    const level = xpLevel(xp);
    const next = nextScenario();
    const skills = skillStats();
    const badges = computeBadges();
    const tab = hubInstance.tab;
    const filter = hubInstance.filterLevel;
    const list = filter === 'all' ? scenarios : scenarios.filter(s => s.level === Number(filter));
    root.innerHTML = `<div class="training-app">
      <header class="training-appbar"><div class="training-brand"><span class="training-mark">${Icons.icons.training.replace('class="icon-tile"','class="training-mark-icon"')}</span><div><strong>Training Hub</strong><small>APPELLO EA Academy</small></div></div><div class="training-appbar-center"><span class="training-live"><i></i> ${done} / ${scenarios.length} scenarios complete</span></div><div class="training-appbar-right"><button class="help-btn" data-help-training data-tip="How Learn, Practice, and Test modes work.">What is this?</button><button class="btn small" data-training-glossary data-tip="Open the plain-language glossary.">Glossary</button></div></header>
      <div class="training-body">
        <aside class="training-side">
          <button class="training-new ${session ? 'disabled' : ''}" data-training-continue><span>▶</span><div><strong>${session ? 'Session in progress' : 'Continue training'}</strong><small>${session ? 'Use the coach or task panel' : esc(next.title)}</small></div></button>
          <nav class="training-nav">
            <button class="${tab === 'dashboard' ? 'active' : ''}" data-training-tab="dashboard"><span>▦</span>Dashboard</button>
            <button class="${tab === 'scenarios' ? 'active' : ''}" data-training-tab="scenarios"><span>🎯</span>Scenarios <span class="training-nav-count">${scenarios.length}</span></button>
            <button class="${tab === 'skills' ? 'active' : ''}" data-training-tab="skills"><span>⚡</span>Skills</button>
            <button class="${tab === 'badges' ? 'active' : ''}" data-training-tab="badges"><span>🏅</span>Badges <span class="training-nav-count">${badges.filter(b => b.unlocked).length}</span></button>
          </nav>
          <div class="training-side-level"><span class="eyebrow">EA level</span><div class="level-badge">${level}</div><strong>${['Trainee','Desk Assistant','Coordinator','Trusted EA','Executive Partner','Chief of Staff'][Math.min(5, level-1)] || 'Executive Partner'}</strong><div class="xp-bar"><span style="width:${Math.min(100, ((xp % 400) / 400) * 100)}%"></span></div><small>${xp} XP · ${400 - (xp % 400)} to next level</small></div>
          <div class="training-side-footer"><button class="link-btn" data-training-shortcuts>Keyboard shortcuts</button><span>·</span><button class="link-btn" data-training-glossary>Glossary</button></div>
        </aside>
        <main class="training-main">
          ${tab === 'dashboard' ? hubDashboard(done, next, skills, badges, xp) : tab === 'scenarios' ? hubScenarios(list, filter) : tab === 'skills' ? hubSkills(skills) : hubBadges(badges)}
        </main>
      </div>
    </div>`;
    bindHub();
  }

  function hubDashboard(done, next, skills, badges, xp) {
    const pct = Math.round(done / scenarios.length * 100);
    const lv1 = scenarios.filter(s => s.level === 1);
    const lv2 = scenarios.filter(s => s.level === 2);
    const lv3 = scenarios.filter(s => s.level === 3);
    return `<div class="training-dash">
      <section class="training-hero">
        <div class="training-hero-copy"><span class="eyebrow">Executive Assistant Academy · Simulation</span><h1>${Utils.getGreeting()}, Elizabeth.</h1><p>You are learning the operating rhythm of an executive office. Every scenario uses the same company, people, and deadlines — so the practice feels like the job.</p><div class="hero-cta"><button class="btn primary" data-start-scenario="${next.id}" data-start-mode="learn">Continue: ${esc(next.title)}</button><button class="btn" data-training-tab="scenarios">Browse all 21 scenarios</button></div></div>
        <div class="training-progress-ring" style="--pct:${pct}"><div><strong>${pct}%</strong><span>complete</span></div></div>
      </section>
      <div class="training-stat-row">
        <div class="training-stat"><span>Scenarios</span><strong>${done}<small> / ${scenarios.length}</small></strong><p>${lv1.filter(s => progress()[s.id]?.completed).length}/6 Level 1 · ${lv2.filter(s => progress()[s.id]?.completed).length}/7 Level 2 · ${lv3.filter(s => progress()[s.id]?.completed).length}/8 Level 3</p></div>
        <div class="training-stat"><span>Experience</span><strong>${xp}<small> XP</small></strong><p>Badges ${badges.filter(b => b.unlocked).length}/${badges.length} · best score ${Math.max(0, ...Object.values(progress()).map(x => x.bestScore || 0))}</p></div>
        <div class="training-stat"><span>Skills mastered</span><strong>${skills.filter(s => s.pct >= 100).length}<small> / ${skills.length}</small></strong><p>${skills.filter(s => s.pct > 0).map(s => esc(s.label)).slice(0,3).join(' · ') || 'Start a scenario to build skills.'}</p></div>
        <div class="training-stat"><span>Recommended</span><strong style="font-size:15px;line-height:1.3">${esc(next.title)}</strong><p>Level ${next.level} · ${next.minutes} min · ${next.skills.map(k => SKILLS[k].label).join(', ')}</p></div>
      </div>
      <section class="training-section">
        <div class="training-section-head"><div><span class="eyebrow">Your path</span><h2>Three levels of executive support</h2></div><span class="pill blue">${scenarios.length} scenarios</span></div>
        <div class="level-cards">
          ${[1,2,3].map(l => {
            const list = l === 1 ? lv1 : l === 2 ? lv2 : lv3;
            const c = list.filter(s => progress()[s.id]?.completed).length;
            return `<div class="level-card level-${l}"><div class="level-card-head"><span class="level-num">${l}</span><div><strong>${l === 1 ? 'Basics' : l === 2 ? 'Daily EA work' : 'Advanced EA work'}</strong><small>${c} of ${list.length} complete</small></div><span class="pill ${c === list.length ? 'green' : 'blue'}">${Math.round(c/list.length*100)}%</span></div><div class="level-card-bar"><span style="width:${Math.round(c/list.length*100)}%"></span></div><div class="level-card-items">${list.slice(0,4).map(s => `<div class="level-mini ${progress()[s.id]?.completed ? 'done' : ''}"><span>${progress()[s.id]?.completed ? '✓' : '○'}</span>${esc(s.title)}</div>`).join('')}</div><button class="btn small" data-filter-level="${l}">View Level ${l} →</button></div>`;
          }).join('')}
        </div>
      </section>
      <section class="training-section">
        <div class="training-section-head"><div><span class="eyebrow">Recommended next</span><h2>Build the next habit</h2></div><button class="link-btn" data-training-tab="scenarios">All scenarios ›</button></div>
        <div class="scenario-feature" data-scenario-card="${next.id}">
          <div class="feature-icon">${esc(next.icon)}</div>
          <div class="feature-copy"><div class="inline-actions"><span class="pill purple">Level ${next.level}</span><span class="pill">${next.minutes} min</span>${next.skills.slice(0,2).map(k => `<span class="pill">${esc(SKILLS[k].label)}</span>`).join('')}</div><h3>${esc(next.title)}</h3><p>${esc(next.summary)}</p><div class="feature-brief"><strong>Who asked:</strong> ${esc(next.brief.from)} <span>·</span> <strong>Due:</strong> ${esc(next.brief.due)}</div><div class="inline-actions"><button class="btn primary small" data-start-scenario="${next.id}" data-start-mode="learn">Learn with coach</button><button class="btn small" data-start-scenario="${next.id}" data-start-mode="practice">Practice</button><button class="btn small" data-start-scenario="${next.id}" data-start-mode="test">Timed test</button><button class="link-btn" data-scenario-detail="${next.id}">Brief & criteria</button></div></div>
        </div>
      </section>
      <section class="training-section">
        <div class="training-section-head"><div><span class="eyebrow">Skill map</span><h2>What you are building</h2></div><button class="link-btn" data-training-tab="skills">Skill detail ›</button></div>
        <div class="skill-strip">${skills.map(s => `<div class="skill-strip-item" data-tip="${s.done} of ${s.total} scenarios completed for ${esc(s.label)}"><div><span>${s.icon}</span><strong>${esc(s.label)}</strong><small>${s.done}/${s.total}</small></div><div class="skill-bar"><span style="width:${s.pct}%"></span></div></div>`).join('')}</div>
      </section>
    </div>`;
  }

  function hubScenarios(list, filter) {
    return `<div class="training-scenarios">
      <div class="training-page-head"><div><span class="eyebrow">Practice library</span><h1>Scenarios</h1><p>Learn mode coaches every step. Practice mode gives you space. Test mode is timed, with no hints.</p></div><span class="pill blue">${scenarios.length} total</span></div>
      <div class="mode-legend"><div><span class="mode-dot learn"></span><strong>Learn</strong><p>Guided, with a coach and highlighted controls.</p></div><div><span class="mode-dot practice"></span><strong>Practice</strong><p>Open-ended, with three hint levels.</p></div><div><span class="mode-dot test"></span><strong>Test</strong><p>Timed, no hints, scored against criteria.</p></div></div>
      <div class="scenario-filter"><button class="${filter === 'all' ? 'active' : ''}" data-filter-level="all">All levels</button><button class="${filter === '1' ? 'active' : ''}" data-filter-level="1">Level 1 · Basics</button><button class="${filter === '2' ? 'active' : ''}" data-filter-level="2">Level 2 · Daily work</button><button class="${filter === '3' ? 'active' : ''}" data-filter-level="3">Level 3 · Advanced</button></div>
      <div class="scenario-grid">${list.map(sc => {
        const ps = progress()[sc.id] || {};
        return `<article class="scenario-card" data-scenario-card="${sc.id}">
          <div class="scenario-card-top"><span class="scenario-icon">${esc(sc.icon)}</span><div class="scenario-level-tags"><span class="pill purple">L${sc.level}</span><span class="pill">${sc.minutes} min</span>${ps.completed ? '<span class="pill green">✓ Complete</span>' : ''}</div><button class="icon-btn" data-scenario-detail="${sc.id}" aria-label="Scenario details" data-tip="See the brief, success criteria, and hints.">ⓘ</button></div>
          <h3>${esc(sc.title)}</h3><p>${esc(sc.summary)}</p>
          <div class="scenario-skills">${sc.skills.map(k => `<span>${SKILLS[k].icon} ${esc(SKILLS[k].label)}</span>`).join('')}</div>
          <div class="scenario-card-foot">
            <div class="scenario-best"><span>Best score</span><strong>${ps.bestScore || '—'}</strong></div>
            <div class="scenario-mode-buttons"><button class="btn small" data-start-scenario="${sc.id}" data-start-mode="learn" data-tip="Start the guided walkthrough.">Learn</button><button class="btn small" data-start-scenario="${sc.id}" data-start-mode="practice" data-tip="Start open practice with hints.">Practice</button><button class="btn small" data-start-scenario="${sc.id}" data-start-mode="test" data-tip="Start the timed, no-hints test.">Test</button></div>
          </div>
        </article>`;
      }).join('')}</div>
    </div>`;
  }
  function hubSkills(skills) {
    return `<div class="training-skills-page"><div class="training-page-head"><div><span class="eyebrow">Capability map</span><h1>Skills</h1><p>Each completed scenario contributes to the skills it practises. Mastery is not a badge — it is evidence you can repeat the work.</p></div></div><div class="skills-detail">${skills.map(s => `<div class="skill-detail-card"><div class="skill-detail-head"><span class="skill-detail-icon">${s.icon}</span><div><strong>${esc(s.label)}</strong><small>${s.done} of ${s.total} scenarios complete</small></div><span class="pill ${s.pct === 100 ? 'green' : 'blue'}">${s.pct}%</span></div><div class="skill-bar large"><span style="width:${s.pct}%"></span></div><div class="skill-scenario-list">${scenarios.filter(sc => sc.skills.includes(s.id)).map(sc => `<button class="skill-scenario ${progress()[sc.id]?.completed ? 'done' : ''}" data-scenario-detail="${sc.id}"><span>${progress()[sc.id]?.completed ? '✓' : '○'}</span>${esc(sc.title)}</button>`).join('')}</div></div>`).join('')}</div></div>`;
  }
  function hubBadges(badges) {
    return `<div class="training-badges-page"><div class="training-page-head"><div><span class="eyebrow">Recognition</span><h1>Badges</h1><p>Badges mark specific evidence: a clean triage, a resolved conflict, a board pack assembled. They are practice milestones, not certificates.</p></div><span class="pill green">${badges.filter(b => b.unlocked).length} earned</span></div><div class="badge-grid">${badges.map(b => `<div class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}"><div class="badge-icon">${b.icon}</div><div><strong>${esc(b.name)}</strong><p>${esc(b.desc)}</p><span class="pill ${b.unlocked ? 'green' : ''}">${b.unlocked ? 'Earned' : 'Locked'}</span></div></div>`).join('')}</div></div>`;
  }

  function resetHubScroll() {
    requestAnimationFrame(() => {
      const main = hubInstance && hubInstance.root && hubInstance.root.querySelector('.training-main');
      if (main) main.scrollTop = 0;
    });
  }
  function bindHub() {
    const root = hubInstance.root;
    root.querySelectorAll('[data-training-tab]').forEach(b => b.onclick = () => { hubInstance.tab = b.dataset.trainingTab; hubRender(); resetHubScroll(); });
    root.querySelectorAll('[data-filter-level]').forEach(b => b.onclick = () => { hubInstance.filterLevel = b.dataset.filterLevel; hubInstance.tab = 'scenarios'; hubRender(); resetHubScroll(); });
    root.querySelectorAll('[data-start-scenario]').forEach(b => b.onclick = () => startScenario(b.dataset.startScenario, b.dataset.startMode || 'learn'));
    root.querySelectorAll('[data-scenario-detail]').forEach(b => b.onclick = e => { e.stopPropagation(); openScenarioDetail(b.dataset.scenarioDetail); });
    root.querySelectorAll('[data-training-continue]').forEach(b => b.onclick = () => {
      if (session) { toast('Scenario active', 'Use the coach or the task panel to continue. You can exit from there if you need to restart.', { duration:3200 }); return; }
      startScenario(nextScenario().id, 'learn');
    });
    root.querySelectorAll('[data-help-training]').forEach(b => b.onclick = () => openHelp('training'));
    root.querySelectorAll('[data-training-glossary]').forEach(b => b.onclick = () => openGlossary());
    root.querySelectorAll('[data-training-shortcuts]').forEach(b => b.onclick = () => Utils.openShortcuts());
  }

  function openScenarioDetail(id) {
    const sc = scenarios.find(s => s.id === id);
    if (!sc) return;
    const p = progress()[sc.id] || {};
    modal({
      title:sc.title,
      subtitle:`Level ${sc.level} · ${sc.minutes} min · ${sc.skills.map(k => SKILLS[k].label).join(' · ')}`,
      size:'wide',
      body:`<div class="scenario-detail">
        <div class="scenario-brief-card"><span class="eyebrow">The brief</span><div class="scenario-brief-row"><span>Who asked</span><strong>${esc(sc.brief.from)}</strong></div><div class="scenario-brief-row"><span>What is needed</span><p>${esc(sc.brief.ask)}</p></div><div class="scenario-brief-row"><span>By when</span><strong>${esc(sc.brief.due)}</strong></div></div>
        <div class="scenario-detail-side"><div class="detail-stat"><span>Best score</span><strong>${p.bestScore || '—'}</strong></div><div class="detail-stat"><span>Attempts</span><strong>${p.attempts || 0}</strong></div><div class="detail-stat"><span>Learn</span><strong>${p.learnBest ? p.learnBest + '/100' : '—'}</strong></div><div class="detail-stat"><span>Test</span><strong>${p.testBest ? p.testBest + '/100' : '—'}</strong></div></div>
        <div class="scenario-criteria-card"><span class="eyebrow">Automatically checked success criteria</span>${sc.criteria.map(c => `<div class="scenario-criterion"><span>○</span>${esc(c.label)}</div>`).join('')}</div>
        <div class="scenario-hints-card"><span class="eyebrow">Hints (not available in Test mode)</span><div><strong>1 · Nudge</strong><p>${esc(sc.hints[0])}</p></div><div><strong>2 · Detailed</strong><p>${esc(sc.hints[1])}</p></div><div><strong>3 · Full solution</strong><p class="spoiler" data-tip="Hover or focus to reveal the full solution.">${esc(sc.hints[2])}</p></div></div>
      </div>`,
      footer:`<div class="left-actions"><button class="btn" data-detail-learn>Learn with coach</button><button class="btn" data-detail-practice>Practice</button><button class="btn" data-detail-test>Timed test</button></div><button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close]').onclick = close;
        el.querySelector('[data-detail-learn]').onclick = () => { close(); startScenario(sc.id,'learn'); };
        el.querySelector('[data-detail-practice]').onclick = () => { close(); startScenario(sc.id,'practice'); };
        el.querySelector('[data-detail-test]').onclick = () => { close(); startScenario(sc.id,'test'); };
      }
    });
  }

  /* ------------------------------- events ------------------------------- */
  function onBusEvent(e) {
    if (!session) return;
    if (e.type === 'training:mistake') {
      const mistake = { message:e.message || 'A professional standard was missed.', standard:e.standard || 'Check the brief and the etiquette guidance.', code:e.code };
      session.mistakes.push({ ...mistake, at:new Date().toISOString() });
      session.lastMistake = mistake;
      persistSession();
      toast('Coach feedback', `${mistake.message} ${mistake.standard}`, { kind:'error', duration:6400, icon:'🧭' });
      Bus.emit('training:mistake-recorded', { scenarioId:session.scenarioId, code:e.code });
      if (session.mode === 'learn') renderCoach(); else renderDock();
      return;
    }
    if (e.type === 'training:scenario-started' || e.type === 'training:scenario-finished' || e.type === 'training:hint-used' || e.type === 'training:step-advanced') return;
    if (session.mode === 'learn') {
      // The action log is appended after Bus handlers return, so defer one turn
      // before evaluating state/log-based criteria.
      setTimeout(() => { if (session && session.mode === 'learn') checkLearnStep(); }, 40);
    } else if (session.mode === 'practice') {
      // Update the criteria list whenever an action could have changed it.
      const relevant = /^(mail|calendar|teams|sheet|doc|note|todo|session|app|file|contact|help):/.test(e.type) && !e.type.startsWith('training:');
      if (relevant) {
        if (checkTimer) clearTimeout(checkTimer);
        checkTimer = setTimeout(() => {
          if (!session || session.mode !== 'practice') return;
          renderDock();
          if (allDone(session)) finishSession(true);
        }, 420);
      }
    }
  }

  /* -------------------------------- app --------------------------------- */
  const hubApp = {
    mount(container, win) {
      hubInstance = {
        root:document.createElement('div'), win, tab:'dashboard', filterLevel:'all',
        render:() => hubRender()
      };
      hubInstance.root.className = 'training-root app-fill';
      container.innerHTML = '';
      container.appendChild(hubInstance.root);
      hubRender();
      if (session) setTimeout(() => toast('Training session active', 'Your scenario is still running. Use the coach or task panel; this Hub is a reference.', { kind:'training', duration:3600 }), 400);
    },
    reopen() { if (hubInstance) hubRender(); },
    destroy() { hubInstance = null; }
  };
  App.register('training', hubApp);

  let didInit = false;
  function init() {
    if (didInit) return;
    didInit = true;
    Bus.on('*', onBusEvent);
    tickTimer = setInterval(tick, 1000);
    setTimeout(restoreSession, 700);
  }

  window.Training = {
    init, scenarios,
    openHub() { OS.openApp('training'); },
    openScenario(id) { OS.openApp('training'); setTimeout(() => openScenarioDetail(id), 180); },
    startScenario,
    searchScenarios(q) { return scenarios.filter(s => `${s.title} ${s.summary} ${s.skills.join(' ')} level ${s.level}`.toLowerCase().includes(String(q).toLowerCase())); },
    get session() { return session; },
    get progress() { return progress(); },
    finish: finishSession
  };
  // Self-init is safe before OS starts; it only binds an event listener.
  init();
})();
