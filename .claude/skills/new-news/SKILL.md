---
name: new-news
description: Creates a news post in content/news/ with the section's minimal frontmatter (title, description, date). Use when posting an event recap, announcement, or casual club update. Computes the dated filename and the correct US Eastern offset automatically.
argument-hint: <title>
disable-model-invocation: true
---

# New news post

Create a news file in `content/news/` with the section's minimal frontmatter.

## Gather inputs

- **title** — from the arguments; ask if missing
- **description** — one sentence; draft it from the title if not given

## Compute the date field

`date` is now, in US Eastern with the correct offset:

```sh
TZ=America/New_York date "+%Y-%m-%dT%H:%M:%S%z"
```

Insert a colon into the offset (`-0400` → `-04:00`). Never hand-write the offset; the command resolves DST.

## Create the file

Path: `content/news/<today YYYY-MM-DD>-<slug>.md` — the date prefix is for editor sort order; the URL comes from the `slug:` frontmatter field, which pins it permanently. Slug: lowercase title, strip punctuation, hyphens between words. Stop and ask if the path already exists.

```yaml
---
title: "<title>"
slug: <slug>
description: "<description>"
date: <posted datetime with offset>
---
```

That is the complete frontmatter for news — do not add fields from the other sections. Leave the body empty unless post text was provided.

## Verify

1. `bunx prettier --write <file>` — must pass.
2. Confirm the offset matches the season: `-04:00` roughly Mar–Nov (DST), `-05:00` otherwise. A wrong offset can hide the post from production builds.
3. Show the user the file path and frontmatter.

Done means: file exists at the dated path, exactly four frontmatter fields, Prettier-clean.
