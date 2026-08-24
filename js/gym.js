import { readJSON, writeJSON } from './storage.js';
import { scrollToPage } from './pager.js';
import {
  todayISO, weekdayKey, uid, escapeHtml, formatDisplayDate, vibrate,
  WEEKDAY_ORDER, WEEKDAY_LABELS,
} from './util.js';
import { iconHome, iconSettings } from './icons.js';
import { celebrate } from './celebrate.js';

const DAYS_KEY = 'gym.days';
const LOGS_KEY = 'gym.logs';

let gymContainer = null;
let currentExerciseIndex = 0;
let modalEl = null;
let modalView = 'list'; // 'list' | a WEEKDAY_ORDER key
let wasPassDoneToday = false;

// ---- Data layer ----

function getDays() {
  const stored = readJSON(DAYS_KEY, {});
  const days = {};
  for (const key of WEEKDAY_ORDER) {
    days[key] = stored[key] || { label: '', exercises: [] };
  }
  return days;
}
function saveDays(days) {
  writeJSON(DAYS_KEY, days);
}
function getDay(dayKey) {
  return getDays()[dayKey];
}

// Used by the "Tomorrow" preview to show tomorrow's planned exercises.
export function getDayInfo(dayKey) {
  return getDay(dayKey);
}

function getAllLogs() {
  return readJSON(LOGS_KEY, {});
}
function getLogForDate(date) {
  return getAllLogs()[date] || null;
}
function saveLogForDate(date, log) {
  const logs = getAllLogs();
  logs[date] = log;
  writeJSON(LOGS_KEY, logs);
}
function ensureLogForDate(date) {
  let log = getLogForDate(date);
  if (!log) {
    log = { exerciseSets: {} };
    saveLogForDate(date, log);
  }
  return log;
}
function logSet(date, exerciseId, weight, reps) {
  const log = ensureLogForDate(date);
  if (!log.exerciseSets[exerciseId]) log.exerciseSets[exerciseId] = [];
  log.exerciseSets[exerciseId].push({ weight, reps });
  saveLogForDate(date, log);
}

function undoLastSet(date, exerciseId) {
  const log = ensureLogForDate(date);
  if (!log.exerciseSets[exerciseId] || log.exerciseSets[exerciseId].length === 0) return;
  log.exerciseSets[exerciseId].pop();
  saveLogForDate(date, log);
}

function setDayLabel(dayKey, label) {
  const days = getDays();
  days[dayKey].label = label;
  saveDays(days);
}

function addExercise(dayKey, name, targetSets) {
  const days = getDays();
  days[dayKey].exercises.push({ id: uid(), name, targetSets });
  saveDays(days);
}

function removeExercise(dayKey, exerciseId) {
  const days = getDays();
  days[dayKey].exercises = days[dayKey].exercises.filter((e) => e.id !== exerciseId);
  saveDays(days);
}

function moveExercise(dayKey, exerciseId, direction) {
  const days = getDays();
  const exercises = days[dayKey].exercises;
  const idx = exercises.findIndex((e) => e.id === exerciseId);
  const newIdx = idx + direction;
  if (idx < 0 || newIdx < 0 || newIdx >= exercises.length) return;
  [exercises[idx], exercises[newIdx]] = [exercises[newIdx], exercises[idx]];
  saveDays(days);
}

function getTodayDay() {
  return getDay(weekdayKey());
}

// Most recent weight logged for an exercise, newest session first, excluding today.
function getExerciseHistory(exerciseId, limit = 4) {
  const logs = getAllLogs();
  const today = todayISO();
  const history = [];
  for (const date of Object.keys(logs).sort().reverse()) {
    if (date === today) continue;
    const sets = logs[date]?.exerciseSets?.[exerciseId];
    if (sets && sets.length > 0) {
      const last = sets[sets.length - 1];
      history.push({ date, weight: last.weight, reps: last.reps });
      if (history.length >= limit) break;
    }
  }
  return history;
}

export function getSummary() {
  const day = getTodayDay();
  if (day.exercises.length === 0) return { text: 'Rest day' };
  const log = getLogForDate(todayISO());
  const completed = log
    ? Object.values(log.exerciseSets).reduce((sum, sets) => sum + sets.length, 0)
    : 0;
  const target = day.exercises.reduce((sum, ex) => sum + ex.targetSets, 0);
  const label = day.label ? `${day.label} · ` : '';
  return {
    text: `${label}${completed}/${target} sets`, fraction: target > 0 ? completed / target : 0,
  };
}

// ---- Session view (today) ----

function renderSession() {
  const container = gymContainer;
  const today = todayISO();
  const day = getTodayDay();

  container.innerHTML = `
    <header class="section-header">
      <button type="button" class="home-btn" aria-label="Home">${iconHome}</button>
      <div>
        <h1>Gym</h1>
        <p class="section-date">${formatDisplayDate(today)}${day.label ? ` · ${escapeHtml(day.label)}` : ''}</p>
      </div>
      <button type="button" class="settings-link" aria-label="Gym settings">${iconSettings}</button>
    </header>
    <div id="gym-body"></div>
  `;
  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));
  container.querySelector('.settings-link').addEventListener('click', () => openSettingsModal());

  const body = container.querySelector('#gym-body');

  if (day.exercises.length === 0) {
    body.innerHTML = `
      <p class="empty-state">Nothing set for today. Rest day — or open
      <button type="button" class="link-btn" id="open-settings-link">settings</button> to add a plan.</p>
    `;
    body.querySelector('#open-settings-link').addEventListener('click', () => openSettingsModal());
    return;
  }

  const log = ensureLogForDate(today);
  if (currentExerciseIndex >= day.exercises.length) currentExerciseIndex = day.exercises.length - 1;
  if (currentExerciseIndex < 0) currentExerciseIndex = 0;

  const exercise = day.exercises[currentExerciseIndex];
  const completedSets = log.exerciseSets[exercise.id] || [];
  const target = exercise.targetSets;
  const allDone = day.exercises.every((ex) => (log.exerciseSets[ex.id] || []).length >= ex.targetSets);

  const exerciseDots = day.exercises.map((ex, i) => {
    const done = (log.exerciseSets[ex.id] || []).length >= ex.targetSets;
    const cls = i === currentExerciseIndex ? 'current' : done ? 'done' : '';
    return `<button type="button" class="ex-dot ${cls}" data-goto-ex="${i}" aria-label="${escapeHtml(ex.name)}"></button>`;
  }).join('');

  const setDots = Array.from({ length: target }, (_, i) => `<span class="set-dot ${i < completedSets.length ? 'done' : ''}"></span>`).join('');

  const history = getExerciseHistory(exercise.id, 4);
  const lastWeight = history[0]?.weight;
  const lastReps = history[0]?.reps;
  const lastSetLogged = completedSets[completedSets.length - 1];
  const defaultWeight = lastSetLogged ? lastSetLogged.weight : (lastWeight ?? '');
  const defaultReps = lastSetLogged ? lastSetLogged.reps : (lastReps ?? '');

  let comparisonHtml = '';
  if (lastSetLogged && lastWeight != null) {
    const diff = lastSetLogged.weight - lastWeight;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    comparisonHtml = `<p class="weight-compare ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${arrow} ${diff > 0 ? '+' : ''}${diff}kg vs last time (${lastWeight}kg${lastReps != null ? `×${lastReps}` : ''})</p>`;
  } else if (lastWeight != null) {
    comparisonHtml = `<p class="weight-compare">Last time: ${lastWeight}kg${lastReps != null ? `×${lastReps}` : ''}</p>`;
  }

  const trendHtml = history.length
    ? `<p class="weight-trend">History: ${history.slice().reverse().map((h) => `${h.weight}kg${h.reps != null ? `×${h.reps}` : ''}`).join(' → ')}</p>`
    : '';

  const isLastSet = completedSets.length >= target;

  body.innerHTML = `
    <div class="exercise-dots">${exerciseDots}</div>
    <p class="exercise-progress">Exercise ${currentExerciseIndex + 1} of ${day.exercises.length}</p>
    <h2 class="exercise-name-big">${escapeHtml(exercise.name)}</h2>
    <div class="set-dots-row">${setDots}</div>
    <p class="set-progress">Set ${Math.min(completedSets.length + 1, target)} of ${target}</p>

    <div class="weight-input-row">
      <label for="weight-input">Weight</label>
      <input type="number" id="weight-input" inputmode="decimal" step="0.5" min="0" value="${defaultWeight}" />
      <span>kg</span>
      <label for="reps-input">Reps</label>
      <input type="number" id="reps-input" inputmode="numeric" step="1" min="0" value="${defaultReps}" />
    </div>
    ${comparisonHtml}
    ${trendHtml}

    <div class="session-center">
      <button type="button" id="log-set-btn" class="log-set-btn" ${isLastSet ? 'disabled' : ''}>
        ${isLastSet ? 'Done ✓' : 'Log set'}
      </button>
    </div>
    ${completedSets.length > 0 ? '<div class="undo-set-row"><button type="button" id="undo-set-btn" class="link-btn">Undo last set</button></div>' : ''}

    <div class="session-nav">
      <button type="button" id="prev-ex-btn" ${currentExerciseIndex === 0 ? 'disabled' : ''}>◀ Prev</button>
      <button type="button" id="next-ex-btn" ${currentExerciseIndex === day.exercises.length - 1 ? 'disabled' : ''}>Next ▶</button>
    </div>
    ${allDone ? '<p class="pass-complete">🎉 Workout done!</p>' : ''}
  `;

  const logBtn = body.querySelector('#log-set-btn');
  if (!isLastSet) {
    logBtn.addEventListener('click', () => {
      vibrate(15);
      const weightVal = Number(body.querySelector('#weight-input').value) || 0;
      const repsVal = body.querySelector('#reps-input').value === '' ? null : Number(body.querySelector('#reps-input').value);
      logSet(today, exercise.id, weightVal, repsVal);
      const updated = getLogForDate(today).exerciseSets[exercise.id] || [];
      if (updated.length >= target && currentExerciseIndex < day.exercises.length - 1) {
        currentExerciseIndex += 1;
      }
      const nowAllDone = day.exercises.every((ex) => (getLogForDate(today).exerciseSets[ex.id] || []).length >= ex.targetSets);
      renderSession();
      if (nowAllDone && !wasPassDoneToday) {
        vibrate([15, 40, 15, 40, 25]);
        celebrate();
      }
      wasPassDoneToday = nowAllDone;
    });
  }

  const undoBtn = body.querySelector('#undo-set-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      vibrate(10);
      undoLastSet(today, exercise.id);
      wasPassDoneToday = false;
      renderSession();
    });
  }

  body.querySelectorAll('[data-goto-ex]').forEach((dot) => {
    dot.addEventListener('click', () => {
      vibrate(8);
      currentExerciseIndex = Number(dot.dataset.gotoEx);
      renderSession();
    });
  });
  const prevBtn = body.querySelector('#prev-ex-btn');
  const nextBtn = body.querySelector('#next-ex-btn');
  if (!prevBtn.disabled) prevBtn.addEventListener('click', () => { vibrate(8); currentExerciseIndex -= 1; renderSession(); });
  if (!nextBtn.disabled) nextBtn.addEventListener('click', () => { vibrate(8); currentExerciseIndex += 1; renderSession(); });
}

function resumeIndexForDay(day, log) {
  if (!day || day.exercises.length === 0) return 0;
  const idx = day.exercises.findIndex((ex) => (log.exerciseSets[ex.id] || []).length < ex.targetSets);
  return idx === -1 ? 0 : idx;
}

export function mount(container) {
  gymContainer = container;
  const day = getTodayDay();
  if (day.exercises.length > 0) {
    const log = ensureLogForDate(todayISO());
    currentExerciseIndex = resumeIndexForDay(day, log);
    wasPassDoneToday = day.exercises.every((ex) => (log.exerciseSets[ex.id] || []).length >= ex.targetSets);
  } else {
    currentExerciseIndex = 0;
    wasPassDoneToday = false;
  }
  renderSession();
}

// ---- Settings modal: day list -> per-day exercise editor ----

function openSettingsModal() {
  modalView = 'list';
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
  if (gymContainer) mount(gymContainer);
}

function renderSettingsModal() {
  if (modalView === 'list') renderDayListView();
  else renderDayEditorView(modalView);
}

function renderDayListView() {
  const days = getDays();
  const rows = WEEKDAY_ORDER.map((day) => {
    const info = days[day];
    const summary = info.exercises.length === 0
      ? 'Rest day'
      : `${info.label ? `${escapeHtml(info.label)} · ` : ''}${info.exercises.length} exercise${info.exercises.length === 1 ? '' : 's'}`;
    return `
      <button type="button" class="day-row" data-day="${day}">
        <span class="day-row-name">${WEEKDAY_LABELS[day]}</span>
        <span class="day-row-summary">${summary}</span>
      </button>
    `;
  }).join('');

  modalEl.innerHTML = `
    <div class="modal-sheet">
      <header class="modal-header">
        <h2>Gym settings</h2>
        <button type="button" class="close-btn" aria-label="Close">×</button>
      </header>
      <p class="modal-hint">Pick a day and add your exercises. Saved for good — same plan every week until you change it.</p>
      <div class="day-list">${rows}</div>
    </div>
  `;
  modalEl.querySelector('.close-btn').addEventListener('click', closeSettingsModal);
  modalEl.querySelectorAll('[data-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(8);
      modalView = btn.dataset.day;
      renderSettingsModal();
    });
  });
}

function renderDayEditorView(dayKey) {
  const day = getDay(dayKey);

  modalEl.innerHTML = `
    <div class="modal-sheet">
      <header class="modal-header">
        <button type="button" class="back-btn" aria-label="Back to days">←</button>
        <h2>${WEEKDAY_LABELS[dayKey]}</h2>
        <button type="button" class="close-btn" aria-label="Close">×</button>
      </header>
      <label class="day-label-field">
        Workout name (optional)
        <input type="text" id="day-label-input" placeholder="e.g. Legs" maxlength="30" value="${escapeHtml(day.label)}" />
      </label>
      <ul class="exercise-edit-list" id="exercise-edit-list"></ul>
      <form id="add-exercise-form" class="add-exercise-form">
        <input type="text" placeholder="Exercise" required maxlength="40" class="exercise-name-input" />
        <input type="number" min="1" max="20" value="4" class="exercise-sets-input" aria-label="Sets" />
        <button type="submit">Add</button>
      </form>
    </div>
  `;

  modalEl.querySelector('.close-btn').addEventListener('click', closeSettingsModal);
  modalEl.querySelector('.back-btn').addEventListener('click', () => {
    modalView = 'list';
    renderSettingsModal();
  });

  modalEl.querySelector('#day-label-input').addEventListener('change', (e) => {
    setDayLabel(dayKey, e.target.value.trim());
  });

  const list = modalEl.querySelector('#exercise-edit-list');
  if (day.exercises.length === 0) {
    list.innerHTML = '<li class="empty-state">No exercises yet — add one below.</li>';
  } else {
    list.innerHTML = day.exercises.map((ex, idx) => `
      <li class="exercise-edit-row">
        <span>${escapeHtml(ex.name)} · ${ex.targetSets} sets</span>
        <span class="exercise-edit-actions">
          <button type="button" class="reorder-btn" data-move="${ex.id}:-1" ${idx === 0 ? 'disabled' : ''} aria-label="Move ${escapeHtml(ex.name)} up">▲</button>
          <button type="button" class="reorder-btn" data-move="${ex.id}:1" ${idx === day.exercises.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeHtml(ex.name)} down">▼</button>
          <button type="button" class="remove-btn" data-remove-ex="${ex.id}" aria-label="Delete ${escapeHtml(ex.name)}">×</button>
        </span>
      </li>
    `).join('');
  }

  list.querySelectorAll('[data-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(8);
      const [exerciseId, direction] = btn.dataset.move.split(':');
      moveExercise(dayKey, exerciseId, Number(direction));
      renderSettingsModal();
    });
  });
  list.querySelectorAll('[data-remove-ex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(15);
      removeExercise(dayKey, btn.dataset.removeEx);
      renderSettingsModal();
    });
  });

  modalEl.querySelector('#add-exercise-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('.exercise-name-input').value.trim();
    const sets = Number(form.querySelector('.exercise-sets-input').value) || 1;
    if (!name) return;
    addExercise(dayKey, name, sets);
    renderSettingsModal();
  });
}
