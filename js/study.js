import { readJSON, writeJSON } from './storage.js';
import { scrollToPage } from './pager.js';
import {
  todayISO, addDays, weekdayKey, uid, escapeHtml, formatDisplayDate, formatDuration, vibrate,
  WEEKDAY_ORDER, WEEKDAY_LABELS,
} from './util.js';
import { iconHome, iconSettings } from './icons.js';
import { celebrate } from './celebrate.js';
import { showToast } from './toast.js';

const BLOCKS_KEY = 'study.blocks'; // [{ id, name, targetMinutes, days: null|['mon',...] }]
const LOGS_KEY = 'study.logs'; // date -> { blockId -> { studiedMinutes, sessionsCompleted } }
const SETTINGS_KEY = 'study.settings'; // { sessionMinutes }

const DEFAULT_SESSION_MINUTES = 25;
const DISTRIBUTION_DAYS = 7;

let studyContainer = null;
let modalEl = null;
let currentView = 'list'; // 'list' | 'timer'
let activeBlockId = null;

let timerState = 'idle'; // 'idle' | 'running' | 'paused'
let remainingSeconds = 0;
let intervalId = null;

// ---- Data layer ----

function getBlocks() {
  return readJSON(BLOCKS_KEY, []);
}
function saveBlocks(blocks) {
  writeJSON(BLOCKS_KEY, blocks);
}
function getBlock(id) {
  return getBlocks().find((b) => b.id === id) || null;
}
function addBlock(name, targetMinutes, days) {
  const blocks = getBlocks();
  blocks.push({
    id: uid(), name, targetMinutes, days,
  });
  saveBlocks(blocks);
}
function updateBlock(id, updates) {
  const blocks = getBlocks();
  const block = blocks.find((b) => b.id === id);
  if (block) Object.assign(block, updates);
  saveBlocks(blocks);
}
function removeBlock(id) {
  saveBlocks(getBlocks().filter((b) => b.id !== id));
}
function getBlocksForWeekday(dayKey) {
  return getBlocks().filter((b) => !b.days || b.days.includes(dayKey));
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
function getBlockLog(date, blockId) {
  const day = getAllLogs()[date];
  return (day && day[blockId]) || { studiedMinutes: 0, sessionsCompleted: 0 };
}
function addCompletedSession(date, blockId, minutes) {
  const logs = getAllLogs();
  if (!logs[date]) logs[date] = {};
  const entry = logs[date][blockId] || { studiedMinutes: 0, sessionsCompleted: 0 };
  entry.studiedMinutes += minutes;
  entry.sessionsCompleted += 1;
  logs[date][blockId] = entry;
  writeJSON(LOGS_KEY, logs);
}

// Used by the "Tomorrow" preview to show tomorrow's total study goal.
export function getTargetMinutesForDay(dayKey) {
  return getBlocksForWeekday(dayKey).reduce((sum, b) => sum + b.targetMinutes, 0);
}

export function getSummary() {
  const todayKey = weekdayKey();
  const blocks = getBlocksForWeekday(todayKey);
  if (blocks.length === 0) return { text: 'No goal set' };
  const today = todayISO();
  const target = blocks.reduce((sum, b) => sum + b.targetMinutes, 0);
  const studied = blocks.reduce((sum, b) => sum + getBlockLog(today, b.id).studiedMinutes, 0);
  if (target === 0) return { text: `${formatDuration(studied)} today` };
  return {
    text: `${formatDuration(studied)} / ${formatDuration(target)}`,
    fraction: Math.min(1, studied / target),
  };
}

function getDistribution(days = DISTRIBUTION_DAYS) {
  const logs = getAllLogs();
  const blocks = getBlocks();
  const cutoff = addDays(todayISO(), -(days - 1));
  const totals = {};
  for (const date of Object.keys(logs)) {
    if (date < cutoff) continue;
    for (const [blockId, entry] of Object.entries(logs[date])) {
      totals[blockId] = (totals[blockId] || 0) + entry.studiedMinutes;
    }
  }
  const rows = Object.entries(totals)
    .map(([blockId, minutes]) => ({
      blockId,
      minutes,
      name: blocks.find((b) => b.id === blockId)?.name || 'Deleted block',
    }))
    .sort((a, b) => b.minutes - a.minutes);
  const total = rows.reduce((sum, r) => sum + r.minutes, 0);
  return { rows, total };
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
      addCompletedSession(todayISO(), activeBlockId, sessionMinutes);
      timerState = 'idle';
      resetTimerToConfigured();
      render();
      vibrate([15, 40, 15, 40, 25]);
      celebrate();
      showToast(`Session done! +${sessionMinutes} min logged.`);
      return;
    }
    updateTimerDisplay();
  }, 1000);
  render();
}

function pauseTimer() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  timerState = 'paused';
  vibrate(10);
  render();
}

function resetTimer() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  timerState = 'idle';
  vibrate(10);
  resetTimerToConfigured();
  render();
}

function updateTimerDisplay() {
  const clockEl = studyContainer?.querySelector('#timer-clock');
  if (clockEl) clockEl.textContent = formatClock(remainingSeconds);
  const ringEl = studyContainer?.querySelector('.timer-ring');
  if (ringEl) {
    const total = getSettings().sessionMinutes * 60;
    const progress = total > 0 ? 1 - remainingSeconds / total : 0;
    ringEl.style.setProperty('--progress', progress);
  }
}

// ---- Render: today list + distribution ----

function render() {
  if (currentView === 'timer' && activeBlockId && getBlock(activeBlockId)) {
    renderTimerView();
  } else {
    currentView = 'list';
    renderListView();
  }
}

function openBlockTimer(blockId) {
  activeBlockId = blockId;
  currentView = 'timer';
  if (timerState === 'idle' && remainingSeconds === 0) resetTimerToConfigured();
  render();
}

function renderListView() {
  const container = studyContainer;
  const today = todayISO();
  const todayKey = weekdayKey();
  const blocks = getBlocksForWeekday(todayKey);

  const blockRows = blocks.map((block) => {
    const log = getBlockLog(today, block.id);
    const isActive = block.id === activeBlockId && timerState !== 'idle';
    const pct = block.targetMinutes > 0 ? Math.min(100, (log.studiedMinutes / block.targetMinutes) * 100) : 0;
    return `
      <button type="button" class="block-row" data-block="${block.id}">
        <div class="block-row-top">
          <span class="block-row-name">${escapeHtml(block.name)}</span>
          <span class="block-row-value">${isActive ? formatClock(remainingSeconds) : `${formatDuration(log.studiedMinutes)} / ${formatDuration(block.targetMinutes)}`}</span>
        </div>
        <div class="card-progress"><div class="card-progress-fill" style="width:${pct}%"></div></div>
      </button>
    `;
  }).join('');

  const dist = getDistribution();
  const distRows = dist.rows.map((row) => {
    const pct = dist.total > 0 ? Math.round((row.minutes / dist.total) * 100) : 0;
    return `
      <div class="distribution-row">
        <div class="distribution-top">
          <span>${escapeHtml(row.name)}</span>
          <span>${formatDuration(row.minutes)} · ${pct}%</span>
        </div>
        <div class="distribution-bar"><div class="distribution-bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <header class="section-header">
      <button type="button" class="home-btn" aria-label="Home">${iconHome}</button>
      <div>
        <h1>Study</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
      <button type="button" class="settings-link" aria-label="Study settings">${iconSettings}</button>
    </header>

    <div class="block-list">${blockRows}</div>
    ${blocks.length === 0 ? `
      <p class="empty-state">Nothing scheduled today. Open
      <button type="button" class="link-btn" id="open-settings-link">settings</button> to add a block.</p>
    ` : ''}

    <h2 class="sub-heading">Last ${DISTRIBUTION_DAYS} days</h2>
    ${dist.rows.length === 0
      ? '<p class="empty-state">No sessions logged yet this week.</p>'
      : `<div class="distribution-list">${distRows}</div>`}
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));
  container.querySelector('.settings-link').addEventListener('click', openSettingsModal);
  const openLink = container.querySelector('#open-settings-link');
  if (openLink) openLink.addEventListener('click', openSettingsModal);

  container.querySelectorAll('[data-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(8);
      openBlockTimer(btn.dataset.block);
    });
  });
}

function renderTimerView() {
  const container = studyContainer;
  const today = todayISO();
  const block = getBlock(activeBlockId);
  const log = getBlockLog(today, block.id);
  const sessionMinutes = getSettings().sessionMinutes;
  const totalSeconds = sessionMinutes * 60;
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;
  const pct = block.targetMinutes > 0 ? Math.min(100, (log.studiedMinutes / block.targetMinutes) * 100) : 0;

  container.innerHTML = `
    <header class="section-header">
      <button type="button" class="back-btn" aria-label="Back to blocks">←</button>
      <div>
        <h1>${escapeHtml(block.name)}</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
    </header>

    <p class="study-progress">Today: <strong>${formatDuration(log.studiedMinutes)}</strong> of ${formatDuration(block.targetMinutes)}</p>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>

    <div class="session-center timer-center">
      <div class="timer-ring ${timerState}" style="--progress:${progress}">
        <div class="timer-ring-inner">
          <span id="timer-clock" class="timer-clock">${formatClock(remainingSeconds)}</span>
        </div>
      </div>
    </div>
    <p class="timer-session-label">${sessionMinutes} min / session</p>

    <div class="timer-controls">
      <button type="button" id="timer-start-btn" class="log-timer-btn" style="${timerState === 'running' ? 'display:none' : ''}">
        ${timerState === 'paused' ? 'Resume' : 'Start'}
      </button>
      <button type="button" id="timer-pause-btn" class="log-timer-btn secondary" style="${timerState === 'running' ? '' : 'display:none'}">Pause</button>
      <button type="button" id="timer-reset-btn" class="link-btn">Reset</button>
    </div>
  `;

  container.querySelector('.back-btn').addEventListener('click', () => {
    currentView = 'list';
    render();
  });
  container.querySelector('#timer-start-btn').addEventListener('click', startTimer);
  container.querySelector('#timer-pause-btn').addEventListener('click', pauseTimer);
  container.querySelector('#timer-reset-btn').addEventListener('click', resetTimer);
}

export function mount(container) {
  studyContainer = container;
  currentView = 'list';
  render();
}

// ---- Settings modal: session length + block management ----

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
  if (studyContainer) render();
}

let newBlockDays = [];

function renderSettingsModal() {
  const settings = getSettings();
  const blocks = getBlocks();

  const blockCards = blocks.map((block) => {
    const days = block.days || [];
    const dayChips = WEEKDAY_ORDER.map((day) => `
      <button type="button" class="day-chip ${days.includes(day) ? 'selected' : ''}" data-toggle-day="${block.id}:${day}">${WEEKDAY_LABELS[day][0]}</button>
    `).join('');
    return `
      <div class="block-edit-card">
        <div class="block-edit-top">
          <input type="text" class="block-name-input" data-block-name="${block.id}" value="${escapeHtml(block.name)}" maxlength="40" />
          <button type="button" class="remove-btn" data-remove-block="${block.id}" aria-label="Delete ${escapeHtml(block.name)}">×</button>
        </div>
        <div class="hours-input-group">
          <input type="number" min="0" max="16" step="0.5" data-block-target="${block.id}" value="${block.targetMinutes / 60 || ''}" placeholder="0" />
          <span>hrs / day</span>
        </div>
        <div class="day-chip-row">${dayChips}</div>
      </div>
    `;
  }).join('');

  const newDayChips = WEEKDAY_ORDER.map((day) => `
    <button type="button" class="day-chip ${newBlockDays.includes(day) ? 'selected' : ''}" data-new-chip="${day}">${WEEKDAY_LABELS[day][0]}</button>
  `).join('');

  modalEl.innerHTML = `
    <div class="modal-sheet">
      <header class="modal-header">
        <h2>Study settings</h2>
        <button type="button" class="close-btn" aria-label="Close">×</button>
      </header>

      <section class="settings-block">
        <h3>Session length</h3>
        <div class="hours-input-group">
          <input type="number" min="5" max="120" step="5" id="session-minutes-input" value="${settings.sessionMinutes}" />
          <span>min / session</span>
        </div>
      </section>

      <section class="settings-block">
        <h3>Blocks</h3>
        <p class="modal-hint">Each block has its own daily goal and can repeat on specific days (none selected = every day).</p>
        <div id="blocks-list">${blockCards}</div>
        <form id="add-block-form" class="block-edit-card">
          <input type="text" id="new-block-name" class="block-name-input" placeholder="Subject name" required maxlength="40" />
          <div class="hours-input-group">
            <input type="number" id="new-block-target" min="0.5" max="16" step="0.5" value="1" />
            <span>hrs / day</span>
          </div>
          <div class="day-chip-row">${newDayChips}</div>
          <button type="submit">Add block</button>
        </form>
      </section>
    </div>
  `;

  modalEl.querySelector('.close-btn').addEventListener('click', closeSettingsModal);

  modalEl.querySelector('#session-minutes-input').addEventListener('change', (e) => {
    const minutes = Math.max(1, Number(e.target.value) || DEFAULT_SESSION_MINUTES);
    saveSettings({ sessionMinutes: minutes });
    if (timerState === 'idle') resetTimerToConfigured();
  });

  modalEl.querySelectorAll('[data-block-name]').forEach((input) => {
    input.addEventListener('change', () => {
      updateBlock(input.dataset.blockName, { name: input.value.trim() || 'Untitled' });
      renderSettingsModal();
    });
  });
  modalEl.querySelectorAll('[data-block-target]').forEach((input) => {
    input.addEventListener('change', () => {
      const hours = Number(input.value) || 0;
      updateBlock(input.dataset.blockTarget, { targetMinutes: Math.round(hours * 60) });
      renderSettingsModal();
    });
  });
  modalEl.querySelectorAll('[data-toggle-day]').forEach((chip) => {
    chip.addEventListener('click', () => {
      vibrate(8);
      const [blockId, day] = chip.dataset.toggleDay.split(':');
      const block = getBlock(blockId);
      const days = block.days ? [...block.days] : [];
      const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
      updateBlock(blockId, { days: next.length > 0 ? next : null });
      renderSettingsModal();
    });
  });
  modalEl.querySelectorAll('[data-remove-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(15);
      removeBlock(btn.dataset.removeBlock);
      renderSettingsModal();
    });
  });

  modalEl.querySelectorAll('[data-new-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      vibrate(8);
      const day = chip.dataset.newChip;
      newBlockDays = newBlockDays.includes(day) ? newBlockDays.filter((d) => d !== day) : [...newBlockDays, day];
      renderSettingsModal();
    });
  });

  modalEl.querySelector('#add-block-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modalEl.querySelector('#new-block-name').value.trim();
    const hours = Number(modalEl.querySelector('#new-block-target').value) || 0;
    if (!name) return;
    addBlock(name, Math.round(hours * 60), newBlockDays.length > 0 ? [...newBlockDays] : null);
    newBlockDays = [];
    vibrate(10);
    renderSettingsModal();
  });
}
