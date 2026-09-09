# Riverside Labs Brand System — implementation reference

Full rationale/visual reference: see the "Riverside Labs Brand System" artifact
(ask Kian for the link if it's not attached). This file is the condensed,
implementation-facing version of the same system — apply these tokens and
rules to the app's UI.

Source lineage: adapted from the UC Riverside Visual Identity Guidelines
(2020) — every color below is a desaturated/deepened/pastel derivative of a
UCR Pantone color, noted in parentheses. Do not use raw UCR blue (#003DA5)
or gold (#FFB81C) anywhere in-app — always the derived value here.

## Which palette applies

- **RaMS Lab app** → use the "RaMS" accent set below.
- **Dark Matter & Neutrino Lab app** → use the "Neutrino" accent set below.
- Both apps share the same neutrals, institutional colors, semantic colors,
  and type system.
- Never mix RaMS and Neutrino accent colors on the same screen. The
  "Core Institutional" blue/sand is the only accent allowed to bridge both
  (e.g. a shared login or account-settings shell).

## Color tokens

Light theme (`:root`):

```css
:root {
  /* Neutrals */
  --ink-900: #17202B;      /* primary text */
  --ink-600: #4C5567;      /* secondary text */
  --line-300: #C6C1B4;     /* borders, dividers */
  --paper-100: #ECEAE3;    /* recessed surface */
  --paper-50:  #F5F4F0;    /* app background */
  --surface: #FFFFFF;

  /* Core Institutional (from UCR 293c / 1235c) */
  --riverside-blue-700: #253C5C;  /* shared primary, dark */
  --riverside-blue-500: #4A6690;  /* links, interactive */
  --riverside-blue-100: #DCE4EE;  /* selected / info fill */
  --riverside-sand-600: #A9884F;  /* rare accent, large type/icons only */
  --riverside-sand-300: #E4D6B8;  /* highlight fill */

  /* RaMS Lab accent (from UCR 293c, shifted toward Extended 368c) */
  --rams-700: #33534F;   /* app bar, dark surfaces */
  --rams-500: #57847F;   /* buttons, active state */
  --rams-150: #DCEAE7;   /* cards, chip fills */

  /* Dark Matter & Neutrino Lab accent (from UCR Extended 577c, toward indigo) */
  --neutrino-700: #363454;
  --neutrino-500: #5D5A87;
  --neutrino-150: #E2E0EC;

  /* Semantic — status & data states, shared by both apps */
  --signal-good: #5E8C74;      /* nominal / passed */
  --signal-watch: #B8925A;     /* needs attention */
  --signal-critical: #A65D57;  /* fault / out of range */
}
```

Dark theme — redefine the same tokens (do not introduce new names):

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink-900: #E7E5DE;
    --ink-600: #A6ACB8;
    --line-300: #3A4048;
    --paper-100: #1F242B;
    --paper-50:  #12151A;
    --surface: #181C22;

    --riverside-blue-700: #B9CCE6;
    --riverside-blue-500: #7C97C1;
    --riverside-blue-100: #22344A;
    --riverside-sand-600: #D2B579;
    --riverside-sand-300: #3C3524;

    --rams-700: #A9D2CB;
    --rams-500: #7FADA7;
    --rams-150: #1D2E2B;

    --neutrino-700: #C4C1E8;
    --neutrino-500: #928FC2;
    --neutrino-150: #242238;
  }
}
:root[data-theme="dark"] {
  /* same values as the media-query block above, so an explicit
     dark-mode toggle in the app matches system dark mode */
}
```

Note: in dark mode, the "700" tokens flip to become the *lightest* (text/
accent) value and app bars should use the corresponding 150/900 fill
instead — check computed contrast, don't just swap literals 1:1 if the
app's dark-mode structure differs from the reference artifact.

## Usage rules (enforce these in code review / linting where possible)

- Sand (`--riverside-sand-600`) and both pastel tints (`--rams-150`,
  `--neutrino-150`) are ~3:1 contrast on white — fine for icons, chips,
  large display numerals; **never** for body-copy-sized text.
- Body text stays in `--ink-900` / `--ink-600`.
- A lab's `-700` token fills the app bar / nav; its `-500` token is
  reserved for the single primary action on a screen.
- Status pills/badges use only the semantic colors (`--signal-*`), never
  a lab accent — "critical" must read identically in both apps.
- Target WCAG AA: 4.5:1 for body text, 3:1 for large text (18px+ bold or
  24px+ regular), in both themes.

## Typography

```css
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Fira+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Oswald', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Fira Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
}
```

| Role | Font / weight | Size / line | Notes |
|---|---|---|---|
| Display | Oswald 600 | 28 / 34 | uppercase, +2% tracking. App names, section titles |
| Heading | Oswald 500 | 20 / 26 | normal case |
| Subheading | Fira Sans 600 | 16 / 22 | |
| Body | Fira Sans 400 | 15.5 / 25 | prose, forms, table cells |
| Caption | Fira Sans 500 | 12 / 16 | uppercase, +5% tracking |
| Data | IBM Plex Mono 400–500 | 14 / 20 | `font-variant-numeric: tabular-nums`. Sensor readouts, timestamps, coordinates, hex, code |

Rule: any sensor value, coordinate, timestamp, ID, or unit goes in
`--font-mono` with tabular figures — never in the body font.

## Component defaults

- **App bar**: background = lab's `-700` token, text = white (light theme)
  / near-black (dark theme) — verify contrast per theme.
- **Primary button**: background = lab's `-500` token, white text, Oswald
  500 label, uppercase, small radius (~6px).
- **Card / chip fill**: lab's `-150` tint, `--ink-900` text.
- **Status pill**: 18–20% opacity fill of the relevant `--signal-*` color,
  full text color = the solid `--signal-*` value, pill/rounded shape.
- Instrument/data-dense screens (run monitors, sensor dashboards) default
  to the **dark surface**; forms, reports, and longform screens default to
  **light**.

## Compliance — do not skip

This system restyles color/type for lab-app UI only. It does **not**
replace or recolor the official UC Riverside seal or primary logo — if
either app credits UCR (e.g. an About screen: "An app of the University of
California, Riverside"), use the official unmodified UCR mark, sourced from
University Communications, not a recolored version. Confirm with
University Communications (universitycomm@ucr.edu) before any public
(non-lab-internal) release.

## Voice in copy/microcopy

- Precise over promotional: "Tip error exceeded 1.2 mm on path 4," not
  "Great run!"
- State units and uncertainty; never round away a decimal a researcher
  needs.
- Errors name the cause: "Detector temp rose above -90°C threshold," not
  "Something went wrong."
- No exclamation points, no emoji, in-app.
