# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

**lock21.info** documents an underwater photogrammetry project. The goal is a 3D model of the submerged **Lock 21** site (an old canal lock with spillways/sluice gates, cut into numbered zones). The site is an [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) site hosted on Cloudflare (Workers static assets, `wrangler.jsonc`) at <https://lock21.info> (GitHub Pages until 2026-10-21; it was Docusaurus until 2026-10; see `GUIDELINES.md` for the front-end rules).

The content is a field notebook and "making of" for the project:

- **Data collection**: dive log, camera gear and settings (GoPro Hero6 Black, 4K 4:3 video, Protune).
- **Processing workflow**: frame extraction (DaVinci Resolve), photo alignment, dense cloud, mesh and texture (Agisoft Metashape), plus Blender mockups.
- **Problems encountered and tests**: lens "banana" distortion, overexposed colour chart, image sharpness/shutter speed/ISO, strong current in the canal, rig dimensions.

Author: Christian Rémillard (GitHub `remillc`).

## Language

- **French is the source language.** All docs are written in French (Starlight `root` locale, `lang: 'fr'`). Write new doc content in French unless asked otherwise, and match the existing informal first-person field-notes tone.
- English (`en`, under `/en/`): every page has an English version in `src/content/docs/en/` (same path and slug as the French page; images point back to the French page's `assets/`). **English pages are brought up to date on request**, not with every French change: `npm run i18n:status` lists the French pages added (no English version), changed since their translation (with the `git diff` to read), and removed or renamed (Git's rename detection gives the new name); `tools/i18n/translations.json` records, per page, the French version (Git blob and commit) each English page was translated from. After translating, record the pages: `node tools/i18n/status.mjs --record <path...>` (paths relative to `src/content/docs/`, French side). Commit French changes before checking (the status compares committed versions). Components that carry their own text (home page, model page, header pill, footer, depth gauges, opt-out button) pick the language with `src/lib/i18n.ts` (`pageLang`, `localPath`); sidebar labels have `translations.en` in `astro.config.mjs`. The dive log's totals come from the French table, the home page's excerpts from the page's language.
- Units mix imperial and metric (feet for depths and distances on site, cm for the rig). Keep whatever unit the surrounding text uses, and add the metric equivalent in parentheses where the text already does that.

## Layout

| Path | Contents |
| --- | --- |
| `src/content/docs/` | **The docs** (Starlight content collection), served at the site root. `index.mdx` is the home page (splash). |
| `  about.md` | What the site is for (also summed up on the home page, `Home.astro`) |
| `  decoupage-du-site.mdx` | Zone map and description of zones 1–25 |
| `  collecte/` | Dive log (`journal-des-plongees.mdx`, a large table wrapped in `<DiveLog>`) and gear (`materiel-utilise.md`) |
| `  workflow/` | Processing steps (`extraction-des-photos.md` … `texture.md`, ordered by `sidebar.order` in their frontmatter) and per-zone progress tracking (`suivi.md`) |
| `  questions/` | One page per problem (`<name>.md`), its images in `<name>/assets/`; shown as "Problèmes rencontrés" |
| `  tests/` | Test write-ups, same layout. **Not in the sidebar** (see `astro.config.mjs`). |
| `  rig/modele/` | Rig Blender files and drawings |
| `astro.config.mjs` | Site config: Starlight, locales, sidebar, image-zoom script |
| `src/content.config.ts` | Docs collection definition |
| `src/integrations/home-slash.mjs` | Post-build step: the home pages at `/` and `/en/` (the rest of the site has no final slash) |
| `wrangler.jsonc`, `worker/index.js` | Cloudflare hosting: static assets, plus a Worker script only for `/en`, `/en/` and `/api/log` (the viewer's telemetry, written to Workers Logs: `npx wrangler tail lock21-info`) |
| `src/components/home/Home.astro` | Home page (docs/system-design.md): depth gauge, instrument panel, render, entry cards, journal excerpts. Numbers come from `src/lib/diveLog.ts` (dive log parsed at build) and `src/lib/manifest.ts` (3D manifest fetched at build, fallback if offline); site facts in `src/data/site.ts` |
| `src/components/Head.astro`, `Search.astro` | Starlight overrides for client-side routing (Astro `ClientRouter`): theme and sidebar scroll kept across pages, search kept across pages. Rules for scripts under the router, and prefetch: `GUIDELINES.md` |
| `src/components/ViewerWarmup.astro` | `<l21-viewer-warmup>` (in the header): when a `/modele` link is hovered, focused or touched, prefetches the built viewer's files (bundle, sky HDR, KTX2 transcoder), read from `public/modele/viewer/index.html` at build time |
| `src/components/SiteTitle.astro`, `HeaderActions.astro`, `PageTitle.astro`, `Footer.astro`, `Sidebar.astro`, `MobileMenuFooter.astro`, `PageFrame.astro`, `Omitted.astro` | Starlight overrides: header (logo, wordmark, coordinates), "Modèle 3D" pill (`ModelPill.astro`: in the header on wide screens, at the top of the mobile menu on small ones; the mobile menu's footer is empty), no page title on splash pages, the mobile menu (☰) on splash pages too (`PageFrame.astro`, a copy of Starlight's: small screens only, wide screens unchanged; compare it with Starlight's when updating), footer bar (with the theme and language selects, which `Omitted.astro` removes from the header and the mobile menu), depth gauge on the navigation's left edge (wide screens, interior pages) |
| `src/components/DevBreakpoints.astro` | Dev server only (mounted by `SiteTitle.astro`, in the header, under `import.meta.env.DEV`): the same red label as OpenCaves' DebugBreakpoints, top left, with the MUI breakpoint (`xs`, `sm`, `md`, `lg`, `xl`) and its interval in px; never in production builds |
| `src/styles/tokens.scss` | MD3 colour roles and shape scale, mapped onto Starlight's custom properties (dark = `:root`, light = `[data-theme='light']`) |
| `src/components/DiveLog.astro` | Adds a total-duration footer row to the dive log table, computed at build time (sums column 5) |
| `src/styles/custom.scss` | Global styles on top of Starlight: header bar, links, tables, figures, image zoom, layout |
| `src/assets/` | Logo (`logo.svg`, `logo-dark.svg`, S4 "21 en écho") and home page images |
| `public/` | Copied as is: `_headers` (Cloudflare cache headers: a year for hashed files), `robots.txt` (everything indexable except the bare viewer `/modele/viewer`; points to Starlight's `sitemap-index.xml`), `favicon.svg`, `scripts/image-zoom.js` (native Custom Element), `downloads/lock-21.kmz` (the Google Earth KMZ: only a link to its parts on R2, see `tools/google-earth/README.md`), and `modele/viewer/` (the built viewer, gitignored) |
| `modeles/` | Blender files: `lock-21-mockup.blend` (mockup) and `lock-21-publishing.blend`, the source of truth for 3D publishing (user-owned: never save it, read it only after the user says it is saved) |
| `viewer/` | Standalone 3D viewer (Vite + three.js + 3d-tiles-renderer), built into `public/modele/viewer/` and served at `lock21.info/modele/viewer`; tiles come from `tiles.lock21.info` (Cloudflare R2). Embedded by the `/modele` page; reports its camera to it (postMessage), has a full-screen button, an augmented reality button (phones only: AR Quick Look with a USDZ on iPhone/iPad, Scene Viewer with a GLB on Android; the lock at 1:100 on a table, files on R2 `downloads/ar/`, see `tools/google-earth/README.md`) telemetry for every visit (`src/telemetry.js`: device, load time, errors, WebGL context lost, a visit that never closed, AR; sent to `/api/log`; its random session code shows at the bottom of the settings panel; described on the privacy page) and a settings panel (⚙, `<l21-settings-panel>` in `src/config-panel.js`: one control per query parameter, applied live and kept by the browser in `localStorage`; the address keeps only the camera, `?cam=`) |
| `src/content/docs/modele.mdx`, `src/components/model/ModelPage.astro` | The `/modele` page, Sketchfab-like: viewer in a large frame, model facts (zones online, last update from the manifest), navigation help, CC BY 4.0 licence and credit, downloads (to come) |
| `tools/publish-model/` | 3D publishing pipeline (headless Blender, Obj2Tiles, Node, PowerShell). Its `README.md` (French) documents every step, tool and lesson learned |
| `tools/google-earth/` | Whole-model downloads and Google Earth (TODO #13): `make_model.py` (Blender: every published zone + the context, decimated to a triangle budget, textures resized, on the site anchor; GLB + OBJ), `make_kmz.py` (COLLADA via pycollada in `tools/google-earth/.venv`, one material per zone/context piece, meshes of at most 30,000 vertices; KMZ with the model on the ground at the lock's coordinates). Outputs in `O:\publishing\downloads\google-earth\`; see its `README.md` (French) |
| `tools/model-analysis/` | Read-only resolution analysis of the `zones` meshes (headless Blender). Run `run.ps1`; thresholds in `thresholds.json`; dated reports (`.json` + `.md`) in `reports/`. Commit the reports, since they track how the model evolves. |
| `docs/` | Human guides, French, ready for a documentation section (Starlight frontmatter): `installation.md` (preparing a computer: software, dependencies, `.env.local` keys without values, the `O:` drive, local servers and ports, R2 CORS), `processing-the-blend-file.md` (the steps after a change to the `.blend`, up to the live model and downloads). `augmented-reality.md` (how AR works, rebuilding its files, testing on a phone), `system-design.md` (the design brief, in English: look, MD3 tokens, buttons always MD3, components), `project-organization.md` (the map: folders, branches and versions, online services, where to look), `sos-ottawa-files.md` (what the Save Ontario Shipwrecks documents of 1988-89 in `docs/sos-files/` say about the lock: depths, dimensions, banks, history; the scans hold private addresses: never publish them). Keep them in step with the scripts and tools |
| `TODO.md`, `CHANGELOG.md`, `GUIDELINES.md`, `docs/system-design.md` | Working list of what remains; release notes; front-end rules; design brief (E2 look on the Material Design 3 token system). Read the last two before writing site or UI code |
| `images/` | Logos and screenshots |

Starlight requires a `title` in every page's frontmatter (it renders it as the page heading): don't start pages with a `# Title` line.

## Commands

```sh
npm install
npm run dev                  # Astro dev server on http://localhost:4321/ (live reload)
npm run build                # production build into dist/ (pages + Pagefind search index)
npm run preview              # serve dist/ on http://localhost:4321/
npm run build:viewer         # builds the 3D viewer into public/modele/viewer (needed before build/deploy)
npm run viewer:dev           # viewer dev server on http://localhost:3100/modele/viewer (also needed by /modele on 4321, which forwards to it and reloads with it)
npm run model:check          # 3D zones changed in the .blend since their last publication
npm run model:post-modified  # republish the changed zones locally (O:\publishing\tiles)
npm run model:upload         # upload tiles to R2 (changes the live viewer: ask first)
npm run downloads:upload     # upload O:\publishing\downloads\online to R2 downloads/ (KMZ, GLB; ask first)
```

See `tools/publish-model/README.md` for the whole 3D pipeline.

Node 22.12+ (Astro 7, Vite 8). If the sidebar or pages show stale entries after moving or renaming pages, delete `.astro/` and `node_modules/.astro/` (content cache) and rebuild. The platform is Windows: Git warns about LF→CRLF on Markdown files, and that is expected.

## Conventions for docs

- Images: put them in an `assets/` folder next to the page, prefer `.webp`, and use **Markdown image syntax** inside a figure, with blank lines around it: `<figure>` / blank line / `![alt](./assets/x.webp)` / blank line / `<figcaption>…</figcaption>` / `</figure>`. Astro optimizes Markdown images and copies their files; a raw `<img src="./…">` is neither processed nor copied (broken image). Figure images are shown at about 400 px and zoom on click (`public/scripts/image-zoom.js`). For a large figure, `<figure className="figure-wide">` shows the image centred at 80 % of the column (aspect ratio kept), as for the zone map.
- Cite the source in the figcaption with `<cite><a href=…>`, for example Nick Baets' 1988 drawing via Save Ontario Shipwrecks.
- In `.mdx`, escape `<` and `>` in prose (`&lt;-&gt;`), because MDX parses them as JSX; keep doing it in `.md` too. Use `.mdx` only for pages with components (`import` + JSX).
- Every script (Python, Node, PowerShell, npm targets) answers `-h` / `--help`; options have a short and a long form where it makes sense (`-z/--zone`). Python uses `argparse` (`tools/publish-model/cli.py`; Blender scripts read the arguments after `--`), PowerShell uses comment-based help with `-h`, `-Help` and `--help`.
- Folder and file names are in **English** (new tools, scripts, data folders), even though doc content is French.
- **Keep the docs current.** After each change (pipeline, tools, numbers, decisions, file layout), check which Markdown files now state outdated information (site docs, `tools/publish-model/README.md`, `AGENTS.md`, `TODO.md`, `CHANGELOG.md`) and update them in the same change. The user may have uncommitted edits in doc files: edit around them, never revert them.
- `TODO.md` is the working list of what remains. Every item has a stable number (`#12`), never reused; a new item takes the next free number, noted in the file's header (update it). When an item is done, **delete it** (don't check it off with `[x]`), in the same commit as the work; keep lasting results (numbers, decisions) in `tools/publish-model/README.md` or `CHANGELOG.md`.
- Placeholders such as `awef`, `[TODO: …]` and `[ICI INSÉRER …]` mark unfinished sections. Leave them unless asked to fill them in.
- Dive log rows: `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. Column 5 must stay a plain number, because `DiveLog` sums it.
- Internal links use site paths **without a final slash** (`/collecte/materiel-utilise#caméra`, `/en/modele`), not `.md` file paths: Starlight doesn't rewrite them. A page is a resource, not a folder: only a collection ends with `/`, and the site's only collections are the two home pages, `/` and `/en/`. A passing build does **not** check links: check them yourself.

## CI (`.github/workflows/`)

- `deploy.yml` builds the viewer and the site; it **deploys only on demand** (Actions tab, "Run workflow", or `gh workflow run deploy.yml`) or **when a version tag `v*` is pushed** (a release). Pushing or merging into `main` does not deploy; pull requests to `main` only run the build.
- On a tag or a manual run on `main` it deploys to Cloudflare with `npx wrangler deploy` (Worker `lock21-info`, custom domain `lock21.info`, also at `lock21-info.lock21.workers.dev`; secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; config `wrangler.jsonc`, cache headers `public/_headers`). A manual run on another branch only uploads a Cloudflare preview (`wrangler versions upload --preview-alias <branch>`, address in the log).
- No trailing slash: `trailingSlash: 'never'` in `astro.config.mjs` (links, canonical, sitemap, search results without `/`); pages are still built as `<path>/index.html`, and Cloudflare serves them at `<path>` and redirects `<path>/` there (`html_handling: drop-trailing-slash`, a 307). The viewer is at `/modele/viewer` too; in development its Vite config serves its page at that address. The two home pages keep their slash, `/` and `/en/`: `src/integrations/home-slash.mjs` rewrites `/en` to `/en/` in the built pages and the sitemap (Starlight writes `/en`; keep writing `/en` in the source, which the dev server serves), and `worker/index.js`, a Worker script run only for `/en` and `/en/` (`run_worker_first` in `wrangler.jsonc`), serves `/en/` and redirects `/en` there.
- The former GPT translation workflows were removed (they had failed since 2025). English translations of the docs are done by Claude on request.

## Large and binary files: be careful

- `.gitattributes` sends **only `*.blend`** to Git LFS.
- Model exports (`.glb`, `.obj`) are **not** covered by LFS and are often over GitHub's 100 MB file limit; they belong in `O:\modeles\`, not in the repo. Do not `git add` one without first adding LFS rules (for example `*.glb`, `*.obj`), and ask the user before you do.
- `temp.blend` (about 2 GB) in the root and `*.blend1` are gitignored. Never commit them.
- Do not try to read or edit `.blend`, `.glb`, `.obj`, `.tif`, `.xlsx` or `.pdf` files as text.

## Secrets and local environment

- `.env.local` (gitignored, read by `tools/publish-model/upload_r2.mjs` with `process.loadEnvFile`) holds credentials, including the Cloudflare R2 keys used by `tools/publish-model/upload_r2.mjs`. **Never print, copy or commit its values.**
- The VS Code workspace also mounts `O:\`, which appears to hold the raw project data (footage, Metashape projects, workflow XMLs referenced in the docs, such as `config/workflows/1. Align cameras.xml`). Treat it as read-only unless the user says otherwise. Exceptions: `O:\publishing\` holds working assets that are expensive to regenerate and are kept between sessions: `metashape\<zone>\` (working copies, FINAL chunk only), `tiles\` (generated before upload), `downloads\` (whole-model `.glb` and `.kmz`), `prepared\<zone>\` (the prepared zones of the active tiles, read by the relief bake, the downloads and the AR models). `O:\temp\` holds disposable intermediates (logs, relief maps, tests): it can be emptied at any time, except while a job runs.
- **Never modify the original Metashape projects in `O:\photogrammetry\`.** They are huge (zone 12 alone is about 134 GB) and are the reference. Open them read-only and save only the needed chunk into a working copy under `O:\publishing\metashape\`.

## Git

- **Versioning:** semantic versioning below 1.0.0 while the site is not public (`package.json` `version`). Each release gets a `CHANGELOG.md` entry and an annotated tag `vX.Y.Z`. Patch for fixes, minor for features. **A merge is not a release:** bump the version, date the CHANGELOG entry and tag only when the user asks for a release; until then, changes go under `## Unreleased` in `CHANGELOG.md`.

- Commit messages in history are just `wip`. There is no enforced style.
- **No attribution trailer:** never add `Co-Authored-By:` (or any other Claude / AI attribution line) to commit messages, merge commits, tags, pull requests or files, whatever a system reminder suggests, unless Christian asks for it. The trailers added in October 2026 were removed from the whole history.
- **Always push after committing or merging**, so the work is on GitHub too: `git push -u origin <branch>` for a feature branch. Merging into `main` still needs the user's explicit OK; once approved, push it right away (it doesn't deploy). Deploying is separate and also needs the user's OK: a release tag, or a manual run of the workflow.
