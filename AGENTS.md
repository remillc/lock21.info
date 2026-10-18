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
- English (`en`) is a secondary locale. It is mostly machine-translated (see CI below) and largely incomplete.
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
| `modeles/` | Blender mockup of the lock and textures |
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
```

Node >= 18. Builds use `@docusaurus/faster` (`future.experimental_faster`). The platform is Windows: Git warns about LF→CRLF on Markdown files, and that is expected.

## Conventions for docs

- Images: put them in an `assets/` folder next to the page, prefer `.webp`, and use the `<figure><img … width="400" /><figcaption>…</figcaption></figure>` pattern already used across the docs. `docusaurus-plugin-image-zoom` is enabled.
- Cite the source in the figcaption with `<cite><a href=…>`, for example Nick Baets' 1988 drawing via Save Ontario Shipwrecks.
- In `.md`/`.mdx`, escape `<` and `>` in prose (`&lt;-&gt;`), because MDX parses them as JSX.
- Every script (Python, Node, PowerShell, npm targets) answers `-h` / `--help`; options have a short and a long form where it makes sense (`-z/--zone`). Python uses `argparse` (`tools/publish-model/cli.py`; Blender scripts read the arguments after `--`), PowerShell uses comment-based help with `-h`, `-Help` and `--help`.
- Folder and file names are in **English** (new tools, scripts, data folders), even though doc content is French.
- Placeholders such as `awef`, `[TODO: …]` and `[ICI INSÉRER …]` mark unfinished sections. Leave them unless asked to fill them in.
- Dive log rows: `No | Date | Activité | Zones | Durée (minutes) | Participants | Notes`. Column 5 must stay a plain number, because `DataGrid` sums it.
- `onBrokenLinks` and `onBrokenMarkdownLinks` are set to `ignore`, so a passing build does **not** mean the links are valid. Check them yourself.

## CI (`.github/workflows/`)

- `deploy.yml` builds on PRs and deploys to the `gh-pages` branch over SSH on pushes to `main`.
- `gpt-translate-commit.yml` translates the `.md` files changed in each push to `main` into English with `3ru/gpt-translate` (OpenAI). Check its output for chatty artefacts (e.g. a "Certainly! Here's the translation…" preamble) and remove them.
- `gpt-translate.yml` runs a translation on demand when an issue comment contains `/gpt-translate` or `/gt`.

## Large and binary files: be careful

- `.gitattributes` sends **only `*.blend`** to Git LFS.
- The untracked files in `modeles/` (`.glb` up to about 190 MB, `.obj` about 480 MB) are **not** covered by LFS and exceed GitHub's 100 MB file limit. Do not `git add` them without first adding LFS rules (for example `*.glb`, `*.obj`), and ask the user before you do.
- `temp.blend` (about 2 GB) in the root and `*.blend1` are gitignored. Never commit them.
- Do not try to read or edit `.blend`, `.glb`, `.obj`, `.tif`, `.xlsx` or `.pdf` files as text.

## Secrets and local environment

- `.env.local` (gitignored, loaded through `dotenv/config` in `docusaurus.config.js`) holds Git deployment credentials. **Never print, copy or commit its values.**
- The VS Code workspace also mounts `O:\`, which appears to hold the raw project data (footage, Metashape projects, workflow XMLs referenced in the docs, such as `config/workflows/1. Align cameras.xml`). Treat it as read-only unless the user says otherwise. Exceptions: `O:\publishing\` holds working assets that are expensive to regenerate and are kept between sessions: `metashape\<zone>\` (working copies, FINAL chunk only), `tiles\` (generated before upload), `downloads\` (whole-model `.glb` and `.kmz`). `O:\temp\` holds disposable intermediates.
- **Never modify the original Metashape projects in `O:\photogrammetry\`.** They are huge (zone 12 alone is about 134 GB) and are the reference. Open them read-only and save only the needed chunk into a working copy under `O:\publishing\metashape\`.

## Known leftovers from the Docusaurus template

These are not bugs to fix unprompted, but don't copy them:

- Footer links (Tutorial `/docs/intro`, Docusaurus Discord/Twitter, copyright "My Project, Inc.") and the homepage hero and `HomepageFeatures` are template content.
- Sample blog posts and `authors.yml` come from Docusaurus.
- `_config.yml` is a Jekyll config left over from before Docusaurus.

## Git

- Commit messages in history are just `wip`. There is no enforced style.
- Work happens directly on `main`, and pushing to `main` deploys **and** triggers paid GPT translation. Don't push without the user's explicit OK.
