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

// Shared "checklist" data module, reused by both the To-Do and Plugg
// sections since they need identical CRUD + daily check-off behavior.
export function createChecklist(namespace) {
  const itemsKey = `${namespace}.items`;
  const logsKey = `${namespace}.logs`;

  return {
    getItems() {
      return readJSON(itemsKey, []).filter((item) => !item.archived);
    },
    addItem(name) {
      const items = readJSON(itemsKey, []);
      items.push({ id: uid(), name, createdAt: todayISO(), archived: false });
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
