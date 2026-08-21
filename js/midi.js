/* A minimal Standard MIDI File writer — Type 1, 960 PPQ.
   Hand-rolled so the repo stays dependency-free and buildless. */

export const PPQ = 960;

const varLen = (value) => {
  let n = Math.max(0, Math.round(value));
  const out = [n & 0x7f];
  n = Math.floor(n / 128);
  while (n > 0) { out.unshift((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  return out;
};

const ascii = (s) => Array.from(String(s))
  .map(c => c.charCodeAt(0))
  .filter(c => c >= 32 && c <= 126);

const be32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const be16 = (n) => [(n >>> 8) & 0xff, n & 0xff];

const chunk = (id, data) => [...ascii(id), ...be32(data.length), ...data];

const metaText = (type, text) => {
  const bytes = ascii(text).slice(0, 127);
  return [0x00, 0xff, type, ...varLen(bytes.length), ...bytes];
};

/**
 * @param {object} schedule  from schedule.js
 * @param {object} config    the app configuration
 * @returns {Uint8Array}     a complete .mid file
 */
export function writeMidi(schedule, config) {
  const ticksPerSecond = (PPQ * config.tempo) / 60;
  const toTicks = (seconds) => Math.round(seconds * ticksPerSecond);
  const endTick = toTicks(schedule.trackLength);

  const playable = schedule.tracks.filter(t => !t.error && t.enabled);
  const chunks = [conductorTrack(config, endTick)];

  for (const track of playable) {
    chunks.push(noteTrack(track, config, toTicks, endTick));
  }

  const header = chunk('MThd', [...be16(1), ...be16(chunks.length), ...be16(PPQ)]);
  return new Uint8Array([...header, ...chunks.flat()]);
}

/* Track 0: tempo and time-signature map. No notes. */
function conductorTrack(config, endTick) {
  const usPerQuarter = Math.round(60000000 / config.tempo);
  const [beats, value] = config.timeSignature.split('/').map(Number);

  const data = [
    ...metaText(0x03, 'datarates'),
    0x00, 0xff, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff,
    0x00, 0xff, 0x58, 0x04, beats, Math.round(Math.log2(value)), 24, 8,
    ...varLen(endTick), 0xff, 0x2f, 0x00,
  ];
  return chunk('MTrk', data);
}

/* One track per rate, on the rate's own channel. */
function noteTrack(track, config, toTicks, endTick) {
  const channel = Math.min(15, Math.max(0, track.channel - 1));
  const velocity = config.velocity;

  const onTicks = track.pulses.map(p => Math.min(toTicks(p.time), endTick));
  const events = [];

  track.pulses.forEach((pulse, i) => {
    const on = onTicks[i];
    // Latest tick this note may end on: one before the next pulse, and never
    // past the end of the track.
    const ceiling = Math.min(
      i + 1 < onTicks.length ? onTicks[i + 1] - 1 : endTick,
      endTick
    );
    const off = Math.max(on + 1, Math.min(toTicks(pulse.time + pulse.duration), ceiling));

    events.push({ tick: on, order: 1, bytes: [0x90 | channel, track.note, velocity] });
    events.push({ tick: off, order: 0, bytes: [0x80 | channel, track.note, 0x00] });
  });

  // Note-offs sort before note-ons at the same tick, so nothing ever hangs.
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const data = [...metaText(0x03, track.name)];
  let last = 0;
  for (const e of events) {
    data.push(...varLen(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  data.push(...varLen(Math.max(0, endTick - last)), 0xff, 0x2f, 0x00);

  return chunk('MTrk', data);
}

export function filenameFor(config) {
  const round = (n) => String(Math.round(n * 10) / 10).replace('.', '-');
  return `datarates-${round(config.length)}s-${round(config.tempo)}bpm.mid`;
}

export function download(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
