---
paths:
  - "content/notes/**"
---

# Dating the notes

Loaded when working under `content/notes/`. The rule it serves is stated in the root `CLAUDE.md`: a note gets a `date:` no earlier than any note it cites, and no `draft:`.

**All 65 notes are published, dated one per day** — `2026-06-21` through `2026-09-16`, founding day to the day the dating was done. No note is a draft and none shares a date with another. The run pauses between `2026-07-31` and `2026-08-24`; the three August news posts sit in that gap, so the Club's actual August interrupts the backfill rather than being buried under it.

The dates are backdated rather than scheduled, and that is what makes the section coherent: every one is in the past, so they published together on a single build with no window in which a live note pointed at one that had not appeared yet.

Two different orders produced them, and both are deliberate. The first 41 — every note reachable by a link from the notes about the Club or its kindred clubs — are ordered by the link graph. The 65 notes carry 124 links among themselves, and the seven notes about the Club sit at the top of it: their closure is 38 of those 41. So the reference layer takes the earliest dates and the Club's own notes fall on 19–28 July, which is why `commons-day` reads as later than `history-of-public-golf-in-america` even though the Club is the point. Reversing that would have been the natural instinct and the wrong one; as a staged rollout it cost 625 dead-link-days against 30.

The remaining 24, which no note linked to, are ordered as an argument instead: the old rules and how the game is contested, then what a course should be, then the ground the Club actually plays, then the writing and the modern reckoning — ending on `the-endless-golf-equipment-fee`.

**The invariant both orders keep: a note is dated no earlier than the notes it cites.** One citation breaks it, `hickory-era-golf-writing-survey` → `american-golf-writing-19501970`, because the two cite each other and the hickory era genuinely precedes 1950. Seven such mutual clusters exist among the first 41. Preserve this rule when dating anything new: it is what lets the dates be read as a sequence rather than a shuffle.

Adding a note now means giving it a `date:` and no `draft:`. The two move together, and the build now enforces the first half: a post in any dated section without a `date:` fails `validate-content.html`. It used to build clean and exit 0 while `home.rss.xml`, which selects on `PublishDate.IsZero`, dropped it from the feed permanently and `item-row.html` rendered its list row as "January 1, 0001". A date without dropping `draft:` still does nothing at all — that half is unenforceable, since a draft is not built. Note also that `validate-content.html` cannot see a draft or a future-dated page, so its filename-matches-URL check reaches a note only once that note is live.

One consequence, intended:

- **`layouts/notes/list.html` orders `ByDate.Reverse`**, as every other dated section does. It ordered `ByTitle` for as long as the notes shared a single date, when date order would have been arbitrary. So the list page now leads with the 24 argument-ordered notes, `the-endless-golf-equipment-fee` first, and ends on the reference layer — the reverse of the order that produced the dates.
