---
name: new-notice
description: Creates an RONR meeting notice in content/notices/ with complete frontmatter. Use when posting a notice of an annual or special meeting, a motion requiring previous notice, or a bylaw amendment. Computes the dated filename and the expires date.
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

- `date` (when posted) — today's date in US Eastern, date only:

  ```sh
  TZ=America/New_York date "+%Y-%m-%d"
  ```

  `hugo.toml` sets `timeZone = "America/New_York"`, so a bare date is read as Eastern midnight. Never add a time.

- `expires` — the day after `meeting_date`.

All three date fields are bare `YYYY-MM-DD`.

## Create the file

Path: `content/notices/<title, normalized>.md` — lowercase the title, drop punctuation, hyphens between words; no date prefix. Notice titles begin "Notice of …", so the `notice-of-` prefix falls out of the normalization. The filename is also the URL: Hugo derives the URL segment from the title by the same normalization, and `validate-content.html` fails the build if the two disagree. Nothing in frontmatter pins the URL, so a later retitle moves it — when that happens, rename the file and add the old path under `aliases:`. Stop and ask if the path already exists.

```yaml
---
title: "<title>"
description: "<description>"
date: <YYYY-MM-DD>
meeting_date: <YYYY-MM-DD>
expires: <YYYY-MM-DD>
notice_type: <notice_type>
authority: "<authority>"
---
```

Leave the body empty unless notice text was provided.

## Verify

1. `bunx prettier --write <file>` — must pass.
2. Confirm all three date fields are bare `YYYY-MM-DD` with no time or offset.
3. Show the user the file path and frontmatter. Remind them the notice appears under "Expired" on the list page after `expires`.

Done means: file exists at the path, all seven frontmatter fields populated, Prettier-clean.
