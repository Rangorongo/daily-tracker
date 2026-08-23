// Small stroke-based SVG icons (24x24, currentColor) used on the home cards
// and section headers — kept as plain markup strings, no icon library needed.

const wrap = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const iconGym = wrap(`
  <path d="M3 10v4" /><path d="M6 8v8" /><path d="M18 8v8" /><path d="M21 10v4" />
  <path d="M6 12h12" />
`);

export const iconPlugg = wrap(`
  <path d="M3 6.5C4.6 5.6 6.7 5 9 5c1.7 0 3.3.4 4.5 1.1" />
  <path d="M21 6.5C19.4 5.6 17.3 5 15 5c-.9 0-1.8.1-2.6.3" />
  <path d="M3 6.5v11c1.6-.9 3.7-1.5 6-1.5 1.7 0 3.3.4 4.5 1.1" />
  <path d="M21 6.5v11c-1.6-.9-3.7-1.5-6-1.5-.9 0-1.8.1-2.6.3" />
  <path d="M12 6.4v11.1" />
`);

export const iconTodo = wrap(`
  <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
  <path d="M8 12.2l2.6 2.6L16.5 9" />
`);

export const iconSleep = wrap(`
  <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z" />
`);

export const iconPrayer = wrap(`
  <path d="M14.5 4.5A7.5 7.5 0 1 0 19.5 17a6 6 0 0 1-5-12.5Z" />
  <path d="M18.5 6.2l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z" fill="currentColor" stroke="none" />
`);

export const iconHome = wrap(`
  <path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9h12v-9" />
`);

export const iconSettings = wrap(`
  <circle cx="12" cy="12" r="3" />
  <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.4-2-3.4-2.2.8a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.2-.8-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15.9l2 3.4 2.2-.8a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.2.8 2-3.4-1.9-1.4Z" />
`);
