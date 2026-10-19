# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

**lock21.info** documents an underwater photogrammetry project. The goal is a 3D model of the submerged **Lock 21** site (an old canal lock with spillways/sluice gates, cut into numbered zones). The site is a [Docusaurus 3](https://docusaurus.io/) site deployed to GitHub Pages at <https://lock21.info>.

The content is a field notebook and "making of" for the project:

- **Data collection**: dive log, camera gear and settings (GoPro Hero6 Black, 4K 4:3 video, Protune).
- **Processing workflow**: frame extraction (DaVinci Resolve), photo alignment, dense cloud, mesh and texture (Agisoft Metashape), plus Blender mockups.
- **Problems encountered and tests**: lens "banana" distortion, overexposed colour chart, image sharpness/shutter speed/ISO, strong current in the canal, rig dimensions.

Author: Christian Rémillard (GitHub `remillc`).

## Language

- **French is the source language.** All docs are written in French (`defaultLocale: 'fr'`). Write new doc content in French unless asked otherwise, and match the existing informal first-person field-notes tone.
- English (`en`) is a secondary locale. It was machine-translated by a former CI workflow and is largely incomplete; translations are now done by Claude on request.
- Units mix imperial and metric (feet for depths and distances on site, cm for the rig). Keep whatever unit the surrounding text uses, and add the metric equivalent in parentheses where the text already does that.

## Layout

| Path | Contents |
| --- | --- |
| `i18n/fr/docusaurus-plugin-content-docs/current/` | **The docs.** This is set as the docs plugin `path` in `docusaurus.config.js`, served at the site root (`routeBasePath: '/'`). Despite the `i18n/` location, edit docs here. |
| `  decoupage-du-site.mdx` | Zone map and description of zones 1–25 |
| `  collecte/` | Dive log (`journal-des-plongees.md`, a large table wrapped in `<DataGrid>`) and gear (`materiel-utilise.md`) |
| `  workflow/` | Numbered processing steps (`1. extraction-des-photos.md` … `5. texture.md`) and per-zone progress tracking (`suivi.md`) |
| `  questions/` | One folder per problem (`index.md` + `assets/`), shown as "Problèmes rencontrés" |
| `  tests/` | Test write-ups. **Not in `makingOfSidebar`**, so these pages are not linked from the sidebar. |
| `  rig/modele/` | Rig Blender files and drawings |
| `i18n/en/` | English translations (UI strings JSON plus a partial dive log) |
| `src/sidebars.js` | `makingOfSidebar` is the one in use. `tutorialSidebar` is leftover. |
| `src/components/DataGrid.jsx` | Adds a total-duration `<tfoot>` to the dive log table (sums column 5, formatted with `date-fns` in fr-CA/en-CA) |
| `src/components/Script.jsx` | Experimental inline-script injector (not currently used in docs) |
| `src/scss/custom.scss` | Global styles in use (the theme `customCss`). `src/css/custom.css` is the unused template version. |
| `src/pages/` | Home pages (`index.js`, `en/index.js`). Still Docusaurus boilerplate. |
| `blog/` | Mostly Docusaurus sample posts. `tags.yml` defines one tag per zone. |
| `modeles/` | Blender files: `lock-21-mockup.blend` (mockup) and `lock-21-publishing.blend`, the source of truth for 3D publishing (user-owned: never save it, read it only after the user says it is saved) |
| `viewer/` | Standalone 3D viewer (Vite + three.js + 3d-tiles-renderer), built into `static/modele/` and served at `lock21.info/modele/`; tiles come from `tiles.lock21.info` (Cloudflare R2) |
| `tools/publish-model/` | 3D publishing pipeline (headless Blender, Obj2Tiles, Node, PowerShell). Its `README.md` (French) documents every step, tool and lesson learned |
| `TODO.md`, `CHANGELOG.md` | Working list of what remains; release notes |
| `static/CNAME` | Custom domain for GitHub Pages |
| `images/`, `static/images/` | Logos and screenshots |
| `tools/model-analysis/` | Read-only resolution analysis of the `zones` meshes (headless Blender). Run `run.ps1`; thresholds in `thresholds.json`; dated reports (`.json` + `.md`) in `reports/`. Commit the reports, since they track how the model evolves. |

Sidebar ordering of `workflow/` relies on the numeric filename prefix. Keep the `N. name.md` convention when you add steps.

## Commands

```sh
npm install
npm run dev      # dev server, does not open a browser
npm run build    # production build into /build
npm run serve    # serve the build
npm run write-translations -- --locale en
npm run build:viewer       # builds the 3D viewer into static/modele (needed before build/deploy)
npm run viewer:dev         # viewer dev server on http://localhost:3100/
npm run model:check        # 3D zones changed in the .blend since their last publication
npm run model:post-modified  # republish the changed zones locally (O:\publishing\tiles)
npm run model:upload       # upload tiles to R2 (changes the live viewer: ask first)
```

See `tools/publish-model/README.md` for the whole 3D pipeline.

Node >= 18. Builds use `@docusaurus/faster` (`future.experimental_faster`). The platform is Windows: Git warns about LF→CRLF on Markdown files, and that is expected.

## Conventions for docs

- Images: put them in an `assets/` folder next to the page, prefer `.webp`, and use the `<figure><img … width="400" /><figcaption>…</figcaption></figure>` pattern already used across the docs. `docusaurus-plugin-image-zoom` is enabled.
- Cite the source in the figcaption with `<cite><a href=…>`, for example Nick Baets' 1988 drawing via Save Ontario Shipwrecks.
- In `.md`/`.mdx`, escape `<` and `>` in prose (`&lt;-&gt;`), because MDX parses them as JSX.
- Every script (Python, Node, PowerShell, npm targets) answers `-h` / `--help`; options have a short and a long form where it makes sense (`-z/--zone`). Python uses `argparse` (`tools/publish-model/cli.py`; Blender scripts read the arguments after `--`), PowerShell uses comment-based help with `-h`, `-Help` and `--help`.
- Folder and file names are in **English** (new tools, scripts, data folders), even though doc content is French.
- **Keep the docs current.** After each change (pipeline, tools, numbers, decisions, file layout), check which Markdown files now state outdated information (site docs, `tools/publish-model/README.md`, `AGENTS.md`, `TODO.md`, `CHANGELOG.md`) and update them in the same change. The user may have uncommitted edits in doc files: edit around them, never revert them.
- `TODO.md` is the working list of what remains. When an item is done, **delete it** (don't check it off with `[x]`), in the same commit as the work; keep lasting results (numbers, decisions) in `tools/publish-model/README.md` or `CHANGELOG.md`.
- Placeholders such as `awef`, `[TODO: …]` and `[ICI INSÉRER …]` mark unfinished sections. Leave them unless asked to fill them in.
- Dive log rows: `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. Column 5 must stay a plain number, because `DataGrid` sums it.
- `onBrokenLinks` and `onBrokenMarkdownLinks` are set to `ignore`, so a passing build does **not** mean the links are valid. Check them yourself.

## CI (`.github/workflows/`)

- `deploy.yml` builds on PRs, and on pushes to `main` builds the viewer and the site and deploys to the `gh-pages` branch with the workflow's `GITHUB_TOKEN` (no SSH key).
- The former GPT translation workflows were removed (they had failed since 2025). English translations of the docs are done by Claude on request.

## Large and binary files: be careful

- `.gitattributes` sends **only `*.blend`** to Git LFS.
- Model exports (`.glb`, `.obj`) are **not** covered by LFS and are often over GitHub's 100 MB file limit; they belong in `O:\modeles\`, not in the repo. Do not `git add` one without first adding LFS rules (for example `*.glb`, `*.obj`), and ask the user before you do.
- `temp.blend` (about 2 GB) in the root and `*.blend1` are gitignored. Never commit them.
- Do not try to read or edit `.blend`, `.glb`, `.obj`, `.tif`, `.xlsx` or `.pdf` files as text.

## Secrets and local environment

- `.env.local` (gitignored, loaded through `dotenv/config` in `docusaurus.config.js`) holds credentials, including the Cloudflare R2 keys used by `tools/publish-model/upload_r2.mjs`. **Never print, copy or commit its values.**
- The VS Code workspace also mounts `O:\`, which appears to hold the raw project data (footage, Metashape projects, workflow XMLs referenced in the docs, such as `config/workflows/1. Align cameras.xml`). Treat it as read-only unless the user says otherwise. Exceptions: `O:\publishing\` holds working assets that are expensive to regenerate and are kept between sessions: `metashape\<zone>\` (working copies, FINAL chunk only), `tiles\` (generated before upload), `downloads\` (whole-model `.glb` and `.kmz`). `O:\temp\` holds disposable intermediates.
- **Never modify the original Metashape projects in `O:\photogrammetry\`.** They are huge (zone 12 alone is about 134 GB) and are the reference. Open them read-only and save only the needed chunk into a working copy under `O:\publishing\metashape\`.

## Known leftovers from the Docusaurus template

These are not bugs to fix unprompted, but don't copy them:

- Footer links (Tutorial `/docs/intro`, Docusaurus Discord/Twitter, copyright "My Project, Inc.") and the homepage hero and `HomepageFeatures` are template content.
- Sample blog posts and `authors.yml` come from Docusaurus.
- `_config.yml` is a Jekyll config left over from before Docusaurus.

## Git

- **Versioning:** semantic versioning below 1.0.0 while the site is not public (`package.json` `version`). Each release gets a `CHANGELOG.md` entry and an annotated tag `vX.Y.Z`. Patch for fixes, minor for features.

- Commit messages in history are just `wip`. There is no enforced style.
- Pushing to `main` deploys the site. Don't push or merge into `main` without the user's explicit OK.
