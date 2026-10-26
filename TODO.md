# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#94**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
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

- [ ] #82 Usability audit (2026-10-26, `docs/audits/usability-2026-10-26.md`): what is left of the small
  fixes, each needing Christian's call. V23 the ☰ on the desktop home; V26 one name for the dive mode; V14
  coordinates as a map link on phones
- [ ] #83 Usability audit: the viewer on phones (V12; V2 and V11 fixed 2026-10-26): a touch version of the swim help.
  Check on a real phone
- [ ] #84 Usability audit: content, for Christian. V16 a « voir
  dans le modèle 3D » link per zone; V30 a caption under the viewer (underwater, violet = not yet scanned); V32 a
  description per page; V33 labels (« Zones de l'écluse »; « Effet de banane » and « Nuage de points dense » done); V34
  About and Thanks last in the sidebar
- [ ] #85 Usability audit: what agents can't settle. V31 wheel zoom from the start view on a desktop with a GPU; a
  20-minute test with three to five people, in French and English (the eight tasks in the report's « A test with real
  people »)

- [ ] #86 The 404 page (Christian, 2026-10-26): its design and its message. Since audit V13 (2026-10-26) it is ours
  (`src/pages/404.astro`, `src/pages/en/404.astro`, `NotFound.astro`), in the page's language, with links to the home
  page, the 3D model and the zone map; its wording is a first draft to review, and its look is plain
- [ ] #93 Document the gear (Christian, 2026-10-26): his own photo of the GoPro Hero6 Black in its housing, to replace
  GoPro's product photo (« Matériel utilisé », Caméra); « Le rig » (`collecte/rig.md`, since 2026-10-26: photos of
  2024-05-16 and 2024-06-14, Sylvain Marcotte's 3D model) still has two « à compléter »: the rig's construction
  (fittings, how it attaches to the scooter; the 2020 aluminium profiles written), the lights (model, number, power)
- [ ] #92 Google Analytics, for Christian: register the custom definitions of the actions sent since TODO #88
  (Admin › Custom definitions). Metrics (unit: seconds): `standard_seconds`, `underwater_seconds` (viewer_end),
  `seconds` (dive_end). Dimensions (event scope): `button`, `step`, `move`, `setting`, `season`, `lamp`, `theme`,
  `language`, `ar_size`. Then, in Explore: sessions with viewer_end, those with underwater_seconds > 0, the sums per
  session
- [ ] #89 SEO audit (2026-10-26, `docs/audits/seo-2026-10-26.md`): the code fixes left. S11 after the next deploy, check that `lock21-info.lock21.workers.dev` no longer answers and that a branch
  preview still works (`workers_dev: false` in `wrangler.jsonc`; else back to true)
- [ ] #90 SEO audit: content, for Christian. S1 a real `description` for the pages that answer a question (dive log, zones, current, gear first), in its
  language, or none (also usability V32)
- [ ] #91 SEO audit: outside the site, for Christian. S3 deploy `main` (27 renamed addresses, 301s ready); S5 Google
  Search Console (domain property, the sitemap; Bing Webmaster Tools done 2026-10-26, its sitemap submitted, and
  `npm run bing:submit` after the deploy), the GitHub README (« not indexed yet »); S9 links: the Sketchfab profile, DECOSTOP, the Wikipedia « Lost
  Villages » talk page (dead source for Lock 21), Lost Villages Historical Society, Save Ontario Shipwrecks
- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
