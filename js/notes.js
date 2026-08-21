/* Note name <-> MIDI number. Middle C = C3 = 60 (see STYLE.md / README.md). */

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CLASSES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** "C3" | "F#4" | "Bb2" -> 0..127, or null if unparseable / out of range. */
export function parseNote(input) {
  if (typeof input !== 'string') return null;
  const m = /^\s*([A-Ga-g])([#b♯♭sS]*)\s*(-?\d{1,2})\s*$/.exec(input);
  if (!m) return null;

  let semitones = CLASSES[m[1].toLowerCase()];
  for (const ch of m[2]) semitones += (ch === 'b' || ch === '♭') ? -1 : 1;

  const midi = (parseInt(m[3], 10) + 2) * 12 + semitones;
  return midi >= 0 && midi <= 127 ? midi : null;
}

/** 60 -> "C3". Always spells with sharps. */
export function formatNote(midi) {
  return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 2);
}

/** Equal temperament, A4 = 440Hz. */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
