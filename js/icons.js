// Small stroke-based SVG icons (24x24, currentColor) — kept to purely
// functional/navigational glyphs (home, settings, scheduling). No
// decorative per-section icons; the UI stays typographic otherwise.

const wrap = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const iconCalendar = wrap(`
  <rect x="3.5" y="5" width="17" height="15" rx="3" />
  <path d="M3.5 9.5h17" /><path d="M8 3v4" /><path d="M16 3v4" />
`);

export const iconHome = wrap(`
  <path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9h12v-9" />
`);

export const iconSettings = wrap(`
  <circle cx="12" cy="12" r="3" />
  <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.4-2-3.4-2.2.8a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.2-.8-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15.9l2 3.4 2.2-.8a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.2.8 2-3.4-1.9-1.4Z" />
`);
