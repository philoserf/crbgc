# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo-built static site for the Common & Recent Bogeymens Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. `CNAME` maps the custom domain; `.github/workflows/pages.yml` builds and deploys on push to `main`.

This repo is not the authoritative copy of the governance documents — they render here, but adoption history lives in the meeting minutes. Amending bylaws or standing rules means editing the document, bumping `last_amended` in its frontmatter, and recording the vote in the minutes.

Two onboarding docs at the repo root: `walkthrough.md` (linear code tour) and `theory.md` (domain model and load-bearing abstractions). Keep them current when structure changes.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `crbgc` row). Read it when starting work; update it when that step ships.

## Related: the notes site

The club's informal notes (essays, history surveys, course architecture writing) live in the sibling repo `../crbgc-notes/` ([philoserf/crbgc-notes](https://github.com/philoserf/crbgc-notes)) and publish via Flowershow at <https://crbgc-philoserf.flowershow.me>. This repo (`crbgc/`) is the formal/governance side — bylaws, minutes, notices, news; the notes site is the personal/editorial side. Keep the split clean: governance and official records here, prose and notes there.

## Conventions

- Run `task format` before committing.
- `layouts/index.llms.txt` is excluded from Prettier on purpose — it is plain text where whitespace is the output, and the `go-template` parser mangles it into a broken feed. It is excluded only by the `task prettier` glob (`.{md,html,yml,yaml,toml,json}`); do not widen it. Note `.prettierignore` is a **symlink to `.gitignore`**, so anything added there is also gitignored — never put a formatter-only exclusion in it.
- YAML frontmatter across all content; TOML only in `hugo.toml`.
- Dated filenames (`YYYY-MM-DD-slug.md`) for notices, minutes, and news. Every dated post sets an explicit `slug:` in frontmatter to pin its URL — never change a published slug, and never rely on the title-derived fallback.
- Scaffold new posts with the project skills `/new-notice`, `/new-minutes`, `/new-news` (user-invoked; they compute the Eastern offset) rather than hand-writing frontmatter.
- Content `date` fields use US Eastern offsets (`-04:00` in summer, `-05:00` in winter). A wrong offset can hide a post from production builds.
- Anything that lists notices goes through `layouts/partials/notices-by-status.html`, which returns the section split into `current` and `expired`. Never query the notices section directly for a listing — a naive "most recent N" silently shows expired notices, which is how issues #36 and #38 arose.
- No taxonomies. `notice_type` and `meeting_type` are frontmatter fields, queried directly in templates.
- `<abbr>` HTML tags in content (e.g., C&RBGC tooltips) are intentional.
- Frontmatter conventions for each content type are documented in the project README.
- Keep the copyright year range in `layouts/_default/baseof.html` current.
- The homepage intentionally has no `h1` — a design choice, reaffirmed 2026-05-26. Do not flag it as an accessibility or SEO issue or try to restore one.
- CI (`pages.yml`) is the build verifier — push and watch it rather than running routine local production builds. When a local build is needed, run `rm -rf public && task build`; Hugo does not prune stale artifacts from `public/`.
