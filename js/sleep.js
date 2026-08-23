import { readJSON, writeJSON } from './storage.js';
import { scrollToPage } from './pager.js';
import { iconHome, iconSettings } from './icons.js';
import {
  todayISO, formatDisplayDate, minutesSinceMidnight, formatDuration, nowMinutes, vibrate,
} from './util.js';
import { celebrate } from './celebrate.js';

const LOGS_KEY = 'sleep.logs';
const TARGET_KEY = 'sleep.target'; // { bedtime, wake } — the planned/chosen schedule

const DEFAULT_TARGET = { bedtime: '23:00', wake: '07:00' };
const EVENING_WINDOW_MINUTES = 120;

let sleepContainer = null;
let modalEl = null;

function getAllLogs() {
  return readJSON(LOGS_KEY, {});
}
function getLog(date) {
  return getAllLogs()[date] || null;
}
function saveLog(date, entry) {
  const logs = getAllLogs();
  logs[date] = entry;
  writeJSON(LOGS_KEY, logs);
}

export function getTarget() {
  return { ...DEFAULT_TARGET, ...readJSON(TARGET_KEY, {}) };
}
function saveTarget(target) {
  writeJSON(TARGET_KEY, target);
}

function computeDurationMinutes(bedtime, wake) {
  const bedMin = minutesSinceMidnight(bedtime);
  const wakeMin = minutesSinceMidnight(wake);
  if (wakeMin > bedMin) return wakeMin - bedMin;
  return (24 * 60 - bedMin) + wakeMin;
}

export function getSummary() {
  const log = getLog(todayISO());
  if (!log) return { text: 'Ej loggat' };
  const minutes = computeDurationMinutes(log.bedtime, log.wake);
  return { text: formatDuration(minutes) };
}

// True during the window starting EVENING_WINDOW_MINUTES before the
// target bedtime and ending at the target bedtime — used to surface the
// "Imorgon" preview automatically when the app is opened in the evening.
export function isEveningWindow() {
  const { bedtime } = getTarget();
  const bedMin = minutesSinceMidnight(bedtime);
  const windowStart = bedMin - EVENING_WINDOW_MINUTES;
  const now = nowMinutes();
  if (windowStart >= 0) return now >= windowStart && now < bedMin;
  // Bedtime is close enough to midnight that the window wraps past 00:00.
  return now >= windowStart + 24 * 60 || now < bedMin;
}

function lastNEntries(n) {
  const logs = getAllLogs();
  return Object.keys(logs)
    .sort()
    .reverse()
    .slice(0, n)
    .map((date) => ({ date, ...logs[date] }));
}

export function mount(container) {
  sleepContainer = container;
  render();
}

function render() {
  const container = sleepContainer;
  const today = todayISO();
  const existing = getLog(today);
  const target = getTarget();

  container.innerHTML = `
    <header class="section-header">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>Sovtider</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
      <button type="button" class="settings-link" aria-label="Sov-inställningar">${iconSettings}</button>
    </header>

    <form id="sleep-form" class="sleep-form">
      <label>
        Läggtid
        <input type="time" id="bedtime-input" value="${existing?.bedtime || target.bedtime}" required />
      </label>
      <label>
        Vaknade
        <input type="time" id="wake-input" value="${existing?.wake || target.wake}" required />
      </label>
      <button type="submit">Spara</button>
    </form>
    <div id="sleep-result"></div>

    <h2 class="sub-heading">Senaste dagarna</h2>
    <ul class="sleep-history" id="sleep-history"></ul>
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));
  container.querySelector('.settings-link').addEventListener('click', openSettingsModal);

  const resultEl = container.querySelector('#sleep-result');
  if (existing) {
    const minutes = computeDurationMinutes(existing.bedtime, existing.wake);
    resultEl.innerHTML = `<p class="sleep-duration">Sovtid: <strong>${formatDuration(minutes)}</strong></p>`;
  }

  container.querySelector('#sleep-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const bedtime = container.querySelector('#bedtime-input').value;
    const wake = container.querySelector('#wake-input').value;
    if (!bedtime || !wake) return;
    const isNew = !existing;
    saveLog(today, { bedtime, wake });
    vibrate(12);
    render();
    if (isNew) celebrate();
  });

  const historyEl = container.querySelector('#sleep-history');
  const entries = lastNEntries(7).filter((e) => e.date !== today);
  if (entries.length === 0) {
    historyEl.innerHTML = '<li class="empty-state">Ingen historik än.</li>';
  } else {
    historyEl.innerHTML = entries.map((entry) => {
      const minutes = computeDurationMinutes(entry.bedtime, entry.wake);
      return `<li><span>${formatDisplayDate(entry.date)}</span><span>${formatDuration(minutes)}</span></li>`;
    }).join('');
  }
}

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
  if (sleepContainer) render();
}

function renderSettingsModal() {
  const target = getTarget();
  modalEl.innerHTML = `
    <div class="modal-sheet">
      <header class="modal-header">
        <h2>Sov-inställningar</h2>
        <button type="button" class="close-btn" aria-label="Stäng">×</button>
      </header>
      <p class="modal-hint">Din planerade läggtid styr när "Imorgon"-vyn dyker upp automatiskt (2 timmar innan).</p>
      <div class="sleep-form">
        <label>
          Läggtid (mål)
          <input type="time" id="target-bedtime-input" value="${target.bedtime}" />
        </label>
        <label>
          Uppstigning (mål)
          <input type="time" id="target-wake-input" value="${target.wake}" />
        </label>
      </div>
    </div>
  `;
  modalEl.querySelector('.close-btn').addEventListener('click', closeSettingsModal);
  modalEl.querySelector('#target-bedtime-input').addEventListener('change', (e) => {
    saveTarget({ ...getTarget(), bedtime: e.target.value });
  });
  modalEl.querySelector('#target-wake-input').addEventListener('change', (e) => {
    saveTarget({ ...getTarget(), wake: e.target.value });
  });
}
