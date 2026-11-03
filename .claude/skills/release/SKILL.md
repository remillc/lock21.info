---
name: release
description: |
  Make a release of lock21.info (1.0.1, 1.1.0…): bring the English pages up to date, bump the version,
  date the CHANGELOG, build, merge a release branch into main, push an annotated tag (which deploys to Cloudflare), check the live site. Use only when
  Christian asks for a release, a version or a deploy by tag ("fais une release", "sors la beta.8"); a merge into main
  is not a release.
---

# Release

The rules behind these steps are in `AGENTS.md` (« Git », « CI »). Pushing the tag **deploys the live site**: do it
only when Christian has asked for the release in his own words in this conversation ("tag et pousse toi-même"). An
earlier release's OK doesn't carry over.

## 1. Before starting

- `git status` clean, on `main`, up to date (`git pull --ff-only`). Nothing waiting on a feature branch that Christian
  expects in this release: list the unmerged branches (`git branch -a --no-merged main`) and ask if one looks meant for
  it.
- `npm run model:check` (the `.blend` saved): zones or context changed since their publication. The model is
  published on its own (`model:upload`, with its OK), not by the release: tell Christian if something is waiting.
- Read `## Unreleased` in `CHANGELOG.md`. If it is empty, there is nothing to release: say so and stop.
- The new version, from the last one (`git tag --sort=-creatordate | head -1`, `package.json`), unless Christian names
  another: patch for fixes, minor for features.

## 2. The release branch

```sh
git checkout -b release/<version>
```

- `package.json` and `package-lock.json`: `"version"` to `<version>` (package-lock has it twice: the top and
  `packages[""]`). Edit the files; `npm version` would tag on its own.
- **The English pages up to date** (Christian, 2026-11-01: a release brings them up to date). `npm run i18n:status`
  lists the French pages added, changed since their translation (with the `git diff` to read) and removed or renamed:
  - added or changed: translate into `src/content/docs/en/<same path>`, in the same plain voice ([[natural-writing]]).
    A new page also needs its line in `src/data/englishPaths.js`.
  - removed or renamed: remove or rename the English page and its `englishPaths.js` line the same way.
  - the interface texts: every key of `messages/site/fr.json` and `messages/viewer/fr.json` is in its `en.json`.
  - commit the translations, then record them (`node tools/i18n/status.mjs --record <path...>`, paths relative to
    `src/content/docs/`, French side) and commit that. `npm run i18n:status` must then list nothing.
  - the CHANGELOG gets one line for them (« English pages brought up to date: … »).
- `CHANGELOG.md`: rename `## Unreleased` to `## <version> - <YYYY-MM-DD>` (today's date, local), with a short summary at its head. No empty
  `## Unreleased` above it: the next change adds one.
- Read the entries once with Christian's eyes ([[natural-writing]]): plain, one per change, nothing that isn't in the
  release.
- `npm run build`: it must pass. Then `npm run preview` and check that the About page (`/a-propos`, bottom) shows the
  new version and date (`SiteVersion.astro` reads package.json and the CHANGELOG).
- Commit (`wip`, no attribution trailer) and push: `git push -u origin release/<version>`.

## 3. Merge and tag

```sh
git checkout main
git merge --no-ff release/<version> -m "Merge release/<version>"
git push origin main
git tag -a v<version> -m "<version>"
git push origin v<version>          # deploys
```

The tag goes on the merge commit, on `main`. The tag's message is the version alone, as the earlier tags.

## 4. Check the deploy

- `gh run list --workflow deploy.yml -L 1`, then `gh run watch <id> --exit-status`. On a failure, read
  `gh run view <id> --log-failed`, tell Christian, and don't retag: fix on a branch and ask.
- The live site, with the analytics flag (`?no-analytics=1`, TODO #95): `https://lock21.info/a-propos?no-analytics=1`
  shows the new version and date. Then, as `docs/project-organization.md` lists them: the former addresses redirect,
  `/modele` loads, the lightbox opens, the 404 page shows (an unknown address).

## 5. After

- Delete the release branch, local and remote (`git branch -d`, `git push origin --delete release/<version>`). If
  `-d` refuses, check that `main` contains it (`git log main..release/<version>` empty) before `-D`.
- Offer, don't run: `npm run bing:submit` (new or renamed pages only; it needs Christian's OK).
- Tell Christian: the version, the tag, the deploy's result, the About page checked.

## Not part of a release

- The 3D tiles and downloads are uploaded to R2 on their own (`model:upload`, `downloads:upload`), each with its own OK.
  A release only deploys the site's code. If the release's entries depend on an upload not done yet, say so before
  tagging.
