---
name: release
description: |
  Make a release of lock21.info (1.0.0-beta.N, later 1.0.0): bump the version, date the CHANGELOG, build, merge a
  release branch into main, push an annotated tag (which deploys to Cloudflare), check the live site. Use only when
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
- Read `## Unreleased` in `CHANGELOG.md`. If it is empty, there is nothing to release: say so and stop.
- The new version: the next `1.0.0-beta.N` (`git tag --sort=-creatordate | head -1`, `package.json`), unless Christian
  names another. `1.0.0` only when he says it is the launch.

## 2. The release branch

```sh
git checkout -b release/<version>
```

- `package.json` and `package-lock.json`: `"version"` to `<version>` (package-lock has it twice: the top and
  `packages[""]`). Edit the files; `npm version` would tag on its own.
- `CHANGELOG.md`: rename `## Unreleased` to `## <version> - <YYYY-MM-DD>` (today's date, local). No empty
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
  shows the new version and date. Look at `/modele` too if the release touches the viewer.

## 5. After

- Delete the release branch, local and remote (`git branch -d`, `git push origin --delete release/<version>`). If
  `-d` refuses, check that `main` contains it (`git log main..release/<version>` empty) before `-D`.
- Offer, don't run: `npm run bing:submit` (new or renamed pages only; it needs Christian's OK).
- Tell Christian: the version, the tag, the deploy's result, the About page checked.

## Not part of a release

- The 3D tiles and downloads are uploaded to R2 on their own (`model:upload`, `downloads:upload`), each with its own OK.
  A release only deploys the site's code. If the release's entries depend on an upload not done yet, say so before
  tagging.
- English pages aren't brought up to date by a release (they are on request). `npm run i18n:status` may be mentioned
  if French pages changed.
