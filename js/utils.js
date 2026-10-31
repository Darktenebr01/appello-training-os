/* Shared helpers: DOM, dates, time zones, events, modals, help, toasts. */
(function () {
  'use strict';

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escAttr(value) { return esc(value); }
  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function nl2br(text) { return esc(text).replace(/\n/g, '<br>'); }
  function paragraphHtml(text) {
    return String(text || '').split(/\n{2,}/).map(p => `<p>${nl2br(p).replace(/\n/g, '<br>')}</p>`).join('');
  }
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function debounce(fn, delay) {
    let t;
    const wrapped = function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
    wrapped.cancel = () => clearTimeout(t);
    return wrapped;
  }
  function throttle(fn, delay) {
    let last = 0, t;
    return function (...args) {
      const now = Date.now();
      if (now - last >= delay) { last = now; fn.apply(this, args); }
      else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, delay - (now - last)); }
    };
  }
  function nextFrame(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)); }
  function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
  function pluralize(n, singular, plural) { return `${n} ${n === 1 ? singular : (plural || singular + 's')}`; }
  function titleCase(s) { return String(s || '').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()); }
  function pronoun(name) { return name === 'Alexandra Morgan' ? 'she' : 'they'; }

  /* --------------------------- date helpers ---------------------------- */
  function parseISO(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  function dateKey(d) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function addDays(d, n) {
    const date = d instanceof Date ? new Date(d) : parseISO(d);
    date.setDate(date.getDate() + n);
    return date;
  }
  function addMinutes(time, mins) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = ((Math.floor(total / 60)) % 24 + 24) % 24;
    const mm = ((total % 60) + 60) % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  function minutesBetween(start, end) {
    const a = start.split(':').map(Number), b = end.split(':').map(Number);
    let mins = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]);
    if (mins < 0) mins += 1440;
    return mins;
  }
  function fmtDate(d, style) {
    const date = d instanceof Date ? d : parseISO(d);
    if (!date) return '';
    if (style === 'long') return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    if (style === 'medium') return `${DAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
    if (style === 'full') return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    if (style === 'month') return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  }
  function fmtTime(hhmm, opts) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    if (opts && opts.seconds) return `${hour}:${String(m).padStart(2, '0')}:${String(opts.seconds).padStart(2, '0')} ${suffix}`;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  function fmtTimeRange(start, end) { return `${fmtTime(start)} – ${fmtTime(end)}`; }
  function weekdayShort(d) { return DAYS_SHORT[(d instanceof Date ? d : parseISO(d)).getDay()]; }
  function startOfWeek(d) {
    const date = d instanceof Date ? new Date(d) : parseISO(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    return addDays(date, diff);
  }
  function startOfMonth(d) {
    const date = d instanceof Date ? new Date(d) : parseISO(d);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  function endOfMonth(d) {
    const date = d instanceof Date ? new Date(d) : parseISO(d);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  function sameDay(a, b) { return dateKey(a) === dateKey(b); }
  function relativeDay(dateStr) {
    const sim = Data.company.simulationDate;
    const d = parseISO(dateStr), s = parseISO(sim);
    const diff = Math.round((d - s) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 7) return DAYS[d.getDay()];
    return fmtDate(d, 'full');
  }
  function relativeTime(iso) {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const now = simNow().getTime();
    const diff = Math.max(0, now - then);
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    if (min < 1440) return `${Math.floor(min / 60)}h ago`;
    if (min < 10080) return `${Math.floor(min / 1440)}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function isoAt(dateStr, time) { return `${dateStr}T${time || '00:00'}:00`; }
  function humanDuration(mins) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }

  /* ------------------------- time zone conversion ----------------------- */
  function getTzParts(date, tz) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const parts = {};
    for (const p of dtf.formatToParts(date)) if (p.type !== 'literal') parts[p.type] = p.value;
    return { year: +parts.year, month: +parts.month, day: +parts.day, hour: +parts.hour % 24, minute: +parts.minute, second: +parts.second };
  }
  function tzOffsetMs(tz, date) {
    const p = getTzParts(date, tz);
    const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUTC - Math.floor(date.getTime() / 1000) * 1000;
  }
  function zonedToUtc(dateStr, timeStr, tz) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = (timeStr || '00:00').split(':').map(Number);
    const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    let offset = tzOffsetMs(tz, new Date(guess));
    let ts = guess - offset;
    offset = tzOffsetMs(tz, new Date(ts));
    ts = guess - offset;
    return new Date(ts);
  }
  function formatInTz(date, tz, opts) {
    return new Intl.DateTimeFormat('en-US', Object.assign({
      timeZone: tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }, opts || {})).format(date);
  }
  function convertZoned(dateStr, timeStr, fromTz, toTz) {
    const instant = zonedToUtc(dateStr, timeStr, fromTz);
    const parts = getTzParts(instant, toTz);
    return {
      date: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
      time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
      instant,
      text: formatInTz(instant, toTz, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    };
  }
  function timeZoneAbbr(tz) {
    const found = Data.timezones.find(z => z.id === tz);
    if (found) return found.abbr;
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
      return (parts.find(p => p.type === 'timeZoneName') || {}).value || tz;
    } catch (e) { return tz; }
  }
  function timeZoneLabel(tz) {
    const found = Data.timezones.find(z => z.id === tz);
    return found ? `${found.label} (${found.abbr})` : tz;
  }
  function zonesDiffer(a, b) { return a !== b; }
  function getLocalTimeForZone(tz) {
    return formatInTz(new Date(), tz, { hour: 'numeric', minute: '2-digit' });
  }
  function simNow() {
    // The training company operates on a fixed workday date, while the clock
    // ticks in real time. This keeps appointments deterministic all day.
    const d = new Date();
    const [y, m, day] = Data.company.simulationDate.split('-').map(Number);
    const ny = getTzParts(d, 'America/New_York');
    return new Date(y, m - 1, day, ny.hour, ny.minute, ny.second);
  }
  function simNowIso() {
    const d = simNow();
    return `${dateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
  function nowTime() {
    const d = simNow();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function eventInstant(ev) { return zonedToUtc(ev.date, ev.start, ev.tz || 'America/New_York'); }
  function eventEndInstant(ev) { return zonedToUtc(ev.date, ev.end, ev.tz || 'America/New_York'); }
  function eventsOverlap(a, b) {
    if (a.id === b.id) return false;
    return eventInstant(a) < eventEndInstant(b) && eventInstant(b) < eventEndInstant(a);
  }
  function eventsOnDate(events, dateStr, tz) {
    return events.filter(ev => {
      if (ev.date === dateStr) return true;
      if (!tz) return false;
      const p = getTzParts(eventInstant(ev), tz);
      return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` === dateStr;
    });
  }
  function timeRangeForEvent(ev, displayTz) {
    const tz = displayTz || ev.tz;
    if (tz === ev.tz) return fmtTimeRange(ev.start, ev.end);
    const a = convertZoned(ev.date, ev.start, ev.tz, tz);
    const b = convertZoned(ev.date, ev.end, ev.tz, tz);
    return `${fmtTime(a.time)} – ${fmtTime(b.time)}`;
  }

  /* ----------------------------- numbers -------------------------------- */
  function parseNum(v) {
    if (typeof v === 'number') return v;
    if (v == null || v === '') return 0;
    const n = Number(String(v).replace(/[$,%\s]/g, '').replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function formatNumber(n, decimals) {
    if (typeof n !== 'number' || isNaN(n)) return String(n == null ? '' : n);
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals == null ? 2 : decimals });
  }
  function formatMoney(n, decimals) {
    if (isNaN(n)) return '#VALUE!';
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals == null ? 0 : decimals, maximumFractionDigits: decimals == null ? 2 : decimals });
  }
  function formatPercent(n, decimals) {
    if (isNaN(n)) return '#VALUE!';
    return (n * 100).toFixed(decimals == null ? 0 : decimals) + '%';
  }
  function dateToSerial(date) {
    const d = date instanceof Date ? date : parseISO(date);
    const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
  }
  function serialToDate(serial) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(Number(serial) || 0) * 86400000;
    const d = new Date(utc);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  function formatSerialDate(serial, style) {
    return fmtDate(serialToDate(serial), style || 'full');
  }

  /* ------------------------------ events -------------------------------- */
  const Bus = {
    handlers: {},
    on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return () => this.off(type, fn); },
    off(type, fn) { this.handlers[type] = (this.handlers[type] || []).filter(h => h !== fn); },
    emit(type, detail) {
      const payload = Object.assign({ type, at: new Date().toISOString() }, detail || {});
      (this.handlers[type] || []).slice().forEach(fn => {
        try { fn(payload); } catch (err) { console.error('Bus handler failed for ' + type, err); }
      });
      (this.handlers['*'] || []).slice().forEach(fn => {
        try { fn(payload); } catch (err) { console.error('Bus wildcard handler failed', err); }
      });
      if (window.Store && Store.ready && !type.startsWith('clock:')) {
        Store.logAction(type, detail || {});
      }
    }
  };

  /* Locked external destinations for the game shortcuts. */
  const LOCKED_EXTERNAL_URLS = new Set([
    'https://dos.zone/doom-dec-1993/',
    'https://cyberpunk2077.lol/'
  ]);
  function openExternal(url) {
    if (!LOCKED_EXTERNAL_URLS.has(url)) {
      toast('Blocked destination', 'This browser is locked to the two game pages.', { kind:'error', duration:3200 });
      return false;
    }
    const popupWidth = Math.min(1440, Math.max(960, Math.round((window.screen.availWidth || 1440) * 0.78)));
    const popupHeight = Math.min(960, Math.max(640, Math.round((window.screen.availHeight || 900) * 0.82)));
    const left = Math.max(0, Math.round(((window.screen.availWidth || popupWidth) - popupWidth) / 2) + (window.screen.availLeft || 0));
    const top = Math.max(0, Math.round(((window.screen.availHeight || popupHeight) - popupHeight) / 2) + (window.screen.availTop || 0));
    const name = url.includes('dos.zone') ? 'appello-doom-window' : 'appello-cyberpunk-window';
    const features = `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`;
    const opened = window.open(url, name, features);
    if (opened) {
      try { opened.focus(); opened.opener = null; } catch (err) { /* cross-origin window handle */ }
      Bus.emit('browser:external-opened', { url, windowed:true });
      return true;
    }
    toast('Pop-up blocked', 'Allow pop-ups for this training page to launch the game window.', { kind:'error', duration:4200 });
    return false;
  }

  /* ------------------------------ toasts -------------------------------- */
  const toastTimers = new Map();
  function toast(title, message, opts) {
    const root = $('#toasts');
    if (!root) return;
    const kind = (opts && opts.kind) || 'info';
    const duration = opts && opts.duration ? opts.duration : 5200;
    const node = document.createElement('div');
    node.className = `toast ${kind}`;
    if (opts && opts.id) node.dataset.toastId = opts.id;
    const iconHtml = opts && opts.icon ? `<span class="toast-emoji" style="font-size:18px">${opts.icon}</span>` : '';
    node.innerHTML = `${iconHtml}<div class="toast-copy"><strong>${esc(title)}</strong>${message ? `<p>${esc(message)}</p>` : ''}</div><button class="toast-close" aria-label="Dismiss notification" type="button">✕</button><span class="toast-progress"></span>`;
    root.appendChild(node);
    const remove = () => {
      if (!node.isConnected) return;
      node.classList.add('out');
      setTimeout(() => node.remove(), 200);
      clearTimeout(toastTimers.get(node));
    };
    node.querySelector('.toast-close').addEventListener('click', remove);
    toastTimers.set(node, setTimeout(remove, duration));
    if (opts && opts.onClick) {
      node.style.cursor = 'pointer';
      node.addEventListener('click', e => { if (e.target.closest('.toast-close')) return; opts.onClick(); remove(); });
    }
    return node;
  }

  /* ------------------------------ modals -------------------------------- */
  let modalStack = [];
  let lastFocused = null;

  function modal(options) {
    const root = $('#modal-root');
    if (!root) return null;
    if (!modalStack.length) { lastFocused = document.activeElement; root.hidden = false; document.body.classList.add('modal-open'); }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;padding:22px;';
    const size = options.size === 'wide' ? 'wide' : options.size === 'narrow' ? 'narrow' : '';
    overlay.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${modalStack.length}">
        <div class="modal-head">
          <div><h2 id="modal-title-${modalStack.length}">${esc(options.title || '')}</h2>${options.subtitle ? `<p>${esc(options.subtitle)}</p>` : ''}</div>
          <button class="modal-close" type="button" aria-label="Close dialog" title="Close (Esc)">✕</button>
        </div>
        ${options.body != null ? `<div class="modal-body ${options.noPad ? 'no-pad' : ''}">${options.body}</div>` : ''}
        ${options.footer != null ? `<div class="modal-foot">${options.footer}</div>` : ''}
      </div>`;
    root.appendChild(overlay);
    // root uses grid for one modal; each overlay sits over it
    root.style.position = 'fixed';
    const modalEl = overlay.querySelector('.modal');
    const stackEntry = { overlay, modalEl, onClose: options.onClose, escape: options.dismissible !== false };
    modalStack.push(stackEntry);
    const close = (result) => closeModal(stackEntry, result);
    overlay.querySelector('.modal-close').addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', e => { if (e.target === overlay && options.dismissible !== false) close(null); });
    if (options.onOpen) setTimeout(() => { try { options.onOpen({ modal: modalEl, overlay, close }); } catch (err) { console.error(err); } }, 0);
    setTimeout(() => {
      const focusTarget = modalEl.querySelector('[autofocus], .modal-body input:not([type=hidden]), .modal-body textarea, .modal-body select, .modal-foot .primary, .modal-foot button:last-child');
      if (focusTarget) focusTarget.focus();
      else modalEl.setAttribute('tabindex', '-1'), modalEl.focus();
    }, 30);
    return { modal: modalEl, overlay, close, root, stackEntry };
  }

  function closeModal(entry, result) {
    const target = entry || modalStack[modalStack.length - 1];
    if (!target) return;
    const idx = modalStack.indexOf(target);
    if (idx === -1) return;
    modalStack.splice(idx, 1);
    target.overlay.remove();
    if (target.onClose) { try { target.onClose(result); } catch (e) { console.error(e); } }
    if (!modalStack.length) {
      $('#modal-root').hidden = true;
      document.body.classList.remove('modal-open');
      if (lastFocused && lastFocused.isConnected) lastFocused.focus();
    } else {
      const top = modalStack[modalStack.length - 1];
      const f = top.modalEl.querySelector('.modal-close');
      if (f) f.focus();
    }
  }
  function closeTopModal() {
    if (modalStack.length) closeModal();
  }
  function modalOpen() { return modalStack.length > 0; }

  function confirmDialog(options) {
    return new Promise(resolve => {
      let settled = false;
      const done = value => { if (!settled) { settled = true; resolve(value); } };
      const ref = modal({
        title: options.title || 'Confirm',
        subtitle: options.subtitle || '',
        size: 'narrow',
        body: `<p style="font-size:12.5px;line-height:1.6;color:#3f4e62">${options.message || ''}</p>`,
        footer: `<button type="button" class="btn" data-confirm-cancel>${esc(options.cancelText || 'Cancel')}</button><button type="button" class="btn ${options.danger ? 'danger' : 'primary'}" data-confirm-ok>${esc(options.okText || 'Continue')}</button>`,
        onOpen({ modal: el, close }) {
          el.querySelector('[data-confirm-cancel]').onclick = () => { done(false); close(false); };
          el.querySelector('[data-confirm-ok]').onclick = () => { done(true); close(true); };
          el.querySelector('[data-confirm-ok]').focus();
        },
        onClose() { done(false); }
      });
      if (!ref) resolve(false);
    });
  }

  /* ------------------------------- help --------------------------------- */
  const HELP = {
    mail: {
      what: 'Mail is your simulated Mail-style inbox and calendar. You can read, reply, schedule, flag, file, and send messages — but nothing leaves this computer.',
      tips: [
        ['Read an email', 'Click it in the middle list. The reading pane opens on the right and the unread dot disappears.'],
        ['Reply vs Reply All', 'Reply goes only to the sender. Reply All goes to everyone in To and CC. Use Reply All only when every person needs the answer.'],
        ['Compose a professional email', 'Click New email, add a clear subject, open with a greeting, state the ask or decision, and close with a next step.'],
        ['Calendar conflicts', 'A conflict appears in red. Do not double-book the executive; move one event or choose another time.'],
        ['What is a flag?', 'A flag is your personal “come back to this” marker. It does not tell the sender anything.'],
        ['Scheduled send', 'Instead of sending immediately, you can schedule a message for later. It waits in the Scheduled folder.']
      ],
      glossary: ['Inbox triage','Reply All','CC','BCC','Flag','Snooze','OOO','Conflict']
    },
    teams: {
      what: 'Teamspace is your chat, channels, meetings, and calls workspace for this training office.',
      tips: [
        ['Chat vs channel', 'Chat is a private conversation with one person or a small group. A channel is a shared workspace inside a team, visible to the channel members.'],
        ['@mention', 'Type @ followed by a name to get someone’s attention. Use it when the message genuinely needs that person.'],
        ['Threads', 'A thread keeps a side conversation attached to one message. Use “Reply in thread” instead of derailing the main channel.'],
        ['Joining a meeting', 'Click Join on a meeting. In the simulated room you can mute, turn the camera on or off, raise a hand, share a screen, chat, and take notes.'],
        ['Presence', 'Your status tells people whether you are available. Set Do Not Disturb when you are protecting focused work.']
      ],
      glossary: ['Mention','Thread','Pinned message','Presence','Hybrid meeting','Thread']
    },
    sheets: {
      what: 'Sheets is a working spreadsheet. Formulas actually calculate, charts redraw, and your edits are saved in this browser.',
      tips: [
        ['Cells and ranges', 'A cell has an address such as D11. A range like D2:D9 means every cell from D2 down to D9.'],
        ['Formulas', 'Start with =. =SUM(D2:D9) adds a range. =IF(F2>=0,"Under","Over") makes a decision. The Explain button translates the selected formula.'],
        ['Fill handle', 'Drag the small square at the bottom-right corner of a selected cell to copy a formula down a column.'],
        ['Freeze panes', 'Freeze keeps the header row visible while you scroll. Use the Freeze button in the toolbar.'],
        ['Charts', 'Select a data range and choose Bar or Pie. The chart updates whenever the numbers change.']
      ],
      glossary: ['Formula','Spreadsheet range','Formula bar','Name box','Fill handle','Freeze panes','Conditional formatting','VLOOKUP','XLOOKUP']
    },
    files: {
      what: 'Files is a simulated drive. Folders and documents are saved in this browser. Deleting a file moves it to the Recycle Bin, where you can restore it.',
      tips: [
        ['Opening a file', 'Double-click a document to open it in Docs, or a spreadsheet to open it in Sheets.'],
        ['Breadcrumbs', 'The path at the top shows where you are. Click any earlier folder to go back.'],
        ['Recycle Bin', 'Deleted files stay here until you restore them or empty the bin. This is your safety net.'],
        ['Recent files', 'Recently opened files appear in Start and Files so you can get back quickly.']
      ],
      glossary: ['Workspace','Distribution list']
    },
    docs: {
      what: 'Docs is a simple word processor for memos, agendas, and meeting notes. Your work saves to the simulated Files drive.',
      tips: [
        ['Formatting', 'Select text and use Bold, Italic, or Heading. Keep executive documents scannable with clear headings and short paragraphs.'],
        ['Save location', 'Use Save to choose a folder. A document that is not saved to Files will not be available to share.'],
        ['Docs count', 'The footer shows words and characters, helpful for keeping briefs short.'],
        ['Meeting notes', 'Capture decisions first, then actions with an owner and due date. Ambiguous notes create ambiguous work.']
      ],
      glossary: ['Brief','Action item','Milestone']
    },
    todo: {
      what: 'Tasks is your personal task list. My Day is a short list of the tasks you intend to finish today.',
      tips: [
        ['Priorities', 'High means a real deadline, risk, or executive dependency. Do not make everything high.'],
        ['Due dates', 'A task without a due date is a wish. Add a date and an owner to make it actionable.'],
        ['My Day', 'Add the three to five tasks you will actually finish today. Keep the list realistic.']
      ],
      glossary: ['Priority','Action item','Triage']
    },
    notes: {
      what: 'Notes holds quick meeting notes and reference snippets. Link a note to a meeting so the context stays together.',
      tips: [
        ['Linked meeting', 'Choose a calendar event so the note appears with that meeting context.'],
        ['Decisions vs actions', 'Write decisions as statements and actions with owner + due date.'],
        ['Pinned notes', 'Pin the notes you need repeatedly. Pin sparingly so the list stays useful.']
      ],
      glossary: ['Action item','Brief','Thread']
    },
    training: {
      what: 'Training Hub is the learning system for this workstation. Learn mode guides every click. Practice mode gives open tasks and hints. Test mode is timed and scored without hints.',
      tips: [
        ['Learn mode', 'Follow the highlighted control and the coach bubble. The coach explains why the step matters.'],
        ['Practice mode', 'Work independently. Use up to three hint levels if you get stuck.'],
        ['Test mode', 'No hints. A timer runs. Your score is based on the success criteria and time.'],
        ['Progress', 'Completed scenarios award XP, skills, and badges. Your progress is saved in this browser.']
      ],
      glossary: ['Brief','Triage','Conflict','Reply All','Action item']
    },
    clock: {
      what: 'Clock shows the current time in the cities where your executives, clients, and vendors work. Use it to avoid scheduling outside someone’s working hours.',
      tips: [
        ['Reading a world clock', 'The large time is local for that city. The label shows how far it is from New York.'],
        ['Scheduling', 'A 09:00 New York call is 14:00 in London and 19:00 in Dubai. Check before you send an invite.'],
        ['Working hours', 'The moon or sun icon shows whether it is daytime. A time can be technically possible but professionally unreasonable.']
      ],
      glossary: ['Time zone','Local time','Hybrid meeting']
    },
    calculator: {
      what: 'A standard calculator for quick checks while you plan budgets. It does not write results into Sheets automatically.',
      tips: [['Keyboard', 'You can type numbers and operators. Press Enter for equals and Escape to clear.']],
      glossary: []
    },
    settings: {
      what: 'Settings controls this training desktop only.',
      tips: [
        ['Personalization', 'Change the desktop background, accent colour, and night light. These settings save in this browser.'],
        ['Accessibility', 'Reduce motion, increase contrast, change text size, or learn the keyboard window controls.'],
        ['Privacy', 'See where training data lives, download an export, or reset the simulated company.'],
        ['Accounts', 'Sign in or out of the practice shift.']
      ],
      glossary: ['Local storage','Accent colour','Contrast','Simulation']
    }
  };

  function openHelp(appId) {
    const help = HELP[appId] || { what: 'This app is part of the simulated training desktop.', tips: [], glossary: [] };
    const glossaryTerms = help.glossary.map(term => Data.glossary.find(g => g[0].toLowerCase() === term.toLowerCase())).filter(Boolean);
    modal({
      title: `What is ${Data.appCatalog.find(a => a.id === appId)?.name || titleCase(appId)}?`,
      subtitle: 'Plain-language help for this training app. No prior Mail, Teamspace, Sheets, or office experience is assumed.',
      size: 'wide',
      body: `
        <div class="help-callout" style="margin-bottom:14px"><span>💡</span><div><strong>In plain language:</strong> ${esc(help.what)}</div></div>
        <h3 class="section-title" style="margin-bottom:9px">How to use it</h3>
        <div class="help-grid">${help.tips.map(([title, text]) => `<div class="help-card"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`).join('')}</div>
        ${glossaryTerms.length ? `<h3 class="section-title" style="margin:17px 0 8px">Words used here</h3><div class="help-grid">${glossaryTerms.map(([term, def]) => `<div class="help-card"><strong>${esc(term)}</strong><p>${esc(def)}</p></div>`).join('')}</div>` : ''}
      `,
      footer: `<div class="left-actions"><button role="button" class="btn" data-open-glossary>Open full glossary</button></div><button type="button" class="btn primary" data-close-help>Got it</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close-help]').onclick = () => close();
        el.querySelector('[data-open-glossary]').onclick = () => { close(); setTimeout(openGlossary, 100); };
      }
    });
  }

  function openGlossary(initialQuery) {
    Bus.emit('help:glossary-opened', { query: initialQuery || null });
    const body = `
      <div class="glossary-search"><input id="glossary-search" class="input" type="search" placeholder="Search a word or phrase…" value="${escAttr(initialQuery || '')}" autofocus aria-label="Search glossary"></div>
      <div id="glossary-count" class="muted-small" style="margin-bottom:7px">${Data.glossary.length} terms</div>
      <div id="glossary-list" class="glossary-list"></div>`;
    modal({
      title: 'Plain-language glossary',
      subtitle: 'Every term is written for someone who has never worked in an office before.',
      size: 'wide',
      body,
      footer: `<button class="btn primary" data-close>Close glossary</button>`,
      onOpen({ modal: el, close }) {
        const input = el.querySelector('#glossary-search');
        const list = el.querySelector('#glossary-list');
        const count = el.querySelector('#glossary-count');
        const render = q => {
          const needle = (q || '').toLowerCase().trim();
          const rows = Data.glossary.filter(([t, d]) => !needle || t.toLowerCase().includes(needle) || d.toLowerCase().includes(needle));
          count.textContent = pluralize(rows.length, 'term');
          list.innerHTML = rows.length ? rows.map(([t, d]) => `<div class="glossary-item"><strong>${esc(t)}</strong><p>${esc(d)}</p></div>`).join('') : `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⌕</div><h3>No matching term</h3><p>Try a simpler word, or ask the training coach.</p></div>`;
        };
        input.addEventListener('input', () => render(input.value));
        el.querySelector('[data-close]').onclick = () => close();
        render(initialQuery || '');
        setTimeout(() => input.focus(), 40);
      }
    });
  }

  function openShortcuts() {
    modal({
      title: 'Keyboard shortcuts',
      subtitle: 'Everything important can be reached from the keyboard. Shortcuts work in the training OS when no text field is active.',
      size: 'wide',
      body: `<div class="key-list">${Data.shortcuts.map(([label, keys]) => `<div class="key-row"><span>${esc(label)}</span><span>${keys.map(k => `<kbd>${esc(k)}</kbd>`).join('')}</span></div>`).join('')}</div>
      <div class="help-callout" style="margin-top:15px"><span>⌨</span><div><strong>Accessibility:</strong> press Tab to move through controls, Enter or Space to activate, and Esc to close menus and dialogs. Visible focus rings show where you are.</div></div>`,
      footer: `<button class="btn primary" data-close>Close</button>`,
      onOpen({ modal: el, close }) { el.querySelector('[data-close]').onclick = close; }
    });
  }

  /* --------------------------- tooltip system --------------------------- */
  let tooltipEl = null, tooltipTimer = null;
  function initTooltips() {
    if (tooltipEl) return;
    tooltipEl = document.getElementById('tooltip');
    if (!tooltipEl) return;
    const show = target => {
      const text = target.getAttribute('data-tip');
      if (!text) return;
      tooltipEl.textContent = text;
      tooltipEl.hidden = false;
      const r = target.getBoundingClientRect();
      const tr = tooltipEl.getBoundingClientRect();
      let left = r.left + r.width / 2 - tr.width / 2;
      left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, left));
      let top = r.top - tr.height - 8;
      let pos = 'top';
      if (top < 40) { top = r.bottom + 8; pos = 'bottom'; }
      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top = top + 'px';
      tooltipEl.dataset.pos = pos;
      tooltipEl.style.setProperty('--arrow', (r.left + r.width / 2 - left) + 'px');
    };
    const hide = () => { clearTimeout(tooltipTimer); if (tooltipEl) tooltipEl.hidden = true; };
    document.addEventListener('mouseover', e => {
      const target = e.target.closest('[data-tip]');
      if (!target || target === tooltipEl) return;
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(() => show(target), 420);
    });
    document.addEventListener('mouseout', e => {
      const target = e.target.closest('[data-tip]');
      if (!target) return;
      hide();
    });
    document.addEventListener('focusin', e => {
      const target = e.target.closest('[data-tip]');
      if (!target) return;
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(() => show(target), 250);
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('mousedown', hide);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', hide, true);
  }

  /* -------------------------- keyboard focus ---------------------------- */
  function trapFocus(container) {
    const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    const onKey = e => {
      if (e.key !== 'Tab') return;
      const items = $$(selector, container).filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }

  function sanitizeDocHtml(html) {
    const allowed = new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','H1','H2','H3','H4','UL','OL','LI','BLOCKQUOTE','A','SPAN','TABLE','THEAD','TBODY','TR','TD','TH','HR']);
    const template = document.createElement('template');
    template.innerHTML = html || '';
    const walk = node => {
      Array.from(node.children).forEach(child => {
        if (!allowed.has(child.tagName)) {
          if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'IFRAME' || child.tagName === 'OBJECT') {
            child.remove(); return;
          }
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          child.replaceWith(frag);
          return;
        }
        Array.from(child.attributes).forEach(attr => {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on') || name === 'srcdoc' || (name === 'href' && /^javascript:/i.test(attr.value)) || (name === 'style' && /expression|url\(/i.test(attr.value))) child.removeAttribute(attr.name);
        });
        walk(child);
      });
    };
    walk(template.content);
    return template.innerHTML;
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* no-op */ }
    ta.remove();
  }

  function statusColor(status) {
    return ({ Available:'available', Busy:'busy', 'In a Meeting':'meeting', Away:'away', 'Do Not Disturb':'dnd' })[status] || 'available';
  }
  function presenceClass(status) { return statusColor(status); }

  function pluralizeCount(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

  function avatarColor(id) {
    const c = Data.contactById[id];
    return c ? c.tone : 3;
  }

  function getGreeting() {
    const h = simNow().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function startOfDay(d) { const x = d instanceof Date ? new Date(d) : parseISO(d); x.setHours(0,0,0,0); return x; }
  function diffDays(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }
  function sortByDateDesc(arr, field) { return arr.slice().sort((a, b) => new Date(b[field]) - new Date(a[field])); }

  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlightText(text, query) {
    if (!query) return esc(text);
    try {
      return esc(text).replace(new RegExp('(' + escapeRegExp(query) + ')', 'ig'), '<mark>$1</mark>');
    } catch (e) { return esc(text); }
  }

  function focusWithoutScroll(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  const AppRegistry = {
    apps: {},
    register(id, definition) {
      this.apps[id] = Object.assign({ id }, definition);
      return this.apps[id];
    },
    get(id) { return this.apps[id]; },
    all() { return Object.values(this.apps); }
  };
  window.App = AppRegistry;

  window.Utils = {
    $, $$, esc, escAttr, stripHtml, nl2br, paragraphHtml, uid, clamp, debounce, throttle, nextFrame,
    initials, pluralize, titleCase, pronoun,
    parseISO, dateKey, addDays, addMinutes, minutesBetween, fmtDate, fmtTime, fmtTimeRange, weekdayShort,
    startOfWeek, startOfMonth, endOfMonth, sameDay, relativeDay, relativeTime, isoAt, humanDuration,
    zonedToUtc, getTzParts, formatInTz, convertZoned, timeZoneAbbr, timeZoneLabel, zonesDiffer,
    getLocalTimeForZone, simNow, simNowIso, nowTime, eventInstant, eventEndInstant, eventsOverlap,
    eventsOnDate, timeRangeForEvent,
    parseNum, formatNumber, formatMoney, formatPercent, dateToSerial, serialToDate, formatSerialDate,
    Bus, toast, modal, closeModal, closeTopModal, modalOpen, confirm: confirmDialog, openExternal,
    openHelp, openGlossary, openShortcuts, HELP,
    initTooltips, trapFocus, sanitizeDocHtml, downloadFile, copyText,
    statusColor, presenceClass, pluralizeCount, avatarColor, getGreeting,
    startOfDay, diffDays, sortByDateDesc, highlightText, focusWithoutScroll
  };
  window.Bus = Bus;
})();
