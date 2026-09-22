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
  notes/                          # essays, history, course architecture — the informal side
layouts/                          # Hugo templates and partials
assets/css/style.css              # site styles (Biome-managed)
static/                           # served at the root: CNAME, the seal, favicons, the Open Graph card
hugo.toml                         # config: permalinks, disabled kinds, locale
```

Each section under `content/` has an `_index.md` (the list page) and dated posts. Feeds: `/index.xml` is the site feed, rendered by `layouts/home.rss.xml` — every dated post, newest first, and nothing atemporal. `news` and `minutes` keep Hugo's built-in section feed. `governance` emits no feed (the documents carry no dates) and neither does `notices` (a feed cannot both be an archive and hide expired notices, so the surface was dropped rather than made wrong); both set `outputs: ["html"]` in their `_index.md`. A feed is an archive — items are never removed from one. `notes` sets it too, for a third reason: the site feed already carries every note, so a section feed would be almost entirely a duplicate of it.

The homepage is curated, not a mirror of the nav. The nav carries five sections; the front page lists the latest notices, the latest news, and the governance documents — no Minutes and no Notes, by choice.

## Conventions

- **YAML frontmatter** across all content. TOML is only used in `hugo.toml`.
- **Prettier** formats Markdown, HTML/Hugo templates, YAML, TOML, and JSON. **Biome** formats and lints CSS. Run `task format` before committing.
- **`layouts/index.llms.txt` is deliberately unformatted.** It is a plain-text template where whitespace is the output, and Prettier's `go-template` parser treats it as HTML — it splits Markdown headings from their text and collapses list items into a broken feed. It is excluded because the `task prettier` glob covers only `.{md,html,yml,yaml,toml,json}`; the exclusion cannot go in `.prettierignore`, which is a symlink to `.gitignore`, so an entry there would also stop git tracking the file. **Do not widen the glob.** Edit it by hand and check the rendered `/llms.txt`.
- **The title is the filename is the URL** — in the four dated sections. Hugo normalizes the title (lowercased, punctuation dropped, spaces to hyphens) into the URL segment; the filename is that same string, with no date prefix. No content file carries a `slug:`. `layouts/partials/validate-content.html` fails the build when a filename and its URL segment disagree, and when two posts in a section would claim the same URL.
- **`governance` is deliberately exempt.** It is absent from `[permalinks]`, so a governance URL comes from its filename and a retitle cannot move it — which is what keeps the site's most heavily cited documents citable. The build checks those the other way round: the normalized title must match the filename, so a retitle that skips the rename still fails rather than orphaning the page from its own name.
- **Adding a section means adding it to the `validate-content.html` loop.** Nothing prompts that step, and a section left out of the loop gets none of these checks.
- **Retitling a published post changes its URL.** Rename the file to match and list the old path under `aliases:`, which Hugo publishes as a redirect. Note that Hugo drops `&` entirely — "Dream Golf & Cabot" would give `dream-golf-cabot`, so write "and" in the title when you want it in the URL.
- **Heading-fragment citations are checked.** Cross-references such as
  `[Article IV](/governance/bylaws/#article-iv--officers)` rely on anchors Goldmark derives
  from the heading text, so retitling a heading would silently send them to the top of the
  page. The build fails when a `](/path#fragment)` link names an anchor the target page does
  not have.
- **`description:` feeds the link preview.** It renders as both `meta name="description"` and `og:description`. Every content file carries one; a page without one still builds, and simply publishes with no preview text. Nothing enforces it.
- **No taxonomies.** `notice_type` and `meeting_type` live in frontmatter and are queried directly in templates.
- **No `tags:`, no `lastmod:`.** With taxonomy and term pages disabled, tags rendered nowhere and reached no feed. `lastmod:` fed only the feed's `lastBuildDate`, which is also gone — `layouts/home.rss.xml` explains why and what restoring it would cost. Content frontmatter is `title`, `description`, `date`, plus the fields its own section needs.
- **`<abbr>` tags** in content are intentional (e.g., for C&RBGC tooltips).
- **The icons and the link-preview card are generated — `task icons`.** Two files are the sources and are the ones that task does not rebuild: `static/seal.svg`, the Club's seal, and `static/favicon.svg`. Both carry traced outlines rather than `<text>` — the seal's ring is Copperplate, and both centre on the same traced New York ampersand, the `&` from the Club's own name, so the favicon is literally the seal's middle. They are outlines on purpose: the site renders body text in the reader's own system serif by design, but a mark should look the same everywhere, and the seal's ring text would over- or under-run its arc under a substitute face. Retracing needs a WebKit render plus `potrace`; everything downstream needs only ImageMagick.
- **`favicon.ico` earns its place next to `favicon.svg`.** Browsers take the SVG, but scrapers, feed readers and chat clients request `/favicon.ico` unconditionally, whatever the markup says. Every icon has an opaque white ground: a `#09090b` mark on transparency vanishes into dark browser chrome, and iOS fills a transparent touch icon with black.
- **One Open Graph card for the whole site.** `static/og-image.png` is the seal over the Club's name, and carries nothing page-specific, so it never goes stale and never disagrees with the page it fronts — `og:title` and `og:description` already carry that. `og:image` must be absolute, so the template builds it with `absURL`.
- **The seal in the header is an `<img>`, never inlined.** Inline SVG would ship the seal's traced path data on every page. It is decorative there — `alt=""`, with the title text beside it carrying the accessible name — and has explicit `width`/`height` so the header does not shift as it loads. Below roughly 30rem the seal keeps its size and only the text wraps.

## Adding content

### A meeting notice

1. Create `content/notices/<normalized title>.md` (the filename and the URL are both the normalized title).
2. Required frontmatter:
   ```yaml
   ---
   title: "Notice of …"
   description: "…"
   date: 2026-06-01 # when posted
   meeting_date: 2026-06-15
   expires: 2026-06-16 # first day hidden — the day after meeting_date
   notice_type: annual-meeting # or special-meeting | previous-notice | bylaw-amendment — the build fails on anything else
   ---
   ```
3. **`expires` is the first day the notice is hidden**, not the last day it is shown. Set it to the day after `meeting_date` so the notice stays up through the meeting it announces; the build fails if `expires` does not fall after `meeting_date`, and fails too if a notice carries a `meeting_date` without one — a meeting notice must stop being current after its meeting. A notice with neither field never expires, which is how a notice of motion or a standing notice is written. The notice's own page never shows the raw value — `notice-meta.html` renders the day before it, labelled **Shown through**, so the page agrees with the section split rather than reading a day late.
4. On and after `expires`, the notice moves under the "Expired" heading on the section page and drops off the homepage and `llms.txt`. The split is computed once in `layouts/partials/notices-by-status.html`; anything that lists notices must read from it rather than querying the section directly (the site feed is the documented exception — see Feeds above).

### Meeting minutes

1. Create `content/minutes/<normalized title>.md`.
2. Required frontmatter:
   ```yaml
   ---
   title: "Minutes — …"
   description: "…"
   date: 2026-06-15 # the meeting date
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

1. Create `content/news/<normalized title>.md`.
2. Minimal frontmatter: `title`, `description`, `date`. That's it.

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

- **Code / config**: [MIT](./LICENSE).
- **Content**: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) © 2022–2026 C&RBGC. See [CONTENT-LICENSE.md](./CONTENT-LICENSE.md).
