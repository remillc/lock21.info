# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#70**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] #55 Floor flakes in the default view (light shards: coarse levels left over the detail): with the relief's normal
  maps, the view needs more than the desktop tiles budget (1.2 GB); at 2 GB the browser ran out of memory (« Array
  buffer allocation failed », 0.9.0). Make the tiles lighter (smaller normal maps, or none on coarse levels) or load
  what is in view first (the cache's unload priority). Done 2026-10-23: no normal maps on the coarser levels, phones
  without relief and with a 300 MB budget (CHANGELOG); still to try if needed: smaller coarse textures
  (`--lod-texture-scale` below 0.5, a full re-tiling). Measured 2026-10-23 before that: the budget is full right after the start
  view (phone 462 of 450 MB with 15 tiles, desktop 1201 of 1200 MB), so turning or moving loads no new detail, during
  a gesture or after it
- [ ] #5 Colour balance and green removal: bake them into the downloadable model
- [ ] #68 Yellow perch schools in the underwater view
- [ ] #69 Bug: the high-resolution textures don't load (Christian, 2026-10-24: close up, a wall and the floor stay
  blurry, the coarse levels' textures). Seen at `/en/modele?cam=-26.98,1.56,-17.84,-29.45,1.28,-20.03` (local dev)

### Pipeline

- [ ] #10 `model:post-modified` and others only run on Windows (PowerShell); fine for now

### Hosting and downloads

- [ ] #13 Google Earth and downloads (`tools/google-earth/README.md`): the online KMZ opens in Google Earth Pro
  (2026-10-21). To check: zone 18's sides with the double-sided models; the GLB in Google Earth Web; whether 700 000
  triangles still open (600 000 opens, 800 000 crashes)

### Documentation

- [ ] #17 Add a workflow page to the site (`6. publication.md`) once the pipeline is stable

### Relief, wet look and lamp bands (relief and wet look on every zone since 2026-10-19)

- [ ] #21 Relief: fold the relief steps (`relief_zones.ps1`) into `publish_zones.ps1`, so that one command republishes a
  zone with its relief
- [ ] #25 Optional: read each zone's Blender shader settings (wetness, roughness) and pass them through the manifest
- [ ] #26 Move the viewer's shader patches to three-custom-shader-material (CSM) if the relief is kept

### Virtual reality (idea)

- [ ] #27 VR option on lock21.info (WebXR, three.js): view the model in a headset, either
  - at human scale, as if standing alongside the structures (immersive VR), or
  - placed at its real GPS position (needs the site's georeferencing, same as the KMZ: GPS coordinates of at least
    two points)
  - check headset memory and frame rate (stereo rendering doubles the GPU load; render on demand does not apply in VR)

## Site

- [ ] #43 Check the site for accessibility issues (WCAG 2.2 AA): contrast in both themes, keyboard navigation and
  focus (menu, viewer frame, opt-out button), alt texts, headings order, the viewer's controls and the depth gauges
  (aria-hidden), French and English pages
- [ ] #44 Usability audit of the site: what a first-time visitor (diver, heritage enthusiast, photogrammetrist) finds
  and understands, the paths from the home page to the model and the dive log, the 3D viewer's controls on desktop and
  phone, navigation and search, on both languages
- [ ] #39 Design: applied (tokens, fonts, header and footer bars, home page, logo, tables); to do: a history page for the "L'histoire" entry (it points to the zone map for now), the 3D viewer in the same
  palette and fonts, check contrast (WCAG AA) in both themes
- [ ] #48 Idea: a guided tour in the viewer (a sequence of views with a short text each). Stops noted so far:
  - zone 16, the spillway gate door on the floor: `?cam=-18.54,1.28,8.53,-17.08,-0.65,10.34`
  - looking down the stone passage through the wall, its pipes on the floor, the opening at the end (Christian's
    favourite, 2026-10-23; screenshot `images/views/2026-10-23-view-1.webp`): `?cam=-37.01,2.56,-14.66,-33.02,2.48,-14.40`

## Other

- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
