# fonts

Roboto, self-hosted rather than loaded from Google Fonts — see the reasoning in
[../STYLE.md](../STYLE.md#typography).

```
roboto-400.woff2   Regular — body text, input values, hints
roboto-500.woff2   Medium  — field labels, button text
roboto-700.woff2   Bold    — page title, section headings, error messages
```

Latin subset, woff2 only, about 22 KB each. That's the whole typographic system:
no italics, no other weights.

These carry tabular figures, which the site relies on — `font-variant-numeric:
tabular-nums` is what keeps the live readouts from jittering as they update, and
is why there's no monospace font anywhere. If you ever replace these files,
check that digits still render equal-width before shipping.

Don't commit the full family download or the source `.zip` — `.gitignore`
excludes both.
