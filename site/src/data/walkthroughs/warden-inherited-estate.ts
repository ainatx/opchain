import type { Walkthrough } from "./types";

/**
 * Mandate: inherited estate and documentation — five captured requisitions,
 * every one of which means an org somebody else built and nobody documented.
 *
 * Keeps the shape of the old legacy-revive scenario, which was the most honest
 * thing on the demo floor, and swaps the substrate from a Rails monolith to the
 * undocumented CRM org these requisitions actually inherit.
 */
export const wardenInheritedEstate: Walkthrough = {
  id: "warden-inherited-estate",
  title: "Nine hundred custom fields and nobody left who knows why",
  tagline: "Document it before she leaves",
  summary:
    "An undocumented Salesforce org, 40 flows with no owner, four validation rules that contradict each other, and the only person who understands it leaves in three weeks. The board still wants territory planning shipped.",
  description:
`Warden Software's CRM org has grown for six years under one administrator. She is leaving in three weeks. There is no documentation, 900 custom fields of which nobody can say how many are used, 40 flows with no stated owner, and four validation rules that contradict each other on the same object.

The board wants territory planning shipped this quarter, which is the wrong instinct and also not negotiable.

\`oc-reverse-spec\` reconstructs the object model, field lineage and automation map from metadata rather than from memory — and the field census is the finding: **312 of 900 custom fields have been written to zero times in 24 months**, and 71 are referenced by automation but never populated, which is the shape of a silent failure rather than dead weight.

\`oc-app-architect\` scopes territory planning against that reconstruction, and the scope conversation happens once, in writing, because "while you're in there" is the mechanism by which a three-week window becomes a three-month one.

\`oc-qa-ops\` writes the regression pyramid the org never had — six years of changes with no test at any layer — and \`oc-docs-forge\` turns the reconstruction into documentation that survives her last day. \`oc-repo-ops\` stands the readiness gate, which fails once on metadata the reconstruction had drifted from.`,
  inputs: [
    "A six-year-old Salesforce org built by one administrator, no documentation",
    "900 custom fields, 40 flows with no owner, 4 mutually contradictory validation rules",
    "Three weeks of that administrator's remaining time",
    "A board commitment to ship territory planning this quarter",
    "No tests at any layer, ever",
  ],
  skills: [
    "oc-reverse-spec",
    "oc-app-architect",
    "oc-qa-ops",
    "oc-code-auditor",
    "oc-docs-forge",
    "oc-repo-ops",
  ],
  runtime: "16 exchanges",
  outputs: [
    {
      id: "census",
      label: "Field census and automation map",
      kind: "spec.md",
      body:
`## Org reconstruction — field census
**Method:** metadata API + 24 months of field-history and audit-trail data · **Not:** interviews

## Custom fields — 900
| Category | Fields | Note |
| --- | --- | --- |
| Written and read, last 90d | 341 | Live |
| Written, never read by any report/automation | 104 | Collected and unused |
| **Never written, 24 months** | **312** | Dead |
| **Referenced by automation, never populated** | **71** | **Silent failures** |
| Formula/rollup, no dependents | 72 | Dead |

## The 71
These are the finding. Each is read by a flow, validation rule or formula, and has never held a value in 24 months. The automation that reads them is not erroring — it is taking the null branch, silently, every time.

Three examples:

| Field | Read by | Effect of always-null |
| --- | --- | --- |
| \`Partner_Tier__c\` | Discount validation rule | Partner discounts have never been validated |
| \`Renewal_Risk__c\` | CS alert flow | The renewal alert has never fired |
| \`Compliance_Review_Date__c\` | Escalation flow | Escalation never triggers |

**The renewal alert flow has existed for four years and has never fired once.** CS believes it works. Nobody had a reason to check a thing that does not error.

## Flows — 40
| State | Count |
| --- | --- |
| Active, fires regularly | 19 |
| Active, has never fired | **7** |
| Active, superseded by a later flow but still enabled | **5** |
| Inactive | 9 |

The five superseded flows are the risk. Both old and new run on the same object; the new one wins on field-level outcome for most records, and the old one wins in a narrow case nobody has characterised. That is not documented anywhere and the administrator's account is "I think the old one only matters for renewals."

## The four contradictory validation rules
All four on Opportunity, all active:

| Rule | Requires |
| --- | --- |
| VR-011 | Close date within 90 days when stage = Commit |
| VR-023 | Close date any future date when amount > 100k |
| VR-031 | Close date within current fiscal year, always |
| VR-044 | No close-date constraint when \`Bypass_Validation__c\` |

VR-011 and VR-031 conflict for any Q4 opportunity closing in January. Reps resolve it by ticking \`Bypass_Validation__c\`, which VR-044 permits for everything. **The bypass field is set on 31% of opportunities**, which means validation is advisory for a third of the pipeline and nobody planned that.

## What this reconstruction is not
It is not a design. It is what the org *does*, derived from metadata and history rather than from anyone's account of it — including hers. Where her memory and the metadata disagree, the metadata is recorded and the disagreement noted.`,
    },
    {
      id: "scope",
      label: "Territory planning — charter and what is out",
      kind: "charter.md",
      body:
`## Charter — territory planning
**Window:** 3 weeks with the outgoing admin, then without her · **Sponsor:** VP Sales Ops

## Problem
Territories are maintained in a spreadsheet and applied to Salesforce by hand each quarter. The last carve took nine days and produced 40 accounts assigned to two owners.

## In scope
1. Territory model as data — rules, not a spreadsheet
2. Assignment on account create/update
3. A dry-run report before any carve is applied
4. Conflict detection — the 40-double-owner class made impossible by construction

## Explicitly out of scope
Named because each was proposed during scoping, and a three-week window survives exactly one round of "while you're in there":

| Proposed | Verdict |
| --- | --- |
| Fix the 4 contradictory validation rules | **Out** — separate change, needs sales leadership on the bypass question |
| Delete the 312 dead fields | **Out** — safe but unbounded; own ticket |
| Fix the 71 silent-failure fields | **Out of this charter, escalated today** — see below |
| Rebuild the renewal alert flow | **Out** — belongs to CS, who do not yet know it never fired |
| Consolidate the 5 superseded flows | **Out** — needs the narrow case characterised first |

## The escalation that cannot wait
The 71 silent-failure fields are out of *this* charter and are not being deferred quietly. Two need a decision this week regardless of territory planning:

- **\`Partner_Tier__c\`** — partner discounts have never been validated. That is a revenue-leakage question for Finance, today.
- **\`Compliance_Review_Date__c\`** — a compliance escalation flow that has never escalated. That is a control that does not exist and is believed to.

Scoping them out of the build is correct. Leaving them undisclosed until the admin has gone would not be.

## Reversibility
Territory rules are data. A bad carve is corrected by editing rules and re-running the dry run; assignment writes are reversible from the dry-run diff for 30 days.

## Definition of done
Rules in version control, a dry run a human approves before any write, zero double-owned accounts by construction, and documentation good enough that the next carve is run by someone who has never met the administrator.`,
    },
    {
      id: "pyramid",
      label: "Test strategy for an org that has never had one",
      kind: "config.yaml",
      body:
`## .opchain/qa.yaml — first test strategy in six years
**Constraint:** three weeks of the only person who knows what correct looks like

## The sequencing decision
The instinct is to test the new territory code. The higher-value move is to **characterise existing behaviour while she is still here**, because after she leaves nobody can tell you whether a behaviour is a feature or a bug.

\`\`\`yaml
version: 1
pyramid:
  # Written FIRST, in week 1, while the admin can adjudicate
  characterisation:
    target: the 5 superseded flows + 4 validation rules
    budget: 4 days of admin time
    principle: >
      Assert what the org does today, not what it should do. A
      characterisation test that fails later means behaviour changed —
      which is exactly the alarm nobody has had for six years.

  unit:
    target: territory rule evaluation
    coverage: 0.85
    includes: [boundary cases, overlapping rules, no-match fallthrough]

  integration:
    target: assignment on create + update, dry-run diff generation
    coverage: 0.70

  contract:
    target: the 12 fields territory planning reads
    # fails if a field this depends on is deleted, retyped, or
    # becomes one of the 71
    enforced: true

  e2e:
    target: full carve on a sandbox copy of production
    frequency: before each quarterly carve
    count: 1        # deliberately one; e2e here is slow and brittle

coverage:
  global: 0.75
  enforce: warn     # not fail — an org with zero tests should not
                    # start with a gate that blocks every commit
\`\`\`

## Why characterisation first
Four days of her time produces tests that outlive her. Four days of her time answering questions produces answers that live in someone's notes.

The five superseded flows are the case in point. Nobody can characterise the narrow case where the old flow wins — but a characterisation test over 500 real records **records** the behaviour whether or not anyone understands it. When someone finally deletes the old flow, the test tells them exactly which records change.

## Why \`enforce: warn\`
An org with zero tests that starts with a blocking coverage gate gets the gate bypassed in week two, and then it is decoration. Warn now, revisit at 12 weeks with real data on where coverage actually lands.`,
    },
    {
      id: "handover",
      label: "Documentation set that survives her last day",
      kind: "spec.md",
      body:
`## Handover documentation
**Audience:** the administrator who has not been hired yet · **Test:** can a stranger run the next carve

## What was written
| Doc | Answers |
| --- | --- |
| \`org-map.md\` | What objects exist, what they are for, what writes to them |
| \`field-census.md\` | All 900 fields: live, dead, collected-unused, silent-failure |
| \`automation-map.md\` | 40 flows: trigger, effect, last fired, supersedes/superseded-by |
| \`validation-rules.md\` | The 4 rules, the conflict, and the 31% bypass |
| \`territory-planning.md\` | The new capability: rules, dry run, how to run a carve |
| \`adr/0001-territory-as-data.md\` | Why rules-as-data rather than a spreadsheet |
| \`adr/0002-bypass-field.md\` | What \`Bypass_Validation__c\` is, why it exists, why it is a problem |
| \`open-questions.md\` | **What she could not answer** |

## The last one is the important one
\`open-questions.md\` records what remains unknown after three weeks with the person who built it:

> **Why does flow \`Opp_Renewal_Legacy\` still run?** Superseded in 2024 by \`Opp_Renewal_v2\`. Her recollection is "it only matters for renewals" but she cannot say which. Characterisation test \`char-flow-011\` records the current behaviour over 500 records. Do not delete without running it.
>
> **Why is \`Account_Segment_Old__c\` still populated by an integration?** The integration is owned by a vendor whose contract ended in 2025. It still writes daily. Nobody knows what reads it. Nothing in this org does.
>
> **What was VR-023 for?** Introduced 2023-04, no ticket, no comment. It contradicts VR-031. Her recollection is that it was a request from a sales leader who has left.

Three unknowns, written down, each with what is known and what was tried. **That is worth more than a confident guess**, and it is the difference between a successor inheriting a map with three marked gaps and inheriting a map that is quietly wrong in three places.

## What the docs deliberately do not do
They do not describe the org as it should be. Several documented behaviours are bad — the bypass field, the superseded flows, the vendor integration. Documenting them as they are makes them fixable; documenting an idealised version makes the doc wrong on day one and useless by week three.`,
    },
    {
      id: "gate",
      label: "Readiness gate — fails once on reconstruction drift",
      kind: "pull-request",
      body:
`## PR #1204 — territory planning
**Files:** 61 · **+2,840 / −190**

## oc-code-auditor — PASS with 1 high
\`\`\`
  0 critical · 1 high · 4 medium

HIGH · assignment writes are not idempotent
  A re-run of the same carve re-writes owner on every account,
  bumping LastModified and firing downstream automation for
  accounts whose owner did not change.
  Effect: 12,000 spurious modification events per carve.
\`\`\`

Not a data-correctness bug — the assignment is right. It fires the CS handoff flow for accounts that did not move, which is 12,000 notifications a quarter and the reason someone eventually mutes them. Fixed: write only on actual change.

## oc-repo-ops — **FAIL**, then PASS
\`\`\`
  docs packet present ...... PASS
  generated files in sync .. FAIL   1 finding
  catalog drift ............ FAIL   1 finding
  git state clean .......... PASS

FINDING 1 · generated-drift · BLOCKING
  metadata/field-census.json is 6 days behind the org.
  4 fields created since the reconstruction; 1 is read by a flow.

FINDING 2 · catalog-drift · BLOCKING
  automation-map.md documents 40 flows. The org now has 41.
  Undocumented: Opp_Territory_Notify (created 3 days ago).
\`\`\`

**The org changed while we documented it.** Someone created a flow three days ago — reasonably, it is a live system — and one of the four new fields is read by automation, which is how the 71 silent-failure fields got created in the first place.

This is the gate doing exactly its job: a reconstruction is a snapshot, and a snapshot presented as documentation is wrong the moment the system moves. Re-ran the census, documented flow 41, re-ran: PASS.

## Documentation
### What changed
Territory assignment moves from a quarterly manual spreadsheet exercise to rules in version control, with a dry run that must be approved before any write.

### Why
The last manual carve took nine days and produced 40 accounts with two owners each. Conflict is now impossible by construction — a rule set that would double-assign fails the dry run rather than the quarter.

### For the next person
You have not met the person who built this org. Read \`open-questions.md\` first — it records the three things she could not answer, with what is known about each. \`char-flow-011\` guards behaviour nobody understands: if it fails, something changed, and the test does not know whether that is good.

### Not fixed here, and disclosed
The 4 contradictory validation rules, the 312 dead fields, and the 71 silent-failure fields. Two of the 71 are escalated to Finance and Compliance today — see the charter. They are out of scope, not out of mind.`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Reconstruct from metadata",
      caption: "not from memory",
      skills: ["oc-reverse-spec"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`Our Salesforce admin of six years leaves in three weeks. No documentation, roughly 900 custom fields, 40 flows nobody owns, and four validation rules that contradict each other. The board still wants territory planning shipped this quarter. Where do I even start?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-reverse-spec",
      content:
`With the metadata rather than with her, because her three weeks are the scarce resource and most of what you need is derivable without spending any of it.

Reconstructed from the metadata API plus 24 months of field history and audit trail.

## 900 custom fields
| Category | Fields |
| --- | --- |
| Written and read, last 90d | 341 |
| Written, never read | 104 |
| **Never written, 24 months** | **312** |
| **Read by automation, never populated** | **71** |
| Formula/rollup with no dependents | 72 |

## The 71 are the finding
Each is read by a flow, rule or formula and has never held a value. The automation is not erroring — it takes the null branch, silently, every time.

| Field | Read by | Consequence |
| --- | --- | --- |
| \`Partner_Tier__c\` | Discount validation | **Partner discounts have never been validated** |
| \`Renewal_Risk__c\` | CS alert flow | **The renewal alert has never fired** |
| \`Compliance_Review_Date__c\` | Escalation flow | Escalation never triggers |

The renewal alert flow has existed for four years and has never fired once. CS believes it works. Nobody checks a thing that does not error.

## And the validation rules
VR-011 and VR-031 conflict for any Q4 opportunity closing in January. Reps resolve it by ticking \`Bypass_Validation__c\`, which VR-044 honours for everything. **That field is set on 31% of opportunities** — validation is advisory for a third of your pipeline, and nobody decided that.`,
      artifacts: ["census"],
    },
    {
      type: "exchange", role: "user",
      content: `The renewal alert thing is going to be a conversation. What do I do with three weeks of her time?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-qa-ops",
      content:
`Not answering questions. **Characterisation tests**, written in week 1 while she can still adjudicate what is intentional.

The instinct is to spend her time on a knowledge transfer session and write the new territory code. That inverts the value: answers to questions live in someone's notes, and tests outlive everyone.

\`\`\`yaml
pyramid:
  characterisation:
    target: the 5 superseded flows + 4 validation rules
    budget: 4 days of admin time
    principle: >
      Assert what the org does today, not what it should do.
      A characterisation test that fails later means behaviour
      changed — the alarm nobody has had for six years.
\`\`\`

## The case for it
Five flows are superseded but still enabled. Both old and new run on the same object; the new usually wins, and the old wins in a narrow case **she cannot characterise** — her account is "I think the old one only matters for renewals."

Nobody has to understand that case for the test to be valuable. A characterisation test over 500 real records **records** the behaviour regardless. When someone finally deletes the old flow, the test tells them precisely which records change.

Coverage is set to \`enforce: warn\`, not fail. An org with zero tests that starts with a blocking gate gets the gate bypassed in week two, and then it is decoration.`,
      artifacts: ["pyramid"],
    },
    {
      type: "beat",
      label: "Scope, once, in writing",
      caption: "three weeks survives one round of while-you're-in-there",
      skills: ["oc-app-architect"],
      phase: "plan",
    },
    {
      type: "exchange", role: "user",
      content: `Now territory planning. And I already know people are going to ask us to fix the validation rules while we're in there.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-app-architect",
      content:
`They will, and the charter answers it in writing so the conversation happens once.

**In:** territory model as data, assignment on create/update, a dry-run report before any write, and conflict detection that makes the 40-double-owner class impossible rather than caught.

**Out**, each named because each was proposed:

| Proposed | Verdict |
| --- | --- |
| Fix the 4 validation rules | Out — needs sales leadership on the bypass question |
| Delete 312 dead fields | Out — safe but unbounded |
| Fix the 71 silent-failure fields | **Out of the charter, escalated today** |
| Rebuild the renewal alert | Out — belongs to CS |
| Consolidate the 5 superseded flows | Out — needs the narrow case characterised first |

## The escalation that does not wait
Two of the 71 need a decision this week whatever happens to territory planning:

**\`Partner_Tier__c\`** — partner discounts have never been validated. That is revenue leakage, and it is a Finance question today.

**\`Compliance_Review_Date__c\`** — a compliance escalation that has never escalated. A control that does not exist and is believed to.

Scoping them out of the build is right. Letting them go undisclosed until she has left would not be, and the distinction is worth drawing explicitly — **out of scope and out of mind are different decisions.**`,
      artifacts: ["scope"],
    },
    {
      type: "beat",
      label: "Documentation and the gate",
      caption: "the org moved while we documented it",
      skills: ["oc-code-auditor", "oc-docs-forge", "oc-repo-ops"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content: `Built and tested. What does she leave behind?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-docs-forge",
      content:
`Eight documents, and the eighth is the one that matters most.

\`org-map.md\`, \`field-census.md\`, \`automation-map.md\`, \`validation-rules.md\`, \`territory-planning.md\`, two ADRs — and \`open-questions.md\`, which records what she **could not** answer:

> **Why does \`Opp_Renewal_Legacy\` still run?** Superseded in 2024. Her recollection is "only matters for renewals" but she cannot say which. \`char-flow-011\` records current behaviour over 500 records. Do not delete without running it.
>
> **Why is \`Account_Segment_Old__c\` still populated?** By an integration owned by a vendor whose contract ended in 2025. It still writes daily. Nothing in this org reads it.
>
> **What was VR-023 for?** Introduced 2023-04, no ticket, no comment, contradicts VR-031. Requested by a sales leader who has left.

Three unknowns, each with what is known and what was tried. **A successor inheriting a map with three marked gaps is far better off than one inheriting a map that is confidently wrong in three places.**

The docs describe the org as it is, not as it should be — the bypass field, the superseded flows and the dead vendor integration are all documented as the problems they are. An idealised version would be wrong on day one.`,
      artifacts: ["handover"],
    },
    {
      type: "exchange", role: "user",
      content: `Open the PR.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-repo-ops",
      content:
`Code audit first: **1 high**, and it is a good one to have caught.

Assignment writes are not idempotent. Re-running a carve rewrites owner on every account, bumping LastModified and firing the CS handoff flow for accounts whose owner did not change — **12,000 spurious notifications per carve**, which is how a useful alert becomes a muted one. Fixed to write only on actual change.

Then the readiness gate blocked the PR:

\`\`\`
  generated files in sync .. FAIL
    metadata/field-census.json is 6 days behind the org.
    4 fields created since the reconstruction; 1 is read by a flow.

  catalog drift ............ FAIL
    automation-map.md documents 40 flows. The org has 41.
    Undocumented: Opp_Territory_Notify (created 3 days ago).
\`\`\`

## The org changed while we documented it
Someone created a flow three days ago — reasonably; it is a live system. And **one of the four new fields is already read by automation**, which is precisely how the original 71 came into existence. The mechanism is still running, six days into documenting it.

That is the gate earning its place: a reconstruction is a snapshot, and a snapshot presented as documentation is wrong the moment the system moves. Re-ran the census, documented flow 41, re-ran the gate: PASS.

The PR body carries the three not-fixed items and the two escalations, so the disclosure travels with the change rather than living in a meeting nobody minuted.`,
      artifacts: ["gate"],
    },
  ],
};
