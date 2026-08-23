// Wraps a <li>'s existing content in a draggable layer with a red "Ta
// bort" backdrop revealed underneath — swipe left past the threshold (or
// tap the revealed label) to trigger onDelete. The list item's own remove
// button keeps working as a non-gesture alternative.
const THRESHOLD = 72;

export function enableSwipeToDelete(li, onDelete) {
  const content = document.createElement('div');
  content.className = 'swipe-content';
  while (li.firstChild) content.appendChild(li.firstChild);

  const backdrop = document.createElement('div');
  backdrop.className = 'swipe-delete-bg';
  backdrop.textContent = 'Ta bort';

  li.appendChild(backdrop);
  li.appendChild(content);
  li.classList.add('swipeable');

  let startX = 0;
  let dx = 0;
  let dragging = false;
  let pointerId = null;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    content.classList.add('dragging');
    content.setPointerCapture?.(pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    dx = Math.min(0, e.clientX - startX);
    content.style.transform = `translateX(${dx}px)`;
  }

  function finish(committed) {
    dragging = false;
    content.classList.remove('dragging');
    if (committed) {
      content.style.transform = 'translateX(-100%)';
      li.style.maxHeight = `${li.offsetHeight}px`;
      requestAnimationFrame(() => {
        li.classList.add('swipe-removing');
        li.style.maxHeight = '0px';
      });
      setTimeout(onDelete, 220);
    } else {
      content.style.transform = 'translateX(0)';
    }
    dx = 0;
  }

  function onPointerUp() {
    if (!dragging) return;
    finish(dx < -THRESHOLD);
  }

  content.addEventListener('pointerdown', onPointerDown);
  content.addEventListener('pointermove', onPointerMove);
  content.addEventListener('pointerup', onPointerUp);
  content.addEventListener('pointercancel', onPointerUp);
  backdrop.addEventListener('click', () => finish(true));
}
