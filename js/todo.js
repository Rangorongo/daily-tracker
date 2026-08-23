import { createChecklist } from './storage.js';
import { scrollToPage } from './pager.js';
import { iconHome, iconCalendar } from './icons.js';
import {
  todayISO, weekdayKey, escapeHtml, formatDisplayDate,
  WEEKDAY_ORDER, WEEKDAY_LABELS_SV,
} from './util.js';

const checklist = createChecklist('todo');

let todoContainer = null;
let advancedOpen = false;
let selectedDays = [];

const DAY_SHORT = { mon: 'M', tue: 'T', wed: 'O', thu: 'T', fri: 'F', sat: 'L', sun: 'S' };

export function getSummary() {
  const items = checklist.getItemsForWeekday(weekdayKey());
  if (items.length === 0) return { text: 'Inga punkter än', done: 0, total: 0 };
  const log = checklist.getLog(todayISO());
  const done = items.filter((i) => log[i.id]).length;
  return { text: `${done}/${items.length} idag`, done, total: items.length };
}

// Used by the "Imorgon" preview to list tomorrow's fixed items.
export function getItemsForWeekday(day) {
  return checklist.getItemsForWeekday(day);
}

function itemMetaLabel(item) {
  const parts = [];
  if (item.days) parts.push(item.days.map((d) => WEEKDAY_LABELS_SV[d]).join(', '));
  if (item.time) parts.push(item.time);
  return parts.join(' · ');
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
      <button type="button" class="remove-btn" data-remove="${item.id}" aria-label="Ta bort ${escapeHtml(item.name)}">×</button>
    `;
  } else {
    li.innerHTML = `
      <span class="checklist-label">
        <span>
          <span>${escapeHtml(item.name)}</span>
          ${meta ? `<span class="item-meta">${escapeHtml(meta)}</span>` : ''}
        </span>
      </span>
      <button type="button" class="remove-btn" data-remove="${item.id}" aria-label="Ta bort ${escapeHtml(item.name)}">×</button>
    `;
  }
  li.querySelector(`[data-remove]`).addEventListener('click', () => {
    checklist.archiveItem(item.id);
    render();
  });
  if (checkable) {
    li.querySelector('input[type="checkbox"]').addEventListener('change', () => {
      checklist.toggle(today, item.id);
      render();
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
    <header class="section-header" style="--accent: var(--color-todo)">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>To-Do</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
    </header>
    <ul class="checklist" id="checklist-items"></ul>
    <form id="add-item-form" class="add-item-form">
      <input type="text" id="add-item-input" placeholder="Lägg till ny punkt…" required maxlength="60" />
      <button type="button" id="toggle-advanced-btn" class="schedule-toggle-btn" aria-label="Schemalägg">${iconCalendar}</button>
      <button type="submit">Lägg till</button>
    </form>
    <div id="advanced-add" class="advanced-add" style="${advancedOpen ? '' : 'display:none'}"></div>

    ${otherItems.length > 0 ? `
      <h2 class="sub-heading">Schemalagda (andra dagar)</h2>
      <ul class="checklist" id="scheduled-items"></ul>
    ` : ''}
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));

  const list = container.querySelector('#checklist-items');
  if (todayItems.length === 0) {
    list.innerHTML = '<li class="empty-state">Inga punkter för idag — lägg till en nedan.</li>';
  } else {
    todayItems.forEach((item) => list.appendChild(renderItem(item, { checkable: true, today, log })));
  }

  const scheduledList = container.querySelector('#scheduled-items');
  if (scheduledList) {
    otherItems.forEach((item) => scheduledList.appendChild(renderItem(item, { checkable: false })));
  }

  container.querySelector('#toggle-advanced-btn').addEventListener('click', () => {
    advancedOpen = !advancedOpen;
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
    <p class="advanced-hint">Välj dagar (ingen vald = varje dag) och valfri tid:</p>
    <div class="day-chip-row">${dayChips}</div>
    <input type="time" id="advanced-time-input" />
  `;
  box.querySelectorAll('[data-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const day = chip.dataset.chip;
      selectedDays = selectedDays.includes(day) ? selectedDays.filter((d) => d !== day) : [...selectedDays, day];
      renderAdvancedAdd(container);
    });
  });
}

export function mount(container) {
  todoContainer = container;
  render();
}
