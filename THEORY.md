# THEORY

What you need to hold in mind to change this system without damaging it. Not a
tour of the files — `WALKTHROUGH.md` does that when it exists. This is the
account of why the code is shaped the way it is.

## What this system is for

The Common & Recent Bogeymens Golf Club is a parliamentary society: two Charter
Members, a Captain and a Secretary-Treasurer, bylaws adopted June 21 2026, and
_Robert's Rules of Order Newly Revised_ as its parliamentary authority. This
repository publishes the Club's **record**.

That word is the whole theory. This is not a golf blog with a bylaws page bolted
on, and it is not a documentation site. It is a body of documents that assert
things about the Club's own procedure, and the software's single job is to keep
those documents from asserting something the Club cannot substantiate.

Read the build checks with that in mind and they stop looking like lint:

- A notice shown as current after its meeting has passed **misstates what
  business is pending before the Club**.
- Minutes marked "Approved" with no approval date **assert a status that under
  RONR only a meeting can confer**, and the date is what identifies the meeting.
- A citation to `/governance/bylaws/#article-v--meetings` that resolves to no
  heading **leaves the constitutional basis for an action unverifiable**.
- A retitled bylaw that moves its own URL **breaks the citations in the minutes
  that were true when they were written**.

Each of those is a way for the published record to lie. `validate-content.html`
is not a code-quality tool; it is the thing standing between a prose edit and a
false record. A sibling Hugo site solving "publish some Markdown" would have
none of it.

## The entities, and the one that organizes them

Five sections. What distinguishes them is not their fields but **their
relationship to time**:

- **Governance** — atemporal. Bylaws, Standing Rules, Special Rules of Order,
  Officers. They have no date because they are continuously in force; they carry
  `adopted` and `last_amended` instead, which are facts about the text rather
  than about its publication. They are ordered by `weight`, an editorial rank,
  not chronology.
- **Notices** — forward-looking, with a lifespan. A notice exists to establish
  that required notice was given _before_ business is transacted; once the
  meeting passes, its job is done and continuing to show it as current is a
  false statement. This is the only section whose membership in a listing
  changes with the clock.
- **Minutes** — backward-looking, and their _truth status changes_. Draft versus
  Approved is a real parliamentary distinction, not a publishing workflow.
- **News and Notes** — dated and immutable. Chronology is all they have.

Nearly every asymmetry in `layouts/` follows from that table. Governance emits no
feed because a chronological feed of atemporal documents is meaningless. Notices
emit no feed because a feed is an archive and an archive cannot hide expired
items — the two requirements are incompatible, so the surface was dropped rather
than made wrong. Minutes group by year; governance orders by weight; the rest
order by date.

**`.Date` is the trap here.** Hugo gives every page one field, and in this domain
it means four different things: when a notice was _posted_ (distinct from
`meeting_date`), when a meeting _happened_, when a news post was written, and —
for the notes — a backdated position in a constructed sequence. A maintainer who
reasons about "the date" generically will eventually write a query that means the
wrong one of those.

## The rule that decides most arguments

**Either the build checks a fact, or the repository does not keep it.** There is
no third disposition, and the history is a sequence of applying it.

Deleted, because nothing could verify them: `slug:` (a second name for a URL that
already had one), `tags:` (taxonomy pages are disabled, so 300 entries rendered
nowhere), `lastmod:` (hand-written, and its only consumer went away),
`authority:` (a bylaw citation in frontmatter, duplicating one in the body that
the fragment checker actually resolves).

Promoted into `validate-content.html`, because they had to exist: the
filename↔URL identity, the notices expiry rules, the minutes approval pair, the
`notice_type` and `meeting_type` vocabularies, and — last of them — the
requirement that a post in a dated section carry a date at all. That one had
lived in prose the longest and failed the worst: silently, permanently, and
invisibly, since the page still published.

When you find yourself adding a frontmatter field, that rule is the question to
answer first. A field nobody can check is a field that will eventually be wrong,
and in a record that is the failure mode that matters.

**A corollary the repo learned three separate times: a rule enforced at creation
time is not enforced.** `.claude/skills/new-notice`, `new-minutes` and `new-news`
scaffold correct frontmatter, and issues #56, #61 and #112 each moved a rule out
of a skill and into the build with the same argument — a skill cannot catch a
hand-written file or an edit made in review. Treat the skills as convenience.
The build is the contract.

## Where the boundaries are principled, and where they are scars

**Principled: the notices listing chokepoint.** `notices-by-status.html` is the
only place the expiry rule is computed, and every listing goes through it.
`latest.html` branches on section specifically to route notices through it. The
partial is not an abstraction for reuse — it exists so that no caller can forget.
Issues #36 and #38 are both "someone queried the section directly." The site feed
is the one documented exception, and `home.rss.xml` carries a paragraph
explaining that it is an exception rather than a bug.

**Principled: governance is exempt from the identity rule.** In the four dated
sections the title _is_ the URL — `[permalinks]` uses `:slug`, whose fallback is
the normalized title, and the filename is that string written by hand. Governance
is deliberately absent from `[permalinks]`, so its URLs derive from filenames and
a prose retitle cannot move them. That is exactly right for the four documents
everything else cites, and it is why the build checks governance in the opposite
direction: normalized title against filename, rather than filename against URL.
This was only made explicit recently; before that it was true but unrecorded,
which is a distinction worth preserving.

**A scar that is now load-bearing: the notes are a graft.** Most of the site's
pages came from an Obsidian vault in another repository, carrying a different
ontology — wikilinks, `tags:`, `created:`, index notes that
were pure link lists. That ontology was stripped on import. But **the vault is
still the editing environment**, and Obsidian will offer to put tags and
wikilinks back on every edit. The wikilink check in `validate-content.html` is
not a general lint; it is border control against a content system that still owns
the authoring tool. Goldmark renders `[[Target]]` as literal brackets and exits
0, so without the check the failure is silent and published.

**A scar that hurts: the formatter.** `prettier-plugin-go-template` was abandoned
upstream in 2023, is pinned exact at `0.0.15`, is non-idempotent (hence the
deliberate double `prettier --write` in `Taskfile.yml`), and breaks outright
under Prettier 4 — where Prettier silently falls back to the HTML parser and
mangles every template in `layouts/`. Two files are excluded from it entirely,
because they are plain text where whitespace is output: `index.llms.txt` and
`home.rss.xml`. The exclusion cannot live in `.prettierignore`, **which is a
symlink to `.gitignore`**, so an entry there would also stop git tracking the
file. The formatter has also dictated how templates are written — `baseof.html`
computes Open Graph values into variables specifically because the plugin would
reflow an inline `if/else` into a `content="…"` attribute.

Two smaller things that bite: a Go template comment ends at the first `*/`, so no
glob can appear inside `{{/* … */}}`; and `--panicOnWarning` is what makes
`errorf` fatal, so every check in `validate-content.html` depends on a flag
passed in `Taskfile.yml` and `pages.yml` rather than on anything in the template.

## What it accommodates, and what it does not

**Comfortable:** more notices, minutes, news and notes; amending a governing
document (edit the text, bump `last_amended`, record the vote in the minutes —
the repo is explicitly _not_ the authoritative copy of adoption history); adding
a governance document; a new dated section, provided you remember to add it to
`[permalinks]` _and_ to the `validate-content.html` loop, which nothing prompts.

**Would require rethinking something:**

- **Anything needing a real `lastBuildDate`.** It needs `enableGitInfo`, which
  needs `fetch-depth: 0` in CI, or the depth-1 clone dates every file to the
  deploy commit. `home.rss.xml` documents the cost.
- **Taxonomies.** `disableKinds` removes taxonomy and term pages, and the field
  vocabularies are queried directly in templates. Re-enabling them is not a
  config toggle; it reopens the decision that deleted `tags:`.
- **A notice that must be _retracted_ rather than expire.** The model has one
  lifecycle verb, and it is the clock.
- **Membership as data.** The Bylaws make the Secretary-Treasurer keeper of the
  roll, and the roll exists nowhere in this system — `officers.md` holds a
  hand-written Markdown table. **The system models documents, not the
  organization.** Anything that wants to compute over members (quorum, good
  standing, voting eligibility) is a new kind of thing here, not an extension.

**Where an uninformed maintainer does damage:** querying the notices section
directly for a listing; adding a frontmatter field without deciding how it gets
checked; widening the Prettier glob; deleting a `_default/` template because a
comment calls it a fallback; or retitling a governance document. The undated-note
trap that used to head this list is now a build failure, which is the shape every
item here eventually wants to take.

## Uncertainties

Marked plainly, because this is inferred from code, content and commit messages
rather than from anyone's stated intent.

**Whether the notes belong in the same site as the record.** They are prose, not
record; the governance rules about amendment and minutes explicitly do not apply
to them; and they now outnumber every other section combined. The repo itself
records an unresolved editorial question nearby — a news post saying "The Club
keeps two homes online" whose bullets now both point here. I read the notes as
deliberately included and deliberately outside the record's rules, but the seam
is real and the repo knows it.

**Whether `weight` on governance means RONR's authority.** It does now: the
weights were reordered to Bylaws, Special Rules of Order, Standing Rules,
Officers, matching the rank RONR gives them and the Bylaws adopt in Article VI.
The residual doubt is worth recording, because the decision could reasonably go
the other way. Article VI is worded unusually — RONR governs "in all cases…not
inconsistent with these Bylaws or any Standing Rules" — and that sentence can be
read as the Club deliberately elevating its own Standing Rules, in which case the
previous order was right and the introductory claim was what wanted fixing.
Nothing turns on it while no Special Rule has been adopted.

**Whether the homepage's omission of minutes is principled.** Curation is stated
as the reason, and I have no evidence it is anything else — but the parallel
omission of notes had a reason that expired without anyone noticing, which is
enough to say this one is asserted rather than demonstrated.

**Whether `_default/list.html` and `_default/single.html` should exist.** Both are
currently unreached and kept as speculative generality. The `single.html` comment
was silently false for the entire life of the notes section, which is an argument
that a fallback nobody exercises is a fallback nobody can trust. I have no
evidence the current arrangement is wrong, only that it failed once in exactly
the way speculative generality tends to.

## Index of findings

None outstanding. This pass filed two — the undated-note gap and the governance
ordering question — and both were resolved in #118 and #119 before this document
was committed. The reasoning for each is in those commits.

---

_Generated by the `code-theory` skill. This document is not maintained: when it is
wrong enough to matter, regenerate it rather than patching it._
