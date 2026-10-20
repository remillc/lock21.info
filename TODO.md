# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#40**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] #1 If phones struggle: lower the texture resolution of the coarse levels
- [ ] #2 Test on an iPhone (Safari memory limit; Wi-Fi with `?tiles=http://<PC IP>:8081`, or Safari Web Inspector from a Mac)
- [ ] #3 Choose default ambient occlusion settings (radius, intensity) after viewing close up
- [ ] #4 Initial camera and navigation (what the visitor sees first)
- [ ] #5 Colour balance and green removal: bake them into the downloadable model
- [ ] #6 Show the mockups for the zones not yet digitised (hidden once a zone is scanned)

### Zones

- [ ] #7 Zone 13: partial data being generated; then import into the `.blend` with `source`
- [ ] #8 Zone 16: digitised (7 M faces) but not in the `.blend` yet
- [ ] #9 Textures: the analysis targets 1.3 mm per texel; current exports are 2 to 5 times coarser. Decide the viewing
  distance, then retexture in Metashape where needed

### Pipeline

- [ ] #10 `model:post-modified` and others only run on Windows (PowerShell); fine for now

### Hosting and downloads

- [ ] #11 Cloudflare Cache Rule on `tiles.lock21.info` (lock21.info → Caching → Cache Rules: hostname equals
  tiles.lock21.info → Eligible for cache, edge TTL: use the origin's Cache-Control). Today every request reaches R2
  (`cf-cache-status: DYNAMIC`, .json and .glb are not cached by default); check `cf-cache-status: HIT` afterwards
- [ ] #12 Downloadable whole model (`.glb`, about 100 to 150 MB), generated from the manifest
- [ ] #13 Google Earth and downloads (`tools/google-earth/README.md`): online on R2 (network KMZ at 600 000 triangles,
  GLB of 2 M triangles). To check: the online KMZ in Google Earth Pro (only tested from a local server), the GLB in
  Google Earth Web; whether 700 000 triangles still open (600 000 opens, 800 000 crashes)

### Documentation

- [ ] #16 Document how the project's repositories and folders are organized (Git repo, `viewer/`, `tools/`,
  `O:\photogrammetry`, `O:\modeles`, `O:\publishing`, R2)
- [ ] #17 Add a workflow page to the site (`6. publication.md`) once the pipeline is stable
- [ ] #18 Rename the "zone N" Blender materials (`Material_0.00x`, `Empty.00x`) consistently

### Relief, wet look and lamp bands (branch `feature/relief`, tested on zones 1 and 12)

- [ ] #21 Relief: upload the relief tiles of
  every zone (about x1.5 to x2 per zone; ask first), then fold the relief steps into `publish_zones.ps1`
- [ ] #22 Relief on phones: memory, heat, smoothness; probably off by default there
- [ ] #23 Default light direction and strength (`?light=`, `?shade=`), after viewing from several angles; the photos
  already contain the lamps' light, so some directions may look odd
- [ ] #24 De-lighting of the lamp bands (`delight_texture.py`): run it on zone 10 (strongest bands), then decide whether
  it goes into the pipeline for every zone
- [ ] #25 Optional: read each zone's Blender shader settings (wetness, roughness) and pass them through the manifest
- [ ] #26 Move the viewer's shader patches to three-custom-shader-material (CSM) if the relief is kept

### Virtual reality (idea)

- [ ] #27 VR option on lock21.info (WebXR, three.js): view the model in a headset, either
  - at human scale, as if standing alongside the structures (immersive VR), or
  - placed at its real GPS position (needs the site's georeferencing, same as the KMZ: GPS coordinates of at least
    two points)
  - check headset memory and frame rate (stereo rendering doubles the GPU load; render on demand does not apply in VR)

## Site

- [ ] #28 English version of the docs: translated by Claude on request (pages in `src/content/docs/en/`), rather than
  by a workflow on every push
- [ ] #39 Design: applied (tokens, fonts, header and footer bars, home page, logo, tables); to do: a history page for the "L'histoire" entry (it points to the zone map for now), the 3D viewer in the same
  palette and fonts, check contrast (WCAG AA) in both themes
- [ ] #31 Underwater look for the viewer: set aside on branch `feature/underwater-look`

## Other

- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
- [ ] #36 Delete the merged branch `feature/web-3d-model` (identical to `main`)
- [ ] #37 Delete the `OPENAI_API_KEY` repository secret on GitHub (the translation workflows are gone)
- [ ] #38 Slim `lock-21-publishing.blend`: Blender → File → Clean Up → Purge Unused Data (e.g. the unused
  `sandstone_blocks_05` material and its packed 8K textures)
