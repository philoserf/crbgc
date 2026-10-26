# THEORY

This is what you need to hold in mind to change this system without damaging it. It is
not a tour of the files; `WALKTHROUGH.md` does that. It explains why the code is shaped
the way it is.

## What this system is for

The Common & Recent Bogeymens Golf Club is a parliamentary society. It has two Charter
Members, who are also its Captain and its Secretary-Treasurer. Its bylaws were adopted on
June 21 2026, and its parliamentary authority is _Robert's Rules of Order Newly Revised_.
This repository publishes the Club's **record**.

That word is the whole theory. This is not a golf blog with a bylaws page bolted on, and it
is not a documentation site. It is a body of documents that assert things about the Club's
own procedure. The software has one job: to stop those documents from asserting something
the Club cannot back up.

Read the build checks with that in mind and they stop looking like lint:

- A notice that never expires **keeps a meeting long past listed as pending business**.
- Minutes marked "Approved" with no approval date **assert a status that under RONR only a
  meeting can confer**. The date is what identifies that meeting.
- A citation to `/governance/bylaws/#article-v--meetings` that resolves to no heading
  **leaves the constitutional basis for an action unverifiable**.
- A retitled post that moves its own URL **breaks the citations that were true when they
  were written**.

Each of these is a way for the published record to lie. `validate-content.html` is not a
code-quality tool. It is what stands between a prose edit and a false record. A sibling
Hugo site that only had to "publish some Markdown" would have none of it.

## The entities, and the one that organizes them

There are five sections. What separates them is not their fields but **their relationship to
time**:

- **Governance** is atemporal. It holds the Bylaws, the Special Rules of Order, the Standing
  Rules, the Officers page and, since September 2026, the draft Rules of Golf. These
  documents carry no `date:` because they are continuously in force. Instead they carry
  `adopted` and `last_amended`, which are facts about the text rather than about when it
  was published. They are ordered by `weight`, which follows RONR's order of authority
  (10, 20, 30), with the draft and the officer roll after (35, 40).
- **Notices** look forward and have a lifespan. A notice exists to show that required notice
  was given _before_ business is transacted. Once the meeting has passed, its job is done
  and it has to come down. This is the only section whose membership in a listing changes
  with the clock.
- **Minutes** look backward, and their _truth status changes_. Draft versus Approved is a
  real parliamentary distinction, not a publishing workflow.
- **News and Notes** are dated and fixed. Their date is the only order they have.

Nearly every asymmetry in the site follows from that table, and the feed decisions are the
clearest case. The `_index.md` files carry them in frontmatter, each with its reason in a
comment. Governance sets `outputs: ["html"]` because a chronological feed of atemporal
documents means nothing. Notices set it because a feed is an archive and an archive cannot
hide expired items. The two requirements are incompatible, so the feed was dropped rather
than made wrong. Notes set it for a duller reason: the site feed already carries every
note. Minutes are grouped by year, governance is ordered by weight, and everything else is
ordered by date.

**`.Date` is the trap.** Hugo gives every page one date field, and in this domain it means
four different things:

- when a notice was _posted_, which is distinct from its `meeting_date`;
- when a meeting _happened_;
- when a news post was written;
- for the notes, a backdated position in a constructed sequence, in which a note is dated
  no earlier than the notes it cites (`.claude/rules/notes.md` has the history).

A maintainer who reasons about "the date" in general will eventually write a query that
means the wrong one.

**The draft in governance stretches the table.** The Rules of Golf sit among documents
"continuously in force" while governing nothing until the 2027 Annual Meeting votes on
them (#122). Nothing structural marks them as a draft. They carry no `draft:`, which would
unpublish them. The only difference a machine can see is the missing `adopted:`, and that
makes `governance/single.html` render no metadata at all, exactly as it does for the
Officers page. Their status lives in prose:

- a "Draft. Not adopted." paragraph;
- a description that says so;
- a matching revision notice at the head of the Standing Rules.

That is the right call for a document that must be readable before the vote. It also means
the record's integrity here rests on text the build does not check.

## The rule that decides most arguments

**Either the build checks a fact, or the repository does not keep it.** There is no third
option, and the history is a sequence of applying this rule.

Some fields were deleted because nothing could verify them:

- `slug:`, a second name for a URL that already had one;
- `tags:`, because taxonomy pages are disabled, so 300 entries rendered nowhere;
- `lastmod:`, which was hand-written, and whose only consumer went away;
- `authority:`, a bylaw citation in frontmatter that duplicated one in the body, which the
  fragment checker actually resolves.

Other rules were promoted into `validate-content.html` because they had to exist:

- the identity between title, filename and URL;
- the requirement that every internal link resolve;
- the notice expiry rules;
- the approval pair on minutes;
- the `notice_type` and `meeting_type` vocabularies;
- the requirement that every non-governance post carry a date.

The date rule lived in prose the longest and failed the worst: silently, permanently and
invisibly, because the page still published.

Before you add a frontmatter field, answer that rule's question first. A field nobody can
check will eventually be wrong, and in a record that is the failure that matters.
`description:` is the one tolerated exception, and README says so: it feeds link previews,
every file carries one, and nothing enforces it.

**A corollary the repo learned three times: a rule enforced at creation time is not
enforced.** `.claude/skills/new-notice`, `new-minutes` and `new-news` scaffold correct
frontmatter. Issues #56, #61 and #112 each moved a rule out of a skill and into the build,
with the same argument: a skill cannot catch a hand-written file or an edit made in review.
Treat the skills as a convenience. The build is the contract.

**And the build is one string.** `wrangler.jsonc`'s `build.command` runs four steps:

1. a format check;
2. a CSS lint;
3. a validate pass with drafts and future posts included;
4. a clean production build.

It is the only definition of the gate. Workers Builds runs it on every push, on `main` and
on every other branch. `task deploy` runs it before deploying, and `task check` runs it
locally through `wrangler deploy --dry-run`. Until #170 the Taskfile held a second copy
that had already drifted from the first. That is why the explanations of each flag now live
in the comment above the command, not beside the tasks.

Two of those flags matter more than they look:

- **`-D --buildFuture` on the validate pass is load-bearing.** The validator iterates
  `.RegularPages`, so without them it would not see a post written ahead of time until the
  day it went live.
- **`--panicOnWarning` is there for Hugo's own warnings**, such as a template lookup
  failure, which would otherwise publish a broken section and exit 0. `errorf` is already
  fatal on its own.

## The validator's shape

`validate-content.html` is one partial, called once per build through `partialCached` from
the head of `baseof.html`. It renders nothing and either passes or `errorf`s. It makes three
passes.

**1. Wikilinks.** It scans every file for `[[`. This is not a general lint. It is border
control against the content system the notes came from (see the graft below).

**2. Citations.** It resolves every root-relative `](/path)` link against the site's pages,
matched by `RelPermalink`, and where a link carries a fragment it checks that the target page
has that heading. Both halves guard against a silent failure. A retitled post moves its URL,
so a link that still uses the old one would publish dead. Goldmark derives anchors from
heading text, so an edited heading would send every inbound citation to the top of the page.
Until #176 only fragment links were looked up, which was 9 of the 151 internal links. Only
real pages are in the lookup, so a link to an `aliases:` path fails too. That is
deliberate: the record should cite a document by its current address, and the alias exists
for readers arriving from outside.

**3. Per-page rules over every regular page,** sorted by file path. A rule that belongs to
one section is gated on `.Section`. Since #171 the loop does not name the sections it
checks, which settles two things:

- A new section is dated by default. The date rule reads "everything except governance",
  so a section that forgot its dates fails the build rather than passing.
- **A URL is owned, not first-come.** Only a page that passes the identity checks may claim
  its URL. A misnamed file already has its own error, and letting it claim the URL used to
  tell the published post that owns it to retitle, which is the very edit that moves a cited
  URL (#175).

The duplicate-URL check looks redundant beside the identity checks, but it is not. A copy of
a post in a subdirectory (`content/news/sub/x.md`) passes them and builds cleanly through
Hugo, and the duplicate check is the only thing that catches it. Sorting by path means the
same file is reported every time (#78).

## Time is evaluated at build time

This is a static site, so every statement that depends on the clock is true as of the last
build and no later. Two things depend on the clock:

- whether a notice is current: `notices-by-status.html` compares `expires` against `now`;
- whether a future-dated post exists at all: the production build omits `--buildFuture`.

Both change only when the site is rebuilt.

The rebuild clock is `worker.js`. Its only real job is the `scheduled` handler. A cron in
`wrangler.jsonc` fires it at 09:00 UTC every Monday, and it POSTs the Worker's own deploy
hook, so Workers Builds rebuilds `main`. Its `fetch` handler is a single line that sends
unmatched requests back to asset serving, which answers with Hugo's 404 page. The handler
has to exist, because a Worker with no `fetch` export fails every request that reaches the
script.

So publishing is weekly by design. A future-dated post appears on the first Monday on or
after its date, and any merge or `task deploy` publishes sooner. A notice therefore comes
down at the first rebuild on or after its `expires`, which can be several days later. That
does not matter, and when it would, the notice's `expires` is set to a Monday so it lines up
with the rebuild (#155).

The `expires` field means **the first day the notice is hidden**. Three places act on that
meaning, and each answers a different question:

- `notices-by-status.html` decides whether a notice is listed as current or expired.
- The validator decides whether the dates are coherent: `expires` must fall after
  `meeting_date`, and a meeting notice must carry an `expires`.
- `notices/single.html` decides what a reader is told: "Shown through", which is the day
  before `expires`.

They are not duplication to consolidate. They agree because README states the one meaning
they share.

## Where the boundaries are principled, and where they are scars

**Principled: the notices listing chokepoint.** `notices-by-status.html` is the only place
the expiry rule is computed. It returns `current` and `expired` and renders nothing. Every
listing reads from it: the section page, the homepage's three latest, and `/llms.txt`. The
partial is not an abstraction for reuse. It exists so that no caller can forget the rule;
issues #36 and #38 were both "someone queried the section directly". The site feed is the
one documented exception, and `home.rss.xml` carries a paragraph saying it is an exception
rather than a bug.

**Principled: governance is exempt from the identity rule.** In the four dated sections the
title _is_ the URL. `[permalinks]` uses `:slug`, which falls back to the normalized title,
and the filename is that same string written by hand. Governance is deliberately absent
from `[permalinks]`, so its URLs come from filenames and a prose retitle cannot move them.
That is exactly right for the documents everything else cites.

The exemption lives in `hugo.toml`, not in the validator. Since #178 every page gets two
checks, chained so that each cause reports one error:

1. the filename against the URL segment, which catches a retitle without a rename wherever
   the URL comes from the title;
2. the normalized title against the filename, which does the same wherever the URL comes
   from the filename.

For governance the first check is trivially true and the second does the work. The
validator names governance only once, to exempt it from the date rule. So whether a
section's URLs follow its titles is decided by one line in `[permalinks]`, and both choices
are checked.

**Principled: shared templates know nothing about sections.** After #164–#169, a
section-specific template exists only where the section has something of its own to say.
Governance, minutes and notices each keep a `single.html` that holds its metadata `<dl>`
inline. Minutes keep a `list.html` that groups by year, and governance a list ordered by
weight. News and notes, which have nothing beyond a date, render through `_default`.

What is shared reacts to the data, not to the section. `item-row.html` shows an
Approved/Draft badge when a page sets `approved`, which in practice means minutes. The
governance `<dl>` appears only when `adopted` or `last_amended` is set. The cost is that a
field name carries meaning across sections: a news post given an `approved:` field would
grow a badge.

**A scar that is now load-bearing: the notes are a graft.** They are 66 of the site's 77
regular pages, and they came from an Obsidian vault in another repository, which brought a
different set of conventions with it: wikilinks, `tags:`, `created:`, and index notes that
were pure lists of links. All of that was stripped on import, and the notes are now edited
here. But Obsidian remains a plausible editor for Markdown, and on every edit it will offer
to put tags and wikilinks back. Goldmark renders `[[Target]]` as literal brackets and exits
0, so without the wikilink check the failure would be silent and published.

**A scar that has healed into a gap: the templates have no formatter.** `bun fmt` formats
everything it can parse and Biome owns the CSS. `bunfig.toml` excludes `layouts/` and
`assets/` from `bun fmt`, and `bun fmt` also honors `.gitignore`. The templates are
hand-formatted. That removes a class of breakage, but leaves them with no mechanical guard
on layout. Some of their current shape is output from the abandoned Prettier plugin that
used to format them, now frozen: for example, a nav link's closing `</a` with its `>` on
the next line.

In two templates whitespace is output: `index.llms.txt` and `home.rss.xml`. There the
`{{-`/`-}}` trim markers are deliberate and must be maintained by hand. The old plugin also
left one durable habit: `baseof.html` computes Open Graph values into variables before
using them, so an inline `if/else` never sits inside a `content="…"` attribute where a line
break would become part of the value.

**Outside the repo: the Cloudflare side.** These exist only in Cloudflare:

- the Workers Builds connection;
- the branch deploy commands;
- `HUGO_VERSION=latest`;
- the `DEPLOY_HOOK` secret.

README's "Cloudflare settings" section is the only record of them. They cannot be moved
into the repo, because one is a secret and the rest are dashboard state. Hugo floats
deliberately, so a breaking release shows up as a failed build.

One smaller thing that bites: a Go template comment ends at the first `*/`, so no glob can
appear inside `{{/* … */}}`. Several comments in `layouts/` are long enough to invite one.

## What it accommodates, and what it does not

**Comfortable:**

- more notices, minutes, news and notes;
- amending a governing document: edit the text, bump `last_amended`, and record the vote in
  the minutes (the repo is explicitly _not_ the authoritative copy of adoption history);
- adding a governance document, including a draft, on the Rules of Golf pattern.

**A new dated section** is possible, and since #171 it is validated without being named. It
still touches places that nothing prompts:

- `[permalinks]`, if its URLs should follow its titles; without it they follow filenames,
  as governance's do;
- the nav slice in `baseof.html`;
- the explicit section calls in `index.llms.txt`;
- a feed decision in its `_index.md`.

Forgetting any of these leaves a visible gap rather than an unchecked one. An atemporal
section must also be added to the date rule's governance exemption, and the build says so.

**These would require rethinking something:**

- **Anything needing a real `lastBuildDate`.** It needs `enableGitInfo`, which dates files
  from git history, so it needs a build whose clone carries full history. A shallow clone
  dates every file to the deploy commit. `home.rss.xml` documents the cost.
- **Taxonomies.** `disableKinds` removes taxonomy and term pages, and the field vocabularies
  are queried directly in templates. Re-enabling them is not a config toggle; it reopens
  the decision that deleted `tags:`.
- **A notice that must be _retracted_ rather than expire.** The model has one way for a
  notice to end, and it is the clock.
- **Membership as data.** The Bylaws make the Secretary-Treasurer keeper of the roll, and
  the roll exists nowhere in this system; `officers.md` holds a hand-written Markdown
  table. **The system models documents, not the organization.** Anything that wants to
  compute over members (quorum, good standing, voting eligibility) is a new kind of thing
  here, not an extension.
- **Scoring.** The draft Rules of Golf are deliberately limited to how the ball is played;
  the bogey competition and scoring stay in the Standing Rules. The split is constitutional
  (the Standing Rules say what the Club is, the code says how the ball is played), so a
  request to "put scoring in the rules" is a governance question, not an edit.

**Where an uninformed maintainer does damage:**

- querying the notices section directly for a listing;
- adding a frontmatter field without deciding how it gets checked;
- reintroducing a second definition of the build gate;
- retitling a published post and fixing the build by renaming the file but not adding the
  old path under `aliases:` (the build checks the site's own links, but nothing can check
  links from outside);
- retitling a governance document without renaming the file;
- reusing `approved:` outside minutes;
- adopting the Rules of Golf by deleting the draft paragraph without also adding `adopted:`
  and applying the Standing Rules amendment (PR #133) in the same change.

## Uncertainties

These are marked plainly because the account is inferred from code, content and commit
messages rather than from anyone's stated intent.

**Whether the notes belong in the same site as the record.** They are prose, not record,
and the governance rules about amendment and minutes explicitly do not apply to them. They
now outnumber every other section combined, 66 to 11. The repo itself records an unresolved
editorial question nearby: a news post says "The Club keeps two homes online", and both of
its links now point here. I read the notes as deliberately included and deliberately outside
the record's rules, but the seam is real and the repo knows it.

**Whether `weight` on governance means RONR's authority.** It does now: Bylaws, Special
Rules of Order, Standing Rules, then the draft Rules of Golf and the Officers page. The doubt
is Article VI. It is worded so that RONR governs where "not inconsistent with these Bylaws or
any Standing Rules", which could be read as the Club deliberately ranking its Standing Rules
above Special Rules of Order. Nothing turns on this while no Special Rule has been adopted,
and the Special Rules of Order page says none has.

**Whether the homepage's omission of minutes is principled.** README gives curation as the
reason, and I have no evidence it is anything else. But the parallel omission of notes had
a reason that expired without anyone noticing, which is enough to call this one asserted
rather than demonstrated.

**Whether draft status in governance should become a checked fact.** The rule above says it
should, or the repo should not keep it. The Rules of Golf may be the only draft there will
ever be, and adopting them (#122) would remove the case. If drafts recur, "a governance page
without `adopted:` opens with the draft paragraph" is the rule that fits. I cannot tell from
the repo which future the Club expects.

**Whether Workers Builds clones shallowly.** It matters only to the `lastBuildDate` question
above, and I have not verified it either way.

---

_Generated by the `code-theory` skill. This document is not maintained: when it is wrong
enough to matter, regenerate it rather than patching it._
