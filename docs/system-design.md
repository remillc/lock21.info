---
title: System design
description: The design of lock21.info, the E2 Sonar look in the Moss colours on the Material Design 3 system - colours, type, shapes, spacing, buttons, components.
---

The lock21.info design, decided with Christian on 2026-10-19: **the "E2 · Sonar" look on the Material Design 3
system**, in the **Moss** colours since 2026-10-22 (olive bars and greyish off-white or olive-black pages, in place of
E2's navy; mockups: <https://claude.ai/artifact/QtZB3MVjoJWntaQqS2AghZ>, row D). First mockups (private canvas):
<https://claude.ai/artifact/LERqkcuQMq5wptfoz8uSFE> (E2 on the fourth row; E3, the full MD3 look, was set aside).
Technical rules (Astro, Starlight, SCSS, components) are in `docs/guidelines.md`.

## Audiences

| Audience | Comes for | Entry point |
| --- | --- | --- |
| Divers | The site: zones, depths, current, what to see | `/plongeurs`: zone map, 3D model |
| Photogrammetry practitioners | The method: workflow, settings, problems, tests | `/photogrammétrie`: workflow, problems |
| Heritage public | The history: the lock, 1958, the 1988 drawings | `/patrimoine`: history, 3D model |

The content stays a first-person field notebook.

## Look (E2)

- **Underwater instrument**: the page reads like a dive computer and a survey log. Dark olive bars (header, footer),
  monospace data, a **depth gauge** (0 to 55 ft) down the left side of the content, an **instrument panel** with the key
  numbers (bottom depth, dives, time underwater, zones online, latest zone).
- **Strong outlines**: 2 px outlines on cards, frames and tables; rounded corners throughout.
- **One signal colour**, orange, used sparingly: the 3D model button, the bottom depth (55 ft).
- **The 3D model is the centrepiece**: a framed render under the hero, labelled with its numbers.
- Readable first: the instrument feel lives in the frame and the data, never at the expense of long text.
- Light and dark follow the visitor's device, with a switch. The instrument panel stays dark in both (MD3 inverse
  surface in light).

## System (Material Design 3)

MD3's **token system** is adopted (colour roles, type scale, shape scale, spacing, touch targets, states), not its
visual style nor its component library. Tokens become CSS custom properties (`--md-sys-color-primary`…) mapped onto
Starlight's (`--sl-color-…`) in `src/styles/`.

### Colour roles

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `primary` / `on-primary` | `#2e3322` / `#f4f4ee` | `#ebede3` / `#12140e` | main buttons |
| `secondary` / `on-secondary` | `#5b6b1f` / `#ffffff` | `#b8c97a` / `#12140e` | links, labels, depth gauge, card numbers, timeline |
| `tertiary` / `on-tertiary` | `#f28c28` / `#22251b` | `#f28c28` / `#12140e` | signal: 3D model button, bottom depth |
| `tertiary` text on light | `#b4530c` | (same as tertiary) | orange text on the pale background (contrast) |
| `surface` / `on-surface` | `#f4f4ee` / `#22251b` | `#12140e` / `#ebede3` | page |
| `on-surface-variant` | `#4f5444` | `#c9cdbb` | secondary text |
| `surface-container-lowest` | `#ffffff` | `#0d0f0a` | cards (light) |
| `surface-container` | `#e7e8dc` | `#1f231a` | chips (light); cards, timeline items (dark) |
| `outline` | `#2e3322` | `#3c4232` | 2 px outlines |
| `outline-variant` | `#e1e2d6` | `#2a2f22` | dividers, table rows |
| bars and panel (`--lk-bar`, `--lk-panel`) | `#2e3322` | `#1b1e15` | header, footer, instrument panel: dark olive in both themes (MD3 inverse surface in light) |
| text / muted / links on bars | `#f2f3ea` / `#b6bca3` / `#c5d48a` | `#f2f3ea` / `#a3a893` / `#b8c97a` | text, labels and links in bars and panel |

Contrast: WCAG AA (4.5:1 for text) in both themes; checked again when the tokens are applied.

### Type scale

Archivo for text and titles, JetBrains Mono for data (numbers, dates, depths, labels, paths), both self-hosted.

| MD3 role | Size / line height | Font, weight | Used for |
| --- | --- | --- | --- |
| display-large | 57 / 64 | Archivo 800 | home page title |
| headline-large | 32 / 40 | Archivo 800 | section titles |
| title-large | 22 / 28 | Archivo 800 | card titles |
| body-large | 16 / 24 | Archivo 400 | text |
| body-medium | 14 / 20 | Archivo 400 | card descriptions |
| label-large | 14 / 20 | JetBrains Mono 500 | buttons, navigation |
| label-medium | 12 / 16 | JetBrains Mono 500 | labels, chips, gauge, metadata |
| instrument | 45 / 52 and 28 / 36 | JetBrains Mono 700 | panel readings |

Tabular figures in tables and data.

### Shape scale

| MD3 token | Radius | Used for |
| --- | --- | --- |
| small | 8 px | chips |
| medium | 12 px | buttons |
| large | 16 px | timeline items, tables |
| large-increased | 20 px | cards |
| extra-large | 28 px | instrument panel, render frame |
| full | pill | 3D model button, render label, status dot |

### Spacing and interaction

- 4 px grid (8, 12, 16, 24, 32, 48, 64).
- Touch targets at least 48 px (links in the header, buttons, cards).
- **Pointer cursor on every action widget** (Christian, 2026-10-22): buttons, links, selects, toggles, sliders, cards,
  tabs, everything that acts on a click shows `cursor: pointer` (the hand); text fields keep the text cursor, disabled
  controls `not-allowed`. On the site and in the 3D viewer alike.
- **Buttons are always MD3-compliant** (Christian, 2026-10-22), on the site and in the 3D viewer alike: an MD3 button
  type (filled, filled tonal, outlined, text, or icon button), its sizes (an icon button: 40 dp container in a 48 dp
  touch target; a button: 40 dp high, full corners), **Material Symbols** icons at 24 dp (never a text character
  such as "×" for an icon), the state layers and focus ring below, and a selected state for toggles. Over the 3D
  view: filled tonal icon buttons (`viewer/src/style.css`, `.icon-button`). The 48 dp touch target around a 40 dp
  button: a 4 px transparent border with `background-clip: padding-box` (its colour and state layers inside it), or a
  `::before` 4 px larger when the border shows (outlined button) or the pseudo-elements are taken (the ☰'s bars).
  Checked on 2026-10-24 (TODO #59): the header's magnifier, ☰ and « Modèle 3D », the /modele downloads, every
  viewer button.
- **Icon buttons get an MD3 plain tooltip** (Christian, 2026-10-23), not the browser's `title` tooltip: its text in
  `data-tooltip`, shown by one `<l21-tooltip>` element (`viewer/src/tooltip.js`) after a 500 ms hover or at once on
  keyboard focus; inverse surface, body-small, 24 dp high, 4 dp corners, above the button or below when there is no
  room; fades in over 150 ms and out over 75 ms.
- MD3 state layers on interactive elements: hover 8 %, focus 10 %, pressed 10 % of the content colour; visible focus
  ring (`secondary`).
- Little motion; everything respects `prefers-reduced-motion` (no animation then: the change is instant).
- **Motion (MD3 tokens, `md.sys.motion`):** content that appears or disappears within a screen (hide / reveal) moves,
  it doesn't jump: entering = `easing.emphasized-decelerate` `cubic-bezier(0.05, 0.7, 0.1, 1)` over `duration.medium4`
  (400 ms); exiting = `easing.emphasized-accelerate` `cubic-bezier(0.3, 0, 0.8, 0.15)` over `duration.short4`
  (200 ms), exits being shorter than entries. A section that opens animates its height and opacity, so what follows
  slides instead of jumping. No animation on first display. Example: the viewer settings panel's ambient occlusion
  rows (`viewer/src/config-panel.js`).
- **Page transitions** (client-side navigation): MD3 *fade through* on the content (article and table of contents),
  over `duration.long1` (450 ms), `easing.emphasized` `cubic-bezier(0.2, 0, 0, 1)`: the old content fades out over the
  first 35 %, then the new one fades in while growing from 92 %, without overlap. The header and the sidebar change
  without moving. Tokens in `tokens.scss`, styles in `custom.scss`.

## Components

- **Header**: dark olive bar, `LOCK/21`, place line, navigation (Site, Méthode, Histoire, Journal), "Modèle 3D" pill.
- **Depth gauge**: left column of the home page, 0 / 15 / 30 / 45 / 55 ft, the last in the signal colour; hidden on
  phones. On interior pages it runs along the navigation column's left edge, marks in proportion to depth, on screens
  wide enough for its labels.
- **Instrument panel**: bottom depth (ft and m), dives, time underwater, zones online, latest zone; values from the
  dive log and the 3D manifest, not typed by hand.
- **Render frame**: a render of the model, 28 px corners, label chip with zone and numbers.
- **Entry cards** ("Par où commencer"): number 01 to 03, title, one line, path `/plongeurs →`.
- **Journal excerpts**: timeline with outlined items (number, date, zone, duration chip, note), link to all dives, total.
- **Footer**: previous / next page, then the dark olive bar: `ÉCLUSE/21 · carnet de terrain`, `© 2024–<year> Christian
  Rémillard · Licence CC BY 4.0` (link to the licence). At the bottom of the window on short pages (flex columns in
  `custom.scss`), right after the content on long ones. The Baets drawings are credited in their figure captions.
- Existing pages (docs) keep Starlight's layout, restyled with these tokens.
- **Custom Elements** are named with the `l21-` prefix (rule in `docs/guidelines.md`): `<l21-image-zoom>` (figures, full
  size on click), `<l21-dev-breakpoints>` (dev server only), `<l21-settings-panel>` (the 3D viewer's settings, ⚙),
  `<l21-model-frame>` (the viewer's frame on `/modele`), `<l21-viewer-warmup>` (prefetches the viewer's files when a
  `/modele` link is hovered).

## Not wanted

Heavy UI frameworks, the Material Web component library, animation libraries, stock photos, cartoon underwater
clichés, decoration that competes with the 3D viewer on a phone.

## Name, logo, coordinates

- **Name**: **Écluse 21** in French (the site's language), **Lock 21** in English. The wordmark in the mockups,
  `LOCK/21`, becomes `ÉCLUSE/21`.
- **Logo**: **S4 · "21 en écho"** (chosen 2026-10-19 on the design canvas): the 21 in JetBrains Mono ExtraBold on a
  rounded dark olive square (14/64 corners), with two moss echoes below it (30 % and 60 %) and the orange point top right,
  like a sonar reading. Files: `src/assets/logo.svg` (light), `src/assets/logo-dark.svg` (dark: deeper olive, outline),
  `public/favicon.svg` (tab icon: one echo, larger figures for 16 px). The figures are outlines, so no font is needed;
  the generator is described in `src/assets/README.md`.
- **Coordinates in the header**: Lock 21 is at **44°59.814′ N, 74°53.983′ W** (degrees and decimal minutes;
  decimal 44.996900, −74.899721; since 2026-10-25). The header shows them in that form: `44°59.814′ N · 74°53.983′ O`
  (W in English).
