/* The configuration model, its defaults, and validation. */

import { parseNote } from './notes.js';

export const LIMITS = {
  maxLength: 3600,      // seconds
  maxRates: 16,         // one per MIDI channel
  warnNotesPerRate: 10000,
  maxTotalNotes: 100000,
};

export const UNITS = ['bpm', 'hz', 'sec'];
export const UNIT_LABELS = { bpm: 'BPM', hz: 'Hz', sec: 'seconds apart' };

export function defaultRate(index) {
  return {
    name: `Rate ${index + 1}`,
    speed: 60,
    unit: 'bpm',
    note: 'C3',
    channel: Math.min(index + 1, 16),
    offset: 0,
    length: null,        // null = auto (50% of the interval)
    enabled: true,
  };
}

export function defaultConfig() {
  return {
    length: 60,
    tempo: 120,
    timeSignature: '4/4',
    velocity: 100,
    rates: [defaultRate(0)],
  };
}

const num = (v, fallback) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Coerce anything (a decoded URL, a partial object) into a valid config. */
export function normalise(raw) {
  const d = defaultConfig();
  if (!raw || typeof raw !== 'object') return d;

  const rates = Array.isArray(raw.rates) ? raw.rates.slice(0, LIMITS.maxRates) : [];

  return {
    length: clamp(num(raw.length, d.length), 0.1, LIMITS.maxLength),
    tempo: clamp(num(raw.tempo, d.tempo), 1, 999),
    timeSignature: /^\d{1,2}\/(1|2|4|8|16|32)$/.test(raw.timeSignature)
      ? raw.timeSignature : d.timeSignature,
    velocity: clamp(Math.round(num(raw.velocity, d.velocity)), 1, 127),
    rates: rates.length
      ? rates.map((r, i) => normaliseRate(r, i))
      : d.rates,
  };
}

function normaliseRate(r, i) {
  const d = defaultRate(i);
  if (!r || typeof r !== 'object') return d;
  return {
    name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 40) : d.name,
    speed: num(r.speed, d.speed),
    unit: UNITS.includes(r.unit) ? r.unit : d.unit,
    note: typeof r.note === 'string' ? r.note : d.note,
    channel: clamp(Math.round(num(r.channel, d.channel)), 1, 16),
    offset: num(r.offset, 0),
    length: r.length == null ? null : Math.max(0, num(r.length, 0)) || null,
    enabled: r.enabled !== false,
  };
}

/** Per-rate validation. Returns {field, message}, or null if the rate is fine. */
export function validateRate(rate) {
  if (!Number.isFinite(rate.speed) || rate.speed <= 0) {
    return { field: 'speed', message: 'Speed must be greater than 0.' };
  }
  if (parseNote(rate.note) === null) {
    return { field: 'note', message: `\u201C${rate.note}\u201D isn\u2019t a note name. Try C3, F#4 or Bb2 (C-2 to G8).` };
  }
  if (!Number.isInteger(rate.channel) || rate.channel < 1 || rate.channel > 16) {
    return { field: 'channel', message: 'Channel must be a whole number from 1 to 16.' };
  }
  if (!Number.isFinite(rate.offset)) {
    return { field: 'offset', message: 'Offset must be a number of seconds.' };
  }
  if (rate.length !== null && (!Number.isFinite(rate.length) || rate.length <= 0)) {
    return { field: 'length', message: 'Note length must be a positive number of seconds, or blank for auto.' };
  }
  return null;
}
