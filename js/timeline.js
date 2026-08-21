/* Draws the pulse layout: one lane per playable rate, in source order, so the
   first rate is the top lane. Canvas rather than DOM nodes — a fast rate can
   put tens of thousands of pulses on screen, which canvas handles and ten
   thousand elements would not.
   The playhead is a separate DOM element on top, so playback never has to
   redraw this. */

const LANE_H = 14;
const LANE_GAP = 3;
const PULSE_ALPHA = 0.45;

export const lanesOf = (schedule) =>
  schedule.tracks.filter(t => !t.error && t.enabled && t.count > 0);

export function timelineHeight(schedule) {
  const n = Math.max(1, lanesOf(schedule).length);
  return n * LANE_H + (n - 1) * LANE_GAP;
}

export function drawTimeline(canvas, schedule) {
  const lanes = lanesOf(schedule);
  const width = canvas.clientWidth;
  if (!width) return;                      // not laid out yet

  const height = timelineHeight(schedule);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const css = getComputedStyle(document.documentElement);
  const laneColour = css.getPropertyValue('--c-fill-subtle').trim();
  const pulseColour = css.getPropertyValue('--c-accent').trim();
  const duration = schedule.trackLength;

  // Set before the early return below, or an unplayable config keeps
  // announcing the rates it used to have.
  canvas.setAttribute('aria-label', describe(lanes, duration));

  if (!lanes.length) {                     // nothing playable: one empty lane
    ctx.fillStyle = laneColour;
    ctx.fillRect(0, 0, width, LANE_H);
    return;
  }

  lanes.forEach((track, i) => {
    const y = i * (LANE_H + LANE_GAP);

    ctx.globalAlpha = 1;
    ctx.fillStyle = laneColour;
    ctx.fillRect(0, y, width, LANE_H);

    // Each pulse spans its note length, so you can see duty cycle as well as
    // placement. Minimum 1px keeps very short notes visible.
    ctx.globalAlpha = PULSE_ALPHA;
    ctx.fillStyle = pulseColour;
    for (const pulse of track.pulses) {
      const x = (pulse.time / duration) * width;
      const w = Math.max(1, (pulse.duration / duration) * width);
      ctx.fillRect(Math.round(x), y, w, LANE_H);
    }
  });

  ctx.globalAlpha = 1;
}

function describe(lanes, duration) {
  if (!lanes.length) return 'Timeline: nothing to play.';
  const parts = lanes.map(t => `${t.name}, ${t.count} pulse${t.count === 1 ? '' : 's'}`);
  return `Timeline over ${duration.toFixed(1)} seconds, top to bottom: ${parts.join('; ')}.`;
}
