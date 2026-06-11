---
name: new-minutes
description: Creates a meeting-minutes file in content/minutes/ with complete frontmatter in Draft state. Use when recording, drafting, or filing minutes for an annual, special, or regular meeting. Computes the dated filename and the correct US Eastern offset for the meeting datetime.
argument-hint: <title> [meeting-datetime YYYY-MM-DDTHH:MM]
disable-model-invocation: true
---

# New minutes

Create a minutes file in `content/minutes/` with complete, correct frontmatter.

## Gather inputs

From the arguments and conversation; ask for anything missing:

- **title** — e.g. "Minutes — 2026 Annual Meeting"
- **meeting datetime** — date and start time of the meeting
- **meeting_type** — one of `annual`, `special`, `regular`
- **presiding**, **secretary** — names
- **present**, **absent** — member name lists (may be left as placeholders to fill during drafting)
- **description** — one sentence; draft it from the title if not given

## Compute the date field

`date` is the meeting datetime (not today), in US Eastern with the correct offset:

```sh
TZ=America/New_York date -j -f "%Y-%m-%dT%H:%M:%S" "<YYYY-MM-DDTHH:MM:00>" "+%z"
```

Insert a colon into the offset (`-0400` → `-04:00`). Never hand-write the offset; the command resolves DST for the meeting's date.

## Create the file

Path: `content/minutes/<meeting-date YYYY-MM-DD>-<slug>.md` — the date prefix is the meeting date; the URL comes from the `slug:` frontmatter field, which pins it permanently. Slug: lowercase title, strip punctuation, hyphens between words (e.g. `minutes-2026-annual-meeting`). Stop and ask if the path already exists.

```yaml
---
title: "<title>"
slug: <slug>
description: "<description>"
date: <meeting datetime with offset>
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
2. Confirm the offset matches the season of the **meeting date**: `-04:00` roughly Mar–Nov (DST), `-05:00` otherwise. A wrong offset can hide the post from production builds.
3. Show the user the file path and frontmatter.

Done means: file exists at the meeting-dated path, all eleven frontmatter fields present, `approved: false`, Prettier-clean.
