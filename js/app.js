/* Wires the UI to the configuration. */

import { defaultConfig, defaultRate, normalise, LIMITS } from './state.js';
import { buildSchedule, flatten, exportBlocker, warnings } from './schedule.js';
import { writeMidi, filenameFor, download } from './midi.js';
import { parseNote } from './notes.js';
import { readHash, writeHash } from './url.js';
import { Preview } from './preview.js';
import { initTooltips, closeTooltip } from './tooltip.js';
import { drawTimeline } from './timeline.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let config = normalise(readHash() ?? defaultConfig());
let lastRemoved = null;

const el = {
  rates: $('#rates'),
  template: $('#rate-template'),
  addRate: $('#add-rate'),
  undo: $('#undo-remove'),
  preview: $('#preview'),
  previewLabel: $('#preview-label'),
  download: $('#download'),
  playbar: $('#playbar'),
  timeline: $('#timeline'),
  playhead: $('#playhead'),
  clock: $('#clock'),
  summary: $('#summary'),
  exportError: $('#export-error'),
};

/* ------------------------------------------------------------ formatting -- */

/** Seconds, trimmed to significant precision, with an ellipsis when truncated. */
function secs(n) {
  if (!Number.isFinite(n)) return '—';
  for (const dp of [1, 2, 3]) {
    const shown = n.toFixed(dp);
    if (Math.abs(parseFloat(shown) - n) < 1e-9) return `${shown}s`;
  }
  return `${n.toFixed(3)}…s`;      // truncated, never silently rounded
}

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/* --------------------------------------------------------------- rows -- */

function renderRates() {
  closeTooltip();          // rows are about to be replaced
  el.rates.textContent = '';

  config.rates.forEach((rate, i) => {
    const row = el.template.content.firstElementChild.cloneNode(true);
    row.dataset.index = i;

    for (const input of $$('[data-f]', row)) {
      const field = input.dataset.f;
      if (field === 'enabled') input.checked = rate.enabled;
      else if (field === 'length') input.value = rate.length ?? '';
      else input.value = rate[field];

      // Labels in the template are shared, so give each row unique ids.
      const label = $(`[data-lbl="${field}"]`, row);
      if (label) {
        const id = `r${i}-${field}`;
        input.id = id;
        label.setAttribute('for', id);
      }
    }

    el.rates.append(row);
  });

  el.addRate.disabled = config.rates.length >= LIMITS.maxRates;
  refresh();
}

/** Read one changed control back into the config. */
function applyInput(input, rate) {
  const field = input.dataset.f;
  const raw = input.value.trim();

  switch (field) {
    case 'enabled': rate.enabled = input.checked; break;
    case 'name':    rate.name = input.value; break;
    case 'unit':    rate.unit = input.value; break;
    case 'note':    rate.note = input.value; break;
    case 'channel': rate.channel = Math.round(parseFloat(raw)); break;
    case 'length':  rate.length = raw === '' ? null : parseFloat(raw); break;
    case 'offset':  rate.offset = isPartial(raw) ? 0 : parseFloat(raw); break;
    default:        rate[field] = parseFloat(raw);
  }
}

/* Half-typed numbers ("", "-", ".", "-.") shouldn't flash an error. */
const isPartial = (v) => /^-?\.?$/.test(v);

function errorSuppressed(row, error) {
  if (!error) return true;
  const input = $(`[data-f="${error.field}"]`, row);
  return input === document.activeElement && isPartial(input.value.trim());
}

/* ------------------------------------------------------------- refresh -- */

function refresh() {
  const schedule = buildSchedule(config);

  schedule.tracks.forEach((track, i) => {
    const row = el.rates.children[i];
    if (!row) return;

    const rate = config.rates[i];
    const midi = parseNote(rate.note);

    row.classList.toggle('rate--off', !rate.enabled);

    $('[data-out="interval"]', row).textContent =
      Number.isFinite(track.interval) ? `= every ${secs(track.interval)}` : '';
    $('[data-out="noteNum"]', row).textContent = midi === null ? '' : `= ${midi}`;
    $('[data-out="lengthOut"]', row).textContent =
      Number.isFinite(track.noteLength)
        ? (rate.length === null ? `auto · ${secs(track.noteLength)}` : secs(track.noteLength))
        : '';
    $('[data-out="count"]', row).textContent =
      track.error ? '' : plural(track.count, 'note');

    const hidden = errorSuppressed(row, track.error);
    const box = $('[data-out="error"]', row);
    box.hidden = hidden;
    box.textContent = hidden ? '' : track.error.message;

    for (const input of $$('[data-f]', row)) input.removeAttribute('aria-invalid');
    if (!hidden) {
      const bad = $(`[data-f="${track.error.field}"]`, row);
      bad.setAttribute('aria-invalid', 'true');
      bad.setAttribute('aria-describedby', box.id ||= `r${i}-error`);
    }
  });

  const blocker = exportBlocker(schedule);
  el.download.disabled = !!blocker;
  el.preview.disabled = !!blocker;
  el.exportError.hidden = !blocker;
  el.exportError.textContent = blocker ?? '';

  const active = schedule.tracks.filter(t => !t.error && t.enabled).length;
  el.summary.textContent = [
    `${plural(schedule.totalNotes, 'note')} across ${plural(active, 'rate')} · ${secs(config.length)}`,
    ...warnings(schedule),
  ].join(' · ');

  if (!preview.playing) el.clock.textContent = `0.0 / ${config.length.toFixed(1)}s`;
  drawTimeline(el.timeline, schedule);
  writeHash(config);
}

/* -------------------------------------------------------------- events -- */

el.rates.addEventListener('input', (e) => {
  const row = e.target.closest('.rate');
  if (!row) return;
  applyInput(e.target, config.rates[+row.dataset.index]);
  refresh();
});

el.rates.addEventListener('click', (e) => {
  if (e.target.dataset.act !== 'remove') return;
  const index = +e.target.closest('.rate').dataset.index;
  lastRemoved = { rate: config.rates[index], index };
  config.rates.splice(index, 1);
  if (!config.rates.length) config.rates.push(defaultRate(0));
  el.undo.hidden = false;
  stopPreview();
  renderRates();
});

el.addRate.addEventListener('click', () => {
  const used = new Set(config.rates.map(r => r.channel));
  const rate = defaultRate(config.rates.length);
  for (let c = 1; c <= 16; c++) if (!used.has(c)) { rate.channel = c; break; }
  config.rates.push(rate);
  stopPreview();
  renderRates();
});

el.undo.addEventListener('click', () => {
  if (!lastRemoved) return;
  config.rates.splice(lastRemoved.index, 0, lastRemoved.rate);
  config.rates = config.rates.slice(0, LIMITS.maxRates);
  lastRemoved = null;
  el.undo.hidden = true;
  renderRates();
});

for (const input of $$('[data-track]')) {
  input.value = config[input.dataset.track];
  input.addEventListener('input', () => {
    const field = input.dataset.track;
    const raw = input.value.trim();
    config[field] = field === 'timeSignature' ? raw : parseFloat(raw);
    if (field !== 'timeSignature' && !Number.isFinite(config[field])) {
      config[field] = defaultConfig()[field];
    }
    stopPreview();
    refresh();
  });
}

el.download.addEventListener('click', () => {
  const schedule = buildSchedule(config);
  if (exportBlocker(schedule)) return;
  download(writeMidi(schedule, config), filenameFor(config));
});

/* ------------------------------------------------------------- preview -- */

const preview = new Preview({
  onTick: (elapsed, duration) => {
    el.playhead.style.left = `${duration ? (elapsed / duration) * 100 : 0}%`;
    el.clock.textContent = `${elapsed.toFixed(1)} / ${duration.toFixed(1)}s`;
  },
  onEnd: () => setPreviewLabel(false),
});

function setPreviewLabel(playing) {
  el.previewLabel.textContent = playing ? 'Stop' : 'Preview';
  el.preview.classList.toggle('is-playing', playing);
  el.playhead.hidden = !playing;
}

function stopPreview() {
  if (preview.playing) { preview.stop(); setPreviewLabel(false); }
}

el.preview.addEventListener('click', () => {
  if (preview.playing) { stopPreview(); return; }
  const schedule = buildSchedule(config);
  if (exportBlocker(schedule)) return;
  preview.play(flatten(schedule), config.length);
  setPreviewLabel(true);
});

window.addEventListener('pagehide', () => preview.stop());

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => drawTimeline(el.timeline, buildSchedule(config)), 100);
});
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => drawTimeline(el.timeline, buildSchedule(config)));

initTooltips();
renderRates();
