/* Verifies the arithmetic and the MIDI bytes. Run with: tools/test.sh
 *
 * The MIDI section parses the generated file with an independent reader written
 * against the SMF spec, rather than trusting the writer to check itself.
 */

import { parseNote, formatNote } from '../js/notes.js';
import { normalise } from '../js/state.js';
import { buildSchedule, intervalFor, exportBlocker } from '../js/schedule.js';
import { writeMidi } from '../js/midi.js';
import { encode, decode } from '../js/url.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

/* ------------------------------------------------------------------ notes -- */
console.log('\n-- notes (middle C = C3 = 60) --');
ok('C3 = 60', parseNote('C3') === 60);
ok('G4 = 79', parseNote('G4') === 79, parseNote('G4'));
ok('A4 = 81', parseNote('A4') === 81, parseNote('A4'));
ok('F#4 == Gb4', parseNote('F#4') === parseNote('Gb4'));
ok('C-2 = 0 (lowest)', parseNote('C-2') === 0);
ok('G8 = 127 (highest)', parseNote('G8') === 127);
ok('G#8 out of range', parseNote('G#8') === null);
ok('lowercase accepted', parseNote('c3') === 60);
ok('junk rejected', ['H3', '', 'C', '12', 'C99'].every(v => parseNote(v) === null));
ok('roundtrip 0..127', [...Array(128).keys()].every(i => parseNote(formatNote(i)) === i));

/* -------------------------------------------------------------- intervals -- */
console.log('\n-- unit conversion --');
ok('120 BPM = 0.5s', near(intervalFor(120, 'bpm'), 0.5));
ok('2 Hz = 0.5s', near(intervalFor(2, 'hz'), 0.5));
ok('0.5 seconds = 0.5s', near(intervalFor(0.5, 'sec'), 0.5));
ok('all three units agree', near(intervalFor(120, 'bpm'), intervalFor(2, 'hz'))
                         && near(intervalFor(2, 'hz'), intervalFor(0.5, 'sec')));

/* ------------------------------------------------------- worked example --- */
console.log('\n-- README worked example --');
const cfg = normalise({
  length: 30, tempo: 120, timeSignature: '4/4', velocity: 100,
  rates: [
    { name: 'Births', speed: 4.3, unit: 'sec', note: 'C3', channel: 1, offset: 0,   enabled: true },
    { name: 'Orbits', speed: 92,  unit: 'bpm', note: 'G4', channel: 2, offset: 1.5, enabled: true },
  ],
});
const sched = buildSchedule(cfg);
const [births, orbits] = sched.tracks;

ok('Births: 7 notes', births.count === 7, births.count);
ok('Births: 0, 4.3 … 25.8', births.pulses.map(p => +p.time.toFixed(4)).join(',')
   === '0,4.3,8.6,12.9,17.2,21.5,25.8');
ok('Births: auto length 2.15s', near(births.noteLength, 2.15));
ok('Orbits: 44 notes', orbits.count === 44, orbits.count);
ok('Orbits: interval 60/92', near(orbits.interval, 60 / 92));
ok('Orbits: first pulse at offset 1.5s', near(orbits.pulses[0].time, 1.5));
ok('Orbits: last pulse 29.543s', near(orbits.pulses.at(-1).time, 29.5434783, 1e-6),
   orbits.pulses.at(-1).time);
ok('total 51 notes', sched.totalNotes === 51, sched.totalNotes);
ok('nothing past the track end', sched.tracks.every(t =>
   t.pulses.every(p => p.time < 30 && p.time + p.duration <= 30 + 1e-9)));
ok('no accumulated float drift', near(orbits.pulses[43].time, 1.5 + 43 * (60 / 92), 1e-9));

/* ------------------------------------------------------------ edge cases -- */
console.log('\n-- edge cases --');
const one = (over) => buildSchedule(normalise(over)).tracks[0];
ok('interval longer than track -> 1 note',
   one({ length: 10, rates: [{ speed: 60, unit: 'sec', note: 'C3' }] }).count === 1);
ok('negative offset drops pre-zero pulses',
   one({ length: 10, rates: [{ speed: 4, unit: 'sec', note: 'C3', offset: -2.5 }] })
     .pulses.map(p => +p.time.toFixed(2)).join(',') === '1.5,5.5,9.5');
ok('offset past the end -> 0 notes',
   one({ length: 10, rates: [{ speed: 1, unit: 'sec', note: 'C3', offset: 20 }] }).count === 0);
const tr = one({ length: 10, rates: [{ speed: 4, unit: 'sec', note: 'C3' }] });
ok('final note truncated at track end', near(tr.pulses.at(-1).time + tr.pulses.at(-1).duration, 10));
ok('note length capped at the interval',
   one({ length: 10, rates: [{ speed: 1, unit: 'sec', note: 'C3', length: 5 }] })
     .pulses[0].duration === 1);
ok('zero speed blocks export',
   !!exportBlocker(buildSchedule(normalise({ length: 10, rates: [{ speed: 0, unit: 'bpm', note: 'C3' }] }))));
ok('bad note blocks export',
   !!exportBlocker(buildSchedule(normalise({ length: 10, rates: [{ speed: 1, unit: 'hz', note: 'Q9' }] }))));
ok('all rates disabled blocks export',
   !!exportBlocker(buildSchedule(normalise({ length: 10, rates: [{ speed: 1, unit: 'hz', note: 'C3', enabled: false }] }))));

/* ------------------------------------------------------------------- url -- */
console.log('\n-- url roundtrip --');
ok('config survives encode/decode', JSON.stringify(normalise(decode(encode(cfg)))) === JSON.stringify(cfg));
ok('hash is url-safe', /^[A-Za-z0-9_-]+$/.test(encode(cfg)));
console.log(`        (${encode(cfg).length} characters)`);

/* ------------------------------------------------------------------ midi -- */
function parseMidi(b) {
  let p = 0;
  const str = (n) => { const s = String.fromCharCode(...b.slice(p, p + n)); p += n; return s; };
  const u32 = () => { const v = (b[p] << 24) | (b[p+1] << 16) | (b[p+2] << 8) | b[p+3]; p += 4; return v >>> 0; };
  const u16 = () => { const v = (b[p] << 8) | b[p+1]; p += 2; return v; };
  const vlq = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80); return v; };

  if (str(4) !== 'MThd') throw new Error('missing MThd');
  if (u32() !== 6) throw new Error('bad header length');
  const format = u16(), ntrks = u16(), division = u16();

  const tracks = [];
  for (let t = 0; t < ntrks; t++) {
    if (str(4) !== 'MTrk') throw new Error(`missing MTrk at track ${t}`);
    const len = u32();          // read the length before using p
    const end = p + len;
    const evs = [];
    let tick = 0, running = null, name = null, tempo = null, timeSig = null, eot = false;
    while (p < end) {
      tick += vlq();
      let status = b[p];
      if (status & 0x80) { p++; running = status; } else { status = running; }
      if (status === 0xff) {
        const type = b[p++], n = vlq(), data = b.slice(p, p + n); p += n;
        if (type === 0x03) name = String.fromCharCode(...data);
        if (type === 0x51) tempo = (data[0] << 16) | (data[1] << 8) | data[2];
        if (type === 0x58) timeSig = [data[0], 2 ** data[1]];
        if (type === 0x2f) { eot = true; evs.push({ tick, type: 'eot' }); }
      } else {
        const hi = status & 0xf0, ch = status & 0x0f;
        if (hi === 0x90 || hi === 0x80) {
          const note = b[p++], vel = b[p++];
          evs.push({ tick, type: (hi === 0x90 && vel > 0) ? 'on' : 'off', note, vel, ch });
        } else if (hi === 0xc0 || hi === 0xd0) p += 1;
        else p += 2;
      }
    }
    if (p !== end) throw new Error(`track ${t} overran its chunk`);
    if (!eot) throw new Error(`track ${t} has no end-of-track`);
    tracks.push({ name, tempo, timeSig, evs });
  }
  if (p !== b.length) throw new Error(`${b.length - p} trailing bytes`);
  return { format, ntrks, division, tracks };
}

console.log('\n-- midi file (parsed back independently) --');
const m = parseMidi(writeMidi(sched, cfg));
const TPS = 960 * 120 / 60;

ok('format 1, 960 PPQ', m.format === 1 && m.division === 960);
ok('3 tracks: conductor + 2 rates', m.ntrks === 3);
ok('conductor carries no notes', m.tracks[0].evs.every(e => e.type === 'eot'));
ok('tempo 500000us = 120 BPM', m.tracks[0].tempo === 500000, m.tracks[0].tempo);
ok('time signature 4/4', JSON.stringify(m.tracks[0].timeSig) === '[4,4]');
ok('track names', m.tracks.map(t => t.name).join('|') === 'datarates|Births|Orbits');
ok('channels 0 and 1', m.tracks[1].evs[0].ch === 0 && m.tracks[2].evs[0].ch === 1);
ok('notes 60 (C3) and 79 (G4)', m.tracks[1].evs[0].note === 60 && m.tracks[2].evs[0].note === 79);
ok('velocity 100', m.tracks[1].evs[0].vel === 100);
ok('7 + 44 note-ons', m.tracks[1].evs.filter(e => e.type === 'on').length === 7
                   && m.tracks[2].evs.filter(e => e.type === 'on').length === 44);
ok('every note-on has a note-off', m.tracks.slice(1).every(t =>
   t.evs.filter(e => e.type === 'on').length === t.evs.filter(e => e.type === 'off').length));

const ticks = m.tracks[1].evs.filter(e => e.type === 'on').map(e => e.tick);
const trueTimes = [0, 4.3, 8.6, 12.9, 17.2, 21.5, 25.8];
ok('ticks land on true seconds',
   JSON.stringify(ticks) === JSON.stringify(trueTimes.map(t => Math.round(t * TPS))));
const worst = Math.max(...ticks.map((t, i) => Math.abs(t / TPS - trueTimes[i])));
ok(`timing error under 0.3ms (worst ${(worst * 1000).toFixed(3)}ms)`, worst * 1000 < 0.3);
ok('all tracks end at exactly 30.000s',
   m.tracks.every(t => Math.abs(t.evs.find(e => e.type === 'eot').tick / TPS - 30) < 1e-3));

const noOverlap = (track) => {
  let open = 0, max = 0, negative = false;
  for (const e of [...track.evs].sort((a, b) => a.tick - b.tick || (a.type === 'off' ? -1 : 1))) {
    if (e.type === 'on') { open++; max = Math.max(max, open); }
    if (e.type === 'off') { open--; if (open < 0) negative = true; }
  }
  return max <= 1 && !negative && open === 0;
};
ok('no stuck or overlapping notes', m.tracks.slice(1).every(noOverlap));

// Note length deliberately longer than the interval — the worst case for hangs.
const stress = normalise({ length: 5, tempo: 140, rates: [{ name: 'Fast', speed: 10, unit: 'hz', note: 'C3', length: 3 }] });
const sm = parseMidi(writeMidi(buildSchedule(stress), stress));
ok('10Hz over 5s = 50 notes', sm.tracks[1].evs.filter(e => e.type === 'on').length === 50);
ok('still no overlap when length > interval', noOverlap(sm.tracks[1]));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
