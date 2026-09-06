# A theory of crbgc

## What this system is for

This is the public-record website of a two-person parliamentary society — The Common & Recent Bogeymens Golf Club — that has bound itself, with a straight face, to _Robert's Rules of Order Newly Revised_. The site is not a blog about golf and not a marketing page for a club. It is the publication channel through which a deliberative body satisfies its own constitutional notice requirements and preserves its own minutes. The seriousness is genuine on the procedural side and entirely tongue-in-cheek on the subject matter; both registers have to coexist in the output, and the templates are calibrated to that. If you read only the bylaws you would think this is a small nonprofit; if you read only the news posts you would think it is a joke. The codebase treats both as load-bearing.

The domain entities are:

- **Members** — two Charter Members; the bylaws' quorum is _all then-living Charter Members_, so the deliberative body is effectively N=2. This is why almost nothing in the system needs to scale.
- **Governing documents** — Bylaws, Standing Rules, Special Rules of Order, Officers. These are ordered by parliamentary authority (bylaws control; standing rules subordinate; special rules of order modify RONR defaults; officers are an operational artifact of bylaws Article IV). That hierarchy is encoded as `weight` in frontmatter, not as a content type.
- **Notices** — RONR-required notifications with a posted-date, a meeting-date, an expires-date, and a citation back to the bylaw provision that requires them. Notices have a _constitutional authority_; they are not blog posts that happen to be about meetings.
- **Minutes** — records produced by the Secretary-Treasurer; they have a draft/approved lifecycle, where approval is itself a parliamentary act performed at a subsequent meeting and recorded back into the artifact.
- **News** — the everything-else bucket: recaps, traditions, jokes. The only content type without procedural meaning.

The vocabulary in the templates maps directly onto this domain (`notice_type`, `authority`, `meeting_type`, `approved`, `presiding`, `secretary`, `present`, `absent`), and the field names are not arbitrary — they are the language of RONR. A maintainer who doesn't recognize that vocabulary will see the frontmatter as overspecified; a maintainer who does will see it as exactly the metadata a parliamentarian would expect a notice or a set of minutes to carry.

## Organizing ideas

**Content is the database; frontmatter is the schema.** There is no application layer. Every fact the site renders — who presided, what the bylaw authority is, whether minutes are approved — lives in a YAML frontmatter block above prose. Hugo is the entire runtime. The corollary is that the _schema is enforced only by template behavior_: a misspelled `approved_on` will not error, it will just silently render "Approved" with no date. The discipline is editorial, not mechanical.

**Each section is a small DSL with its own shape.** The four sections look superficially uniform — dated Markdown files with a section index — but they encode different relations to time:

- _Governance_ is **atemporal and ordered**: `weight` decides position; `adopted`/`last_amended` are recorded but currently unrendered. URLs do not include slugs derived from dates.
- _Notices_ are **time-windowed**: each notice carries an `expires` field, and the section is partitioned at build time into current vs. expired. That partition is a site-wide invariant, not a property of the list page — it lives in `notices-by-status.html` and every surface that lists notices (section page, homepage, `llms.txt`) reads from it. The expiration semantics are the reason the build is on a daily cron, not just push-triggered.
- _Minutes_ are **archival and grouped by year**: ordered descending; each carries an Approved/Draft badge that reflects a parliamentary state transition. The badge is the only piece of UI in the system that exists to communicate a domain-procedural fact.
- _News_ is **flat reverse-chronological**: the only section with no procedural metadata at all.

The templates honor these distinctions. There is no shared list logic that gets parameterized into four behaviors; instead each section has its own `list.html` and they share only the `item-row` partial for individual rows. That choice is principled — the _headers_ of these lists carry different meaning (current vs. expired; year groupings; weight-ordered with descriptions; flat) — and it would be a mistake to try to unify them.

**The homepage is a hub, not a section.** It is the only place that crosses section boundaries: `latest.html` queries `site.RegularPages` filtered by section name, which is the single point of cross-section coupling. The governance block on the homepage is deliberately _not_ using `latest.html` — those four pages are stable and ordering them by recency would be wrong. This asymmetry is meaningful; do not "fix" it.

**Time is part of the build.** Two facts make this true. `notices-by-status.html` compares `expires` against `now` at template-render time, so the current-vs-expired partition is computed when Hugo runs — once, for every listing on the site. And the GitHub Actions workflow has a daily cron at 06:07 UTC for the express purpose of rolling forward (a) future-dated content whose publish moment has passed and (b) notices whose expires date has passed. The site is therefore not "static" in the strong sense — its state can change without a commit. A maintainer who doesn't know this will not understand why a notice appeared "out of nowhere" or why an Eastern-timezone offset on a `date:` field matters. The convention (US Eastern, `-04:00` summer / `-05:00` winter) is the literal expression of this invariant: a wrong offset can push a post outside the build window.

**The CSS is calibrated to a readable column, not to a layout system.** A single `--measure: 38rem` constraint is applied to header, main, and footer; there is no grid, no responsive breakpoints beyond what the natural flow gives you, no JS. The visual identity is _typographic_ (serif body, sans display, green-on-cream palette). The CSS goes through `minify | fingerprint` and ships with an SRI integrity attribute. This is more rigor than the site needs and it is intentional — the file is small enough that fingerprinting is essentially free, and SRI is the kind of detail a parliamentarian appreciates.

## Seams

**Repository to GitHub Pages.** The deploy seam is `pages.yml`. It is one workflow with two jobs (build, deploy); PRs build but do not upload; only `main` deploys. `static/CNAME` carries the domain binding. Hugo is pinned via `HUGO_VERSION`. This is the most opinionated boundary in the system, and it is intentionally rigid: the only way to publish is to push to `main`, and the only way to dry-run is a PR.

**Frontmatter to template.** The seam most likely to leak. The templates use `with .Params.X` blocks so missing fields silently disappear, which is the right behavior for optional fields (`description`, `meeting_date`, `authority`) but masks typos for required fields. `notice_type` was for a long time the exception — collected on every notice, rendered nowhere, with the shape of an unfinished thought. It is now rendered in `notice-meta.html` (issue #42), which settles the question in favor of the field being real: a notice's type is part of the constitutional record a reader is entitled to see, not internal bookkeeping. The vocabulary lives in `.claude/skills/new-notice/SKILL.md` and the README, and the values are hyphenated, so the template un-hyphenates before title-casing.

**Filename to URL.** The dated-filename convention (`YYYY-MM-DD-slug.md`) is for editor sort order only; the URL comes from an explicit `slug:` in frontmatter via `[permalinks]` in `hugo.toml`. Every dated post pins its own `slug:` (the resolution of the former issue #17), so a title can be reworded without moving the page — the URL is decoupled from the title. The fragility has shifted accordingly: the rule is now _never change a published `slug:`_, since the cross-references in `bylaws.md` and the minutes assume the pinned slug forms. A post that omits `slug:` silently falls back to the title-derived slug, which reintroduces the old coupling.

**Formatter to templates.** Prettier formats Hugo templates via `prettier-plugin-go-template`, a plugin still at `0.0.x` that sometimes needs a second pass to converge — hence the Taskfile runs it twice. This is not paranoia; it is a known upstream wrinkle. CSS is delegated to Biome instead. The split (Prettier for everything-but-CSS, Biome for CSS) is the only piece of toolchain choreography in the build and it is the kind of decision worth preserving rather than re-litigating.

**Content to itself.** Internal links in content (`/governance/bylaws/#article-vii--standing-rules`, `/minutes/minutes-2026-annual-meeting/`) are absolute paths into the rendered site. They bypass Hugo's `ref`/`relref` mechanisms entirely. This works as long as the pinned `slug:` values don't change — which is the same fragility as the previous seam, viewed from the content side.

## What this system is shaped to accommodate

Easily:

- Adding a notice, a news post, or a set of minutes. The frontmatter conventions are documented in `README.md` and there is no schema enforcement to fight.
- Posting future-dated content. The daily cron exists precisely to roll it forward.
- Bumping the Hugo version. One line in `pages.yml`.
- Restyling. A single stylesheet, custom-property-driven.

With moderate work:

- A new section. You add the directory under `content/`, an `_index.md`, a `list.html` in `layouts/<section>/`, optionally a `single.html`, and a permalink rule in `hugo.toml` if the URL shape should drop the date prefix.
- A new notice type. Add it to the vocabulary in `.claude/skills/new-notice/SKILL.md` and the README; `notice-meta.html` renders whatever it is given, so a new value needs no template change. Only treating types _differently_ — distinct styling or filtering per type — would need template work, in `notice-meta.html` and the notices list.

Hard, in a way that would require rethinking:

- **Anything stateful or interactive.** There is no JS, no client-side anything. Adding a member directory with login, an RSVP form, or a comment system would mean introducing a new architectural layer.
- **A real workflow around minutes approval.** Today the approved-state transition is a manual edit to frontmatter; a draft becomes approved when someone changes `approved: false` to `true` and fills in `approved_on`. There is no audit trail beyond git. Formalizing this — for example, requiring that the approving meeting's minutes link back to the approved minutes — would mean either a build-time cross-reference check or a separate approvals registry.
- **Multi-author safety.** The hand-pinned `slug:` convention is fine for a one- or two-person team. With more authors, nothing enforces slug uniqueness or stability: two posts can pin the same `slug:` (a silent collision), or a slug can be edited in review and quietly move a published URL. A larger team would want a uniqueness check at build time rather than relying on the discipline of remembering the rule.

If a new requirement arrived tomorrow, the right first stop depends on shape: schema changes go in the relevant `_meta.html` partial and the section's frontmatter convention in `README.md`; ordering and filtering changes go in the section's `list.html`; cross-section views go through `latest.html`; URL-shape changes go through `hugo.toml`'s `[permalinks]`. A maintainer who doesn't yet have the theory is most likely to do damage in two places: changing or dropping a published `slug:` (silently changing its URL and breaking inbound links) and adjusting a date's timezone offset (silently changing whether it shows up in production).

## Where I am inferring

I am inferring that `adopted` and `last_amended` on governance documents are likewise provisioned-but-unused; the README claims governance pages don't render those fields, and the codebase confirms it (issue #16 reportedly tracks this).

I am inferring that the default `_default/list.html` is essentially dead code — every existing section provides its own `list.html`, and the default template's flat `<ul>` would mismatch the site's visual conventions. It survives as a fallback for a hypothetical new section, not as something currently exercised.

I am inferring that the daily cron and the timezone-offset discipline together constitute a single design decision (time-correctness at the build) that is partly procedural — the wrong offset can hide a notice — and partly documentary; the project conventions make that more legible than the code itself does.

This used to be under-specified in one place: `expires` is compared with `lt (time .Params.expires) $now`, and `time` on a bare `YYYY-MM-DD` string yielded midnight **UTC**, not midnight Eastern — so a notice rolled into "Expired" four or five hours before the local end of the day, and the boundary depended on nothing the repo stated. That was an artifact, not a decision, and it is resolved: `hugo.toml` now sets `timeZone = "America/New_York"` (issue #33), which is the config-level expression of the same invariant the `date:` offset convention expresses at the content level. Bare dates and offset-bearing dates now agree on what a day is.

Finally: there is no test suite, and the system does not need one in the conventional sense. Correctness is verified by Hugo's parser failing loudly on broken templates, by Prettier/Biome on style, and by human review on prose. The closest thing to a regression check is the PR build in `pages.yml` (build-only, no upload). If you find yourself wanting tests, that is a signal that the system has grown past its current theory — most likely because the schema implicit in the frontmatter conventions has become something that needs to be enforced, not just observed.
