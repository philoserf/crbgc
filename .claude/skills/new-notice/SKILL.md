---
name: new-notice
description: Creates an RONR meeting notice in content/notices/ with complete frontmatter. Use when posting a notice of an annual or special meeting, a motion requiring previous notice, or a bylaw amendment. Computes the dated filename, expires date, and correct US Eastern offset.
argument-hint: <title> [meeting-date YYYY-MM-DD]
disable-model-invocation: true
---

# New notice

Create a notice file in `content/notices/` with complete, correct frontmatter.

## Gather inputs

From the arguments and conversation; ask for anything missing:

- **title** — e.g. "Notice of the 2026 Annual Meeting"
- **meeting_date** — `YYYY-MM-DD`
- **notice_type** — one of `annual-meeting`, `special-meeting`, `previous-notice`, `bylaw-amendment`
- **authority** — the bylaw provision requiring the notice, e.g. "Article V, Section 1"
- **description** — one sentence; draft it from the title if not given

## Compute the date fields

- `date` (when posted) — now, in US Eastern with the correct offset:

  ```sh
  TZ=America/New_York date "+%Y-%m-%dT%H:%M:%S%z"
  ```

  Insert a colon into the offset (`-0400` → `-04:00`). Never hand-write the offset; the command resolves DST.

- `expires` — the day after `meeting_date` (date only, no time).

## Create the file

Path: `content/notices/<today YYYY-MM-DD>-<slug>.md` — the date prefix is today (posting date) and exists only for editor sort order; the URL comes from the `slug:` frontmatter field, which pins it permanently. Slug: lowercase title, strip punctuation, hyphens between words (keep the "notice-of" prefix). Stop and ask if the path already exists.

```yaml
---
title: "<title>"
slug: <slug>
description: "<description>"
date: <posted datetime with offset>
meeting_date: <YYYY-MM-DD>
expires: <YYYY-MM-DD>
notice_type: <notice_type>
authority: "<authority>"
---
```

Leave the body empty unless notice text was provided.

## Verify

1. `bunx prettier --write <file>` — must pass.
2. Confirm the offset matches the season: `-04:00` roughly Mar–Nov (DST), `-05:00` otherwise. A wrong offset can hide the post from production builds.
3. Show the user the file path and frontmatter. Remind them the notice appears under "Expired" on the list page after `expires`.

Done means: file exists at the dated path, all eight frontmatter fields populated, Prettier-clean.
