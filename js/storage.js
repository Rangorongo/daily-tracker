import { todayISO, uid } from './util.js';

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Shared "checklist" data module (used by the To-Do section). An item
// with no `days` shows every day; one with `days` set (e.g. ['sat']) only
// recurs on those weekdays — used for fixed/recurring commitments.
export function createChecklist(namespace) {
  const itemsKey = `${namespace}.items`;
  const logsKey = `${namespace}.logs`;

  return {
    getItems() {
      return readJSON(itemsKey, []).filter((item) => !item.archived);
    },
    getItemsForWeekday(weekdayKey) {
      return this.getItems().filter((item) => !item.days || item.days.includes(weekdayKey));
    },
    addItem(name, { days = null, time = null } = {}) {
      const items = readJSON(itemsKey, []);
      items.push({
        id: uid(), name, createdAt: todayISO(), archived: false, days, time,
      });
      writeJSON(itemsKey, items);
    },
    archiveItem(id) {
      const items = readJSON(itemsKey, []);
      const item = items.find((i) => i.id === id);
      if (item) item.archived = true;
      writeJSON(itemsKey, items);
    },
    getLog(date) {
      return readJSON(logsKey, {})[date] || {};
    },
    toggle(date, id) {
      const logs = readJSON(logsKey, {});
      if (!logs[date]) logs[date] = {};
      logs[date][id] = !logs[date][id];
      writeJSON(logsKey, logs);
    },
  };
}
