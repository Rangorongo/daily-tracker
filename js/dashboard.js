import { todayISO, formatDisplayDate } from './util.js';
import { scrollToPage } from './pager.js';
import { iconGym, iconPlugg, iconTodo, iconSleep, iconPrayer } from './icons.js';
import * as todo from './todo.js';
import * as plugg from './plugg.js';
import * as gym from './gym.js';
import * as sleep from './sleep.js';
import * as prayer from './prayer.js';

const CARDS = [
  { page: 'gym', title: 'Gym', colorVar: '--color-gym', icon: iconGym, getSummary: gym.getSummary },
  { page: 'plugg', title: 'Plugg', colorVar: '--color-plugg', icon: iconPlugg, getSummary: plugg.getSummary },
  { page: 'todo', title: 'To-Do', colorVar: '--color-todo', icon: iconTodo, getSummary: todo.getSummary },
  { page: 'sovtider', title: 'Sovtider', colorVar: '--color-sleep', icon: iconSleep, getSummary: sleep.getSummary },
  { page: 'bontider', title: 'Böntider', colorVar: '--color-prayer', icon: iconPrayer, getSummary: prayer.getSummary },
];

export function mount(container) {
  const cardsHtml = CARDS.map((card) => `
    <button type="button" class="dashboard-card" data-goto="${card.page}" style="--accent: var(${card.colorVar})">
      <span class="card-icon">${card.icon}</span>
      <h2>${card.title}</h2>
      <p>${card.getSummary().text}</p>
    </button>
  `).join('');

  container.innerHTML = `
    <header class="home-header">
      <p class="section-date">${formatDisplayDate(todayISO())}</p>
      <h1>Daglig Tracker</h1>
    </header>
    <div class="dashboard-grid">${cardsHtml}</div>
  `;

  container.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => scrollToPage(btn.dataset.goto));
  });
}

export function refresh(container) {
  mount(container);
}
