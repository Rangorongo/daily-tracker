import {
  todayISO, addDays, weekdayKeyForISODate, formatDisplayDate, WEEKDAY_LABELS_SV, vibrate,
} from './util.js';
import { scrollToPage } from './pager.js';
import {
  iconGym, iconPlugg, iconTodo, iconSleep, iconPrayer, iconTomorrow,
} from './icons.js';
import * as todo from './todo.js';
import * as plugg from './plugg.js';
import * as gym from './gym.js';
import * as sleep from './sleep.js';
import * as prayer from './prayer.js';

function tomorrowSummary() {
  const dayKey = weekdayKeyForISODate(addDays(todayISO(), 1));
  return { text: WEEKDAY_LABELS_SV[dayKey] };
}

const CARDS = [
  { page: 'gym', title: 'Gym', colorVar: '--color-gym', icon: iconGym, getSummary: gym.getSummary },
  { page: 'plugg', title: 'Plugg', colorVar: '--color-plugg', icon: iconPlugg, getSummary: plugg.getSummary },
  { page: 'todo', title: 'To-Do', colorVar: '--color-todo', icon: iconTodo, getSummary: todo.getSummary },
  { page: 'sovtider', title: 'Sovtider', colorVar: '--color-sleep', icon: iconSleep, getSummary: sleep.getSummary },
  { page: 'bontider', title: 'Böntider', colorVar: '--color-prayer', icon: iconPrayer, getSummary: prayer.getSummary },
  { page: 'imorgon', title: 'Imorgon', colorVar: '--color-primary', icon: iconTomorrow, getSummary: tomorrowSummary },
];

export function mount(container) {
  const cardsHtml = CARDS.map((card) => {
    const summary = card.getSummary();
    const bar = typeof summary.fraction === 'number'
      ? `<div class="card-progress"><div class="card-progress-fill" style="width:${Math.round(summary.fraction * 100)}%"></div></div>`
      : '';
    return `
      <button type="button" class="dashboard-card" data-goto="${card.page}" style="--accent: var(${card.colorVar})">
        <span class="card-icon">${card.icon}</span>
        <h2>${card.title}</h2>
        <p>${summary.text}</p>
        ${bar}
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <header class="home-header">
      <p class="section-date">${formatDisplayDate(todayISO())}</p>
      <h1>Daglig Tracker</h1>
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
