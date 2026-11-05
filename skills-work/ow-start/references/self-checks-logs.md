# The logs' checklist

Before you hand a logs file over, check these. Fix what fails; the user may simply say to go ahead, except that a credential and a private name never go in.

- **Trace** (`-log-meeting`, `-log-decision`): every decision, action and open question cites a transcript time (the words are there, within ten seconds), a notes line or an attached source.
- **Owner and date** (`-log-meeting`): every action has an owner and a due date, or `no date: asked`.
- **No client text in STATUS** (`-log-meeting`, `-action`, `-log-decision`): a line holds only ids, owners, paths, dates and the forms in `references/logs-schema.md` §6. A description in the path or the action's words after `awaiting:` do not belong there.
- **Follow-up clean** (`-log-meeting`): the follow-up has no internal notes and none of our numbers (below).
- **No private names** (every verb): no private skill or business name, however it is spaced, hyphenated, underscored, joined or cased.
- **Index copies nothing** (`-log`): each indexed file shows its path, its header date and the one key its row names: no amount in any form, no person's name, no other header value and no body text.

## Follow-up clean: what "internal" means

An internal number is **ours only**:

- our effort and hours ("I spent six hours on this", "it took us most of a week");
- our rates ("at my usual rate", "our day rate");
- our costs, margin, profit or loss on the work ("this is costing us", "we lose money on it");
- multipliers and modifiers on our price;
- overruns against our own plan ("it ran past what we estimated").

Also kept out: anything under an internal marker, our working notes, ids, file names and tool words. A rate or a charge is ours with or without an amount ("our day rate", "my rate goes up", "I charge a premium", "we are over budget"). An idiom with no plain marker ("take a small hit") is yours to catch.

**Allowed** (the client's side): the client's schedule and dates ("your team will test in the week of 9 November"), the client's figures and ratios ("your team packs about 40 orders a week", "about 3% of orders need a second look"), the client's own costs ("last month's reshipping cost your business three pallets of tile"), payment terms and dates, and the length of the meeting ("thanks for the 30-minute call today").
