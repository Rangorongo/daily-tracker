import { readJSON, writeJSON } from './storage.js';
import { scrollToPage } from './pager.js';
import {
  todayISO, weekdayKey, formatDisplayDate, formatDuration, vibrate,
  WEEKDAY_ORDER, WEEKDAY_LABELS_SV,
} from './util.js';
import { iconHome, iconSettings } from './icons.js';
import { celebrate } from './celebrate.js';
import { showToast } from './toast.js';

const SCHEDULE_KEY = 'plugg.schedule'; // weekday -> target minutes
const SETTINGS_KEY = 'plugg.settings'; // { sessionMinutes }
const LOGS_KEY = 'plugg.logs'; // date -> { studiedMinutes, sessionsCompleted }

const DEFAULT_SESSION_MINUTES = 25;

let pluggContainer = null;
let modalEl = null;

let timerState = 'idle'; // 'idle' | 'running' | 'paused'
let remainingSeconds = 0;
let intervalId = null;

// ---- Data layer ----

function getSchedule() {
  return readJSON(SCHEDULE_KEY, {});
}
function saveSchedule(schedule) {
  writeJSON(SCHEDULE_KEY, schedule);
}
function getSettings() {
  return { sessionMinutes: DEFAULT_SESSION_MINUTES, ...readJSON(SETTINGS_KEY, {}) };
}
function saveSettings(settings) {
  writeJSON(SETTINGS_KEY, settings);
}
function getAllLogs() {
  return readJSON(LOGS_KEY, {});
}
function getLog(date) {
  return getAllLogs()[date] || { studiedMinutes: 0, sessionsCompleted: 0 };
}
function addCompletedSession(date, minutes) {
  const logs = getAllLogs();
  const entry = logs[date] || { studiedMinutes: 0, sessionsCompleted: 0 };
  entry.studiedMinutes += minutes;
  entry.sessionsCompleted += 1;
  logs[date] = entry;
  writeJSON(LOGS_KEY, logs);
}

function getTodayTargetMinutes() {
  return getSchedule()[weekdayKey()] || 0;
}

// Used by the "Imorgon" preview to show tomorrow's target study time.
export function getTargetMinutesForDay(dayKey) {
  return getSchedule()[dayKey] || 0;
}

export function getSummary() {
  const target = getTodayTargetMinutes();
  const studied = getLog(todayISO()).studiedMinutes;
  if (target === 0 && studied === 0) return { text: 'Inget schemalagt' };
  if (target === 0) return { text: `${formatDuration(studied)} idag` };
  return {
    text: `${formatDuration(studied)} / ${formatDuration(target)}`,
    fraction: Math.min(1, studied / target),
  };
}

// ---- Timer ----

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resetTimerToConfigured() {
  remainingSeconds = getSettings().sessionMinutes * 60;
}

function startTimer() {
  if (timerState === 'running') return;
  vibrate(12);
  timerState = 'running';
  intervalId = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      const sessionMinutes = getSettings().sessionMinutes;
      addCompletedSession(todayISO(), sessionMinutes);
      timerState = 'idle';
      resetTimerToConfigured();
      renderPluggPage();
      vibrate([15, 40, 15, 40, 25]);
      celebrate();
      showToast(`Pass klart! +${sessionMinutes} min plugg idag.`);
      return;
    }
    updateTimerDisplay();
  }, 1000);
  renderPluggPage();
}

function pauseTimer() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  timerState = 'paused';
  vibrate(10);
  renderPluggPage();
}

function resetTimer() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  timerState = 'idle';
  vibrate(10);
  resetTimerToConfigured();
  renderPluggPage();
}

function updateTimerDisplay() {
  const clockEl = pluggContainer?.querySelector('#timer-clock');
  if (clockEl) clockEl.textContent = formatClock(remainingSeconds);
  const ringEl = pluggContainer?.querySelector('.timer-ring');
  if (ringEl) {
    const total = getSettings().sessionMinutes * 60;
    const progress = total > 0 ? 1 - remainingSeconds / total : 0;
    ringEl.style.setProperty('--progress', progress);
  }
}

// ---- Render ----

function renderPluggPage() {
  const container = pluggContainer;
  const today = todayISO();
  const target = getTodayTargetMinutes();
  const log = getLog(today);
  const sessionMinutes = getSettings().sessionMinutes;
  const totalSeconds = sessionMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  container.innerHTML = `
    <header class="section-header" style="--accent: var(--color-plugg)">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>Plugg</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
      <button type="button" class="settings-link" aria-label="Plugg-inställningar">${iconSettings}</button>
    </header>

    <p class="study-progress">
      ${target > 0
        ? `Idag: <strong>${formatDuration(log.studiedMinutes)}</strong> av ${formatDuration(target)}`
        : `Idag: <strong>${formatDuration(log.studiedMinutes)}</strong> (inget mål satt för idag)`}
    </p>
    ${target > 0 ? `<div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.min(100, (log.studiedMinutes / target) * 100)}%"></div></div>` : ''}

    <div class="session-center timer-center">
      <div class="timer-ring ${timerState}" style="--progress:${progress}">
        <div class="timer-ring-inner">
          <span id="timer-clock" class="timer-clock">${formatClock(remainingSeconds)}</span>
        </div>
      </div>
    </div>
    <p class="timer-session-label">${sessionMinutes} min per pass</p>

    <div class="timer-controls">
      <button type="button" id="timer-start-btn" class="log-timer-btn" style="${timerState === 'running' ? 'display:none' : ''}">
        ${timerState === 'paused' ? 'Fortsätt' : 'Starta'}
      </button>
      <button type="button" id="timer-pause-btn" class="log-timer-btn secondary" style="${timerState === 'running' ? '' : 'display:none'}">Paus</button>
      <button type="button" id="timer-reset-btn" class="link-btn">Återställ</button>
    </div>
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));
  container.querySelector('.settings-link').addEventListener('click', openSettingsModal);
  container.querySelector('#timer-start-btn').addEventListener('click', startTimer);
  container.querySelector('#timer-pause-btn').addEventListener('click', pauseTimer);
  container.querySelector('#timer-reset-btn').addEventListener('click', resetTimer);
}

export function mount(container) {
  pluggContainer = container;
  if (timerState === 'idle' && remainingSeconds === 0) resetTimerToConfigured();
  renderPluggPage();
}

// ---- Settings modal ----

function openSettingsModal() {
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeSettingsModal();
    });
  }
  modalEl.classList.add('open');
  renderSettingsModal();
}

function closeSettingsModal() {
  if (modalEl) modalEl.classList.remove('open');
  if (pluggContainer) renderPluggPage();
}

function renderSettingsModal() {
  const schedule = getSchedule();
  const settings = getSettings();

  const scheduleRows = WEEKDAY_ORDER.map((day) => {
    const hours = (schedule[day] || 0) / 60;
    return `
      <div class="schedule-row">
        <label>${WEEKDAY_LABELS_SV[day]}</label>
        <div class="hours-input-group">
          <input type="number" min="0" max="16" step="0.5" data-day="${day}" value="${hours || ''}" placeholder="0" />
          <span>tim</span>
        </div>
      </div>
    `;
  }).join('');

  modalEl.innerHTML = `
    <div class="modal-sheet">
      <header class="modal-header">
        <h2>Plugg-inställningar</h2>
        <button type="button" class="close-btn" aria-label="Stäng">×</button>
      </header>

      <section class="settings-block">
        <h3>Pomodoro-längd</h3>
        <div class="hours-input-group">
          <input type="number" min="5" max="120" step="5" id="session-minutes-input" value="${settings.sessionMinutes}" />
          <span>min per pass</span>
        </div>
      </section>

      <section class="settings-block">
        <h3>Veckoschema (mål per dag)</h3>
        <div class="schedule-grid">${scheduleRows}</div>
      </section>
    </div>
  `;

  modalEl.querySelector('.close-btn').addEventListener('click', closeSettingsModal);

  modalEl.querySelector('#session-minutes-input').addEventListener('change', (e) => {
    const minutes = Math.max(1, Number(e.target.value) || DEFAULT_SESSION_MINUTES);
    saveSettings({ sessionMinutes: minutes });
    if (timerState === 'idle') resetTimerToConfigured();
  });

  modalEl.querySelectorAll('[data-day]').forEach((input) => {
    input.addEventListener('change', () => {
      const hours = Number(input.value) || 0;
      const updated = getSchedule();
      updated[input.dataset.day] = Math.round(hours * 60);
      saveSchedule(updated);
    });
  });
}
