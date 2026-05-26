# crbgc — source for crbgc.org

Hugo site for **The Common & Recent Bogey Golf Club** (C&RBGC), a small parliamentary golf society governed by _Robert's Rules of Order Newly Revised_. The published site lives at [crbgc.org](https://crbgc.org/) — read the bylaws, standing rules, and notices there, not here.

For a linear tour of the code — configuration, content model, templates, build, and deploy — see [walkthrough.md](./walkthrough.md).

## Site structure

```
content/
  _index.md                       # homepage intro
  governance/                     # bylaws, standing rules, special rules, officers
  notices/                        # RONR-required notices (meetings, motions, amendments)
  minutes/                        # meeting minutes archive
  news/                           # event recaps, announcements
layouts/                          # Hugo templates and partials
assets/css/style.css              # site styles (Biome-managed)
hugo.toml                         # config: permalinks, disabled kinds, locale
```

Each section under `content/` has an `_index.md` (the list page) and dated posts. Hugo emits `/<section>/index.xml` RSS feeds automatically.

## Adding content

### A meeting notice

1. Create `content/notices/YYYY-MM-DD-slug.md` (date prefix is for editor sort order; the URL uses the title slug).
2. Required frontmatter:
   ```yaml
   ---
   title: "Notice of …"
   description: "…"
   date: 2026-06-01T09:00:00-05:00 # when posted
   meeting_date: 2026-06-15
   expires: 2026-06-16
   notice_type: annual-meeting # or special-meeting | previous-notice | bylaw-amendment
   authority: "Article V, Section 1" # the bylaw provision requiring this notice
   ---
   ```
3. Notices listed past their `expires` date move under the "Expired" heading on the section page.

### Meeting minutes

1. Create `content/minutes/YYYY-MM-DD-slug.md`.
2. Required frontmatter:
   ```yaml
   ---
   title: "Minutes — …"
   description: "…"
   date: 2026-06-15T19:00:00-05:00 # the meeting datetime
   meeting_type: annual # annual | special | regular
   approved: false # flip to true when approved at the next meeting
   approved_on: # set to the approval date when flipped
   presiding: "…"
   secretary: "…"
   present: ["…", "…"]
   absent: []
   ---
   ```
3. The section list shows an **Approved** / **Draft** badge based on `approved`.

### A news post

1. Create `content/news/YYYY-MM-DD-slug.md`.
2. Minimal frontmatter: `title`, `description`, `date`. That's it.

### Amending bylaws or standing rules

1. Edit `content/governance/bylaws.md` or `content/governance/standing-rules.md`.
2. Bump `last_amended` in the frontmatter to the meeting date.
3. Record the vote in the meeting minutes per Article VIII, Section 4 of the Bylaws.

## Build and deploy

```bash
task serve   # hugo server -D --buildFuture (drafts + future posts visible)
task build   # hugo --minify --gc (production)
task format  # prettier (md/html/yaml/toml/json) + biome (css)
task check   # read-only equivalents of format
```

Deployment is automated by `.github/workflows/pages.yml`: pushes to `main` build with Hugo and publish to GitHub Pages. The site serves from the custom domain via `CNAME`.

## Conventions

- **YAML frontmatter** across all content. TOML is only used in `hugo.toml`.
- **Prettier** formats Markdown, HTML/Hugo templates, YAML, TOML, and JSON. **Biome** formats and lints CSS. Run `task format` before committing.
- **Dated filenames** (`YYYY-MM-DD-slug.md`) for date-driven content. Date prefix sorts the editor; URLs derive from the title.
- **No taxonomies.** `notice_type` and `meeting_type` live in frontmatter and are queried directly in templates.
- **`<abbr>` tags** in content are intentional (e.g., for C&RBGC tooltips).

## License

See [LICENSE](./LICENSE).
