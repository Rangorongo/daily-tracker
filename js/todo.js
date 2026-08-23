import { createChecklist } from './storage.js';
import { scrollToPage } from './pager.js';
import { iconHome, iconCalendar } from './icons.js';
import { enableSwipeToDelete } from './swipeToDelete.js';
import { showToast } from './toast.js';
import { celebrate } from './celebrate.js';
import {
  todayISO, weekdayKey, escapeHtml, formatDisplayDate, vibrate,
  WEEKDAY_ORDER, WEEKDAY_LABELS,
} from './util.js';

const checklist = createChecklist('todo');

let todoContainer = null;
let advancedOpen = false;
let selectedDays = [];
let wasAllDoneToday = false;

const DAY_SHORT = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' };

export function getSummary() {
  const items = checklist.getItemsForWeekday(weekdayKey());
  if (items.length === 0) return { text: 'Nothing yet', done: 0, total: 0 };
  const log = checklist.getLog(todayISO());
  const done = items.filter((i) => log[i.id]).length;
  return {
    text: `${done}/${items.length} today`, done, total: items.length, fraction: done / items.length,
  };
}

// Used by the "Tomorrow" preview to list tomorrow's fixed items.
export function getItemsForWeekday(day) {
  return checklist.getItemsForWeekday(day);
}

function itemMetaLabel(item) {
  const parts = [];
  if (item.days) parts.push(item.days.map((d) => WEEKDAY_LABELS[d]).join(', '));
  if (item.time) parts.push(item.time);
  return parts.join(' · ');
}

function removeWithUndo(item) {
  checklist.archiveItem(item.id);
  vibrate(15);
  render();
  showToast(`"${item.name}" deleted`, {
    actionLabel: 'Undo',
    onAction: () => {
      checklist.restoreItem(item.id);
      render();
    },
  });
}

function renderItem(item, { checkable, today, log }) {
  const meta = itemMetaLabel(item);
  const li = document.createElement('li');
  li.className = 'checklist-item';
  if (checkable) {
    const checked = !!log[item.id];
    li.innerHTML = `
      <label class="checklist-label">
        <input type="checkbox" ${checked ? 'checked' : ''} data-id="${item.id}" />
        <span>
          <span class="${checked ? 'done' : ''}">${escapeHtml(item.name)}</span>
          ${meta ? `<span class="item-meta">${escapeHtml(meta)}</span>` : ''}
        </span>
      </label>
      <button type="button" class="remove-btn" data-remove="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">×</button>
    `;
  } else {
    li.innerHTML = `
      <span class="checklist-label">
        <span>
          <span>${escapeHtml(item.name)}</span>
          ${meta ? `<span class="item-meta">${escapeHtml(meta)}</span>` : ''}
        </span>
      </span>
      <button type="button" class="remove-btn" data-remove="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">×</button>
    `;
  }
  li.querySelector('[data-remove]').addEventListener('click', () => removeWithUndo(item));
  enableSwipeToDelete(li, () => removeWithUndo(item));

  if (checkable) {
    li.querySelector('input[type="checkbox"]').addEventListener('change', () => {
      vibrate(10);
      checklist.toggle(today, item.id);
      const items = checklist.getItemsForWeekday(weekdayKey());
      const newLog = checklist.getLog(today);
      const allDoneNow = items.length > 0 && items.every((i) => newLog[i.id]);
      render();
      if (allDoneNow && !wasAllDoneToday) {
        vibrate([15, 40, 15]);
        celebrate();
      }
      wasAllDoneToday = allDoneNow;
    });
  }
  return li;
}

function render() {
  const container = todoContainer;
  const today = todayISO();
  const todayKey = weekdayKey();
  const log = checklist.getLog(today);

  const todayItems = checklist.getItemsForWeekday(todayKey)
    .slice()
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const otherItems = checklist.getItems().filter((i) => i.days && !i.days.includes(todayKey));

  container.innerHTML = `
    <header class="section-header">
      <button type="button" class="home-btn" aria-label="Home">${iconHome}</button>
      <div>
        <h1>To-Do</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
    </header>
    <ul class="checklist" id="checklist-items"></ul>
    <form id="add-item-form" class="add-item-form">
      <input type="text" id="add-item-input" placeholder="Add item…" required maxlength="60" />
      <button type="button" id="toggle-advanced-btn" class="schedule-toggle-btn" aria-label="Schedule">${iconCalendar}</button>
      <button type="submit">Add</button>
    </form>
    <div id="advanced-add" class="advanced-add" style="${advancedOpen ? '' : 'display:none'}"></div>

    ${otherItems.length > 0 ? `
      <h2 class="sub-heading">Other days</h2>
      <ul class="checklist" id="scheduled-items"></ul>
    ` : ''}
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));

  const list = container.querySelector('#checklist-items');
  if (todayItems.length === 0) {
    list.innerHTML = '<li class="empty-state">Nothing today — add one below.</li>';
  } else {
    todayItems.forEach((item) => list.appendChild(renderItem(item, { checkable: true, today, log })));
  }

  const scheduledList = container.querySelector('#scheduled-items');
  if (scheduledList) {
    otherItems.forEach((item) => scheduledList.appendChild(renderItem(item, { checkable: false })));
  }

  container.querySelector('#toggle-advanced-btn').addEventListener('click', () => {
    advancedOpen = !advancedOpen;
    vibrate(10);
    render();
  });

  if (advancedOpen) renderAdvancedAdd(container);

  container.querySelector('#add-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = container.querySelector('#add-item-input');
    const name = input.value.trim();
    if (!name) return;
    const timeInput = container.querySelector('#advanced-time-input');
    const time = timeInput && timeInput.value ? timeInput.value : null;
    const days = selectedDays.length > 0 ? [...selectedDays] : null;
    checklist.addItem(name, { days, time });
    vibrate(10);
    advancedOpen = false;
    selectedDays = [];
    render();
  });
}

function renderAdvancedAdd(container) {
  const box = container.querySelector('#advanced-add');
  const dayChips = WEEKDAY_ORDER.map((day) => `
    <button type="button" class="day-chip ${selectedDays.includes(day) ? 'selected' : ''}" data-chip="${day}">${DAY_SHORT[day]}</button>
  `).join('');
  box.innerHTML = `
    <p class="advanced-hint">Pick days (none = every day) and an optional time:</p>
    <div class="day-chip-row">${dayChips}</div>
    <input type="time" id="advanced-time-input" />
  `;
  box.querySelectorAll('[data-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      vibrate(10);
      const day = chip.dataset.chip;
      selectedDays = selectedDays.includes(day) ? selectedDays.filter((d) => d !== day) : [...selectedDays, day];
      renderAdvancedAdd(container);
    });
  });
}

export function mount(container) {
  todoContainer = container;
  const items = checklist.getItemsForWeekday(weekdayKey());
  const log = checklist.getLog(todayISO());
  wasAllDoneToday = items.length > 0 && items.every((i) => log[i.id]);
  render();
}
