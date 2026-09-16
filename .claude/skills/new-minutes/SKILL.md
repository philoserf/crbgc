---
name: new-minutes
description: Creates a meeting-minutes file in content/minutes/ with complete frontmatter in Draft state. Use when recording, drafting, or filing minutes for an annual, special, or regular meeting. Computes the dated filename from the meeting date.
argument-hint: <title> [meeting-date YYYY-MM-DD]
disable-model-invocation: true
---

# New minutes

Create a minutes file in `content/minutes/` with complete, correct frontmatter.

## Gather inputs

From the arguments and conversation; ask for anything missing:

- **title** — e.g. "Minutes — 2026 Annual Meeting"
- **meeting date** — the date of the meeting
- **meeting_type** — one of `annual`, `special`, `regular`
- **presiding**, **secretary** — names
- **present**, **absent** — member name lists (may be left as placeholders to fill during drafting)
- **description** — one sentence; draft it from the title if not given

## Compute the date field

`date` is the meeting date (not today), date only — no time, no offset. `hugo.toml` sets `timeZone = "America/New_York"`, so a bare date is read as Eastern midnight.

## Create the file

Path: `content/minutes/<title, normalized>.md` — lowercase the title, drop punctuation, hyphens between words; no date prefix. A title like "Minutes — 2026 Annual Meeting" gives `minutes-2026-annual-meeting.md`. The filename is also the URL: Hugo derives the URL segment from the title by the same normalization, and `validate-content.html` fails the build if the two disagree. Nothing in frontmatter pins the URL, so a later retitle moves it — when that happens, rename the file and add the old path under `aliases:`. Stop and ask if the path already exists.

```yaml
---
title: "<title>"
description: "<description>"
date: <meeting date YYYY-MM-DD>
meeting_type: <meeting_type>
approved: false
approved_on:
presiding: "<name>"
secretary: "<name>"
present: ["<name>", "<name>"]
absent: []
---
```

New minutes are always `approved: false` (the list page shows a Draft badge). `approved` flips to `true` and `approved_on` gets the approval date when the next meeting approves them — never at creation.

Leave the body empty unless minutes text was provided.

## Verify

1. `bunx prettier --write <file>` — must pass.
2. Confirm `date` is a bare `YYYY-MM-DD` with no time or offset.
3. Show the user the file path and frontmatter.

Done means: file exists at the path, all ten frontmatter fields present, `approved: false`, Prettier-clean.
