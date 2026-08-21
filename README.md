# datarates

A small web tool for turning rates into MIDI.

Lives at **datarates.loudnumbers.net**.

You give it one or more rates — "42 beats per minute", "0.7 Hz", "one every 4.3
seconds" — plus a track length and a MIDI note for each rate. It writes a MIDI
file of exactly that length in which each rate pulses at its own speed, on its
own track. You can audition it in the browser before you download.

It exists for data sonification: real-world rates ("a child is born every 4.3
seconds", "the ISS orbits every 92 minutes") are awkward to hand-enter into a
DAW because they almost never divide neatly into bars. This does the arithmetic
and hands you a file you can drop straight onto a timeline.

---

## Table of contents

- [What it does](#what-it-does)
- [The model](#the-model)
- [Timing](#timing)
- [The MIDI file](#the-midi-file)
- [Preview playback](#preview-playback)
- [Saving and sharing](#saving-and-sharing)
- [Worked example](#worked-example)
- [Interface](#interface)
- [Technical approach](#technical-approach)
- [Project structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Limits and edge cases](#limits-and-edge-cases)
- [Open decisions](#open-decisions)
- [Licence](#licence)

---

## What it does

1. You set up a **track**: a length in seconds and a tempo in BPM.
2. You add one or more **rates**. Each rate has a speed, a MIDI note, an offset
   and a few other properties.
3. The app computes when every pulse falls, in seconds, across the track.
4. It writes a standard MIDI file and offers it as a download.

There is no server: everything happens in the browser and nothing is uploaded to the cloud.

---

## The model

### Track settings (global)

| Setting | Unit | Default | Notes |
|---|---|---|---|
| Track length | seconds | `60` | The exact duration of the exported file. |
| Tempo | BPM | `120` | Written as a tempo meta event so the DAW grid is sensible. Does **not** affect where pulses land — see [Timing](#timing). |
| Time signature | — | `4/4` | Written as a meta event. Cosmetic. |
| Velocity | 0–127 | `100` | One value for every note in the file. |

### Rate settings (one row per rate)

| Setting | Unit | Default | Notes |
|---|---|---|---|
| Name | text | `Rate 1` | Becomes the MIDI track name. |
| Speed | number | — | Interpreted according to the unit below. |
| Unit | BPM / Hz / seconds | `BPM` | See conversion table. |
| Note | note name | `C3` | e.g. `C3`, `F#4`, `Bb2`. One note per rate. |
| Channel | 1–16 | next free | Defaults to 1, 2, 3… but is editable, so several rates can share an instrument. |
| Offset | seconds | `0` | Shifts the whole rate later in time. |
| Note length | seconds | *auto* | Auto = 50% of the rate's interval. Type a value in seconds to override. |
| Enabled | checkbox | on | Lets you mute a rate without deleting it. |

### Unit conversion

Every rate is converted to an **interval** — the gap in seconds between
consecutive pulses — before anything else happens.

| Unit | Interval in seconds |
|---|---|
| BPM (beats per minute) | `60 / speed` |
| Hz (pulses per second) | `1 / speed` |
| Seconds between pulses | `speed` |

So 120 BPM, 2 Hz and 0.5 seconds are three ways of writing the same rate.

The UI shows the derived interval next to each row, so you can always see what
you've actually asked for.

---

## Timing

**Pulses are placed at their true position in seconds, not snapped to the
musical grid.** This is the central design decision and it's deliberate.

A rate of 0.7 Hz against a 120 BPM track produces pulses at 0s, 1.428…s,
2.857…s and so on. None of those are beats. If the app quantised them to the
nearest 16th note the rate would no longer be 0.7 Hz, which defeats the point
of the tool. So it doesn't.

Instead the file uses a high tick resolution — **960 ticks per quarter note** —
and each pulse is written at the tick nearest its true time:

```
ticksPerSecond = PPQ * tempoBPM / 60
tick           = round(timeInSeconds * ticksPerSecond)
```

At 960 PPQ and 120 BPM that's 1920 ticks per second, so the worst-case rounding
error is about 0.26 milliseconds — inaudible, and small enough that it never
accumulates into audible drift over a long track.

The practical consequence: **notes will land off-grid when you open the file in
a DAW.** That is correct behaviour, not a bug. Don't quantise the result.

The track tempo exists so that the DAW's bars-and-beats ruler lines up with
something meaningful, and so the tick values in the file mean what they should.
Changing the tempo changes the tick numbers but **not** the wall-clock times of
the pulses.

### Where pulses fall

For a rate with interval `i` and offset `o`, pulses occur at:

```
t = o + (n * i)   for n = 0, 1, 2, ...   while t < trackLength
```

The first pulse is at `t = o`. A rate with no offset fires at time zero, so
rates with zero offset all start together and then phase apart — which is
usually what you want to hear.

Offsets may be negative. A pulse computed to a time before `0` is dropped, so a
negative offset effectively starts the rate part-way through its cycle.

---

## The MIDI file

- **Format:** Standard MIDI File, **Type 1** (multi-track), 960 PPQ.
- **Track 0:** a conductor track carrying the tempo and time-signature meta
  events and the file name. No notes.
- **Tracks 1..n:** one per enabled rate, in the order shown in the UI. Each
  carries a track-name meta event and its note events on the rate's channel.
- **Notes:** one note-on / note-off pair per pulse, at the fixed global
  velocity. Note-off uses velocity 0.
- **Length:** every track ends with an end-of-track meta event at the tick
  corresponding to the track length, so the file is exactly as long as
  requested even if a rate's last pulse falls well before the end.

### Note names

Note names are converted to MIDI numbers with **middle C = C3 = 60**. Both
sharps and flats are accepted (`F#4` and `Gb4` are the same note). The UI shows
the resulting MIDI number next to the field so there's no ambiguity about
octave numbering.

Valid range is `C-2` (0) to `G8` (127).

### Note length and truncation

A rate's note length defaults to 50% of its interval, so slow rates
automatically get long notes and fast rates get short ones. Typing a value into
the field overrides this with a fixed length in seconds for that rate.

If a note's note-off would fall past the end of the track, **it is pulled back
to exactly the track length**. The pulse still sounds; it's just cut short. The
file never runs longer than the stated length.

Overlapping notes on the same channel and pitch — possible if you set a note
length longer than the interval — are handled by ending the previous note one
tick before the next begins, so the file never contains a stuck note.

---

## Preview playback

A play/stop control auditions the arrangement through the Web Audio API before
you commit to a download.

- Each pulse is a short synthesised blip: a triangle oscillator with a
  fast attack and short decay, pitched to the rate's MIDI note using
  `440 * 2 ** ((note - 69) / 12)`.
- Events are scheduled ahead against `AudioContext.currentTime` in a rolling
  lookahead window, so timing is sample-accurate and unaffected by page jank.
- Playback runs once through the track length and stops. A playhead crosses the
  timeline and a clock readout shows progress.
- The preview is an approximation for auditioning polyrhythms — it is not
  trying to sound like your instruments. The MIDI file is the deliverable.

The audio context is only created on first user interaction, as browsers
require. This happens when the user clicks the play button.

---

## Saving and sharing

**The URL is the save file.** The full configuration is encoded into the URL
hash and the address bar updates as you edit. Bookmark it, paste it to someone,
or reload it — you get the same setup back.

```
datarates.loudnumbers.net/#c=<base64url-encoded config>
```

The encoded payload is a compact JSON array (positional fields rather than
named keys, to keep URLs short), base64url-encoded so it survives copy-paste
and messaging apps. Loading a URL with no hash, or an unparseable one, falls
back to a sensible default configuration and shows a non-blocking notice.

There is no localStorage, no account, no analytics and no server.

---

## Worked example

A 30-second track at 120 BPM, velocity 100, with two rates:

| Name | Speed | Unit | Note | Channel | Offset | Note length |
|---|---|---|---|---|---|---|
| Births | 4.3 | seconds | C3 | 1 | 0 | auto |
| Orbits | 92 | BPM | G4 | 2 | 1.5 | auto |

**Births** — interval 4.3s, note length 2.15s. Pulses at 0, 4.3, 8.6, 12.9,
17.2, 21.5, 25.8s. That's 7 notes; the next would be at 30.1s, past the end.

**Orbits** — interval `60 / 92` = 0.652s, note length 0.326s. Pulses at 1.5,
2.152, 2.804, 3.456… continuing to 29.543s. That's 44 notes — the next
would fall at 30.196s, past the end.

The exported file has three tracks — a conductor track, "Births" on channel 1,
"Orbits" on channel 2 — and runs exactly 30 seconds.

---

## Interface

A single page, no routing, no modals.

```
┌─────────────────────────────────────────────────────┐
│  datarates                                          │
│  Turn rates into MIDI.                              │
├─────────────────────────────────────────────────────┤
│  TRACK                                              │
│  Length [ 60 ] s   Tempo [ 120 ] BPM                │
│  Time sig [ 4/4 ]  Velocity [ 100 ]                 │
├─────────────────────────────────────────────────────┤
│  RATES                                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ ☑ [Births    ] [4.3][seconds ▾]  = every 4.3s │  │
│  │   Note [C3] (60)  Ch [1]                      │  │
│  │   Offset [0] s    Length [auto] s     7 notes │  │
│  │                                            ✕  │  │
│  └───────────────────────────────────────────────┘  │
│  [ + Add rate ]                                     │
├─────────────────────────────────────────────────────┤
│  [ ▶ Preview ]            [ ↓ Download MIDI ]       │
│  51 notes across 2 rates · 30.0s                    │
└─────────────────────────────────────────────────────┘
```

Principles:

- **Everything is live.** The derived interval, the note number and the note
  count for each rate update as you type. No "calculate" button.
- **Nothing is destructive without recovery.** Deleting a rate offers an undo;
  the URL hash means a reload never loses work.
- **Invalid input is explained inline**, not rejected silently. A speed of `0`,
  an unparseable note name or a channel outside 1–16 marks the field and
  disables export with a reason.
- **Responsive down to phone width.** Rate rows stack rather than scroll
  horizontally.
- **Keyboard accessible.** Every control is reachable and labelled; the page
  works without a pointer.
- **Respects `prefers-color-scheme`** and `prefers-reduced-motion`.

---

## Technical approach

**No build step.** The site is plain HTML, CSS and ES modules served as-is.
There is no `package.json`, no `node_modules`, no bundler and no transpilation.
Editing means opening a file and saving it; deploying means uploading the
folder. This is a deliberate trade for longevity — the tool should still be
editable in ten years without archaeology on a toolchain.

**No dependencies.** The MIDI writer is a small local module rather than a
vendored library. A Standard MIDI File is a simple binary format — a header
chunk, one chunk per track, variable-length delta times, and a handful of
event types — and writing one takes roughly 150 lines. Hand-rolling it keeps
the repo dependency-free and means the trickiest part of the app is code we can
read, rather than a minified bundle we can't.

The output is validated against the SMF specification and test-opened in
Ableton, Logic, Reaper and Ardour before release.

**Modern browsers only.** ES modules, `Uint8Array`, `Blob`, the Web Audio API
and CSS custom properties are all assumed. No polyfills, no IE-era fallbacks.

---

## Project structure

```
datarates/
├── index.html          Markup and layout
├── assets/
│   └── loud-numbers-logo.svg
├── css/
│   └── style.css       All styling; custom properties for theming
├── fonts/              Self-hosted Roboto (see fonts/README.md)
├── js/
│   ├── app.js          Entry point — wires UI to state
│   ├── state.js        Config model, defaults, validation
│   ├── url.js          Encode/decode config to and from the URL hash
│   ├── notes.js        Note name ↔ MIDI number conversion
│   ├── schedule.js     Rates → list of pulses in seconds
│   ├── midi.js         Pulses → Standard MIDI File bytes
│   ├── preview.js      Web Audio playback
│   ├── timeline.js     Pulses → the canvas timeline
│   └── tooltip.js      The (i) disclosure popovers
├── tools/
│   ├── test.mjs        Arithmetic and MIDI-byte tests
│   ├── test.sh         Test runner
│   └── contrast.py     Re-checks every colour pair in STYLE.md
├── README.md
├── STYLE.md
└── LICENSE
```

The interesting boundary is `schedule.js`. It turns the configuration into a
plain list of `{ time, duration, note, channel, track }` objects in seconds,
with no knowledge of MIDI or audio. Both `midi.js` and `preview.js` consume
that same list, which is what keeps the preview honest — it plays the same
data the file contains.

---

## Development

There is no build. Because the app uses ES modules, opening `index.html`
directly with `file://` will fail on CORS, so serve the folder over HTTP:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Edit a file, reload the page.

Any static file server will do — `npx serve`, `caddy file-server`, whatever's
to hand. The only requirement is that `.js` files are served with a JavaScript
MIME type.

### Tests

```bash
./tools/test.sh
```

51 checks covering note-name conversion, unit conversion, pulse placement, the
edge cases listed below, URL round-tripping, and the MIDI bytes themselves. The
MIDI section parses the generated file back with an independent reader written
against the SMF spec, rather than trusting the writer to mark its own homework —
worth having, since the writer is hand-rolled.

The runner copies the sources to a temp directory with a one-line
`package.json`, because Node would otherwise treat the buildless `js/*.js` as
CommonJS and refuse to import them. Nothing is added to the repo and there is
still nothing to install.

### Checking colours

After changing any colour token in `css/style.css`, re-run the contrast check so
the table in [STYLE.md](STYLE.md#contrast-reference) stays true:

```bash
python3 tools/contrast.py
```

It exits non-zero if any pairing drops below its WCAG threshold. Note that
colours have to clear their threshold against *two* backgrounds — the page and
the `--c-fill-subtle` rate rows.

---

## Deployment

Upload the repository contents to any static host and point
`datarates.loudnumbers.net` at it. There is no build command and no output
directory — what's in the repo is what gets served.

---

## Limits and edge cases

- **Track length** is capped at 3600 seconds (one hour).
- **Rate count** is capped at 16, matching the number of MIDI channels.
- **Note count.** A fast rate over a long track can produce a great many notes —
  20 Hz over an hour is 72,000. Above 10,000 notes on a single rate the app
  warns before exporting; above 100,000 total it refuses, since the file would
  be unusable in most DAWs.
- **Speeds** must be positive and non-zero. `0 BPM` and `0 Hz` are rejected with
  an inline message rather than producing an infinite interval.
- **An offset beyond the track length** produces a rate with no pulses. This is
  allowed and flagged in the row's note count ("0 notes"), not treated as an
  error.
- **A disabled or empty rate** is skipped entirely and gets no track in the
  file. Exporting with no enabled rates is blocked.
- **Very slow rates** — an interval longer than the track length — produce
  exactly one note, at the offset. That's correct.
- **Floating point.** Pulse times are computed as `offset + n * interval`
  rather than by repeated addition, so error doesn't accumulate across
  thousands of pulses.

---

## Open decisions

Things settled well enough to build, but worth revisiting once the tool is in
use:

- **Octave numbering.** Middle C is C3 here (Yamaha/Logic convention). Some
  users will expect C4 (scientific pitch notation). This is a single constant in
  `notes.js` and could become a preference if it causes confusion.
- **Auto note length.** 50% of the interval is a guess that sounds reasonable.
  It may want to be a global preference rather than a hard-coded constant.
- **Quantisation.** Deliberately absent. If real use turns up cases where
  snapping to the grid is genuinely wanted, it belongs as an explicit opt-in
  per rate — never a default.
- **Multiple notes per rate.** Each rate plays a single note. Chords, or
  cycling through a list of notes on successive pulses, are the obvious next
  feature if the tool proves useful.
- **Vendored library fallback.** If the hand-rolled MIDI writer turns out to
  have compatibility problems in a DAW we care about, the fallback is to vendor
  a copy of `@tonejs/midi`'s UMD build into `js/vendor/` — still no build step,
  just a dependency we don't maintain.

---

## Licence

GPL-3.0. See [LICENSE](LICENSE).

Built by [Loud Numbers](https://loudnumbers.net).
