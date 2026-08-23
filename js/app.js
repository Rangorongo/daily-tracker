import { initPager, onPageChange } from './pager.js';
import { prefetchTodayTimes } from './prayer.js';
import * as dashboard from './dashboard.js';
import * as gym from './gym.js';
import * as plugg from './plugg.js';
import * as todo from './todo.js';
import * as sleep from './sleep.js';
import * as prayer from './prayer.js';

const pages = {
  home: document.querySelector('.page[data-page="home"]'),
  gym: document.querySelector('.page[data-page="gym"]'),
  plugg: document.querySelector('.page[data-page="plugg"]'),
  todo: document.querySelector('.page[data-page="todo"]'),
  sovtider: document.querySelector('.page[data-page="sovtider"]'),
  bontider: document.querySelector('.page[data-page="bontider"]'),
};

dashboard.mount(pages.home);
gym.mount(pages.gym);
plugg.mount(pages.plugg);
todo.mount(pages.todo);
sleep.mount(pages.sovtider);
prayer.mount(pages.bontider);

onPageChange((page) => {
  if (page === 'home') dashboard.refresh(pages.home);
});

initPager();

prefetchTodayTimes().then(() => {
  dashboard.refresh(pages.home);
  prayer.mount(pages.bontider);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
