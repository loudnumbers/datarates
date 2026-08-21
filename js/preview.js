/* Web Audio audition of the same pulse list the MIDI file gets.
   An approximation for hearing polyrhythms, not an instrument. */

import { midiToFreq } from './notes.js';

const LOOKAHEAD_MS = 25;    // how often the scheduler wakes
const HORIZON_S = 0.15;     // how far ahead it schedules
const CLOCK_MS = 25;        // playhead refresh
const CLOCK_MS_REDUCED = 250;
const PEAK = 0.22;
const ATTACK = 0.005;

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Preview {
  constructor({ onTick, onEnd }) {
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.ctx = null;
    this.playing = false;
    this._voices = new Set();
  }

  play(events, duration) {
    this.stop();

    // Browsers only allow this from a user gesture, which is where we are.
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const comp = this.ctx.createDynamicsCompressor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(comp).connect(this.ctx.destination);

    this.events = events;
    this.duration = duration;
    this.next = 0;
    this.startTime = this.ctx.currentTime + 0.08;
    this.playing = true;

    this._lastClock = -Infinity;
    this._timer = setInterval(() => this._schedule(), LOOKAHEAD_MS);
    this._schedule();
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }

    for (const v of this._voices) { try { v.stop(); } catch {} }
    this._voices.clear();

    if (this.master) {
      try { this.master.disconnect(); } catch {}
      this.master = null;
    }
    if (this.playing) {
      this.playing = false;
      this.onTick?.(0, this.duration ?? 0);
    }
  }

  _schedule() {
    const until = this.ctx.currentTime + HORIZON_S;

    while (this.next < this.events.length &&
           this.startTime + this.events[this.next].time < until) {
      this._voice(this.events[this.next]);
      this.next++;
    }

    this._updateClock();

    const elapsed = this.ctx.currentTime - this.startTime;
    if (this.next >= this.events.length && elapsed >= this.duration) {
      this.stop();
      this.onEnd?.();
    }
  }

  /* Driven by the scheduler rather than requestAnimationFrame: rAF stops in a
     backgrounded tab while the audio keeps going, which would freeze the
     playhead mid-track. */
  _updateClock() {
    const now = this.ctx.currentTime;
    const step = (reducedMotion() ? CLOCK_MS_REDUCED : CLOCK_MS) / 1000;
    if (now - this._lastClock < step) return;
    this._lastClock = now;

    const elapsed = Math.min(this.duration, Math.max(0, now - this.startTime));
    this.onTick?.(elapsed, this.duration);
  }

  _voice(event) {
    const t = this.startTime + event.time;
    // Short enough to read as a pulse, but scaled to the note's real length so
    // the preview reflects what the file actually contains.
    const dur = Math.max(0.03, Math.min(event.duration, 1.2));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = midiToFreq(event.note);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(PEAK, t + ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);

    this._voices.add(osc);
    osc.onended = () => this._voices.delete(osc);
  }

}
