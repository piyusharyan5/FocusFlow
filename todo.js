/* =============================================
   FocusFlow — app.js
   Handles: task CRUD, filters, stats, render
   ============================================= */

// ── STATE ──────────────────────────────────────
const priorities = ['priority-high', 'priority-med', 'priority-low'];

let tasks = [
  { id: 1, text: 'Design the new onboarding flow',       done: false, priority: 'priority-high' },
  { id: 2, text: 'Review pull requests from the team',   done: false, priority: 'priority-med'  },
  { id: 3, text: 'Schedule weekly standup meeting',       done: true,  priority: 'priority-low'  },
  { id: 4, text: 'Update documentation for API v2',       done: false, priority: 'priority-low'  },
];

let filter    = 'all';
let nextId    = 10;
let priIndex  = 0;     // cycles through priority levels on each new task


// ── NAVIGATION ─────────────────────────────────
function setNav(el) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}


// ── FILTER ─────────────────────────────────────
function setFilter(el) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filter = el.dataset.filter;
  render();
}


// ── ADD TASK ───────────────────────────────────
function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  tasks.unshift({
    id:       nextId++,
    text,
    done:     false,
    priority: priorities[priIndex % 3],
  });

  priIndex++;
  input.value = '';

  // Switch filter to "All" so the new task is always visible
  filter = 'all';
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');

  render();
}


// ── TOGGLE COMPLETE ────────────────────────────
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  render();
}


// ── DELETE TASK ────────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  render();
}


// ── HTML ESCAPE (XSS safety) ───────────────────
function escHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}


// ── RENDER ─────────────────────────────────────
function render() {
  const list = document.getElementById('taskList');

  // Apply active filter
  const visible = tasks.filter(t => {
    if (filter === 'pending')   return !t.done;
    if (filter === 'completed') return  t.done;
    return true;
  });

  // Update stats
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPending').textContent = pending;

  // Empty state messages per filter
  if (visible.length === 0) {
    const messages = {
      all:       ['No tasks yet',       'Add something to focus on today.'],
      pending:   ['All caught up!',     'No pending tasks — great work!'],
      completed: ['Nothing completed yet', 'Finish a task to see it here.'],
    };
    const [title, sub] = messages[filter];

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✦</div>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
      </div>`;
    return;
  }

  // Render task cards
  list.innerHTML = visible.map(task => `
    <div class="task-card ${task.priority} ${task.done ? 'done' : ''}" id="card-${task.id}">

      <div
        class="checkbox ${task.done ? 'checked' : ''}"
        onclick="toggleTask(${task.id})"
        role="checkbox"
        aria-checked="${task.done}"
        tabindex="0"
        onkeydown="if(event.key==='Enter'||event.key===' ')toggleTask(${task.id})"
      ></div>

      <div class="task-text">${escHtml(task.text)}</div>

      <button
        class="delete-btn"
        onclick="deleteTask(${task.id})"
        aria-label="Delete task"
        title="Delete task"
      >✕</button>

    </div>
  `).join('');
}


// ── KEYBOARD: Enter to add ─────────────────────
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});


// ── INIT ───────────────────────────────────────
render();


