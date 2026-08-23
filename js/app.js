import { initPager, onPageChange, scrollToPage } from './pager.js';
import { prefetchTodayTimes } from './prayer.js';
import * as dashboard from './dashboard.js';
import * as gym from './gym.js';
import * as study from './study.js';
import * as todo from './todo.js';
import * as sleep from './sleep.js';
import * as prayer from './prayer.js';
import * as tomorrow from './tomorrow.js';

const pages = {
  home: document.querySelector('.page[data-page="home"]'),
  gym: document.querySelector('.page[data-page="gym"]'),
  study: document.querySelector('.page[data-page="study"]'),
  todo: document.querySelector('.page[data-page="todo"]'),
  sleep: document.querySelector('.page[data-page="sleep"]'),
  prayer: document.querySelector('.page[data-page="prayer"]'),
  tomorrow: document.querySelector('.page[data-page="tomorrow"]'),
};

dashboard.mount(pages.home);
gym.mount(pages.gym);
study.mount(pages.study);
todo.mount(pages.todo);
sleep.mount(pages.sleep);
prayer.mount(pages.prayer);
tomorrow.mount(pages.tomorrow);

onPageChange((page) => {
  if (page === 'home') dashboard.refresh(pages.home);
  if (page === 'tomorrow') tomorrow.refresh();
});

initPager();

// In the evening — starting 2 hours before the planned bedtime — open
// straight into tomorrow's preview instead of the regular dashboard.
if (sleep.isEveningWindow()) {
  tomorrow.refresh();
  scrollToPage('tomorrow', { instant: true });
}

prefetchTodayTimes().then(() => {
  dashboard.refresh(pages.home);
  prayer.mount(pages.prayer);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
