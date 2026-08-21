/* (i) markers: a disclosure button and one reusable panel.
   Click or Enter opens, Escape or an outside click closes. Works on touch,
   which a native title attribute does not. */

const TIPS = {
  tempo:
    'Sets the bars-and-beats ruler in your DAW, and the tick values inside the '
    + 'file. It does not move the pulses — those stay at their true position in '
    + 'seconds, so changing the tempo never changes when anything sounds.',
  unit:
    'Three ways of writing the same thing. 120 BPM, 2 Hz and 0.5 seconds apart '
    + 'are all one pulse every half-second. Pick whichever matches your data.',
  offset:
    'Shifts the whole rate later in time. Rates with no offset all start '
    + 'together at 0s and then phase apart. Negative values are allowed — the '
    + 'rate starts part-way through its cycle, and any pulse before 0s is dropped.',
  length:
    'Blank means auto: half the gap between pulses, so slow rates get long notes '
    + 'and fast ones get short. Type a value in seconds to fix it. Length is '
    + 'capped at the interval so notes never overlap, and the last note is '
    + 'trimmed at the end of the track.',
};

let panel = null;
let openButton = null;

export function initTooltips() {
  document.addEventListener('click', (e) => {
    const button = e.target.closest('.info');
    if (button) { e.preventDefault(); toggle(button); return; }
    if (openButton && !e.target.closest('.tip')) closeTooltip();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !openButton) return;
    const button = openButton;
    closeTooltip();
    button.focus();
  });
}

/* Rows are re-rendered on add/remove, which would strand an open panel. */
export function closeTooltip() {
  if (!openButton) return;
  openButton.setAttribute('aria-expanded', 'false');
  openButton.removeAttribute('aria-controls');
  panel.remove();
  openButton = null;
}

function toggle(button) {
  const wasOpen = openButton === button;
  closeTooltip();
  if (wasOpen) return;

  const text = TIPS[button.dataset.tip];
  if (!text) return;

  panel = panel || build();
  panel.textContent = text;
  // Placed straight after the button so screen readers reach it in order.
  button.after(panel);
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', panel.id);
  openButton = button;

  // Flip to right-aligned if the panel would run off the edge of the window.
  panel.classList.remove('tip--flip');
  if (panel.getBoundingClientRect().right > document.documentElement.clientWidth - 8) {
    panel.classList.add('tip--flip');
  }
}

function build() {
  const el = document.createElement('div');
  el.className = 'tip';
  el.id = 'tip-panel';
  el.setAttribute('role', 'note');
  return el;
}
