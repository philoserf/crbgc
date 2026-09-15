# crbgc — source for crbgc.org

Hugo site for **The Common & Recent Bogeymens Golf Club** (C&RBGC), a small parliamentary golf society governed by _Robert's Rules of Order Newly Revised_. The published site lives at [crbgc.org](https://crbgc.org/) — read the bylaws, standing rules, and notices there, not here.

This repo holds Hugo source for the site. It is **not** the authoritative copy of the bylaws or rules — the governance documents render here, but their adoption history lives in [minutes](https://crbgc.org/minutes/). Amendments are recorded by editing the document and noting the vote in the meeting minutes.

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

Each section under `content/` has an `_index.md` (the list page) and dated posts. Feeds: `/index.xml` is the site feed, rendered by `layouts/home.rss.xml` — every dated post, newest first, and nothing atemporal. `news` and `minutes` keep Hugo's built-in section feed. `governance` emits no feed (the documents carry no dates) and neither does `notices` (a feed cannot both be an archive and hide expired notices, so the surface was dropped rather than made wrong); both set `outputs: ["html"]` in their `_index.md`. A feed is an archive — items are never removed from one.

## Conventions

- **YAML frontmatter** across all content. TOML is only used in `hugo.toml`.
- **Prettier** formats Markdown, HTML/Hugo templates, YAML, TOML, and JSON. **Biome** formats and lints CSS. Run `task format` before committing.
- **`layouts/index.llms.txt` is deliberately unformatted.** It is a plain-text template where whitespace is the output, and Prettier's `go-template` parser treats it as HTML — it splits Markdown headings from their text and collapses list items into a broken feed. It is excluded because the `task prettier` glob covers only `.{md,html,yml,yaml,toml,json}`; the exclusion cannot go in `.prettierignore`, which is a symlink to `.gitignore`, so an entry there would also stop git tracking the file. **Do not widen the glob.** Edit it by hand and check the rendered `/llms.txt`.
- **Dated filenames** (`YYYY-MM-DD-slug.md`) for date-driven content. Date prefix sorts the editor.
- **Explicit `slug:`** in every dated post's frontmatter pins its URL, and must be unique within its section. Without it, Hugo falls back to a title-derived value, and retitling a post would silently change its URL and break inter-content links. Both rules are checked in `layouts/partials/validate-content.html` and fail the build.
- **Heading-fragment citations are checked.** Cross-references such as
  `[Article IV](/governance/bylaws/#article-iv--officers)` rely on anchors Goldmark derives
  from the heading text, so retitling a heading would silently send them to the top of the
  page. The build fails when a `](/path#fragment)` link names an anchor the target page does
  not have.
- **`description:` feeds the link preview.** It renders as both `meta name="description"` and `og:description`. Every content file carries one; a page without one still builds, and simply publishes with no preview text. Nothing enforces it.
- **No taxonomies.** `notice_type` and `meeting_type` live in frontmatter and are queried directly in templates.
- **`<abbr>` tags** in content are intentional (e.g., for C&RBGC tooltips).

## Adding content

### A meeting notice

1. Create `content/notices/YYYY-MM-DD-slug.md` (date prefix is for editor sort order; the URL comes from the `slug:` field).
2. Required frontmatter:
   ```yaml
   ---
   title: "Notice of …"
   slug: notice-of-… # pins the URL; never change after publishing
   description: "…"
   date: 2026-06-01T09:00:00-05:00 # when posted
   meeting_date: 2026-06-15
   expires: 2026-06-16 # first day hidden — the day after meeting_date
   notice_type: annual-meeting # or special-meeting | previous-notice | bylaw-amendment
   authority: "Article V, Section 1" # the bylaw provision requiring this notice
   ---
   ```
3. **`expires` is the first day the notice is hidden**, not the last day it is shown. Set it to the day after `meeting_date` so the notice stays up through the meeting it announces; the build fails if `expires` does not fall after `meeting_date`. The notice's own page never shows the raw value — `notice-meta.html` renders the day before it, labelled **Shown through**, so the page agrees with the section split rather than reading a day late.
4. On and after `expires`, the notice moves under the "Expired" heading on the section page and drops off the homepage and `llms.txt`. The split is computed once in `layouts/partials/notices-by-status.html`; anything that lists notices must read from it rather than querying the section directly.

### Meeting minutes

1. Create `content/minutes/YYYY-MM-DD-slug.md`.
2. Required frontmatter:
   ```yaml
   ---
   title: "Minutes — …"
   slug: minutes-… # pins the URL; never change after publishing
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
4. **`approved` and `approved_on` move together.** The date identifies the meeting that
   adopted the record, so the build fails on `approved: true` with `approved_on` left empty.

### A news post

1. Create `content/news/YYYY-MM-DD-slug.md`.
2. Minimal frontmatter: `title`, `slug`, `description`, `date`. That's it.

### Amending bylaws or standing rules

1. Edit `content/governance/bylaws.md` or `content/governance/standing-rules.md`.
2. Bump `last_amended` in the frontmatter to the meeting date.
3. Record the vote in the meeting minutes per Article VIII, Section 4 of the Bylaws.

## Build and deploy

```bash
task serve   # hugo server -D --buildFuture (drafts + future posts visible)
task build   # hugo --minify --gc --panicOnWarning (production)
task format  # prettier (md/html/yaml/toml/json) + biome (css)
task check   # prettier --check + biome check — CI runs these same two commands
```

`--panicOnWarning` makes Hugo's warnings fail the build instead of advising. Note it does not catch a new section with no templates today: `layouts/_default/list.html` and `single.html` are deliberate fallbacks (#19) and answer the lookup, so no warning is raised. The flag is what would make that case loud if those fallbacks were ever removed.

Deployment is automated by `.github/workflows/pages.yml`: pushes to `main` build with Hugo and publish to GitHub Pages. The site serves from the custom domain via `CNAME`. Every push and pull request also runs the two `task check` commands and both Hugo passes, so an unformatted file or a lint error fails the PR rather than riding along; the formatter gate runs first, before either Hugo pass.

Dependencies are refreshed manually, roughly quarterly: `bun update && task check`, and verify the deploy. Hugo is not among them — it floats deliberately at both ends (`HUGO_VERSION: latest` in `pages.yml`, unpinned `brew "hugo"` in the `Brewfile`), so local and CI track the same upstream release and a breaking one shows up as a failed build rather than a version skew. No Dependabot/Renovate by choice — four devDependencies don't warrant the PR noise.

## License

See [LICENSE](./LICENSE).
