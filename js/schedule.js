/* Rates -> a plain list of pulses in seconds.
   Knows nothing about MIDI or audio; both midi.js and preview.js consume this,
   which is what keeps the preview honest about what the file contains. */

import { parseNote } from './notes.js';
import { validateRate, LIMITS } from './state.js';

export const AUTO_LENGTH_FRACTION = 0.5;

/** Convert a speed in any supported unit to an interval in seconds. */
export function intervalFor(speed, unit) {
  if (!Number.isFinite(speed) || speed <= 0) return NaN;
  if (unit === 'bpm') return 60 / speed;
  if (unit === 'hz') return 1 / speed;
  return speed;                                  // 'sec'
}

/** How many pulses a rate produces, without materialising them. */
function pulseCount(interval, offset, trackLength) {
  if (!Number.isFinite(interval) || interval <= 0) return 0;
  const span = trackLength - offset;
  if (span <= 0) return 0;
  const first = offset >= 0 ? 0 : Math.ceil(-offset / interval);
  const last = Math.ceil(span / interval) - 1;
  return Math.max(0, last - first + 1);
}

export function buildSchedule(config) {
  const trackLength = config.length;
  const tracks = [];
  let totalNotes = 0;

  config.rates.forEach((rate, index) => {
    const error = validateRate(rate);
    const interval = intervalFor(rate.speed, rate.unit);
    const midi = parseNote(rate.note);
    const noteLength = rate.length ?? (interval * AUTO_LENGTH_FRACTION);

    const track = {
      index,
      name: rate.name,
      channel: rate.channel,
      note: midi,
      interval,
      noteLength,
      enabled: rate.enabled,
      error,
      count: 0,
      pulses: [],
    };

    if (error || !rate.enabled) { tracks.push(track); return; }

    track.count = pulseCount(interval, rate.offset, trackLength);
    totalNotes += track.count;

    // Don't materialise a run we're going to refuse to export anyway.
    if (totalNotes <= LIMITS.maxTotalNotes) {
      const first = rate.offset >= 0 ? 0 : Math.ceil(-rate.offset / interval);
      for (let n = 0; n < track.count; n++) {
        // Computed from n rather than accumulated, so error can't build up.
        const time = rate.offset + (first + n) * interval;
        const duration = Math.min(
          noteLength,
          interval,                  // never overlap the next pulse
          trackLength - time         // truncate at the end of the track
        );
        track.pulses.push({ time, duration });
      }
    }

    tracks.push(track);
  });

  return { tracks, totalNotes, trackLength };
}

/** Every pulse from every playable rate, flattened and time-ordered. */
export function flatten(schedule) {
  const events = [];
  for (const t of schedule.tracks) {
    if (t.error || !t.enabled) continue;
    for (const p of t.pulses) {
      events.push({ time: p.time, duration: p.duration, note: t.note, channel: t.channel });
    }
  }
  return events.sort((a, b) => a.time - b.time);
}

/** Why export is blocked, or null if it isn't. */
export function exportBlocker(schedule) {
  const playable = schedule.tracks.filter(t => !t.error && t.enabled);
  if (schedule.tracks.some(t => t.error && t.enabled)) {
    return 'Fix the errors above before exporting.';
  }
  if (!playable.length) return 'Add or enable at least one rate to export.';
  if (!playable.some(t => t.count > 0)) {
    return 'No pulses fall inside the track — check your offsets.';
  }
  if (schedule.totalNotes > LIMITS.maxTotalNotes) {
    return `${schedule.totalNotes.toLocaleString()} notes is more than the `
         + `${LIMITS.maxTotalNotes.toLocaleString()} limit. Shorten the track or slow a rate down.`;
  }
  return null;
}

/** Non-blocking things worth saying out loud. */
export function warnings(schedule) {
  const out = [];
  for (const t of schedule.tracks) {
    if (t.error || !t.enabled) continue;
    if (t.count > LIMITS.warnNotesPerRate) {
      out.push(`\u201C${t.name}\u201D has ${t.count.toLocaleString()} notes — some DAWs will struggle.`);
    }
    if (t.enabled && !t.error && t.count === 0) {
      out.push(`\u201C${t.name}\u201D produces no notes. Its offset may be past the end of the track.`);
    }
  }
  return out;
}
