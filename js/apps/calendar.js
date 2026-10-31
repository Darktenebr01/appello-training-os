/* Standalone Calendar — the same shared calendar as Mail and Teamspace. */
(function () {
  'use strict';
  let instance = null;
  function render(container) {
    container.innerHTML = `<div class="calendar-app-shell">
      <header class="calendar-topbar">
        <div class="calendar-brand"><span class="calendar-mark">${Icons.icons.calendar}</span><div><strong>Calendar</strong><small>APPELLO · Executive office</small></div></div>
        <label class="calendar-search"><span>⌕</span><input placeholder="Search calendar" aria-label="Search calendar"></label>
        <div class="calendar-top-actions"><button class="help-btn" data-calendar-help>What is this?</button>${Icons.avatar('Elizabeth Hale', 'avatar-sm', 2)}</div>
      </header>
      <div id="standalone-calendar" class="standalone-calendar"></div>
    </div>`;
    const host = container.querySelector('#standalone-calendar');
    instance.controller = CalendarView.mount(host, { context:'mail' });
    container.querySelector('[data-calendar-help]').onclick = () => Utils.toast('Calendar', 'This is the shared APPELLO training calendar. Events created here also appear in Mail and Teamspace. All names and times are fictional.', { duration:4600 });
    container.querySelector('.calendar-search input').oninput = e => {
      const q = e.target.value.trim();
      if (!q) return;
      const found = Store.state.calendar.events.find(ev => ev.title.toLowerCase().includes(q.toLowerCase()));
      if (found) Utils.toast('Calendar search', `Found “${found.title}” on ${Utils.fmtDate(found.date, 'medium')} at ${Utils.fmtTime(found.start)}.`, { duration:3200 });
    };
  }
  App.register('calendar', { mount(container){ instance = {}; render(container); }, destroy(){ if (instance && instance.controller && instance.controller.destroy) instance.controller.destroy(); instance = null; } });
})();
