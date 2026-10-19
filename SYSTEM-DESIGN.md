# Design brief

The lock21.info design, decided with Christian on 2026-10-19: **the "E2 · Sonar" look on the Material Design 3
system**. Mockups (private canvas): <https://claude.ai/artifact/LERqkcuQMq5wptfoz8uSFE> (E2 on the fourth row; E3, the
full MD3 look, was set aside). Technical rules (Astro, Starlight, SCSS, components) are in `GUIDELINES.md`.

## Audiences

| Audience | Comes for | Entry point |
| --- | --- | --- |
| Divers | The site: zones, depths, current, what to see | `/plongeurs`: zone map, 3D model |
| Photogrammetry practitioners | The method: workflow, settings, problems, tests | `/photogrammétrie`: workflow, problems |
| Heritage public | The history: the lock, 1958, the 1988 drawings | `/patrimoine`: history, 3D model |

The content stays a first-person field notebook.

## Look (E2)

- **Underwater instrument**: the page reads like a dive computer and a survey log. Dark navy bars (header, footer),
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
| `primary` / `on-primary` | `#0e2430` / `#f4f8f8` | `#e6eff2` / `#0b1c26` | main buttons |
| `secondary` / `on-secondary` | `#0b6e77` / `#ffffff` | `#3cc2bc` / `#0b1c26` | links, labels, depth gauge, card numbers, timeline |
| `tertiary` / `on-tertiary` | `#f28c28` / `#0e2430` | `#f28c28` / `#0b1c26` | signal: 3D model button, bottom depth |
| `tertiary` text on light | `#b4530c` | (same as tertiary) | orange text on the pale background (contrast) |
| `surface` / `on-surface` | `#f4f8f8` / `#0e2430` | `#0b1c26` / `#e6eff2` | page |
| `on-surface-variant` | `#3c5562` | `#b7cdd7` | secondary text |
| `surface-container-lowest` | `#ffffff` | `#06121a` | cards (light); bars, panel (dark) |
| `surface-container` | `#e3ecee` | `#102a38` | chips (light); cards, timeline items (dark) |
| `outline` | `#0e2430` | `#2a4a5a` | 2 px outlines |
| `outline-variant` | `#d5e0e3` | `#1d3e4f` | dividers, table rows |
| `inverse-surface` / `inverse-on-surface` | `#0e2430` / `#f4f8f8` | — | header, footer, instrument panel (light) |
| muted on inverse | `#9bb8c6` | `#9bb8c6` | labels in bars and panel |

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
- MD3 state layers on interactive elements: hover 8 %, focus 10 %, pressed 10 % of the content colour; visible focus
  ring (`secondary`).
- Little motion; everything respects `prefers-reduced-motion`.

## Components

- **Header**: navy bar, `LOCK/21`, place line, navigation (Site, Méthode, Histoire, Journal), "Modèle 3D" pill.
- **Depth gauge**: left column of the home page, 0 / 15 / 30 / 45 / 55 ft, the last in the signal colour; hidden on
  phones. On interior pages it runs along the navigation column's left edge, marks in proportion to depth, on screens
  wide enough for its labels.
- **Instrument panel**: bottom depth (ft and m), dives, time underwater, zones online, latest zone; values from the
  dive log and the 3D manifest, not typed by hand.
- **Render frame**: a render of the model, 28 px corners, label chip with zone and numbers.
- **Entry cards** ("Par où commencer"): number 01 to 03, title, one line, path `/plongeurs →`.
- **Journal excerpts**: timeline with outlined items (number, date, zone, duration chip, note), link to all dives, total.
- **Footer**: navy bar, author, credit for the Baets drawings.
- Existing pages (docs) keep Starlight's layout, restyled with these tokens.
- **Custom Elements** are named with the `l21-` prefix (rule in `GUIDELINES.md`): `<l21-image-zoom>` (figures, full
  size on click), `<l21-dev-breakpoints>` (dev server only), `<l21-settings-panel>` (the 3D viewer's settings, ⚙).

## Not wanted

Heavy UI frameworks, the Material Web component library, animation libraries, stock photos, cartoon underwater
clichés, decoration that competes with the 3D viewer on a phone.

## Name, logo, coordinates

- **Name**: **Écluse 21** in French (the site's language), **Lock 21** in English. The wordmark in the mockups,
  `LOCK/21`, becomes `ÉCLUSE/21`.
- **Logo**: **S4 · "21 en écho"** (chosen 2026-10-19 on the design canvas): the 21 in JetBrains Mono ExtraBold on a
  rounded navy square (14/64 corners), with two teal echoes below it (30 % and 60 %) and the orange point top right,
  like a sonar reading. Files: `src/assets/logo.svg` (light), `src/assets/logo-dark.svg` (dark: deeper navy, outline),
  `public/favicon.svg` (tab icon: one echo, larger figures for 16 px). The figures are outlines, so no font is needed;
  the generator is described in `src/assets/README.md`.
- **Coordinates in the header**: Lock 21 is at **44°59.809′ N, 74°53.997′ W** (degrees and decimal minutes;
  decimal 44.996817, −74.899950). The header shows them in that form: `44°59.809′ N · 74°53.997′ O` (W in English).
