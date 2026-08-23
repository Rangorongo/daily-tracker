export const PAGE_ORDER = ['home', 'gym', 'plugg', 'todo', 'sovtider', 'bontider'];

let dotsEl;
let pagerEl;
let currentPage = 'home';
const listeners = [];

export function scrollToPage(key) {
  const el = document.querySelector(`.page[data-page="${key}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
}

// Called whenever the active page changes, e.g. so the dashboard can
// refresh its summaries when swiped back into view.
export function onPageChange(fn) {
  listeners.push(fn);
}

function setActive(key) {
  if (key === currentPage) return;
  currentPage = key;
  dotsEl.querySelectorAll('.dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.dot === key);
  });
  listeners.forEach((fn) => fn(key));
}

function pageFromScrollPosition() {
  const index = Math.round(pagerEl.scrollLeft / pagerEl.clientWidth);
  const clamped = Math.min(Math.max(index, 0), PAGE_ORDER.length - 1);
  return PAGE_ORDER[clamped];
}

export function initPager() {
  dotsEl = document.getElementById('page-dots');
  pagerEl = document.getElementById('pager');

  dotsEl.innerHTML = PAGE_ORDER.map((p) => `<button type="button" class="dot" data-dot="${p}" aria-label="Gå till ${p}"></button>`).join('');
  dotsEl.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', () => scrollToPage(dot.dataset.dot));
  });
  dotsEl.querySelector('.dot').classList.add('active');

  let scrollTimer = null;
  pagerEl.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => setActive(pageFromScrollPosition()), 120);
  }, { passive: true });
}
