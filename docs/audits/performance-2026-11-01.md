# lock21.info performance audit

> The record of the performance audit of 2026-11-01 (TODO #97). The site's pages and the 3D viewer, on a computer and a
> phone, measured on the live site (1.0.0-beta.7), every address with `?no-analytics=1`. Fixed the same day:
> P1, P2, P3, most of P5, and real visitors' speed measured (TODO #113). Left: TODO #111.

**Date**: 2026-11-01. **Sources**:

- Lighthouse 12.8.2 on nine pages (`/`, `/en/`, `/modele`, the dive log, the zone map, the rig, the tracking page, the
  banana effect, About), mobile (its default simulation: a mid-range phone, slow 4G) and desktop, three runs each,
  medians;
- the 3D viewer measured in headless Chrome on Christian's computer (RTX 4080 SUPER, Direct3D 11), a fresh profile each
  run (cold cache, no service worker): the loading indicator's two steps read in the page (first view drawn, nothing
  left to load), the bytes per origin, the JS heap, the frame times during a 5 s orbit drag. Desktop at 1440 × 900 on
  the home line and on an emulated 50 Mbit/s line; phone emulated at 390 × 844 (× 3), touch, the CPU slowed 4 ×, LTE
  at 10 Mbit/s and 40 ms. The viewer's telemetry was answered locally, never sent to `/api/log`;
- the Cloudflare zone's settings, read with a read-only API token (`CLOUDFLARE_ZONE_TOKEN`, `.env.local`);
- the build (`dist/`): bundle and image sizes.

Each finding is marked **fact** (measured) or **inference**.

## Summary

The notebook's pages are fast: Lighthouse performance 99–100 on desktop and 94–99 on mobile, LCP 1.8–3.0 s on the
simulated phone, no layout shift, accessibility 100 everywhere (fact). The 3D viewer runs smoothly once loaded (59 fps
while orbiting, desktop and emulated phone, fact), and its first view comes in about 2 s on a fast line (fact).

Two things were wrong on every page, and are fixed: Cloudflare refused every prefetch (P1), and `<meta charset>` came
too late (P2). What is left is mostly the viewer's first view on a phone with the full tile set: 30 s at 10 Mbit/s
(P3).

| Page | Desktop | Mobile | Mobile LCP | Mobile TBT |
| --- | --- | --- | --- | --- |
| `/` | 100 | 99 | 2.0 s | 0 |
| `/en/` | 100 | 99 | 2.0 s | 0 |
| `/a-propos` | 100 | 99 | 1.8 s | 0 |
| `/collecte/journal-plongees` | 100 | 99 | 2.0 s | 0 |
| `/collecte/rig` | 100 | 94 | 3.0 s | 0 |
| `/decoupage-site` | 99 | 98 | 2.3 s | 0 |
| `/traitement/suivi` | 100 | 94 | 2.0 s | 0 |
| `/problemes/effet-banane` | 100 | 99 | 2.0 s | 0 |
| `/modele` | 68 | 48 | 4.4 s | 3.7 s |

The 3D viewer (`/modele`, the start view; medians of 3 runs, the 50 Mbit/s line 1 run):

| | First view | Nothing left to load | Tiles downloaded |
| --- | --- | --- | --- |
| Desktop, home line | 2.0 s (33–72 MB in) | 4.7 s | 72 MB |
| Desktop, 50 Mbit/s | 6.5 s (21 MB in) | 13.7 s | 72 MB |
| Phone, 10 Mbit/s, full tiles | 30.4 s (29 MB in) | 35.6 s | 40 MB |
| Phone, 10 Mbit/s, light tiles (`?textures=light`) | 11.2 s (10 MB in) | 12.6 s | 14 MB |

Not measured: a real phone's GPU (the emulated phone drew with this computer's), its memory limits, Safari. That needs
a real device (BrowserStack's keys are in `.env.local`, or Christian's Pixel and an iPhone).

## Findings

### P1. Cloudflare refused every prefetch (fact; fixed 2026-11-01)

Every request with `Sec-Purpose: prefetch` got a 503, empty, with `Cf-Speculation-Refused: prefetch refused: disabled
for worker requests`: pages, CSS, the viewer's files. So none of the site's prefetches worked live: the router's (a
link's page on hover, focus or in view, docs/guidelines.md « Prefetch ») and `ViewerWarmup`'s (the viewer's files when
a `/modele` link is hovered). Each left an error in the console (Lighthouse: « Browser errors were logged » on 10 of
the 18 runs). The cause: the zone's **Speed Brain** setting, on (Cloudflare's default on the Free plan). Christian
turned it off on 2026-11-01; the same requests then answered 200. It must stay off (docs/guidelines.md).

### P2. `<meta charset>` after 3.8 KB (fact; fixed on `fix/charset-first`)

The browser must find the encoding within the first 1024 bytes; `Content-Type` from Cloudflare has no `charset`. The
language script of `Head.astro` (TODO #107, with its 4 KB list of address pairs) came before Starlight's `<head>`, so
`<meta charset>` was at byte 3850 on every page (Lighthouse « Charset declaration is missing or occurs too late », 18
of 18). Moved after it: byte 124.

### P3. The viewer's first view on a phone with the full tiles: 30 s at 10 Mbit/s (fact; fixed 2026-11-01)

A phone or tablet that reports 8 GB and 8 cores on a « 4g » connection gets the full tile set (`lightTextures()`,
`main.js`). Chrome calls any decent line « 4g », 10 Mbit/s LTE included, and only Chrome on Android reports memory and
cores: so it is high-end Android phones that wait. The first view waits for 29 MB (each zone's coarsest levels in
view, with full textures); the light set's first view needs 10 MB, 11 s. The coarsest level alone (each zone's root)
is about 14 MB full and 5 MB light (`O:\publishing\tiles`). Options, for Christian: the light set first on every
phone, the full one only once the first view is drawn (or on a measured fast download); `navigator.connection.downlink`
as well as the class; a lighter root level in the full set. Done (Christian, 2026-11-01): every phone starts with the
light set, and a strong one (the full set's former rule) takes the full set zone by zone once the view is loaded, each
full tileset loading hidden and swapped in when nothing in view is left to load (`upgradeTiles` in `main.js`; tried on
an emulated phone: the view never empties, every zone full 32 s after the light load at 10 Mbit/s).

### P4. Desktop: 72 MB at the start view (fact; inference on what to do) → TODO #111

The start view loads finest tiles (`LOD-0`, up to 4 MB each) for zones 2, 3 and 4 (`errorTarget` 8). On fiber it
doesn't show (4.7 s), on 50 Mbit/s the first view takes 6.5 s and the last tiles 13.7 s. Whether that is too long is a
judgement: it decides how sharp the start view is. Lighthouse counts the viewer's 8 s of main-thread work on the
simulated phone (mostly decoding tiles in `main.js`, 6.4 s), hence the 48.

### P5. Small things (fact; mostly fixed 2026-11-01)

- `/collecte/rig`: its first photo (`rig-scooter-2024-06-14`, 146 KB as served to a phone, loaded at once with high
  priority as it should) is the page's LCP, 3.0 s on the simulated phone; Lighthouse estimates 128 KB less with
  stronger compression, and its lazy figures are served about 20–60 % larger than shown.
- `/modele`: the AR button is an `<a>` without `href` until it is set up (Lighthouse « Links are not crawlable »);
  WebXR keeps the page out of the back/forward cache (expected, nothing to do); 141 KB of the viewer's script unused
  at load (inference: the tour, AR, settings, which could load on demand).

Done on 2026-11-01: every WebP image at quality 72 with sharp's tightest encoding (`astro.config.mjs`; all images
18.4 → 14.3 MB, that photo 143 → 117 KB for a phone, no visible change on the photos nor on the 1988 drawing's fine
lines); the figure grids' images sized for half the column (`content-images.mjs`); the AR button's `href` the page's
AR section (`#ar`) until the viewer sets the device's own; the Android AR code (`android-ar.js`, 9 KB) loaded on
Android only. The tour, the underwater view and the creatures stay in the viewer's main script: they are wired into
its render loop from the start, for a few tens of KB compressed.

### What is fine (fact)

- No layout shift on any page (CLS 0–0.005).
- The shared stylesheet is 147 KB (40 KB in Brotli), render-blocking for about 60 ms on desktop; the fonts are split
  by alphabet (only the needed ones download) and the five seen first are preloaded.
- The zone's settings: Brotli, HTTP/3, Early Hints, TLS 1.3 with 0-RTT, Rocket Loader off, Cloudflare's minification
  off (Astro minifies). Email Obfuscation is on: it rewrites pages that hold an address and adds a script (none
  measured here).
- The zone map pages have 880 DOM elements (the map's rectangles): Lighthouse warns, no measurable cost.
