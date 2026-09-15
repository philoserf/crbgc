# C&RBGC Site Walkthrough

*2026-09-14T23:51:34Z by Showboat 0.6.1*
<!-- showboat-id: 95996794-d7b9-4f1b-a3e9-08b8b28038d1 -->

## Overview

`crbgc` is the Hugo source for [crbgc.org](https://crbgc.org/), the public record of a
two-person parliamentary golf society that governs itself under *Robert's Rules of Order
Newly Revised*. The site publishes four kinds of thing: **governance** documents (bylaws,
standing rules), **notices** of meetings, **minutes** of those meetings, and **news**.

There is no application layer. Hugo is the entire runtime, the Markdown corpus is the
database, and YAML frontmatter is its schema. Everything interesting in this repository is
a consequence of that: the rules that would be a validation layer elsewhere are Go template
actions that fail the build, and the queries that would be SQL are `where` clauses in
partials.

Three entry points are worth knowing before anything else:

- `hugo.toml` — configuration, and the only TOML in the repo.
- `layouts/_default/baseof.html` — the page chrome every HTML page passes through.
- `.github/workflows/pages.yml` — the only way anything reaches production.

The whole template corpus is small enough to read in a sitting.

```bash
git ls-files layouts content | sort
```

```output
content/_index.md
content/governance/_index.md
content/governance/bylaws.md
content/governance/officers.md
content/governance/special-rules-of-order.md
content/governance/standing-rules.md
content/minutes/_index.md
content/minutes/2026-06-21-annual-meeting.md
content/news/_index.md
content/news/2026-06-21-club-formally-established.md
content/news/2026-08-17-commons-day.md
content/news/2026-08-17-dew-sweeper-championship.md
content/news/2026-08-17-zen-juice-appreciation-day.md
content/notices/_index.md
content/notices/2026-06-21-2027-annual-meeting.md
layouts/_default/baseof.html
layouts/_default/list.html
layouts/_default/single.html
layouts/404.html
layouts/governance/list.html
layouts/governance/single.html
layouts/home.rss.xml
layouts/index.html
layouts/index.llms.txt
layouts/minutes/list.html
layouts/minutes/single.html
layouts/news/list.html
layouts/news/single.html
layouts/notices/list.html
layouts/notices/single.html
layouts/partials/governance-meta.html
layouts/partials/item-row.html
layouts/partials/latest.html
layouts/partials/minutes-meta.html
layouts/partials/notice-meta.html
layouts/partials/notices-by-status.html
layouts/partials/validate-content.html
```

Twenty-four files, and four of them are fallbacks or single-purpose pages. The four
sections each ship their own `list.html` and `single.html` rather than sharing a default,
because each encodes a different relation to time — that is the central idea of the content
model and it is worth holding onto.

## Configuration

`hugo.toml` is short, and three of its blocks are load-bearing.

```bash
sed -n '/^baseURL/,/^disableKinds/p' hugo.toml
```

```output
baseURL = "https://crbgc.org/"
title = "The Common & Recent Bogeymens Golf Club"
timeZone = "America/New_York"
enableRobotsTXT = true
disableKinds = ["taxonomy", "term"]
```

`timeZone` is not cosmetic. Bare dates in frontmatter (`expires`, `meeting_date`,
`adopted`) carry no offset, so without this they would parse as UTC midnight while the
content model assumes US Eastern — a notice would roll into "Expired" four or five hours
before the local end of its day. `disableKinds` turns off tags and categories entirely: the
site uses frontmatter fields like `notice_type` directly in templates instead.

The permalink block is what makes URLs independent of filenames.

```bash
sed -n '/^\[permalinks\]/,/^$/p' hugo.toml
```

```output
[permalinks]
notices = "/notices/:slug/"
minutes = "/minutes/:slug/"
news = "/news/:slug/"

```

Each dated section resolves to `/<section>/<slug>/`, where `:slug` is the explicit `slug:`
field in the post's frontmatter. The `YYYY-MM-DD-` filename prefix exists only to sort the
editor's file list — it never appears in a URL. `governance` is deliberately absent from
this block because those documents are not dated.

Finally, output formats. The home page emits three representations, one of which is
hand-written for machine readers.

```bash
sed -n '/^\[outputFormats.llms\]/,$p' hugo.toml
```

```output
[outputFormats.llms]
mediaType = "text/plain"
baseName = "llms"
isPlainText = true
notAlternative = true

[outputs]
home = ["html", "rss", "llms"]
```

## The content model

Each section is a small domain language with its own frontmatter shape. A notice carries
the most of it, because a notice is the one artifact whose correctness *Robert's Rules*
actually constrains.

```bash
sed -n '/^---$/,/^---$/p' content/notices/2026-06-21-2027-annual-meeting.md
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

`authority` names the bylaw provision that requires the notice to exist. `meeting_date` is
the meeting being announced; `expires` is **the first day the notice is hidden**, which is
why it is set to the day after the meeting — a notice that expired *on* the meeting date
would vanish on the morning it mattered most.

Minutes carry a different shape again (`presiding`, `secretary`, `present`, `absent`,
`approved`), governance documents carry `adopted`/`last_amended`/`weight` and no date at
all, and news carries only title, slug, description and date. Nothing merges these shapes;
each section's templates read the fields it knows about.

## Two rules the build enforces

The schema is enforced by template behaviour, which mostly means it is not enforced at all:
a misspelled `approved_on` does not error, it silently renders "Approved" with no date. Two
rules are the exception, because breaking either damages something that cannot be repaired
from inside the repository.

```bash
cat layouts/partials/validate-content.html
```

```output
{{/* Fails the build on a dated post that breaks a URL or expiry invariant.
  Renders nothing. Called once per build via partialCached from baseof.html.
  These rules were previously enforced only by the new-* skills at creation
  time, which cannot catch a hand-written file or an edit made in review
  (issues #56, #61).
*/}}
{{- range $section := slice "notices" "minutes" "news" -}}
  {{- $seen := dict -}}
  {{- with site.GetPage (printf "/%s" $section) -}}
    {{- range .RegularPages -}}
      {{- $file := .File.Path -}}
      {{/* #56: an explicit slug pins the URL against a retitle. */}}
      {{- if not .Params.slug -}}
        {{- errorf "%s: dated post has no slug: — its URL would follow its title" $file -}}
      {{- else -}}
        {{- $slug := .Params.slug -}}
        {{- with index $seen $slug -}}
          {{- errorf "%s: slug %q is already pinned by %s" $file $slug . -}}
        {{- end -}}
        {{- $seen = merge $seen (dict $slug $file) -}}
      {{- end -}}
      {{/* #61: expires is the first day hidden, so it must clear the meeting. */}}
      {{- if and .Params.expires .Params.meeting_date -}}
        {{- if not (gt (time .Params.expires) (time .Params.meeting_date)) -}}
          {{- errorf "%s: expires %s is not after meeting_date %s — expires is the first day the notice is hidden" $file .Params.expires .Params.meeting_date -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
```

`errorf` fails the build, so both rules are gates rather than warnings. The slug rule
matters because the site ships no Hugo aliases: a `slug:` that changes — or is absent, so
Hugo derives it from the title — silently moves a published URL, and `bylaws.md` and the
minutes link into the site by absolute path. The uniqueness check is scoped per section
because `[permalinks]` scopes slugs per section, so `/news/x/` and `/notices/x/` are two
legitimate URLs.

It is wired into the chrome, not into the three `single.html` templates, and it is called
through `partialCached` so it runs once per build rather than once per page.

```bash
sed -n '/<head>/,/viewport/p' layouts/_default/baseof.html
```

```output
  <head>
    {{- partialCached "validate-content.html" . -}}
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
```

The partial reads only `site`, never its context, which is what makes caching it on the
partial name alone safe.

## The invariant that shapes the notices section

A notice is current or expired, and that partition is a property of the site rather than of
any one page that displays it. It is computed in exactly one place.

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

The partial renders nothing — it `return`s a dict of two page slices. Note the comparison:
`lt (time .Params.expires) $now`. A notice with no `expires` at all never expires, which is
deliberate.

Every surface that lists notices reads from this. That rule has teeth because it has been
broken three times: once on the homepage, once in `llms.txt`, and once — latently — in the
RSS feed that Hugo generated for the notices section without anyone asking. The third
recurrence was settled by removing the feed rather than by fixing it, which is why the
notices section now emits HTML only.

```bash
cat content/notices/_index.md
```

```output
---
title: "Official Notices"
description: "Meeting notices, notices of motion, and bylaw amendment notices."
outputs: ["html"] # no feed: a notices listing must go through notices-by-status.html (#55)
---

Notices required under the Bylaws or _Robert's Rules of Order Newly Revised_ — including notices of regular and special meetings, notices of motion requiring previous notice, and notices of proposed bylaw amendments.
```

## Composing a page

`baseof.html` holds the chrome: title strategy, the font links, the fingerprinted
stylesheet, the four-item nav, and the footer. Every HTML template fills in its `main`
block. The CSS pipeline is the part worth reading closely.

```bash
sed -n '/\$style := resources.Get/,/^    \/>/p' layouts/_default/baseof.html
```

```output
    {{ $style := resources.Get "css/style.css" | minify | fingerprint }}
    <link
      rel="stylesheet"
      href="{{ $style.RelPermalink }}"
      integrity="{{ $style.Data.Integrity }}"
    />
```

`minify | fingerprint` gives the served file a content hash, so new CSS is a new URL and
the cache busts itself; `.Data.Integrity` is the same hash as an SRI attribute. This is more
rigor than a 5 KB stylesheet needs, and it is intentional — it costs nothing and it is the
kind of detail a parliamentarian appreciates.

The homepage composes three sections from content rather than naming anything by hand.

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

Two of those go through `latest.html`, which is where the notices invariant is enforced for
callers who would otherwise have to remember it.

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

The `notices` branch is a deliberate special case and the comment says why: hiding expired
notices is a correctness invariant no caller should be able to forget, unlike `item-row`'s
approved/draft badge, which is a presentation choice the caller makes. The two are treated
differently on purpose.

Each section's list template then reads its own section in its own way — minutes group by
year, news is a flat reverse-chronological list, governance sorts by `weight` and ignores
dates entirely.

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

## The two machine-facing outputs

The home page emits `/index.xml` and `/llms.txt` alongside its HTML. Both are owned
templates, and both exist because Hugo's defaults were wrong for this site in different
ways.

The feed is a fork of Hugo's embedded `rss.xml` that changes page selection and nothing
else.

```bash
sed -n '/^{{- \$pages :=/,/^{{- end -}}$/p' layouts/home.rss.xml
```

```output
{{- $pages := where site.RegularPages "PublishDate.IsZero" false -}}
{{- $pages = $pages.ByPublishDate.Reverse -}}
{{- $limit := .Site.Config.Services.RSS.Limit -}}
{{- if ge $limit 1 -}}
{{- $pages = $pages | first $limit -}}
{{- end -}}
```

Hugo's default page sort puts any page with a nonzero `weight` ahead of every page without
one, regardless of date. The governance documents carry `weight` to order the list page, so
the club's feed used to lead with the Bylaws, published `Mon, 01 Jan 0001`. Sorting
explicitly by date, and dropping pages with no date at all, severs that connection: a page
with no date does not belong in a chronological archive.

The decision behind it: **a feed is an archive**. It carries every dated post and never
drops one, because a subscriber's reader keeps items anyway. That is why the feed does not
filter expired notices, and why the notices section has no feed of its own — the two
policies cannot both hold on one surface.

`llms.txt` is plain text where whitespace is the output, which makes it the one template
Prettier must never touch.

```bash
sed -n '/^{{- define "llms-section"/,/^{{- end -}}$/p' layouts/index.llms.txt
```

```output
{{- define "llms-section" -}}
{{- with .pages }}
## {{ $.heading }}
{{ range . }}
- [{{ .Title }}]({{ .Permalink }}){{ with .Description }}: {{ . }}{{ else }}{{ with .Date }} — {{ .Format "2006-01-02" }}{{ end }}{{ end }}
{{- end }}
{{ end -}}
{{- end -}}
```

It is excluded from formatting by the `task prettier` glob covering only
`.{md,html,yml,yaml,toml,json}` — not by `.prettierignore`, which is a symlink to
`.gitignore`, so an entry there would stop git tracking the file as well. The same
accident of the glob is what keeps `layouts/home.rss.xml` unformatted.

## Build and deploy

Local work goes through go-task.

```bash
sed -n '/^  build:/,/hugo --minify/p' Taskfile.yml
```

```output
  build:
    desc: Build the site to ./public
    cmds:
      - hugo --minify --gc
```

`task format` runs Prettier **twice** — `prettier-plugin-go-template` is non-idempotent and
can need a second pass to converge. Upstream is abandoned, so the plugin is pinned exact
and the double pass is permanent. `task check` runs the formatters in check mode only; it
does not invoke Hugo, so the build gate is `task build` locally and CI on the pull request.

Production is one workflow with two jobs.

```bash
sed -n '/^on:/,/^permissions:/p' .github/workflows/pages.yml
```

```output
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
```

Four triggers. Pull requests build but never upload, so a PR is a real gate — a template
that fails `errorf` fails the check. The daily cron exists so that future-dated content
rolls into production on its own date without anyone pushing. Manual dispatch is the escape
hatch.

The Hugo version floats deliberately at both ends.

```bash
sed -n '/^env:/,/extended: true/p' .github/workflows/pages.yml
```

```output
env:
  HUGO_VERSION: latest

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Install Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ env.HUGO_VERSION }}
          extended: true
```

`HUGO_VERSION: latest` in CI matches the unpinned `brew "hugo"` in the `Brewfile`, so local
and CI track the same upstream release and cannot skew from each other. A breaking Hugo
release fails the build; because `deploy` needs `build`, the published site keeps serving
the last good output, and the daily cron surfaces the break within a day even with no
commits.

## Reading the whole thing end to end

A push to `main` runs `hugo --minify --gc` on the current Hugo. That build:

1. Parses every file under `content/` into pages, resolving dates through Hugo's
   `[date, publishdate, lastmod]` chain and slugs through `[permalinks]`.
2. Renders the first HTML page, which enters `baseof.html` and triggers
   `validate-content.html` once — failing the whole build if any dated post lacks a unique
   slug, or any notice expires on or before its own meeting.
3. Renders each section through its own `list.html` and `single.html`, with anything
   touching notices reading the current/expired split from `notices-by-status.html`.
4. Emits `/index.xml` from the owned home feed template and `/llms.txt` from the
   hand-maintained plain-text template, plus Hugo's built-in feeds for `news` and
   `minutes`.
5. Uploads `public/` as a Pages artifact, which the `deploy` job publishes to crbgc.org via
   the `CNAME` in `static/`.

There is no step in that sequence where a human is consulted, and no state anywhere but the
Markdown. That is the whole design: the repository is the database, the build is the
application, and the only way to publish is to push.

