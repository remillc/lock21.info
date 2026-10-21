# Changelog

Versions follow [semantic versioning](https://semver.org/) (major.minor.patch), below 1.0.0 while the site is not public.

## Unreleased

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
