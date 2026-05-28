# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo-built static site for the Common & Recent Bogey Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. `CNAME` maps the custom domain; `.github/workflows/pages.yml` builds and deploys on push to `main`.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `crbgc` row). Read it when starting work; update it when that step ships.

## Related: the notes site

The club's informal notes (essays, history surveys, course architecture writing) live in the sibling repo `../crbgc-notes/` ([philoserf/crbgc-notes](https://github.com/philoserf/crbgc-notes)) and publish via Flowershow at <https://crbgc-philoserf.flowershow.me>. This repo (`crbgc/`) is the formal/governance side — bylaws, minutes, notices, news; the notes site is the personal/editorial side. Keep the split clean: governance and official records here, prose and notes there.

## Content structure

Four sections under `content/`, each with an `_index.md` and (where applicable) dated posts:

- `content/_index.md` — homepage intro (identity only; the layout adds latest-notices, latest-news, and governance links).
- `content/governance/` — bylaws, standing rules, special rules of order, officers. Ordered by `weight` in frontmatter.
- `content/notices/` — RONR-required notices (meetings, motions requiring previous notice, bylaw amendments). Date-driven; the list page splits current vs. expired by the `expires` frontmatter field.
- `content/minutes/` — meeting minutes archive. Grouped by year on the list page; each shows an Approved/Draft badge driven by `approved`.
- `content/news/` — event recaps, announcements, casual updates.

Templates live under `layouts/` with section-specific list/single pairs and shared partials (`notice-meta`, `minutes-meta`, `item-row`, `latest`). Frontmatter conventions for each type are documented in the project README.

## Development Commands

Task runner (`Taskfile.yml`) with Bun:

- `task serve` — `hugo server -D --buildFuture` (drafts and future-dated content visible)
- `task build` — `hugo --minify --gc` (production)
- `task format` — Prettier (md, html/Hugo, yaml, toml, json) + Biome (css), write
- `task check` — same coverage, read-only

Prettier uses `prettier-plugin-go-template` for Hugo templates; CSS is delegated to Biome (which also lints). `task prettier` runs the formatter twice because the go-template plugin can need a second pass to converge.

## Conventions

- Run `task format` before committing.
- YAML frontmatter across all content; TOML only in `hugo.toml`.
- Dated filenames (`YYYY-MM-DD-slug.md`) for notices, minutes, and news. URLs use the title slug, not the date.
- No taxonomies. `notice_type` and `meeting_type` are frontmatter fields, queried directly in templates.
- `<abbr>` HTML tags in content (e.g., C&RBGC tooltips) are intentional.
- Keep the copyright year range in `layouts/_default/baseof.html` current.
