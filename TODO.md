# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#110**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] #108 The navigation's help dialog, opened once at the first visit (src/viewer/nav-help.js, main.js openSwimHelp; a
  `<dialog>` in the viewer's shadow root): it should stay over the 3D viewer when the /modele page scrolls (Christian,
  2026-10-30). As a modal dialog it sits in the window's top layer, centred on the window, not on the viewer's frame
  (to check: in the frame, the page scrolled)
- [ ] #75 Colour grading at the source, zone by zone (DaVinci Resolve, at frame extraction; the corrections after the
  fact only invent the lost blue and red). Zone 3 done and online (2026-10-29, Christian: « peu de différence, mais je
  préfère après »): the chunk « zone 3 - lens corrected - graded - clean RU=30, PA=5, RE=0.4 » of
  `O:\photogrammetry\zone-3.psx` retextured from the graded frames with the masks, 16 206 px, Mosaic, holes filled
  (`tools/color-grading/retexture_chunk.py`, Metashape 2.3.1: about 26 h of blending), registration as before (14.4 mm).
  Its non-graded frames deleted the same day (the original chunks relinked to the graded ones, `relink_frame.py -a`;
  tools/color-grading/README.md). Downloads rebuilt with it the same day. Left: the other zones, zone 12 first
- [ ] #5 Colour balance and green removal: bake them into the downloadable model
  - Tried and dropped (2026-10-25): a whole-texture balance before tiling (`color_correct.py`) turned the model mauve
    and flat in the viewer, whose own corrections then applied twice; the blue and red the water took are not in the
    textures. The viewer's look stays the reference: bake its corrections (zone balance, green and cyan removal,
    saturation) into the downloadable model. `color_patch.py` (a part of a zone brought to its neighbours' colour) stays
    for local cases. The real fix is upstream: #75.

### Pipeline

- [ ] #10 `model:post-modified` and others only run on Windows (PowerShell); fine for now
- [ ] #94 Zone 3's wooden floor lacks detail in the viewer (Christian, 2026-10-26): find whether it is the texture
  (texels on the floor, `tools/model-analysis/`), the mesh, or the tile level the viewer picks, and fix it

### Hosting and downloads

- [ ] #72 Other download formats worth adding? Candidates: the OBJ (+ .mtl, .jpg; already built beside the GLB) as a
  zip, for Blender, MeshLab and CloudCompare; STL for 3D printing (a closed, simplified model at 1:200); the AR USDZ
  as a download; a point cloud (PLY or LAZ) for archaeology and GIS tools; an orthophoto and a height map of the floor
  (GeoTIFF) for QGIS; the public address of the 3D Tiles (Cesium and other viewers); a Sketchfab upload

### Documentation

- [ ] #17 Add a workflow page to the site (`6. publication.md`) once the pipeline is stable

### Relief and lamp bands (relief on every zone since 2026-10-19; the wet look removed on 2026-10-25)

- [ ] #21 Relief: fold the relief steps (`relief_zones.ps1`) into `publish_zones.ps1`, so that one command republishes a
  zone with its relief

### Virtual reality (idea)

- [ ] #27 VR option on lock21.info (WebXR, three.js): view the model in a headset, either
  - at human scale, as if standing alongside the structures (immersive VR), or
  - placed at its real GPS position (needs the site's georeferencing, same as the KMZ: GPS coordinates of at least
    two points)
  - check headset memory and frame rate (stereo rendering doubles the GPU load; render on demand does not apply in VR)

## Site

- [ ] #109 Figure captions badly aligned (Christian, 2026-10-30, the /modele page's « Réalité augmentée » QR codes on a
  phone): « FIG. 01 Sur une table 1:100 » centred and wrapped under a narrow image (the label broken over two lines,
  the second line of the caption offset). Look at the captions of figures narrower than the column (`figure-center`,
  side-by-side figures): the label and the text on one line, aligned with the image's edge or centred as a block
- [ ] #107 The display language for a visitor whose browser prefers English (Christian, 2026-10-30): today `/` is
  always French (a static file: the Worker doesn't read `Accept-Language`, and no script reads `navigator.language`);
  English only through the footer's language select or an `/en/` link. No automatic redirect on the same address
  (Googlebot crawls mostly in English and might no longer see the French page). Proposed: a discreet banner on the
  French pages, shown only when the browser prefers English (« This site is also in English → », to the page's
  English version, `localPath`), dismissed for good once closed or once the visitor chose a language. To decide: on
  every page or the home page only, and the reverse (French on the English pages)
- [ ] #43 Accessibility (WCAG 2.2 AA): audited on 2026-10-26 (axe-core on every page, both themes, desktop and phone;
  keyboard, 320 px reflow, text spacing) and the code issues fixed. Left, for Christian: a check with a real screen
  reader (NVDA, VoiceOver) and Windows' high contrast mode
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

- [ ] #106 A small zone map as a site component (Christian, 2026-10-29, from the 404 page's mockup 3): zones 1 to 25
  as squares, those online in the secondary colour (from the manifest, like the home page's count), those to come
  outlined, and room for one more state (dashed, the viewer's violet for zones not yet surveyed). Kept for later use;
  mockup: `docs/mockups/404-visuals.html` (#zones), also at https://claude.ai/artifact/HsJ5EGnLeGffA6mJWmY1oZ. The
  mockup's grid is a schematic, not the real layout of the zones (decoupage-site)
- [ ] #93 Document the gear (Christian, 2026-10-26): his own photo of the GoPro Hero6 Black in its housing, to replace
  GoPro's product photo (« Matériel utilisé », Caméra); « Le rig » (`collecte/rig.md`, since 2026-10-26: photos of
  2024-05-16 and 2024-06-14, Sylvain Marcotte's 3D model) still has one « à compléter »: the rig's construction
  (fittings, how it attaches to the scooter; the 2020 aluminium profiles and the lights written)
- [ ] #97 Performance audit (Christian, 2026-10-27): the site's pages and /modele, on a computer and a phone (Lighthouse,
  Core Web Vitals; the 3D viewer's load time and frame rate, its memory), with findings to act on, as the usability and
  SEO audits (docs/audits/)
- [ ] #105 Google Analytics, with Christian, from 2026-10-31 (two or three days after the custom definitions were
  registered on 2026-10-29): explore the new values in Explore: sessions with viewer_end, the time standard and
  underwater (standard_seconds, underwater_seconds), dives (dive_end, seconds), the tour's steps (step), the viewer's
  buttons (button), the first move (move), the settings, season, lamp, theme, language and AR size. A setting's new
  value is sent as `setting_value` since 2026-10-29 (was `value`, a name GA keeps for money): once deployed, register it
  as a tenth dimension (event scope)
- [ ] #91 SEO audit: outside the site, for Christian.  S9 links: the Sketchfab profile, DECOSTOP, the Wikipedia « Lost
  Villages » talk page (dead source for Lock 21), Lost Villages Historical Society, Save Ontario Shipwrecks
- [ ] #99 For the next dives, for Christian: buy a magenta fluorescent spray paint at Canadian Tire (Rust-Oleum
  Specialty All-Surface, fluorescent,
  https://www.canadiantire.ca/en/pdp/rust-oleum-specialty-all-surface-aerosol-spray-paint-fluorescent-312-g-0482513p.0482515.html)
  and repaint the measuring rods, then cover them with a protective matte clear coat (the orange rod blends with the
  mussels and rust: tools/color-grading/make_masks.mjs, TODO #75)
- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
