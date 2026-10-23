# Changelog

Versions follow [semantic versioning](https://semver.org/) (major.minor.patch), below 1.0.0 while the site is not public.

## Unreleased

- 3D viewer, underwater: the dive light reveals more colour (its beam keeps the forward-scattered light: only a third
  of the scattering dims it; the colours it lights a little more saturated).
- 3D viewer, underwater: the water surface overhead fades out beyond the visibility like the model (from the floor
  in murky water its ripples showed as light bands).
- 3D viewer, underwater: the dive light fades with its distance from the lamp (the water's whole attenuation per
  colour, scattering included): on surfaces, in its glow in the water and on the particles it lights.
- 3D viewer, underwater: no more noise toward the water surface (its ripples and caustics fade out where finer than
  a pixel) and no banding in the water's gradients (dithered).
- 3D viewer, underwater: the dive light has a hotspot (8°) and a spill 3 times wider and weaker; it brings the reds
  back (its light absorbed only from the lamp, the daylight dimmed to half at depth); more particles the murkier the
  season (winter 10,000, autumn 25,000, summer 35,000, spring 60,000).
- 3D viewer, underwater: the view's address (and the /modele page's) carries `&underwater=1&season=` (`&lamp=0`), so
  a copied link reopens the same view. Colours absorbed by distance, red first: daylight from the surface down (half
  the shift shown, the eye adapts), the dive light only from the lamp, so it brings red back up close; the lamp at the
  bottom right of the view, aimed at its middle, its beam visible in the water and in the particles it lights. The
  camera stays above the height of the point it turns around (never under the floor).
- 3D viewer: « Ambiance sous-marine » (TODO #46, from the first attempt #31): the 🤿 button beside full screen, or the
  settings' « Sous l'eau » section. The water column as background, the sun refracted at the surface, caustics, the
  surface seen from below, many small particles drifting with the current (shown 3 times faster than measured). The
  usual lighting stays: the surfaces are seen as they are up close, then fade into the water column's own colour and
  are gone at the season's visibility (no ambient occlusion meanwhile: it redrew the erased lock). A dive light at the
  camera, a 15° beam centred in the view, its glow in the water computed along the line of sight (it only adds light).
  Beside the 🤿 button, a strip that unrolls out of it (MD3 motion): the « Saison » slider (winter 100 ft, spring 10,
  summer 20 by default, autumn 30; visibility and water colour) and the dive light's button; both also in the settings
  (`viewer/src/underwater.js`).
- 3D viewer: MD3 tooltips on its buttons (`<l21-tooltip>`, `viewer/src/tooltip.js`) instead of the browser's own,
  in the page's language; also shown on keyboard focus.
- 3D viewer: gloss by surface (roughness from the relief map: smooth planks glossier, mussels matte) tried and set
  aside: stone, wood and silt reflect about 4 % of light at a direct view, so even a mirror finish hardly showed; the
  wet look's clear coat already gives the sheen.
- 3D viewer: its interface follows the page's language (French or English): loading, buttons, settings and
  augmented reality texts (`viewer/src/i18n.js`).
- 3D viewer: « Rendu photo » (path tracing with three-gpu-pathtracer, computers only) tried and set aside: bounced
  light and soft shadows, but no visible gain in realism, which the source data limits (lighting already in the
  photos, mesh noise). Kept on the branch `feature/photo-render`, not merged.
- 3D viewer settings: « Éclairage (ciel et soleil) » is out of the panel, the lighting is always on (a link can
  still show the raw textures with `?hdri=0`, for tests); the lighting settings are always shown.
- 3D viewer settings: scrolling in the panel no longer scrolls the page around the viewer once the list ends.
- 3D viewer: « Contraste » slider in the settings (0.5 to 2, default 1): the lit surfaces' colours stretched around a
  mid-grey, hue kept.
- Claude Code added to the software used (gear page, French and English; pipeline README).
- 3D viewer: wet look back to 0.15 by default.
- 3D viewer settings: « Ombres du soleil » is out of the panel; the default stays (on computers, off on phones),
  and a link can still set it (`?shadows=`).
- 3D viewer: AgX tone mapping by default again (exposure 1.2), with saturation 1.2 to make up for its greying (1.5
  matched the unlit textures' saturation on zone 3); Khronos neutral stays under Avancé.
- 3D viewer settings: « Occlusion ambiante » (and « Occlusion seule ») and « Ciel en arrière-plan » are out of the
  panel; their defaults stay (occlusion on computers, sky background on), and a link can still set them.
- 3D viewer: the sky that lights the scene also tilts so that its photo's sun (48° up) stands exactly at our sun's
  height, not only its azimuth (tilt up to 25°); the background sky only turns about the vertical.
- 3D viewer: the sun by default from the southwest (320), 65° up; the sun
  direction sliders move by 1°.
- 3D viewer: cascaded sun shadows (three.js CSM, three 2048 px maps following the camera, up to 300 m): sharp up
  close instead of one 4096 px map over the whole site (about 4 cm per texel).
- De-lighting of the lamp bands (TODO #24, `delight_texture.py`): tried on zones 3 and 10 with stronger settings and
  set aside; almost no visible difference, Metashape's blending of many photos already evens out the lamps' large-scale
  light.
- 3D viewer: `?compare=<tiles url>` (tests): an « Avant | Après » segmented button (key B) swaps the tiles between
  the usual ones and those of that address, from the same view; for judging the de-lighting (TODO #24).

## 0.8.0 - 2026-10-22

- Zone 16 online (a spillway gate door on the floor south of the chamber, 69 tiles, 17 MB with its relief); zone 4
  republished (its cutting changed), with the context.
- Context: the walls' vertical faces were black in the viewer. Their UV map (the plan projected from above) gave them no
  room in the baked texture; `export_context.py` now bakes such objects into their own unwrapped UV map, colour only
  (the viewer lights them).
- 3D viewer: new start view (`START_VIEW`), close to the lock floor, chosen by Christian on 2026-10-22.
- The site's last TypeScript (`src/lib/*.ts`, `src/data/site.ts`, `src/content.config.ts`, types in `.astro` files)
  converted to plain JavaScript, types kept as JSDoc annotations: no TypeScript in the project.
- Home page: « Dernière zone » is the zone added last, not the zone republished last (a retouched zone took its
  place); the manifest now records each zone's first publication (`added`, `update_manifest.py`).
- Tested on an iPhone (2026-10-22, iOS 18.7, Safari, Apple GPU, textures up to 16,384 px), through the telemetry: the
  3D model loads in the `/modele` page in about 14 s (2 s on a second visit), no error, no lost WebGL context.
- 3D viewer settings: the colour settings (« Neutralisation de la teinte », « Retrait du vert », « Retrait du cyan »)
  are removed from the panel; their defaults stay (0.2, 0.8, 1.5), and a link can still set them.
- 3D viewer: the sun casts shadows (« Ombres du soleil », on by default on computers), tone mapping Khronos neutral
  (keeps the textures' hues and saturation; AgX greyed them) with an « Exposition » slider (default 1.2; wet look lowered to 0.1), the method
  under Avancé (Khronos neutral, AgX, ACES, none).
- 3D viewer lighting: the sky and the sun together, each with its slider (« Force du ciel », « Force du soleil »,
  plus the sun's direction), realistic defaults (sun 1, sky 0.35, sun from the east-south-east at 65°, « Saturation » slider at 0.8); the sky turns with the sun so that
  the sky photo's own sun stands where ours is (one sun, shadows and glints from the same side); the former sun test
  (`?relief=sun`, `?shade=`) is removed.
- Pointer cursor on every action widget, on the site and in the 3D viewer (a global rule without specificity in
  `custom.scss` and `viewer/src/style.css`; `not-allowed` when disabled).
- Android AR: the AR model downloads in the background once the 3D view has finished loading (about 30 MB,
  kept in memory), so a tap on AR only waits for its preparation.
- AR models: their origin is a point on the lock chamber floor (`make_model.py --origin`, 4 m west of the
  `ar-origin` Empty, at the floor's height, 0.84 m above the reference level), so the floor no longer rises when the
  lock is enlarged in AR. Zone 3's texture is baked anew onto the simplified mesh with an xatlas UV layout
  (`make_model.py --rebake`, `xatlas_uv.py`): simplified 1:20, its texture was scrambled. Baked in two passes (faces
  flipped for the second), so faces turned inwards no longer stay black. During AR the 3D view
  releases its tiles (the AR image froze at times).
- `npm run downloads:upload` compares each file with R2's MD5 (ETag), not only its size: a rebuilt file of the same
  size is sent. The viewer asks for the AR files with a version (`AR_VERSION`), so a rebuild shows at once.
- 3D viewer buttons (settings, augmented reality, full screen) and the AR close button: MD3 filled tonal icon
  buttons (40 dp in a 48 dp touch target, Material Symbols icons, state layers, focus ring). AR size slider drawn by
  the page (follows the finger in AR, in any orientation); touches on the AR controls no longer move the model.
- `SYSTEM-DESIGN.md` moved to `docs/system-design.md`, with a rule: buttons are always MD3-compliant.
- Augmented reality on Android: AR inside Chrome (WebXR, `viewer/src/android-ar.js`, the viewer's three.js). One tap
  opens the camera, the model loads meanwhile, a ring follows the floor or a table and a tap places the lock, its canal floor
  on the surface; a « Taille » slider goes from 1:100 (on a table) to 1:1 (real size, walls about 35 ft high), the lock
  growing from that point without moving. Scene Viewer, which no longer opened on a Pixel
  10 Pro for any model or page, stays the fallback where Chrome has no WebXR AR. AR steps are logged (`ar-status`);
  the `/modele` frame allows WebXR (`xr-spatial-tracking`).
- 3D viewer: the green removal no longer leaves a blue-cyan tint (green capped at the blue turned water-green pixels
  cyan): the cyan left over is removed too, with its own slider « Retrait du cyan » (`?cyan=0..2`, default 1.5: a
  warm grey).
- Terrain (`lock-21-publishing.blend`, not online yet): the north bank east of zone 7 starts under its stairs and has a
  straight foot (y 26.5 in the height field), crest unchanged; around the zones the ground meets each zone's edge
  height, so the floor beside the lock chamber (zones 2 to 4) is level with theirs (it stood 0.3 to 0.5 m higher).
- 3D viewer: new defaults, tint neutralisation 0.2 (was 0.3), green removal 0.8 (was 1) and the sky as background
  (`?sky=0` for the plain backdrop); the tiles' source and the relief are no longer in the settings panel (`?tiles=` and
  `?relief=` still work in a link, for tests; values saved earlier for them are ignored).

## 0.7.0 - 2026-10-22

- Speed (PageSpeed, mobile): Google Analytics loads on the first interaction or 4 s after the page; the fonts at the
  top of the pages are preloaded; a fallback font with Archivo's proportions (Arial, adjusted) removes the home
  panel's layout shift.
- 3D viewer telemetry, for every visit: device, load time, errors, WebGL context lost, a visit that never closed
  (Safari's reload on low memory), AR launches. Sent to `/api/log` (the Worker), kept in Cloudflare's Workers Logs;
  a random session code at the bottom of the settings panel finds one visit. Described on the privacy page.
- New colours, « Moss » (olive), in place of the navy: bars, pages, links, logo, favicon, the zone diagram and the 3D
  viewer's buttons and plain background (`src/styles/tokens.scss`, SYSTEM-DESIGN.md).
- 3D viewer: a visit without `?cam=` starts from a chosen view (`START_VIEW` in `viewer/src/main.js`) instead of a
  view computed from the model's bounds.
- Header: on wide screens the logo starts further left, above the depth gauge's labels.
- Theme and language selects moved to the footer bar, out of the header and the mobile menu.
- What the site is for: an « À propos » / « About » page (`/about`, first in the navigation) and a short block on
  the home page (show the lock to non-divers, help divers plan their dives, document the method).
- Hosting moved from GitHub Pages to Cloudflare (Workers static assets, `wrangler.jsonc`, custom domain `lock21.info`):
  the deploy workflow sends the site there with Wrangler, and a manual run on a branch other than `main` gives a preview
  address (`<branch>-lock21-info.lock21.workers.dev`). `public/CNAME` and the `gh-pages` branch are gone.
  Built files with hashed names (`/_astro/`, the viewer's assets) are cached for a year (`public/_headers`).
- Page addresses without a final slash (`/modele`, `/collecte/materiel-utilise`, the viewer at `/modele/viewer`): a
  page is a resource, not a folder. The two home pages are collections and keep it: `/` and `/en/`. The old addresses
  with a slash redirect to the new ones. Links, canonical addresses, the sitemap and search results follow.
- Wide screens: the "Modèle 3D" button no longer shows at the top of the navigation column (it is in the header).
- Home page render: no more light patch at the bottom right (slanted sunlight slipped past the surface's edge into
  the water volume).

## 0.6.0 - 2026-10-21

- Translation tracking: `npm run i18n:status` (`tools/i18n/status.mjs`) lists the English pages to create, update or
  rename after French changes; `tools/i18n/translations.json` records the French version each was translated from.
- Home page render: sunlight rays through the water (a thin scattering volume and a rippled surface casting the
  shafts), and its link opens the viewer at the same point of view (`/modele/?cam=…`).
- **English version of the site** (`/en/`): every page translated (docs, tests, privacy), the home page, the model
  page, the header, footer, depth gauges (ft), the opt-out button and the sidebar labels in English; the home page's
  dive log excerpts from the English log (`src/lib/i18n.ts`, `src/lib/diveLog.ts`).
- Home page: a new render of zone 12, seen from the west (the sluice gates side) at 10 ft above the floor, warmer
  colours, in the frame's proportions (it showed the back of the zone).
- Home page: the depth gauge as high as the window below the bar (marks spread from the surface to the bottom), and
  it stays in view while scrolling, like the navigation's ruler on the other pages.
- No consent banner anymore: Google Analytics measures every visit, with its cookies. A visitor can refuse (or accept
  again) with the button on `/confidentialite/` (`<l21-analytics-optout>`), which also deletes the GA cookies; those
  who refused in the former banner stay unmeasured. The footer's "Témoins" button is gone; the privacy page rewritten.
- Mobile: the "Modèle 3D" button at the top of the menu (it was at the bottom, next to the theme), and the menu
  (☰) on the home page and `/modele/` too: the bar is the same on every page. Wide screens unchanged.
- **New terrain online** (context): the canal floor at 60 ft, the north bank in two pitches (2 : 1 then 1 1/2 : 1,
  crest about 28 ft as the scans show), the south bank at 2 1/2 : 1 down to the river bed at 70 ft, earth banks past
  the south wall's ends, the floor flat in front of the walls and the ground just under the zones (zone 8's stairs
  climb the bank). Texture: seamless tiles cut from the scans (zone 1's silt and zebra mussels; riprap on the slopes
  from zone 18's crib fill), baked at 4096 px (about 2 in per pixel). The south and north lock walls published with
  it; the drawn base map and banks no longer.
- Relief online for zones 1, 4, 8, 10, 13, 18 (the bakes of 4, 13 and 18 had crashed on a GPU shared with another
  Blender); zones 1, 8 and 10 republished (cutting volumes). Downloads and AR rebuilt with the new context.
- The context (`blend_state.py`, `bake_context_in_blender.py`) never takes the `terrain - drawings` collection (the
  pieces drawn from the plans), even objects named "filler". New terrain in the `terrain` collection (SOS data).
- Depth of the bottom: 60 ft (18.3 m) instead of 55 ft, as in the SOS Ottawa documents (lock floor, base of the
  approach cribs, 1989): home page depth gauge, model page, navigation gauge.
- Augmented reality: the fillers are back in both models (zones and fillers, still without the mockup terrain, walls
  and banks), with `make_model.py --context-objects "filler*"`.
- Registration (`register_zone.py`) tries the identity first: an export of the same Metashape chunk is already in
  place. Zone 18 had been fitted 0.8° off, and the 5 cm clean-up cut its walls; zones 1, 4, 7 and 13 were 1 to 1.5 cm
  off. Now 0 to 3.6 mm; the five zones republished.
- Prepared zones moved from `O:\temp\<zone>\prox\` to `O:\publishing\prepared\<zone>\` (`-PreparedRoot`,
  `--prepared-root`): the relief, the downloads and the AR models are made from them. `O:\temp\` can now be emptied
  at any time, except while a job runs.
- Google Earth: double-sided models (`make_kmz.py`, COLLADA `GOOGLEEARTH` extension); walls of zone 18 that face
  inward were hidden.

## 0.5.0 - 2026-10-21

- Zone 18 online (tiles, relief from its 26.6 M export, 16 384 px normal map), and in the downloads and AR models:
  11 zones. Zone 8 moved and a terrain piece added in the `.blend`: zones 2, 3, 8, 12 and 13 republished. Google
  Earth now in 21 parts.
- Guide `docs/project-organization.md` (French): folders, branches and versions, online services, where to look.
- Guide `docs/augmented-reality.md` (French): how AR works, rebuilding its files, testing on a phone.
- Audience measurement with Google Analytics 4, only after consent (Québec's Loi 25): a consent banner
  (`<l21-consent>`, refusing as easy as accepting, "Témoins" in the footer to change one's mind, cookies deleted on
  withdrawal), page views on client-side navigations, `file_download` (KMZ, GLB), `ar_launch` (table / real size), and
  the QR codes as campaigns (`utm_campaign=ra-table`, `ra-taille-reelle`). Off until the measurement ID is set in
  `src/data/site.ts`. New page `/confidentialite/`: what is measured and why, 14-month retention, contact info@lock21.info.
- Augmented reality: a button in the 3D viewer, on phones and tablets only, puts the surveyed zones (without the
  mockup terrain) on a table at 1:100 (about 70 cm), or at real size with `?ar=full`: AR Quick Look on iPhone and iPad
  (USDZ), Scene Viewer on Android (GLB). No library. Models built by `make_model.py -x 0.01 --usdz` and `-x 1`
  (400 000 triangles), copyright in the files.
- `/modele/`: a "Réalité augmentée" section under the downloads. On a computer, two QR codes (made at build time,
  `qrcode`) open the page on a phone: on a table (1:100) or at real size (70 m, `?ar=full`, read by the viewer); on a
  phone, the same two choices as links.
- Every public model file carries the copyright (© 2024–2026 Christian Rémillard, CC BY 4.0): the GLB in glTF's
  `asset.copyright`, with the origin's coordinates (44.996817° N, 74.89995° W) and orientation in `asset.extras`
  (`glb_metadata.py`); the KMZ, its list, each part and each COLLADA model. `/modele/`: the "Posé au sol" sentence
  removed.
- Guide `docs/processing-the-blend-file.md` (French): the steps after a change to the `.blend`, from the check to the
  live model, the downloads and the site.
- Guide `docs/installation.md` (French): preparing a computer for the project, by kind of work.
- 3D viewer loading indicator (`<l21-loading>`): "Chargement" with dots appearing one by one, the share of tiles
  loaded on an MD3 progress bar (never backwards), on a dark card readable over the terrain; it leaves (MD3 exit) once
  the first view is complete, not as soon as the roots are in.
- `/modele/`: "Licence" and "Téléchargements" are two sections, the licence under "Le modèle"; the two downloads as
  filled buttons in the signal colour (tertiary), with an icon (globe for Google Earth, arrow for the GLB); the KMZ link carries `download`, so the client-side router leaves it to the browser; missing
  space restored in "via Save Ontario Shipwrecks".
- Downloads on `/modele/`: a KMZ for Google Earth Pro, served by the site (`/downloads/lock-21.kmz`), that only links
  to its parts on R2 (600 000 triangles, one model per zone and piece of context), so zones added later show up
  without a new download; it opens on a landing view over the lock; and the whole
  model as a GLB (2 M triangles, 108 MB). Built by `tools/google-earth/`, uploaded by `upload_downloads.mjs`;
  the tiles upload no longer touches `downloads/`.
- The site opens to search engines: `noindex` removed from every page, `robots.txt` allows everything but the bare
  viewer (`/modele/viewer/`) and points to the sitemap.
- `/modele/`: the viewer frame is wider than the text column, up to 1600 px (or the window minus 24 px margins).
- Footer at the bottom of the window on short pages; its bar now reads `ÉCLUSE/21 · carnet de terrain` and
  `© 2024–2026 Christian Rémillard · Licence CC BY 4.0` (the Baets drawings stay credited in their captions).
- Client-side routing (Astro `ClientRouter`): pages change without a full reload, with an MD3 fade-through on the
  content; theme, sidebar scroll and search kept across pages; `/modele/` frame as `<l21-model-frame>`.
- Prefetch: every page on link hover (router default), the likely next steps as soon as they are on screen (home
  buttons and cards, "Modèle 3D", previous / next page), and the 3D viewer's files (about 3 MB) when a `/modele/` link
  is hovered, so the viewer starts at once. `astro preview` serves the built viewer again (it inherited the dev
  forwarding to the viewer's dev server).
- Zone 4 republished from its 36 M export (shape, photo and relief).
- Viewer settings kept by the browser between page loads (`localStorage`); a link's parameters override them,
  "Réinitialiser" clears them.
- Relief and wet look for every zone, online: normal maps baked from the high-res
  exports (zones 1, 4 and 10 from their 8.6 M, 36 M and 22.6 M exports), tiles rebuilt with them by the new
  `relief_zones.ps1`. The viewer lights them under the sky with their normal map and a wet clear coat (0.15 by
  default); walls seen from behind are turned towards the viewer. `?relief=sun` keeps the earlier sun test.
- `bake_relief.py`: Lattice support (zone 4), the high-res export placed at the zone's prepared position (a moved
  zone failed), cage sized on the kept surface (3 cm instead of up to 3.9 m).
- Development: the site's `/modele/` page forwards `/modele/viewer/` to the viewer's dev server (now at
  `localhost:3100/modele/viewer/`), so it shows the viewer's source and reloads with it.
- Viewer settings panel (⚙): one control per query parameter (detail, sky lighting, colours, ambient occlusion,
  advanced). Every setting applies live, sliders while they move: the page never reloads (a new tiles source
  reloads the model only, keeping the view). The address keeps only the camera (`?cam=`); other parameters in a
  link are still read, then removed from the address. `?error=` (level of detail: discrete levels, no visible
  effect from the overview) and `?balance=0` are removed; the colour balance is always on.
- Custom Elements prefixed `l21-` (`l21-image-zoom`, `l21-dev-breakpoints`, `l21-settings-panel`).
- Viewer lit by a partly cloudy sky (HDRI, Poly Haven, CC0) instead of the unlit display: volumes read better;
  `?hdri=0` compares, `?sky=1` shows the sky as background.
- `/modele/` page, Sketchfab-like: the viewer embedded in a large frame with a full-screen button, the camera
  shared through the page's address, model facts, navigation help, licence CC BY 4.0. The viewer moves to
  `/modele/viewer/`.
- Wide figures (`figure-wide`): the zone map shown at 80 % of the column, centred.
- Google Earth test (zone 12): light GLB for Google Earth Web and other 3D tools, KMZ (COLLADA) for Google Earth Pro,
  model on the ground at the lock's coordinates (`tools/google-earth/`).
- Deployment only on demand (Actions tab, Run workflow) or on a version tag; pushing `main` no longer deploys.
- Site design applied (SYSTEM-DESIGN.md: E2 look on the MD3 token system): Archivo and JetBrains Mono self-hosted, navy
  header and footer bars with the S4 logo, the ÉCLUSE/21 wordmark and the lock's coordinates, "Modèle 3D" pill;
  home page with depth gauge, instrument panel (dives, time underwater, zones online computed at build time),
  render, entry cards and journal excerpts; outlined tables, rounded figures; light and dark themes.

## 0.4.0 - 2026-10-19

- Site switched from Docusaurus to Astro + Starlight: same French pages and addresses, search (Pagefind), dive log
  total computed at build time, image zoom (native Custom Element), `noindex` kept; blog samples and the partial
  English translation dropped; deployment pushes `dist/` to `gh-pages` with plain git commands.
- Site name: Écluse 21 in French (Lock 21 in English). Layout: right column 20rem, content fills the space, the dive
  log fits the column (scrolls sideways on phones).
- Design brief (`SYSTEM-DESIGN.md`, E2 look on the Material Design 3 token system) and front-end guidelines (`GUIDELINES.md`);
  zone 13 online (12.5 M-face export, 16384 px texture).

## 0.3.0 - 2026-10-19

- Zones online: 1, 3, 4 (new 16384 px texture), 8, 10 and 11 republished; context (terrain, fillers) updated.

- Viewer: the address bar follows the camera (`?cam=`); key C copies the view.
- Viewer: trilinear filtering of tile textures (less shimmering); gloss blurred where the relief varies within a pixel.
- Relief test (zones 1 and 12): object-space normal maps baked from the high-res exports (`bake_relief.py`, `--high`),
  tiled in a second Obj2Tiles run and merged (`merge_normal_maps.mjs`); viewer `?relief=1`, `?light=`, `?shade=`,
  `?wet=` (default 0.15).
- De-lighting test: lamp bands evened out (`delight_texture.py`, `apply_shade.mjs`).

## 0.2.0 - 2026-10-19

- Viewer: colour balance between zones. Each zone's average texture colour goes in `manifest.json`; the
  viewer brings every zone to a common colour and removes 30 % of the water's yellow-green tint
  (`?neutral=0..1`, `?balance=0` to compare).
- Viewer: green removal per pixel (spill suppression: green capped at max(red, blue)), which clears the green
  patches a per-zone gain leaves (zone 4); `?despill=0..1`, default 1.
- Tiling: 4 levels of detail for long zones (longest horizontal side > 25 m: zones 7 and 8), 3 otherwise; the
  overview of the whole model drops from 24.6 to 19.3 MB.

## 0.1.0 - 2026-10-18

- 3D viewer of the lock at `lock21.info/modele/` (Vite, three.js, 3D Tiles), "Modèle 3D" menu entry: tiled model of
  zones 1, 2, 3, 4, 7, 8, 10, 11, 12 and site context (terrain and fillers, baked materials), ambient occlusion,
  anisotropic filtering, render on demand, phone profile, `?cam=` / `?stats=1` / `?ao=` parameters.
- Tiles hosted on Cloudflare R2 (`tiles.lock21.info`, not indexed), uploaded with `npm run model:upload`.
- Publishing pipeline in `tools/publish-model/`: the `.blend` is the source of truth (`source` property, registration,
  deform modifiers, proximity cleanup), change detection (`npm run model:post-modified`), Obj2Tiles tiling,
  coarse-level simplification, meshopt compression, KTX2 textures. All scripts answer `-h` / `--help`.
- Resolution analysis of the zone meshes (`tools/model-analysis/`).
- `TODO.md` working list.
## 0.0.3 - 2026-10-18

- Deployment works from GitHub Actions: it uses the workflow's own token instead of an SSH key that was never configured.
- `static/CNAME` (lock21.info) is published with every deployment, so the custom domain survives it.

## 0.0.2 - 2026-10-18

- The site is kept out of search engines: every page has `robots: noindex, nofollow` (Docusaurus `noIndex`).
- Deployment fixed (`npm run build` / `npm run deploy` instead of the invalid `npm build` / `npm deploy`).
- GPT translation workflows removed (failing since 2025); English translations are done by Claude on request.
- `AGENTS.md`: guidance for AI coding agents working in this repository.
- Missing favicon path fixed; translation preamble removed from the English dive log.

## 0.0.1

- Docusaurus site: field notebook of the Lock 21 photogrammetry project (zones, dive log, workflow, problems encountered).
