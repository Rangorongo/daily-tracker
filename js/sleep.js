import { readJSON, writeJSON } from './storage.js';
import { scrollToPage } from './pager.js';
import { iconHome } from './icons.js';
import {
  todayISO, formatDisplayDate, minutesSinceMidnight, formatDuration,
} from './util.js';

const LOGS_KEY = 'sleep.logs';

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

function lastNEntries(n) {
  const logs = getAllLogs();
  return Object.keys(logs)
    .sort()
    .reverse()
    .slice(0, n)
    .map((date) => ({ date, ...logs[date] }));
}

export function mount(container) {
  const today = todayISO();
  const existing = getLog(today);

  container.innerHTML = `
    <header class="section-header" style="--accent: var(--color-sleep)">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>Sovtider</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
    </header>

    <form id="sleep-form" class="sleep-form">
      <label>
        Läggtid
        <input type="time" id="bedtime-input" value="${existing?.bedtime || '23:00'}" required />
      </label>
      <label>
        Vaknade
        <input type="time" id="wake-input" value="${existing?.wake || '07:00'}" required />
      </label>
      <button type="submit">Spara</button>
    </form>
    <div id="sleep-result"></div>

    <h2 class="sub-heading">Senaste dagarna</h2>
    <ul class="sleep-history" id="sleep-history"></ul>
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));

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
    saveLog(today, { bedtime, wake });
    mount(container);
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
