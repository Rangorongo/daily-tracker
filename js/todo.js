import { createChecklist } from './storage.js';
import { renderChecklistSection, getChecklistSummary } from './checklistView.js';

const checklist = createChecklist('todo');

export function getSummary() {
  return getChecklistSummary(checklist);
}

export function mount(container) {
  renderChecklistSection(container, { checklist, title: 'To-Do', colorVar: '--color-todo' });
}
