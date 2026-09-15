# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo-built static site for the Common & Recent Bogeymens Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. `CNAME` maps the custom domain; `.github/workflows/pages.yml` builds and deploys on push to `main`.

This repo is not the authoritative copy of the governance documents — they render here, but adoption history lives in the meeting minutes. Amending bylaws or standing rules means editing the document, bumping `last_amended` in its frontmatter, and recording the vote in the minutes.

`WALKTHROUGH.md` (linear code tour) and `THEORY.md` (domain model and load-bearing abstractions) are **generated** by the `code-walkthrough` and `code-theory` skills, not maintained by hand. They are absent more often than not, and when present they are allowed to drift: do not edit them to track a code change, do not correct stale line numbers or transcribed output, and do not treat their drift as a finding. When they are wrong enough to matter, regenerate them — patching them between generations is wasted churn.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `crbgc` row). Read it when starting work; update it when that step ships.

## The notes

The club's informal writing — essays, history surveys, course architecture — lives in `content/notes/`. It arrived from the sibling repo `../crbgc-notes/` ([philoserf/crbgc-notes](https://github.com/philoserf/crbgc-notes)), which is **no longer authoritative**: edit notes here, not there. Flowershow, the service that used to publish them, is decommissioned; no link to `crbgc-philoserf.flowershow.me` survives anywhere in this repo, and this sentence is the last mention of it. Do not add one.

Notes follow the same URL discipline as every other dated section — `YYYY-MM-DD-slug.md`, an explicit `slug:`, and enforcement in `validate-content.html`. They are prose rather than record, so the governance rules about amendment and minutes do not apply to them.

Deliberately left behind, and not to be imported without a fresh decision:

- **The 2023 Rules of Golf** — 62,000 words of verbatim current R&A/USGA licensed text. This is a copyright question, not a curation one.
- **The 1960 Rules** — also verbatim, and its status is genuinely unclear rather than clearly fine.
- **Nine index notes** — Obsidian maps of content that were pure wikilink lists. Sentences that pointed at them were rewritten to point at real pages; do not reintroduce references to a "Rules of Golf Editions" or "Course Architecture" hub, because neither exists.
- **Five of six `Drafts/`** — the sixth is here as `draft: true`.

One open editorial question, recorded so it is not mistaken for an oversight: `content/news/2026-06-21-club-formally-established.md` says "The Club keeps two homes online, and the line between them is deliberate," and both of its bullets now point at crbgc.org. That was true the day it was published and it is the Club's record of its own founding, so the prose has been left alone and only the link updated. Whether a dated post should be amended when the world it describes changes is a call for the Club, not a defect to fix in passing.

## Conventions

- Run `task format` before committing.
- **Do not bump Prettier past 3.x.** `prettier-plugin-go-template` is pinned exact at `0.0.15` (upstream abandoned 2023). Under Prettier 4 the plugin's printer breaks and Prettier silently falls back to the HTML parser, which mangles every template in `layouts/`. See issue #52. The duplicated `prettier --write` in `Taskfile.yml` is deliberate and permanent — the plugin is non-idempotent.
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
