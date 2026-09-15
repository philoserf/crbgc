# Theory of the C&RBGC site

Written for whoever inherits this next. It is not a tour of the files — `WALKTHROUGH.md`
does that, when it exists. This is what you need to believe about the system to change it
without breaking something that cannot be put back.

## What it models

The Common & Recent Bogeymens Golf Club is a two-person golf society that formed informally
in 2000 and established itself formally on the 2026 summer solstice, and which governs
itself, with a straight face, under _Robert's Rules of Order Newly Revised_. This site is
its public record.

The domain is parliamentary procedure, not golf. That single fact explains most of the
design. A society under RONR produces four kinds of artifact, and they differ in their
relation to time:

- **Governance documents** — bylaws, standing rules, special rules of order, officers.
  Atemporal and ranked. They have no date because they are continuously in force; they have
  `adopted` and `last_amended` because a parliamentarian needs to know when the text became
  binding and when it last changed. They carry `weight` because they have an order of
  authority, and that order is editorial rather than chronological.
- **Notices** — time-windowed. A notice exists because a bylaw requires it (`authority`
  names the provision), it announces a `meeting_date`, and it stops being useful after that
  meeting. RONR's concept of _previous notice_ is the reason `notice_type` distinguishes a
  meeting notice from a notice of motion from a bylaw-amendment notice; those are different
  procedural objects, not display categories.
- **Minutes** — dated records of events that happened, carrying who presided, who kept the
  record, who was present, and whether the body has since **approved** them. Draft minutes
  and approved minutes are different things procedurally, which is why `approved` is a field
  and not a tag.
- **News** — the only section with no procedural weight at all. Title, slug, description,
  date, prose.

The frontmatter vocabulary is RONR's vocabulary. `presiding`, `secretary`, `quorum`,
`previous notice`, `authority` — these are not arbitrary field names, and a maintainer who
does not recognise them will read the frontmatter as over-specified. It is exactly the
metadata a parliamentarian expects a notice or a set of minutes to carry.

One thing this site is _not_: the authoritative copy of the governance documents. They
render here, but adoption history lives in the minutes. Amending a bylaw means editing the
document, bumping `last_amended`, and recording the vote in minutes. The site is a
publication of the record, not the record itself.

## The organizing ideas

**Content is the database; frontmatter is the schema; Hugo is the entire runtime.** There is
no application layer, no JavaScript, no data store. Every fact the site renders lives in a
YAML block above prose. The consequence worth internalising is that the schema is enforced
by template behaviour, which usually means it is not enforced at all — a misspelled
`approved_on` does not error, it silently renders "Approved" with no date.

**Two rules are the deliberate exception**, and they are exceptions because breaking either
does damage that cannot be repaired from inside the repository:

1. Every dated post pins an explicit, section-unique `slug:`. The site ships **no Hugo
   aliases** — a renamed slug is a permanently dead URL, by choice — and `bylaws.md`, the
   minutes and the notices link into each other by absolute path. A slug that moves breaks
   inbound links with no build error.
2. A notice's `expires` falls after its `meeting_date`. `expires` is the _first day the
   notice is hidden_, so a notice expiring on its own meeting date disappears on the morning
   it matters most.

Both are checked in `layouts/partials/validate-content.html`, which renders nothing, runs
once per build through `partialCached`, and calls `errorf` — so they fail the build rather
than warn. This is worth understanding as a decision, not a feature: the project's earlier
theory held that wanting tests would be a signal the system had outgrown itself. That line
was reached and crossed deliberately in issues #56 and #61, with a build-time assertion
rather than a test framework, because the alternative was enforcement at creation time —
three skills that generate correct frontmatter — which cannot catch a hand-written file or
an edit made in review.

**The notices partition is a site-wide invariant, not a property of a page.**
`notices-by-status.html` splits the section into current and expired, and every surface that
lists notices reads from it. This has teeth because it has been broken three separate times
— the homepage, `llms.txt`, and latently in an RSS feed Hugo generated without being asked.
The third recurrence was settled by deleting the feed rather than fixing it, which is the
sharper move: there is now no notices feed to forget the rule.

**A feed is an archive.** It carries every dated post chronologically and never drops one,
on the reasoning that a subscriber's reader keeps items anyway. That decision is why the
home feed does not filter expired notices, and why the notices section emits no feed at all:
the two policies cannot both hold on one surface. It also explains an otherwise odd
asymmetry — the home feed is a template this project owns, while `news` and `minutes` still
use Hugo's built-in one. Ownership was taken only where Hugo's default was wrong.

**Time is Eastern, and that is a correctness property.** Bare dates in frontmatter carry no
offset; `timeZone` in `hugo.toml` makes them parse as Eastern midnight rather than UTC, so a
notice does not roll into "Expired" four hours early. The daily cron in `pages.yml` exists
for the same reason from the other end: future-dated content must enter production on its
own date without anyone pushing.

## The seams

**Frontmatter to template** is the seam most likely to leak, because it is the one with no
type system. Nothing connects a field's presence to the template that reads it.

**Repository to GitHub Pages** is the most rigid boundary and intentionally so: the only way
to publish is to push to `main`, and pull requests build without uploading, so the build
gate is real. Hugo floats at both ends — `HUGO_VERSION: latest` in CI, unpinned `brew
"hugo"` locally — so the two cannot skew from each other, and a breaking upstream release
fails the build while the published site keeps serving the last good output.

**Formatter to templates** is a historical accident that has become load-bearing. Prettier
formats the Go templates through `prettier-plugin-go-template`, which upstream abandoned in
2023 and which breaks outright under Prettier 4 — not loudly, but by silently falling back
to the HTML parser and mangling every template. Hence the exact pin and the Prettier 3
ceiling (#52). Two files escape formatting only because the glob happens to cover
`.{md,html,yml,yaml,toml,json}` and they are `.txt` and `.xml`: `index.llms.txt`, where
whitespace _is_ the output, and `home.rss.xml`. That escape is accidental, and worth knowing
before anyone widens the glob. The obvious remedy is unavailable: `.prettierignore` is a
symlink to `.gitignore`, so an entry there would stop git tracking the file too.

**The generated documents are not a seam at all, and that is recent.** `THEORY.md` — this
file — and `WALKTHROUGH.md` are outputs of the `code-theory` and `code-walkthrough` skills.
They are regenerated wholesale and allowed to drift in between; patching them to track a
code change is churn against a file that is about to be replaced. If you find one of them
wrong, regenerate it. Do not fix it.

## What it accommodates, and what it does not

Adding a notice, a set of minutes, or a news post is routine — use the `/new-notice`,
`/new-minutes`, `/new-news` skills, which compute the Eastern offset and the frontmatter.
Adding a new _section_ is the interesting case: the two `_default` fallback templates exist
unreached, kept deliberately so a new section renders sensibly before it earns bespoke
templates. Note that the fallback ranges `.Pages` unsorted, which means Hugo's default sort
applies — and Hugo's default sort puts any page with a nonzero `weight` ahead of every page
without one, regardless of date. That coupling is what put the Bylaws at the top of the
club's RSS feed dated year 0001 (#54).

Changing the visual identity is cheap and self-contained: one 5 KB stylesheet, no grid, no
breakpoints, no JS, mirroring the Flowershow "letterpress" theme used by the club's sibling
notes site so the two read as one.

What would require rethinking something fundamental: anything stateful or interactive — a
member directory with login, an RSVP form, comments — because there is no layer to put it
in. Likewise a real workflow around minutes approval. Today the transition is a manual edit
from `approved: false` to `true`, with no audit trail beyond git, and nothing requiring the
approving meeting's minutes to reference what they approved.

**Where a maintainer without the theory does damage**, in order of likelihood: changing a
published `slug:` — presence and uniqueness are enforced, _stability_ is not, and a slug
edited in review is still valid and unique; renaming a heading in `bylaws.md`, because five
cross-references elsewhere in the content point at Goldmark's auto-generated anchor for that
heading text and nothing checks them; and adjusting a date's timezone offset, which silently
changes whether something is published.

## Uncertainties

I am inferring that `weight: 10/20/30/40` encodes an order of parliamentary authority
(bylaws above standing rules above special rules) rather than mere display preference. The
gaps of ten suggest room to insert, which supports it, but nothing states it.

I cannot tell from the code whether `notice_type: previous-notice` is meant for notices
_of_ previous notice or notices that have _been_ superseded. Only one notice exists, and it
is `annual-meeting`. A second notice of a different type would settle it.

The `_default` fallback templates are documented as deliberate, but nothing exercises them,
so their correctness is asserted rather than demonstrated. Nothing would catch it if the
fallback drifted from what a new section would actually need.

The strongest tension I could not resolve: this project is meticulous about subresource
integrity on the one asset that cannot be tampered with remotely — its own fingerprinted
stylesheet — and relaxed about the one that can, a render-blocking Google Fonts stylesheet
that is the site's only third-party runtime dependency (#62). I can construct no theory in
which both choices follow from the same principle. It reads as two decisions made at
different times rather than one position.
