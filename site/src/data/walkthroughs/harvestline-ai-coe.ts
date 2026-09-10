import type { Walkthrough } from "./types";

/**
 * Mandate: AI governance / Center of Excellence — named by eight captured
 * requisitions, most explicitly as "convert scattered AI wins into a governed,
 * funded, benefits-tracked portfolio".
 *
 * Covers oc-telemetry-ops metering what actually runs (opt-in, local-first),
 * oc-cost-ops attributing spend and setting the budget gate, oc-prompt-ops
 * versioning prompts that were living in a shared doc, and oc-release-ops
 * putting the portfolio on a governed cadence. One pilot is shut down.
 */
export const harvestlineAiCoe: Walkthrough = {
  id: "harvestline-ai-coe",
  title: "Nine AI pilots, no owner, no budget line",
  tagline: "Scattered wins into a governed portfolio",
  summary:
    "Four departments bought four assistants, two are on expired trials, one is quietly processing customer records, and nobody can say what any of it costs. The scenario builds the register, the spend attribution and the cadence — and shuts one pilot down.",
  description:
`Harvestline is a food distributor with 6,000 employees and, as of this month, nine AI pilots that nobody owns. They were bought on departmental cards, none went through procurement, and the only reason anyone knows there are nine is that Finance found the fifth on an expense report.

The scenario is the mandate eight requisitions describe and no demo has covered: turning that into a portfolio with an owner, a budget line and a measurable adoption number.

\`oc-telemetry-ops\` meters what actually runs — opt-in and local-first, with no prompt content leaving the machine, which is the answer to the question Legal asks before any of this can proceed. The result reorders the priority list: the pilot with the loudest sponsor has eleven active users, and the one nobody had heard of has four hundred.

\`oc-cost-ops\` attributes spend per team and sets budget gates, and finds the real cost is not the licences — it is one summarisation job that reprocesses the same 40,000 documents nightly because nobody wrote a cache.

\`oc-prompt-ops\` versions the prompts, which until now lived in a shared doc that three people edited without history. And one pilot is recommended for shutdown: it processes customer PII through a vendor with no DPA, it has nine users, and its sponsor did not know either fact.`,
  inputs: [
    "Nine AI pilots discovered across four departments, none through procurement",
    "Two vendors on expired trials still receiving traffic",
    "Prompts maintained in a shared document with no version history",
    "A CFO question — what is this costing — that nobody can answer",
    "Legal's precondition: no prompt content may leave the machine to answer it",
  ],
  skills: [
    "oc-telemetry-ops",
    "oc-cost-ops",
    "oc-prompt-ops",
    "oc-claude-api",
    "oc-release-ops",
  ],
  runtime: "16 exchanges",
  outputs: [
    {
      id: "register",
      label: "AI tool register — nine pilots, what each actually does",
      kind: "register.md",
      body:
`## AI tool register
**Compiled:** 2026-09-18 · **Method:** expense reconciliation + opt-in local metering · **Owner:** Director, AI Enablement

## The nine
| # | Tool | Dept | Sponsor | Users (metered) | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Doc summariser (internal) | Supply chain | VP Ops | **412** | Active — keep |
| 2 | Vendor-contract reader | Legal | GC | 38 | Active — keep |
| 3 | Route-note assistant | Logistics | Dir Transport | 187 | Active — keep |
| 4 | Sales email drafter | Commercial | VP Sales | **11** | Active — consolidate |
| 5 | Meeting summariser | Exec office | CoS | 24 | **Trial expired 61 days ago** |
| 6 | Spreadsheet Q&A | Finance | Controller | 9 | **Recommend shutdown** |
| 7 | Ticket triage | IT | IT Dir | 96 | Active — keep |
| 8 | Recipe/spec extractor | Product | Dir NPD | 31 | Active — keep |
| 9 | Customer-service drafter | CS | VP CS | 140 | **Trial expired 12 days ago** |

## What the metering changed
The priority order the room expected and the order the data produced are different in two places:

**Tool 4 has eleven users.** It has the loudest sponsor, the most escalations, and the most roadmap requests. Eleven people use it. Three of them are the sponsor's direct reports.

**Tool 1 has 412.** Nobody outside supply chain had heard of it. It was built in a week by an ops analyst against the Claude API, costs $180/month, and is the single most-used AI capability in the company.

That inversion is the argument for metering before prioritising. Escalation volume measures who is loudest, not what is load-bearing.

## Two expired trials still receiving traffic
Tools 5 and 9 are past trial end and still processing. Nobody was billed, which is why nobody noticed. Tool 9 handles customer correspondence at 140 users — this is not a licence problem, it is an uncontrolled data flow that has been running for twelve days past any agreement.

## Governance state before this register existed
| Question | Answer |
| --- | --- |
| Who owns the AI portfolio? | Nobody |
| What does it cost? | Unknown |
| Which tools handle customer data? | Unknown |
| Which have a DPA? | Unknown |
| Where do prompts live? | A shared doc, three editors, no history |`,
    },
    {
      id: "spend",
      label: "Spend attribution — the licences are not the cost",
      kind: "cost.md",
      body:
`## Spend attribution — trailing 90 days
**Method:** per-tool token accounting + vendor invoices, attributed to the team that incurred it

## Where the money is
| Tool | Licences | Model spend | Total/mo | Per active user |
| --- | --- | --- | --- | --- |
| 1 · Doc summariser | $0 | **$4,910** | $4,910 | $11.92 |
| 3 · Route-note assistant | $0 | $1,340 | $1,340 | $7.16 |
| 7 · Ticket triage | $0 | $820 | $820 | $8.54 |
| 9 · CS drafter | $0 (expired) | $2,180 | $2,180 | $15.57 |
| 2 · Contract reader | $1,900 | $310 | $2,210 | $58.16 |
| 4 · Sales email drafter | $2,400 | $95 | $2,495 | **$226.82** |
| 5 · Meeting summariser | $0 (expired) | $640 | $640 | $26.67 |
| 6 · Spreadsheet Q&A | $890 | $120 | $1,010 | $112.22 |
| 8 · Spec extractor | $0 | $410 | $410 | $13.23 |
| **Total** | **$5,190** | **$10,825** | **$16,015** | — |

## The finding
Tool 1 is 31% of total spend and has the **lowest cost per user on the list.** It is not expensive; it is popular. Cutting it would be the most obvious saving and the worst decision available.

**The actual waste is inside tool 1.** It re-summarises the same 40,000 supplier documents nightly because nobody wrote a cache — the corpus changes by roughly 200 documents a day and the job reprocesses all 40,000. Adding prompt caching on the stable corpus and skipping unchanged documents drops it to an estimated **$1,150/month, a 77% reduction, with no change to what any user sees.**

That is a one-week fix by the analyst who built it, and it is worth more than every licence cancellation on this page combined.

## Cost per user is the wrong metric alone
Tool 4 at $227/user looks like the obvious cut, and it partly is. But tool 2 at $58/user reads eight-figure vendor contracts for the GC — the comparison that matters there is against outside counsel review, not against a summariser.

**Cost per user ranks; it does not decide.** The register carries what each tool is for so the two get read together.

## Budget gates set
| Scope | Monthly ceiling | Action on breach |
| --- | --- | --- |
| Portfolio | $18,000 | Alert the AI CoE owner |
| Any single tool | $6,000 | Alert + review at next cadence |
| Any tool without a named owner | $0 | **Blocked** — cannot be provisioned |`,
    },
    {
      id: "shutdown",
      label: "Shutdown recommendation — tool 6",
      kind: "decision.md",
      body:
`## Recommendation: shut down tool 6 (Spreadsheet Q&A)
**Users:** 9 · **Cost:** $1,010/mo · **Recommendation:** terminate, not consolidate

## Why this one and not tool 4
Tool 4 is expensive per user and low-value. That is a consolidation candidate — its nine users can move to tool 1's capability at roughly a tenth of the cost, and the decision is a budget conversation.

Tool 6 is a different category, and the difference is not cost.

## What it does
It answers natural-language questions over spreadsheets that Finance uploads. Those spreadsheets include the monthly AR ageing file, which contains **customer names, credit terms and outstanding balances** — third-party personal and commercial data.

## Three findings
1. **No DPA with the vendor.** Procurement has no record of one because procurement has no record of the vendor. The tool was bought on a departmental card at $89/month.
2. **Uploads are retained by default.** The vendor's terms permit retention for service improvement. There is no evidence anyone selected otherwise; the setting exists and is off by default in the opposite direction.
3. **The sponsor did not know either fact.** This is not a governance failure by the Controller — it is what happens when a $89 purchase does not touch a process that would have asked.

## Why terminate rather than remediate
Remediation means negotiating a DPA, changing retention, and re-evidencing what has already been uploaded over seven months. For **nine users** whose need is served by an existing internal tool with data that never leaves, that is not a proportionate spend of legal time.

## What is owed regardless of the decision
The data already uploaded exists. Terminating stops the flow; it does not undo it. A deletion request to the vendor, a record of what was uploaded across the seven months, and a note to the DPO — **because the exposure is not created by shutting it down, it is disclosed by discovering it**, and the disclosure obligation does not depend on the tool's future.

## The uncomfortable part
This was found by metering, not by control. Eight of the nine pilots were invisible to procurement, and the one that mattered most was found by reconciling an expense report. The register is the fix; the shutdown is one output of it.`,
    },
    {
      id: "prompts",
      label: "Prompt versioning — out of the shared doc",
      kind: "diff.md",
      body:
`## Prompt versioning — tools 1, 3, 7, 9
**Before:** one Google Doc, three editors, no history · **After:** \`prompts/\` in the repo, reviewed as diffs

## What the shared doc cost
Nobody could answer why tool 1's summaries changed in August. The doc has no history, and the three people with edit access remember different things. The prompt is currently 1,400 words and contains four passages that contradict each other — the accumulated residue of fixes for individual complaints, none of which were removed when the next fix landed.

\`\`\`diff
  You are a supply-chain document assistant.
- Always include the supplier name in the first line.
  ...
- Do not repeat the supplier name; it is shown in the UI header.
  ...
- If the document is a contract, summarise in at most 3 sentences.
  ...
- For contracts, give a detailed clause-by-clause summary.
\`\`\`

Four instructions, two direct contradictions. The model resolves them arbitrarily, which is exactly the "it changed in August" everyone noticed and nobody could reproduce.

## Baseline first
Before touching the prompt, a 60-case goldset was built from real documents with human-reviewed expected outputs. The current prompt scores **0.71**. That is the number any change has to beat, and it did not exist before this week.

## The cleanup
| Change | Scored delta |
| --- | --- |
| Remove the two contradictions, keep the later intent | +0.09 |
| Move the "supplier name" decision to a stated rule with a reason | +0.04 |
| Cut 620 words of accumulated single-complaint patches | +0.03 |
| **Net** | **0.71 → 0.87** |

Cutting 620 words improved the score. That is worth stating to the four people who each added a paragraph in good faith: **the prompt got worse as it got longer**, and no single addition was wrong.

## What is now true
- Every prompt is a file, changed by diff, with the goldset run on every change
- A regression below the baseline blocks the change
- "Why did it change in August" is answerable — it is a commit`,
    },
    {
      id: "cadence",
      label: "Portfolio charter and quarterly cadence",
      kind: "charter.md",
      body:
`## AI portfolio charter
**Owner:** Director, AI Enablement · **Reviewed:** quarterly with CFO, GC, CISO · **Status:** proposed

## What this charter is for
Nine tools arrived without anyone deciding to have an AI portfolio. This makes the portfolio deliberate: an owner, a budget line, a register, and a route by which the tenth tool arrives on purpose rather than on an expense report.

## Provisioning route
| Step | Gate |
| --- | --- |
| Request | Named owner and stated outcome, or it does not enter the register |
| Data check | Does it process customer or employee data? → DPA + retention setting required |
| Cost | Estimated monthly spend against the portfolio ceiling |
| Prompt | Lives in \`prompts/\`, has a goldset before it has users |
| Review | Quarterly, against adoption and cost per active user |

**The unowned tool cannot be provisioned.** That is the single control that would have prevented eight of the nine.

## Cadence
Quarterly, four questions, in this order:

1. **What is being used?** Metered active users, not licences bought.
2. **What is it costing?** Attributed per team, against the ceiling.
3. **What changed in the prompts?** Diffs and score deltas since last quarter.
4. **What should stop?** A standing agenda item, because nothing ever gets removed unless removal is on the agenda.

## Deliberately not in this charter
- **A model policy.** Which model each tool uses is a technical decision with a cost consequence, and it belongs in the tool's own record, not a governance document that will be out of date in a quarter.
- **An approved-vendor list.** Tempting, and it becomes a bottleneck the moment someone needs a vendor not on it. The DPA-and-owner gate does the work without the maintenance.
- **A usage target.** Adoption is a measure, not a goal. A tool nobody uses should be shut down, not promoted.

## Release cadence
Portfolio changes ship on a governed cadence with a changelog: what was added, what was retired, what each prompt change scored. The register is the source of truth and it is in the repo, so "what AI do we run" is answerable by reading a file rather than by asking around.

## First quarter's actions
| Action | Tool | Owner |
| --- | --- | --- |
| Add caching, cut spend 77% | 1 | Supply chain analyst |
| Terminate + deletion request + DPO note | 6 | AI CoE owner |
| Consolidate onto tool 1's capability | 4 | VP Sales |
| Regularise or terminate expired trials | 5, 9 | Procurement |
| Move prompts into \`prompts/\` with goldsets | 1, 3, 7, 9 | AI CoE owner |`,
    },
  ],
  steps: [
    {
      type: "beat",
      label: "Find out what is actually running",
      caption: "metering before prioritising",
      skills: ["oc-telemetry-ops"],
      phase: "discover",
    },
    {
      type: "exchange", role: "user",
      content:
`Finance found a fifth AI tool on an expense report and now I own "AI strategy". I think we have somewhere between four and nine pilots across four departments, none of them went through procurement, and the CFO wants to know what it costs. Legal has already said no prompt content leaves the building while we work this out.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-telemetry-ops",
      content:
`Legal's condition is satisfiable, and it is worth leading with because it usually stalls this work for a month. Metering here is **opt-in and local-first**: it records which tools ran, how often, by how many distinct users, into a local store. No prompt content, no completions, no customer data. What leaves is a count.

Reconciling expense records against that metering: **nine tools.**

| # | Tool | Dept | Metered users |
| --- | --- | --- | --- |
| 1 | Doc summariser (internal) | Supply chain | **412** |
| 3 | Route-note assistant | Logistics | 187 |
| 9 | CS drafter | CS | 140 |
| 7 | Ticket triage | IT | 96 |
| 2 | Contract reader | Legal | 38 |
| 8 | Spec extractor | Product | 31 |
| 5 | Meeting summariser | Exec | 24 |
| **4** | **Sales email drafter** | **Commercial** | **11** |
| 6 | Spreadsheet Q&A | Finance | 9 |

## Two things the metering reordered
**Tool 4 has eleven users.** It has the loudest sponsor, the most escalations and the most roadmap requests. Three of the eleven report to the sponsor.

**Tool 1 has 412** and nobody outside supply chain had heard of it. An ops analyst built it in a week against the Claude API. It is the most-used AI capability in the company.

Escalation volume measures who is loudest. That is the argument for metering before you prioritise anything.

Also: **tools 5 and 9 are past trial end and still processing** — 61 days and 12 days. Nobody was billed, which is why nobody noticed. Tool 9 is customer correspondence at 140 users.`,
      artifacts: ["register"],
    },
    {
      type: "exchange", role: "user",
      content: `So what's it costing? I need a number for the CFO this week.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`**$16,015 a month** — $5,190 licences, $10,825 model spend. And the interesting part is not the total.

| Tool | Total/mo | Per active user |
| --- | --- | --- |
| 1 · Doc summariser | $4,910 | **$11.92** |
| 4 · Sales email drafter | $2,495 | **$226.82** |
| 6 · Spreadsheet Q&A | $1,010 | $112.22 |
| 2 · Contract reader | $2,210 | $58.16 |

Tool 1 is 31% of spend and has the **lowest cost per user on the list.** It is not expensive, it is popular. Cutting it is the most obvious saving on the page and the worst decision available.

## The actual waste is inside it
It re-summarises the same **40,000 supplier documents every night.** The corpus changes by about 200 documents a day; the job reprocesses all 40,000 because nobody wrote a cache.

Prompt caching on the stable corpus plus skipping unchanged documents takes it to roughly **$1,150/month — a 77% cut, with no change to what any of the 412 users see.** One week of work by the analyst who built it, and it is worth more than every licence cancellation available here.

## One caution on the per-user column
Tool 2 at $58/user reads eight-figure contracts for the GC. The comparison there is outside counsel, not a summariser. **Cost per user ranks; it does not decide** — read it next to what each tool is for.`,
      artifacts: ["spend"],
    },
    {
      type: "beat",
      label: "One of these should stop",
      caption: "and not the expensive one",
      skills: ["oc-cost-ops"],
      phase: "audit",
    },
    {
      type: "exchange", role: "user",
      content: `Tool 4 at $227 a user is indefensible. Kill it?`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-cost-ops",
      content:
`Consolidate it — its nine remaining users are served by tool 1's capability at about a tenth of the cost, and that is a budget conversation with a sponsor.

**Tool 6 is the one to terminate, and cost is not why.**

It answers questions over spreadsheets that Finance uploads. Those include the monthly AR ageing file — **customer names, credit terms, outstanding balances.** Third-party data.

1. **No DPA with the vendor.** Procurement has no record, because procurement has no record of the vendor. It was bought on a card at $89/month.
2. **Uploads are retained by default** under the vendor's terms, for service improvement. Nothing indicates anyone changed that setting, and the default runs the wrong way.
3. **The Controller did not know either fact.** That is not a governance failure by them — it is what a $89 purchase that touches no process looks like.

## Why terminate rather than remediate
Remediation means negotiating a DPA, changing retention, and re-evidencing seven months of uploads. For **nine users** whose need is met by an internal tool where the data never leaves, that is not a proportionate use of legal time.

## What is owed either way
Terminating stops the flow; it does not undo it. A deletion request, a record of what was uploaded over seven months, and a note to the DPO — **the exposure is disclosed by finding it, not created by acting on it**, and that obligation does not depend on what happens to the tool.`,
      artifacts: ["shutdown"],
    },
    {
      type: "beat",
      label: "Get the prompts under version control",
      caption: "a shared doc with three editors",
      skills: ["oc-prompt-ops", "oc-claude-api"],
      phase: "build",
    },
    {
      type: "exchange", role: "user",
      content: `Agreed on 6. Separately — supply chain says tool 1's summaries "changed in August" and nobody can tell me why.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-prompt-ops",
      content:
`Nobody can tell you because the prompt lives in a Google Doc with three editors and no history. It is 1,400 words and contains four passages that contradict each other:

\`\`\`diff
  You are a supply-chain document assistant.
- Always include the supplier name in the first line.
- Do not repeat the supplier name; it is shown in the UI header.
- If the document is a contract, summarise in at most 3 sentences.
- For contracts, give a detailed clause-by-clause summary.
\`\`\`

Two direct contradictions. The model resolves them arbitrarily run to run — that *is* the "changed in August", and it will keep happening.

## Baseline before touching anything
Built a 60-case goldset from real documents with human-reviewed expected output. **Current prompt scores 0.71.** That number did not exist before this week, which is the reason no previous fix could be evaluated.

| Change | Delta |
| --- | --- |
| Remove contradictions, keep later intent | +0.09 |
| State the supplier-name rule with its reason | +0.04 |
| Cut 620 words of single-complaint patches | +0.03 |
| **Net** | **0.71 → 0.87** |

**Cutting 620 words improved the score.** Worth saying to the four people who each added a paragraph in good faith: the prompt got worse as it got longer, and no individual addition was wrong.

Now in \`prompts/\`, changed by diff, goldset on every change, regression below baseline blocks. "Why did it change in August" is a commit.`,
      artifacts: ["prompts"],
    },
    {
      type: "beat",
      label: "Make the portfolio deliberate",
      caption: "so the tenth tool arrives on purpose",
      skills: ["oc-release-ops"],
      phase: "ship",
    },
    {
      type: "exchange", role: "user",
      content: `How do I stop this happening again? There'll be a tenth tool next month.`,
    },
    {
      type: "exchange", role: "claude",
      skill: "oc-release-ops",
      content:
`One control does most of the work: **a tool without a named owner cannot be provisioned.** That would have stopped eight of the nine, and it costs nothing to enforce because it is a precondition rather than a review.

## Provisioning route
| Step | Gate |
| --- | --- |
| Request | Named owner + stated outcome, or no register entry |
| Data check | Customer or employee data? → DPA + retention setting required |
| Cost | Estimated spend against the portfolio ceiling |
| Prompt | Lives in \`prompts/\`, has a goldset before it has users |
| Review | Quarterly, on adoption and cost per active user |

## Quarterly cadence, four questions
What is being used (metered, not licensed) · what it costs (attributed per team) · what changed in the prompts (diffs and score deltas) · **what should stop.** That last one is a standing item, because nothing is ever removed unless removal is on the agenda.

## Three things I would leave out
- **A model policy.** Which model each tool uses is a cost decision belonging in the tool's record, not a governance doc that ages badly.
- **An approved-vendor list.** It becomes a bottleneck the first time someone needs a vendor not on it. The DPA-and-owner gate does the same work without the maintenance.
- **An adoption target.** Adoption is a measure, not a goal — a tool nobody uses should be shut down, not promoted into a KPI.

The register ships in the repo with a changelog, so "what AI do we run" is answered by reading a file instead of asking around. Which is, in the end, the whole deliverable: the CFO's question was never really about the money.`,
      artifacts: ["cadence"],
    },
  ],
};
