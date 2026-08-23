import { todayISO, escapeHtml, formatDisplayDate } from './util.js';
import { scrollToPage } from './pager.js';
import { iconHome } from './icons.js';

export function getChecklistSummary(checklist) {
  const items = checklist.getItems();
  if (items.length === 0) return { text: 'Inga punkter än', done: 0, total: 0 };
  const log = checklist.getLog(todayISO());
  const done = items.filter((i) => log[i.id]).length;
  return { text: `${done}/${items.length} idag`, done, total: items.length };
}

export function renderChecklistSection(container, { checklist, title, colorVar }) {
  const today = todayISO();
  const items = checklist.getItems();
  const log = checklist.getLog(today);

  container.innerHTML = `
    <header class="section-header" style="--accent: var(${colorVar})">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="section-date">${formatDisplayDate(today)}</p>
      </div>
    </header>
    <ul class="checklist" id="checklist-items"></ul>
    <form id="add-item-form" class="add-item-form">
      <input type="text" id="add-item-input" placeholder="Lägg till ny punkt…" required maxlength="60" />
      <button type="submit">Lägg till</button>
    </form>
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));

  const list = container.querySelector('#checklist-items');
  if (items.length === 0) {
    list.innerHTML = '<li class="empty-state">Inga punkter än — lägg till en nedan.</li>';
  } else {
    for (const item of items) {
      const checked = !!log[item.id];
      const li = document.createElement('li');
      li.className = 'checklist-item';
      li.innerHTML = `
        <label class="checklist-label">
          <input type="checkbox" ${checked ? 'checked' : ''} data-id="${item.id}" />
          <span class="${checked ? 'done' : ''}">${escapeHtml(item.name)}</span>
        </label>
        <button type="button" class="remove-btn" data-remove="${item.id}" aria-label="Ta bort ${escapeHtml(item.name)}">×</button>
      `;
      list.appendChild(li);
    }
  }

  const rerender = () => renderChecklistSection(container, { checklist, title, colorVar });

  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      checklist.toggle(today, cb.dataset.id);
      rerender();
    });
  });

  list.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      checklist.archiveItem(btn.dataset.remove);
      rerender();
    });
  });

  container.querySelector('#add-item-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = container.querySelector('#add-item-input');
    const name = input.value.trim();
    if (!name) return;
    checklist.addItem(name);
    rerender();
  });
}
