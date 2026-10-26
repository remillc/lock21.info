# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#89**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] #75 Redo the colour grading in DaVinci Resolve, at frame extraction (the root of the textures' colour cast; the
  corrections after the fact only invent the lost blue and red: on 2026-10-25 a whole-texture balance turned the model
  mauve and flat in the viewer). Try on zone 3 first: a flagrant case (yellow-olive, the wall of the three sluice gates
  more olive than its side walls) and, with zone 12, the zone with the most visual potential. Grade per dive from the
  Protune footage (the colour chart where it is usable), export the TIFFs under the same names, point a working copy
  of the Metashape project (`O:\publishing\metashape\zone-3`) to them and rebuild only the texture (the alignment and
  mesh kept); then republish and compare with `?compare=`.
- [ ] #5 Colour balance and green removal: bake them into the downloadable model
  - Tried and dropped (2026-10-25): a whole-texture balance before tiling (`color_correct.py`) turned the model mauve
    and flat in the viewer, whose own corrections then applied twice; the blue and red the water took are not in the
    textures. The viewer's look stays the reference: bake its corrections (zone balance, green and cyan removal,
    saturation) into the downloadable model. `color_patch.py` (a part of a zone brought to its neighbours' colour) stays
    for local cases. The real fix is upstream: #75.
- [ ] #68 Yellow perch schools in the underwater view
- [ ] #76 Bass: a more natural turn (`viewer/src/bass.js`); the body bends into the turn instead of pivoting
- [ ] #80 Remove the `/modele/viewer` iframe: the 3D viewer as part of the site (one project, one build, one
  `package.json`), not a second Vite app embedded in a frame. Options (Christian, 2026-10-26):
  - a native Custom Element `<l21-viewer>` (`src/viewer/`, the current modules moved in), placed by an Astro component
    on `/modele`: three.js bundled by the site's Vite, only on that page; recommended (no framework, the site's rules)
  - the same as a Lit element: only worth it for the panels (settings, tour), the 3D part stays imperative
  - a first step that keeps the frame: the viewer as an Astro page of the site (`src/pages/modele/viewer.astro`), one
    build and one set of dependencies, the frame removed later
  To solve on the way: the viewer's global CSS (`html, body { overflow: hidden }`, `main`) scoped to the element
  (shadow DOM or a layer), its window-wide listeners (keys, pointer) and WebGL released on `disconnectedCallback`
  (client-side routing), full screen on the element instead of the document, the postMessage link to the page
  (camera address, drag) replaced by direct calls, and its texts merged into the site's messages. The bare
  `/modele/viewer` address can go away (Christian, 2026-10-26: no need to keep or redirect it)

### Pipeline

- [ ] #10 `model:post-modified` and others only run on Windows (PowerShell); fine for now

### Hosting and downloads

- [ ] #13 Google Earth and downloads (`tools/google-earth/README.md`): 700 000 triangles open in Google Earth Pro, the
  model placed and turned (2026-10-25); rebuilt with the chart terrain, the Macdonnel Island mark and the numbered parts,
  checked (`check_model.mjs`) and uploaded on 2026-10-25; zone 18's sides checked in Google Earth (Christian, 2026-10-26).
  Google Earth Web: the KMZ shows only the marks (it draws no KML models); the GLB, placed by hand (it reads no position
  in a GLB), steps on /modele; a shared Google Earth Web project with the model placed, linked under the downloads
  (2026-10-26). To check: those steps, tried by Christian
- [ ] #72 Other download formats worth adding? Candidates: the OBJ (+ .mtl, .jpg; already built beside the GLB) as a
  zip, for Blender, MeshLab and CloudCompare; STL for 3D printing (a closed, simplified model at 1:200); the AR USDZ
  as a download; a point cloud (PLY or LAZ) for archaeology and GIS tools; an orthophoto and a height map of the floor
  (GeoTIFF) for QGIS; the public address of the 3D Tiles (Cesium and other viewers); a Sketchfab upload

### Documentation

- [ ] #17 Add a workflow page to the site (`6. publication.md`) once the pipeline is stable

### Relief and lamp bands (relief on every zone since 2026-10-19; the wet look removed on 2026-10-25)

- [ ] #21 Relief: fold the relief steps (`relief_zones.ps1`) into `publish_zones.ps1`, so that one command republishes a
  zone with its relief
- [ ] #26 Move the viewer's shader patches to three-custom-shader-material (CSM) if the relief is kept

### Virtual reality (idea)

- [ ] #27 VR option on lock21.info (WebXR, three.js): view the model in a headset, either
  - at human scale, as if standing alongside the structures (immersive VR), or
  - placed at its real GPS position (needs the site's georeferencing, same as the KMZ: GPS coordinates of at least
    two points)
  - check headset memory and frame rate (stereo rendering doubles the GPU load; render on demand does not apply in VR)

## Site

- [ ] #43 Accessibility (WCAG 2.2 AA): audited on 2026-10-26 (axe-core on every page, both themes, desktop and phone;
  keyboard, 320 px reflow, text spacing) and the code issues fixed. Left: the Markdown tables' empty header cells
  (14 pages: name the column, or no header row), the heading levels of `problemes/nettete-images` (and its English
  page), a check with a real screen reader (NVDA, VoiceOver) and Windows' high contrast mode
- [ ] #39 Design: applied (tokens, fonts, header and footer bars, home page, logo, tables, the 3D viewer's fonts and
  colours); to do: check contrast (WCAG AA) in both themes
- [ ] #48 Guided tour (viewer/src/tour.js, tour-steps.js; 8 steps, Christian's views and moves, 2026-10-24): the texts
  are drafts to review (zone 18 is not described on the zone map page); step 7 (the north wall's steps) is half hidden
  by a context fill in front of the camera. Not placed: the stone passage through the wall (Christian's favourite,
  `images/views/2026-10-23-view-1.webp`): `?cam=-37.01,2.56,-14.66,-33.02,2.48,-14.40`
- [ ] #78 /modele, wide screens: a large gap between the second column (« Naviguer ») and the third (downloads). The
  three columns are equal thirds (`.columns`, `repeat(auto-fit, minmax(18rem, 1fr))`, ModelPage.astro), and the
  navigation table and button list only take their own width (tables are `width: max-content`, custom.scss), so
  the rest of the middle third stays empty. Options: columns sized to their content (e.g. `auto auto 1fr`), the table
  at the column's full width, or the downloads moved under the navigation
- [ ] #81 Make the site (a multi-page Astro site) a progressive web app (Christian, 2026-10-26): a web app manifest
  (name, icons from the logo, theme colours, start at `/` or `/en/`), installable on a phone; a service worker
  (e.g. `@vite-pwa/astro`, Workbox) caching the pages and their assets so the notebook reads offline (at the dive site,
  no network), with an offline page. To decide: what the 3D model keeps offline (its tiles are hundreds of MB on
  `tiles.lock21.info`: none, the start view's, or a chosen zone), how updates reach visitors (the new version on the
  next visit), and how it fits client-side routing and Cloudflare's cache headers (`public/_headers`)

- [ ] #82 Usability audit (2026-10-26, `docs/audits/usability-2026-10-26.md`): the small code fixes. V13 the 404 (#86); V8 Pagefind's French strings;
  V19 « Footnotes », « Back to reference », « Selectionner »; V20 English number formats on `/en/model`; V21 the footer
  selects' width; V23 the ☰ on the desktop home; V24–V27 (tour after a drag, Escape leaves diving, one name for the dive
  mode, the no-download Google Earth link first, « 150° »); V28 two missing spaces; V29 settings intro and session code;
  V35 card 02's target; V36 a scroll cue on wide tables; V38 ⌂ named on the tour's last card; V14 coordinates as a map
  link on phones; V18 the dive log's total row and sticky header
- [ ] #83 Usability audit: the viewer on phones (V12; V2 and V11 fixed 2026-10-26): a touch version of the swim help.
  Check on a real phone
- [ ] #84 Usability audit: content, for Christian. V16 a « voir
  dans le modèle 3D » link per zone; V30 a caption under the viewer (underwater, violet = not yet scanned); V32 a
  description per page; V33 labels (« Zones de l'écluse »; « Effet de banane » and « Nuage de points dense » done); V34
  About and Thanks last in the sidebar
- [ ] #85 Usability audit: what agents can't settle. V31 wheel zoom from the start view on a desktop with a GPU; a
  20-minute test with three to five people, in French and English (the eight tasks in the report's « A test with real
  people »)

- [ ] #86 The 404 page (Christian, 2026-10-26): its design and its message. Today Starlight's bare « 404 · Page non
  trouvée. Vérifiez l'URL ou essayez d'utiliser la barre de recherche. », in French under `/en/` too, with no way
  onward (audit V13). In the site's look, in the page's language (an English one for `/en/*`), with links to the home
  page, the 3D model and the zone map, and the search

- [ ] #87 Left menu (sidebar), Christian 2026-10-26: as a page loads, its groups show open, then close, a flicker.
  Only the current page's group should be open from the start (Starlight's `<details open>` on every group, or the
  sidebar state restored by Head.astro / client-side routing after the first paint: to find)
- [ ] #88 Analytics on all actions (Christian, 2026-10-26): an event for every action a visitor takes, on the site (links,
  search, menu, theme and language, downloads; Google Analytics, `Analytics.astro`, already sends page views) and in the
  3D viewer (each button, tour steps, dive mode, settings, AR; `viewer/src/telemetry.js`, `/api/log`). To decide: one
  list of event names, which channel takes which, and the privacy page brought up to date

## Other

- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
