/* ==============================================
   FocusFlow — Goals Page Logic
   ============================================== */

/* ─── STATE ─── */
let goals = [
  {
    id: 1, title: "Learn Java", emoji: "📚",
    done: 4, total: 12,
    deadline: "2025-06-30",
    desc: "Complete Java fundamentals + Spring Boot",
    completed: false, archived: false,
    tasks: ["Set up JDK & IDE", "Variables & control flow", "OOP fundamentals", "Collections & generics", "Exception handling", "Intro to Spring Boot"],
    taskDone: [true, true, true, true, false, false]
  },
  {
    id: 2, title: "Workout Daily", emoji: "💪",
    done: 18, total: 20,
    deadline: "2025-05-31",
    desc: "30-min workout every day for a month",
    completed: false, archived: false,
    tasks: ["Morning stretches", "Cardio 20 min", "Strength training"],
    taskDone: [true, true, false]
  },
  {
    id: 3, title: "Ship Side Project", emoji: "🚀",
    done: 7, total: 15,
    deadline: "2025-07-01",
    desc: "Build & launch FocusFlow MVP",
    completed: false, archived: false,
    tasks: ["Design mockups", "Set up backend", "Build core UI", "Write tests", "Deploy to Vercel"],
    taskDone: [true, true, true, false, false]
  },
  {
    id: 4, title: "Read 12 Books", emoji: "🎯",
    done: 12, total: 12,
    deadline: "2025-12-31",
    desc: "One book per month challenge",
    completed: true, archived: false,
    tasks: ["Atomic Habits", "Deep Work", "The Psychology of Money"],
    taskDone: [true, true, true]
  },
  {
    id: 5, title: "Learn Spanish", emoji: "🌱",
    done: 1, total: 20,
    deadline: "2025-09-01",
    desc: "Reach conversational level in Spanish",
    completed: false, archived: false,
    tasks: ["Duolingo basics", "500 vocab words", "Podcast listening"],
    taskDone: [true, false, false]
  }
];

let progressStyle = 'bar'; // 'bar' | 'circle'
let currentFilter = 'all';
let selectedEmoji = '🎯';
let nextId = 6;

/* ─── HELPERS ─── */
function getPct(g) {
  return Math.round((g.done / g.total) * 100);
}

function getColor(pct) {
  if (pct >= 90) return '#e05500';
  if (pct >= 60) return '#ff6b00';
  if (pct >= 30) return '#ff8c3a';
  return '#ffb27a';
}

function formatDate(d) {
  if (!d) return '';
  const parts = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
}

/* ─── PROGRESS BUILDERS ─── */
function buildProgressBar(g) {
  const pct = getPct(g);
  const color = getColor(pct);
  return `
    <div class="goal-progress-row">
      <div class="progress-track" style="flex:1">
        <div class="progress-fill" data-pct="${pct}"
             style="background:linear-gradient(90deg,${color}99,${color})"></div>
      </div>
      <div class="progress-pct" style="color:${color}">${pct}%</div>
    </div>`;
}

function buildCircleProgress(g) {
  const pct = getPct(g);
  const color = getColor(pct);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return `
    <div class="circular-wrap">
      <svg class="circ-svg" width="56" height="56" viewBox="0 0 56 56">
        <circle class="circ-track" cx="28" cy="28" r="${r}"/>
        <circle class="circ-fill" cx="28" cy="28" r="${r}"
          stroke="${color}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${circ}"
          data-offset="${offset}"
          data-circ="${circ}"/>
        <text x="28" y="33" text-anchor="middle" class="circ-text"
              font-size="11" fill="${color}">${pct}%</text>
      </svg>
      <div style="flex:1">
        <div style="font-size:.78rem;color:var(--text-soft);margin-bottom:2px">Progress</div>
        <div style="height:4px;background:rgba(255,140,58,0.14);border-radius:99px;overflow:hidden">
          <div class="progress-fill" data-pct="${pct}"
               style="background:${color};height:100%"></div>
        </div>
      </div>
    </div>`;
}

/* ─── CARD BUILDER ─── */
function buildCard(g, archived = false) {
  const pct = getPct(g);
  const nearDone = pct >= 80 && !g.completed;

  const classes = ['goal-card',
    g.completed ? 'completed' : '',
    nearDone ? 'near-complete' : '',
    archived ? 'archived' : ''
  ].filter(Boolean).join(' ');

  const iconBg = g.completed
    ? 'background:rgba(45,158,90,0.12)'
    : 'background:rgba(255,107,0,0.10)';

  const deadlineStr = g.deadline
    ? `<span class="goal-chip chip-deadline">
         <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
           <rect x="2" y="3" width="10" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
           <path d="M5 1v3M9 1v3M2 7h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         </svg>
         ${formatDate(g.deadline)}
       </span>` : '';

  const progress = progressStyle === 'circle'
    ? buildCircleProgress(g)
    : buildProgressBar(g);

  const taskHtml = g.tasks.map((t, i) => `
    <div class="task-item">
      <div class="task-check ${g.taskDone[i] ? 'done' : ''}"
           onclick="toggleTask(event,${g.id},${i})"></div>
      <span class="task-label ${g.taskDone[i] ? 'done' : ''}">${t}</span>
    </div>
  `).join('');

  return `
  <div class="${classes}" id="goal-${g.id}" onclick="expandCard(event,${g.id})">
    <div class="goal-inner-grad"></div>
    <div class="goal-top">
      <div class="goal-icon" style="${iconBg}">${g.emoji}</div>
      <div class="goal-info">
        <div class="goal-title">${g.title}</div>
        ${g.desc ? `<div class="goal-desc">${g.desc}</div>` : ''}
      </div>
      <div class="goal-actions" onclick="event.stopPropagation()">
        ${!archived ? `
          <button class="icon-btn check-btn" title="Mark complete" onclick="toggleComplete(${g.id})">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l4 4 6-6"
                stroke="${g.completed ? '#2d9e5a' : 'currentColor'}"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="icon-btn archive-btn" title="Archive" onclick="archiveGoal(${g.id})">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="3" rx="1" stroke="currentColor" stroke-width="1.4"/>
              <path d="M2 5v6a1 1 0 001 1h8a1 1 0 001-1V5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M5 8h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>

    ${progress}

    <div class="goal-footer">
      <span class="goal-chip ${g.completed ? 'chip-done' : 'chip-tasks'}">
        ${g.completed ? '✓ Completed' : `${g.done}/${g.total} tasks`}
      </span>
      ${deadlineStr}
      ${nearDone && !g.completed
        ? `<span class="goal-chip" style="background:rgba(255,107,0,0.12);color:var(--orange-deep)">🔥 Almost there!</span>`
        : ''}
    </div>

    <div class="task-list" id="tasks-${g.id}">
      ${taskHtml}
    </div>
  </div>`;
}

/* ─── RENDER ─── */
function renderGoals() {
  const list          = document.getElementById('goalsList');
  const empty         = document.getElementById('emptyState');
  const archiveSection = document.getElementById('archiveSection');
  const archivedList  = document.getElementById('archivedList');

  const active   = goals.filter(g => !g.archived);
  const archived = goals.filter(g => g.archived);

  let filtered = active;
  if (currentFilter === 'active')    filtered = active.filter(g => !g.completed);
  if (currentFilter === 'completed') filtered = active.filter(g => g.completed);
  if (currentFilter === 'near')      filtered = active.filter(g => getPct(g) >= 80 && !g.completed);

  list.innerHTML = filtered.map(g => buildCard(g)).join('');
  empty.classList.toggle('show', filtered.length === 0);

  if (archived.length > 0) {
    archiveSection.style.display = '';
    archivedList.innerHTML = archived.map(g => buildCard(g, true)).join('');
    document.getElementById('archiveCount').textContent = archived.length;
  } else {
    archiveSection.style.display = 'none';
  }

  /* animate fills after paint */
  requestAnimationFrame(() => {
    document.querySelectorAll('.progress-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
    document.querySelectorAll('.circ-fill').forEach(el => {
      el.style.strokeDashoffset = el.dataset.offset;
    });
  });

  updateStats();
}

function updateStats() {
  const active = goals.filter(g => !g.archived);
  document.getElementById('stat-total').textContent  = active.length;
  document.getElementById('stat-active').textContent = active.filter(g => !g.completed && getPct(g) < 100).length;
  document.getElementById('stat-done').textContent   = active.filter(g => g.completed).length;
}

/* ─── CARD INTERACTIONS ─── */
function expandCard(e, id) {
  if (e.target.closest('.icon-btn')) return;
  const tl = document.getElementById('tasks-' + id);
  if (tl) tl.classList.toggle('open');
}

function toggleTask(e, goalId, taskIdx) {
  e.stopPropagation();
  const g = goals.find(x => x.id === goalId);
  if (!g) return;
  g.taskDone[taskIdx] = !g.taskDone[taskIdx];
  g.done = g.taskDone.filter(Boolean).length;
  renderGoals();
  /* keep task list open after re-render */
  setTimeout(() => {
    const tl = document.getElementById('tasks-' + goalId);
    if (tl) tl.classList.add('open');
  }, 10);
}

function toggleComplete(id) {
  const g = goals.find(x => x.id === id);
  if (!g) return;
  g.completed = !g.completed;
  if (g.completed) {
    g.done = g.total;
    g.taskDone = g.taskDone.map(() => true);
    spawnConfetti();
  }
  renderGoals();
}

function archiveGoal(id) {
  const g = goals.find(x => x.id === id);
  if (g) { g.archived = true; renderGoals(); }
}

/* ─── FILTERS ─── */
function filterGoals(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderGoals();
}

/* ─── ARCHIVE TOGGLE ─── */
function toggleArchive() {
  document.getElementById('archiveToggle').classList.toggle('open');
}

/* ─── MODAL ─── */
function openModal() {
  document.getElementById('inputTitle').value   = '';
  document.getElementById('inputTotal').value   = '10';
  document.getElementById('inputDeadline').value = '';
  document.getElementById('inputDesc').value    = '';
  selectedEmoji = '🎯';
  document.querySelectorAll('.emoji-opt').forEach(e => {
    e.classList.toggle('selected', e.dataset.emoji === '🎯');
  });
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('inputTitle').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function selectEmoji(el) {
  document.querySelectorAll('.emoji-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedEmoji = el.dataset.emoji;
}

function addGoal() {
  const title = document.getElementById('inputTitle').value.trim();
  if (!title) {
    const input = document.getElementById('inputTitle');
    input.focus();
    input.style.borderColor = '#e05500';
    setTimeout(() => (input.style.borderColor = ''), 1200);
    return;
  }
  const total    = Math.max(1, parseInt(document.getElementById('inputTotal').value) || 10);
  const deadline = document.getElementById('inputDeadline').value;
  const desc     = document.getElementById('inputDesc').value.trim();

  goals.unshift({
    id: nextId++, title, emoji: selectedEmoji,
    done: 0, total, deadline, desc,
    completed: false, archived: false,
    tasks: [], taskDone: []
  });

  closeModal();
  currentFilter = 'all';
  document.querySelectorAll('.filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  renderGoals();
}

/* ─── PROGRESS STYLE ─── */
function setProgressStyle(style, btn) {
  progressStyle = style;
  document.querySelectorAll('.toggle-chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  renderGoals();
}

/* ─── NAV TABS ─── */
function setTab(btn) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

/* ─── CONFETTI ─── */
function spawnConfetti() {
  const colors = ['#ff6b00','#ffb27a','#ffd9ba','#ff8c3a','#e05500','#fff0e6'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left:${20 + Math.random() * 60}%;
      top:10%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${Math.random() * 0.5}s;
      border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
      width:${6 + Math.random() * 8}px;
      height:${6 + Math.random() * 8}px;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

/* ─── PROGRESS STYLE TOGGLE (injected below filters) ─── */
function injectProgressToggle() {
  const filterRow = document.querySelector('.filter-row');
  const wrap = document.createElement('div');
  wrap.className = 'toggle-row';
  wrap.style.cssText = 'margin-top:-0.5rem;margin-bottom:1.4rem;';
  wrap.innerHTML = `
    <span class="toggle-label">Progress style:</span>
    <button class="toggle-chip on" onclick="setProgressStyle('bar',this)">Bar</button>
    <button class="toggle-chip"    onclick="setProgressStyle('circle',this)">Circle</button>
  `;
  filterRow.after(wrap);
}

/* ─── INIT ─── */
injectProgressToggle();
renderGoals();
