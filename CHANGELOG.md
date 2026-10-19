# Changelog

Versions follow [semantic versioning](https://semver.org/) (major.minor.patch), below 1.0.0 while the site is not public.

## 0.4.0 - 2026-10-19

- Site switched from Docusaurus to Astro + Starlight: same French pages and addresses, search (Pagefind), dive log
  total computed at build time, image zoom (native Custom Element), `noindex` kept; blog samples and the partial
  English translation dropped; deployment pushes `dist/` to `gh-pages` with plain git commands.
- Site name: Écluse 21 in French (Lock 21 in English). Layout: right column 20rem, content fills the space, the dive
  log fits the column (scrolls sideways on phones).
- Design brief (`DESIGN.md`, E2 look on the Material Design 3 token system) and front-end guidelines (`GUIDELINES.md`);
  zone 13 online (12.5 M-face export, 16384 px texture).

## 0.3.0 - 2026-10-19

- Zones online: 1, 3, 4 (new 16384 px texture), 8, 10 and 11 republished; context (terrain, fillers) updated.

- Viewer: the address bar follows the camera (`?cam=`); key C copies the view.
- Viewer: trilinear filtering of tile textures (less shimmering); gloss blurred where the relief varies within a pixel.
- Relief test (zones 1 and 12): object-space normal maps baked from the high-res exports (`bake_relief.py`, `--high`),
  tiled in a second Obj2Tiles run and merged (`merge_normal_maps.mjs`); viewer `?relief=1`, `?light=`, `?shade=`,
  `?wet=` (default 0.15).
- De-lighting test: lamp bands evened out (`delight_texture.py`, `apply_shade.mjs`).

## 0.2.0 - 2026-10-19

- Viewer: colour balance between zones. Each zone's average texture colour goes in `manifest.json`; the
  viewer brings every zone to a common colour and removes 30 % of the water's yellow-green tint
  (`?neutral=0..1`, `?balance=0` to compare).
- Viewer: green removal per pixel (spill suppression: green capped at max(red, blue)), which clears the green
  patches a per-zone gain leaves (zone 4); `?despill=0..1`, default 1.
- Tiling: 4 levels of detail for long zones (longest horizontal side > 25 m: zones 7 and 8), 3 otherwise; the
  overview of the whole model drops from 24.6 to 19.3 MB.

## 0.1.0 - 2026-10-18

- 3D viewer of the lock at `lock21.info/modele/` (Vite, three.js, 3D Tiles), "Modèle 3D" menu entry: tiled model of
  zones 1, 2, 3, 4, 7, 8, 10, 11, 12 and site context (terrain and fillers, baked materials), ambient occlusion,
  anisotropic filtering, render on demand, phone profile, `?cam=` / `?stats=1` / `?ao=` parameters.
- Tiles hosted on Cloudflare R2 (`tiles.lock21.info`, not indexed), uploaded with `npm run model:upload`.
- Publishing pipeline in `tools/publish-model/`: the `.blend` is the source of truth (`source` property, registration,
  deform modifiers, proximity cleanup), change detection (`npm run model:post-modified`), Obj2Tiles tiling,
  coarse-level simplification, meshopt compression, KTX2 textures. All scripts answer `-h` / `--help`.
- Resolution analysis of the zone meshes (`tools/model-analysis/`).
- `TODO.md` working list.
## 0.0.3 - 2026-10-18

- Deployment works from GitHub Actions: it uses the workflow's own token instead of an SSH key that was never configured.
- `static/CNAME` (lock21.info) is published with every deployment, so the custom domain survives it.

## 0.0.2 - 2026-10-18

- The site is kept out of search engines: every page has `robots: noindex, nofollow` (Docusaurus `noIndex`).
- Deployment fixed (`npm run build` / `npm run deploy` instead of the invalid `npm build` / `npm deploy`).
- GPT translation workflows removed (failing since 2025); English translations are done by Claude on request.
- `AGENTS.md`: guidance for AI coding agents working in this repository.
- Missing favicon path fixed; translation preamble removed from the English dive log.

## 0.0.1

- Docusaurus site: field notebook of the Lock 21 photogrammetry project (zones, dive log, workflow, problems encountered).
