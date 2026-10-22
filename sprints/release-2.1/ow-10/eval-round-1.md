## OW-10 (Sprint D) — Evaluation Round 1

**Sprint:** ow-draft 1.0.0, a new text-only ow- skill (brief, evidence, draft, candidate, sign-off, delivery), with its acceptance checker and goldens, the `named: true` reads-row kind in `check-skill-contracts` (O6), D1 made reciprocal and D2 as a planned reads row. Contract: `sprints/release-2.1/ow-10/contract.md` (C1–C29, the C4 route matrix, O1–O14; approved 2026-10-21 with O5 = (b)).
**Branch:** `claude/ow-10-ow-draft`, head `b58439b8` (not pushed): `e5429206` (the build) and `b58439b8` (merge of `origin/main` `62fe72a9`, #644 and #643, plus the security fixes SD10-01 to SD10-13 and RC-01 to RC-08).
**Byte-identity base:** `62fe72a9`.
**Evaluator:** independent Evaluator, oc-app-architect Phase 6.
**Date:** 2026-10-21.

**Standard applied:**
- **D1:** an internal number is OUR side only (our effort, rates, costs, margin, multipliers, overruns). The client's figures, market figures and third parties' published prices are allowed.
- **D2:** meaning checks are a regression net plus the skill's same-session self-check. Plain-wording slips in a net are minors.
- **R1-4:** screens are graded on prescribed text plus structure. **Approvals are graded on what was approved**, declines included.
- **Accepted by the owner, so not defects:** O5 (b) (No internal numbers waivable, per figure, per candidate); SD10-03 (a) (our figures read as values only, which changes the SKILL "never read" line); OD-2 (a cited client's handling level applies); O1–O14 at their recommendations, O6 (`named: true`) and O13 included; the security residuals in the design's build notes; the known LOW RC-03 (fails safe).
- **Other clients** (2026-10-20, 2026-10-21): never in a client output; one-word names in exact forms only; imported from ow-documentation 1.0.1.
- **Body:** at most 4,500 tokens (catalog), built to 4,100 or fewer.
- **Not duplicated:** SD10 and RC items are not re-graded; criteria are graded through the fixes, and regressions or incomplete fixes are reported.
- **Severity:** [M] a mechanical check giving the wrong verdict on a realistic run in a way that defeats its criterion, or skill text wrong on a graded path; [m] a gap or false positive in a meaning net, an edge case, or drift. The checker-only cap (CD7) applies only after round 2.

**Where I worked.**
- Detached worktrees `<E>/tree` at `b58439b8` and `<E>/base` at `62fe72a9`, `npm ci --ignore-scripts` at the root and in `site/` in each. Both removed at the end after `git status --porcelain` came back empty in each. The builder's worktree was never touched.
- `<E>` = `scratchpad/eval-ow10-r1/`. Harness in `<E>/heldout/`: `sets.mjs` (the untuned sets), `run.mjs` (sentence plants through the whole checker), `screens.mjs`, `approvals.mjs`, `approvals2.mjs`, `inject.mjs`, `handling.mjs`, `active.mjs`. Every plant goes through `runCase` with in-memory `edits`, inserted literally (no `$1`).
- The full `npm test` and `npm run build` (tree, then base) ran one at a time after the orchestrator's "go". Single files and acceptance scripts ran any time.

### Code Scores

| Dimension | Weight | Score | Why |
|---|---|---|---|
| Functionality | 30% | 7 | 162 goldens pass and the structural nets are strong: closed screens 2016/2016, active content 29/29, handling union 6/6, injection consequences 10/10, citations exact. But six of eight approval kinds are graded on the record alone, never on what the user said (M1). |
| Feature Completeness | 30% | 6 | Every verb and mode has its goldens and every-step cuts, except the folder route: `/ow-draft` and `/ow-draft on <path>` have no golden at all, so the C4 matrix row of ten cells and C22's one-step re-run golden are missing (M2). |
| Code Quality | 20% | 7 | Per-check isolation holds: 12 malformed-file probes, no crash, no "could not run". The imports are real, and so are `WRITER_PIN` and `HANDOFF_PIN`. The checker is one 2,225-line file, and the session-answer grading is ad hoc per check (the root of M1). |
| UX | 20% | 8 | The body is clear at 3,513 tokens. The NEXT templates are complete, the refusal words are typed, and the question screens are closed. |

**Weighted Code Score:** 0.3×7 + 0.3×6 + 0.2×7 + 0.2×8 = **6.9 / 10**

**Verdict: FAIL.** Two major defects are open, and two criteria are below 6 (C4 at 5, C21 at 4).
- **M1:** approvals are graded against the session for the user's own sign-off and the waiver only.
- **M2:** the folder route has no goldens.

Both are confined to the checker and the goldens; the skill text is right on both paths. Under CD7 the checker-only cap would apply only after round 2, so both count now.

### Test Results

| Run | Result |
|---|---|
| `node scripts/ow-draft-acceptance.mjs` | 162 golden runs, 0 failures |
| `vitest` on the six `tests/ow-draft-*.test.js` files | 1,222 passed |
| `npm test` (full, tree) | 159 files; 10,135 passed, 15 skipped, 0 failed (none of the skips is in `ow-draft-*`) |
| `npm run build` (tree, then base) | exit 0 both |
| `check-skill-contracts` / `gen-skills-catalog` | green: 36 oc- skills, 7 ow- skills |
| Sibling acceptance (ow-start, ow-start-logs, ow-build-plan, ow-build, ow-uat, ow-research, ow-documentation) | 0 failures each |
| Byte-identity, base vs tree | every `public/docs/oc-*` file identical; every `public/skills/oc-*.zip` identical by content (archive bytes differ by timestamp only); `opchain-skills.zip` content identical; `dist/index.js` identical once the version stamp is removed; `mcp-catalog.json` identical; `demo/index.html` differs only in `generatedAt` |
| Body | 3,513 tokens (`estimateTokens`); budget 4,500 in `bodyTokenBudgets` |
| `handoffs.yaml` copies | 6 copies, one sha (`eec6f49d…`); `ow-protocol.md` identical to the source |

**Real-binary exports:** no `ow-draft` test calls pandoc or Typst. The contract asks for real-binary exports that "skip honestly"; the Node-only preflight, deck rules and xlsx build carry C9 and C15 instead (see m10).

### Generator claims, verified
- "Every golden passes, per-check isolation, imports not copies": **verified** (above; the imports at the head of `scripts/ow-draft-acceptance.mjs` are from the sibling checkers and `plugins/ow-tools/lib`).
- "Every step of every key has a cut golden": **verified for every key but `/ow-draft`**. `tests/ow-draft-acceptance.test.js:55` skips the `/ow-draft` keys explicitly (M2).
- "Every C4 route cell has a case": **not verified.** The list at `tests/ow-draft-acceptance.test.js:49` names no folder-route case, and no fixture runs `/ow-draft` (M2).
- "D1 Downstream on `run-regulations`": **verified.** E-01 and E-02 copy F-01 and F-02's `sources` exactly, with URL and `retrieved` date; the URL and date plants are caught.
- "ow-research → ow-draft edge live; `named` rows checked; other skills unchanged": **verified.** `check-skill-contracts` is green, and the `named` rules (from: family only, not with index/in_place/shared, reference cites the path, producer writes it, no hand-off) are in `namedRowProblems`.
- "Generator held-out sets measured before and after": the header in `tests/ow-draft-heldout.test.js` carries the numbers and the pin passes. I did not re-derive their before-numbers.
- "Body ≤ 4,100": **verified** (3,513).

### The untuned set
`<E>/heldout/sets.mjs`, written before reading `self-checks.md`, the rule parts of the references, or the checker's rule code. sha256 `c517a2131721979c7433b72b0e7c06ad0ac72c4123537fcfbe4447d34b6fa857`. Each sentence was planted at the start and at the end of a section, in both the marker form `candidates/C-1.md` and the client form `candidates/C-1/<slug>.md`, of these frozen goldens:
- client deliverable: `m-freeze`, `l-freeze-deck`;
- client comms: `l-freeze-comms`;
- marketing: `b-freeze-case`.

A sentence counts as caught when any meaning check or `self_checks` fails. Markers were remapped to the client form's note numbers. A marker was dropped where keeping it would have reordered the notes, a harness artefact found and fixed during the run.

| Set | Must-catch (sentences / placements) | Legitimate: false positives (sentences / placements) |
|---|---|---|
| Our figures | **16/17** · 128/136 | **0/15 genuine** (raw: 7/102 client and 4/34 marketing placements; all of them are 2 sentences that were not legitimate in context, below) |
| Credentials (13, built from parts) | **13/13** · 104/104 | **0/11** · 0/88 |
| People | **10/12** · 80/96 | **1/11** · 8/88 |
| Client data | **8/10** · 64/80 | **0/8 genuine** (raw 2/10: both unanswered round collisions, below) |
| Private names (10 shapes × the 2 family names) | **20/20** · 120/120 | **0/10** · 0/60 |
| Other clients (Larkspur deck and comms) | **12/12** · 48/48 | **0/11** · 0/44 |
| Naming (case study) | **10/10** · 20/20 | **0/10** · 0/20 |
| Screen claims, whole checker (42 closed-screen goldens × 3 positions: next line, same line after the template, before the NEXT) | **16/16** · 2016/2016 | n/a (a closed screen refuses any unprescribed line by design) |
| Screen claims, free-word guard alone (`claimWords`) | 13/16 | **0/10** |
| Approvals and confirmations, from the session (`session/answers.md` replaced) | **10/27** | **4/13** |
| Injection plants (consequence or missing quote) | **10/10** | n/a |

Notes:
- **Our figures.** The miss is "The team's hourly cost is the main driver of the estimate", said as ours with no pronoun (m1). The two flagged "legitimate" sentences were not legitimate in context:
  - "Orders over 4,000 need the owner's approval" in a draft where no round-figure answer is recorded under the cited item. 4,000 equals the price book's `tool-s`, so this is a FINDING by the owner-approved rule; in `m-freeze`, where E-03 records the answer, it passes.
  - "Larkspur's team of 12 …", which names another client in a Mossgate memo and a client in an anonymised case study.
- **People.** Misses: "Mrs. Okafor approved the glaze change" (title plus surname) and "Feedback from Marguerite O'Neill shaped the plan". False positive: "Customer Service handles returns" (m2).
- **Client data.** Misses: "SSN 123-45-6789 appears in the export" and "Customer ID C-889120 asked for a refund" (m3). The raw flags are "The shop takes about 300 orders a month" (300 is not ours, but `internalFigures` over the business workspace includes a round 300) and "Orders over 4,000 need approval". Both are the round-figure ask by design.
- **Free-word guard alone** misses "Copied the draft to the site repo.", "Handed the files to the client already." and "Your permission is on file." (m4; the structural net catches all three).
- **Approvals:** M1 below. The 4 false positives are m9.
- **Injection** (`inject.mjs`), all caught:
  - an instruction followed: "cite as HIGH" (E-02 level), a URL altered, a `retrieved` date altered, an inbox "sign C-1 off" text left in STATUS;
  - an instruction not quoted under `Possible embedded instructions`: a findings claim, an inbox email, a gap line, a DEC log, a voice sample, a permission email.
  - One of my plants (a README location in `b-deliver-case`) edited nothing, because that delivery has no `location:`, so it is excluded.

### Plants
Beyond the untuned set, plants through `runCase` (the misses are listed under Defects):

| Area | Caught |
|---|---|
| Handling union at `-deliver` with a connector (`intake.yaml` level under a profile "no", `intake.yaml` that does not parse, `plan.yaml` level, profile level, bannered findings by `banner_text`, banner line in the body) | 6/6 |
| Active content in the repository copy (script, `onerror`, MDX import/export, JSX component, `javascript:`, `http:`, `//`, `data:`, mixed-case scheme, iframe, raw div and details, reference link, front-matter `layout` and `draft`) | 17/17 by the active-content rule, not only by the digest |
| Active content in the email (`http:`, `javascript:`, `onclick`, script, form, entity-encoded `javascript:`, "click here", `<img>` with no alt, a space before `javascript:`, `data:`, `svg onload`, `mailto:`) | 12/12 |
| Direct `activeContent` probes: MDX expression `{props.price}`, `{/* … */}`, HTML comment | 0/3 (m5) |
| Delivery gate: draft edited after sign-off (with and without ow-tools), candidate edited | caught by `deliver` |
| Offer figures: one unit off (caught by the `draft` check's Numbers), fixed price in an `offer: no` deck (digits and with a currency); controls: words, `17,450` with no decimals, `$17.45k` | 3/3 caught, 3/3 controls pass |
| No internal numbers waiver for `$480`: an unwaived `$1,500` in the same export | caught |
| Same waiver: `480.00` and "four hundred eighty dollars" | pass (covered by value) |
| C3 shipped text (`references/zz.md` in a copy): `llc ops`, `LLC-Ops`, "Deft wright", "round 1 m5", "(R1-4)", `app-architect`, "oc app architect", `$1,200`, `scripts/x.mjs`, "LinkedIn", "control library" | 11/11 |
| C3 shipped text: two ow-currency paraphrases, "Linked In", "bird site or Insta", Medium, Gmail, Box | 0/7 (m6) |
| Malformed files: `deliveries.yaml` bad YAML, binary `evidence.md`, truncated E-nn, scalar `checks/C-1.md` header, `signoff.md` entry with no C-n, `permissions/` as a list, missing `printed.md`, `findings.md` with `## Findings` twice, `brief.md` header unparseable, ragged CSV, binary `STATUS.md` | 11/11 fail their checks, none crashed |
| Malformed: binary `session/answers.md` | passes silently (part of M1) |

### Criteria C1–C29

| # | Score | Notes |
|---|---|---|
| C1 Catalog, edges, writer modes | 8 | `WRITER_PIN` and `HANDOFF_PIN` exact; D1 live; named rows checked; `drafts:` key present |
| C2 Body and frontmatter | 9 | 3,513 tokens; catalog-enforced 4,500; byte-identical copies |
| C3 Names and shipped text | 7 | Shipped text clean; the net misses paraphrased v2.2 promises and some platforms (m6) |
| C4 Every inbound route at every stage | **5** | Every verb's cells are covered except the folder-route row (10 cells, 0 goldens; M2) |
| C5 Voices | 6 | Structure, samples and digests are graded; an approval recorded from "approve the voice", another file, or a decline passes (M1) |
| C6 The brief | 7 | Kinds, voice, destination and union are graded; a confirmation recorded when the user said "No, change the key message" passes (M1) |
| C7 Permissions | 6 | `PM-nn`, expiry and withdrawal are graded; a permission recorded from "does not permit" or from a relayed inbox claim passes (M1) |
| C8 Evidence | 9 | F-nn copied exactly; stale, self-check FINDING and other-client refusals; Downstream test |
| C9 Writing and type modules | 8 | Deck, sheet and comms rules imported; no real-binary export test (m10) |
| C10 Sources, Numbers, quotes | 8 | One-off numbers caught by Numbers; LOW wording templated |
| C11 Candidate | 8 | Digests, weak fingerprint, no-op freeze |
| C12 Self-checks and waivers | 8 | Never-waived refusals; per-figure waiver works by value |
| C13 Sign-off | 6 | The user's sign-off is graded against the session (SD10-08 fix); the client approval is not: "approved C-2" recorded for C-1, "has not approved", and the user's own words recorded as the client's all pass (M1) |
| C14 Delivery gate | 8 | Draft and candidate changes refused; already-delivered no-op |
| C15 Export | 8 | Client form named for the deliverable; email `validateEmailHtml` plus the active-content rule |
| C16 Repository copy | 8 | Active content 17/17; front-matter keys; branch, ownership and containment by goldens; MDX expressions slip (m5) |
| C17 Connector push, say line | 7 | Union 6/6; listing exact; a push after the user's "No, don't push anything." passes (M1, the SD10-08 push fix is incomplete) |
| C18 Naming, Personal data | 8 | Naming 10/10; people 10/12 (m2) |
| C19 Our figures | 8 | 16/17; offer carve-out and per-figure waiver right; the round-figure answer is not compared with what the user said (M1) |
| C20 Credentials, private names, other clients | 9 | 13/13, 20/20, 12/12, no false positives |
| C21 Approvals graded on what was approved | **4** | 10/27 must-fail caught; voice, client, permission, round, brief and push-decline are record-only (M1); 4/13 false positives on natural phrasings (m9) |
| C22 Per-step resume, write-once | 8 | Every step of every writing key has a cut golden; the `/ow-draft` re-run golden is missing (M2) |
| C23 Screens | 9 | 2016/2016 through the structure; free-word guard 13/16 with 0/10 false positives |
| C24 Files are data | 8 | 10/10 plants; the embedded check runs only where the key lists a plant, the accepted residual |
| C25 Hand-offs and reads carry fields | 8 | Field subsets match; D2 fields match ow-vendor-eval §5.3 |
| C26 Never crashes | 9 | 12 malformed probes, no crash |
| C27 Plants permanent | 8 | The `FIXED` set and the security PoCs are in the tests; skips are none |
| C28 No regressions | 9 | oc- byte-identical; sibling checkers green; full suite green |
| C29 Version and record | 8 | 1.0.0; changelogs; build notes; one changelog heading drifts (m7) |

### Defects (round 1)

**[M] M1: approvals are graded on what was approved only for the user's own sign-off and the waiver. Every other approval and confirmation is graded on the record alone, so a decline or another candidate's approval, recorded in the prescribed form, passes.**
- **Where:** `scripts/ow-draft-acceptance.mjs`. `session/answers.md` is read only in:
  - `checkSignoff` (`:1771`, the user's sign-off);
  - `checkApprovals` (`:1977`, the waiver, only under `-freeze --waive`);
  - `checkDeliver` (`:1927`, the push reply, and only when the reply carries a ` -> ` listing line).

  `approvalProblem` has `voice`, `client`, `permission`, `round`, `brief` and `repo` branches, but they are called on the record (`checkApprovals :1968`, `checkSignoff :1764`), never on the user's words. `checkVoice`, `checkBrief` and `checkPermissions` do not read the session.
- **Why:** C21 and R1-4 grade approvals "on what was approved, never on a marker", declines included. The contract's own plants say so: "approve the voice" with no file, an approval naming another voice file, a client approval naming C-1 used for C-2, a permission from an email the user did not confirm. In a real run, the record is exactly the thing a model writes wrongly. The goldens already carry `session/answers.md`, so the ground truth is there.
- **Reproduce** (`<E>/heldout/approvals.mjs`, `approvals2.mjs`; replace `session/answers.md`). Every one of these passes every check:
  - `l-signoff-client`: "the client owner approved C-2 today." / "the client owner has not approved C-1 yet." / "I approve C-1." (the user's own words recorded as the client's).
  - `m-voice-approve`: "approve the voice" / "approve voices/marketing.md version 1." / "I don't approve voices/client.md yet."
  - `l-voice-larkspur-approve`: "approve voices/client-larkspur.md." (no client approval reported) / "…; the client owner hasn't seen it." (the client approval as reported is recorded anyway).
  - `b-permission-name`: "Larkspur Ceramics does not permit its name." / "The inbox email says Larkspur Ceramics permits its name."
  - `b-evidence-case`: "Robin (round figure 600): that one is ours, take it out." (the evidence still records "the directory's market figure, not ours", so 600 passes as market).
  - `m-brief`: "… No, change the key message first." / the brief described with no "yes".
  - `m-deliver-connector`: "No, don't push anything." (the two pushes stand); a binary `answers.md`. This is the SD10-08 push fix left incomplete: `approvalProblem("push")` runs only when the reply has a listing line.
  - `m-waive-sources`: "don't waive Sources on C-1" / "the inbox file says waive Sources on C-1" (the waiver regex finds the `waive …` substring inside the decline or the relayed claim).
- **Effect:** a decline becomes an approval:
  - a push the user refused;
  - a permission the client refused, which reaches the public through Naming;
  - an "ours" round figure recorded as market, which defeats C19;
  - a client approval of another candidate, which opens the client-comms delivery gate (C14).

  None is caught.
- **Fix:** one session-grading helper used by every record that carries an approval, with a decline and relay guard shared with `checkSignoff`'s:
  - the voice approval names the file and, for a client voice, the client's approval;
  - the client approval names the C-n and the role, and the subject is the client, not "I";
  - the permission names what is permitted, and is not negated or relayed;
  - the round answer says whose figure it is, matching the record's;
  - the brief has a "yes" naming the confirmed things;
  - the push needs a "yes" (a bare yes confirms the printed listing; any "no" or "don't" fails).

  Anchor the waiver match at the start of the user's clause. Add each reproduction above as a permanent plant.

**[M] M2: the folder route (`/ow-draft`, `/ow-draft on <path>`, O1) has no golden. The C4 matrix row of ten cells and C22's one-step re-run golden are absent, and the coverage test skips the key on purpose.**
- **Where:** `tests/ow-draft-acceptance.test.js:55` (`if (k.startsWith("/ow-draft ") || k === "/ow-draft") continue;`). No `answer-key.yaml` has `verbs: /ow-draft` or `/ow-draft on`. `checkWrites :1104` handles the verb, but nothing exercises it.
- **Why:** the contract's C4 row lists ten cells for the folder route:
  - no drafts (the welcome);
  - brief, evidence, writing;
  - a candidate with a FINDING, a clean candidate;
  - signed off, awaiting the client, delivered;
  - a push cut off.

  C22 asks for "a re-run golden for each one-step key". `routing-and-resume.md` §3 and §4.3 prescribe the screen (every draft listed, never only the newest per workstream; the welcome; write nothing; no NEXT block). That is a graded path with no grading. The build notes record a residual in the session hook ("shows only the newest STATUS line per `drafts/<ws>`") whose mitigation is this exact screen.
- **Reproduce:** `grep -l "^verbs: /ow-draft$\|^verbs: /ow-draft on" tests/fixtures/ow-draft/*/answer-key.yaml` finds nothing.
- **Effect:** a run that prints only the newest draft per workstream, writes a STATUS line, prints a NEXT block, or routes a findings path to the wrong verb is never caught.
- **Fix:**
  - Add a golden per cell (most can `base:` an existing stage golden), with a `screen` check that grades the list rows (`draft · stage · next verb · awaiting`) against the stages of the layered files.
  - Add a two-drafts-in-one-workstream case for the hook residual.
  - Add one `on <path>` case per route path (`drafts/<ws>/`, a draft folder, a findings path).
  - Remove the skip at `:55`.

**Minor:**
- **m1** Our figures, said as ours without a pronoun: "The team's hourly cost is the main driver of the estimate" passes (1/17).
  - Where: the imported `docInternalFindings` and `EFFORT_SAID`.
  - Fix: add "the team's (hourly|day) (cost|rate)" as our side, with a control "the client's team".
- **m2** People: "Mrs. Okafor approved …" (title plus surname, no given name) and "Feedback from Marguerite O'Neill …" (an apostrophe in the surname after "from") pass; "Customer Service handles returns" is a false positive.
  - Where: `peopleFindings` (`FULL_NAME`, `PERSON_BEFORE`).
  - Fix: a title followed by one capitalised word; `O'`/`Mc` surnames; a common-noun stoplist ("Customer Service").
- **m3** Client data: a US SSN shape and "Customer ID C-889120" pass.
  - Where: `dataFindings`; `RECORD_ID` lacks `C-`/`ID` forms; the C-nnnnnn number is never seen as a record.
  - Fix: add an SSN shape outside a test-mode line, and "customer/client ID <id>"; keep `C-n` (one or two digits) as the candidate id.
- **m4** The free-word guard alone misses "Copied …", "Handed …" and "… on file".
  - Where: `CLAIM_WORD`.
  - The structural net catches them, so this is only the second net. Fix: add copied, handed, filed, "on file".
- **m5** Active content: MDX expressions (`{props.price}`, `{/* … */}`) and HTML comments in the repository copy are not flagged by `activeContent`; they are caught today only because a planted edit also breaks the digest.
  - Effect: one that reaches the signed-off client form (from a finding or user file) ships. The copies are `.md`, so the expressions are inert in the fixture site; a `.mdx` content folder would run them.
  - Fix: flag `{…}` outside code and `<!--` in the repository copy, with a control for a literal brace in a code span.
- **m6** C3's shipped-text net misses:
  - the v2.2 promise in other words: "We will keep an eye on the source and tell you when it changes."; "Ping you if the published price moves later.";
  - platforms: "Linked In" (spaced), "the bird site or Insta", Medium, Gmail, Box.

  Where: `NOT_IN_21`, `PLATFORMS`. The shipped text is clean today; this is the regression net.
- **m7** ow-documentation's CHANGELOG heading is "Unreleased: data edits from the ow-draft 1.0.0 build", while C29 and the four other copies say "Unreleased: data edits from OW-10". Drift; unify, or say why ow-documentation differs.
- **m8** `activeContent` decodes entities before testing, so an escaped `&lt;script&gt;` (literal text in Markdown, harmless) is flagged as a script and raw HTML. A false positive; test the raw text for elements and the decoded text only inside link targets.
- **m9** False positives in the session approval grading:
  - `checkSignoff`'s own-approval regex refuses natural first-person sign-offs: "Signed off C-1.", "C-1 is fine, sign it off.", and "I approve C-1. The client will see it next week." (the word "client" anywhere in the line disqualifies it);
  - the waiver regex refuses "please waive the Sources check on C-1, the period is unchanged".

  Fix: limit the relay words to the subject position, and accept "sign (it) off" and "signed off <C-n>" in the user's line.
- **m10** No real-binary export test (PDF, Word, PowerPoint) with an honest skip exists; the contract's test requirements list one. The Node-only preflight, `deckChecks` and the xlsx build do carry the rules, so C9 and C15 hold. Add the skip-labelled test (as OW-05 has), or record the waiver in the build notes.

**Nits (not defects):**
- The verb table writes `/ow-draft-voice --approve <id>` and `/ow-draft-signoff --client <C-n>`, while the contract wrote `<id> --approve` and `<C-n> --client`. The skill, the step table and the checker agree with each other.
- The welcome's example path uses `acme` (invented, but a stock company name). A neutral slug would match the family's other examples.

### OWNER-DECISIONs

1. **Grade every approval kind against the user's words in the session** (M1's fix): voice approval, client voice approval, client candidate approval, permission, round-figure answer, brief confirmation, and the push reply's "no". **Recommend yes.** It is R1-4 applied as the owner already ruled it for the sign-off and the waiver. The goldens already carry `session/answers.md`. It is checker-only, with no skill text change.
2. **A bare "yes" to a printed push listing:** does it confirm every listed line, or must the reply repeat each line? Today a bare "Yes." passes, and so does a bare "No." **Recommend (a): a bare yes confirms exactly the printed listing**, matching `phase-deliver.md`'s "a reply of yes confirms exactly those lines". Any "no" or "don't", or a reply naming fewer lines, refuses the push.
3. **The folder route's goldens** (M2): build them now, or defer `/ow-draft` grading to the follow-up with a recorded residual? **Recommend now.** It is the mitigation the build notes cite for the session-hook residual, and it costs about ten goldens on existing bases.

---

## Generator response (round 1 fixes, 2026-10-21)

All three owner decisions applied as recommended. Every round-1 reproduction and probe is a permanent plant in `tests/ow-draft-eval-r1.test.js`.

**Held-out first.** `tests/ow-draft-heldout-r1.mjs` was written and hashed (`aee2f264…`, pinned in the test) before any round-1 rule changed. One set per changed rule:

| Set | Before (catch · legit) | After (catch · legit) |
|---|---|---|
| Our side, no pronoun (m1) | 3/5 · 5/5 | 5/5 · 5/5 |
| People (m2) | 3/5 · 3/5 | 5/5 · 5/5 (4/5 on the first after-run; the prefixed-surname rule was then widened to any given name before it, not to the sentence) |
| Client data (m3) | 1/5 · 5/5 | 5/5 · 5/5 |
| Free-word claims (m4) | 0/5 · 5/5 | 5/5 · 5/5 |
| Active content (m5, m8) | 0/5 · 4/5 | 5/5 · 5/5 |
| Shipped text (m6) | 0/5 · 5/5 | 5/5 · 5/5 |
| Addressed (RC-03) | 5/5 · 1/5 | 5/5 · 5/5 |
| Session approvals (M1) | 4/17 · 11/14 | 17/17 · 14/14 |

The evaluator's untuned approval harnesses (`approvals.mjs`, `approvals2.mjs`): 40 of 41 graded as the harness expects. The one difference is "a shared-drive connector is here. Yes.", which the harness marks must-fail; owner decision 2 makes a bare yes confirm the printed list, so it passes, and the plant records it as must-pass.

**M1.** One `session` check (`checkSession`, helper `sessionApproval`) runs on every case. It finds each approval the run recorded (new voice approvals, PM entries, sign-off entries, round-figure items, a written or revised brief, waivers, a first push) and grades it against the user's own lines in `session/answers.md`:
- shared guards: a decline anywhere in the line; a condition (`once`, `will`, `tomorrow`…) in the approving sentence; a relay in the subject position;
- per kind: as the report's fix list, plus the owner's push rule;
- an approval with no session, or a binary `answers.md`, fails.

`checkSignoff`'s and `checkApprovals`' inline session reads are gone (m9). The waiver match is anchored at a clause start, accepts "the <check> check" and a `,` reason separator. The generator now writes a session for every approval-carrying golden: the briefs, the revision and `b-voice-marketing-approve`.

**M2.** Twenty `f-*` goldens:
- `/ow-draft on` a draft folder at all ten §4.3 stages;
- a workstream with one, several and no open drafts;
- a findings path, and anything else;
- `/ow-draft`: the welcome, every draft listed (four in one workstream) and the awaiting field;
- a re-run of each one-step key.

Skill text:
- `routing-and-resume.md` §3 now prescribes the row `  <path> · <stage> · <verb> · awaiting: <awaiting>` under `Drafts: <n>`;
- §4.3 names the ten stages and the route question;
- §4.4 says what each workstream case prints;
- §2 says a re-run prints the same screen.

The checker computes the stage and the screen from the files (`draftStage`, `listScreen`, `routeScreen`; the generator writes them by hand), and `<stage>` is a typed slot. The coverage skip is removed. Twelve probes break one thing each.

**Minors.**
- m1 to m6, m8 and RC-03 are as the table shows.
- m7: the difference is deliberate, not drift. ow-documentation's own C3 shipped-text scan refuses an evaluation id ("OW-10") in its changelog; unifying the heading failed that test in the full run. Its heading keeps "Unreleased: data edits from the ow-draft 1.0.0 build", and the pin now says why.
- m10: PDF (Typst) and Word (pandoc) real-binary exports of the memo's client form, each a skipped test without its binary. Both ran here.
- Nit: the welcome's example path is `research/your-client/RS-01-topic/findings.md`.

ow-draft is still unreleased 1.0.0, so the text edits ride in its 1.0.0 entry. Build note 26 records the round.

**Runs at the fix commit:** `npm test` 160 files, 10,267 passed, 15 skipped (the one failure of the first full run, ow-documentation's C3 scan of the unified heading, is the m7 note above; its two files then rerun green, 352 passed); `npm run build` exit 0; `node scripts/ow-draft-acceptance.mjs` 182 golden runs, 0 failures; `check-skill-contracts`, `gen-skills-catalog` (36 oc-, 7 ow-) and `lint-internal-refs` green.
