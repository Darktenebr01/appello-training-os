/* Reusable calendar shared by Mail and Teamspace. One source of truth:
   Store.state.calendar.events. */
(function () {
  'use strict';
  const { esc, fmtDate, fmtTime, dateKey, parseISO, addDays, startOfWeek, startOfMonth,
    getTzParts, zonedToUtc, convertZoned, eventInstant, eventsOverlap, timeZoneLabel,
    toast, modal, confirm, Bus, timeRangeForEvent, downloadFile } = Utils;

  const HOURS_START = 7;
  const HOURS_END = 22;
  const PX_PER_HOUR = 58;
  const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const TYPE_COLORS = {
    meeting: '#2f6fd0', call: '#6b5ac9', focus: '#5c7b6e', meal: '#a96c2c',
    travel: '#317a8c', board: '#7d4cbc', press: '#a34b77', deadline: '#b33a2e', event: '#ad6a1c'
  };
  const TYPE_LABELS = {
    meeting: 'Meeting', call: 'Call', focus: 'Focus time', meal: 'Meal',
    travel: 'Travel', board: 'Board', press: 'Press', deadline: 'Deadline', event: 'Event'
  };

  function eventStyle(ev) {
    const c = TYPE_COLORS[ev.type] || '#2f6fd0';
    return `--event-color:${c};--event-soft:${c}18;`;
  }

  function occurrenceId(ev, date) { return `${ev.id}__${date}`; }

  function expandEvents(events, rangeStart, rangeEnd) {
    const start = parseISO(rangeStart), end = parseISO(rangeEnd);
    const rangeEndKey = rangeEnd instanceof Date ? dateKey(rangeEnd) : String(rangeEnd);
    const result = [];
    events.forEach(ev => {
      if (!ev.recurrence || !ev.recurrence.freq) {
        if (ev.date >= rangeStart && ev.date <= rangeEndKey) result.push(Object.assign({}, ev, { _masterId: ev.id, _date: ev.date }));
        return;
      }
      const until = ev.recurrence.until || '2027-12-31';
      let cursor = parseISO(ev.date);
      let guard = 0;
      while (cursor <= end && guard++ < 500) {
        const key = dateKey(cursor);
        if (key >= rangeStart && key <= rangeEnd && key <= until) {
          result.push(Object.assign({}, ev, { id: occurrenceId(ev, key), _masterId: ev.id, _date: key, date: key, recurrence: ev.recurrence }));
        }
        if (key > until) break;
        if (ev.recurrence.freq === 'daily') cursor = addDays(cursor, 1);
        else if (ev.recurrence.freq === 'weekly') cursor = addDays(cursor, 7);
        else if (ev.recurrence.freq === 'monthly') {
          const next = new Date(cursor);
          next.setMonth(next.getMonth() + 1);
          cursor = next;
        } else break;
      }
    });
    return result;
  }

  function eventOnDisplayDate(ev, tz) {
    if (!tz || tz === ev.tz) return ev.date;
    const p = getTzParts(zonedToUtc(ev.date, ev.start, ev.tz || 'America/New_York'), tz);
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }

  function displayTimes(ev, tz) {
    if (!tz || tz === ev.tz) return { date: ev.date, start: ev.start, end: ev.end };
    const a = convertZoned(ev.date, ev.start, ev.tz, tz);
    const b = convertZoned(ev.date, ev.end, ev.tz, tz);
    return { date: a.date, start: a.time, end: b.time };
  }

  function minutesOf(time) { const [h, m] = time.split(':').map(Number); return h * 60 + m; }

  function conflictIds(events, tz) {
    const ids = new Set();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (eventsOverlap(events[i], events[j])) { ids.add(events[i].id); ids.add(events[j].id); }
      }
    }
    return ids;
  }

  function displayEventsForRange(events, rangeStart, rangeEnd, tz) {
    const expanded = expandEvents(events, rangeStart, dateKey(addDays(parseISO(rangeEnd), 1)));
    return expanded.map(ev => {
      const t = displayTimes(ev, tz);
      return Object.assign({}, ev, { _displayDate: t.date, _start: t.start, _end: t.end });
    }).filter(ev => ev._displayDate >= rangeStart && ev._displayDate <= rangeEnd);
  }

  function detectConflicts(candidate, allEvents, options) {
    const opts = options || {};
    const startInstant = zonedToUtc(candidate.date, candidate.start, candidate.tz || 'America/New_York');
    const endInstant = zonedToUtc(candidate.date, candidate.end, candidate.tz || 'America/New_York');
    const cStart = new Date(startInstant), cEnd = new Date(endInstant);
    const conflicts = [];
    allEvents.forEach(ev => {
      if (ev.id === opts.excludeId || ev.id.split('__')[0] === opts.excludeId) return;
      if (!eventsOverlap({ id:'candidate', date:candidate.date, start:candidate.start, end:candidate.end, tz:candidate.tz || 'America/New_York' }, ev)) return;
      conflicts.push({ event: ev, room: candidate.room && ev.room === candidate.room });
    });
    return conflicts;
  }

  const RSVP_LABELS = { accepted:'Accepted', declined:'Declined', tentative:'Tentative', 'needs-action':'Awaiting response' };

  function ensureResponses(ev) {
    const map = Object.assign({}, ev.responses || {});
    (ev.attendees || []).forEach((id, index) => {
      if (map[id]) return;
      map[id] = id === 'me' ? 'accepted' : (index % 4 === 1 ? 'tentative' : index % 5 === 2 ? 'declined' : index % 3 === 0 ? 'needs-action' : 'accepted');
    });
    (ev.externalGuests || []).forEach((email, index) => {
      const key = 'ext:' + email;
      if (!map[key]) map[key] = index % 3 === 0 ? 'needs-action' : 'accepted';
    });
    return map;
  }
  function icsStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }
  function icsEscape(text) {
    return String(text || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function buildICS(ev) {
    const start = zonedToUtc(ev.date, ev.start, ev.tz || 'America/New_York');
    const end = zonedToUtc(ev.date, ev.end, ev.tz || 'America/New_York');
    const room = ev.room ? (Data.rooms.find(r => r.id === ev.room) || {}).name : '';
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//APPELLO EA Academy//Training Calendar//EN',
      'CALSCALE:GREGORIAN', 'METHOD:REQUEST', 'BEGIN:VEVENT',
      `UID:${ev.id}@appello.training`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsEscape(ev.title)}`,
      `DESCRIPTION:${icsEscape((ev.note || 'Training simulation meeting.') + '\n\nThis is a fictional training invitation.')}`,
      `LOCATION:${icsEscape(ev.teams ? 'Teamspace meeting (practice)' : (room || ev.location || 'APPELLO'))}`,
      `ORGANIZER;CN=${icsEscape(Store.state.profile.name)}:mailto:${Store.state.profile.email}`
    ];
    (ev.attendees || []).filter(id => id !== 'me').forEach(id => {
      const c = Store.contactById(id);
      if (c) lines.push(`ATTENDEE;CN=${icsEscape(c.name)};PARTSTAT=${(ensureResponses(ev)[id] || 'needs-action').toUpperCase().replace('-', '')}:mailto:${c.email}`);
    });
    (ev.externalGuests || []).forEach(email => lines.push(`ATTENDEE;CN=${icsEscape(email.split('@')[0])};PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${email}`));
    lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadICS(ev) {
    downloadFile(`${String(ev.title || 'invitation').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'invitation'}.ics`, buildICS(ev), 'text/calendar;charset=utf-8');
    Bus.emit('calendar:ics-downloaded', { eventId:ev.id, title:ev.title, externalGuests:(ev.externalGuests || []).length });
    toast('Invitation downloaded', 'The .ics file can be opened in Mail, a standard calendar app. This is a fictional training invitation.', { kind:'success', duration:4400 });
  }
  function emailInvitation(ev) {
    const guests = (ev.externalGuests || []);
    if (!window.MailApp) return;
    const body = `Hello,\n\nYou are invited to the following meeting:\n\n${ev.title}\n${fmtDate(parseISO(ev.date), 'long')} · ${fmtTime(ev.start)}–${fmtTime(ev.end)} ${Utils.timeZoneAbbr(ev.tz)}\n${ev.room ? 'Room: ' + ((Data.rooms.find(r => r.id === ev.room) || {}).name || '') + '\n' : ''}${ev.teams ? 'Teamspace meeting link: simulated training room\n' : ''}\nAgenda:\n${ev.note || 'No agenda provided.'}\n\nAn .ics invitation is available from the calendar event.\n\nBest regards,\nElizabeth Hale\nExecutive Assistant to Alexandra Morgan`;
    MailApp.openCompose({ mode:'new', to:guests, subject:`Invitation: ${ev.title}`, body });
  }

  function attendeeNames(attendees) {
    return (attendees || []).map(id => {
      if (id === 'me') return 'Elizabeth Hale';
      const c = Data.contactById[id];
      return c ? c.name : id;
    });
  }

  function attendeeAvatars(attendees, max) {
    const list = (attendees || []).slice(0, max || 5);
    return list.map((id, i) => {
      const c = id === 'me' ? { name:'Elizabeth Hale', tone:2 } : Data.contactById[id] || { name:id, tone:(i % 8) + 1 };
      return Icons.avatar(c.name, 'avatar-sm', c.tone);
    }).join('');
  }

  function timeLabelForEvent(ev, tz) {
    const t = displayTimes(ev, tz);
    return `${fmtTime(t.start)} – ${fmtTime(t.end)}`;
  }

  /* ----------------------------- main view ------------------------------ */
  function mount(container, options) {
    const opts = Object.assign({ context:'mail', displayTz:'America/New_York', focusDate:null, view:'week' }, options || {});
    const root = document.createElement('div');
    root.className = 'calendar-app';
    container.innerHTML = '';
    container.appendChild(root);
    let state = Store.state;
    let view = opts.view || state.calendar.view || 'week';
    let focusDate = opts.focusDate || state.calendar.focusDate || state.company.simulationDate;
    let displayTz = opts.displayTz || state.calendar.displayTz || 'America/New_York';
    let destroyed = false;

    function rerender() {
      if (destroyed) return;
      state = Store.state;
      state.calendar.view = view;
      state.calendar.focusDate = focusDate;
      state.calendar.displayTz = displayTz;
      Store.commit();
      render();
    }

    function nav(delta) {
      if (view === 'day') focusDate = dateKey(addDays(parseISO(focusDate), delta));
      else if (view === 'week') focusDate = dateKey(addDays(parseISO(focusDate), delta * 7));
      else {
        const d = parseISO(focusDate);
        d.setMonth(d.getMonth() + delta);
        focusDate = dateKey(d);
      }
      rerender();
    }

    function range() {
      if (view === 'day') return { start: focusDate, end: focusDate };
      if (view === 'week') {
        const s = startOfWeek(parseISO(focusDate));
        return { start: dateKey(s), end: dateKey(addDays(s, 6)) };
      }
      const s = startOfMonth(parseISO(focusDate));
      const gridStart = startOfWeek(s);
      return { start: dateKey(gridStart), end: dateKey(addDays(gridStart, 41)) };
    }

    function title() {
      if (view === 'day') return fmtDate(focusDate, 'long');
      if (view === 'week') {
        const r = range();
        const a = parseISO(r.start), b = parseISO(r.end);
        if (a.getMonth() === b.getMonth()) return `${fmtDate(a, 'month')} ${a.getDate()}–${b.getDate()}`;
        return `${fmtDate(a, 'month')} ${a.getDate()} – ${fmtDate(b, 'month')} ${b.getDate()}`;
      }
      return fmtDate(focusDate, 'month');
    }

    function render() {
      const r = range();
      const occ = displayEventsForRange(state.calendar.events, r.start, r.end, displayTz);
      const conflictSet = conflictIds(occ, displayTz);
      const today = state.company.simulationDate;
      root.innerHTML = `
        <div class="calendar-toolbar">
          <div class="cal-toolbar-left">
            <button class="btn small" data-cal-today title="Jump to today, November 9">Today</button>
            <button class="icon-btn" data-cal-prev aria-label="Previous ${view}" data-tip="Go back one ${view}.">‹</button>
            <button class="icon-btn" data-cal-next aria-label="Next ${view}" data-tip="Go forward one ${view}.">›</button>
            <h2 class="cal-title">${esc(title())}</h2>
          </div>
          <div class="cal-toolbar-right">
            <div class="cal-tz-wrap">
              <span class="cal-tz-label" data-tip="Change the displayed time zone. All events convert automatically.">🌐 ${esc(Utils.timeZoneAbbr(displayTz))}</span>
              <select class="select sm cal-tz-select" data-cal-tz aria-label="Display time zone" data-tip="Choose a time zone to view the same calendar in that part of the world.">
                ${Data.timezones.map(z => `<option value="${z.id}" ${z.id === displayTz ? 'selected' : ''}>${esc(z.label)} (${esc(z.abbr)})</option>`).join('')}
              </select>
            </div>
            <div class="cal-view-switch" role="tablist" aria-label="Calendar view">
              ${['day','week','month'].map(v => `<button role="tab" aria-selected="${view === v}" class="${view === v ? 'active' : ''}" data-cal-view="${v}" data-tip="${v === 'day' ? 'See one day in detail.' : v === 'week' ? 'See the whole week at once.' : 'See the month and spot busy days.'}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
            </div>
            <button class="btn primary small" data-cal-new data-tip="Create a meeting, call, focus block, or travel hold. The app checks Alexandra’s conflicts.">+ New meeting</button>
          </div>
        </div>
        <div class="calendar-body">
          ${view === 'month' ? renderMonth(r, occ, conflictSet, today) : view === 'day' ? renderDay(r, occ, conflictSet, today) : renderWeek(r, occ, conflictSet, today)}
        </div>
        <div class="cal-legend">
          <span class="cal-conflict-key"><i></i> Conflict</span>
          ${Object.entries(TYPE_LABELS).slice(0, 6).map(([k, v]) => `<span class="cal-type-key"><i style="background:${TYPE_COLORS[k]}"></i>${v}</span>`).join('')}
          <span class="spacer"></span>
          <span class="muted-small">${occ.filter(e => conflictSet.has(e.id)).length} conflicting event${occ.filter(e => conflictSet.has(e.id)).length === 1 ? '' : 's'} in this view</span>
        </div>`;
      bind();
    }

    function renderWeek(r, occ, conflictSet, today) {
      const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(parseISO(r.start), i)));
      const byDay = {};
      days.forEach(d => byDay[d] = []);
      occ.forEach(ev => { if (byDay[ev._displayDate]) byDay[ev._displayDate].push(ev); });
      const hourMarks = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);
      return `
        <div class="week-view">
          <div class="week-head">
            <div class="week-gutter"></div>
            ${days.map(d => {
              const dt = parseISO(d);
              return `<button class="week-day-head ${d === today ? 'today' : ''}" data-cal-day="${d}" data-tip="Open ${esc(fmtDate(dt, 'long'))} in day view.">
                <span>${WEEKDAYS[(dt.getDay() + 6) % 7]}</span><strong>${dt.getDate()}</strong>
              </button>`;
            }).join('')}
          </div>
          <div class="week-scroll">
            <div class="week-grid" style="height:${(HOURS_END - HOURS_START) * PX_PER_HOUR}px">
              <div class="week-gutter">${hourMarks.map(h => `<div class="hour-label" style="top:${(h - HOURS_START) * PX_PER_HOUR}px">${fmtTime(`${String(h).padStart(2,'0')}:00`)}</div>`).join('')}</div>
              ${days.map(d => `<div class="week-day-col" data-cal-day="${d}">
                ${hourMarks.slice(0, -1).map((h, i) => `<div class="hour-line" style="top:${i * PX_PER_HOUR}px"></div>`).join('')}
                ${d === today ? currentTimeLine() : ''}
                ${layoutEvents(byDay[d], conflictSet, false)}
              </div>`).join('')}
            </div>
          </div>
        </div>`;
    }

    function renderDay(r, occ, conflictSet, today) {
      const day = r.start;
      const events = occ.filter(e => e._displayDate === day);
      const hourMarks = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);
      return `<div class="day-view">
        <div class="day-head">
          <div><span class="eyebrow">${esc(fmtDate(day, 'long'))}</span><h3>${events.length ? events.length + ' scheduled item' + (events.length === 1 ? '' : 's') : 'A clear day'}</h3></div>
          <div class="day-head-stats"><span class="pill blue">${esc(Utils.timeZoneAbbr(displayTz))}</span>${conflictSet.size ? `<span class="pill red">Conflicts detected</span>` : `<span class="pill green">No conflicts</span>`}</div>
        </div>
        <div class="day-scroll">
          <div class="day-grid" style="height:${(HOURS_END - HOURS_START) * PX_PER_HOUR}px">
            <div class="week-gutter">${hourMarks.map(h => `<div class="hour-label" style="top:${(h - HOURS_START) * PX_PER_HOUR}px">${fmtTime(`${String(h).padStart(2,'0')}:00`)}</div>`).join('')}</div>
            <div class="day-work-col">
              ${hourMarks.slice(0, -1).map((h, i) => `<div class="hour-line" style="top:${i * PX_PER_HOUR}px"></div>`).join('')}
              ${day === today ? currentTimeLine() : ''}
              ${layoutEvents(events, conflictSet, true)}
            </div>
          </div>
        </div>
      </div>`;
    }

    function renderMonth(r, occ, conflictSet, today) {
      const days = Array.from({ length: 42 }, (_, i) => dateKey(addDays(parseISO(r.start), i)));
      const byDay = {};
      days.forEach(d => byDay[d] = []);
      occ.forEach(ev => { if (byDay[ev._displayDate]) byDay[ev._displayDate].push(ev); });
      const month = parseISO(focusDate).getMonth();
      return `<div class="month-view">
        <div class="month-weekdays">${WEEKDAYS.map(d => `<span>${d}</span>`).join('')}</div>
        <div class="month-grid">
          ${days.map(d => {
            const dt = parseISO(d);
            const evs = byDay[d].sort((a, b) => a._start.localeCompare(b._start));
            return `<div class="month-day ${dt.getMonth() !== month ? 'outside' : ''} ${d === today ? 'today' : ''}" data-cal-day="${d}">
              <div class="month-day-num"><span>${dt.getDate()}</span>${evs.filter(e => conflictSet.has(e.id)).length ? `<i class="conflict-dot" title="Conflict on this day"></i>` : ''}</div>
              <div class="month-events">
                ${evs.slice(0, 3).map(ev => `<button class="month-event ${conflictSet.has(ev.id) ? 'conflict' : ''}" data-event-id="${esc(ev._masterId)}" data-event-date="${esc(ev._date)}" data-tip="${esc(ev.title + ' · ' + timeLabelForEvent(ev, displayTz))}" style="${eventStyle(ev)}"><span class="month-event-dot"></span><span>${esc(ev.title)}</span></button>`).join('')}
                ${evs.length > 3 ? `<button class="month-more" data-cal-day="${d}">+${evs.length - 3} more</button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    function currentTimeLine() {
      const now = Utils.simNow();
      const mins = now.getHours() * 60 + now.getMinutes() - HOURS_START * 60;
      if (mins < 0 || mins > (HOURS_END - HOURS_START) * 60) return '';
      return `<div class="now-line" style="top:${mins / 60 * PX_PER_HOUR}px"><span>${fmtTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)}</span></div>`;
    }

    function layoutEvents(events, conflictSet, tall) {
      if (!events.length) return '';
      const sorted = events.slice().sort((a, b) => a._start.localeCompare(b._start) || a._end.localeCompare(b._end));
      // Assign columns for overlapping clusters so double-bookings are visible.
      const columns = [];
      const assigned = [];
      sorted.forEach(ev => {
        const s = minutesOf(ev._start), e = Math.max(minutesOf(ev._end), s + 20);
        const overlapping = assigned.filter(x => x.s < e && s < x.e);
        const used = new Set(overlapping.map(x => x.col));
        let col = 0; while (used.has(col)) col++;
        assigned.push({ s, e, col, ev });
        columns.push(col);
      });
      const maxCols = Math.max(1, ...columns.map(c => c + 1));
      // Limit to 3 columns to keep content readable; overlap still obvious.
      return assigned.map(({ ev, s, e, col }) => {
        const top = clamp((s - HOURS_START * 60) / 60 * PX_PER_HOUR, 0, (HOURS_END - HOURS_START) * PX_PER_HOUR);
        const height = clamp((e - s) / 60 * PX_PER_HOUR, 24, (HOURS_END - HOURS_START) * PX_PER_HOUR - top);
        const widthPct = maxCols > 1 ? Math.max(46, 100 / Math.min(maxCols, 3)) : 100;
        const leftPct = col === 0 ? 0 : Math.min(52, col * (100 / Math.min(maxCols, 3)));
        const conflict = conflictSet.has(ev.id);
        return `<button class="cal-event ${conflict ? 'conflict' : ''} ${tall ? 'tall' : ''}" data-event-id="${esc(ev._masterId)}" data-event-date="${esc(ev._date)}" style="${eventStyle(ev)};top:${top}px;height:${height}px;left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 5px);" data-tip="${esc(ev.title + ' · ' + timeLabelForEvent(ev, displayTz))}">
          <span class="cal-event-time">${esc(timeLabelForEvent(ev, displayTz))}${conflict ? ' · CONFLICT' : ''}</span>
          <strong>${esc(ev.title)}</strong>
          ${tall || height > 58 ? `<span class="cal-event-meta">${ev.room ? esc(roomName(ev.room)) + ' · ' : ''}${ev.teams ? 'Teamspace' : esc(ev.location || '')}</span>` : ''}
          ${tall && ev.attendees ? `<span class="cal-event-people">${attendeeAvatars(ev.attendees, 6)}</span>` : ''}
        </button>`;
      }).join('');
    }

    function roomName(id) { const r = state.rooms.find(x => x.id === id); return r ? r.name : id; }

    function bind() {
      const $ = sel => root.querySelector(sel);
      const $$ = sel => Array.from(root.querySelectorAll(sel));
      $('[data-cal-prev]').onclick = () => nav(-1);
      $('[data-cal-next]').onclick = () => nav(1);
      $('[data-cal-today]').onclick = () => { focusDate = state.company.simulationDate; rerender(); };
      $$('[data-cal-view]').forEach(b => b.onclick = () => { view = b.dataset.calView; rerender(); });
      $('[data-cal-tz]').onchange = e => { displayTz = e.target.value; rerender(); };
      $('[data-cal-new]').onclick = () => openEventModal({ defaultDate: focusDate, defaultTz:'America/New_York', context: opts.context });
      $$('[data-cal-day]').forEach(el => {
        el.onclick = e => {
          if (e.target.closest('[data-event-id]')) return;
          focusDate = el.dataset.calDay;
          view = view === 'month' ? 'day' : view;
          rerender();
        };
      });
      $$('[data-event-id]').forEach(el => {
        el.onclick = e => {
          e.stopPropagation();
          const master = state.calendar.events.find(x => x.id === el.dataset.eventId);
          if (master) openEventDetail(master, el.dataset.eventDate, opts, rerender);
        };
      });
      $$('.month-more').forEach(el => {
        el.onclick = e => { e.stopPropagation(); focusDate = el.dataset.calDay; view = 'day'; rerender(); };
      });
    }

    const onChange = () => rerender();
    const offs = [
      Bus.on('calendar:event-created', onChange),
      Bus.on('calendar:event-updated', onChange),
      Bus.on('calendar:event-deleted', onChange),
      Bus.on('store:reset', onChange)
    ];
    render();
    return {
      destroy() { destroyed = true; offs.forEach(off => off()); root.remove(); },
      rerender,
      get tz() { return displayTz; }
    };
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  /* --------------------------- event details ---------------------------- */
  function openEventDetail(ev, occurrenceDate, options, onChanged) {
    const date = occurrenceDate || ev.date;
    const when = `${fmtDate(parseISO(date), 'long')} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} ${Utils.timeZoneAbbr(ev.tz)}`;
    const room = ev.room ? (Data.rooms.find(r => r.id === ev.room) || {}).name : null;
    const attendees = attendeeNames(ev.attendees);
    const localTimes = (ev.attendees || []).filter(id => id !== 'me').map(id => {
      const c = Data.contactById[id];
      if (!c) return '';
      const conv = convertZoned(date, ev.start, ev.tz, c.timezone);
      return `<div class="local-time-row"><span>${Icons.avatar(c.name, 'avatar-sm', c.tone)}<span><strong>${esc(c.name)}</strong><small>${esc(c.timezoneLabel)}</small></span></span><b>${esc(fmtTime(conv.time))}</b></div>`;
    }).join('');
    const ref = modal({
      title: ev.title,
      subtitle: `${TYPE_LABELS[ev.type] || 'Calendar event'} · ${when}`,
      size: 'wide',
      body: `
        <div class="event-detail-grid">
          <div>
            <div class="detail-block"><span class="eyebrow">When</span><p>${esc(when)}</p>${ev.recurrence ? `<span class="pill purple">Repeats ${esc(ev.recurrence.freq)} until ${esc(fmtDate(parseISO(ev.recurrence.until), 'full'))}</span>` : ''}</div>
            <div class="detail-block"><span class="eyebrow">Where</span><p>${ev.teams ? '<span class="pill teams-pill">Teamspace (simulated)</span> · ' : ''}${esc(room || ev.location || 'No location set')}</p>${room ? `<p class="muted-small">${esc((Data.rooms.find(r => r.id === ev.room) || {}).notes || '')}</p>` : ''}</div>
            <div class="detail-block"><span class="eyebrow">Attendees (${attendees.length})</span><div class="attendee-list">${attendees.map((name, i) => {
              const id = (ev.attendees || [])[i];
              const c = id === 'me' ? { name:'Elizabeth Hale', tone:2 } : Data.contactById[id];
              const status = ensureResponses(ev)[id] || 'needs-action';
              return `<span class="attendee-chip attendee-rsvp ${status}" data-tip="${esc(name)}: ${esc(RSVP_LABELS[status] || status)}">${Icons.avatar(name, 'avatar-sm', c ? c.tone : 3)}${esc(name)}<em class="rsvp-status">${status === 'accepted' ? '✓' : status === 'declined' ? '✕' : status === 'tentative' ? '?' : '…'}</em></span>`;
            }).join('')}</div>
              <div class="rsvp-summary">${['accepted','tentative','declined','needs-action'].map(status => `<span><b>${Object.values(ensureResponses(ev)).filter(v => v === status).length}</b> ${RSVP_LABELS[status]}</span>`).join('')}</div>
            </div>
            <div class="detail-block"><span class="eyebrow">Notes</span><p class="pre-line">${esc(ev.note || 'No notes.')}</p></div>
          </div>
          <aside class="event-side">
            <div class="event-side-card"><span class="eyebrow">Local times</span>${localTimes || '<p class="muted-small">No other attendees yet.</p>'}</div>
            <div class="event-side-card"><span class="eyebrow">Organizer</span><p>${esc((Data.contactById[ev.organizer] || {}).name || 'Elizabeth Hale')}</p>
              ${ev.teams ? `<button class="btn teams small full" data-join-event style="margin-top:9px" data-tip="Open the practice Teamspace meeting room.">Join Teamspace meeting</button>` : ''}
            </div>
            ${(ev.attendees || []).includes('me') ? `<div class="event-side-card"><span class="eyebrow">Your response</span><div class="rsvp-actions">${['accepted','tentative','declined'].map(status => `<button class="rsvp-btn ${ensureResponses(ev).me === status ? 'active ' + status : ''}" data-rsvp="${status}" data-tip="Respond ${RSVP_LABELS[status].toLowerCase()} to this invitation.">${status === 'accepted' ? '✓ Accept' : status === 'tentative' ? '? Tentative' : '✕ Decline'}</button>`).join('')}</div></div>` : ''}
            ${(ev.externalGuests || []).length ? `<div class="event-side-card"><span class="eyebrow">External guests</span>${ev.externalGuests.map(email => `<div class="external-guest"><span>${esc(email)}</span><span class="pill ${ensureResponses(ev)['ext:' + email] === 'accepted' ? 'green' : 'amber'}">${esc(RSVP_LABELS[ensureResponses(ev)['ext:' + email]] || 'Invited')}</span></div>`).join('')}<button class="btn small full" data-email-invite style="margin-top:7px">Email invitation</button></div>` : '<div class="event-side-card"><span class="eyebrow">External guests</span><p class="muted-small">No external guests. Edit the event to add client or vendor emails.</p></div>'}
          </aside>
        </div>`,
      footer: `<div class="left-actions"><button class="btn danger small" data-delete-event data-tip="Delete this event from the calendar.">Delete</button><button class="btn small" data-download-ics data-tip="Download a real .ics invitation file that can be opened in a calendar app.">Download .ics</button>${ev.teams ? `<button class="btn teams small" data-join-event>Join</button>` : ''}</div><button class="btn" data-edit-event data-tip="Change the time, attendees, room, or details.">Edit</button><button class="btn primary" data-close-event>Close</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close-event]').onclick = () => close();
        el.querySelectorAll('[data-join-event]').forEach(btn => btn.onclick = () => {
          close();
          if (window.OS) OS.openApp('teams', { joinEventId: ev.id });
        });
        el.querySelector('[data-edit-event]').onclick = () => {
          close();
          setTimeout(() => openEventModal({ editing: ev, occurrenceDate: date, context: options.context, onSaved: onChanged }), 80);
        };
        el.querySelectorAll('[data-rsvp]').forEach(btn => btn.onclick = () => {
          const status = btn.dataset.rsvp;
          const responses = ensureResponses(ev);
          responses.me = status;
          Store.update(s => { const target = s.calendar.events.find(x => x.id === ev.id); if (target) target.responses = responses; });
          Bus.emit('calendar:rsvp', { eventId:ev.id, attendee:'me', status, title:ev.title });
          toast('Response saved', status === 'accepted' ? 'You accepted the meeting.' : status === 'tentative' ? 'You marked the meeting tentative.' : 'You declined the meeting.', { kind:'success', duration:2800 });
          close();
          const updated = Store.eventById(ev.id);
          if (updated) setTimeout(() => openEventDetail(updated, date, options, onChanged), 90);
        });
        el.querySelector('[data-download-ics]').onclick = () => downloadICS(ev);
        const emailInvite = el.querySelector('[data-email-invite]');
        if (emailInvite) emailInvite.onclick = () => { close(); emailInvitation(ev); };
        el.querySelector('[data-delete-event]').onclick = async () => {
          const ok = await confirm({
            title: 'Delete this meeting?',
            message: `“${esc(ev.title)}” will be removed from the training calendar. In a real EA role, you would usually tell the attendees and offer a new time before deleting.`,
            okText: 'Delete event', danger: true
          });
          if (!ok) return;
          Store.update(s => { s.calendar.events = s.calendar.events.filter(e => e.id !== ev.id); });
          Bus.emit('calendar:event-deleted', { eventId: ev.id, title: ev.title, date: ev.date });
          close();
          toast('Meeting deleted', `${ev.title} was removed from the training calendar.`, { kind: 'success' });
          if (onChanged) onChanged();
        };
      }
    });
  }

  /* ---------------------------- create/edit ----------------------------- */
  function openEventModal(options) {
    const opts = options || {};
    const editing = opts.editing || null;
    const state = Store.state;
    const defaultDate = (editing && editing.date) || opts.defaultDate || state.calendar.focusDate || state.company.simulationDate;
    const defaultStart = (editing && editing.start) || opts.defaultStart || '10:00';
    const defaultEnd = (editing && editing.end) || Utils.addMinutes(defaultStart, 30);
    const eventTz = (editing && editing.tz) || 'America/New_York';
    const defaultTeamspace = editing ? !!editing.teams : opts.context === 'teams';
    let selectedAttendees = new Set(editing ? (editing.attendees || []) : ['alexandra', 'me']);
    let selectedRoom = editing ? (editing.room || '') : opts.defaultRoom || '';
    let allowConflict = false;
    let attendeeSearch = '';

    const contactGroups = [
      { label:'Executive office', ids:state.contacts.filter(c => c.type === 'executive' || c.type === 'team').map(c => c.id) },
      { label:'Clients', ids:state.contacts.filter(c => c.type === 'client').map(c => c.id) },
      { label:'Vendors', ids:state.contacts.filter(c => c.type === 'vendor').map(c => c.id) }
    ];
    const roomsOptions = state.rooms.map(r => `<option value="${r.id}" ${selectedRoom === r.id ? 'selected' : ''}>${esc(r.name)} · ${esc(r.floor)} · seats ${r.capacity}${r.video ? ' · video' : ''}</option>`).join('');

    const body = `
      <form id="event-form" autocomplete="off">
        <div class="form-grid">
          <div class="field span-2"><label for="ev-title">Meeting title <span class="req">*</span></label><input id="ev-title" class="input" value="${esc(editing ? editing.title : '')}" placeholder="e.g. Board pack review with Liam" required data-tip="Use a clear, specific title. “Meeting” is not a useful title."></div>
          <div class="field"><label for="ev-date">Date</label><input id="ev-date" class="input" type="date" value="${esc(defaultDate)}" data-tip="The date in the event’s time zone."></div>
          <div class="field"><label for="ev-tz">Time zone</label><select id="ev-tz" class="select" data-tip="The time zone the start and end times are written in.">${Data.timezones.map(z => `<option value="${z.id}" ${eventTz === z.id ? 'selected' : ''}>${esc(z.label)} (${esc(z.abbr)})</option>`).join('')}</select></div>
          <div class="field"><label for="ev-start">Start</label><input id="ev-start" class="input" type="time" value="${esc(defaultStart)}" data-tip="When the meeting begins."></div>
          <div class="field"><label for="ev-end">End</label><input id="ev-end" class="input" type="time" value="${esc(defaultEnd)}" data-tip="When the meeting ends. Allow time for the meeting to actually finish."></div>
          <div class="field"><label for="ev-type">Type</label><select id="ev-type" class="select">${Object.entries(TYPE_LABELS).map(([k,v]) => `<option value="${k}" ${editing && editing.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label for="ev-recurrence">Repeat</label><select id="ev-recurrence" class="select" data-tip="A recurring meeting repeats automatically. Use it for standing meetings only.">
            <option value="none">Does not repeat</option>
            <option value="daily" ${editing && editing.recurrence && editing.recurrence.freq === 'daily' ? 'selected' : ''}>Every weekday</option>
            <option value="weekly" ${editing && editing.recurrence && editing.recurrence.freq === 'weekly' ? 'selected' : ''}>Every week</option>
            <option value="monthly" ${editing && editing.recurrence && editing.recurrence.freq === 'monthly' ? 'selected' : ''}>Every month</option>
          </select></div>
          <div class="field"><label for="ev-room">Room</label><select id="ev-room" class="select" data-tip="Booking a room reserves it for everyone. Choose a room with enough seats and the right technology."><option value="">No room / virtual</option>${roomsOptions}</select></div>
          <div class="field"><label for="ev-location">Location or link</label><input id="ev-location" class="input" value="${esc(editing ? (editing.location || '') : '')}" placeholder="e.g. Boardroom A or Teamspace" data-tip="A physical address or “Teamspace” for a virtual meeting."></div>
          <div class="field span-2"><label class="checkbox-row"><input type="checkbox" id="ev-teams" ${defaultTeamspace ? 'checked' : ''} data-tip="Adds a Teamspace meeting link to this practice workspace."><span>Add a Teamspace link <small class="field-hint">Opens the practice meeting room.</small></span></label></div>
          <div class="field span-2"><label for="ev-note">Agenda / notes</label><textarea id="ev-note" class="textarea" placeholder="What is the purpose and desired outcome? Add a pre-read if needed." data-tip="A short agenda makes a meeting useful. The EA often adds this before sending the invite.">${esc(editing ? (editing.note || '') : '')}</textarea></div>
        </div>
        <div class="attendee-section">
          <div class="attendee-head"><div><span class="field-label">Attendees</span><span class="muted-small" id="attendee-count">${selectedAttendees.size} selected</span></div><input id="attendee-search" class="input sm" style="max-width:190px" placeholder="Search people…" data-tip="Filter the people list. Check everyone who needs the invitation."></div>
          <div id="attendee-list" class="attendee-picker"></div>
          <div id="local-times" class="local-times-box"></div>
          <div class="field" style="margin-top:10px"><label for="ev-external">External guests <span class="muted-small">(optional, comma-separated emails)</span></label><input id="ev-external" class="input" value="${esc(editing && editing.externalGuests ? editing.externalGuests.join(', ') : '')}" placeholder="guest@client.com, partner@vendor.com" data-tip="Guests outside APPELLO. Their invitation can be downloaded as an .ics file or emailed from the training Mail app."></div>
        </div>
        <div id="conflict-box" class="conflict-box" hidden></div>
        <div id="suggest-box" class="suggest-box"></div>
      </form>`;

    modal({
      title: editing ? 'Edit meeting' : 'New meeting',
      subtitle: 'The calendar belongs to Alexandra Morgan. It checks her conflicts and the room’s availability before saving.',
      size: 'wide',
      body,
      footer: `<div class="left-actions"><button type="button" class="btn ghost small" data-suggest-time data-tip="Find a time when Alexandra and the selected room are free.">Find a free time</button></div><button type="button" class="btn" data-cancel-event>Cancel</button><button type="button" class="btn primary" data-save-event data-tip="Save the event. Conflicts must be resolved first.">${editing ? 'Save changes' : 'Create meeting'}</button>`,
      onOpen({ modal: el, close }) {
        const $ = sel => el.querySelector(sel);
        const title = $('#ev-title'), date = $('#ev-date'), start = $('#ev-start'), end = $('#ev-end');
        const tz = $('#ev-tz'), room = $('#ev-room'), location = $('#ev-location'), teams = $('#ev-teams');
        const note = $('#ev-note'), type = $('#ev-type'), recurrence = $('#ev-recurrence');
        const external = $('#ev-external');
        const list = $('#attendee-list'), search = $('#attendee-search');
        const conflictBox = $('#conflict-box'), suggestBox = $('#suggest-box');
        const saveBtn = el.querySelector('[data-save-event]');

        function renderAttendees() {
          const needle = attendeeSearch.toLowerCase();
          list.innerHTML = contactGroups.map(group => {
            const members = group.ids.map(id => Store.contactById(id)).filter(Boolean).filter(c => !needle || `${c.name} ${c.title} ${c.company}`.toLowerCase().includes(needle));
            if (!members.length) return '';
            return `<div class="attendee-group"><span class="attendee-group-label">${esc(group.label)}</span>${members.map(c => `
              <label class="attendee-row">
                <input type="checkbox" value="${c.id}" ${selectedAttendees.has(c.id) ? 'checked' : ''}>
                ${Icons.avatar(c.name, 'avatar-sm', c.tone)}
                <span class="attendee-person"><strong>${esc(c.name)}</strong><small>${esc(c.title)} · ${esc(c.company)}</small></span>
                <span class="attendee-zone">${esc(c.timezoneLabel)}</span>
              </label>`).join('')}</div>`;
          }).join('') || `<div class="empty-state" style="padding:22px"><p>No person matches “${esc(attendeeSearch)}”.</p></div>`;
          list.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
            if (cb.checked) selectedAttendees.add(cb.value); else selectedAttendees.delete(cb.value);
            $('#attendee-count').textContent = selectedAttendees.size + ' selected';
            updateLocalTimes(); checkConflicts();
          });
        }

        function selectedContacts() {
          return Array.from(selectedAttendees).filter(id => id !== 'me').map(id => Store.contactById(id)).filter(Boolean);
        }

        function updateLocalTimes() {
          const box = $('#local-times');
          const baseDate = date.value || defaultDate, baseStart = start.value || defaultStart, baseTz = tz.value;
          const contacts = selectedContacts();
          if (!contacts.length) { box.innerHTML = ''; return; }
          box.innerHTML = `<span class="eyebrow">Attendee local times</span><div class="local-time-chips">${contacts.map(c => {
            const conv = convertZoned(baseDate, baseStart, baseTz, c.timezone);
            const outside = isOutsideWorkingHours(conv.time, c.work);
            return `<span class="local-time-chip ${outside ? 'outside' : ''}" data-tip="${esc(c.name)} works ${esc(c.work)} ${esc(c.timezoneLabel)}.${outside ? ' This meeting is outside their normal working hours.' : ''}"><strong>${esc(c.name.split(' ')[0])}</strong> ${esc(fmtTime(conv.time))} <small>${esc(Utils.timeZoneAbbr(c.timezone))}</small></span>`;
          }).join('')}</div>`;
        }

        function isOutsideWorkingHours(time, work) {
          if (!work) return false;
          const m = time.split(':').map(Number);
          const mins = m[0] * 60 + m[1];
          const [ws, we] = work.split('–').map(t => {
            const x = t.split(':').map(Number); return x[0] * 60 + x[1];
          });
          return mins < ws || mins >= we;
        }

        function candidate() {
          return {
            date: date.value, start: start.value, end: end.value, tz: tz.value,
            room: room.value, attendees: Array.from(selectedAttendees), id: editing ? editing.id : null
          };
        }

        function checkConflicts() {
          const c = candidate();
          if (!c.date || !c.start || !c.end) return;
          if (c.end <= c.start) {
            conflictBox.hidden = false;
            conflictBox.className = 'conflict-box hard';
            conflictBox.innerHTML = `<strong>End time must be after start time.</strong><p>A meeting that ends before it begins is almost always a typo. Fix the time before saving.</p>`;
            saveBtn.disabled = true;
            return;
          }
          const conflicts = detectConflicts(c, Store.state.calendar.events, { excludeId: editing ? editing.id : null });
          const roomConflicts = c.room ? conflicts.filter(x => x.room) : [];
          if (!conflicts.length) {
            conflictBox.hidden = false;
            conflictBox.className = 'conflict-box clear';
            conflictBox.innerHTML = `<strong>✓ No calendar conflict</strong><p>${esc(fmtDate(parseISO(c.date), 'long'))} at ${esc(fmtTime(c.start))} is free${c.room ? ' and the selected room is available.' : '.'}</p>`;
            saveBtn.disabled = false;
            return;
          }
          conflictBox.hidden = false;
          conflictBox.className = 'conflict-box hard';
          conflictBox.innerHTML = `<strong>⚠ Conflict detected</strong><p>Alexandra already has ${conflicts.length} overlapping event${conflicts.length > 1 ? 's' : ''}. In a professional office, do not double-book the executive.</p><ul class="conflict-list">${conflicts.map(x => `<li><strong>${esc(x.event.title)}</strong> · ${esc(fmtTime(x.event.start))}–${esc(fmtTime(x.event.end))} ${esc(Utils.timeZoneAbbr(x.event.tz))}${x.event.room ? ' · ' + esc((Data.rooms.find(r => r.id === x.event.room) || {}).name || '') : ''}${x.room ? ' <span class="pill red">room also booked</span>' : ''}</li>`).join('')}</ul>
            <label class="checkbox-row" style="margin-top:8px"><input type="checkbox" id="conflict-override" ${allowConflict ? 'checked' : ''}><span>I understand this double-books Alexandra. Save anyway (not recommended).</span></label>`;
          const cb = el.querySelector('#conflict-override');
          if (cb) cb.onchange = () => { allowConflict = cb.checked; saveBtn.disabled = !allowConflict; };
          saveBtn.disabled = !allowConflict;
          if (roomConflicts.length) conflictBox.querySelector('p').textContent += ' The selected room is also already booked.';
        }

        function suggestTimes() {
          const c = candidate();
          if (!c.date) { toast('Choose a date first', 'Find a free time needs a date.', { kind:'error' }); return; }
          const duration = Math.max(30, Utils.minutesBetween(c.start || '10:00', c.end || '10:30'));
          const found = [];
          for (let mins = 8 * 60; mins <= (18 * 60 - duration); mins += 30) {
            const st = `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
            const en = Utils.addMinutes(st, duration);
            const candidateSlot = Object.assign({}, c, { start: st, end: en });
            const conflicts = detectConflicts(candidateSlot, Store.state.calendar.events, { excludeId: editing ? editing.id : null });
            if (!conflicts.length) found.push(`${st}–${en}`);
            if (found.length >= 3) break;
          }
          suggestBox.innerHTML = found.length
            ? `<span class="eyebrow">Free options on ${esc(fmtDate(parseISO(c.date), 'full'))}</span><div class="suggest-chips">${found.map(slot => `<button type="button" class="chip selected" data-slot="${slot}">${esc(fmtTime(slot.split('–')[0]))} – ${esc(fmtTime(slot.split('–')[1]))}</button>`).join('')}</div>`
            : `<span class="muted-small">No conflict-free ${duration}-minute slot was found between 08:00 and 18:00. Consider a different day.</span>`;
          suggestBox.querySelectorAll('[data-slot]').forEach(btn => btn.onclick = () => {
            const [s, e] = btn.dataset.slot.split('–');
            start.value = s; end.value = e;
            checkConflicts();
            toast('Time selected', `${fmtTime(s)} is conflict-free. Remember to check attendee time zones.`, { kind:'success' });
          });
        }

        function save() {
          const c = candidate();
          if (!title.value.trim()) { toast('Add a meeting title', 'A clear title helps everyone know what the meeting is for.', { kind:'error' }); title.focus(); return; }
          if (!c.date || !c.start || !c.end) { toast('Complete the time', 'Add a date, start time, and end time.', { kind:'error' }); return; }
          if (c.end <= c.start) { toast('Check the end time', 'The end time must be after the start time.', { kind:'error' }); return; }
          const conflicts = detectConflicts(c, Store.state.calendar.events, { excludeId: editing ? editing.id : null });
          if (conflicts.length && !allowConflict) {
            toast('Meeting not saved', 'Resolve the calendar conflict first, or use Find a free time.', { kind:'error' });
            checkConflicts();
            return;
          }
          const rec = recurrence.value === 'none' ? null : { freq: recurrence.value, until: dateKey(addDays(parseISO(c.date), recurrence.value === 'daily' ? 10 : recurrence.value === 'weekly' ? 70 : 180)) };
          const ev = {
            id: editing ? editing.id : Utils.uid('evt'),
            title: title.value.trim(),
            date: c.date, start: c.start, end: c.end, tz: c.tz,
            type: type.value,
            location: location.value.trim() || (teams.checked ? 'Teamspace' : (room.value ? (Data.rooms.find(r => r.id === room.value) || {}).name : '')),
            teams: teams.checked,
            room: room.value || null,
            organizer: editing ? editing.organizer : 'me',
            attendees: Array.from(selectedAttendees),
            externalGuests: String(external ? external.value : '').split(',').map(x => x.trim()).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)),
            responses: (() => {
              const previous = (editing && editing.responses) || {};
              const next = {};
              Array.from(selectedAttendees).forEach(id => { next[id] = previous[id] || (id === 'me' ? 'accepted' : (id.length % 3 === 0 ? 'tentative' : id.length % 2 === 0 ? 'declined' : 'needs-action')); });
              return next;
            })(),
            note: note.value.trim(),
            category: TYPE_LABELS[type.value] || 'Meeting',
            recurrence: rec
          };
          const detail = {
            eventId: ev.id, title: ev.title, date: ev.date, start: ev.start, end: ev.end,
            room: ev.room, teams: ev.teams, attendees: ev.attendees, conflicts: conflicts.length,
            hadConflictBefore: editing ? detectConflicts({ date:editing.date, start:editing.start, end:editing.end, tz:editing.tz, room:editing.room }, Store.state.calendar.events, { excludeId: editing.id }).length : 0,
            source: opts.context || 'mail'
          };
          Store.update(s => {
            if (editing) {
              const idx = s.calendar.events.findIndex(e => e.id === editing.id);
              if (idx >= 0) s.calendar.events[idx] = ev;
            } else {
              s.calendar.events.push(ev);
            }
            s.calendar.focusDate = ev.date;
          });
          if (conflicts.length) {
            Bus.emit('training:mistake', {
              code:'calendar-conflict', message:`Saved a meeting that overlaps ${conflicts.map(x => x.event.title).join(', ')}.`,
              standard:'An EA protects the executive’s calendar. Resolve conflicts before confirming a meeting.'
            });
          }
          Bus.emit(editing ? 'calendar:event-updated' : 'calendar:event-created', detail);
          toast(editing ? 'Meeting updated' : 'Meeting created', `${ev.title} · ${fmtDate(parseISO(ev.date), 'medium')} at ${fmtTime(ev.start)}.`, { kind:'success' });
          close();
          if (opts.onSaved) opts.onSaved(detail);
        }

        $('#attendee-search').oninput = e => { attendeeSearch = e.target.value; renderAttendees(); };
        [date, start, end, tz, room].forEach(input => {
          input.addEventListener('change', () => { allowConflict = false; updateLocalTimes(); checkConflicts(); });
          input.addEventListener('input', updateLocalTimes);
        });
        el.querySelector('[data-suggest-time]').onclick = suggestTimes;
        el.querySelector('[data-cancel-event]').onclick = close;
        saveBtn.onclick = save;
        renderAttendees();
        updateLocalTimes();
        checkConflicts();
        if (editing) {
          el.querySelector('.modal-head p').textContent = 'Editing the existing event. A recurring series is edited as one series in this simulation.';
        }
        setTimeout(() => title.focus(), 60);
      }
    });
  }

  window.CalendarView = {
    mount, openEventModal, openEventDetail, detectConflicts, expandEvents,
    displayTimes, displayEventsForRange, conflictIds, eventOnDisplayDate,
    TYPE_COLORS, TYPE_LABELS
  };
})();
