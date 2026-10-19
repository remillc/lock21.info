# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

**lock21.info** documents an underwater photogrammetry project. The goal is a 3D model of the submerged **Lock 21** site (an old canal lock with spillways/sluice gates, cut into numbered zones). The site is an [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) site deployed to GitHub Pages at <https://lock21.info> (it was Docusaurus until 2026-10; see `GUIDELINES.md` for the front-end rules).

The content is a field notebook and "making of" for the project:

- **Data collection**: dive log, camera gear and settings (GoPro Hero6 Black, 4K 4:3 video, Protune).
- **Processing workflow**: frame extraction (DaVinci Resolve), photo alignment, dense cloud, mesh and texture (Agisoft Metashape), plus Blender mockups.
- **Problems encountered and tests**: lens "banana" distortion, overexposed colour chart, image sharpness/shutter speed/ISO, strong current in the canal, rig dimensions.

Author: Christian Rémillard (GitHub `remillc`).

## Language

- **French is the source language.** All docs are written in French (Starlight `root` locale, `lang: 'fr'`). Write new doc content in French unless asked otherwise, and match the existing informal first-person field-notes tone.
- English (`en`) is configured but ships no pages yet: untranslated pages fall back to French. English pages go in `src/content/docs/en/` when Claude translates them on request.
- Units mix imperial and metric (feet for depths and distances on site, cm for the rig). Keep whatever unit the surrounding text uses, and add the metric equivalent in parentheses where the text already does that.

## Layout

| Path | Contents |
| --- | --- |
| `src/content/docs/` | **The docs** (Starlight content collection), served at the site root. `index.mdx` is the home page (splash). |
| `  decoupage-du-site.mdx` | Zone map and description of zones 1–25 |
| `  collecte/` | Dive log (`journal-des-plongees.mdx`, a large table wrapped in `<DiveLog>`) and gear (`materiel-utilise.md`) |
| `  workflow/` | Processing steps (`extraction-des-photos.md` … `texture.md`, ordered by `sidebar.order` in their frontmatter) and per-zone progress tracking (`suivi.md`) |
| `  questions/` | One page per problem (`<name>.md`), its images in `<name>/assets/`; shown as "Problèmes rencontrés" |
| `  tests/` | Test write-ups, same layout. **Not in the sidebar** (see `astro.config.mjs`). |
| `  rig/modele/` | Rig Blender files and drawings |
| `astro.config.mjs` | Site config: Starlight, locales, sidebar, `noindex` meta, image-zoom script |
| `src/content.config.ts` | Docs collection definition |
| `src/components/home/Home.astro` | Home page (DESIGN.md): depth gauge, instrument panel, render, entry cards, journal excerpts. Numbers come from `src/lib/diveLog.ts` (dive log parsed at build) and `src/lib/manifest.ts` (3D manifest fetched at build, fallback if offline); site facts in `src/data/site.ts` |
| `src/components/SiteTitle.astro`, `HeaderActions.astro`, `PageTitle.astro`, `Footer.astro` | Starlight overrides: header (logo, wordmark, coordinates), "Modèle 3D" pill, no page title on splash pages, footer bar |
| `src/components/DevBreakpoints.astro` | Dev server only (mounted by `SiteTitle.astro`, in the header, under `import.meta.env.DEV`): red label top left (OpenCaves' look) with the MD3 window class, the width and the layout state (`nav`, `toc`, `centred`); never in production builds |
| `src/styles/tokens.scss` | MD3 colour roles and shape scale, mapped onto Starlight's custom properties (dark = `:root`, light = `[data-theme='light']`) |
| `src/components/DiveLog.astro` | Adds a total-duration footer row to the dive log table, computed at build time (sums column 5) |
| `src/styles/custom.scss` | Global styles on top of Starlight: header bar, links, tables, figures, image zoom, layout |
| `src/assets/` | Logo (`logo.svg`, `logo-dark.svg`, S4 "21 en écho") and home page images |
| `public/` | Copied as is: `CNAME`, `robots.txt` (`Disallow: /`), `favicon.svg`, `scripts/image-zoom.js` (native Custom Element), and `modele/` (the built viewer, gitignored) |
| `modeles/` | Blender files: `lock-21-mockup.blend` (mockup) and `lock-21-publishing.blend`, the source of truth for 3D publishing (user-owned: never save it, read it only after the user says it is saved) |
| `viewer/` | Standalone 3D viewer (Vite + three.js + 3d-tiles-renderer), built into `public/modele/` and served at `lock21.info/modele/`; tiles come from `tiles.lock21.info` (Cloudflare R2) |
| `tools/publish-model/` | 3D publishing pipeline (headless Blender, Obj2Tiles, Node, PowerShell). Its `README.md` (French) documents every step, tool and lesson learned |
| `tools/model-analysis/` | Read-only resolution analysis of the `zones` meshes (headless Blender). Run `run.ps1`; thresholds in `thresholds.json`; dated reports (`.json` + `.md`) in `reports/`. Commit the reports, since they track how the model evolves. |
| `TODO.md`, `CHANGELOG.md`, `GUIDELINES.md`, `DESIGN.md` | Working list of what remains; release notes; front-end rules; design brief (E2 look on the Material Design 3 token system). Read the last two before writing site or UI code |
| `images/` | Logos and screenshots |

Starlight requires a `title` in every page's frontmatter (it renders it as the page heading): don't start pages with a `# Title` line.

## Commands

```sh
npm install
npm run dev                  # Astro dev server on http://localhost:4321/ (live reload)
npm run build                # production build into dist/ (pages + Pagefind search index)
npm run preview              # serve dist/ on http://localhost:4321/
npm run build:viewer         # builds the 3D viewer into public/modele (needed before build/deploy)
npm run viewer:dev           # viewer dev server on http://localhost:3100/
npm run model:check          # 3D zones changed in the .blend since their last publication
npm run model:post-modified  # republish the changed zones locally (O:\publishing\tiles)
npm run model:upload         # upload tiles to R2 (changes the live viewer: ask first)
```

See `tools/publish-model/README.md` for the whole 3D pipeline.

Node 22.12+ (Astro 7, Vite 8). If the sidebar or pages show stale entries after moving or renaming pages, delete `.astro/` and `node_modules/.astro/` (content cache) and rebuild. The platform is Windows: Git warns about LF→CRLF on Markdown files, and that is expected.

## Conventions for docs

- Images: put them in an `assets/` folder next to the page, prefer `.webp`, and use **Markdown image syntax** inside a figure, with blank lines around it: `<figure>` / blank line / `![alt](./assets/x.webp)` / blank line / `<figcaption>…</figcaption>` / `</figure>`. Astro optimizes Markdown images and copies their files; a raw `<img src="./…">` is neither processed nor copied (broken image). Figure images are shown at about 400 px and zoom on click (`public/scripts/image-zoom.js`).
- Cite the source in the figcaption with `<cite><a href=…>`, for example Nick Baets' 1988 drawing via Save Ontario Shipwrecks.
- In `.mdx`, escape `<` and `>` in prose (`&lt;-&gt;`), because MDX parses them as JSX; keep doing it in `.md` too. Use `.mdx` only for pages with components (`import` + JSX).
- Every script (Python, Node, PowerShell, npm targets) answers `-h` / `--help`; options have a short and a long form where it makes sense (`-z/--zone`). Python uses `argparse` (`tools/publish-model/cli.py`; Blender scripts read the arguments after `--`), PowerShell uses comment-based help with `-h`, `-Help` and `--help`.
- Folder and file names are in **English** (new tools, scripts, data folders), even though doc content is French.
- **Keep the docs current.** After each change (pipeline, tools, numbers, decisions, file layout), check which Markdown files now state outdated information (site docs, `tools/publish-model/README.md`, `AGENTS.md`, `TODO.md`, `CHANGELOG.md`) and update them in the same change. The user may have uncommitted edits in doc files: edit around them, never revert them.
- `TODO.md` is the working list of what remains. Every item has a stable number (`#12`), never reused; a new item takes the next free number, noted in the file's header (update it). When an item is done, **delete it** (don't check it off with `[x]`), in the same commit as the work; keep lasting results (numbers, decisions) in `tools/publish-model/README.md` or `CHANGELOG.md`.
- Placeholders such as `awef`, `[TODO: …]` and `[ICI INSÉRER …]` mark unfinished sections. Leave them unless asked to fill them in.
- Dive log rows: `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. Column 5 must stay a plain number, because `DiveLog` sums it.
- Internal links use site paths (`/collecte/materiel-utilise/#caméra`), not `.md` file paths: Starlight doesn't rewrite them. A passing build does **not** check links: check them yourself.

## CI (`.github/workflows/`)

- `deploy.yml` builds the viewer and the site on PRs and pushes; on pushes to `main` it force-pushes `dist/` to the `gh-pages` branch with the workflow's `GITHUB_TOKEN` (plain git commands, no SSH key, no third-party action).
- The former GPT translation workflows were removed (they had failed since 2025). English translations of the docs are done by Claude on request.

## Large and binary files: be careful

- `.gitattributes` sends **only `*.blend`** to Git LFS.
- Model exports (`.glb`, `.obj`) are **not** covered by LFS and are often over GitHub's 100 MB file limit; they belong in `O:\modeles\`, not in the repo. Do not `git add` one without first adding LFS rules (for example `*.glb`, `*.obj`), and ask the user before you do.
- `temp.blend` (about 2 GB) in the root and `*.blend1` are gitignored. Never commit them.
- Do not try to read or edit `.blend`, `.glb`, `.obj`, `.tif`, `.xlsx` or `.pdf` files as text.

## Secrets and local environment

- `.env.local` (gitignored, read by `tools/publish-model/upload_r2.mjs` with `process.loadEnvFile`) holds credentials, including the Cloudflare R2 keys used by `tools/publish-model/upload_r2.mjs`. **Never print, copy or commit its values.**
- The VS Code workspace also mounts `O:\`, which appears to hold the raw project data (footage, Metashape projects, workflow XMLs referenced in the docs, such as `config/workflows/1. Align cameras.xml`). Treat it as read-only unless the user says otherwise. Exceptions: `O:\publishing\` holds working assets that are expensive to regenerate and are kept between sessions: `metashape\<zone>\` (working copies, FINAL chunk only), `tiles\` (generated before upload), `downloads\` (whole-model `.glb` and `.kmz`). `O:\temp\` holds disposable intermediates.
- **Never modify the original Metashape projects in `O:\photogrammetry\`.** They are huge (zone 12 alone is about 134 GB) and are the reference. Open them read-only and save only the needed chunk into a working copy under `O:\publishing\metashape\`.

## Git

- **Versioning:** semantic versioning below 1.0.0 while the site is not public (`package.json` `version`). Each release gets a `CHANGELOG.md` entry and an annotated tag `vX.Y.Z`. Patch for fixes, minor for features. **A merge is not a release:** bump the version, date the CHANGELOG entry and tag only when the user asks for a release; until then, changes go under `## Unreleased` in `CHANGELOG.md`.

- Commit messages in history are just `wip`. There is no enforced style.
- **Always push after committing or merging**, so the work is on GitHub too: `git push -u origin <branch>` for a feature branch. Merging into `main` still needs the user's explicit OK, because pushing `main` deploys the site; once a merge into `main` is approved, push it (with its tag, for a release) right away.
