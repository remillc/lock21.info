# To do

Working list for the lock21.info project. Check items off as they are done (`[x]`), and add new ones at the right place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing (branch `feature/web-3d-model`)

### Viewer

- [x] Standalone viewer (Vite + three.js + 3d-tiles-renderer) in `viewer/`, outside Docusaurus
- [x] Reduce the first-view weight: meshopt compression + no root content, 61 MB -> 18 MB for 2 zones
- [x] Lighten the coarse levels of detail: about 40 k / 150 k triangles per zone (meshoptimizer), first view of the 8 zones 35.8 MB -> 24.3 MB, mostly textures now
- [ ] If phones struggle: lower the texture resolution of the coarse levels
- [x] Test on an Android phone (USB, `chrome://inspect` port forwarding 3100 and 8081): looks good (2026-10-18)
- [ ] Test on an iPhone (Safari memory limit; Wi-Fi with `?tiles=http://<PC IP>:8081`, or Safari Web Inspector from a Mac)
- [x] Anisotropic filtering and ambient occlusion (N8AO, `?ao=0`, `?aoRadius=`, `?aoIntensity=`, `?aoDebug=1`)
- [x] Shared memory budget for all zones (zones were missing on the phone); `?stats=1` overlay: phone fully loaded at 280 / 450 MB
- [ ] Choose default ambient occlusion settings (radius, intensity) after viewing close up
- [ ] Initial camera and navigation (what the visitor sees first)
- [x] Context published: `filler` objects and `terrain` collection, terrain materials baked (no cast shadows)
- [ ] Show the mockups for the zones not yet digitised (hidden once a zone is scanned)
- [ ] Publish the viewer build under `lock21.info/modele/` and link it from the site

### Zones

- [x] Zone 12: prepared and tiled from the 13 M-face export
- [x] Zone 10: swapped to the 2026 export in `lock-21-publishing.blend`, prepared and tiled
- [x] Zones 2, 3, 11: prepared and tiled
- [x] Zone 1: prepared and tiled from the 621 k export
- [ ] Textures to redo after the zone 13 dense cloud (published texel size vs 1.3 mm target):
  - zone 4 (~6.3 mm): export chunk 10's 38 M model (15 168 px) or rebuild the texture
  - zone 1 (~3 mm): build an 8 192 to 12 288 px texture on the high-res model (chunk 13)
  - zone 10 (~2.3 mm): export the 22.6 M model (10 014 px)
  - single texture page, max 16 384 px (the pipeline handles one texture per zone); then update `source` and run `model:post-modified`
- [x] Zone 4: prepared and tiled, Lattice carried over
- [x] Zone 8: swapped to a textured 200 k edit mesh (colour baked from the 20 M export), prepared and tiled
- [x] Zone 7: exported (chunk 39, m1, 14.8 M faces) and published
- [ ] Zone 13: partial data being generated; then import into the `.blend` with `source`
- [ ] Zone 16: digitised (7 M faces) but not in the `.blend` yet
- [ ] Textures: the analysis targets 1.3 mm per texel; current exports are 2 to 5 times coarser. Decide the viewing distance, then retexture in Metashape where needed

### Pipeline

- [x] `.blend` as source of truth: `source` property, registration, deform modifiers, proximity cleanup
- [x] Change detection (fingerprints) and npm scripts (`model:check`, `model:post-modified`, `model:publish`)
- [ ] `model:post-modified` and others only run on Windows (PowerShell); fine for now

### Hosting and downloads

- [x] Cloudflare R2: bucket `lock21-tiles`, CORS, API token, custom domain `tiles.lock21.info` (2026-10-18); first view loads 10.5 MB in about 1 s from the PC
- [x] Move `lock21.info` DNS from Porkbun to Cloudflare (2026-10-18, records in DNS only)
- [x] Upload script `upload_r2.mjs` (`npm run model:upload`): 586 files, 369 MB uploaded on 2026-10-18
- [ ] Viewer build pointing to `https://tiles.lock21.info`, published under `lock21.info/modele/`
- [ ] Cloudflare Cache Rule on `tiles.lock21.info` (lock21.info → Caching → Cache Rules: hostname equals tiles.lock21.info → Eligible for cache, edge TTL: use the origin's Cache-Control). Today every request reaches R2 (`cf-cache-status: DYNAMIC`, .json and .glb are not cached by default); check `cf-cache-status: HIT` afterwards
- [ ] Downloadable whole model (`.glb`, about 100 to 150 MB), generated from the manifest
- [ ] KMZ for Google Earth: needs GPS coordinates of at least two points on the site, and a light COLLADA model
- [ ] Choose a licence for the model data (CC BY 4.0 or CC BY-NC 4.0); the repo's MIT licence covers code only
- [ ] Check whether publishing a downloadable model of the site needs any approval (Ontario marine archaeology rules, SOS Ottawa for the Baets drawings)

### Documentation

- [ ] Document how the project's repositories and folders are organized (Git repo, `viewer/`, `tools/`, `O:\photogrammetry`, `O:\modeles`, `O:\publishing`, R2)
- [ ] Add a workflow page to the site (`6. publication.md`) once the pipeline is stable
- [ ] Rename the "zone N" Blender materials (`Material_0.00x`, `Empty.00x`) consistently

### Surface look (idea)

- [ ] Material look in the viewer like the Blender shaders (wet, metallic, roughness...): needs lit materials
  (MeshStandardMaterial / MeshPhysicalMaterial) instead of the unlit display, an environment map for reflections,
  and normals or normal maps (baked from the high-res exports: Metashape or bake_texture.py). Read the shader
  settings from each zone's Blender material and pass them through the manifest. Caveat: the photo textures already
  contain the lamps' lighting; adding lighting on top doubles it (de-lighting the textures helps)

### Zebra mussel relief (idea)

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

- [x] Removed the GPT translation workflows (they had failed since 2025; last successful run 2024-11-10)
- [ ] English version of the docs: translated by Claude on request (from `i18n/fr/...` to `i18n/en/...`), rather than by a
  workflow on every push; the `OPENAI_API_KEY` repository secret can then be deleted on GitHub

- [ ] Migrate the site from Docusaurus to Astro (after the 3D proof of concept)
- [ ] Underwater look for the viewer: set aside on branch `feature/underwater-look`
- [ ] Docusaurus template leftovers: footer links, home page, sample blog posts, `authors.yml`
- [ ] Move the English dive log to `collecte/` (it sits at the docs root) and add the `DataGrid` import
- [ ] `tests/` pages are not in the sidebar

## Other

- [ ] lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
