---
name: new-news
description: Creates a news post in content/news/ with the section's minimal frontmatter (title, description, date). Use when posting an event recap, announcement, or casual club update. Computes the dated filename automatically.
argument-hint: <title>
disable-model-invocation: true
---

# New news post

Create a news file in `content/news/` with the section's minimal frontmatter.

## Gather inputs

- **title** — from the arguments; ask if missing
- **description** — one sentence; draft it from the title if not given

## Compute the date field

`date` is today's date in US Eastern, date only — no time, no offset:

```sh
TZ=America/New_York date "+%Y-%m-%d"
```

`hugo.toml` sets `timeZone = "America/New_York"`, so a bare date is read as Eastern midnight. Never add a time.

## Create the file

Path: `content/news/<title, normalized>.md` — lowercase the title, drop punctuation, hyphens between words; no date prefix. The filename is also the URL: Hugo derives the URL segment from the title by the same normalization, and `validate-content.html` fails the build if the two disagree. Nothing in frontmatter pins the URL, so a later retitle moves it — when that happens, rename the file and add the old path under `aliases:`. Stop and ask if the path already exists.

```yaml
---
title: "<title>"
description: "<description>"
date: <YYYY-MM-DD>
---
```

That is the complete frontmatter for news — do not add fields from the other sections. Leave the body empty unless post text was provided.

## Verify

1. `bunx prettier --write <file>` — must pass.
2. Confirm `date` is a bare `YYYY-MM-DD` with no time or offset.
3. Show the user the file path and frontmatter.

Done means: file exists at the path, exactly three frontmatter fields, Prettier-clean.
