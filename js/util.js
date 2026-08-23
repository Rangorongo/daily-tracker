export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const WEEKDAY_LABELS_SV = {
  mon: 'Måndag',
  tue: 'Tisdag',
  wed: 'Onsdag',
  thu: 'Torsdag',
  fri: 'Fredag',
  sat: 'Lördag',
  sun: 'Söndag',
};

export const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function weekdayKey(date = new Date()) {
  return WEEKDAYS[date.getDay()];
}

export function addDays(isoDate, delta) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function weekdayKeyForISODate(isoDate) {
  return weekdayKey(new Date(`${isoDate}T00:00:00`));
}

export function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const DISPLAY_WEEKDAYS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
const DISPLAY_MONTHS = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

export function formatDisplayDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return `${DISPLAY_WEEKDAYS[d.getDay()]} ${d.getDate()} ${DISPLAY_MONTHS[d.getMonth()]}`;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function minutesSinceMidnight(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Best-effort haptic feedback — silently does nothing on browsers/devices
// without the Vibration API (iOS Safari, desktop, etc).
export function vibrate(pattern = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}
