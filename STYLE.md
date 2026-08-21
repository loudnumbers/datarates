# datarates — style guide

The visual system for **datarates.loudnumbers.net**. Loud Numbers palette,
Roboto throughout, sans-serif only, flat and unadorned.

This file is the source of truth. The token block in
[Design tokens](#design-tokens) gets copied verbatim into `css/style.css` when
the site is built — change it here first.

---

## Contents

- [Principles](#principles)
- [Colour](#colour)
- [Design tokens](#design-tokens)
- [Contrast reference](#contrast-reference)
- [Typography](#typography)
- [Numbers](#numbers)
- [The logo](#the-logo)
- [Space and layout](#space-and-layout)
- [Components](#components)
- [Motion](#motion)
- [Dark mode](#dark-mode)
- [What this system does not have](#what-this-system-does-not-have)

---

## Principles

1. **Flat.** No shadows, no gradients, no bevels, no glass, no texture.
   Hierarchy comes from colour, weight, size and space — never from depth.
2. **Unadorned.** If an element can be removed without losing meaning, remove
   it. Borders over boxes, labels over icons, text over ornament.
3. **Three colours.** Pink, blue, cream. Everything else is a mix of those, and
   every mix has to earn its place.
4. **Sans-serif only.** Roboto for all text. No serif, no display face, no
   fixed-width font anywhere on the site.
5. **The tool is the interface.** This is a small utility, not a landing page.
   Nothing decorative should compete with the controls.

---

## Colour

### Brand

| Name | Hex | Role |
|---|---|---|
| Cream | `#FFFDF1` | The page. Default background in light mode, default text in dark mode. |
| Blue | `#173561` | Text, borders, structure. The workhorse. |
| Pink | `#FF7272` | Accent. Primary action, active states, the playhead. |

### The one hard rule

**Pink is a fill colour, never a text colour.**

Pink on cream is 2.6:1 — well below the 4.5:1 needed for readable text. So pink
never carries words. It fills buttons, marks the playhead, indicates an active
row. Text sitting *on* a pink fill is blue (4.6:1, passes AA).

This one rule keeps the palette accessible without any case-by-case judgement.

### Derived neutrals

All neutrals are the brand blue mixed into cream at fixed percentages. No new
hues, so the page stays warm and on-brand rather than drifting grey.

| Token | Hex | Mix | Use |
|---|---|---|---|
| `--c-ink` | `#173561` | blue 100% | Body text, headings, input text |
| `--c-ink-muted` | `#516785` | blue 75% | Labels, hints, derived readouts |
| `--c-border` | `#74859B` | blue 60% | Input borders, meaningful boundaries |
| `--c-divider` | `#B9C1C6` | blue 30% | Hairline rules. Decorative only |
| `--c-fill-subtle` | `#ECEDE6` | blue 8% | Row hover, grouped panels |
| `--c-bg` | `#FFFDF1` | cream | The page |

### The one derived state colour

| Token | Hex | Use |
|---|---|---|
| `--c-error` | `#A32E2E` | Invalid input, blocked export |

This is **not a brand colour** — it's a functional signal, deliberately kept in
the pink hue family so it reads as related rather than imported. It is the only
colour on the site outside the palette, and it earns its place because brand
pink can't legibly carry error text.

There is no success colour. Nothing in this app needs congratulating.

**Colour is never the only signal.** Every error state carries an inline text
message as well; every active state carries a change in weight or border as
well as a fill.

---

## Design tokens

```css
:root {
  /* Brand */
  --c-cream:        #FFFDF1;
  --c-blue:         #173561;
  --c-pink:         #FF7272;

  /* Semantic — light */
  --c-bg:           var(--c-cream);
  --c-fill-subtle:  #ECEDE6;
  --c-ink:          var(--c-blue);
  --c-ink-muted:    #516785;
  --c-ink-on-accent: var(--c-blue);
  --c-accent:       var(--c-pink);
  --c-border:       #7F8FA2;
  --c-border-strong: var(--c-blue);
  --c-divider:      #B9C1C6;
  --c-focus:        var(--c-blue);
  --c-error:        #A32E2E;

  /* Type */
  --font-sans: Roboto, "Helvetica Neue", Arial, sans-serif;
  --fw-regular: 400;
  --fw-medium:  500;
  --fw-bold:    700;

  --fs-xs:   0.75rem;   /* 12px — hints, note counts */
  --fs-sm:   0.875rem;  /* 14px — labels, secondary */
  --fs-base: 1rem;      /* 16px — body, inputs */
  --fs-lg:   1.25rem;   /* 20px — section headings */
  --fs-xl:   1.75rem;   /* 28px — page title */

  --lh-tight: 1.2;
  --lh-base:  1.5;

  /* Space — 4px base */
  --sp-1:  0.25rem;  /*  4px */
  --sp-2:  0.5rem;   /*  8px */
  --sp-3:  0.75rem;  /* 12px */
  --sp-4:  1rem;     /* 16px */
  --sp-6:  1.5rem;   /* 24px */
  --sp-8:  2rem;     /* 32px */
  --sp-12: 3rem;     /* 48px */
  --sp-16: 4rem;     /* 64px */

  /* Form */
  --radius:       2px;
  --border-width: 1px;
  --control-h:    2.5rem;  /* 40px — min touch target with padding */
  --measure:      50rem;   /* 800px — page max width */

  /* Motion */
  --dur: 120ms;
  --ease: ease-out;
}
```

Anything not expressible in these tokens is probably an adornment. Check before
adding one.

---

## Contrast reference

Measured against WCAG 2.1. Keep this table honest — if a pairing isn't listed,
it hasn't been checked.

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| **Light mode** | | | |
| Blue `#173561` | Cream `#FFFDF1` | **11.97:1** | AAA — the default pairing |
| Blue | Subtle fill `#ECEDE6` | **10.37:1** | AAA |
| Muted `#516785` | Cream | **5.67:1** | AA |
| Muted | Subtle fill | **4.91:1** | AA |
| Blue | Pink `#FF7272` | **4.60:1** | AA — text on pink buttons |
| Error `#A32E2E` | Cream | **6.89:1** | AAA |
| Error | Subtle fill | **5.97:1** | AA |
| Border `#74859B` | Cream | **3.69:1** | Passes 3:1 for UI components |
| Border | Subtle fill | **3.20:1** | Passes 3:1 |
| Focus ring (blue) | Cream | **11.97:1** | Passes 3:1 |
| ~~Pink~~ | ~~Cream~~ | 2.60:1 | **Fails.** Never text, never a focus ring, never a meaningful border |
| ~~Cream~~ | ~~Pink~~ | 2.60:1 | **Fails.** Pink buttons take blue text, not cream |
| Divider `#B9C1C6` | Cream | 1.79:1 | Decorative rules only, never a boundary that matters |
| **Dark mode** | | | |
| Cream `#FFFDF1` | Blue page `#173561` | **11.97:1** | AAA |
| Cream | Row fill `#334D72` | **8.41:1** | AAA |
| Muted `#B6C2D6` | Blue page | **6.80:1** | AAA |
| Muted | Row fill | **4.78:1** | AA |
| Blue | Pink | **4.60:1** | AA — unchanged from light mode |
| Error `#FFB0B0` | Blue page | **7.04:1** | AAA |
| Error | Row fill | **4.94:1** | AA |
| Border `#6B80A3` | Blue page | **3.05:1** | Passes 3:1 |
| Focus ring (cream) | Blue page | **11.97:1** | Passes 3:1 |

Every row is machine-checked, not eyeballed — `tools/contrast.py` recomputes the
whole table and exits non-zero if any pairing regresses. Run it after touching a
colour token.

**Both surfaces matter.** The rate rows use `--c-fill-subtle`, so any colour
that can appear inside a rate row has to clear its threshold against *that*
background as well as against the page. Three tokens were darkened during the
build for exactly this reason.

---

## Typography

**Roboto. That's it.** One family, three weights, no exceptions.

```css
font-family: Roboto, "Helvetica Neue", Arial, sans-serif;
```

Self-hosted as `woff2` in `fonts/`, with `font-display: swap`. Not loaded from
Google Fonts: this keeps the site dependency-free, working offline, and free of
a third-party request that has caused GDPR trouble for EU sites.

Ship only what's used — Roboto 400, 500 and 700, Latin subset. Three files,
roughly 45 KB total.

### Weights

| Weight | Token | Use |
|---|---|---|
| 400 Regular | `--fw-regular` | Body text, input values, hints |
| 500 Medium | `--fw-medium` | Field labels, button text, active states |
| 700 Bold | `--fw-bold` | Page title, section headings, error messages |

No light, no black, no italics. Italics in a UI this small read as noise.

### Scale

| Token | Size | Line height | Use |
|---|---|---|---|
| `--fs-xl` | 28px | 1.2 | Page title ("datarates") |
| `--fs-lg` | 20px | 1.2 | Section headings ("Track", "Rates") |
| `--fs-base` | 16px | 1.5 | Body, input values, buttons |
| `--fs-sm` | 14px | 1.5 | Field labels, derived readouts |
| `--fs-xs` | 12px | 1.5 | Hints, note counts, footer |

Five sizes. If something seems to need a sixth, it probably needs different
weight or spacing instead.

### Rules

- **Never centre body text.** Left-aligned, always. Headings too.
- **No uppercase transforms.** `text-transform: uppercase` on labels is a
  decoration and hurts legibility. Use `--fw-medium` instead.
- **No letter-spacing tweaks.** Roboto is spaced correctly already.
- **Measure caps at `--measure` (800px)**, and prose blocks narrower still.

---

## Numbers

The site is full of live numbers — derived intervals, note counts, the playhead
clock. The obvious fix is a monospace font, and this site doesn't use one.

**Use `font-variant-numeric: tabular-nums` instead.** Roboto ships tabular
figures; enabling them gives every digit the same advance width, so values stop
jittering as they update — without a fixed-width typeface anywhere.

```css
.numeric {
  font-variant-numeric: tabular-nums;
}
```

Apply to: number inputs, the interval readout, per-rate note counts, the total
note count, the playhead time, and any table of values.

### Formatting

- **Times** in seconds to one decimal (`4.3s`), or three when precision matters
  (`0.652s`).
- **Recurring decimals** are truncated with an ellipsis, not rounded silently:
  `1.428…s`.
- **Intervals** read as prose next to the field: `= every 4.3s`.
- **Counts** are plain integers with a noun: `7 notes`, not `7`.

---

## The logo

The Loud Numbers wordmark — a two-line lockup reading LOUD /
NUMBERS.

- **Format:** SVG, at `assets/loud-numbers-logo.svg`. Vector only; no PNG
  fallback needed.
- **Colour:** rendered in brand blue `#173561` rather than the black of the
  master artwork, so it sits in the palette on cream. Single-colour, `fill:
  currentColor` so it inverts to cream in dark mode without a second file.
- **Placement:** page header, top-**right**, on the same line as the page
  title and tagline, which sit left. Vertically centred against them.
- **Size:** 120px wide on desktop, 96px on mobile. Height follows the aspect
  ratio; never distort it.
- **Clear space:** at least half the logo's height on every side (`--sp-8` at
  the default size — the header's flex gap). Nothing intrudes.
- **Link:** wraps a link to `https://loudnumbers.net`, with an accessible name
  of "Loud Numbers" (the SVG carries a `<title>`, and the link an `aria-label`).

### Chelsea Market

The wordmark's letterforms come from Chelsea Market, but **it is not a webfont
on this site**. The logo ships as vector artwork with the paths already
outlined, so the typeface never needs loading and the sans-serif-only rule holds
for every piece of live text.

Never set headings, or anything else, in Chelsea Market.

### Don't

- Don't recolour it pink — pink on cream is 2.6:1.
- Don't place it on a pink fill.
- Don't add a shadow, outline, container or rotation.
- Don't rebuild the wordmark as live text.

---

## Space and layout

Single column, centred, max width `--measure` (800px), `--sp-6` (24px) gutters,
`--sp-8` (32px) top and bottom.

The 4px scale does all the work:

| Gap | Token | Between |
|---|---|---|
| 4px | `--sp-1` | A field and its hint |
| 8px | `--sp-2` | A label and its input |
| 12px | `--sp-3` | Fields within a row |
| 16px | `--sp-4` | Rows within a group |
| 24px | `--sp-6` | Groups within a section |
| 32px | `--sp-8` | Between sections |
| 48px | `--sp-12` | Header to first section |

**Sections are separated by space, or by a `--c-divider` rule when space alone
isn't enough.** Not by cards, panels, shadows or coloured boxes. A rate row may
take a `--c-fill-subtle` background to group its fields — that is the only
permitted surface tint.

### Responsive

Two states, one breakpoint at 640px.

- **Above:** rate fields sit on one line, wrapping naturally.
- **Below:** fields stack full-width. Nothing scrolls horizontally, ever.
- Touch targets stay at least 40px (`--control-h`) tall in both.

---

## Components

Everything below is flat: a background, a 1px border, no shadow.

### Buttons

| Variant | Fill | Text | Border |
|---|---|---|---|
| Primary (Download MIDI) | `--c-accent` pink | blue | none |
| Secondary (Preview, Add rate) | transparent | blue | 1px `--c-border-strong` |
| Quiet (Remove rate, Undo) | transparent | `--c-ink-muted` | none, underline on hover |

- Height `--control-h`, horizontal padding `--sp-4`, radius `--radius`,
  weight `--fw-medium`.
- **Hover:** primary darkens ~8%; secondary takes a `--c-fill-subtle`
  background. No lift, no scale, no shadow.
- **Active:** darkens a further ~8%. No transform.
- **Disabled:** `--c-ink-muted` text on `--c-fill-subtle`, `cursor:
  not-allowed`, and always accompanied by visible text explaining why.

### Inputs and selects

- 1px `--c-border`, radius `--radius`, height `--control-h`, padding
  `--sp-2 --sp-3`, background `--c-bg`, text `--c-ink` at `--fs-base`.
- **Labels sit above, always visible.** No placeholder-as-label — placeholders
  vanish on typing and fail people who need them.
- **Hover:** border to `--c-border-strong`.
- **Number inputs** carry `.numeric` and `inputmode="decimal"`.
- **Hints** sit below in `--fs-xs` `--c-ink-muted`.

### Focus

```css
:focus-visible {
  outline: 3px solid var(--c-focus);
  outline-offset: 2px;
}
```

Blue, not pink — pink can't reach 3:1 against cream. The ring is never removed
and never replaced with a colour change alone.

### Validation

Invalid fields get a 2px `--c-error` border and a message below in `--fs-xs`
`--fw-bold` `--c-error`, linked with `aria-describedby` and marked
`aria-invalid`. The message says what's wrong and what to do: *"Speed must be
greater than 0."*

### The playhead

The one place pink does structural work: a 2px vertical pink rule moving across
the timeline during preview. Non-text, decorative, and paired with a numeric
clock readout so the information isn't colour-only.

---

## Motion

Almost none.

- Colour and border transitions on interactive elements: `--dur` (120ms),
  `--ease`. That's the entire animation budget.
- **No** entrance animations, no fades on load, no sliding panels, no spinners,
  no easing curves with personality.
- The playhead moves because it represents time passing — that's information,
  not decoration.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

The playhead becomes a stepped readout rather than a smooth sweep under reduced
motion.

---

## Dark mode

A straight inversion of the palette — blue becomes the page, cream becomes the
ink, pink stays the accent. Follows `prefers-color-scheme` with no toggle.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --c-bg:            var(--c-blue);
    --c-fill-subtle:   #334D72;
    --c-ink:           var(--c-cream);
    --c-ink-muted:     #B6C2D6;
    --c-border:        #6B80A3;
    --c-border-strong: var(--c-cream);
    --c-divider:       #334D72;
    --c-focus:         var(--c-cream);
    --c-error:         #FFB0B0;
    /* --c-accent and --c-ink-on-accent are unchanged:
       pink fill, blue text, 4.6:1 in both modes. */
  }
}
```

The hard rule survives the inversion unchanged — pink is still a fill, still
carries blue text, still never becomes a word. The logo inverts to cream via
`currentColor`.

---

## What this system does not have

Stated plainly so nobody adds them by reflex:

- No monospace font, anywhere. `tabular-nums` covers it.
- No icon set. Text labels. The one exception is a play/stop glyph as inline
  SVG.
- No box-shadows, gradients, or background images.
- No cards. No modals. No tooltips. No toasts.
- No CSS framework, no reset beyond a short `box-sizing` and margin normaliser.
- No colours beyond the three brand colours, their mixes with each other, and
  the single error red.
- No dark/light toggle — the OS decides.
- No animation library.
