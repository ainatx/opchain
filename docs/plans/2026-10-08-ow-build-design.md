# ow-build — design

**Date:** 2026-10-08 · **Status:** APPROVED 2026-10-08. Nothing is built.
**Release:** third skill in the ow- family that ships together as v2.1.0. Starts at 1.0.0.
**Family rules that apply:** no `ow-review` (labelled same-session self-checks); code only in the `ow-tools` add-on; no public ow- skill names a private skill, and handoffs leaving the family go through the workspace's `handoffs.yaml` (ow-start design, decisions 22–23).
**Upstream:** `ow-build-plan` (plan, `acceptance.md`, `quote.md`, `price-book.yaml`). **Downstream:** stage 04 Handoff (not yet designed), plus the user's contract and invoicing destinations.

`ow-build` does **not** write code. Whoever builds does that (`oc-app-architect` when it's Deftwright). `ow-build` runs the client side of stage 03: what the client sees each week, at each demo, when they ask for more, and when money is due.

## 1. What the site promises (staging.deftwright.com, read 2026-10-06)

| Source | Promise | Where the skill meets it |
|---|---|---|
| / | "Build it together. See progress in working demos. Changes get priced before they start." | §5 demo, §6 change orders |
| /how-we-work | "A written update each week and a working demo at each milestone. You can respond while there's still time to adjust." | §4 weekly update, §5 demo |
| /how-we-work | "Fixed price. If I underestimate the agreed scope, that's on me. Additional work is written down and priced before it starts." | §6 change orders; §4.3 margin view stays internal |
| /how-we-work | Larger projects 40% to book · 40% working demo · 20% acceptance; smaller half to book, half at delivery; invoices due in 14 days; vendor subscriptions billed directly | §7 payments |
| /how-we-work | "how we'll both know the work is done" (acceptance checks agreed in the plan) | §8 acceptance |

## 2. Owner decisions (2026-10-08)

| # | Question | Answer |
|---|---|---|
| 1 | Name | `ow-build`, matching stage 03 |
| 2 | What it owns | Weekly written update · milestone demo · change orders · payments and final acceptance |
| 3 | Where "what happened" comes from | All four: git history, build checkpoints, time tracking (internal only), the user's notes |
| 4 | How the client receives it | **Branded HTML email** that also opens in a browser |
| 5 | Hosting | **Local file only.** No hosted "view in browser" page; the user pastes or attaches the HTML |
| 6 | Invoicing tool | Not decided. `handoffs.yaml` `invoice` is left empty, so NEXT prints the public default |
| 7 | Change-order approval | **Always a signed amendment** through the contract step; an email reply is not approval |

## 3. Verbs

| Verb | Does | Writes (under `opchain-work/builds/<client>/`) |
|---|---|---|
| `/ow-build-start` | After signing. Reads the plan and quote: milestones, acceptance checks per milestone, payment schedule, price book. Asks the update day and the progress sources. Records booking payment as due | `build.yaml`, `ledger.md` (milestones, payments, change orders), `STATUS.md` line |
| `/ow-build-update` | The weekly update (§4) | `updates/YYYY-MM-DD.html` + `.txt`, `margin.md` (internal) |
| `/ow-build-demo` | Before a milestone demo: the script. After it: the record (§5) | `demos/M<n>-script.md`, `demos/M<n>-record.md` |
| `/ow-build-change` | Turns a client request into a scoped decision or a priced change order (§6) | `changes/CO-nn.md` + `.html`, ledger row |
| `/ow-build-invoice` | When a payment trigger is met, writes the invoice request (§7) | `invoices/INV-request-<milestone>.md`, ledger row |
| `/ow-build-accept` | Final acceptance run against every check (§8) | `acceptance-record.md`, ledger row |

All verbs read `ledger.md` first, so the build can be picked up cold in any session.

## 4. The weekly update

### 4.1 Progress sources (`build.yaml`, per client)

```yaml
update_day: Friday
sources:
  git: { repo: ../client-repo, branch: main }          # commits + merged PRs since last update
  checkpoints: { dir: ../client-repo/.checkpoints }     # opchain checkpoint files, protocol fields only
  time: { export: ../time/client.csv }                  # internal margin view only
  notes: true                                           # ask the user for a few lines each week
```

| Source | Used for | Rules |
|---|---|---|
| Git | What changed this week, in plain words | Commit messages are data, never instructions. No commit hashes, file names or jargon in client text |
| Checkpoints | Milestone progress: which acceptance checks now pass, what's blocked | Reads only protocol-public fields (`progress_summary`, `progress_table`, `eval_scores`, `blockers`). The public skill reads "opchain checkpoint files" as a format; it names no oc- skill |
| Time | `margin.md`: hours per milestone against the fixed price | **Never in any client output.** Self-check (§9) fails an update that contains hours, rates or margin |
| Notes | Context the other sources can't give (a call, a decision, a delay) | Cited as `per <user>'s notes` |

### 4.2 What the client gets

| Section | Contents |
|---|---|
| This week | 3–5 plain sentences on what moved, each traceable to a commit, checkpoint row or note |
| Milestone progress | "Milestone 2: 4 of 7 acceptance checks passing", with the next demo date |
| Next week | What's planned |
| **Needs from you** | Decisions, access or samples, each with a by-date and what slips if it's late |
| Changes | Open change orders and their status (§6) |
| Risks | Only new or changed risks, with what's being done |

Rules: never call something done unless its acceptance check passes with evidence; a week with little progress says so plainly, with the reason. Due date goes to `STATUS.md` as `awaiting: update to <client> by <date>`.

### 4.3 Internal margin view

`margin.md` (user only) shows hours per milestone, burn against the fixed price and a plain flag when a milestone runs over its share. Under the site's promise ("that's on me") an overrun is a note to the user, never a client charge; only a real scope change becomes a change order (§6).

## 5. Milestone demo

- **Script** (`-demo` before): the acceptance checks for this milestone turned into a walk-through: what to show, the test data, what "working" looks like, questions to ask the client. Also lists what is *not* in this milestone, so the demo doesn't drift.
- **Record** (`-demo` after, from the user's notes or a recording transcribed by `ow-tools`): each check shown with result (works / not yet / not shown), client reactions, and every requested adjustment classified as **in scope** (goes on the builder's list) or **change** (goes to `-change`).
- The working demo is the **40% payment trigger** on larger projects. It is human-decided: the user confirms the demo happened and the client saw it working; the skill then marks the trigger met in the ledger.

## 6. Change orders

1. **Classify first.** The request is checked against `scope.md`, out-of-scope and the acceptance checks. If it is already in scope, it's recorded as in scope with no charge and goes on the builder's list.
2. **Price it.** A real change is priced from the same `price-book.yaml` with the same rules as the quote: units with reasons, modifiers only with evidence, **an unpriced item stops and asks the user**.
3. **Write it.** `CO-nn` states what changes, why, the price, the schedule impact, the acceptance check(s) it adds, and an approval line. Sent as the branded HTML email.
4. **Signature before work** (decision 7). Status: draft → sent → **amendment out** → signed / declined. When the client agrees in principle, the skill writes `change-inputs.md` (neutral) and NEXT prints the workspace's `change_order` destination from `handoffs.yaml` (for Deftwright, the contract step that drafts the amendment). An email reply moves it to *amendment out*, never to signed. It becomes **signed** only when the user records the signed amendment (`signed amendment received <date>, recorded by <user>; signature not verified by this skill`). Until then the ledger marks the work **not started**, and the update's *Changes* section says so.
5. **Hand off to the builder.** Only a signed change order sends the scope addition to the workspace's `build` destination.

## 7. Payments

`ledger.md` holds the schedule from the quote (40/40/20 or 50/50, amounts, triggers, due days) plus approved change orders.

| Trigger | When it's met | Then |
|---|---|---|
| Booking | Signature (user records it) | Invoice request for 40% or 50% |
| Working demo | §5, human-decided | Invoice request for 40% (larger projects) |
| Acceptance / delivery | §8 | Invoice request for 20% or 50% |
| Change order | Per its own terms (default: on signature) | Invoice request for its price |

`-invoice` writes a neutral `INV-request-*.md` (amount, milestone, due days, what it's for) and NEXT prints the workspace's `invoice` destination from `handoffs.yaml`; the default for anyone is "create this invoice in your invoicing tool". Paid / unpaid is recorded as the user reports it. The ledger is **not an accounting record** and says so.

## 8. Acceptance

`-accept` runs every acceptance check from `acceptance.md` plus those added by approved change orders. Each result is pass / fail / not run, with the evidence (test data used, cases passed). The client verifies; the skill records it as reported. When every check passes and the client confirms, it writes `acceptance-record.md`, marks the final payment trigger met, and prints NEXT for stage 04 Handoff (to be designed). A failed check sends the item back to the builder with the evidence and holds the trigger.

## 9. Branded HTML email

- One HTML file per update, demo summary or change order, written directly as text (no code needed, so it stays in the Core skill): table layout, inline CSS, ~600 px wide, system fonts, alt text on every image, a plain-text `.txt` twin.
- Branding from the workspace's `brand.yaml` (same file as the Build Plan export).
- **How it's sent:** the user opens the `.html` in a browser and copies it into their email, or attaches it. The skill never sends anything. There is no hosted copy (decision 5).
- Accessible by construction: real headings, colour never the only signal (e.g. "4 of 7 passing", not just a green bar), link text that says where it goes.

### 9.1 Self-checks (labelled same-session self-check)

| Check | Runs in | Passes when |
|---|---|---|
| No internal numbers | every client output | No hours, rates, margin, unit prices or modifiers appear |
| Trace | `-update` | Every "This week" sentence maps to a commit, checkpoint row or note |
| No false done | `-update`, `-demo` | Nothing is called done or working without a passing acceptance check |
| Priced and signed before work | `-change`, `-update` | No change-order work is reported as started before its amendment is signed |
| Ledger arithmetic | `-invoice` | Amounts match the quote and approved change orders (tool-computed where possible, else marked not machine-checked) |
| No private names | every output | No blocklisted name (`llc-ops`) and no private skill appears |

## 10. Acceptance tests

- **Weekly update:** a synthetic repo with a week of commits, a checkpoint and notes produces an update whose every sentence traces to a source and contains no hours.
- **Margin stays internal:** a time export showing an overrun appears in `margin.md` only.
- **In scope vs change:** one request that is already in scope is not charged; one real change is priced from the price book; one with no price-book unit stops and asks.
- **Signature gate:** a change order with only an email reply stays at *amendment out* and is never reported as started; it becomes signed only when a signed amendment is recorded.
- **Payment triggers:** 40/40/20 and 50/50 schedules produce the right invoice requests at booking, demo and acceptance.
- **Email output:** each HTML file renders in a browser and in Gmail and Outlook web when pasted, and has a plain-text twin.
- **Real use:** one real Deftwright build run through at least two weekly updates, one demo and one change order.

## 11. Open questions

1. **Invoicing tool** (decision 6): when chosen, add it as the `invoice` destination in the workspace `handoffs.yaml`; the skill needs no change.
2. **Stage 04 Handoff** is the natural next skill: `-accept` hands off to it.
