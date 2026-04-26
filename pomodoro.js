/* =============================================
   FocusFlow Pomodoro — pomodoro.js
   Features: Timer, modes, sessions, dark mode,
             task editing, ring animation, pulse
   ============================================= */

// ── CONSTANTS ──────────────────────────────────

const MODES = {
  focus: { duration: 25 * 60, label: 'Focus' },
  short: { duration:  5 * 60, label: 'Short Break' },
  long:  { duration: 15 * 60, label: 'Long Break' },
};

const CIRCUMFERENCE = 2 * Math.PI * 108; // r=108 matches SVG circle

const MOTIVES = {
  focus: [
    'Ready to enter deep focus?',
    'Block out the noise. Build something great.',
    "One task at a time. You've got this.",
    'Deep work starts now.',
  ],
  short: [
    'Breathe. You earned it.',
    'Rest a moment, then back at it.',
    'Recharge. 5 minutes, go.',
  ],
  long: [
    'Take a proper break. Walk, stretch, hydrate.',
    'Great work — enjoy your long break!',
  ],
  running: [
    "Stay locked in. You're doing great.",
    'Deep work in progress...',
    'Focus mode active. Keep going.',
    "In the zone. Don't stop now.",
  ],
};


// ── STATE ──────────────────────────────────────

let mode          = 'focus';
let totalDuration = MODES.focus.duration;
let timeLeft      = totalDuration;
let isRunning     = false;
let interval      = null;
let sessionsTotal = 4;
let sessionsDone  = 0;
let isDark        = false;


// ── DOM REFS ───────────────────────────────────

const ringProgress = document.getElementById('ringProgress');
const timerDisplay = document.getElementById('timerDisplay');
const timerLabel   = document.getElementById('timerLabel');
const motiveText   = document.getElementById('motiveText');
const playIcon     = document.getElementById('playIcon');
const pauseIcon    = document.getElementById('pauseIcon');
const sessionLabel = document.getElementById('sessionLabel');
const sessionDots  = document.getElementById('sessionDots');


// ── UTILITIES ──────────────────────────────────

function formatTime(seconds) {
  const m   = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function pickMotive(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}


// ── RING + DISPLAY ─────────────────────────────

function updateRing() {
  const progress = timeLeft / totalDuration;
  const offset   = CIRCUMFERENCE * (1 - progress);
  ringProgress.setAttribute('stroke-dasharray',  CIRCUMFERENCE.toFixed(1));
  ringProgress.setAttribute('stroke-dashoffset', offset.toFixed(1));
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(timeLeft);
  document.title           = formatTime(timeLeft) + ' — FocusFlow';
  updateRing();
}


// ── SESSION DOTS ───────────────────────────────

function renderDots() {
  sessionDots.innerHTML = '';

  for (let i = 0; i < sessionsTotal; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';

    if (i < sessionsDone) {
      dot.classList.add('done');
    } else if (i === sessionsDone && isRunning && mode === 'focus') {
      dot.classList.add('active');
    }

    sessionDots.appendChild(dot);
  }

  const current = Math.min(sessionsDone + 1, sessionsTotal);
  sessionLabel.textContent = `Session ${current} of ${sessionsTotal}`;
}


// ── MODE SWITCHING ─────────────────────────────

function switchMode(el) {
  if (isRunning) pauseTimer();

  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  mode          = el.dataset.mode;
  totalDuration = MODES[mode].duration;
  timeLeft      = totalDuration;

  timerLabel.textContent = MODES[mode].label;
  motiveText.textContent = pickMotive(MOTIVES[mode]);

  document.body.classList.remove('running');
  playIcon.style.display  = '';
  pauseIcon.style.display = 'none';

  updateDisplay();
  renderDots();
}


// ── TIMER CONTROLS ─────────────────────────────

function toggleTimer() {
  isRunning ? pauseTimer() : startTimer();
}

function startTimer() {
  isRunning = true;
  document.body.classList.add('running');
  playIcon.style.display  = 'none';
  pauseIcon.style.display = '';
  motiveText.textContent  = pickMotive(MOTIVES.running);
  renderDots();

  interval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    if (timeLeft <= 0) {
      clearInterval(interval);
      onSessionEnd();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(interval);
  document.body.classList.remove('running');
  playIcon.style.display  = '';
  pauseIcon.style.display = 'none';
  motiveText.textContent  = 'Paused. Pick up where you left off.';
  renderDots();
}

function resetTimer() {
  pauseTimer();
  timeLeft = totalDuration;
  motiveText.textContent = pickMotive(MOTIVES[mode]);
  updateDisplay();
  renderDots();
}

function skipSession() {
  pauseTimer();
  onSessionEnd();
}


// ── SESSION END LOGIC ──────────────────────────

function onSessionEnd() {
  isRunning = false;
  document.body.classList.remove('running');
  playIcon.style.display  = '';
  pauseIcon.style.display = 'none';

  if (mode === 'focus') {
    sessionsDone = Math.min(sessionsDone + 1, sessionsTotal);
  }

  if (sessionsDone >= sessionsTotal) {
    motiveText.textContent = 'All sessions done! Fantastic work today.';
    sessionsDone  = 0;
    mode          = 'focus';
    totalDuration = MODES.focus.duration;
    timeLeft      = totalDuration;
    timerLabel.textContent = 'Focus';
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === 'focus');
    });

  } else if (mode === 'focus') {
    motiveText.textContent = 'Nice work! Take a short break.';
  } else {
    motiveText.textContent = 'Break over. Time to focus again!';
    mode          = 'focus';
    totalDuration = MODES.focus.duration;
    timeLeft      = totalDuration;
    timerLabel.textContent = 'Focus';
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === 'focus');
    });
  }

  updateDisplay();
  renderDots();
}


// ── TASK EDIT MODAL ────────────────────────────

function openModal() {
  document.getElementById('taskInput').value = document.getElementById('currentTaskName').textContent;
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('taskInput').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function saveTask() {
  const val = document.getElementById('taskInput').value.trim();
  if (val) document.getElementById('currentTaskName').textContent = val;
  closeModal();
}

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter')  saveTask();
  if (e.key === 'Escape') closeModal();
});


// ── DARK MODE ──────────────────────────────────

document.getElementById('themeBtn').addEventListener('click', () => {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
  document.getElementById('themeBtn').textContent = isDark ? '☀' : '☽';
});


// ── INIT ───────────────────────────────────────

ringProgress.setAttribute('stroke-dasharray',  CIRCUMFERENCE.toFixed(1));
ringProgress.setAttribute('stroke-dashoffset', '0');
updateDisplay();
renderDots();

// ✅ FIX: Wire up the actual play/pause button in the UI
document.getElementById('mainBtn').addEventListener('click', toggleTimer);

// ✅ FIX: Wire up reset and skip buttons
document.getElementById('resetBtn').addEventListener('click', resetTimer);
document.getElementById('skipBtn').addEventListener('click', skipSession);

// ✅ FIX: Wire up mode tabs
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => switchMode(tab));
});

// ✅ FIX: Wire up task edit button
document.getElementById('taskEditBtn').addEventListener('click', openModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
document.getElementById('modalSaveBtn').addEventListener('click', saveTask);
