# C&RBGC Site Walkthrough

_2026-05-26T14:58:11Z by Showboat 0.6.1_

<!-- showboat-id: 33289786-2edd-4983-a2cb-2d839099940d -->

## What this is

A Hugo-built static site for **The Common & Recent Bogey Golf Club** (C&RBGC), a small parliamentary golf society that governs itself by _Robert's Rules of Order Newly Revised_. The site publishes the bylaws, standing rules, official notices, meeting minutes, and casual news at [crbgc.org](https://crbgc.org/).

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
./.github/settings.yml
./.github/workflows/claude.yml
./.github/workflows/pages.yml
./.gitignore
./.prettierrc.json
./assets/css/style.css
./biome.json
./CLAUDE.md
./content/_index.md
./content/governance/_index.md
./content/governance/bylaws.md
./content/governance/officers.md
./content/governance/special-rules-of-order.md
./content/governance/standing-rules.md
./content/minutes/_index.md
./content/minutes/2026-05-25-annual-meeting.md
./content/news/_index.md
./content/news/2026-05-25-annual-meeting-held.md
./content/news/2026-05-25-dew-sweeper-championship-2026.md
./content/news/2026-05-25-website-launch.md
./content/news/2026-05-25-zen-juice-appreciation-day-2026.md
./content/notices/_index.md
./content/notices/2026-05-25-2027-annual-meeting.md
./hugo.toml
./layouts/_default/baseof.html
./layouts/_default/list.html
./layouts/_default/single.html
./layouts/404.html
./layouts/governance/list.html
./layouts/index.html
./layouts/minutes/list.html
./layouts/minutes/single.html
./layouts/news/list.html
./layouts/notices/list.html
./layouts/notices/single.html
./layouts/partials/item-row.html
./layouts/partials/latest.html
./layouts/partials/minutes-meta.html
./layouts/partials/notice-meta.html
./LICENSE
./package.json
./README.md
./static/CNAME
./Taskfile.yml
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
title = "The Common & Recent Bogey Golf Club"

[languages.en]
locale = "en_US"
label = "English"
weight = 1

enableRobotsTXT = true
disableKinds = ["taxonomy", "term"]

[markup.tableOfContents]
startLevel = 2
endLevel = 3

[permalinks]
notices = "/notices/:slug/"
minutes = "/minutes/:slug/"
news = "/news/:slug/"
```

Two non-obvious choices in this file:

- **`disableKinds = ["taxonomy", "term"]`** — Hugo's tag/category system is turned off. The site uses frontmatter fields like `notice_type` and `meeting_type` directly in templates instead. No `/tags/` or `/categories/` pages will be generated.
- **`[permalinks]`** — Three sections get an explicit `:slug` permalink so their URLs look like `/notices/foo/` instead of `/notices/2026-05-25-foo/`. Hugo strips the `YYYY-MM-DD-` filename prefix and falls back to a title-derived slug. `governance` is intentionally omitted because those pages aren't dated.

## Content model

Each section under `content/` follows the same pattern: an `_index.md` for the section landing page plus dated post files. The frontmatter shape varies by section — here are the four conventions.

### Governance — bylaws and standing rules

Weight-ordered, undated, with constitutional metadata:

```bash
sed -n '1,8p' content/governance/bylaws.md
```

```output
---
title: "Bylaws"
description: "Bylaws of the Common & Recent Bogey Golf Club, adopted May 25, 2026."
weight: 10
adopted: 2026-05-25
last_amended: 2026-05-25
---

```

`weight` orders the governance list (lower first); `adopted` and `last_amended` are currently captured but unrendered ([issue #16](https://github.com/philoserf/crbgc/issues/16) tracks the fix).

### Notices — RONR-required notifications

Date-driven with an expiration window and a constitutional authority reference:

```bash
sed -n '1,9p' content/notices/2026-05-25-2027-annual-meeting.md
```

```output
---
title: "Notice of 2027 Annual Meeting"
description: "The 2027 Annual Meeting will be held on the Summer Solstice, Monday, June 21, 2027."
date: 2026-05-25T19:10:00-04:00
meeting_date: 2027-06-21
expires: 2027-06-22
notice_type: annual-meeting
authority: "Article V, Section 1"
---
```

Notice files use these fields:

- `date` — when the notice was posted (the byline date).
- `meeting_date` — the date of the meeting being noticed.
- `expires` — after this date, the list template moves the notice into a collapsed "Expired" section.
- `notice_type` — one of `annual-meeting`, `special-meeting`, `previous-notice`, `bylaw-amendment` (queried directly in templates, no taxonomies).
- `authority` — the bylaw provision that requires the notice (e.g., "Article V, Section 1").

### Minutes — meeting records

Frontmatter records the parliamentary essentials; the badge on the list page comes from `approved`:

```bash
sed -n '1,12p' content/minutes/2026-05-25-annual-meeting.md
```

```output
---
title: "Minutes — 2026 Annual Meeting"
description: "Minutes of the 2026 Annual Meeting, May 25, 2026."
date: 2026-05-25T19:00:00-04:00
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

Minimal frontmatter — just `title`, `description`, `date`:

```bash
sed -n '1,5p' content/news/2026-05-25-website-launch.md
```

```output
---
title: "Club Website Launches"
description: "The C&RBGC now has a proper home on the web."
date: 2026-05-25T12:00:00-04:00
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
      <nav class="site-nav">
        <a href="{{ "/notices/" | relURL }}">Notices</a>
        <a href="{{ "/minutes/" | relURL }}">Minutes</a>
        <a href="{{ "/news/" | relURL }}">News</a>
        <a href="{{ "/governance/" | relURL }}">Governance</a>
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
- **Navigation** — four fixed links in the header. There's no h1 in the chrome; the homepage renders no h1 at all by design (the section pages emit their own from the template).

### Homepage

`layouts/index.html` overrides only the `main` block. It renders the intro from `content/_index.md` plus three section previews:

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
    <ul class="doc-list">
      <li><a href="{{ "/governance/bylaws/" | relURL }}">Bylaws</a></li>
      <li>
        <a href="{{ "/governance/standing-rules/" | relURL }}"
          >Standing Rules</a
        >
      </li>
      <li><a href="{{ "/governance/officers/" | relURL }}">Officers</a></li>
      <li>
        <a href="{{ "/governance/special-rules-of-order/" | relURL }}"
          >Special Rules of Order</a
        >
      </li>
    </ul>
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
{{ $section := .section }}
{{ $limit := .limit }}
{{ $items := where site.RegularPages "Section" $section }}
{{ $items = first $limit $items.ByDate.Reverse }}
{{ if $items }}
  <ul class="item-list">
    {{ range $items }}
      {{ partial "item-row.html" . }}
    {{ end }}
  </ul>
{{ else }}
  <p class="muted">Nothing yet.</p>
{{ end }}
```

The partial accepts a dict `(dict "section" "notices" "limit" 3)`, filters `site.RegularPages` by the named section, reverses by date, and takes the first N. Each item rows through `item-row.html`:

```bash
cat layouts/partials/item-row.html
```

```output
<li>
  <a href="{{ .RelPermalink }}">{{ .Title }}</a>
  <span class="item-date">{{ .Date.Format "January 2, 2006" }}</span>
  {{ with .Description }}<p class="item-desc">{{ . }}</p>{{ end }}
</li>
```

`item-row.html` is reused by every list page so the styling stays consistent: title link, formatted date, optional description. The `with` block silently elides the `<p>` if no description is set.

### Section list templates

Each section overrides `list.html` to add its own semantics. The **notices** list splits current vs. expired:

```bash
cat layouts/notices/list.html
```

```output
{{ define "main" }}
  {{ $now := now }}
  {{ $current := slice }}
  {{ $expired := slice }}
  {{ range .Pages.ByDate.Reverse }}
    {{ if and .Params.expires (lt (time .Params.expires) $now) }}
      {{ $expired = $expired | append . }}
    {{ else }}
      {{ $current = $current | append . }}
    {{ end }}
  {{ end }}
  <article>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
    {{ if $current }}
      <ul class="item-list">
        {{ range $current }}{{ partial "item-row.html" . }}{{ end }}
      </ul>
    {{ else }}
      <p class="muted">No current notices.</p>
    {{ end }}
    {{ if $expired }}
      <h2>Expired</h2>
      <ul class="item-list expired">
        {{ range $expired }}{{ partial "item-row.html" . }}{{ end }}
      </ul>
    {{ end }}
  </article>
{{ end }}
```

Two slices (`$current`, `$expired`) are built by comparing each notice's `expires` field to `now`. The template handles three states: only current, both, and only expired (the empty-current case shows a "No current notices" message).

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
          <li>
            <a href="{{ .RelPermalink }}">{{ .Title }}</a>
            {{ if .Params.approved }}
              <span class="badge approved">Approved</span>
            {{ else }}
              <span class="badge draft">Draft</span>
            {{ end }}
          </li>
        {{ end }}
      </ul>
    {{ end }}
  </article>
{{ end }}
```

The `(.Pages.GroupByDate "2006").Reverse` chain yields year-grouped slices in descending order, and within each year the posts are again date-reversed. The Approved/Draft badge uses CSS classes defined in the stylesheet.

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
        {{ partial "item-row.html" . }}
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

`notice-meta.html` renders the constitutional context — posted date, meeting date, and the bylaw authority:

```bash
cat layouts/partials/notice-meta.html
```

```output
<dl class="meta">
  <dt>Posted</dt>
  <dd>{{ .Date.Format "January 2, 2006" }}</dd>
  {{ with .Params.meeting_date }}
    <dt>Meeting</dt>
    <dd>{{ (time .).Format "January 2, 2006" }}</dd>
  {{ end }}
  {{ with .Params.authority }}
    <dt>Required by</dt>
    <dd>{{ . }}</dd>
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
        {{ (time .).Format "January 2, 2006" }}
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

News and governance posts use `layouts/_default/single.html` (just `<h1>` + content). And there's a custom 404:

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

A single ~230-line stylesheet defines the whole look. Custom properties drive the palette and measure:

```bash
sed -n '1,8p' assets/css/style.css
```

```output
:root {
  --fg: #1a1a1a;
  --muted: #595959;
  --bg: #fafaf7;
  --accent: #2f5d3a;
  --rule: #d8d4c7;
  --measure: 38rem;
}
```

Green accent for a golf club. `--measure: 38rem` constrains the readable column width and is applied to `header`, `main`, and `footer`.

The badge classes that the minutes list uses:

```bash
sed -n '210,230p' assets/css/style.css
```

```output
.badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.125rem 0.5rem;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 2px;
}

.badge.approved {
  background: var(--accent);
  color: var(--bg);
}

.badge.draft {
  background: var(--rule);
  color: var(--muted);
}
```

## Build pipeline

The Taskfile wraps every recurring command:

```bash
cat Taskfile.yml
```

```output
version: "3"

tasks:
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
  "$schema": "https://biomejs.dev/schemas/2.4.15/schema.json",
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
      "recommended": true
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
    "@biomejs/biome": "^2.4.15",
    "prettier": "^3.8.3",
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
    # Daily at 06:07 UTC (~02:00 ET) so future-dated content rolls in
    # after local midnight. Offset from the hour to avoid the cron surge.
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
    runs-on: ubuntu-latest
```

Four triggers — push to main, pull requests (build-only, no deploy), a daily cron, and manual dispatch. The cron exists so that future-dated content (events announced with a `date:` in the future) rolls into production after that date passes. The Hugo version is pinned via `HUGO_VERSION`.

The build job:

```bash
sed -n '24,49p' .github/workflows/pages.yml
```

```output
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

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
  deploy:
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
2. Hugo reads `hugo.toml`, walks `content/`, and for each `.md` file picks the section's `single.html` template (or `_default/single.html` for sections without one). Lists use the section's `list.html`; the homepage uses `layouts/index.html`.
3. Every page renders inside `_default/baseof.html`, which pipes `assets/css/style.css` through `minify | fingerprint` and emits the SRI-protected link.
4. Markdown content becomes the `.Content` interior; frontmatter populates the meta partials and the badge classes.
5. The built `public/` is uploaded as a Pages artifact; the deploy job hands it to GitHub Pages, which serves it from `crbgc.org` (via the `CNAME`).

For local development, `task serve` runs `hugo server -D --buildFuture` so drafts and future-dated content are visible. `task format` keeps the source clean before committing — the only enforcement of that convention is the maintainer, not a hook.

## Where to look next

- **Adding content** — `README.md` documents each section's required frontmatter with copy-paste templates.
- **Open improvements** — issues #16–#24 on GitHub track the tech-debt audit findings; #17 (explicit `slug:`) is the highest-leverage one.
- **Project conventions** — `CLAUDE.md` summarizes structure and commands for collaborators (human or AI).
