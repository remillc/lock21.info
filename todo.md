# To do

Working list for the lock21.info project. Check items off as they are done (`[x]`), and add new ones at the right place. Details and decisions live in `tools/publish-model/README.md` and `AGENTS.md`.

## 3D model publishing (branch `feature/web-3d-model`)

### Viewer

- [x] Standalone viewer (Vite + three.js + 3d-tiles-renderer) in `viewer/`, outside Docusaurus
- [x] Reduce the first-view weight: meshopt compression + no root content, 61 MB -> 18 MB for 2 zones
- [ ] Lighten the coarse levels of detail: the first view of the 8 zones loads 35.8 MB (each zone's coarsest level is about 20 % of its triangles)
- [ ] Test on a phone (Wi-Fi, `?tiles=http://<PC IP>:8081`), especially an iPhone (Safari memory limit)
- [ ] Initial camera and navigation (what the visitor sees first)
- [ ] Show the mockups and terrain for the zones not yet digitised (hidden once a zone is scanned)
- [ ] Publish the viewer build under `lock21.info/modele/` and link it from the site

### Zones

- [x] Zone 12: prepared and tiled from the 13 M-face export
- [x] Zone 10: swapped to the 2026 export in `lock-21-publishing.blend`, prepared and tiled
- [x] Zones 2, 3, 11: prepared and tiled
- [x] Zone 1: prepared and tiled from the 621 k export
- [ ] Zone 1: export a textured high-res model from Metashape (chunk 13 has none)
- [x] Zone 4: prepared and tiled, Lattice carried over
- [ ] Zone 4: export a high-res model (chunk 10, 38 M faces, 15 168 px)
- [x] Zone 8: swapped to a textured 200 k edit mesh (colour baked from the 20 M export), prepared and tiled
- [ ] Zone 7: export from Metashape (`zone-7.psx`, chunk 39, 14.8 M faces, 12 772 px) into `O:\modeles\zone-7\`, then set `source`
- [ ] Zone 10: export the 22.6 M-face model (10 014 px texture) if the 3 M export (6 600 px) is too coarse
- [ ] Zone 16: digitised (7 M faces) but not in the `.blend` yet
- [ ] Textures: the analysis targets 1.3 mm per texel; current exports are 2 to 5 times coarser. Decide the viewing distance, then retexture in Metashape where needed

### Pipeline

- [x] `.blend` as source of truth: `source` property, registration, deform modifiers, proximity cleanup
- [x] Change detection (fingerprints) and npm scripts (`model:check`, `model:post-modified`, `model:publish`)
- [ ] `model:post-modified` and others only run on Windows (PowerShell); fine for now

### Hosting and downloads

- [ ] Cloudflare: create the R2 bucket and an API token (Christian)
- [ ] Move `lock21.info` DNS from Porkbun to Cloudflare (needed for a custom domain such as `tiles.lock21.info`)
- [ ] Upload script (rclone), versioned folders, then delete superseded versions
- [ ] Downloadable whole model (`.glb`, about 100 to 150 MB), generated from the manifest
- [ ] KMZ for Google Earth: needs GPS coordinates of at least two points on the site, and a light COLLADA model
- [ ] Choose a licence for the model data (CC BY 4.0 or CC BY-NC 4.0); the repo's MIT licence covers code only
- [ ] Check whether publishing a downloadable model of the site needs any approval (Ontario marine archaeology rules, SOS Ottawa for the Baets drawings)

### Documentation

- [ ] Document how the project's repositories and folders are organized (Git repo, `viewer/`, `tools/`, `O:\photogrammetry`, `O:\modeles`, `O:\publishing`, R2)
- [ ] Add a workflow page to the site (`6. publication.md`) once the pipeline is stable
- [ ] Rename the "zone N" Blender materials (`Material_0.00x`, `Empty.00x`) consistently

## Site

- [ ] Migrate the site from Docusaurus to Astro (after the 3D proof of concept)
- [ ] Underwater look for the viewer: set aside on branch `feature/underwater-look`
- [ ] Docusaurus template leftovers: footer links, home page, sample blog posts, `authors.yml`
- [ ] Move the English dive log to `collecte/` (it sits at the docs root) and add the `DataGrid` import
- [ ] `tests/` pages are not in the sidebar

## Other

- [ ] lock21.ca: owner contacted on 2026-10-18 through CIRA; reminder in Google Calendar on 2027-03-14 (expiry)
