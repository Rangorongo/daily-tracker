// Small snackbar shown above the bottom nav — used for confirmations and
// undoable destructive actions (e.g. "Läxhjälp borttagen — Ångra").
let toastEl = null;
let hideTimer = null;

function ensureToastEl() {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  return toastEl;
}

export function showToast(message, { actionLabel, onAction, duration = 4000 } = {}) {
  const el = ensureToastEl();
  clearTimeout(hideTimer);

  el.innerHTML = `
    <span class="toast-message">${message}</span>
    ${actionLabel ? `<button type="button" class="toast-action">${actionLabel}</button>` : ''}
  `;
  el.classList.add('open');

  if (actionLabel && onAction) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      onAction();
      hideToast();
    });
  }

  hideTimer = setTimeout(hideToast, duration);
}

function hideToast() {
  if (toastEl) toastEl.classList.remove('open');
}
