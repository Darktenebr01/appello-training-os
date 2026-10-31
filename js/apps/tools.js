/* Calculator and World Clock — small utilities that support EA work. */
(function () {
  'use strict';
  const { esc, toast, modal, Bus, openHelp, fmtDate, getTzParts, zonedToUtc, dateKey } = Utils;

  /* ------------------------------ calculator ---------------------------- */
  let calcInstance = null;

  function calcDisplay() {
    const d = calcInstance;
    return d.expression ? d.expression : d.current;
  }
  function calcCompute(a, b, op) {
    a = Number(a); b = Number(b);
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? 'Cannot divide by zero' : a / b;
      default: return b;
    }
  }
  function calcRender() {
    const d = calcInstance;
    const root = d.root;
    if (!root) return;
    const hist = d.history.length ? d.history.slice(-8).reverse().map(h => `<div class="calc-history-row" data-calc-history="${esc(h.result)}"><span>${esc(h.expr)}</span><strong>${esc(h.result)}</strong></div>`).join('') : `<div class="calc-empty">Your calculation history will appear here.</div>`;
    root.innerHTML = `<div class="calculator-app">
      <header class="calc-appbar"><div class="calc-brand"><span>🧮</span><strong>Calculator</strong></div><button class="help-btn" data-help-calc data-tip="How to use this calculator with the keyboard.">What is this?</button></header>
      <div class="calc-main">
        <div class="calc-screen">
          <div class="calc-expression">${esc(d.expression || '')}</div>
          <div class="calc-current">${esc(String(d.current))}</div>
          <div class="calc-memory">${d.memory != null ? `M ${esc(String(d.memory))}` : ''}</div>
        </div>
        <div class="calc-keys">
          <button data-calc="clear" class="calc-key fn">C</button>
          <button data-calc="back" class="calc-key fn">⌫</button>
          <button data-calc="percent" class="calc-key fn">%</button>
          <button data-calc="op:/" class="calc-key op">÷</button>
          <button data-calc="7" class="calc-key">7</button><button data-calc="8" class="calc-key">8</button><button data-calc="9" class="calc-key">9</button><button data-calc="op:*" class="calc-key op">×</button>
          <button data-calc="4" class="calc-key">4</button><button data-calc="5" class="calc-key">5</button><button data-calc="6" class="calc-key">6</button><button data-calc="op:-" class="calc-key op">−</button>
          <button data-calc="1" class="calc-key">1</button><button data-calc="2" class="calc-key">2</button><button data-calc="3" class="calc-key">3</button><button data-calc="op:+" class="calc-key op">+</button>
          <button data-calc="negate" class="calc-key fn">±</button><button data-calc="0" class="calc-key">0</button><button data-calc="." class="calc-key">.</button><button data-calc="equals" class="calc-key equals">=</button>
        </div>
      </div>
      <aside class="calc-history"><div class="calc-history-head"><strong>History</strong><button class="link-btn" data-clear-history>Clear</button></div><div class="calc-history-list">${hist}</div><div class="calc-tip">Tip: use the number keys and Enter. Press Escape to clear.</div></aside>
    </div>`;
    root.querySelectorAll('[data-calc]').forEach(b => b.onclick = () => calcPress(b.dataset.calc));
    root.querySelectorAll('[data-calc-history]').forEach(b => b.onclick = () => { calcInstance.current = b.dataset.calcHistory; calcInstance.expression = ''; calcRender(); });
    const help = root.querySelector('[data-help-calc]'); if (help) help.onclick = () => openHelp('calculator');
    const clear = root.querySelector('[data-clear-history]'); if (clear) clear.onclick = () => { calcInstance.history = []; calcRender(); };
    root.tabIndex = 0;
    setTimeout(() => root.focus(), 20);
  }
  function calcPress(action) {
    const d = calcInstance;
    if (action === 'clear') { d.current = '0'; d.expression = ''; d.previous = null; d.operator = null; d.waiting = false; }
    else if (action === 'back') { d.current = String(d.current).length > 1 ? String(d.current).slice(0, -1) : '0'; }
    else if (action === 'percent') { d.current = String(Number(d.current) / 100); }
    else if (action === 'negate') { d.current = String(-Number(d.current)); }
    else if (action === 'equals') {
      if (d.operator && d.previous != null) {
        const a = Number(d.previous), b = Number(d.current);
        const result = calcCompute(a, b, d.operator);
        if (typeof result === 'string') { d.current = result; d.expression = ''; d.operator = null; d.previous = null; }
        else {
          const symbol = ({ '+':'+', '-':'−', '*':'×', '/':'÷' })[d.operator];
          d.history.push({ expr:`${a} ${symbol} ${b} =`, result:String(result) });
          d.current = String(result);
          d.expression = '';
          d.operator = null; d.previous = null; d.waiting = false;
        }
      }
    } else if (action.startsWith('op:')) {
      const op = action.slice(3);
      if (d.operator && !d.waiting) {
        const result = calcCompute(Number(d.previous), Number(d.current), d.operator);
        if (typeof result === 'string') { d.current = result; d.operator = null; d.previous = null; } else { d.current = String(result); d.previous = d.current; }
      } else {
        d.previous = d.current;
      }
      d.operator = op;
      d.waiting = true;
      const symbol = ({ '+':'+', '-':'−', '*':'×', '/':'÷' })[op];
      d.expression = `${d.previous} ${symbol}`;
    } else if (action === '.') {
      if (!String(d.current).includes('.')) d.current = String(d.current) + '.';
      d.waiting = false;
    } else {
      if (d.waiting) { d.current = action; d.waiting = false; }
      else d.current = d.current === '0' ? action : String(d.current) + action;
    }
    calcRender();
  }
  function calcKey(e) {
    if (!calcInstance || !calcInstance.root || !document.body.contains(calcInstance.root)) return;
    const activeWin = calcInstance.root.closest('.window');
    if (activeWin && !activeWin.classList.contains('active-window')) return;
    if (e.target.matches('input, textarea, select')) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { e.preventDefault(); calcPress(k); }
    else if (k === '.') { e.preventDefault(); calcPress('.'); }
    else if (k === '+') { e.preventDefault(); calcPress('op:+'); }
    else if (k === '-') { e.preventDefault(); calcPress('op:-'); }
    else if (k === '*') { e.preventDefault(); calcPress('op:*'); }
    else if (k === '/') { e.preventDefault(); calcPress('op:/'); }
    else if (k === 'Enter' || k === '=') { e.preventDefault(); calcPress('equals'); }
    else if (k === 'Escape') { e.preventDefault(); calcPress('clear'); }
    else if (k === 'Backspace') { e.preventDefault(); calcPress('back'); }
    else if (k === '%') { e.preventDefault(); calcPress('percent'); }
  }
  App.register('calculator', {
    mount(container, win) {
      calcInstance = { root:document.createElement('div'), win, current:'0', expression:'', previous:null, operator:null, waiting:false, history:[] };
      calcInstance.root.className = 'calc-root app-fill';
      container.innerHTML = ''; container.appendChild(calcInstance.root);
      calcRender();
      document.addEventListener('keydown', calcKey);
    },
    reopen() { if (calcInstance) calcRender(); },
    destroy() { document.removeEventListener('keydown', calcKey); calcInstance = null; }
  });

  /* ------------------------------- clock -------------------------------- */
  let clockInstance = null;
  const DEFAULT_CITIES = ['America/New_York','Europe/London','Asia/Dubai','Asia/Singapore','Asia/Tokyo'];

  function simInstantNow() {
    const now = new Date();
    const ny = getTzParts(now, 'America/New_York');
    const time = `${String(ny.hour).padStart(2,'0')}:${String(ny.minute).padStart(2,'0')}:${String(ny.second).padStart(2,'0')}`;
    return zonedToUtc('2026-11-09', time, 'America/New_York');
  }
  function formatZone(instant, tz, opts) {
    return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone:tz, hour:'numeric', minute:'2-digit', hour12:true }, opts || {})).format(instant);
  }
  function formatZoneSeconds(instant, tz) {
    return new Intl.DateTimeFormat('en-US', { timeZone:tz, hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true }).format(instant);
  }
  function zoneOffsetLabel(tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone:tz, timeZoneName:'shortOffset' }).formatToParts(simInstantNow());
      return (parts.find(p => p.type === 'timeZoneName') || {}).value || '';
    } catch (e) { return ''; }
  }
  function zoneParts(instant, tz) { return getTzParts(instant, tz); }
  function isDaytime(instant, tz) {
    const p = getTzParts(instant, tz);
    return p.hour >= 7 && p.hour < 19;
  }
  function offsetFromNewYork(tz) {
    try {
      const inst = simInstantNow();
      const a = getTzParts(inst, 'America/New_York');
      const b = getTzParts(inst, tz);
      const diff = (b.hour - a.hour) + (b.day - a.day) * 24;
      if (diff === 0) return 'Same as New York';
      return `${diff > 0 ? '+' : ''}${diff} hr${Math.abs(diff) === 1 ? '' : 's'} from New York`;
    } catch (e) { return ''; }
  }
  function analogClock(instant, tz) {
    const p = getTzParts(instant, tz);
    const sec = p.minute * 60 + p.second;
    const minAngle = (p.minute + p.second / 60) * 6;
    const hourAngle = ((p.hour % 12) + p.minute / 60) * 30;
    const secAngle = p.second * 6;
    const nums = Array.from({length:12}, (_,i) => {
      const a = (i+1) * 30 * Math.PI/180 - Math.PI/2;
      const x = 100 + Math.cos(a) * 76, y = 100 + Math.sin(a) * 76;
      return `<text x="${x}" y="${y+4}" text-anchor="middle" class="clock-num">${i+1}</text>`;
    }).join('');
    return `<svg viewBox="0 0 200 200" class="analog-clock" role="img" aria-label="Analog clock">
      <defs><radialGradient id="clockFace" cx="35%" cy="30%"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#eef4fc"/></radialGradient></defs>
      <circle cx="100" cy="100" r="93" fill="url(#clockFace)" stroke="#c5d6e8" stroke-width="1.5"/>
      <circle cx="100" cy="100" r="87" fill="none" stroke="#e6eef7"/>
      ${nums}
      ${Array.from({length:60}, (_,i) => { const a=i*6*Math.PI/180; const r1=i%5===0?75:80; return `<line x1="${100+Math.cos(a)*r1}" y1="${100+Math.sin(a)*r1}" x2="${100+Math.cos(a)*83}" y2="${100+Math.sin(a)*83}" stroke="${i%5===0?'#6d8cac':'#c5d4e3'}" stroke-width="${i%5===0?2:1}"/>`; }).join('')}
      <line x1="100" y1="100" x2="${100 + Math.cos(hourAngle*Math.PI/180 - Math.PI/2)*47}" y2="${100 + Math.sin(hourAngle*Math.PI/180 - Math.PI/2)*47}" stroke="#19395c" stroke-width="5" stroke-linecap="round"/>
      <line x1="100" y1="100" x2="${100 + Math.cos(minAngle*Math.PI/180 - Math.PI/2)*67}" y2="${100 + Math.sin(minAngle*Math.PI/180 - Math.PI/2)*67}" stroke="#2b5b8c" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="100" y1="100" x2="${100 + Math.cos(secAngle*Math.PI/180 - Math.PI/2)*72}" y2="${100 + Math.sin(secAngle*Math.PI/180 - Math.PI/2)*72}" stroke="#c85a4a" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="4.5" fill="#c85a4a"/>
    </svg>`;
  }

  function clockRender() {
    const root = clockInstance.root;
    if (!root) return;
    const instant = simInstantNow();
    const cityIds = clockInstance.cities;
    const nyTime = formatZone(instant, 'America/New_York', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    const plannerTz = clockInstance.plannerTz || 'America/New_York';
    const plannerTime = clockInstance.plannerTime || '09:00';
    const plannerInstant = zonedToUtc('2026-11-09', plannerTime, plannerTz);
    const tabs = clockInstance.tab;
    root.innerHTML = `<div class="clock-app">
      <header class="clock-appbar"><div class="clock-brand"><span>🌐</span><div><strong>World Clock</strong><small>${esc(cityIds.length)} cities · training day Nov 9, 2026</small></div></div><div class="clock-tabs"><button class="${tabs === 'world' ? 'active' : ''}" data-clock-tab="world">World Clock</button><button class="${tabs === 'planner' ? 'active' : ''}" data-clock-tab="planner">Meeting Planner</button></div><div class="clock-appbar-right"><button class="help-btn" data-help-clock data-tip="How to use time zones when scheduling.">What is this?</button><button class="btn primary small" data-add-city data-tip="Add another city to your world clock.">+ Add city</button></div></header>
      ${tabs === 'world' ? `
      <div class="clock-main">
        <section class="clock-hero">
          <div class="clock-hero-copy"><span class="eyebrow">Executive office · New York</span><h1 id="clock-hero-time">${esc(formatZone(instant, 'America/New_York'))}</h1><p id="clock-hero-date">${esc(nyTime)}</p><span class="clock-tz-chip">${esc(zoneOffsetLabel('America/New_York'))} · New York time</span></div>
          <div class="clock-hero-visual">${analogClock(instant, 'America/New_York')}</div>
        </section>
        <section class="clock-grid">
          ${cityIds.map(tz => {
            const zone = Data.timezones.find(z => z.id === tz) || { label:tz, abbr:'', country:'' };
            return `<article class="clock-card ${isDaytime(instant, tz) ? 'day' : 'night'}" data-city-card="${tz}">
              <div class="clock-card-head"><div><strong>${esc(zone.label)}</strong><small>${esc(zone.country || '')}</small></div><span class="daynight">${isDaytime(instant, tz) ? '☀' : '☾'}</span></div>
              <div class="clock-card-time" data-zone-time="${tz}">${esc(formatZoneSeconds(instant, tz))}</div>
              <div class="clock-card-meta"><span>${esc(zoneOffsetLabel(tz))}</span><span>${esc(offsetFromNewYork(tz))}</span></div>
              <div class="clock-working ${isWorking(instant, tz) ? 'yes' : 'no'}">${isWorking(instant, tz) ? 'Within typical office hours' : 'Outside typical office hours'}</div>
              <button class="clock-remove" data-remove-city="${tz}" aria-label="Remove ${esc(zone.label)}" data-tip="Remove this city from your world clock.">✕</button>
            </article>`;
          }).join('')}
        </section>
        <div class="clock-note"><strong>Time-zone discipline:</strong> a time can be technically possible and still disrespectful. Check the person’s working hours before you send an invite.</div>
      </div>` : `
      <div class="planner-main">
        <section class="planner-controls">
          <div><span class="eyebrow">Meeting planner</span><h2>Find a time that works</h2><p>Choose a meeting start in one time zone. Every city converts automatically.</p></div>
          <div class="planner-inputs">
            <div class="field"><label for="planner-date">Date</label><input class="input" id="planner-date" type="date" value="2026-11-09" disabled data-tip="The training workday is fixed to November 9, 2026 for this exercise."></div>
            <div class="field"><label for="planner-time">Start time</label><input class="input" id="planner-time" type="time" value="${esc(plannerTime)}" data-tip="The meeting start time in the reference time zone."></div>
            <div class="field"><label for="planner-tz">Reference time zone</label><select class="select" id="planner-tz">${Data.timezones.filter(z => ['America/New_York','Europe/London','Asia/Dubai','Asia/Singapore','Asia/Tokyo','America/Los_Angeles','America/Chicago','Europe/Berlin','America/Sao_Paulo','America/Toronto'].includes(z.id)).map(z => `<option value="${z.id}" ${plannerTz === z.id ? 'selected' : ''}>${esc(z.label)} (${esc(z.abbr)})</option>`).join('')}</select></div>
          </div>
        </section>
        <section class="planner-results">
          ${['alexandra','priya','ahmed','mei','takeshi','marcus','isabel','elena','james'].map(id => {
            const c = Store.contactById(id);
            if (!c) return '';
            const conv = Utils.convertZoned('2026-11-09', plannerTime, plannerTz, c.timezone);
            const outside = isWorkingTime(conv.time, c.work);
            return `<div class="planner-row ${outside ? 'outside' : ''}">${Icons.avatar(c.name, 'avatar-md', c.tone)}<div class="planner-person"><strong>${esc(c.name)}</strong><small>${esc(c.title)} · ${esc(c.timezoneLabel)}</small></div><div class="planner-time"><strong>${esc(Utils.fmtTime(conv.time))}</strong><small>${esc(Utils.timeZoneAbbr(c.timezone))}</small></div><span class="planner-status ${outside ? 'warn' : 'ok'}">${outside ? 'Outside hours' : 'Workable'}</span></div>`;
          }).join('')}
        </section>
        <div class="planner-note"><span class="pill ${isPlannerReasonable(plannerInstant) ? 'green' : 'amber'}">${isPlannerReasonable(plannerInstant) ? 'Reasonable for the executive office' : 'Check the hour in New York'}</span><p>When scheduling across regions, start from the executive’s time zone, then check every attendee. The best slot is usually within the overlap of 09:00–17:00 local time.</p></div>
      </div>`}
      <footer class="clock-footer"><span id="clock-live">Live workspace time · updates every second</span><span>Fixed training day · internally consistent.</span></footer>
    </div>`;
    bindClock();
  }

  function isWorking(instant, tz) {
    const p = getTzParts(instant, tz);
    return p.hour >= 8 && p.hour < 18 && p.day >= 1 && p.day <= 5;
  }
  function isWorkingTime(time, work) {
    if (!work) return true;
    const mins = Number(time.split(':')[0]) * 60 + Number(time.split(':')[1]);
    const bits = work.split('–').map(x => { const p = x.split(':').map(Number); return p[0]*60 + p[1]; });
    return mins >= bits[0] && mins < bits[1];
  }
  function isPlannerReasonable(instant) {
    const p = getTzParts(instant, 'America/New_York');
    return p.hour >= 8 && p.hour < 18;
  }

  function bindClock() {
    const root = clockInstance.root;
    root.querySelectorAll('[data-clock-tab]').forEach(b => b.onclick = () => { clockInstance.tab = b.dataset.clockTab; clockRender(); });
    root.querySelectorAll('[data-help-clock]').forEach(b => b.onclick = () => openHelp('clock'));
    root.querySelectorAll('[data-add-city]').forEach(b => b.onclick = addCity);
    root.querySelectorAll('[data-remove-city]').forEach(b => b.onclick = () => {
      const tz = b.dataset.removeCity;
      clockInstance.cities = clockInstance.cities.filter(x => x !== tz);
      Store.update(s => { s.ui.worldClocks = clockInstance.cities; });
      clockRender();
    });
    const time = root.querySelector('#planner-time');
    if (time) time.onchange = () => { clockInstance.plannerTime = time.value; clockRender(); };
    const tz = root.querySelector('#planner-tz');
    if (tz) tz.onchange = () => { clockInstance.plannerTz = tz.value; clockRender(); };
    startClockTick();
  }

  function startClockTick() {
    if (clockInstance.timer) clearInterval(clockInstance.timer);
    clockInstance.timer = setInterval(() => {
      if (!clockInstance || !clockInstance.root || !document.body.contains(clockInstance.root)) return;
      const instant = simInstantNow();
      const hero = clockInstance.root.querySelector('#clock-hero-time');
      if (hero) hero.textContent = formatZone(instant, 'America/New_York');
      const date = clockInstance.root.querySelector('#clock-hero-date');
      if (date) date.textContent = formatZone(instant, 'America/New_York', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
      clockInstance.root.querySelectorAll('[data-zone-time]').forEach(el => { el.textContent = formatZoneSeconds(instant, el.dataset.zoneTime); });
      const clock = clockInstance.root.querySelector('.analog-clock');
      if (clock) {
        // Redraw only the analog clock because hand angles change every second.
        const wrapper = clock.parentElement;
        wrapper.innerHTML = analogClock(instant, 'America/New_York');
      }
    }, 1000);
  }

  function addCity() {
    const available = Data.timezones.filter(z => !clockInstance.cities.includes(z.id));
    modal({
      title:'Add a city', subtitle:'Add a time zone to your world clock. The list saves in this browser.', size:'narrow',
      body:`<div class="city-picker">${available.map(z => `<button class="city-option" data-pick-city="${z.id}"><span class="city-flag">${cityEmoji(z)}</span><span><strong>${esc(z.label)}</strong><small>${esc(z.country)} · ${esc(z.abbr)}</small></span><span>+</span></button>`).join('')}</div>`,
      footer:`<button class="btn" data-close>Cancel</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-close]').onclick = close;
        el.querySelectorAll('[data-pick-city]').forEach(b => b.onclick = () => {
          clockInstance.cities.push(b.dataset.pickCity);
          Store.update(s => { s.ui.worldClocks = clockInstance.cities; });
          close(); clockRender();
          toast('City added', `${Data.timezones.find(z => z.id === b.dataset.pickCity).label} is on your world clock.`, { kind:'success', duration:2500 });
        });
      }
    });
  }
  function cityEmoji(z) {
    return ({ 'America/New_York':'🗽','America/Los_Angeles':'🌉','America/Chicago':'🏙','America/Mexico_City':'🌮','America/Sao_Paulo':'🌴','America/Toronto':'🍁','Europe/London':'🇬🇧','Europe/Dublin':'🇮🇪','Europe/Berlin':'🇩🇪','Europe/Copenhagen':'🇩🇰','Europe/Rome':'🇮🇹','Africa/Lagos':'🇳🇬','Asia/Dubai':'🇦🇪','Asia/Singapore':'🇸🇬','Asia/Tokyo':'🇯🇵','UTC':'🌐' })[z.id] || '🌐';
  }

  App.register('clock', {
    mount(container, win) {
      clockInstance = {
        root:document.createElement('div'), win, tab:'world',
        cities:(Store.state.ui.worldClocks || DEFAULT_CITIES).slice(),
        plannerTime:'09:00', plannerTz:'America/New_York', timer:null
      };
      clockInstance.root.className = 'clock-root app-fill';
      container.innerHTML = ''; container.appendChild(clockInstance.root);
      if (!Store.state.ui.worldClocks) Store.update(s => { s.ui.worldClocks = clockInstance.cities; });
      clockRender();
    },
    reopen() { if (clockInstance) clockRender(); },
    destroy() { if (clockInstance && clockInstance.timer) clearInterval(clockInstance.timer); clockInstance = null; }
  });
})();
