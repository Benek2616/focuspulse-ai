const timeEl = document.getElementById('time');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionCountEl = document.getElementById('session-count');
const todayMinutesEl = document.getElementById('today-minutes');
const statSessions = document.getElementById('stat-sessions');
const statMinutes = document.getElementById('stat-minutes');
const statGoal = document.getElementById('stat-goal');
const progressFill = document.getElementById('progress-fill');
const dailyGoalEl = document.getElementById('daily-goal');
const insightText = document.getElementById('insight-text');
const modeBtns = document.querySelectorAll('.mode');

const focusInput = document.getElementById('focus-time');
const shortInput = document.getElementById('short-time');
const longInput = document.getElementById('long-time');
const goalInput = document.getElementById('goal-input');
const saveSettingsBtn = document.getElementById('save-settings');

let settings = {
  focus: 25,
  short: 5,
  long: 15,
  goal: 120
};

let mode = 'focus';
let totalSeconds = settings.focus * 60;
let remaining = totalSeconds;
let isRunning = false;
let interval = null;
let sessionsToday = 0;
let minutesToday = 0;
let currentSession = 1;

// Load data
function load() {
  const saved = JSON.parse(localStorage.getItem('focuspulse') || '{}');
  if (saved.settings) settings = { ...settings, ...saved.settings };
  
  const today = new Date().toISOString().slice(0, 10);
  if (saved.date === today) {
    sessionsToday = saved.sessions || 0;
    minutesToday = saved.minutes || 0;
    currentSession = sessionsToday + 1;
  }
  
  applySettingsToUI();
  updateStats();
  updateInsight();
  resetTimer();
}

function save() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem('focuspulse', JSON.stringify({
    settings,
    date: today,
    sessions: sessionsToday,
    minutes: minutesToday
  }));
}

function applySettingsToUI() {
  focusInput.value = settings.focus;
  shortInput.value = settings.short;
  longInput.value = settings.long;
  goalInput.value = settings.goal;
  dailyGoalEl.textContent = settings.goal;
}

function getModeSeconds() {
  if (mode === 'focus') return settings.focus * 60;
  if (mode === 'short') return settings.short * 60;
  return settings.long * 60;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timeEl.textContent = formatTime(remaining);
  document.title = isRunning ? `${formatTime(remaining)} – FocusPulse` : 'FocusPulse AI';
}

function updateStats() {
  sessionCountEl.textContent = currentSession;
  todayMinutesEl.textContent = minutesToday;
  statSessions.textContent = sessionsToday;
  statMinutes.textContent = minutesToday;
  
  const pct = Math.min(100, Math.round((minutesToday / settings.goal) * 100));
  statGoal.textContent = pct + '%';
  progressFill.style.width = pct + '%';
}

function updateInsight() {
  if (minutesToday === 0) {
    insightText.textContent = 'Zacznij pierwszą sesję. Nawet 25 minut skupienia robi różnicę.';
  } else if (minutesToday < 50) {
    insightText.textContent = 'Dobry start. Kolejna sesja utrwali nawyk głębokiej pracy.';
  } else if (minutesToday < settings.goal) {
    const left = settings.goal - minutesToday;
    insightText.textContent = `Zostało Ci ok. ${left} minut do dziennego celu. Dasz radę!`;
  } else if (minutesToday < settings.goal + 30) {
    insightText.textContent = 'Cel dzienny osiągnięty. Świetna robota – możesz zrobić jeszcze jedną sesję lub odpocząć.';
  } else {
    insightText.textContent = `Imponujące ${minutesToday} minut dziś. Pamiętaj też o regeneracji.`;
  }
}

function switchMode(newMode) {
  if (isRunning) return;
  mode = newMode;
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  resetTimer();
}

function resetTimer() {
  clearInterval(interval);
  isRunning = false;
  startBtn.textContent = 'Start';
  remaining = getModeSeconds();
  totalSeconds = remaining;
  updateDisplay();
}

function completeSession() {
  if (mode === 'focus') {
    sessionsToday++;
    minutesToday += settings.focus;
    currentSession = sessionsToday + 1;
    save();
    updateStats();
    updateInsight();
    
    // Auto switch to break
    if (sessionsToday % 4 === 0) {
      switchMode('long');
    } else {
      switchMode('short');
    }
  } else {
    switchMode('focus');
  }
  
  // Notification
  if (Notification.permission === 'granted') {
    new Notification('FocusPulse', {
      body: mode === 'focus' ? 'Czas na skupienie!' : 'Przerwa zakończona. Wracamy do pracy.',
      icon: '◉'
    });
  }
}

function tick() {
  remaining--;
  updateDisplay();
  
  if (remaining <= 0) {
    clearInterval(interval);
    isRunning = false;
    startBtn.textContent = 'Start';
    completeSession();
    // Play a simple beep using Web Audio if possible
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    } catch(e) {}
  }
}

startBtn.addEventListener('click', () => {
  if (isRunning) {
    clearInterval(interval);
    isRunning = false;
    startBtn.textContent = 'Start';
  } else {
    isRunning = true;
    startBtn.textContent = 'Pauza';
    interval = setInterval(tick, 1000);
    
    // Request notification permission once
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
});

resetBtn.addEventListener('click', () => {
  resetTimer();
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

saveSettingsBtn.addEventListener('click', () => {
  settings.focus = parseInt(focusInput.value) || 25;
  settings.short = parseInt(shortInput.value) || 5;
  settings.long = parseInt(longInput.value) || 15;
  settings.goal = parseInt(goalInput.value) || 120;
  save();
  applySettingsToUI();
  if (!isRunning) resetTimer();
  updateStats();
  updateInsight();
  saveSettingsBtn.textContent = 'Zapisano!';
  setTimeout(() => saveSettingsBtn.textContent = 'Zapisz ustawienia', 1500);
});

// Init
load();