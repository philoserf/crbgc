# THEORY

What you need to hold in mind to change this system without damaging it. Not a
tour of the files — `WALKTHROUGH.md` does that. This is the account of why the
code is shaped the way it is.

## What this system is for

The Common & Recent Bogeymens Golf Club is a parliamentary society: two Charter
Members, who are also its Captain and its Secretary-Treasurer, bylaws adopted
June 21 2026, and _Robert's Rules of Order Newly Revised_ as its parliamentary
authority. This repository publishes the Club's **record**.

That word is the whole theory. This is not a golf blog with a bylaws page bolted
on, and it is not a documentation site. It is a body of documents that assert
things about the Club's own procedure, and the software's single job is to keep
those documents from asserting something the Club cannot substantiate.

Read the build checks with that in mind and they stop looking like lint:

- A notice that never expires **keeps a meeting long past listed as business
  pending before the Club**.
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
  Officers, and — since September 2026 — the draft Rules of Golf. They have no
  `date:` because they are continuously in force; they carry `adopted` and
  `last_amended` instead, which are facts about the text rather than about its
  publication. They are ordered by `weight`, an editorial rank that now follows
  RONR's order of authority, not chronology.
- **Notices** — forward-looking, with a lifespan. A notice exists to establish
  that required notice was given _before_ business is transacted; once the
  meeting passes, its job is done and it has to come down. This is the only
  section whose membership in a listing changes with the clock.
- **Minutes** — backward-looking, and their _truth status changes_. Draft versus
  Approved is a real parliamentary distinction, not a publishing workflow.
- **News and Notes** — dated and immutable. Chronology is all they have.

Nearly every asymmetry in `layouts/` follows from that table. Governance emits no
feed because a chronological feed of atemporal documents is meaningless. Notices
emit no feed because a feed is an archive and an archive cannot hide expired
items — the two requirements are incompatible, so the surface was dropped rather
than made wrong. Minutes group by year; governance orders by weight; the rest
order by date. (Notes also emit no section feed, for a duller reason: the site
feed already carries every one.)

**`.Date` is the trap here.** Hugo gives every page one field, and in this domain
it means four different things: when a notice was _posted_ (distinct from
`meeting_date`), when a meeting _happened_, when a news post was written, and —
for the notes — a backdated position in a constructed sequence, in which a note
is dated no earlier than the notes it cites. A maintainer who reasons about "the
date" generically will eventually write a query that means the wrong one of
those.

**The draft in governance stretches the table.** The Rules of Golf sit among the
documents "continuously in force" while governing nothing until the 2027 Annual
Meeting votes (#122). Nothing structural marks them as a draft: they carry no
`draft:` (which would unpublish them), and the only machine-visible difference
is the absence of `adopted:`, which makes `governance-meta.html` render no dates
at all — the same thing it does for the Officers page. Their status lives in
prose: a "Draft. Not adopted." paragraph, a description that says so, and a
matching revision notice at the head of the Standing Rules. That is the right
call for a document that must be readable before the vote, but it means the
record's integrity here rests on text the build does not check.

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

**And the build is one string.** `wrangler.jsonc`'s `build.command` — format
check, CSS lint, a validate pass with drafts and future posts included, then a
clean production build — is what Workers Builds runs on every push, on `main`
and on every other branch alike, and what `task deploy` runs from a Mac. There is
no path to the live site that skips it. The `-D --buildFuture` on the validate
pass is load-bearing: without it the validator, which iterates `.RegularPages`,
would not see a post written ahead of time until the day it went live. And
`errorf` is fatal on its own; `--panicOnWarning` is there for Hugo's own
warnings, such as a template lookup failure, which would otherwise publish a
broken section and exit 0.

## Time is evaluated at build time

This is a static site, so every statement that depends on the clock is true as
of the last build and no later. Two things here depend on the clock: whether a
notice is current (`notices-by-status.html` compares `expires` against `now`),
and whether a future-dated post exists at all (the production build omits
`--buildFuture`). Both move only when the site is rebuilt.

The rebuild clock is `worker.js`. Its only real job is the `scheduled` handler,
which a cron in `wrangler.jsonc` fires at 09:00 UTC every Monday; it POSTs the
Worker's own deploy hook, and Workers Builds rebuilds `main`. So publishing is
weekly by design — a future-dated post appears on the first Monday on or after
its date — and any merge or `task deploy` publishes sooner.

A notice therefore comes down at the first rebuild on or after its `expires`,
which can be a few days later. That does not matter, and when it would, the
notice's `expires` is set to a Monday to match the rebuild (#155).

## Where the boundaries are principled, and where they are scars

**Principled: the notices listing chokepoint.** `notices-by-status.html` is the
only place the expiry rule is computed, and every listing goes through it —
`latest.html` branches on section specifically to route notices through it, and
`/llms.txt` takes its notices from the same partial. The partial is not an
abstraction for reuse; it exists so that no caller can forget. Issues #36 and #38
are both "someone queried the section directly." The site feed is the one
documented exception, and `home.rss.xml` carries a paragraph explaining that it
is an exception rather than a bug.

**Principled: governance is exempt from the identity rule.** In the four dated
sections the title _is_ the URL — `[permalinks]` uses `:slug`, whose fallback is
the normalized title, and the filename is that string written by hand.
Governance is deliberately absent from `[permalinks]`, so its URLs derive from
filenames and a prose retitle cannot move them. That is exactly right for the
documents everything else cites, and it is why the build checks governance in
the opposite direction: normalized title against filename, rather than filename
against URL.

**A scar that is now load-bearing: the notes are a graft.** Most of the site's
pages came from an Obsidian vault in another repository, carrying a different
ontology — wikilinks, `tags:`, `created:`, index notes that were pure link
lists. That ontology was stripped on import, and the notes are now edited here.
But Obsidian remains a plausible editor for Markdown, and it will offer to put
tags and wikilinks back on every edit. The wikilink check in
`validate-content.html` is not a general lint; it is border control against the
content system the notes came from. Goldmark renders `[[Target]]` as literal
brackets and exits 0, so without the check the failure is silent and published.

**A scar that has healed into a gap: the templates have no formatter.**
For most of the site's life `layouts/` was formatted by an abandoned Prettier
plugin that was non-idempotent and would have been silently mangled by
Prettier 4. That was retired in #150: `bun fmt` now formats everything it can,
Biome owns the CSS, and `bunfig.toml` excludes `layouts/` and `assets/` from
`bun fmt`. The templates are hand-formatted, which removes a class of breakage
but leaves them with no mechanical guard on layout at all, and some of their
current shape — a nav link's closing `</a` with its `>` on the next line — is
the old plugin's output, frozen. Whitespace is output in two of them,
`index.llms.txt` and `home.rss.xml`, where the `{{-`/`-}}` trim markers are
deliberate and must be kept by hand. Formatter exclusions belong in
`bunfig.toml`, never in `.prettierignore`, **which is a symlink to
`.gitignore`**, so an entry there would also stop git tracking the file. The old
plugin also shaped one durable habit: `baseof.html` computes Open Graph values
into variables before use, so an inline `if/else` never sits inside a
`content="…"` attribute where a line break would become part of the value.

**Historical, and recorded rather than enforced: the build lives in two places.**
`build.command` repeats the commands of `task check`, `task validate` and
`task build` rather than calling them, and a comment in `Taskfile.yml` asks that
the two be kept in step. Likewise the Workers Builds connection, the branch
deploy commands, `HUGO_VERSION=latest` and the `DEPLOY_HOOK` secret exist only
in Cloudflare; README's "Cloudflare settings" is the only record of them. Neither
boundary is principled, and nothing checks either one.

One smaller thing that bites: a Go template comment ends at the first `*/`, so no
glob can appear inside `{{/* … */}}`. Several comments in `layouts/` are long
enough to invite one.

## What it accommodates, and what it does not

**Comfortable:** more notices, minutes, news and notes; amending a governing
document (edit the text, bump `last_amended`, record the vote in the minutes —
the repo is explicitly _not_ the authoritative copy of adoption history); adding
a governance document, including a draft, on the Rules of Golf pattern. A new
dated section is possible but touches more than it looks: `[permalinks]`, the
`validate-content.html` loop, the five hand-written nav links in `baseof.html`,
the explicit section calls in `index.llms.txt`, and a decision about its feed —
and nothing prompts any of them.

**Would require rethinking something:**

- **Anything needing a real `lastBuildDate`.** It needs `enableGitInfo`, which
  dates files from git history, so it needs a build whose clone carries full
  history; a shallow clone dates every file to the deploy commit.
  `home.rss.xml` documents the cost.
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
checked; putting a formatter exclusion in `.prettierignore`; changing
`build.command` without the Taskfile, or the reverse; deleting a `_default/`
template because a comment calls it a fallback; retitling a governance
document; or adopting the Rules of Golf by deleting the draft paragraph without
also adding `adopted:` and applying the Standing Rules amendment in the same
change.

## Uncertainties

Marked plainly, because this is inferred from code, content and commit messages
rather than from anyone's stated intent.

**Whether the notes belong in the same site as the record.** They are prose, not
record; the governance rules about amendment and minutes explicitly do not apply
to them; and they now outnumber every other section combined, 66 to 11. The repo
itself records an unresolved editorial question nearby — a news post saying "The
Club keeps two homes online" whose bullets now both point here. I read the notes
as deliberately included and deliberately outside the record's rules, but the
seam is real and the repo knows it.

**Whether `weight` on governance means RONR's authority.** It does now: Bylaws,
Special Rules of Order, Standing Rules, then the draft Rules of Golf and Officers.
The doubt worth recording is Article VI, worded so that RONR governs where "not
inconsistent with these Bylaws or any Standing Rules" — which can be read as the
Club deliberately elevating its Standing Rules above Special Rules of Order.
Nothing turns on it while no Special Rule has been adopted, and the Special Rules
of Order page says none has.

**Whether the homepage's omission of minutes is principled.** Curation is stated
as the reason, and I have no evidence it is anything else — but the parallel
omission of notes had a reason that expired without anyone noticing, which is
enough to say this one is asserted rather than demonstrated.

**Whether `_default/list.html` and `_default/single.html` should exist.** Both are
unreached and kept as speculative generality. The `single.html` comment was
silently false for the entire life of the notes section (#111), which is an
argument that a fallback nobody exercises is a fallback nobody can trust. I have
no evidence the current arrangement is wrong, only that it failed once in
exactly the way speculative generality tends to.

**Whether Workers Builds clones shallowly.** It matters only to the
`lastBuildDate` question above, and I have not verified it either way.

---

_Generated by the `code-theory` skill. This document is not maintained: when it is
wrong enough to matter, regenerate it rather than patching it._
