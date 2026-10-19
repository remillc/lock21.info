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

## Rules kept from today

- `noindex` on every page while the site is not public (meta robots + `robots.txt`), including `/modele/`.
- Custom domain `lock21.info` (`CNAME`), GitHub Pages deployment from `main` with the workflow's `GITHUB_TOKEN`.
- Escape `<` and `>` in MDX prose.
- Folder and file names in English (except existing French content slugs, kept to preserve the page addresses as
  much as practical; addresses may change while the site is not indexed).

## Code style

- Small files, one component per file, named in English.
- Comments explain why, not what; match the surrounding density.
- Every script answers `-h` / `--help` (see `AGENTS.md`).
- Dependencies: pinned exact versions for anything loaded from a CDN; prefer none.
