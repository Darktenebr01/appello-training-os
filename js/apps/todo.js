/* Tasks — tasks, priorities, due dates, reminders, and My Day. */
(function () {
  'use strict';
  const { esc, toast, modal, confirm, Bus, openHelp, fmtDate, parseISO, dateKey, simNow, addDays, uid, relativeDay } = Utils;
  let instance = null;
  const PRIORITIES = ['high','medium','low'];
  const PRIORITY_LABEL = { high:'High', medium:'Medium', low:'Low' };
  const PRIORITY_ORDER = { high:0, medium:1, low:2 };

  function sortByPreference(list) {
    const copy = list.slice();
    if (instance && instance.sort === 'priority') {
      copy.sort((a,b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || (a.due || '9999').localeCompare(b.due || '9999'));
    } else if (instance && instance.sort === 'title') {
      copy.sort((a,b) => a.title.localeCompare(b.title));
    } else {
      copy.sort((a,b) => (a.due || '9999').localeCompare(b.due || '9999') || (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
    }
    return copy;
  }

  function sortedTasks(tasks, mode) {
    let list = tasks.filter(t => !t.completed);
    if (mode === 'myday') list = list.filter(t => t.myDay);
    else if (mode === 'upcoming') list = list.filter(t => t.due && t.due >= dateKey(simNow())).sort((a,b) => (a.due || '').localeCompare(b.due || '') || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    else if (mode === 'all') list = list.slice();
    else if (mode === 'completed') list = tasks.filter(t => t.completed);
    if (mode !== 'upcoming' && mode !== 'completed') list.sort((a,b) => {
      const ad = a.due ? new Date(a.due) : new Date('2099-12-31');
      const bd = b.due ? new Date(b.due) : new Date('2099-12-31');
      return (ad - bd) || (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || a.title.localeCompare(b.title);
    });
    return list;
  }

  function render() {
    const root = instance.root;
    if (!root) return;
    const tasks = Store.state.todos;
    const today = dateKey(simNow());
    const mode = instance.mode;
    const allActive = tasks.filter(t => !t.completed);
    const myDay = allActive.filter(t => t.myDay);
    const completed = tasks.filter(t => t.completed);
    const overdue = allActive.filter(t => t.due && t.due < today).length;
    let list = sortByPreference(sortedTasks(tasks, mode));
    if (instance.search) {
      const q = instance.search.toLowerCase();
      list = list.filter(t => `${t.title} ${t.notes || ''} ${t.category || ''}`.toLowerCase().includes(q));
    }
    const titles = { myday:'My Day', all:'All tasks', upcoming:'Upcoming', completed:'Completed' };
    root.innerHTML = `
      <div class="todo-app">
        <header class="todo-appbar">
          <div class="todo-brand"><span class="todo-mark">✓</span><div><strong>Tasks</strong><small>Personal task list</small></div></div>
          <div class="todo-appbar-center"><label class="todo-search"><span>⌕</span><input id="todo-search" value="${esc(instance.search)}" placeholder="Search tasks" aria-label="Search tasks" data-tip="Search task titles, notes, and categories."></label></div>
          <div class="todo-appbar-right"><button class="help-btn" data-help-todo data-tip="How tasks, priorities, due dates, and My Day work.">What is this?</button><button class="btn primary small" data-new-task data-tip="Add a task with a due date and priority.">+ Add task</button></div>
        </header>
        <div class="todo-body">
          <aside class="todo-sidebar">
            <div class="todo-profile"><span class="avatar avatar-md tone-2">EH</span><div><strong>Elizabeth Hale</strong><small>Executive Assistant</small></div></div>
            <nav class="todo-nav">
              <button class="${mode === 'myday' ? 'active' : ''}" data-mode="myday" data-tip="The short list you intend to finish today."><span>☀</span>My Day <span class="todo-count">${myDay.length}</span></button>
              <button class="${mode === 'all' ? 'active' : ''}" data-mode="all" data-tip="Every open task, sorted by due date and priority."><span>▤</span>All tasks <span class="todo-count">${allActive.length}</span></button>
              <button class="${mode === 'upcoming' ? 'active' : ''}" data-mode="upcoming" data-tip="Open tasks with a future due date."><span>▦</span>Upcoming <span class="todo-count">${allActive.filter(t => t.due && t.due >= today).length}</span></button>
              <button class="${mode === 'completed' ? 'active' : ''}" data-mode="completed" data-tip="Tasks you have finished."><span>✓</span>Completed <span class="todo-count">${completed.length}</span></button>
            </nav>
            <div class="todo-summary">
              <span class="eyebrow">Today at a glance</span>
              <div class="todo-summary-row"><span class="priority-dot high"></span>${overdue} overdue</div>
              <div class="todo-summary-row"><span class="priority-dot medium"></span>${allActive.filter(t => t.due === today).length} due today</div>
              <div class="todo-summary-row"><span class="priority-dot low"></span>${myDay.filter(t => t.completed).length} My Day finished</div>
              <div class="todo-progress"><span style="width:${tasks.length ? Math.round(completed.length / tasks.length * 100) : 0}%"></span></div>
              <small>${completed.length} of ${tasks.length} tasks complete</small>
            </div>
            <div class="todo-tip"><strong>EA habit</strong><p>If it matters, it gets a due date and an owner. “Soon” is not a deadline.</p></div>
          </aside>
          <main class="todo-main">
            <div class="todo-main-head">
              <div><h2>${titles[mode]}</h2><p>${mode === 'myday' ? 'A realistic short list for today. Keep it to the work you can actually finish.' : mode === 'completed' ? 'Finished tasks remain here for the record.' : 'Sort by what is due and what carries real risk.'}</p></div>
              <div class="todo-view-actions"><select class="select sm" data-todo-sort data-tip="Change how the list is ordered."><option value="due">Due date</option><option value="priority">Priority</option><option value="title">Title A–Z</option></select><button class="btn small" data-new-task>+ Add</button></div>
            </div>
            <div class="quick-add-row"><span class="quick-add-plus">+</span><input id="quick-task" placeholder="Add a task and press Enter" aria-label="Quick add task" data-tip="Quick add a task title. You can set the due date and priority afterwards."><button class="btn primary small" data-quick-add>Add</button></div>
            <div class="todo-list">
              ${list.length ? list.map(t => taskRow(t, today)).join('') : empty(mode, instance.search)}
            </div>
          </main>
          <aside class="todo-detail">
            ${instance.selectedId ? taskDetail(Store.state.todos.find(t => t.id === instance.selectedId)) : `<div class="todo-detail-empty"><span>✓</span><h3>Select a task</h3><p>See the due date, priority, notes, and reminder. A task without context is easy to postpone.</p></div>`}
          </aside>
        </div>
      </div>`;
    bind();
  }

  function taskRow(t, today) {
    const dueLabel = t.due ? (t.due < today ? `Overdue · ${fmtDate(parseISO(t.due), 'medium')}` : t.due === today ? 'Due today' : relativeDay(t.due) + (t.due ? ` · ${fmtDate(parseISO(t.due), 'medium')}` : '')) : 'No due date';
    const selected = instance.selectedId === t.id;
    return `<div class="todo-row ${t.completed ? 'completed' : ''} ${selected ? 'selected' : ''}" data-task="${t.id}" tabindex="0" role="button" aria-label="${esc(t.title)}. ${esc(dueLabel)}. ${esc(PRIORITY_LABEL[t.priority] || '')} priority.">
      <button class="todo-check ${t.completed ? 'checked' : ''}" data-complete="${t.id}" aria-label="${t.completed ? 'Mark incomplete' : 'Mark complete'}" data-tip="Mark this task complete. Completing a task is a decision, not a reward.">${t.completed ? '✓' : ''}</button>
      <div class="todo-row-main"><div class="todo-row-title"><span>${esc(t.title)}</span>${t.reminder ? '<span class="todo-reminder">🔔</span>' : ''}</div><div class="todo-row-meta"><span class="priority-chip ${t.priority || 'medium'}">${esc(PRIORITY_LABEL[t.priority] || 'Medium')}</span>${t.category ? `<span>${esc(t.category)}</span>` : ''}<span class="${t.due && t.due < today ? 'overdue' : ''}">${esc(dueLabel)}</span></div></div>
      <button class="todo-star ${t.myDay ? 'on' : ''}" data-myday="${t.id}" aria-label="${t.myDay ? 'Remove from My Day' : 'Add to My Day'}" data-tip="${t.myDay ? 'Remove from My Day.' : 'Add to My Day so you commit to it today.'}">${t.myDay ? '☀' : '☆'}</button>
      <button class="todo-more" data-task-menu="${t.id}" aria-label="More task actions" data-tip="Edit, delete, or change the reminder.">⋯</button>
    </div>`;
  }

  function taskDetail(t) {
    if (!t) return `<div class="todo-detail-empty"><span>✓</span><h3>Task not found</h3><p>It may have been deleted.</p></div>`;
    const stats = { high:'A real deadline or risk. Do it before lower priorities.', medium:'Important but not immediately urgent.', low:'Useful when the urgent work is clear.' };
    return `<div class="todo-detail-head"><span class="eyebrow">Task details</span><button class="icon-btn" data-close-task-detail aria-label="Close task details">✕</button></div>
      <h3>${esc(t.title)}</h3>
      <div class="todo-detail-badges"><span class="priority-chip ${t.priority || 'medium'}">${esc(PRIORITY_LABEL[t.priority] || 'Medium')}</span>${t.myDay ? '<span class="pill amber">☀ My Day</span>' : ''}${t.completed ? '<span class="pill green">Completed</span>' : ''}</div>
      <div class="todo-detail-row"><span>Due</span><strong>${t.due ? esc(fmtDate(parseISO(t.due), 'long')) : 'No due date'}</strong></div>
      <div class="todo-detail-row"><span>Category</span><strong>${esc(t.category || 'Uncategorised')}</strong></div>
      <div class="todo-detail-row"><span>Reminder</span><strong>${t.reminder ? 'On' : 'Off'}</strong></div>
      <div class="todo-detail-notes"><span class="eyebrow">Notes</span><p>${esc(t.notes || 'No notes yet. Add the context you will need later — the decision, the person, or the link.')}</p></div>
      <div class="todo-detail-actions"><button class="btn primary small" data-edit-task="${t.id}">Edit task</button><button class="btn small" data-myday="${t.id}">${t.myDay ? 'Remove from My Day' : 'Add to My Day'}</button><button class="btn small" data-complete="${t.id}">${t.completed ? 'Mark incomplete' : 'Complete'}</button></div>
      <div class="todo-detail-why"><strong>Why priority matters</strong><p>${esc(stats[t.priority] || stats.medium)}</p></div>`;
  }

  function empty(mode, search) {
    if (search) return `<div class="empty-state"><div class="empty-icon">⌕</div><h3>No matching tasks</h3><p>Try a shorter search.</p></div>`;
    if (mode === 'myday') return `<div class="empty-state"><div class="empty-icon">☀</div><h3>My Day is clear</h3><p>Add the three to five tasks you intend to finish today. A realistic list is better than a long one.</p><button class="btn primary small" data-new-task>Add a task</button></div>`;
    if (mode === 'completed') return `<div class="empty-state"><div class="empty-icon">✓</div><h3>Nothing completed yet</h3><p>Finish a task and it will appear here for the record.</p></div>`;
    return `<div class="empty-state"><div class="empty-icon">✓</div><h3>No tasks here</h3><p>Add your first task with a due date and a priority.</p><button class="btn primary small" data-new-task>Add a task</button></div>`;
  }

  function bind() {
    const root = instance.root;
    const $ = s => root.querySelector(s);
    root.querySelectorAll('[data-help-todo]').forEach(b => b.onclick = () => openHelp('todo'));
    root.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { instance.mode = b.dataset.mode; instance.selectedId = null; render(); });
    root.querySelectorAll('[data-new-task]').forEach(b => b.onclick = () => openTaskModal());
    root.querySelectorAll('[data-quick-add]').forEach(b => b.onclick = quickAdd);
    const quick = $('#quick-task');
    if (quick) quick.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } };
    const search = $('#todo-search');
    if (search) search.oninput = Utils.debounce(() => { instance.search = search.value; render(); setTimeout(() => { const i = instance.root.querySelector('#todo-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length,i.value.length); } }, 0); }, 160);
    root.querySelectorAll('[data-complete]').forEach(b => b.onclick = e => { e.stopPropagation(); toggleComplete(b.dataset.complete); });
    root.querySelectorAll('[data-myday]').forEach(b => b.onclick = e => { e.stopPropagation(); toggleMyDay(b.dataset.myday); });
    root.querySelectorAll('[data-task]').forEach(row => {
      row.onclick = () => { instance.selectedId = row.dataset.task; render(); };
      row.onkeydown = e => { if (e.key === 'Enter') { instance.selectedId = row.dataset.task; render(); } };
      row.oncontextmenu = e => { e.preventDefault(); taskMenu(row.dataset.task, e.clientX, e.clientY); };
    });
    root.querySelectorAll('[data-task-menu]').forEach(b => b.onclick = e => { e.stopPropagation(); const r = b.getBoundingClientRect(); taskMenu(b.dataset.taskMenu, r.left - 160, r.bottom + 3); });
    root.querySelectorAll('[data-edit-task]').forEach(b => b.onclick = () => openTaskModal(Store.state.todos.find(t => t.id === b.dataset.editTask)));
    const close = $('[data-close-task-detail]'); if (close) close.onclick = () => { instance.selectedId = null; render(); };
    const sort = $('[data-todo-sort]'); if (sort) sort.onchange = () => { instance.sort = sort.value; toast('Sort preference noted', 'Due date and priority remain the recommended order for executive work.', { duration:2600 }); };
  }

  function quickAdd() {
    const input = instance.root.querySelector('#quick-task');
    if (!input || !input.value.trim()) return;
    const title = input.value.trim();
    const task = { id:uid('t'), title, due:dateKey(simNow()), priority:'medium', category:'Inbox', myDay:false, completed:false, reminder:false, notes:'' };
    Store.update(s => s.todos.unshift(task));
    Bus.emit('todo:created', { taskId:task.id, title, due:task.due, priority:task.priority, myDay:false, category:task.category });
    input.value = '';
    instance.selectedId = task.id;
    toast('Task added', 'Set a real due date and priority when you are ready.', { kind:'success', duration:2600 });
    render();
  }

  function toggleComplete(id) {
    const t = Store.state.todos.find(x => x.id === id);
    if (!t) return;
    Store.update(s => { const task = s.todos.find(x => x.id === id); if (task) { task.completed = !task.completed; task.completedAt = task.completed ? Utils.simNowIso() : null; } });
    Bus.emit(t.completed ? 'todo:reopened' : 'todo:completed', { taskId:id, title:t.title, priority:t.priority });
    toast(t.completed ? 'Task reopened' : 'Task completed', t.completed ? 'It is back in your open list.' : 'The task stays in Completed for the record.', { kind:'success', duration:2500 });
    render();
  }
  function toggleMyDay(id) {
    const t = Store.state.todos.find(x => x.id === id);
    if (!t) return;
    Store.update(s => { const task = s.todos.find(x => x.id === id); if (task) task.myDay = !task.myDay; });
    Bus.emit('todo:myday', { taskId:id, title:t.title, myDay:!t.myDay });
    toast(t.myDay ? 'Removed from My Day' : 'Added to My Day', t.myDay ? 'Your daily commitment is smaller.' : 'Commit to it today, not someday.', { duration:2400 });
    render();
  }

  function taskMenu(id, x, y) {
    const t = Store.state.todos.find(z => z.id === id);
    if (!t) return;
    OS.contextMenu(x, y, [
      { label:'Edit task', icon:'✎', action:() => openTaskModal(t) },
      { label:t.completed ? 'Mark incomplete' : 'Mark complete', icon:'✓', action:() => toggleComplete(id) },
      { label:t.myDay ? 'Remove from My Day' : 'Add to My Day', icon:'☀', action:() => toggleMyDay(id) },
      { label:t.reminder ? 'Turn reminder off' : 'Remind me', icon:'🔔', action:() => toggleReminder(id) },
      { separator:true },
      { label:'Delete task', icon:'🗑', action:() => deleteTask(id), danger:true }
    ]);
  }
  function toggleReminder(id) {
    const t = Store.state.todos.find(x => x.id === id);
    Store.update(s => { const task = s.todos.find(x => x.id === id); if (task) task.reminder = !task.reminder; });
    Bus.emit('todo:reminder-set', { taskId:id, reminder:!t.reminder, title:t.title });
    render(); toast(t.reminder ? 'Reminder removed' : 'Reminder set', t.reminder ? 'No reminder will appear.' : 'You will see a practice reminder for this task.', { duration:2600 });
  }
  async function deleteTask(id) {
    const t = Store.state.todos.find(x => x.id === id);
    if (!t) return;
    const ok = await confirm({ title:'Delete task?', message:`“${esc(t.title)}” will be removed from the list. Completing or reassigning is often better than deleting, but this is a practice environment.`, okText:'Delete task', danger:true });
    if (!ok) return;
    Store.update(s => { s.todos = s.todos.filter(x => x.id !== id); });
    instance.selectedId = null;
    Bus.emit('todo:deleted', { taskId:id, title:t.title });
    render(); toast('Task deleted', t.title, { kind:'success', duration:2400 });
  }

  function openTaskModal(existing) {
    const today = dateKey(simNow());
    modal({
      title: existing ? 'Edit task' : 'Add a task',
      subtitle:'A useful task has a clear action, an owner (you), a due date, and a priority. Notes hold the context you will need later.',
      size:'wide',
      body:`<div class="form-grid">
        <div class="field span-2"><label for="task-title">Task <span class="req">*</span></label><input id="task-title" class="input" value="${esc(existing ? existing.title : '')}" placeholder="e.g. Confirm board dinner count with Fiona" data-tip="Start with a verb and name the deliverable. “Follow up” is vague; “Confirm final count with Fiona” is actionable."></div>
        <div class="field"><label for="task-due">Due date</label><input id="task-due" class="input" type="date" value="${esc(existing ? (existing.due || '') : today)}" data-tip="When this must be finished. A due date creates accountability."></div>
        <div class="field"><label for="task-priority">Priority</label><select id="task-priority" class="select" data-tip="High = real deadline or risk. Medium = important. Low = useful when urgent work is clear.">${PRIORITIES.map(p => `<option value="${p}" ${(existing ? existing.priority : 'medium') === p ? 'selected' : ''}>${PRIORITY_LABEL[p]}</option>`).join('')}</select></div>
        <div class="field"><label for="task-category">Category</label><select id="task-category" class="select">${['Board','Client','Travel','Event','Finance','Executive','Internal','Inbox'].map(c => `<option value="${c}" ${(existing ? existing.category : 'Inbox') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label for="task-folder">Add to My Day</label><label class="checkbox-row" style="margin-top:5px"><input type="checkbox" id="task-myday" ${existing && existing.myDay ? 'checked' : ''}><span>Commit to this today</span></label><label class="checkbox-row" style="margin-top:5px"><input type="checkbox" id="task-reminder" ${existing && existing.reminder ? 'checked' : ''}><span>Remind me</span></label></div>
        <div class="field span-2"><label for="task-notes">Notes</label><textarea id="task-notes" class="textarea" placeholder="Context, decisions, contact, or the next step." data-tip="Add the detail you would otherwise have to remember: source, deadline, decision, or person.">${esc(existing ? (existing.notes || '') : '')}</textarea></div>
      </div><div class="help-callout" style="margin-top:12px"><span>🎯</span><div>If everything is high priority, nothing is. Choose high only when missing the task would create a real problem.</div></div>`,
      footer:`<div class="left-actions">${existing ? `<button class="btn danger small" data-delete-existing>Delete</button>` : ''}</div><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-save>${existing ? 'Save changes' : 'Add task'}</button>`,
      onOpen({ modal: el, close }) {
        el.querySelector('[data-cancel]').onclick = close;
        const del = el.querySelector('[data-delete-existing]'); if (del) del.onclick = () => { close(); deleteTask(existing.id); };
        el.querySelector('[data-save]').onclick = () => {
          const title = el.querySelector('#task-title').value.trim();
          if (!title) { toast('Add a task title', 'Start with a verb and a deliverable.', { kind:'error' }); return; }
          const due = el.querySelector('#task-due').value;
          const priority = el.querySelector('#task-priority').value;
          const category = el.querySelector('#task-category').value;
          const myDay = el.querySelector('#task-myday').checked;
          const reminder = el.querySelector('#task-reminder').checked;
          const notes = el.querySelector('#task-notes').value;
          if (existing) {
            Store.update(s => { const t = s.todos.find(x => x.id === existing.id); if (t) Object.assign(t, { title, due, priority, category, myDay, reminder, notes }); });
            Bus.emit('todo:updated', { taskId:existing.id, title, due, priority, myDay, category });
            toast('Task updated', title, { kind:'success' });
          } else {
            const task = { id:uid('t'), title, due, priority, category, myDay, reminder, completed:false, notes };
            Store.update(s => s.todos.unshift(task));
            instance.selectedId = task.id;
            Bus.emit('todo:created', { taskId:task.id, title, due, priority, myDay, category, reminder });
            toast('Task added', title, { kind:'success' });
          }
          close(); render();
        };
        setTimeout(() => el.querySelector('#task-title').focus(), 30);
      }
    });
  }

  const app = {
    mount(container, win, params) {
      instance = { root:document.createElement('div'), win, mode:'myday', search:'', selectedId:null, sort:'due' };
      instance.root.className = 'todo-root app-fill';
      container.innerHTML = '';
      container.appendChild(instance.root);
      if (params && params.mode) instance.mode = params.mode;
      render();
    },
    reopen(params) {
      if (!instance) return;
      if (params && params.mode) instance.mode = params.mode;
      if (params && params.newTask) { render(); setTimeout(() => openTaskModal(), 100); return; }
      render();
    },
    destroy() { instance = null; }
  };
  App.register('todo', app);
  window.ToDoApp = { openNew() { if (!OS.isOpen('todo')) OS.openApp('todo'); setTimeout(() => openTaskModal(), 120); } };
})();
