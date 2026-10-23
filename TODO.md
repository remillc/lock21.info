# To do

Working list for the lock21.info project. Each item has a **stable number** (`#12`): it keeps it until it is
removed, and numbers are never reused, so "todo 12" always means the same item. New items take the next free number:
**#54**. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right
place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] #1 If phones struggle: lower the texture resolution of the coarse levels
- [ ] #3 Choose default ambient occlusion settings (radius, intensity) after viewing close up
- [ ] #5 Colour balance and green removal: bake them into the downloadable model

### Zones

- [ ] #9 Textures: the analysis targets 1.3 mm per texel; current exports are 2 to 5 times coarser. Decide the viewing
  distance, then retexture in Metashape where needed

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
- [ ] #22 Relief on phones: memory, heat, smoothness; probably off by default there
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
- [ ] #53 Thank the people who helped: those mentioned in the pages (dive buddies, Save Ontario Shipwrecks, Nick
  Baets' drawings…) and Sylvain Marcotte, who designed the rig; probably on the About page (French and English)
- [ ] #49 The /modele page's 3D default view on phones is not good (the start view, `START_VIEW` in
  `viewer/src/main.js`, was chosen on a computer screen; a phone's narrow frame needs its own)
- [ ] #48 Idea: a guided tour in the viewer (a sequence of views with a short text each). Stops noted so far:
  - zone 16, the spillway gate door on the floor: `?cam=-18.54,1.28,8.53,-17.08,-0.65,10.34`

## Other

- [ ] #35 lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
- [ ] #38 Slim `lock-21-publishing.blend`: Blender → File → Clean Up → Purge Unused Data (e.g. the unused
  `sandstone_blocks_05` material and its packed 8K textures)
