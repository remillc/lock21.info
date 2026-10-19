# To do

Working list for the lock21.info project. Remove items once they are done (the history is in git and CHANGELOG.md), and add new ones at the right place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing

### Viewer

- [ ] If phones struggle: lower the texture resolution of the coarse levels
- [ ] Test on an iPhone (Safari memory limit; Wi-Fi with `?tiles=http://<PC IP>:8081`, or Safari Web Inspector from a Mac)
- [ ] Choose default ambient occlusion settings (radius, intensity) after viewing close up
- [ ] Initial camera and navigation (what the visitor sees first)
- [ ] Colour balance and green removal: bake them into the downloadable model
- [ ] Show the mockups for the zones not yet digitised (hidden once a zone is scanned)

### Zones

- [ ] Zone 13: partial data being generated; then import into the `.blend` with `source`
- [ ] Zone 16: digitised (7 M faces) but not in the `.blend` yet
- [ ] Textures: the analysis targets 1.3 mm per texel; current exports are 2 to 5 times coarser. Decide the viewing distance, then retexture in Metashape where needed

### Pipeline

- [ ] `model:post-modified` and others only run on Windows (PowerShell); fine for now

### Hosting and downloads

- [ ] Cloudflare Cache Rule on `tiles.lock21.info` (lock21.info → Caching → Cache Rules: hostname equals tiles.lock21.info → Eligible for cache, edge TTL: use the origin's Cache-Control). Today every request reaches R2 (`cf-cache-status: DYNAMIC`, .json and .glb are not cached by default); check `cf-cache-status: HIT` afterwards
- [ ] Downloadable whole model (`.glb`, about 100 to 150 MB), generated from the manifest
- [ ] KMZ for Google Earth: needs GPS coordinates of at least two points on the site, and a light COLLADA model
- [ ] Choose a licence for the model data (CC BY 4.0 or CC BY-NC 4.0); the repo's MIT licence covers code only
- [ ] Check whether publishing a downloadable model of the site needs any approval (Ontario marine archaeology rules, SOS Ottawa for the Baets drawings)

### Documentation

- [ ] Update outdated information in the site's Markdown files (e.g. `workflow/4. modele.md`, `5. texture.md`: publishing pipeline, textures, relief, colour work)
- [ ] Document how the project's repositories and folders are organized (Git repo, `viewer/`, `tools/`, `O:\photogrammetry`, `O:\modeles`, `O:\publishing`, R2)
- [ ] Add a workflow page to the site (`6. publication.md`) once the pipeline is stable
- [ ] Rename the "zone N" Blender materials (`Material_0.00x`, `Empty.00x`) consistently

### Surface look (idea)

- [ ] Add lighting to the scene (viewer): today every surface is shown unlit, the photo texture carries its own
  light. Options: directional sun + ambient/hemisphere light, or an environment map; needs lit materials and
  normals (computed on load, or normal maps). Goes with the surface-look and zebra-mussel items; mind the lamp
  lighting already baked into the textures (de-lighting)
- [ ] Material look in the viewer like the Blender shaders (wet, metallic, roughness...): needs lit materials
  (MeshStandardMaterial / MeshPhysicalMaterial) instead of the unlit display, an environment map for reflections,
  and normals or normal maps (baked from the high-res exports: Metashape or bake_texture.py). Read the shader
  settings from each zone's Blender material and pass them through the manifest. Caveat: the photo textures already
  contain the lamps' lighting; adding lighting on top doubles it (de-lighting the textures helps)

### Zebra mussel relief (idea)

- [ ] High-res geometry exports for the relief (edges about 1 cm or less, geometry only, same chunk as the source):
  - zone 1: chunk 13, 8.7 M faces (about 5 to 6 mm)
  - zone 4: being rebuilt in Metashape with medium/high depth maps (the current ones are `low`); about 20 M faces
  - zone 10 (optional): chunk 0, 22.6 M faces
- [ ] `bake_relief.py`: take a geometry-only export other than `source` (aligned on the source), apply the Lattice (zone 4)
- [ ] Decide: relief on by default for all zones (download about x2 per zone)
- [ ] De-lighting of the lamp bands (`delight_texture.py`, tested on zone 12): run it on zone 10 (strongest bands), then decide whether it goes into the pipeline for every zone
- [ ] Relief on phones: memory, heat, smoothness; probably off by default there

- [ ] The walls are covered with zebra mussels; their relief (1 to 3 cm) is in the high-res exports (zone 12: about
  7 mm edges) but lost in the published mesh (about 2.5 cm edges). Bake it from the high-res export onto the published
  mesh, per zone (same idea as bake_texture.py):
  - cavity / ambient occlusion map multiplied into the colour: works with the current unlit display, no extra file
  - normal map: needs lit materials (see Surface look) and one more texture per tile; ETC1S compresses normals poorly

### Virtual reality (idea)

- [ ] VR option on lock21.info (WebXR, three.js): view the model in a headset, either
  - at human scale, as if standing alongside the structures (immersive VR), or
  - placed at its real GPS position (needs the site's georeferencing, same as the KMZ: GPS coordinates of at least two points)
  - check headset memory and frame rate (stereo rendering doubles the GPU load; render on demand does not apply in VR)

## Site

- [ ] English version of the docs: translated by Claude on request (from `i18n/fr/...` to `i18n/en/...`), rather than by a
  workflow on every push; the `OPENAI_API_KEY` repository secret can then be deleted on GitHub

- [ ] Before the switch: define the guidelines for frameworks and practices. Christian's preferences: simplicity,
  plain DOM + CSS written in SCSS; Web Components with Lit when a component needs reactive state, native Custom Elements
  otherwise; no heavy UI framework (React, Vue...) unless a real need appears
- [ ] Switch the site from Docusaurus to Astro (the 3D proof of concept is done): French docs and English
  translation, sidebar, blog, the dive log table with its total duration, `noindex` while not public, the
  viewer kept as its own app under `/modele/`, GitHub Pages deployment
- [ ] Underwater look for the viewer: set aside on branch `feature/underwater-look`
- [ ] Docusaurus template leftovers: footer links, home page, sample blog posts, `authors.yml`
- [ ] Move the English dive log to `collecte/` (it sits at the docs root) and add the `DataGrid` import
- [ ] `tests/` pages are not in the sidebar

## Other

- [ ] lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
