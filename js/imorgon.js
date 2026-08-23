import { scrollToPage } from './pager.js';
import { iconHome } from './icons.js';
import {
  todayISO, addDays, weekdayKeyForISODate, formatDisplayDate, formatDuration, escapeHtml,
} from './util.js';
import * as gym from './gym.js';
import * as plugg from './plugg.js';
import * as todo from './todo.js';
import * as sleep from './sleep.js';

let imorgonContainer = null;

export function mount(container) {
  imorgonContainer = container;
  render();
}

export function refresh() {
  if (imorgonContainer) render();
}

function render() {
  const container = imorgonContainer;
  const tomorrow = addDays(todayISO(), 1);
  const dayKey = weekdayKeyForISODate(tomorrow);

  const targetMinutes = plugg.getTargetMinutesForDay(dayKey);
  const gymDay = gym.getDayInfo(dayKey);
  const wakeTime = sleep.getTarget().wake;
  const items = todo.getItemsForWeekday(dayKey)
    .slice()
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  container.innerHTML = `
    <header class="section-header" style="--accent: var(--color-primary)">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>Imorgon</h1>
        <p class="section-date">${formatDisplayDate(tomorrow)}</p>
      </div>
    </header>

    <div class="tomorrow-grid">
      <div class="tomorrow-tile">
        <span class="tomorrow-tile-label">Uppstigning</span>
        <span class="tomorrow-tile-value">${wakeTime}</span>
      </div>
      <div class="tomorrow-tile">
        <span class="tomorrow-tile-label">Plugg</span>
        <span class="tomorrow-tile-value">${targetMinutes > 0 ? formatDuration(targetMinutes) : '–'}</span>
      </div>
    </div>

    <h2 class="sub-heading">Gym</h2>
    <div class="tomorrow-gym-card">
      ${gymDay.exercises.length === 0
        ? '<p class="empty-state">Vilodag.</p>'
        : `
          ${gymDay.label ? `<p class="tomorrow-gym-label">${escapeHtml(gymDay.label)}</p>` : ''}
          <ul class="tomorrow-exercise-list">
            ${gymDay.exercises.map((ex) => `<li>${escapeHtml(ex.name)} · ${ex.targetSets} set</li>`).join('')}
          </ul>
        `}
    </div>

    <h2 class="sub-heading">Fasta to-do-punkter</h2>
    <ul class="checklist" id="tomorrow-todo-list"></ul>
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));

  const list = container.querySelector('#tomorrow-todo-list');
  if (items.length === 0) {
    list.innerHTML = '<li class="empty-state">Inga fasta punkter imorgon — resten fyller du på under dagen.</li>';
  } else {
    list.innerHTML = items.map((item) => `
      <li class="checklist-item">
        <span class="checklist-label">
          <span>
            <span>${escapeHtml(item.name)}</span>
            ${item.time ? `<span class="item-meta">${escapeHtml(item.time)}</span>` : ''}
          </span>
        </span>
      </li>
    `).join('');
  }
}
