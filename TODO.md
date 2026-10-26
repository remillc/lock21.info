# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#78**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
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
  (14 pages: name the column, or no header row), the heading levels of `questions/nettete-images` (and its English
  page), a check with a real screen reader (NVDA, VoiceOver) and Windows' high contrast mode
- [ ] #44 Usability audit of the site: what a first-time visitor (diver, heritage enthusiast, photogrammetrist) finds
  and understands, the paths from the home page to the model and the dive log, the 3D viewer's controls on desktop and
  phone, navigation and search, on both languages
- [ ] #39 Design: applied (tokens, fonts, header and footer bars, home page, logo, tables, the 3D viewer's fonts and
  colours); to do: check contrast (WCAG AA) in both themes
- [ ] #48 Guided tour (viewer/src/tour.js, tour-steps.js; 8 steps, Christian's views and moves, 2026-10-24): the texts
  are drafts to review (zone 18 is not described on the zone map page); step 7 (the north wall's steps) is half hidden
  by a context fill in front of the camera. Not placed: the stone passage through the wall (Christian's favourite,
  `images/views/2026-10-23-view-1.webp`): `?cam=-37.01,2.56,-14.66,-33.02,2.48,-14.40`

## Other

- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
