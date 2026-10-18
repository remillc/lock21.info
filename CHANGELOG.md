# Changelog

Versions follow [semantic versioning](https://semver.org/) (major.minor.patch), below 1.0.0 while the site is not public.

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
