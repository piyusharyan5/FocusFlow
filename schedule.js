/* ============================================================
   FocusFlow — app.js
   All event listeners wired in JS; no inline onclick in HTML.
   Bugs fixed:
     1. saveTask/deleteTask re-declaration pattern replaced with
        a single unified function that handles both 'new' and edit.
     2. deleteTask now safely handles editingId === 'new'.
     3. addBreakAt inline onclick strings removed — callbacks use
        closure references instead.
     4. Week view toggle shows a proper message.
   ============================================================ */

/* ── CONSTANTS ────────────────────────────────────────── */
const HOUR_PX    = 60;
const START_HOUR = 6;   // 6 AM
const END_HOUR   = 24;  // midnight

/* ── STATE ────────────────────────────────────────────── */
let currentView = 'day';
let dayOffset   = 0;
let editingId   = null;   // numeric id, or 'new', or null
let listening   = false;
let recognition = null;

let tasks = [
  { id: 1,  name: 'Morning Planning',   start:  6 * 60,       dur:  30, p: 'p-low'   },
  { id: 2,  name: 'Deep Work — Coding', start:  7 * 60,       dur: 120, p: 'p-focus' },
  { id: 3,  name: 'Team Standup',       start:  9 * 60 + 30,  dur:  30, p: 'p-high'  },
  { id: 4,  name: 'Break & Coffee',     start: 10 * 60,       dur:  15, p: 'p-break' },
  { id: 5,  name: 'Design Review',      start: 10 * 60 + 15,  dur:  60, p: 'p-med'   },
  { id: 6,  name: 'Lunch',              start: 12 * 60,       dur:  45, p: 'p-break' },
  { id: 7,  name: 'Client Call',        start: 14 * 60,       dur:  45, p: 'p-high'  },
  { id: 8,  name: 'Focus Block',        start: 15 * 60,       dur:  90, p: 'p-focus' },
  { id: 9,  name: 'Email & Comms',      start: 17 * 60,       dur:  30, p: 'p-low'   },
];
let nextId = 20;

/* Pending suggestions from autoPlanDay */
let pendingSuggestions = [];

/* ── DATE HELPERS ─────────────────────────────────────── */
function getTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d;
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function updateDateDisplay() {
  const d = getTargetDate();
  document.getElementById('navDate').textContent =
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const title = document.getElementById('scheduleTitle');
  const dayStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  if (dayOffset ===  0) title.textContent = 'Today — '     + dayStr;
  else if (dayOffset ===  1) title.textContent = 'Tomorrow — '  + dayStr;
  else if (dayOffset === -1) title.textContent = 'Yesterday — ' + dayStr;
  else title.textContent = fmtDate(d);
}

/* ── TIME UTILS ───────────────────────────────────────── */
function minToY(min)  { return (min - START_HOUR * 60) * (HOUR_PX / 60); }
function yToMin(y)    { return Math.round(((y / (HOUR_PX / 60)) + START_HOUR * 60) / 15) * 15; }

function fmtTime(min) {
  const h    = Math.floor(min / 60);
  const m    = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function priorityEmoji(p) {
  const map = { 'p-high': '🔴', 'p-med': '🟠', 'p-low': '🟢', 'p-focus': '🟣', 'p-break': '🔵' };
  return map[p] || '⚪';
}

/* ── TIMELINE RENDER ──────────────────────────────────── */
function renderTimeline() {
  const tl = document.getElementById('timeline');
  tl.innerHTML = '';

  /* Hour rows */
  for (let h = START_HOUR; h < END_HOUR; h++) {
    const row = document.createElement('div');
    row.className = 'hour-row';

    const label = document.createElement('div');
    label.className = 'hour-label';
    label.textContent =
      h === 0  ? '12 AM' :
      h < 12   ? h + ' AM' :
      h === 12 ? '12 PM' :
                 (h - 12) + ' PM';

    const drop = document.createElement('div');
    drop.className = 'hour-dropzone';
    drop.dataset.hour = h;
    drop.addEventListener('dragover',  onDropZoneDragOver);
    drop.addEventListener('dragleave', onDropZoneDragLeave);
    drop.addEventListener('drop',      onDrop);
    drop.addEventListener('dblclick',  () => openNewTaskAt(h * 60));

    row.appendChild(label);
    row.appendChild(drop);
    tl.appendChild(row);
  }

  /* Task blocks */
  tasks.forEach(t => renderTaskBlock(t, tl));

  /* Current time indicator */
  if (dayOffset === 0) renderTimeIndicator(tl);

  /* Auto-scroll to 7 AM */
  setTimeout(() => {
    document.getElementById('timelineScroll').scrollTop = minToY(7 * 60) - 30;
  }, 50);
}

function renderTaskBlock(t, container) {
  const y = minToY(t.start);
  const h = (t.dur / 60) * HOUR_PX;

  const el = document.createElement('div');
  el.className  = `task-block ${t.p}${t.suggested ? ' suggested-block' : ''}`;
  el.id         = `task-${t.id}`;
  el.style.top  = y + 'px';
  el.style.height = Math.max(h, 28) + 'px';
  el.draggable  = true;

  el.innerHTML = `
    <div class="task-block-name">${t.name}</div>
    <div class="task-block-time">${fmtTime(t.start)} · ${t.dur}min</div>
    <span class="task-block-badge">${priorityEmoji(t.p)}</span>
    <div class="resize-handle"></div>
  `;

  el.addEventListener('click', (e) => {
    if (!e.target.closest('.resize-handle')) openEdit(t.id);
  });
  el.addEventListener('dragstart', (e) => onDragStart(e, t.id));
  el.addEventListener('dragend',   onDragEnd);

  el.querySelector('.resize-handle').addEventListener('mousedown', (e) => startResize(e, t.id));

  container.appendChild(el);
}

function renderTimeIndicator(container) {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  if (min < START_HOUR * 60 || min > END_HOUR * 60) return;

  const line = document.createElement('div');
  line.className  = 'time-line';
  line.style.top  = minToY(min) + 'px';
  line.innerHTML  = `<div class="time-line-label">${fmtTime(min)}</div>`;
  container.appendChild(line);

  /* Refresh every 60 s */
  setTimeout(() => {
    const existing = container.querySelector('.time-line');
    if (existing) existing.remove();
    if (dayOffset === 0) renderTimeIndicator(container);
  }, 60_000);
}

/* ── DRAG & DROP ──────────────────────────────────────── */
let draggingId  = null;
let dragOffsetY = 0;

function onDragStart(e, id) {
  draggingId  = id;
  dragOffsetY = e.offsetY;
  document.getElementById('task-' + id)?.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
}

function onDragEnd() {
  document.getElementById('task-' + draggingId)?.classList.remove('dragging');
  draggingId = null;
}

function onDropZoneDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function onDropZoneDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
  const t  = tasks.find(x => x.id === id);
  if (!t) return;

  const rect   = e.currentTarget.getBoundingClientRect();
  const relY   = e.clientY - rect.top - dragOffsetY;
  const newMin = yToMin(relY + (t.start - START_HOUR * 60) * (HOUR_PX / 60));

  t.start = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - t.dur, newMin));
  renderTimeline();
  checkConflictsSilent();
  showToast(`"${t.name}" moved to ${fmtTime(t.start)}`);
}

/* ── RESIZE ───────────────────────────────────────────── */
let resizingId    = null;
let resizeStartY  = 0;
let resizeStartDur = 0;

function startResize(e, id) {
  e.stopPropagation();
  e.preventDefault();
  resizingId     = id;
  resizeStartY   = e.clientY;
  resizeStartDur = tasks.find(x => x.id === id).dur;
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup',   onResizeEnd);
}

function onResizeMove(e) {
  const t = tasks.find(x => x.id === resizingId);
  if (!t) return;

  const delta     = e.clientY - resizeStartY;
  const deltaMins = Math.round((delta / (HOUR_PX / 60)) / 15) * 15;
  t.dur = Math.max(15, Math.min(480, resizeStartDur + deltaMins));

  const el = document.getElementById('task-' + t.id);
  if (el) {
    el.style.height = ((t.dur / 60) * HOUR_PX) + 'px';
    el.querySelector('.task-block-time').textContent = `${fmtTime(t.start)} · ${t.dur}min`;
  }
}

function onResizeEnd() {
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup',   onResizeEnd);
  checkConflictsSilent();
  resizingId = null;
}

/* ── CONFLICT CHECK ───────────────────────────────────── */
function checkConflicts() {
  const conflicts = [];
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = tasks[i], b = tasks[j];
      if (a.start < b.start + b.dur && a.start + a.dur > b.start) {
        conflicts.push([a, b]);
      }
    }
  }
  return conflicts;
}

function checkConflictsSilent() {
  const conflicts = checkConflicts();
  conflicts.forEach(([a, b]) => {
    [a.id, b.id].forEach(id => {
      const el = document.getElementById('task-' + id);
      if (el) {
        el.classList.add('conflict');
        setTimeout(() => el.classList.remove('conflict'), 1500);
      }
    });
  });
  return conflicts;
}

/* ── EDIT MODAL ───────────────────────────────────────── */
function openEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingId = id;

  document.getElementById('editName').value     = t.name;
  document.getElementById('editStart').value    = `${Math.floor(t.start / 60).toString().padStart(2, '0')}:${(t.start % 60).toString().padStart(2, '0')}`;
  document.getElementById('editDuration').value = t.dur;
  document.getElementById('editPriority').value = t.p;
  document.getElementById('deleteBtn').style.display = '';   // show delete for real tasks

  document.getElementById('editModal').classList.add('open');
}

function openNewTaskAt(startMin) {
  editingId = 'new';
  const h = Math.floor(startMin / 60).toString().padStart(2, '0');
  const m = (startMin % 60).toString().padStart(2, '0');

  document.getElementById('editName').value     = 'New Task';
  document.getElementById('editStart').value    = `${h}:${m}`;
  document.getElementById('editDuration').value = 30;
  document.getElementById('editPriority').value = 'p-med';
  document.getElementById('deleteBtn').style.display = 'none'; // hide delete for new tasks

  document.getElementById('editModal').classList.add('open');
}

function closeModalDirect() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

/* FIX: single saveTask handles both 'new' and edit modes */
function saveTask() {
  const name     = document.getElementById('editName').value.trim() || 'New Task';
  const [hh, mm] = document.getElementById('editStart').value.split(':');
  const start    = parseInt(hh, 10) * 60 + parseInt(mm, 10);
  const dur      = parseInt(document.getElementById('editDuration').value, 10) || 30;
  const p        = document.getElementById('editPriority').value;

  if (editingId === 'new') {
    tasks.push({ id: nextId++, name, start, dur, p });
    showToast('Task added');
  } else {
    const t = tasks.find(x => x.id === editingId);
    if (t) Object.assign(t, { name, start, dur, p });
    showToast('Task updated');
  }

  closeModalDirect();
  renderTimeline();
}

/* FIX: deleteTask is safe for 'new' (just closes) */
function deleteTask() {
  if (editingId === 'new') {
    closeModalDirect();
    return;
  }
  tasks = tasks.filter(x => x.id !== editingId);
  closeModalDirect();
  renderTimeline();
  showToast('Task deleted');
}

/* ── VIEW TOGGLE ──────────────────────────────────────── */
function setView(v) {
  currentView = v;
  document.getElementById('dayBtn').classList.toggle('active',  v === 'day');
  document.getElementById('weekBtn').classList.toggle('active', v === 'week');
  renderTimeline();
  if (v === 'week') {
    addAiMsg('ai', "📅 Week view is active. Double-click any time slot to add a task. Drag blocks to reschedule.");
  }
}

/* ── TOAST ────────────────────────────────────────────── */
function showToast(msg, dur = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

/* ── AI CHAT ──────────────────────────────────────────── */
function addAiMsg(role, content, extraHTML = '') {
  const chat = document.getElementById('aiChat');
  const div  = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-avatar ${role}">${role === 'ai' ? '✦' : 'AK'}</div>
    <div class="msg-bubble">${content}${extraHTML}</div>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function showTyping() {
  const chat = document.getElementById('aiChat');
  const div  = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar ai">✦</div>
    <div class="typing"><span></span><span></span><span></span></div>
  `;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing-indicator')?.remove();
}

function sendMessage() {
  const input = document.getElementById('aiInput');
  const msg   = input.value.trim();
  if (!msg) return;
  addAiMsg('user', msg);
  input.value = '';
  processAiMessage(msg);
}

function sendQuick(msg) {
  addAiMsg('user', msg);
  processAiMessage(msg);
}

function processAiMessage(msg) {
  showTyping();
  const lower = msg.toLowerCase();
  const delay = 1000 + Math.random() * 600;

  setTimeout(() => {
    hideTyping();
    if      (lower.includes('plan my day') || lower.includes('auto plan')) autoPlanDay();
    else if (lower.includes('conflict') || lower.includes('overlap'))      detectConflicts();
    else if (lower.includes('break'))                                       addSmartBreak();
    else if (lower.includes('optimize'))                                    optimizeSchedule();
    else if (lower.includes('focus') || lower.includes('deep work'))       addFocusBlock();
    else if (lower.includes('next') || lower.includes('what should'))      suggestNext();
    else    addAiMsg('ai', getGenericReply());
  }, delay);
}

function getGenericReply() {
  const replies = [
    "I can help you plan and optimize your schedule. Try asking me to <strong>plan your day</strong>, <strong>add a break</strong>, or <strong>check for conflicts</strong>.",
    `Based on your current schedule, I see you have <strong>${tasks.filter(t => t.p === 'p-high').length} high-priority tasks</strong> today. Want me to reorganize them for peak performance?`,
    "Your schedule looks fairly packed. I recommend scheduling cognitively demanding tasks between <strong>8–11 AM</strong> when focus is naturally highest.",
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

/* ── AI ACTIONS ───────────────────────────────────────── */
function autoPlanDay() {
  showTyping();
  setTimeout(() => {
    hideTyping();

    /* FIX: store callbacks as real functions, not eval-able strings */
    pendingSuggestions = [
      { icon: '🌅', text: 'Start with 15-min morning planning at 6:00 AM', action: () => highlightSlot(6 * 60) },
      { icon: '🎯', text: 'Deep focus block 8:00–10:00 AM (2h coding)',     action: () => highlightSlot(8 * 60) },
      { icon: '☕', text: '10-min break at 10:00 AM',                        action: () => addBreakAt(10 * 60, 10) },
      { icon: '📋', text: 'Admin & email 10:10–11:00 AM',                   action: () => highlightSlot(10 * 60 + 10) },
      { icon: '🍽', text: 'Lunch break 12:00–12:45 PM',                    action: () => highlightSlot(12 * 60) },
      { icon: '🔴', text: 'High-priority tasks 1:00–3:00 PM',              action: () => highlightSlot(13 * 60) },
      { icon: '💤', text: '5-min micro-break at 3:00 PM',                   action: () => addBreakAt(15 * 60, 5) },
    ];

    const sugsHtml = pendingSuggestions.map((s, i) => `
      <div class="suggestion-item">
        <span class="si-icon">${s.icon}</span>
        <span>${s.text}</span>
        <button class="si-apply" data-sug="${i}">Apply</button>
      </div>
    `).join('');

    const msgEl = addAiMsg(
      'ai',
      '✦ <strong>Here\'s your optimized day plan</strong>. Based on your energy patterns, I\'ve scheduled high-focus work in the morning and lighter tasks in the afternoon.',
      `<div class="suggestion-card">${sugsHtml}</div>`
    );

    /* Delegate apply clicks within this message */
    msgEl.querySelectorAll('.si-apply').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.sug, 10);
        pendingSuggestions[idx]?.action();
        showToast('Suggestion applied ✓');
      });
    });

    showToast('AI plan ready — review suggestions');
  }, 1400);
}

function detectConflicts() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    const conflicts = checkConflicts();
    if (conflicts.length === 0) {
      addAiMsg('ai', '✅ <strong>No conflicts detected!</strong> Your schedule looks clean. All tasks have clear time slots with no overlaps.');
      return;
    }

    conflicts.forEach(([a, b]) => {
      const alertHTML = `
        <div class="conflict-alert">
          <span class="ca-icon">⚠️</span>
          <div class="ca-text">
            <strong>"${a.name}"</strong> overlaps with <strong>"${b.name}"</strong><br>
            ${fmtTime(a.start)}–${fmtTime(a.start + a.dur)} vs ${fmtTime(b.start)}–${fmtTime(b.start + b.dur)}
            <br><button class="ca-fix" data-a="${a.id}" data-b="${b.id}">Auto-fix →</button>
          </div>
        </div>`;

      const msgEl = addAiMsg('ai', 'Found a scheduling conflict:', alertHTML);
      msgEl.querySelector('.ca-fix').addEventListener('click', (e) => {
        autoFixConflict(
          parseInt(e.target.dataset.a, 10),
          parseInt(e.target.dataset.b, 10)
        );
      });
    });

    renderTimeline();
  }, 900);
}

function autoFixConflict(idA, idB) {
  const a = tasks.find(x => x.id === idA);
  const b = tasks.find(x => x.id === idB);
  if (!a || !b) return;
  b.start = a.start + a.dur;
  renderTimeline();
  addAiMsg('ai', `✅ Fixed! <strong>"${b.name}"</strong> moved to <strong>${fmtTime(b.start)}</strong>.`);
  showToast('Conflict resolved');
}

function addSmartBreak() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    let placed = false;
    for (let m = 8 * 60; m < 17 * 60; m += 30) {
      const overlap = tasks.some(t => t.start <= m && t.start + t.dur > m);
      if (!overlap) {
        addBreakAt(m, 15);
        addAiMsg('ai', `☕ <strong>Break added at ${fmtTime(m)}</strong>. Regular breaks improve focus by up to 40%. I've scheduled a 15-min rest in a free slot.`);
        placed = true;
        break;
      }
    }
    if (!placed) {
      addAiMsg('ai', 'Your schedule is fully packed. Consider moving a low-priority task to create space for a break.');
    }
  }, 800);
}

/* FIX: addBreakAt is a plain function — no eval/inline-onclick needed */
function addBreakAt(startMin, dur) {
  tasks.push({ id: nextId++, name: 'Break', start: startMin, dur, p: 'p-break' });
  renderTimeline();
}

function addFocusBlock() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    tasks.push({ id: nextId++, name: 'Deep Focus Block', start: 9 * 60, dur: 90, p: 'p-focus', suggested: true });
    renderTimeline();
    addAiMsg('ai', '🎯 <strong>Deep focus block added 9:00–10:30 AM</strong>. This is your peak cognitive window. Consider turning off notifications during this time.');
  }, 800);
}

function optimizeSchedule() {
  showTyping();
  setTimeout(() => {
    hideTyping();
    const highP = tasks.filter(t => t.p === 'p-high').sort((a, b) => a.dur - b.dur);
    let cursor = 8 * 60;
    highP.forEach(t => { t.start = cursor; cursor += t.dur + 5; });
    renderTimeline();
    addAiMsg('ai', `⚡ <strong>Schedule optimized!</strong> Moved your ${highP.length} high-priority task${highP.length !== 1 ? 's' : ''} to the morning when energy is highest.`);
    showToast('Schedule optimized ✓');
  }, 1200);
}

function suggestNext() {
  const now    = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = tasks.filter(t => t.start >= curMin).sort((a, b) => a.start - b.start);

  showTyping();
  setTimeout(() => {
    hideTyping();
    if (upcoming.length === 0) {
      addAiMsg('ai', "You've completed all tasks for today! Great work. Consider a review session or planning tomorrow.");
      return;
    }
    const next = upcoming[0];
    const gap  = next.start - curMin;
    const prep = next.p === 'p-focus'  ? 'Get into a distraction-free zone before this deep work session.' :
                 next.p === 'p-high'   ? "This is high priority — make sure you're prepared." :
                                         'Take a moment to prep.';
    addAiMsg('ai', `👉 <strong>Up next: "${next.name}"</strong><br>Starts at ${fmtTime(next.start)} · ${next.dur} minutes<br><br>You have ${gap} minute${gap !== 1 ? 's' : ''} until it starts. ${prep}`);
  }, 700);
}

function highlightSlot(min) {
  const idx  = Math.floor(min / 60) - START_HOUR;
  const rows = document.querySelectorAll('.hour-dropzone');
  if (rows[idx]) {
    rows[idx].classList.add('suggested');
    setTimeout(() => rows[idx].classList.remove('suggested'), 4000);
  }
}

/* ── VOICE INPUT ──────────────────────────────────────── */
function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) { showToast('Voice input not supported in this browser'); return; }

  if (listening) {
    recognition?.stop();
    listening = false;
    btn.classList.remove('listening');
    return;
  }

  recognition = new SR();
  recognition.continuous      = false;
  recognition.interimResults  = false;
  recognition.onresult = (e) => {
    document.getElementById('aiInput').value = e.results[0][0].transcript;
    sendMessage();
  };
  recognition.onend = () => { listening = false; btn.classList.remove('listening'); };
  recognition.start();
  listening = true;
  btn.classList.add('listening');
  showToast('🎤 Listening…', 3000);
}

/* ── EVENT WIRING ─────────────────────────────────────── */
function wireEvents() {
  /* Nav */
  document.getElementById('prevDayBtn').addEventListener('click', () => { dayOffset--; updateDateDisplay(); renderTimeline(); });
  document.getElementById('nextDayBtn').addEventListener('click', () => { dayOffset++; updateDateDisplay(); renderTimeline(); });
  document.getElementById('todayBtn').addEventListener('click',   () => { dayOffset = 0; updateDateDisplay(); renderTimeline(); });

  /* View toggle */
  document.getElementById('dayBtn').addEventListener('click',  () => setView('day'));
  document.getElementById('weekBtn').addEventListener('click', () => setView('week'));

  /* AI quick action buttons */
  document.getElementById('autoPlanBtn').addEventListener('click',  autoPlanDay);
  document.getElementById('optimizeBtn').addEventListener('click',  () => sendQuick('Optimize my schedule'));
  document.getElementById('focusBtn').addEventListener('click',     () => sendQuick('Add focus blocks'));
  document.getElementById('conflictBtn').addEventListener('click',  detectConflicts);

  /* AI input */
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('voiceBtn').addEventListener('click', toggleVoice);
  document.getElementById('aiInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  /* Chips */
  document.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => sendQuick(chip.dataset.msg));
  });

  /* Modal */
  document.getElementById('modalCloseBtn').addEventListener('click', closeModalDirect);
  document.getElementById('cancelBtn').addEventListener('click',     closeModalDirect);
  document.getElementById('saveBtn').addEventListener('click',       saveTask);
  document.getElementById('deleteBtn').addEventListener('click',     deleteTask);

  /* Close modal on overlay click */
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) closeModalDirect();
  });
}

/* ── INIT ─────────────────────────────────────────────── */
function init() {
  wireEvents();
  updateDateDisplay();
  renderTimeline();

  /* Welcome messages */
  setTimeout(() => {
    addAiMsg('ai', "👋 <strong>Good morning! I'm your AI Scheduler.</strong><br>I've analysed your tasks for today. You have <strong>3 high-priority items</strong> and your schedule looks fairly dense.");
  }, 300);

  setTimeout(() => {
    const tip = addAiMsg(
      'ai',
      "💡 <strong>Tip:</strong> Your peak focus window is typically <strong>8–11 AM</strong>. I recommend scheduling deep work then.",
      `<div class="suggestion-card">
        <div class="suggestion-item">
          <span class="si-icon">🎯</span>
          <span>Move "Deep Work" to 8:00 AM</span>
          <button class="si-apply" data-action="moveFocus">Apply</button>
        </div>
        <div class="suggestion-item">
          <span class="si-icon">☕</span>
          <span>Add a break after 2h focus block</span>
          <button class="si-apply" data-action="addBreak">Apply</button>
        </div>
      </div>`
    );

    tip.querySelector('[data-action="moveFocus"]').addEventListener('click', () => {
      const t = tasks.find(x => x.p === 'p-focus');
      if (t) { t.start = 8 * 60; renderTimeline(); showToast('Focus block moved to 8:00 AM'); }
    });
    tip.querySelector('[data-action="addBreak"]').addEventListener('click', () => {
      addBreakAt(10 * 60, 15);
      showToast('Break added at 10:00 AM');
    });
  }, 1200);
}

document.addEventListener('DOMContentLoaded', init);