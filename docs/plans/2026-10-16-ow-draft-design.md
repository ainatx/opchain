# ow-draft — design (brief → evidence → draft → deliver)

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with amendments T6 and T7. Nothing is built.
**Release:** a skill in the ow- family that ships together as v2.1.0 (owner scope change 2026-10-16). Starts at 1.0.0.
**Origin:** the 2026-09-21 strategy (§6.3: "brief → evidence → draft → deliver; deck, sheet and comms as type modules"), without `ow-review`: the family uses labelled same-session self-checks and the user's own sign-off instead.
**Family rules that apply:** ow-protocol v1; code only in the `ow-tools` add-on; no network text (ow-draft never fetches; live sources come from `ow-research`); no public ow- skill names a private skill; one writer per file.
**Place:** any time, in any workstream (a client, or `business`). It writes everything the lifecycle skills don't: client reports and proposals, marketing, internal documents, and announcements a client sends to their own people.
**Upstream (all optional):** `ow-research` findings, `ow-vendor-eval` recommendations, `ow-start` logs (decisions, meeting notes), any client workspace file the user names, the user's own files. **Downstream:** the destinations in `handoffs.yaml` → `drafts`; nothing in the family reads a delivered draft.

## 1. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-16 | Scope | `ow-draft` ships in v2.1.0 |
| 2 | 2026-10-16 | What it writes | **All four kinds:** other client deliverables (reports, assessments, recommendations, proposals and RFP responses, one-pagers); marketing (case studies, blog posts, newsletters, social posts, site copy); internal business documents (policies, SOPs, plans, memos); client comms (announcements and emails a client sends to their own people) |
| 3 | 2026-10-16 | Formats | **All four types:** documents (PDF/Word), decks (PPTX), sheets (CSV/XLSX with formulas), emails and posts |
| 4 | 2026-10-16 | Gate before delivery | **Self-checks plus your sign-off:** labelled self-checks must pass on a frozen candidate, then you confirm you read that candidate; `-deliver` refuses anything changed since |
| 5 | 2026-10-16 | Voice | **Voice files from samples:** one per voice (e.g. client deliverables, marketing, and one per client for their comms), drafted from 3–5 of your samples and approved by you; a self-check holds the draft to it |
| 6 | 2026-10-16 | Naming clients in marketing | **Anonymised unless permitted:** a client is described, not named, unless their permission is recorded (date, role); a quote needs their approval of the exact words; never their data or screenshots |
| 7 | 2026-10-16 | Sources | **Every factual claim cited:** each claim, number and quote points to an evidence item; opinions are marked as the author's; numbers come from sources or `ow-tools calc`, never estimated |
| 8 | 2026-10-16 | Delivery | **Files, plus a push on confirmation:** exports always; Markdown into a configured repository folder on a branch, or a push through a connector, only after the user confirms. It never posts or sends by itself |

## 2. Where files live

```
opchain-work/
  voices/<voice-id>.md                 # -voice; e.g. client, marketing, client-acme
  permissions/<client>.md              # -brief; what a client lets you name, quote or show (§4.3)
  drafts/<workstream>/DR-nn-<slug>/
    brief.md                           # -brief
    evidence.md                        # -evidence (E-nn items)
    draft.md | deck.md | sheet/ | comms.md   # -write (one type per draft)
    candidates/C-n.md (+ sheet/)       # -freeze: frozen copies, never edited
    checks/C-n.md                      # -freeze: self-check results for that candidate
    signoff.md                         # -signoff (append-only list of sign-offs)
    export/                            # -deliver
    deliveries.yaml                    # -deliver: what went where, when
```

## 3. Verbs

Every file has one writer verb. Every verb starts with the ow-protocol resume step; with `brief.md` absent, every draft verb except `-brief` stops with `NEXT: use ow-draft-brief`.

| Verb | Does | Writes |
|---|---|---|
| `/ow-draft` | Lists open drafts with their stage (brief, evidence, writing, candidate, signed off, delivered) | — |
| `/ow-draft-voice <id>` | Drafts a voice file from 3–5 samples the user gives (§5); the user approves it | `voices/<id>.md` |
| `/ow-draft-brief <workstream>` | Asks: kind (§4.1), type (§4.2), audience, purpose, the one key message, length, deadline, voice, destination, constraints; the user confirms | `brief.md` |
| `/ow-draft-evidence` | Builds the evidence list from what the user gives, ow-research findings and named workspace files (§6) | `evidence.md` |
| `/ow-draft-write` | Writes or revises the draft from the brief and evidence, by the type's module (§4.2) | the type's draft file(s) |
| `/ow-draft-freeze` | Copies the draft as candidate C-n, records its digest (`ow-tools digest`, T7), runs every self-check (§8) | `candidates/C-n.*`, `checks/C-n.md` |
| `/ow-draft-signoff <C-n>` | Records that the user read candidate C-n and approves it (§7); for client comms, also the client's approval as reported | `signoff.md` |
| `/ow-draft-deliver` | Exports the signed-off candidate and delivers it (§9) | `export/`, `deliveries.yaml` |

### 3.1 Reads and absent cases

| File | Used for | If absent |
|---|---|---|
| `research/<workstream>/RS-nn-<slug>/findings.md` (ow-research; path fixed by ow-research D1) | Evidence items with their sources and fetch dates | The user supplies sources; nothing is fetched |
| `vendor-eval/<workstream>/VE-nn-<slug>/recommendation.md` (ow-vendor-eval; path fixed by ow-vendor-eval D2) | Evidence for a recommendation or proposal | — |
| `logs/<workstream>/` (ow-start) | Decisions and meeting notes as evidence | — |
| Workspace files the user names (e.g. `plans/<client>/map/future.md`) | Evidence, cited by path | — |
| `voices/<id>.md` | The voice the brief names | Offer `-voice`; or draft with the brief's tone line, and the Voice check is NOT-CHECKED |
| `brand.yaml` | Export styling | Neutral styling |
| `handoffs.yaml` → `drafts` | Destinations | Files only, public default |
| `permissions/<client>.md` (§4.3) | Whether a client may be named or quoted | Anonymise |

## 4. Kinds, types and permissions

### 4.1 Kinds

| Kind | Default voice | Rules on top of the self-checks |
|---|---|---|
| Client deliverable | your client voice | No internal numbers (hours, rates, margins, price-book internals) |
| Marketing | your marketing voice | Naming and quotes only with recorded permission (§4.3); no client data or screenshots; no internal numbers |
| Internal | your client voice, plainer | Stays in the `business` workstream; never exported with client branding unless asked |
| Client comms | **the client's** voice file | Written for the client to send; delivered to the client contact; the client's approval recorded before `-deliver` |

### 4.2 Types (one module each, in `references/type-<type>.md`)

| Type | Draft file | Module rules | Export |
|---|---|---|---|
| Document | `draft.md` | One H1; sections answer the brief's key message first; tables with header rows; alt text | PDF and Word (ow-tools export) |
| Deck | `deck.md` | One slide per H2; one message per slide in its title; speaker notes; no slide over its word limit | PPTX (ow-tools `export --pptx`, approved as T2 in the ow-documentation design) |
| Sheet | `sheet/*.csv` + `sheet/model.md` | Inputs are cited cells; every computed cell is a formula written in `model.md`, never a typed result; a Sources sheet lists E-nn | CSV and XLSX (ow-tools `export --xlsx`, T6) |
| Comms | `comms.md` | Email: subject, preview line, body, call to action. Post: the platform's length limit checked. Newsletter: sections and links | Email as HTML and text; posts and newsletters as text and Markdown |

### 4.3 Permissions for naming a client (decision 6)

`permissions/<client>.md` (written by `-brief` when the user records a permission) holds: what is permitted (name, logo, quote with its exact approved words, results figures), by whom (client role), the date, and any expiry. Marketing that names, quotes or shows results for a client without a matching permission fails the Naming check; the default is a description ("a 12-person logistics firm"). Client data, screenshots and documents never appear in marketing.

## 5. Voices (decision 5)

`-voice <id>` reads 3–5 samples the user names (their own writing for that voice) and drafts a voice file: who it speaks to, sentence length, words used and avoided, how it handles numbers and jokes, what it never does, and two short example paragraphs. The user edits and approves it; only an approved voice file is used by the Voice check. A client's voice file comes from that client's own published writing and their approval of it (recorded in the file).

## 6. Evidence and claims (decision 7)

`evidence.md` lists items `E-nn`: the source (workspace path, user file, ow-research finding with its URL and fetch date), what it supports, its date, and the ow- confidence level (HIGH shown · MEDIUM stated · LOW inferred · UNKNOWN). In the draft, every factual claim, number and quote carries an `[E-nn]` marker in the Markdown (removed at export and replaced by footnotes or a Sources section, by the type's module). Opinions and recommendations are written as the author's view. A number is copied from its source or computed by `ow-tools calc` with the calculation recorded; never estimated. A claim with no evidence item is either cut, reworded as opinion, or listed as an open question in the brief.

## 7. Candidate and sign-off (decision 4)

- **Freeze:** `-freeze` copies the current draft to `candidates/C-n` (never edited afterwards) and records its digest: `ow-tools digest` (T7) where code can run, labelled "detects accidental change only; not tamper-evidence"; otherwise a weak fingerprint (length and first and last lines) labelled weak. It then runs every self-check on C-n into `checks/C-n.md`.
- **Sign-off:** `-signoff C-n` refuses while any check in `checks/C-n.md` is FINDING (§8). It records `read and approved by <user> on <date>, as stated; not verified by this skill`. For client comms it also records `approved by <client role> on <date>, as reported`.
- **Any change after freeze** means a new candidate: `-write` after a freeze makes the next `-freeze` C-(n+1), and sign-offs never carry over.

## 8. Self-checks

Each reports OK / FINDING / NOT-CHECKED(reason), labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. **"No credentials", "No private names", "Naming" and "Personal data" can never be waived.** A waiver of any other FINDING is the user's, recorded in `checks/C-n.md` with the reason.

| Check | Passes when |
|---|---|
| Brief fit | The key message is stated in the first section (first slide, first lines); audience and length within the brief (±10%) |
| Sources | Every factual claim, number and quote carries an `E-nn` that exists and supports it |
| Numbers | Every number is copied from its source or has a recorded `calc`; sheets have no typed computed values |
| Voice | The draft keeps the approved voice file's rules (NOT-CHECKED without an approved voice) |
| Naming | No client named, quoted or shown without a matching permission (marketing); no client data or screenshots in marketing |
| No internal numbers | No hours, rates, margins or price-book internals in client deliverables, marketing or client comms |
| Personal data | No person's contact details; a named person only with their recorded permission |
| No credentials | No password, key or token anywhere |
| No private names | No blocklisted name (`llc-ops`) and no private skill |
| Accessible by construction | The ow-tools export preflight passes (headings, alt text, table headers, link text) |

## 9. Delivery (decision 8)

`-deliver` refuses unless the current draft equals the signed-off candidate (same digest, or the same text when only a weak fingerprint exists). It exports the candidate through ow-tools, then, by the brief's destination in `handoffs.yaml` → `drafts`:

```yaml
drafts:
  blog:       { repo: ../site, path: src/content/blog/ }       # Markdown into a repository folder, on a branch
  linkedin:   { say: "post the text in export/post.txt on LinkedIn" }
  newsletter: { say: "paste export/newsletter.html into your newsletter tool" }
  drive:      { say: "upload export/*.docx to the shared folder" }
```

- **Repository:** writes the Markdown into the configured folder on a new branch and prints NEXT to commit it there; never pushes or merges; refuses to overwrite a file it didn't write.
- **Connector:** when the session has a connector for the destination, lists exactly what goes where and pushes only after the user confirms; records it in `deliveries.yaml`.
- **Otherwise** it prints the `say:` line, or the public default "deliver the files in `export/` yourself". It never posts, publishes or sends anything without that confirmation.

## 10. What this skill never does

Fetches anything from the web · states a fact without an evidence item · estimates a number · names or quotes a client without recorded permission · puts client data in marketing · delivers a candidate that wasn't signed off, or one changed since · posts, publishes or sends without confirmation · writes a credential or a private skill name.

## 11. Acceptance tests

- **Sources:** a draft with an uncited number fails Sources; adding `E-03` that supports it passes.
- **Numbers:** a sheet with a typed total fails Numbers; replacing it with a formula in `model.md` passes, and the XLSX shows the formula.
- **Naming:** a case study naming a client fails Naming with no permission file; with a recorded permission for the name only, a quote still fails until its exact words are approved.
- **Voice:** a marketing post using a word the voice file avoids is a FINDING; without an approved voice, Voice is NOT-CHECKED and sign-off still works.
- **Candidate:** freeze C-1, sign it off, edit the draft: `-deliver` refuses; freeze C-2, sign it off, deliver passes.
- **Client comms:** `-deliver` refuses until the client's approval is recorded.
- **Deck:** a six-H2 deck exports to a six-slide PPTX with speaker notes.
- **Delivery:** a blog post lands only in the configured folder on a new branch; a connector push happens only after confirmation and is recorded.
- **No network:** with no ow-research output, `-evidence` takes only user sources and fetches nothing.
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Real use:** one real Deftwright case study (anonymised) and one client report.

## 12. Amendments this needs in other designs (approve with this design)

| # | Design | Amendment |
|---|---|---|
| T6 | `ow-tools` | `export --xlsx`: CSV files plus a formula map (`model.md`) → XLSX with formulas, number formats, a header row per sheet and a Sources sheet; Node built-ins only (XLSX is zipped XML); preflight refuses a computed cell with a typed value where the map gives a formula |
| T7 | `ow-tools` | `digest <file>`: SHA-256 of a file or folder (sorted paths), printed with "detects accidental change only; not tamper-evidence" |

## 13. Open questions

None. The policy-drafting question was settled with ow-controls on 2026-10-16: ow-draft writes policy text (kind *internal* for your own policies, *client deliverable* for a client's), and ow-controls tracks which controls each policy serves and records its approval.
