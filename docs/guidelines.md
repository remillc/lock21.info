---
title: Front-end guidelines
description: The technical rules of the lock21.info site and the 3D viewer's interface - Astro, Starlight, SCSS, Custom Elements, scripts under client-side routing, prefetch.
---

Rules for the lock21.info site after its switch from Docusaurus to Astro (TODO #29, #30). They apply to the site and
to any UI added to the 3D viewer. Decided with Christian on 2026-10-19.

## Principles

- **Simplicity first.** Plain HTML (DOM) and CSS; JavaScript only where a page needs behaviour. No heavy UI
  framework (React, Vue, Svelte...) unless a real need appears and is agreed first.
- **Content is Markdown.** Pages stay Markdown/MDX files, written in French (source language), in the informal
  first-person field-notebook tone.
- **Static output.** The site is built to static files and served as static assets by Cloudflare (Workers static assets); no server code, except `worker/index.js` (a few lines, only for the English home page's address `/en/`).

## Stack

| Part | Choice | Notes |
| --- | --- | --- |
| Site framework | **Astro** | Static build (`output: 'static'`) |
| Docs (field notebook) | **Starlight** (Astro's docs theme) | Sidebar, search (Pagefind), table of contents, previous/next, i18n, dark mode |
| Styles | **SCSS** (`sass` package) | Overrides of Starlight's CSS custom properties; component styles scoped in `.astro` files, plain CSS nested (SCSS only where Sass is needed), in the `l21.*` cascade layers (`docs/system-design.md`) |
| Components | **Astro components** first | Rendered at build time, no JavaScript shipped |
| Interactive components | **Web Components** | **Lit** when a component has reactive state (re-renders when its data changes, e.g. a filterable dive log); **native Custom Elements** otherwise. Responsive layout is done in CSS either way |
| 3D viewer | Part of the site (`src/viewer/`, three.js; TODO #80, 2026-10-27) | `<l21-viewer>` on `/modele` (`src/components/model/Viewer.astro`): its controls in a shadow root, its code loaded on demand and taken down when the page is left |
| Search | Pagefind (built into Starlight) | Static index generated at build |
| Interface texts | **Paraglide JS** (inlang) | The components' and the viewer's texts as messages (`messages/site/`, the viewer's keys `viewer_…`, one JSON file per language), compiled by a Vite plugin into one plain JS function per message (`src/paraglide/`, gitignored). The site renders them at build time, each call naming the page's language (`m.home_lead({}, { locale })`); the viewer bundles only the ones it uses. The doc pages themselves are Starlight content, not messages |

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
  page script runs once only (e.g. `<l21-viewer>` on `/modele`, which sets the 3D viewer up and takes it down).
- **Elements added by script to `<body>`** are moved into the new body on `astro:after-swap` (`image-zoom.js`).
- **`history.replaceState` keeps `history.state`** (`history.replaceState(history.state, '', url)`): the router stores
  its entry there; `null` breaks the back and forward buttons.
- **Prefetch:** the router prefetches every link's page on hover or focus (Astro's default with `ClientRouter`; on
  tap with data saver or a slow connection). Links to the likely next step also get `data-astro-prefetch="viewport"`
  (prefetched once on screen): home buttons and cards, the "Modèle 3D" pill, previous / next page. Not every link:
  the sidebar alone would fetch about 600 kB per page. The 3D viewer's own files (about 3 MB) are warmed up on
  intent only, by `<l21-viewer-warmup>` (`src/components/ViewerWarmup.astro`).
- Starlight doesn't support the router officially: `Head.astro` (theme, sidebar scroll) and `Search.astro` (search
  kept across pages) fill the gaps. Check them after a Starlight upgrade. A link to the other language (French ↔
  `/en/`) loads the page in full, so that the search starts again in that language.

## Web app and offline (service worker)

The site is a progressive web app (TODO #81, Christian 2026-10-30: the network first). `public/sw.js` is registered by
`Head.astro`, in production only; its comment at the top is the reference.

- **Pages:** the network first, each page read kept on the device (200 at most); without network, the kept copy, else
  `public/offline.html` (self-contained, French or English by the address, it lists the kept pages). On a slow network
  (no answer in 4 s) a kept copy is shown and the network's answer kept for next time. Pages prefetched by the router
  are kept too, so a page hovered once reads offline.
- **Files:** `/_astro/` (hashed, never stale) from the kept copy first; the other files of the site the network first.
  Never kept: other sites (Google Analytics, the 3D tiles: the 3D model is not available offline), `/api/`,
  `/downloads/`, `/viewer/`.
- **Updates:** a new `sw.js` takes over at the next visit (`skipWaiting`, `clients.claim`; `public/_headers` serves it
  with `no-cache`). Bump its `VERSION` when the kept copies must start over (a change of what is kept or how).
- **Manifests:** `public/manifest.webmanifest` (French, starts at `/`) and `public/manifest-en.webmanifest` (English,
  `/en/`), linked by the page's language: an app installed from an English page opens in English. Icons in
  `public/icons/`, drawn from `favicon.svg` by `tools/pwa/make_icons.mjs` (run it again after the logo changes).
- **Testing:** the service worker only runs on a build (`npm run build`, then `npx wrangler dev`, which serves
  `offline.html` at `/offline` as Cloudflare does); Chrome's DevTools, Application tab, shows it, its caches and the
  manifest, and Network › Offline tries it without network.

## Rules kept from today

- Indexing: every page is open to search engines (no `noindex`); `robots.txt` points to the sitemap that Starlight
  generates.
- Custom domain `lock21.info` on the Cloudflare Worker `lock21-info` (`wrangler.jsonc`), deployed by the workflow on a release tag or a manual run.
- Escape `<` and `>` in MDX prose.
- Folder and file names in English (except existing French content slugs, kept to preserve the page addresses as
  much as practical; addresses may change while the site is not indexed).
- Viewer shaders: the viewer's code goes into three.js's shaders at their `#include <…>` lines, always through
  `insertAt` (`src/viewer/shader-patch.js`), which reports a hook that is gone (console « shader hook missing », and
  telemetry) instead of failing silently. three.js is pinned to an exact version: before updating it, open `/modele`
  (also `?underwater=1`) and look for that message (TODO #26, 2026-10-27; three-custom-shader-material was weighed
  and not taken: the sun's shadow cascades patch the same materials).

## Code style

- Small files, one component per file, named in English.
- Comments explain why, not what; match the surrounding density.
- The `hidden` attribute always hides: a global `[hidden] { display: none !important; }` (site `custom.scss`, viewer
  `style.css`). Hide and show with `hidden`, without a `[hidden]` rule per element.
- Every script answers `-h` / `--help` (see `AGENTS.md`).
- Dependencies: pinned exact versions for anything loaded from a CDN; prefer none.
