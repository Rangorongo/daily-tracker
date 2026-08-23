import { readJSON, writeJSON } from './storage.js';
import { scrollToPage } from './pager.js';
import { iconHome } from './icons.js';
import { todayISO, formatDisplayDate, minutesSinceMidnight } from './util.js';

const CACHE_KEY = 'prayer.cache';
const STOCKHOLM_LAT = 59.3293;
const STOCKHOLM_LON = 18.0686;
const CALC_METHOD = 3; // Muslim World League — common default in Europe

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_LABELS = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
const DISPLAY_ROWS = [['Fajr', 'fajr'], ['Gryning', 'sunrise'], ['Dhuhr', 'dhuhr'], ['Asr', 'asr'], ['Maghrib', 'maghrib'], ['Isha', 'isha']];

function isoToAladhanDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function cleanTime(raw) {
  return raw.split(' ')[0];
}

async function fetchTimings(iso) {
  const url = `https://api.aladhan.com/v1/timings/${isoToAladhanDate(iso)}?latitude=${STOCKHOLM_LAT}&longitude=${STOCKHOLM_LON}&method=${CALC_METHOD}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Nätverksfel');
  const json = await res.json();
  const t = json.data.timings;
  return {
    fajr: cleanTime(t.Fajr),
    sunrise: cleanTime(t.Sunrise),
    dhuhr: cleanTime(t.Dhuhr),
    asr: cleanTime(t.Asr),
    maghrib: cleanTime(t.Maghrib),
    isha: cleanTime(t.Isha),
  };
}

function getCache() {
  return readJSON(CACHE_KEY, null);
}
function setCache(date, times) {
  writeJSON(CACHE_KEY, { date, times, fetchedAt: Date.now() });
}

async function getTodayTimes() {
  const today = todayISO();
  const cache = getCache();
  if (cache && cache.date === today) return { times: cache.times, stale: false };
  try {
    const times = await fetchTimings(today);
    setCache(today, times);
    return { times, stale: false };
  } catch {
    if (cache) return { times: cache.times, stale: true, staleDate: cache.date };
    return { times: null, stale: true, staleDate: null };
  }
}

function nextPrayer(times) {
  const nowMin = minutesSinceMidnight(new Date().toTimeString().slice(0, 5));
  for (const key of PRAYER_ORDER) {
    if (minutesSinceMidnight(times[key]) > nowMin) {
      return { key, label: PRAYER_LABELS[key], time: times[key] };
    }
  }
  return { key: 'fajr', label: 'Fajr (imorgon)', time: times.fajr };
}

export function getSummary() {
  const cache = getCache();
  if (!cache || cache.date !== todayISO()) return { text: 'Hämtar…' };
  const next = nextPrayer(cache.times);
  return { text: `${next.label} ${next.time}` };
}

export async function prefetchTodayTimes() {
  await getTodayTimes();
}

export async function mount(container) {
  const today = todayISO();
  container.innerHTML = `
    <header class="section-header" style="--accent: var(--color-prayer)">
      <button type="button" class="home-btn" aria-label="Till hem">${iconHome}</button>
      <div>
        <h1>Böntider</h1>
        <p class="section-date">Stockholm · ${formatDisplayDate(today)}</p>
      </div>
    </header>
    <div id="prayer-body">
      <div class="skeleton-list">
        ${Array.from({ length: 6 }, () => '<div class="skeleton-row"></div>').join('')}
      </div>
    </div>
  `;

  container.querySelector('.home-btn').addEventListener('click', () => scrollToPage('home'));

  const body = container.querySelector('#prayer-body');
  const result = await getTodayTimes();

  if (!result.times) {
    body.innerHTML = '<p class="empty-state">Kunde inte hämta böntider. Kontrollera internetanslutningen.</p>';
    return;
  }

  const next = nextPrayer(result.times);
  const staleNote = result.stale
    ? `<p class="stale-note">Visar cachad data${result.staleDate && result.staleDate !== today ? ` från ${formatDisplayDate(result.staleDate)}` : ''} — ingen internetanslutning just nu.</p>`
    : '';

  body.innerHTML = `
    ${staleNote}
    <p class="next-prayer">Nästa: <strong>${next.label} ${next.time}</strong></p>
    <ul class="prayer-times">
      ${DISPLAY_ROWS.map(([label, key]) => `<li class="${key === next.key ? 'next' : ''}"><span>${label}</span><span>${result.times[key]}</span></li>`).join('')}
    </ul>
  `;
}
