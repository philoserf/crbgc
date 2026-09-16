# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo-built static site for the Common & Recent Bogeymens Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. `CNAME` maps the custom domain; `.github/workflows/pages.yml` builds and deploys on push to `main`.

This repo is not the authoritative copy of the governance documents — they render here, but adoption history lives in the meeting minutes. Amending bylaws or standing rules means editing the document, bumping `last_amended` in its frontmatter, and recording the vote in the minutes.

`WALKTHROUGH.md` (linear code tour) and `THEORY.md` (domain model and load-bearing abstractions) are **generated** by the `code-walkthrough` and `code-theory` skills, not maintained by hand. They are absent more often than not, and when present they are allowed to drift: do not edit them to track a code change, do not correct stale line numbers or transcribed output, and do not treat their drift as a finding. When they are wrong enough to matter, regenerate them — patching them between generations is wasted churn.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `crbgc` row). Read it when starting work; update it when that step ships.

## The notes

The club's informal writing — essays, history surveys, course architecture — lives in `content/notes/`. It arrived from the sibling repo `../crbgc-notes/` ([philoserf/crbgc-notes](https://github.com/philoserf/crbgc-notes)), which is **no longer authoritative**: edit notes here, not there. Flowershow, the service that used to publish them, is decommissioned; no link to `crbgc-philoserf.flowershow.me` survives anywhere in this repo, and this sentence is the last mention of it. Do not add one.

Notes follow the same URL discipline as every other section — the URL is the title as Hugo normalizes it, the filename is that same string, and `validate-content.html` fails the build when they disagree. They are prose rather than record, so the governance rules about amendment and minutes do not apply to them.

**All 65 notes are published, dated one per day** — `2026-06-21` through `2026-09-16`, founding day to the day the dating was done. No note is a draft and none shares a date with another. The run pauses between `2026-07-31` and `2026-08-24`; the three August news posts sit in that gap, so the Club's actual August interrupts the backfill rather than being buried under it.

The dates are backdated rather than scheduled, and that is what makes the section coherent: every one is in the past, so they published together on a single build with no window in which a live note pointed at one that had not appeared yet.

Two different orders produced them, and both are deliberate. The first 41 — every note reachable by a link from the notes about the Club or its kindred clubs — are ordered by the link graph. The 65 notes carry 124 links among themselves, and the seven notes about the Club sit at the top of it: their closure is 38 of those 41. So the reference layer takes the earliest dates and the Club's own notes fall on 19–28 July, which is why `commons-day` reads as later than `history-of-public-golf-in-america` even though the Club is the point. Reversing that would have been the natural instinct and the wrong one; as a staged rollout it cost 625 dead-link-days against 30.

The remaining 24, which no note linked to, are ordered as an argument instead: the old rules and how the game is contested, then what a course should be, then the ground the Club actually plays, then the writing and the modern reckoning — ending on `the-endless-golf-equipment-fee`.

**The invariant both orders keep: a note is dated no earlier than the notes it cites.** One citation breaks it, `hickory-era-golf-writing-survey` → `american-golf-writing-19501970`, because the two cite each other and the hickory era genuinely precedes 1950. Seven such mutual clusters exist among the first 41. Preserve this rule when dating anything new: it is what lets the dates be read as a sequence rather than a shuffle.

Adding a note now means giving it a `date:` and no `draft:`. The two move together — dropping `draft:` without a date builds clean and exits 0, but `home.rss.xml` selects on `PublishDate.IsZero`, so the note publishes, appears on `/notes/`, and is silently missing from the feed forever. A date without dropping `draft:` does nothing at all. Note also that `validate-content.html` cannot see a draft or a future-dated page, so its filename-matches-URL check reaches a note only once that note is live.

One consequence, intended:

- **`layouts/notes/list.html` orders `ByDate.Reverse`**, as every other dated section does. It ordered `ByTitle` for as long as the notes shared a single date, when date order would have been arbitrary. So the list page now leads with the 24 argument-ordered notes, `the-endless-golf-equipment-fee` first, and ends on the reference layer — the reverse of the order that produced the dates.

Deliberately left behind, and not to be imported without a fresh decision:

- **The 2023 Rules of Golf** — 62,000 words of verbatim current R&A/USGA licensed text. This is a copyright question, not a curation one.
- **The 1960 Rules** — also verbatim, and its status is genuinely unclear rather than clearly fine.
- **Nine index notes** — Obsidian maps of content that were pure wikilink lists. Sentences that pointed at them were rewritten to point at real pages; do not reintroduce references to a "Rules of Golf Editions" or "Course Architecture" hub, because neither exists.
- **Five of six `Drafts/`** — the sixth is here as `draft: true`.

One open editorial question, recorded so it is not mistaken for an oversight: `content/news/from-a-standing-game-to-a-standing-club.md` says "The Club keeps two homes online, and the line between them is deliberate," and both of its bullets now point at crbgc.org. That was true the day it was published and it is the Club's record of its own founding, so the prose has been left alone and only the link updated. Whether a dated post should be amended when the world it describes changes is a call for the Club, not a defect to fix in passing.

## Conventions

- Run `task format` before committing.
- **Do not bump Prettier past 3.x.** `prettier-plugin-go-template` is pinned exact at `0.0.15` (upstream abandoned 2023). Under Prettier 4 the plugin's printer breaks and Prettier silently falls back to the HTML parser, which mangles every template in `layouts/`. See issue #52. The duplicated `prettier --write` in `Taskfile.yml` is deliberate and permanent — the plugin is non-idempotent.
- `layouts/index.llms.txt` is excluded from Prettier on purpose — it is plain text where whitespace is the output, and the `go-template` parser mangles it into a broken feed. It is excluded only by the `task prettier` glob (`.{md,html,yml,yaml,toml,json}`); do not widen it. Note `.prettierignore` is a **symlink to `.gitignore`**, so anything added there is also gitignored — never put a formatter-only exclusion in it.
- YAML frontmatter across all content; TOML only in `hugo.toml`.
- **A content filename is its title, normalized by Hugo's `urlize`** — lowercased, punctuation dropped, spaces to hyphens. Nothing else goes in it: no Jekyll-style `YYYY-MM-DD-` prefix, and no date at all, because a year that matters is already in the title.
- **The title is the URL.** There is no `slug:` anywhere in this repo — `[permalinks]` uses `:slug`, whose fallback is the normalized title, so title, filename and URL are one string. `validate-content.html` fails the build when a filename and its URL segment disagree, which is what catches a retitle that was not accompanied by a rename.
- **Retitling a published post moves its URL**, and nothing can detect that after the fact. When you must, rename the file to match and add the old path under `aliases:` — `content/news/from-a-standing-game-to-a-standing-club.md` is the worked example. Hugo drops `&` from a URL rather than spelling it "and", so write "and" in the title if you want it in the URL.
- Scaffold new posts with the project skills `/new-notice`, `/new-minutes`, `/new-news` (user-invoked) rather than hand-writing frontmatter.
- Every date field is a bare `YYYY-MM-DD` — no time, no offset. `hugo.toml` sets `timeZone = "America/New_York"`, so Hugo reads them as Eastern midnight; do not reintroduce a timestamp to order posts within a day.
- Anything that _lists_ notices goes through `layouts/partials/notices-by-status.html`, which returns the section split into `current` and `expired`. Never query the notices section directly for a listing — a naive "most recent N" silently shows expired notices, which is how issues #36 and #38 arose. The site feed is the documented exception: it is an archive rather than a listing, so `home.rss.xml` queries the section directly and keeps expired notices. See the Feeds note in README.
- No taxonomies. `notice_type` and `meeting_type` are frontmatter fields, queried directly in templates.
- **No `tags:` and no `lastmod:` in any content file.** `disableKinds` removes taxonomy and term pages, so 300 tag entries across the notes rendered nowhere and appeared in no feed — they were Obsidian metadata, like the wikilinks and the `created:` field. Editing a note in Obsidian will offer to put tags back; decline. `lastmod:` had one consumer, the feed's `lastBuildDate`, and that is gone too — see the header comment in `layouts/home.rss.xml` for what it would take to restore a real one.
- `<abbr>` HTML tags in content (e.g., C&RBGC tooltips) are intentional.
- Frontmatter conventions for each content type are documented in the project README.
- Keep the copyright year range in `layouts/_default/baseof.html` current.
- The homepage intentionally has no `h1` — a design choice, reaffirmed 2026-05-26. Do not flag it as an accessibility or SEO issue or try to restore one.
- CI (`pages.yml`) is the build and formatter verifier — it runs the two `task check` commands and both Hugo passes on every push and pull request. Push and watch it rather than running routine local production builds. When a local build is needed, run `rm -rf public && task build`; Hugo does not prune stale artifacts from `public/`.
