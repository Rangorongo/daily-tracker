import {
  todayISO, addDays, weekdayKeyForISODate, formatDisplayDate, WEEKDAY_LABELS, vibrate,
} from './util.js';
import { scrollToPage } from './pager.js';
import * as todo from './todo.js';
import * as study from './study.js';
import * as gym from './gym.js';
import * as sleep from './sleep.js';
import * as prayer from './prayer.js';

function tomorrowSummary() {
  const dayKey = weekdayKeyForISODate(addDays(todayISO(), 1));
  return { text: WEEKDAY_LABELS[dayKey] };
}

const CARDS = [
  { page: 'gym', title: 'Gym', getSummary: gym.getSummary },
  { page: 'study', title: 'Study', getSummary: study.getSummary },
  { page: 'todo', title: 'To-Do', getSummary: todo.getSummary },
  { page: 'sleep', title: 'Sleep', getSummary: sleep.getSummary },
  { page: 'prayer', title: 'Prayer', getSummary: prayer.getSummary },
  { page: 'tomorrow', title: 'Tomorrow', getSummary: tomorrowSummary },
];

export function mount(container) {
  const cardsHtml = CARDS.map((card) => {
    const summary = card.getSummary();
    const bar = typeof summary.fraction === 'number'
      ? `<div class="card-progress"><div class="card-progress-fill" style="width:${Math.round(summary.fraction * 100)}%"></div></div>`
      : '';
    return `
      <button type="button" class="dashboard-card" data-goto="${card.page}">
        <h2>${card.title}</h2>
        <p>${summary.text}</p>
        ${bar}
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <header class="home-header">
      <p class="section-date">${formatDisplayDate(todayISO())}</p>
      <h1>Daily Tracker</h1>
    </header>
    <div class="dashboard-grid">${cardsHtml}</div>
  `;

  container.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(8);
      scrollToPage(btn.dataset.goto);
    });
  });
}

export function refresh(container) {
  mount(container);
}
