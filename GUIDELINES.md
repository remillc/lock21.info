# Front-end guidelines

Rules for the lock21.info site after its switch from Docusaurus to Astro (TODO #29, #30). They apply to the site and
to any UI added to the 3D viewer. Decided with Christian on 2026-10-19.

## Principles

- **Simplicity first.** Plain HTML (DOM) and CSS; JavaScript only where a page needs behaviour. No heavy UI
  framework (React, Vue, Svelte...) unless a real need appears and is agreed first.
- **Content is Markdown.** Pages stay Markdown/MDX files, written in French (source language), in the informal
  first-person field-notebook tone.
- **Static output.** The site is built to static files and deployed to GitHub Pages; no server code.

## Stack

| Part | Choice | Notes |
| --- | --- | --- |
| Site framework | **Astro** | Static build (`output: 'static'`) |
| Docs (field notebook) | **Starlight** (Astro's docs theme) | Sidebar, search (Pagefind), table of contents, previous/next, i18n, dark mode |
| Styles | **SCSS** (`sass` package) | Overrides of Starlight's CSS custom properties; component styles scoped in `.astro` files |
| Components | **Astro components** first | Rendered at build time, no JavaScript shipped |
| Interactive components | **Web Components** | **Lit** when a component has reactive state (re-renders when its data changes, e.g. a filterable dive log); **native Custom Elements** otherwise. Responsive layout is done in CSS either way |
| 3D viewer | Separate app (`viewer/`, Vite + three.js) | Built into the site's `public/modele/`, served at `/modele/`; not an Astro page |
| Search | Pagefind (built into Starlight) | Static index generated at build |

## Content and structure

- **Docs:** Starlight content collection (`src/content/docs/`). Same sections as today: zone map, data collection,
  workflow (numbered steps, order kept), problems encountered; the `tests/` pages stay out of the sidebar.
- **Blog:** dropped for now (only Docusaurus samples existed). It can come back as a content collection with one tag
  per zone.
- **Languages:** French is the default locale, served at the root; the structure is ready for English (`/en/`), but
  only French ships. English pages are added when Claude translates them on request (TODO #28); Starlight falls
  back to French for untranslated pages.
- **Images:** next to their page, `.webp` preferred, `<figure>` + `<figcaption>` with the source in `<cite>`; zoom on
  click by a small native Custom Element (no React plugin).
- **Dive log:** the total duration (sum of column 5) becomes an Astro component computed at build time, so no
  JavaScript is shipped; column 5 stays a plain number of minutes.

## Custom Elements

- **Every custom element name starts with `l21-`** (a pseudo-namespace for lock21), e.g. `<l21-image-zoom>`,
  `<l21-settings-panel>`, `<l21-dev-breakpoints>`: no clash with other libraries' elements or future HTML tags. This
  applies to the site and to the 3D viewer.
- One element per file; the class is named after it in English (`ImageZoom`, `SettingsPanel`).

## Client-side routing

The site navigates without full page loads (Astro `ClientRouter`, `src/components/Head.astro`): links swap the page's
content. Scripts must survive that:

- **Page behaviour goes in Custom Elements**, set up in `connectedCallback` and undone in `disconnectedCallback`
  (global listeners): they run on every page where the element appears, after a full load as after a swap. A plain
  page script runs once only (e.g. `<l21-model-frame>` on `/modele/`).
- **Elements added by script to `<body>`** are moved into the new body on `astro:after-swap` (`image-zoom.js`).
- **`history.replaceState` keeps `history.state`** (`history.replaceState(history.state, '', url)`): the router stores
  its entry there; `null` breaks the back and forward buttons.
- **Prefetch:** the router prefetches every link's page on hover or focus (Astro's default with `ClientRouter`; on
  tap with data saver or a slow connection). Links to the likely next step also get `data-astro-prefetch="viewport"`
  (prefetched once on screen): home buttons and cards, the "Modèle 3D" pill, previous / next page. Not every link:
  the sidebar alone would fetch about 600 kB per page. The 3D viewer's own files (about 3 MB) are warmed up on
  intent only, by `<l21-viewer-warmup>` (`src/components/ViewerWarmup.astro`).
- Starlight doesn't support the router officially: `Head.astro` (theme, sidebar scroll) and `Search.astro` (search
  kept across pages) fill the gaps. Check them after a Starlight upgrade.

## Rules kept from today

- Indexing: every page is open to search engines (no `noindex`); `robots.txt` only keeps out the bare viewer
  `/modele/viewer/` (embedded by `/modele/`) and points to the sitemap that Starlight generates.
- Custom domain `lock21.info` (`CNAME`), GitHub Pages deployment from `main` with the workflow's `GITHUB_TOKEN`.
- Escape `<` and `>` in MDX prose.
- Folder and file names in English (except existing French content slugs, kept to preserve the page addresses as
  much as practical; addresses may change while the site is not indexed).

## Code style

- Small files, one component per file, named in English.
- Comments explain why, not what; match the surrounding density.
- Every script answers `-h` / `--help` (see `AGENTS.md`).
- Dependencies: pinned exact versions for anything loaded from a CDN; prefer none.
