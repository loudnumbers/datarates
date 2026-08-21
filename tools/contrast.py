#!/usr/bin/env python3
"""Recompute the contrast table in STYLE.md. Exits non-zero if any pair regresses.

Run after touching a colour token:   python3 tools/contrast.py
"""
import sys

TOKENS = {
    # light
    'cream': '#FFFDF1', 'blue': '#173561', 'pink': '#FF7272',
    'subtle': '#ECEDE6', 'muted': '#516785', 'border': '#74859B',
    'divider': '#B9C1C6', 'error': '#A32E2E',
    # dark
    'd_fill': '#334D72', 'd_muted': '#B6C2D6',
    'd_border': '#6B80A3', 'd_error': '#FFB0B0',
}

# (label, foreground, background, minimum ratio)
PAIRS = [
    ('light', 'blue text on cream',          'blue',     'cream',  4.5),
    ('light', 'blue text on row fill',       'blue',     'subtle', 4.5),
    ('light', 'muted text on cream',         'muted',    'cream',  4.5),
    ('light', 'muted text on row fill',      'muted',    'subtle', 4.5),
    ('light', 'blue text on pink button',    'blue',     'pink',   4.5),
    ('light', 'error text on cream',         'error',    'cream',  4.5),
    ('light', 'error text on row fill',      'error',    'subtle', 4.5),
    ('light', 'input border on cream',       'border',   'cream',  3.0),
    ('light', 'input border on row fill',    'border',   'subtle', 3.0),
    ('light', 'focus ring on cream',         'blue',     'cream',  3.0),
    ('dark',  'cream text on blue page',     'cream',    'blue',   4.5),
    ('dark',  'cream text on row fill',      'cream',    'd_fill', 4.5),
    ('dark',  'muted text on blue page',     'd_muted',  'blue',   4.5),
    ('dark',  'muted text on row fill',      'd_muted',  'd_fill', 4.5),
    ('dark',  'blue text on pink button',    'blue',     'pink',   4.5),
    ('dark',  'error text on blue page',     'd_error',  'blue',   4.5),
    ('dark',  'error text on row fill',      'd_error',  'd_fill', 4.5),
    ('dark',  'input border on blue page',   'd_border', 'blue',   3.0),
    ('dark',  'focus ring on blue page',     'cream',    'blue',   3.0),
]

# Documented as deliberately failing — the reason the "pink is never text" rule exists.
FORBIDDEN = [('pink', 'cream'), ('cream', 'pink')]


def luminance(hex_colour):
    h = hex_colour.lstrip('#')
    channels = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def main():
    failures = []
    mode = None
    for m, label, fg, bg, need in PAIRS:
        if m != mode:
            mode = m
            print(f'\n--- {mode} mode ---')
        r = ratio(TOKENS[fg], TOKENS[bg])
        ok = r >= need
        if not ok:
            failures.append(f'{label}: {r:.2f}:1, needs {need}:1')
        print(f'  {"ok  " if ok else "FAIL"}  {r:5.2f}:1  (min {need})  {label}')

    print('\n--- deliberately unusable ---')
    for fg, bg in FORBIDDEN:
        r = ratio(TOKENS[fg], TOKENS[bg])
        print(f'  {r:5.2f}:1  {fg} on {bg} — below 4.5, which is why pink is never text')
        if r >= 4.5:
            failures.append(f'{fg} on {bg} now passes ({r:.2f}:1) — the "pink is a fill" rule can be revisited')

    if failures:
        print('\n' + str(len(failures)) + ' problem(s):')
        for f in failures:
            print('  - ' + f)
        return 1
    print(f'\nAll {len(PAIRS)} pairs pass.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
