# C&RBGC Site Walkthrough

**

_2026-06-16T21:35:28Z by Showboat 0.6.1_

<!-- showboat-id: 849b6646-ec31-4c73-bdf8-bee4fba48cb0 -->

## What this is

A Hugo-built static site for **The Common & Recent Bogeymens Golf Club** (C&RBGC), a small parliamentary golf society that governs itself by _Robert's Rules of Order Newly Revised_. The site publishes the bylaws, standing rules, official notices, meeting minutes, and casual news at [crbgc.org](https://crbgc.org/).

The whole codebase is small — under a thousand lines of source — and the moving parts are:

- **Hugo** renders Markdown content through Go templates into static HTML.
- **GitHub Actions** rebuilds and redeploys on every push to `main` (and once a day on cron so future-dated content rolls in automatically).
- **Prettier + Biome** handle formatting and CSS linting; **Task** wraps the local commands.

The walkthrough below follows the data flow that a reader needs to understand the site:

1. Configuration — what Hugo is told to do.
2. Content — what the Markdown files look like and how their frontmatter is conventionalized.
3. Templates — how the base layout, section list/single pages, and partials compose the output.
4. Styles — the single CSS file and how it gets minified + fingerprinted.
5. Build pipeline — the Taskfile commands a maintainer runs locally.
6. Deploy pipeline — the GitHub Actions workflow that ships the site.

## Repository layout

A bird's-eye view of the source tree (excluding `node_modules/`, `public/`, `resources/`, and `.git/`):

```bash
find . -type f -not -path './node_modules/*' -not -path './public/*' -not -path './resources/*' -not -path './.git/*' -not -name '.hugo_build.lock' -not -name 'bun.lock' -not -name 'walkthrough.md' | sort
```

```output
./.claude/settings.json
./.claude/skills/new-minutes/SKILL.md
./.claude/skills/new-news/SKILL.md
./.claude/skills/new-notice/SKILL.md
./.github/workflows/claude.yml
./.github/workflows/pages.yml
./.gitignore
./.prettierrc.json
./assets/css/style.css
./biome.json
./Brewfile
./CLAUDE.md
./content/_index.md
./content/governance/_index.md
./content/governance/bylaws.md
./content/governance/officers.md
./content/governance/special-rules-of-order.md
./content/governance/standing-rules.md
./content/minutes/_index.md
./content/minutes/2026-06-21-annual-meeting.md
./content/news/_index.md
./content/news/2026-06-21-club-formally-established.md
./content/news/2026-08-17-commons-day.md
./content/news/2026-08-17-dew-sweeper-championship.md
./content/news/2026-08-17-zen-juice-appreciation-day.md
./content/notices/_index.md
./content/notices/2026-06-21-2027-annual-meeting.md
./hugo.toml
./layouts/_default/baseof.html
./layouts/_default/list.html
./layouts/_default/single.html
./layouts/404.html
./layouts/governance/list.html
./layouts/governance/single.html
./layouts/index.html
./layouts/index.llms.txt
./layouts/minutes/list.html
./layouts/minutes/single.html
./layouts/news/list.html
./layouts/news/single.html
./layouts/notices/list.html
./layouts/notices/single.html
./layouts/partials/governance-meta.html
./layouts/partials/item-row.html
./layouts/partials/latest.html
./layouts/partials/minutes-meta.html
./layouts/partials/notice-meta.html
./layouts/partials/notices-by-status.html
./LICENSE
./package.json
./README.md
./static/CNAME
./Taskfile.yml
./theory.md
```

Five directories carry meaning:

- **`content/`** — the Markdown corpus, organized into four sections (`governance/`, `notices/`, `minutes/`, `news/`) plus the homepage's `_index.md`. Each section has an `_index.md` that becomes the list page and zero or more posts.
- **`layouts/`** — Go templates. `_default/baseof.html` is the page chrome; `index.html` is the homepage; each section can override `list.html` and `single.html`; `partials/` holds reusable fragments.
- **`assets/css/style.css`** — the only stylesheet. Hugo pipes it through `minify | fingerprint` so the served URL has a content hash.
- **`static/CNAME`** — copied verbatim to the site root; tells GitHub Pages which custom domain to serve.
- **`.github/workflows/`** — `pages.yml` builds and deploys; `claude.yml` lets you `@claude` from issue comments.

## Configuration

Hugo reads `hugo.toml` at the repo root:

```bash
cat hugo.toml
```

```output
baseURL = "https://crbgc.org/"
title = "The Common & Recent Bogeymens Golf Club"
timeZone = "America/New_York"
enableRobotsTXT = true
disableKinds = ["taxonomy", "term"]

[languages.en]
locale = "en_US"
label = "English"
weight = 1

[markup.tableOfContents]
startLevel = 2
endLevel = 3

[permalinks]
notices = "/notices/:slug/"
minutes = "/minutes/:slug/"
news = "/news/:slug/"

[outputFormats.llms]
mediaType = "text/plain"
baseName = "llms"
isPlainText = true
notAlternative = true

[outputs]
home = ["html", "rss", "llms"]
```

Four non-obvious choices in this file:

- **Key placement** — `enableRobotsTXT`, `disableKinds`, and `timeZone` all sit in the root block, above `[languages.en]`. This is load-bearing, not cosmetic: keys written below a table header belong to that table in TOML, and while `hugo config` reports language-scoped keys at root for a single-language site, `enableRobotsTXT` was silently inert there — the site built no `robots.txt` at all until the key was moved (issue #49).
- **`disableKinds = ["taxonomy", "term"]`** — Hugo's tag/category system is turned off. The site uses frontmatter fields like `notice_type` and `meeting_type` directly in templates instead. No `/tags/` or `/categories/` pages will be generated.
- **`timeZone = "America/New_York"`** — Bare dates in frontmatter (`expires`, `meeting_date`, `adopted`, `last_amended`) carry no offset, so without this they would parse as UTC midnight while the rest of the content model assumes US Eastern. The notices list compares `expires` against `now`, so this pins that boundary to Eastern midnight and makes the current/expired split identical locally and in CI.
- **`[permalinks]`** — Three sections get an explicit `:slug` permalink so their URLs look like `/notices/foo/` instead of `/notices/2026-06-21-foo/`. The `:slug` is the explicit `slug:` field that every dated post pins in its frontmatter (the dated filename is only for editor sort order); a post that omits `slug:` falls back to a title-derived slug. `governance` is intentionally omitted because those pages aren't dated.

## Content model

Each section under `content/` follows the same pattern: an `_index.md` for the section landing page plus dated post files. The frontmatter shape varies by section — here are the four conventions.

### Governance — bylaws and standing rules

Weight-ordered, undated, with constitutional metadata:

```bash
awk 'f<2{print} /^---$/{f++}' content/governance/bylaws.md
```

```output
---
title: "Bylaws"
description: "Bylaws of the Common & Recent Bogeymens Golf Club, adopted June 21, 2026."
weight: 10
adopted: 2026-06-21
last_amended: 2026-06-21
---
```

`weight` orders the governance list (lower first); `adopted` and `last_amended` are currently captured but unrendered ([issue #16](https://github.com/philoserf/crbgc/issues/16) tracks the fix).

### Notices — RONR-required notifications

Date-driven with an explicit slug, an expiration window, and a constitutional authority reference:

```bash
awk 'f<2{print} /^---$/{f++}' content/notices/2026-06-21-2027-annual-meeting.md
```

```output
---
title: "Notice of 2027 Annual Meeting"
slug: notice-of-2027-annual-meeting
description: "The 2027 Annual Meeting will be held on the Summer Solstice, Monday, June 21, 2027, at Forest Dunes Golf Club, Roscommon, Michigan."
date: 2026-06-21T19:10:00-04:00
meeting_date: 2027-06-21
expires: 2027-06-22
notice_type: annual-meeting
authority: "Article V, Section 1"
---
```

Notice files use these fields:

- `slug` — the pinned URL segment; never change it on a published notice or inbound links break.
- `date` — when the notice was posted (the byline date).
- `meeting_date` — the date of the meeting being noticed.
- `expires` — after this date, the list template moves the notice into a collapsed "Expired" section.
- `notice_type` — one of `annual-meeting`, `special-meeting`, `previous-notice`, `bylaw-amendment` (queried directly in templates, no taxonomies).
- `authority` — the bylaw provision that requires the notice (e.g., "Article V, Section 1").

### Minutes — meeting records

Frontmatter records the parliamentary essentials; the badge on the list page comes from `approved`:

```bash
awk 'f<2{print} /^---$/{f++}' content/minutes/2026-06-21-annual-meeting.md
```

```output
---
title: "Minutes — 2026 Annual Meeting"
slug: minutes-2026-annual-meeting
description: "Minutes of the 2026 Annual Meeting, June 21, 2026."
date: 2026-06-21T19:00:00-04:00
meeting_type: annual
approved: false
approved_on:
presiding: "Mark Ayers, Captain"
secretary: "Dean Chase, Secretary-Treasurer"
present: ["Mark Ayers", "Dean Chase"]
absent: []
---
```

`approved: false` flips to `true` (and `approved_on` gets a date) when the next meeting accepts the minutes. The template uses this to render an **Approved** or **Draft** badge next to the title in the list view.

### News — casual posts

Minimal frontmatter — `title`, `slug`, `description`, `date`:

```bash
awk 'f<2{print} /^---$/{f++}' content/news/2026-06-21-club-formally-established.md
```

```output
---
title: "From a Standing Game to a Standing Club"
slug: club-formally-established
description: "On the Summer Solstice, the C&RBGC adopted its Bylaws and Standing Rules, elected officers, and took its place on the web."
date: 2026-06-21T20:00:00-04:00
---
```

Note the `-04:00` offset on dated posts. That's US Eastern in summer (EDT); winter posts use `-05:00` (EST). Wrong offsets push the post's effective publish time outside the build window and can hide the post from production until the next daily rebuild.

## Templates — the rendering pipeline

Every page renders through `_default/baseof.html`, which holds the chrome (doctype, head, header, footer) and defines a `main` block that section templates fill in.

```bash
cat layouts/_default/baseof.html
```

```output
<!doctype html>
<html lang="{{ .Site.Language.Lang }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>
      {{ if .IsHome }}
        {{ .Site.Title }}
      {{ else }}
        {{ .Title }} &middot;
        {{ .Site.Title }}
      {{ end }}
    </title>
    {{ with .Description }}
      <meta name="description" content="{{ . }}" />
    {{ end }}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Nata+Sans:wght@400;500;700&display=swap"
    />
    {{ $style := resources.Get "css/style.css" | minify | fingerprint }}
    <link
      rel="stylesheet"
      href="{{ $style.RelPermalink }}"
      integrity="{{ $style.Data.Integrity }}"
    />
  </head>
  <body>
    <header>
      <a href="{{ "/" | relURL }}" class="site-title">{{ .Site.Title }}</a>
      {{ $section := .Section }}
      <nav class="site-nav">
        <a
          href="{{ "/notices/" | relURL }}"
          {{ if eq $section "notices" }}aria-current="page"{{ end }}
          >Notices</a
        >
        <a
          href="{{ "/minutes/" | relURL }}"
          {{ if eq $section "minutes" }}aria-current="page"{{ end }}
          >Minutes</a
        >
        <a
          href="{{ "/news/" | relURL }}"
          {{ if eq $section "news" }}aria-current="page"{{ end }}
          >News</a
        >
        <a
          href="{{ "/governance/" | relURL }}"
          {{ if eq $section "governance" }}aria-current="page"{{ end }}
          >Governance</a
        >
      </nav>
    </header>
    <main>
      {{ block "main" . }}{{ end }}
    </main>
    <footer>
      <p>
        &copy;
        2022&ndash;{{ now.Year }}
        C&amp;RBGC. All rights reserved.
      </p>
    </footer>
  </body>
</html>
```

Three details worth pointing at:

- **Title strategy** — the homepage gets just the site title; every other page is `<page title> · <site title>`.
- **CSS pipeline** — `resources.Get "css/style.css" | minify | fingerprint` reads the file from `assets/`, minifies it, and renames it with a content hash. The `integrity` attribute uses the same hash for SRI. New CSS = new URL = cache bust.
- **Navigation** — four fixed links in the header, each carrying `aria-current="page"` when `.Section` matches it, so the current section is announced to screen readers and underlined for everyone else (issue #40). `.Section` covers a section's single pages too, so `/governance/bylaws/` marks Governance; it is empty on the homepage and 404, which correctly marks nothing. The four links stay hand-written — their order is editorial, and Hugo sections carry no ordering metadata to derive it from.
- **No h1 in the chrome** — the homepage renders no h1 at all by design (the section pages emit their own from the template).

### Homepage

`layouts/index.html` overrides only the `main` block. It renders the intro from `content/_index.md` plus three section previews. Every one of the three is derived from content — the governance list ranges `.Pages.ByWeight` rather than naming the four documents by hand, so adding or reordering a governance document updates the homepage automatically (issue #35):

```bash
cat layouts/index.html
```

```output
{{ define "main" }}
  <article>
    {{ .Content }}
  </article>

  <section>
    <h2>Latest notices</h2>
    {{ partial "latest.html" (dict "section" "notices" "limit" 3) }}
    <p><a href="{{ "/notices/" | relURL }}">All notices &rarr;</a></p>
  </section>

  <section>
    <h2>Latest news</h2>
    {{ partial "latest.html" (dict "section" "news" "limit" 5) }}
    <p><a href="{{ "/news/" | relURL }}">All news &rarr;</a></p>
  </section>

  <section>
    <h2>Governance</h2>
    {{ with site.GetPage "/governance" }}
      <ul class="doc-list">
        {{ range .Pages.ByWeight }}
          <li><a href="{{ .RelPermalink }}">{{ .Title }}</a></li>
        {{ end }}
      </ul>
    {{ end }}
  </section>
{{ end }}
```

The homepage delegates two of its three sections to the `latest` partial, parameterized by section name and limit. The third (governance) is a hand-curated link list because those pages are stable and shouldn't surface by recency.

### The `latest` partial

This is the only cross-section query in the codebase:

```bash
cat layouts/partials/latest.html
```

```output
{{/* Notices are filtered through notices-by-status.html rather than queried
  directly. Unlike item-row's badge — a presentation choice the caller makes —
  hiding expired notices is a correctness invariant that no caller should be
  able to forget (issue #36).
*/}}
{{ $section := .section }}
{{ $limit := .limit }}
{{ $items := "" }}
{{ if eq $section "notices" }}
  {{ $items = (partial "notices-by-status.html").current }}
{{ else }}
  {{ $items = (where site.RegularPages "Section" $section).ByDate.Reverse }}
{{ end }}
{{ $items = first $limit $items }}
{{ if $items }}
  <ul class="item-list">
    {{ range $items }}{{ partial "item-row.html" (dict "page" .) }}{{ end }}
  </ul>
{{ else }}
  <p class="muted">Nothing yet.</p>
{{ end }}
```

The partial accepts a dict `(dict "section" "notices" "limit" 3)` and takes the first N items of that section, newest first. Notices are the exception: rather than querying `site.RegularPages`, it reads the current half of `notices-by-status.html`, so an expired notice can never surface as "latest" (issue #36). That asymmetry is deliberate — where `item-row.html` takes an explicit `badge` parameter because a badge is a presentation choice the caller makes, hiding expired notices is a correctness invariant no caller should be able to forget. Each item rows through `item-row.html`:

```bash
cat layouts/partials/item-row.html
```

```output
{{ $p := .page }}
<li>
  <a href="{{ $p.RelPermalink }}">{{ $p.Title }}</a>
  {{ if .badge }}
    {{ if $p.Params.approved }}
      <span class="badge approved">Approved</span>
    {{ else }}
      <span class="badge draft">Draft</span>
    {{ end }}
  {{ end }}
  <span class="item-date">{{ $p.Date.Format "January 2, 2006" }}</span>
  {{ with $p.Description }}
    <p class="item-desc">{{ . }}</p>
  {{ end }}
</li>
```

`item-row.html` is reused by every list page so the styling stays consistent: title link, optional badge, formatted date, optional description. It takes a dict rather than a page — `(dict "page" .)` from the notices, news, and homepage lists, and `(dict "page" . "badge" true)` from the minutes list, which is the only caller that wants the Approved/Draft badge. The `with` block silently elides the `<p>` if no description is set.

### Section list templates

Each section overrides `list.html` to add its own semantics. The **notices** list splits current vs. expired:

```bash
cat layouts/notices/list.html
```

```output
{{ define "main" }}
  {{ $n := partial "notices-by-status.html" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
    {{ if $n.current }}
      <ul class="item-list">
        {{ range $n.current }}
          {{ partial "item-row.html" (dict "page" .) }}
        {{ end }}
      </ul>
    {{ else }}
      <p class="muted">No current notices.</p>
    {{ end }}
    {{ if $n.expired }}
      <h2>Expired</h2>
      <ul class="item-list expired">
        {{ range $n.expired }}
          {{ partial "item-row.html" (dict "page" .) }}
        {{ end }}
      </ul>
    {{ end }}
  </article>
{{ end }}
```

The two slices come from `notices-by-status.html`, a returning partial that compares each notice's `expires` field to `now` and hands back `(dict "current" ... "expired" ...)`. Unlike every other partial in the tree, it renders nothing:

```bash
cat layouts/partials/notices-by-status.html
```

```output
{{/* Returns (dict "current" ... "expired" ...) — the notices section split on
  `expires` against now. Renders nothing. Every surface that lists notices must
  go through this; a listing that re-derives "recent notices" on its own will
  silently drift back into showing expired ones (issues #36, #38).
*/}}
{{- $now := now -}}
{{- $current := slice -}}
{{- $expired := slice -}}
{{- with site.GetPage "/notices" -}}
  {{- range .RegularPages.ByDate.Reverse -}}
    {{- if and .Params.expires (lt (time .Params.expires) $now) -}}
      {{- $expired = $expired | append . -}}
    {{- else -}}
      {{- $current = $current | append . -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- return dict "current" $current "expired" $expired -}}
```

It takes no context — it always operates on the whole notices section via `site.GetPage`, and returns both halves already sorted newest-first, so callers only need `first N`. The list template handles three states: only current, both, and only expired (the empty-current case shows a "No current notices" message). Keeping the split in one partial is what stops the homepage and `llms.txt` from drifting into their own naive "recent notices" queries, which is exactly how issues #36 and #38 arose.

The **minutes** list groups by year and badges each entry as Approved or Draft:

```bash
cat layouts/minutes/list.html
```

```output
{{ define "main" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
    {{ range (.Pages.GroupByDate "2006").Reverse }}
      <h2>{{ .Key }}</h2>
      <ul class="item-list">
        {{ range .Pages.ByDate.Reverse }}
          {{ partial "item-row.html" (dict "page" . "badge" true) }}
        {{ end }}
      </ul>
    {{ end }}
  </article>
{{ end }}
```

The `(.Pages.GroupByDate "2006").Reverse` chain yields year-grouped slices in descending order, and within each year the posts are again date-reversed. Rows go through the shared `item-row.html` with `"badge" true`, so minutes entries show the meeting date and description like every other list, plus the Approved/Draft badge whose CSS classes are defined in the stylesheet.

The **governance** list orders by `weight` and shows the description inline:

```bash
cat layouts/governance/list.html
```

```output
{{ define "main" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
    <ul class="doc-list">
      {{ range .Pages.ByWeight }}
        <li>
          <a href="{{ .RelPermalink }}">{{ .Title }}</a>
          {{ with .Description }}
            <span class="doc-desc">— {{ . }}</span>
          {{ end }}
        </li>
      {{ end }}
    </ul>
  </article>
{{ end }}
```

The **news** list is the simplest — just date-ordered rows through the shared `item-row.html` partial:

```bash
cat layouts/news/list.html
```

```output
{{ define "main" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
    <ul class="item-list">
      {{ range .Pages.ByDate.Reverse }}
        {{ partial "item-row.html" (dict "page" .) }}
      {{ end }}
    </ul>
  </article>
{{ end }}
```

### Section single templates

Notices and minutes need richer metadata than the default single template provides, so each has its own that prepends a meta partial before the body. The pattern:

```bash
cat layouts/notices/single.html layouts/minutes/single.html
```

```output
{{ define "main" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ partial "notice-meta.html" . }}
    {{ .Content }}
  </article>
{{ end }}
{{ define "main" }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ partial "minutes-meta.html" . }}
    {{ .Content }}
  </article>
{{ end }}
```

`notice-meta.html` renders the constitutional context — posted date, notice type, meeting date, the bylaw authority, and the expiration date that drives the current/expired split on the list page. The type is stored hyphenated (`annual-meeting`), so it is un-hyphenated before `title`-casing:

```bash
cat layouts/partials/notice-meta.html
```

```output
<dl class="meta">
  <dt>Posted</dt>
  <dd>{{ .Date.Format "January 2, 2006" }}</dd>
  {{ with .Params.notice_type }}
    <dt>Type</dt>
    <dd>{{ title (replace . "-" " ") }}</dd>
  {{ end }}
  {{ with .Params.meeting_date }}
    <dt>Meeting</dt>
    <dd>{{ (time .).Format "January 2, 2006" }}</dd>
  {{ end }}
  {{ with .Params.authority }}
    <dt>Required by</dt>
    <dd>{{ . }}</dd>
  {{ end }}
  {{ with .Params.expires }}
    <dt>Expires</dt>
    <dd>{{ (time .).Format "January 2, 2006" }}</dd>
  {{ end }}
</dl>
```

`minutes-meta.html` is more elaborate — meeting type, approval status, presiding officer, secretary, and the present/absent rolls:

```bash
cat layouts/partials/minutes-meta.html
```

```output
<dl class="meta">
  <dt>Meeting date</dt>
  <dd>{{ .Date.Format "January 2, 2006" }}</dd>
  {{ with .Params.meeting_type }}
    <dt>Type</dt>
    <dd>{{ title . }}</dd>
  {{ end }}
  <dt>Status</dt>
  <dd>
    {{ if .Params.approved }}
      Approved{{ with .Params.approved_on }}
        {{ (time
          .).Format "January 2, 2006"
        }}
      {{ end }}
    {{ else }}
      Draft
    {{ end }}
  </dd>
  {{ with .Params.presiding }}
    <dt>Presiding</dt>
    <dd>{{ . }}</dd>
  {{ end }}
  {{ with .Params.secretary }}
    <dt>Secretary</dt>
    <dd>{{ . }}</dd>
  {{ end }}
  {{ with .Params.present }}
    <dt>Present</dt>
    <dd>{{ delimit . ", " }}</dd>
  {{ end }}
  {{ with .Params.absent }}
    <dt>Absent</dt>
    <dd>{{ delimit . ", " }}</dd>
  {{ end }}
</dl>
```

Both partials wrap their fields in `with` blocks so missing values silently disappear — there's no "Presiding: " with a blank value. The `delimit` builtin turns YAML lists into comma-separated strings.

Every section now ships its own single template — governance and news included, the latter being a plain `<h1>`, a `<time>` line, and the body. `layouts/_default/single.html` is therefore an unreached fallback, kept (and commented as such, like its `list.html` sibling) so a future section renders sensibly before it gets a bespoke template. And there's a custom 404:

```bash
cat layouts/404.html
```

```output
{{ define "main" }}
  <article>
    <h1>Out of Bounds</h1>
    <p>
      That page is not in play.
      <a href="{{ "/" | relURL }}">Return to the clubhouse</a>.
    </p>
  </article>
{{ end }}
```

## Styles

A single ~320-line stylesheet defines the whole look. Custom properties drive the palette and measure:

```bash
sed -n '1,8p' assets/css/style.css
```

```output
/* Matches the stock Flowershow "letterpress" theme used by the notes site
   (crbgc-philoserf.flowershow.me): Nata Sans body, Fraunces serif headings at
   normal weight, a white / near-black palette with oklch-derived grays, and the
   theme's link / blockquote / rule / code treatments. Tokens mirror the theme's
   light-mode values so the two sites read as one. */

:root {
  /* Letterpress palette — light mode */
```

Green accent for a golf club. `--measure: 38rem` constrains the readable column width and is applied to `header`, `main`, and `footer`.

The badge classes that the minutes list uses:

```bash
sed -n '210,230p' assets/css/style.css
```

```output
footer a {
  color: var(--muted);
}

nav.site-nav {
  margin-top: 0.75rem;
  font-size: 0.9375rem;
}

nav.site-nav a {
  color: var(--muted);
  text-decoration: none;
  margin-right: 1.25rem;
}

nav.site-nav a:hover {
  color: var(--accent);
}

ul.item-list,
ul.doc-list {
```

## Build pipeline

The Taskfile wraps every recurring command:

```bash
cat Taskfile.yml
```

```output
version: "3"

tasks:
  setup:
    desc: Install the toolchain (Brewfile) and JS dependencies
    cmds:
      - brew bundle --file=Brewfile
      - bun install

  prettier:
    desc: Format markdown, HTML/Hugo, YAML, TOML, and JSON with Prettier
    cmds:
      # Run twice: prettier-plugin-go-template can need a second pass to converge.
      - bunx prettier --write '**/*.{md,html,yml,yaml,toml,json}'
      - bunx prettier --write '**/*.{md,html,yml,yaml,toml,json}'

  prettier:check:
    desc: Check Prettier-managed files without writing
    cmds:
      - bunx prettier --check '**/*.{md,html,yml,yaml,toml,json}'

  biome:
    desc: Format and lint CSS with Biome
    cmds:
      - bunx biome check --write assets

  biome:check:
    desc: Check CSS with Biome without writing
    cmds:
      - bunx biome check assets

  format:
    desc: Format and fix all files
    cmds:
      - task: prettier
      - task: biome

  check:
    desc: Check all files without changing them
    cmds:
      - task: prettier:check
      - task: biome:check

  serve:
    desc: Run Hugo dev server with drafts and future-dated content
    cmds:
      - hugo server -D --buildFuture

  build:
    desc: Build the site to ./public
    cmds:
      - hugo --minify --gc
```

Two things stand out:

- **Prettier runs twice.** `prettier-plugin-go-template` (still at `0.0.x`) sometimes needs a second pass to converge on the Hugo template files. [Issue #18](https://github.com/philoserf/crbgc/issues/18) tracks the upstream watch.
- **Format/lint split.** Prettier handles Markdown, HTML/Hugo, YAML, TOML, and JSON. CSS goes to Biome instead — both formats and lints in one call. The split is in `biome.json`:

```bash
cat biome.json
```

```output
{
  "$schema": "https://biomejs.dev/schemas/2.5.8/schema.json",
  "files": {
    "includes": ["assets/**/*.css"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  }
}
```

And Prettier's Go-template parser configuration:

```bash
cat .prettierrc.json
```

```output
{
  "plugins": ["prettier-plugin-go-template", "prettier-plugin-toml"],
  "overrides": [
    {
      "files": ["*.html"],
      "options": {
        "parser": "go-template",
        "goTemplateBracketSpacing": true
      }
    }
  ]
}
```

The `*.html` override tells Prettier to use the `go-template` parser (provided by the plugin) for templates that aren't strictly HTML.

The Bun side of the dependency list is tiny:

```bash
cat package.json
```

```output
{
  "name": "crbgc",
  "private": true,
  "devDependencies": {
    "@biomejs/biome": "^2.5.11",
    "prettier": "^3.9.6",
    "prettier-plugin-go-template": "^0.0.15",
    "prettier-plugin-toml": "^2.0.6"
  }
}
```

## Deploy pipeline

GitHub Actions handles all production deploys via `.github/workflows/pages.yml`:

```bash
sed -n '1,25p' .github/workflows/pages.yml
```

```output
name: Pages

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    # Daily at 06:07 UTC — 02:07 EDT in summer, 01:07 EST in winter (UTC has
    # no DST). Either way it's after local midnight, so future-dated content
    # rolls in same-day. Offset from the hour to avoid the cron surge.
    - cron: "7 6 * * *"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

env:
  HUGO_VERSION: 0.161.1

jobs:
  build:
```

Four triggers — push to main, pull requests (build-only, no deploy), a daily cron, and manual dispatch. The cron exists so that future-dated content (events announced with a `date:` in the future) rolls into production after that date passes. The Hugo version is pinned via `HUGO_VERSION`.

The build job:

```bash
sed -n '24,49p' .github/workflows/pages.yml
```

```output
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Install Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ env.HUGO_VERSION }}
          extended: true

      - name: Configure Pages
        if: github.event_name != 'pull_request'
        uses: actions/configure-pages@v6

      - name: Build
        run: hugo --minify --gc

      - name: Upload artifact
        if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./public

```

The Hugo build runs the same `hugo --minify --gc` that `task build` runs locally. The artifact is only uploaded when it's not a pull-request event — PRs validate the build without producing a deployable artifact. The deploy job:

```bash
sed -n '51,65p' .github/workflows/pages.yml
```

```output
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Deploy only runs from `main`, never from PRs or other branches. The `github-pages` environment with `pages: write` and `id-token: write` permissions is what GitHub Pages requires for the OIDC-based artifact handoff.

`static/CNAME` ships in the build to tell Pages which custom domain to serve:

```bash
cat static/CNAME
```

```output
crbgc.org
```

## End-to-end flow

Putting it together, here's what happens when you push a new news post to `main`:

1. `pages.yml` triggers on push, checks out the repo, installs the pinned Hugo, runs `hugo --minify --gc`.
2. Hugo reads `hugo.toml`, walks `content/`, and for each `.md` file picks the section's `single.html` template — every section has one, so the `_default/` pair is a fallback for sections that don't exist yet. Lists use the section's `list.html`; the homepage uses `layouts/index.html`.
3. Every page renders inside `_default/baseof.html`, which pipes `assets/css/style.css` through `minify | fingerprint` and emits the SRI-protected link.
4. Markdown content becomes the `.Content` interior; frontmatter populates the meta partials and the badge classes.
5. The built `public/` is uploaded as a Pages artifact; the deploy job hands it to GitHub Pages, which serves it from `crbgc.org` (via the `CNAME`).

For local development, `task serve` runs `hugo server -D --buildFuture` so drafts and future-dated content are visible. `task format` keeps the source clean before committing — the only enforcement of that convention is the maintainer, not a hook.

## Where to look next

- **Adding content** — `README.md` documents each section's required frontmatter with copy-paste templates, including the explicit `slug:` every dated post pins.
- **Project conventions** — `CLAUDE.md` summarizes structure and commands for collaborators (human or AI).
