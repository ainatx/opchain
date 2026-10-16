# ow-controls — design (the standing control register and framework packs)

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 with amendments P7, P8, H6, C1, S3 and R2. Nothing is built.
**Release:** a skill in the ow- family that ships together as v2.1.0 (owner scope change 2026-10-16). Starts at 1.0.0. Framework packs ship beside it as data (§6).
**Origin:** the 2026-09-21 strategy §6.6 (*Assured* bundle) and the 2026-09-18 audit's framework-pack rules (`docs/audits/2026-09-18-ow-pack-design-audit.md`, "Framework packs" and the cross-cutting rules). This design applies those rules; it does not reopen them.
**Family rules that apply:** ow-protocol v1; labelled same-session self-checks; code only in `ow-tools`; no network text (fetching is `ow-research -framework` and `ow-currency`); no public ow- skill names a private skill; one writer per file; people by role.
**Place:** three uses (decision 2): controls inside a client build (with ow-build-plan, ow-uat and ow-handoff), your own business's register, and a client's standing register sold as a readiness service. **Upstream:** framework packs; `ow-research -framework` fetches (unpinned); `plans/<client>/map/future.md` and `systems/*.md`; evidence pointers from ow-uat, ow-handoff and the client. **Downstream:** `ow-build-plan` (controls as acceptance checks, P7), `ow-draft` (policies), `ow-handoff` (control tests in the operator notes, H6), `ow-care` (tests due in the health checklist, C1), `ow-currency` (pins to watch).

`ow-controls` keeps a register of controls: what each one is for, who runs it, how often it's tested, which framework requirement it answers (cited to a pinned pack), and where its evidence lives. It never says anything is compliant, never stores the records themselves, and never loads licensed framework text.

## 1. Owner decisions

| # | Date | Question | Answer |
|---|---|---|---|
| 1 | 2026-10-16 | Scope | `ow-controls` and its first packs ship in v2.1.0 |
| 2 | 2026-10-16 | Whose controls | **All three:** controls in client builds; your own business; a client's standing register sold as a readiness service |
| 3 | 2026-10-16 | Packs in v2.1.0 | **NIST SP 800-53** (proving pack) · **HIPAA, mapping only** · **US state privacy + GDPR** · **SOC 2 in own words** |
| 4 | 2026-10-16 | State laws in the privacy pack | **California (CCPA/CPRA and CPPA regulations), Texas (TDPSA), Colorado (CPA and rules), Virginia (VCDPA)**, with GDPR; others loadable from official text |
| 5 | 2026-10-16 | Policies | **ow-draft writes them, ow-controls tracks them:** which controls each policy serves, and its approval |
| 6 | 2026-10-16 | Controls in client builds | **As acceptance checks:** the client picks controls; ow-build-plan turns them into scope items with acceptance checks, UAT tests them, the handoff carries their evidence pointers (P7, H6) |
| 7 | 2026-10-16 | Readiness service | **A fixed-fee quick quote** sized by frameworks and processes (P8); upkeep then continues under care |
| 8 | 2026-10-16 | How packs reach a machine | **A data-only `ow-packs` plugin plus a zip;** `-pin` copies the chosen edition into the workspace with its digest |

**Carried from 2026-09-21 (owner decisions, unchanged):** licensed text (SOC 2, ISO, HITRUST, GAMP 5) in own-words, no-text mode until counsel · HIPAA mapping only, no PHI ever entered · evidence bundles are pointers only · a newer revision is pinned-and-reported, the organisation decides when to move · currency cadence is user-set (`interval_days`) · FedRAMP dropped. 800-171/CMMC and GxP are not in v2.1.0 (decision 3).

## 2. Inert without a profile

With no `compliance/<workstream>/profile.md`, no ow- skill asks a compliance question beyond one plain one ("Does this work have to follow any regulation or standard? no / yes / not sure"), shows control or register vocabulary, or adds a regulatory caveat. `yes` or `not sure` offers `/ow-controls-scope`.

## 3. Where files live

```
opchain-work/compliance/
  packs/<framework>/<edition>/<snapshot-date>/   # -pin: pinned copies, never edited
  loaded/<source-id>/                            # -load: your own open-licence sources
  <workstream>/                                  # <client> or "business"
    profile.md          # -scope (sole writer)
    pins.md             # -pin: dated pin records, never overwritten
    register.md         # -map: CTL-nn rows
    evidence/index.md   # -evidence: pointers to records
    tests/TST-nn.md     # -evidence: one file per control test
    gaps.md             # -gaps
    policies.md         # -policies: needed policies and their approvals
    bundles/<date>/     # -bundle: pointer bundle for an auditor or client
```

## 4. Verbs

Every file has one writer verb. Every compliance-output verb starts with the ow-protocol resume step and the **on-use currency check** (§6.4).

| Verb | Does | Writes |
|---|---|---|
| `/ow-controls-scope <workstream>` | The profile: entity type, sector, jurisdictions, frameworks in scope, whether records are regulated (`regulated_records`), handling level (user-supplied, never inferred), default test frequency, `interval_days`. All values user-supplied | `profile.md` |
| `/ow-controls-pin <framework>` | Copies an edition from the `ow-packs` plugin, the zip, or an `ow-research -framework` fetch into `compliance/packs/`, records its digest (`ow-tools digest`) and the pin. Moving a pin is human-decided: a new dated record shows the delta when one exists (§6.3) | `packs/…`, `pins.md` |
| `/ow-controls-load` | Loads an **open-licence** source the user has (a state guidance PDF, an agency standard): title, issuer, revision, licence note, who loaded it; ids by section where the source has none. Licensed sources load as identifiers only (§6.2) | `loaded/<source-id>/` |
| `/ow-controls-map <process or system>` | Maps the pinned requirements that apply to a process or system to controls (§5); each row cites pack, edition and requirement id | `register.md` |
| `/ow-controls-evidence` | Records where each control's evidence lives (pointer, owner role, date, as reported) and each test performed (date, by role, result, next due) | `evidence/index.md`, `tests/TST-nn.md` |
| `/ow-controls-gaps` | Requirements with no control, controls with no evidence, overdue tests, `TEXT-NOT-LOADED` and `NO-PACK` states, each with a suggested next step | `gaps.md` |
| `/ow-controls-policies` | Lists the policies the controls need; hands each to ow-draft; records each approved policy (path, candidate digest, approver role, date, the not-a-record wording) | `policies.md` |
| `/ow-controls-status` | One screen: controls by state, tests due and overdue, pin and pack age, gaps. Writes nothing | — |
| `/ow-controls-bundle` | A pointer bundle: register, evidence index, test records, gaps, pins, the not-a-record statement; exported as PDF/Word | `bundles/<date>/` |

## 5. The register

Each `CTL-nn` row: objective (plain words) · applies to (process or system) · owner (role) · type (preventive, detective, corrective) · how it's performed · test frequency and **next due as an ISO date** · requirement citations (`<pack>@<edition>#<id>`; licensed: identifier only, "mapped to identifier only") · evidence expected (a pointer, never the record) · state.

**States:** `designed` · `implemented` (evidence pointer recorded) · `operating` (a passing test within its frequency) · `not applicable` (with the reason and who decided) · `TEXT-NOT-LOADED` (a licensed requirement with no text; distinct from met and gap). The skill never writes "compliant", "certified" or "audit-ready" for anything.

**Nothing is a record.** Every approval, test record and bundle carries: *"This is a working record made by an AI assistant at your instruction. It is not an electronic signature or an official record; file the approved version wherever your organisation keeps its official documents."* When `regulated_records: true`, the longer fixed text from the audit is added (identity not verified; date and time not system-generated; record it in your organisation's system). Tests pin both wordings so later edits can't soften them.

### 5.1 In a client build (decision 6)

`-map` runs on `plans/<client>/map/future.md` and `systems/*.md` during the Build Plan. The client picks which controls the build implements; ow-build-plan's `-scope` turns each into a scope item with an acceptance check citing `CTL-nn` (P7). UAT tests them like any check; the acceptance record's cleared evidence becomes the control's first evidence pointer; ow-handoff adds each recurring control test to the operator notes (H6); ow-care's health checklist lists tests coming due (C1).

### 5.2 Your own business

The `business` workstream: your own controls (access, backups, device security, vendor review, incident response), mapped to the SOC 2 own-words set or 800-53, for answering clients' security questionnaires from the register and its evidence pointers.

### 5.3 Readiness service (decision 7)

Sold by quick quote (P8), sized by frameworks and processes. Delivers: profile, pins, register, gaps, the policy list (drafted through ow-draft), the evidence index and a bundle. Test reminders and evidence upkeep then continue under ow-care (care work).

## 6. Framework packs

### 6.1 Packs are data

- **Source:** `packs/<framework>/<edition>/<snapshot-date>/` in this repo, each with `pack.yml`, its own `LICENSE`/`NOTICE` (so Apache-2.0 is never asserted over government works), and pre-sharded text: one small file per control family or part, each headed with source version, retrieval date and SHA-256. `scripts/build-packs.mjs` builds them from official machine-readable sources (e.g. NIST's CC0 OSCAL, not the PDFs) and validates them against a schema, as `skills/oc-stack-forge/packs/_schema.json` does today.
- **`pack.yml`** records per source: licence class (`open` · `open-with-conditions` · `licensed` · `incorporated-by-reference`), `text_shipped` (none · identifiers · titles · full), requirement unit, `publisher_latest` separately from `binding_revision`, effective dates per jurisdiction, pending changes (reported, never applied), bindingness, and per section either a legal status or the literal "judicial and enforcement status not checked".
- **Delivery (decision 8):** a data-only **`ow-packs`** plugin (no code, no hooks) in the marketplace, and the same folders as a zip for hosts without plugins. Editions are kept side by side; a build check fails if a published pack path changes or disappears.

### 6.2 The v2.1.0 packs

| Pack | Source and licence | Text shipped | Notes |
|---|---|---|---|
| `nist-800-53` r5.2.0 + 800-53B baselines | NIST OSCAL, CC0 | Full | The proving pack for snapshot, pin and delta (5.1.1 → 5.2.0) |
| `hipaa-security` (45 CFR 164 Subpart C) | eCFR, US government work | Full | **Mapping only:** no PHI is ever entered, and every output says so; "an eCFR snapshot is not the law in force"; the pending Security Rule rulemaking listed as *proposed, not binding* |
| `privacy-us-eu` | GDPR (EUR-Lex, reuse with attribution); CCPA/CPRA and CPPA regulations; TDPSA; CPA and rules; VCDPA (official state sources) | Full for open sources | A composite of sub-packs with effective dates and binding instruments; legal status "not checked" by default |
| `soc2-ownwords` | AICPA (licensed) | **Identifiers and category structure only** | Own-words controls; every citation reads "mapped to identifier only"; `TEXT-NOT-LOADED` where text would be needed; the licensed-text path doesn't ship until counsel has read the AICPA terms |

### 6.3 Pins and deltas

A pin records framework, edition, snapshot date, digest and method. The skill refuses a pack that differs from its pin (`PINNED PACK MISMATCH`) or is missing (`PINNED PACK MISSING`). Moving a pin is human-decided and writes a new dated record; when a delta file exists for the two editions, `-pin` lists the changed requirement ids that touch register rows (substantive changes only, as the pack maintainer classed them). Deltas are data computed author-side; the skill filters them by register ids and never diffs catalogs itself. Delta files for open-licence packs ship free in `ow-packs` (owner decision, ow-currency design decision 2).

### 6.4 On-use currency check

Every compliance-output verb first compares the pinned pack's age with `interval_days`: "the pinned pack is 94 days old; your interval is 30". It needs no network. Network checks for newer revisions are `ow-currency`'s.

## 7. Self-checks

Each reports OK / FINDING / NOT-CHECKED(reason), labelled *same-session self-check: the same assistant applying a checklist; a discipline, not an independent review*. `-bundle` and `-policies` refuse while any is FINDING. **"Never asserts compliance", "No licensed text", "Not a record", "Pointers only", "No credentials" and "No private names" can never be waived.**

| Check | Passes when |
|---|---|
| Never asserts compliance | No output says compliant, certified, audit-ready or equivalent |
| Cited | Every register row cites pack, edition and requirement id; licensed citations are identifier-only |
| Pin match | Every pack read matches its pin's digest |
| No licensed text | No licensed-class text in any pack copy, register, bundle or deliverable |
| Not a record | The fixed wording is present on approvals, test records and bundles (and the longer text when `regulated_records`) |
| Pointers only | Evidence is a pointer; no record, PHI or personal data copied into the workspace |
| Dates | Every next due is an ISO date; overdue items are shown, never promised as reminders |
| People by role | Owners and testers by role |
| No credentials | No password, key or token |
| No private names | No blocklisted name (`llc-ops`) and no private skill |

## 8. What this skill never does

Says anything is compliant · loads licensed framework text · stores a record, PHI or personal data · treats a fetched or newer revision as the one in force · moves a pin without the user · promises a reminder · writes a policy itself (ow-draft does) · infers a handling level or a retention period.

## 9. Acceptance tests (walkthroughs ship with the skill)

- **Inert:** with no profile, ow-build-plan shows one plain question and no compliance vocabulary.
- **Client build (HIPAA):** a fixture clinic intake automation maps to `hipaa-security` safeguards; the client picks four controls; ow-build-plan's scope shows four acceptance checks citing `CTL-nn`; after a fixture UAT, the evidence index points to the acceptance record's cleared items; ow-handoff's notes include each recurring test.
- **Privacy:** a fixture online store selling into California and Texas maps notice and opt-out obligations from both sub-packs with their effective dates and "legal status not checked".
- **SOC 2 own words:** the business register maps controls to SOC 2 identifiers only; a criterion needing text shows `TEXT-NOT-LOADED`; a planted AICPA sentence fails "No licensed text".
- **Pin and delta:** pin 800-53 5.1.1, move to 5.2.0 with a fixture delta: the record is dated, the old pin stays, and only register rows touched by substantive changes are listed.
- **Mismatch:** an edited pack file gives `PINNED PACK MISMATCH`.
- **Currency on use:** a 94-day-old pack with `interval_days: 30` is reported at the top of `-status`.
- **Wording:** removing the not-a-record sentence from a bundle fails; "compliant" in a gaps note fails.
- **Private names:** with an empty `handoffs.yaml`, no output names `llc-ops` or "Deftwright".
- **Real use:** Deftwright's own business register, mapped to the SOC 2 own-words set.

## 10. Amendments this needs in other designs (approve with this design)

| # | Design | Amendment |
|---|---|---|
| P7 | `ow-build-plan` | With a compliance profile, `-map` offers `NEXT: use ow-controls-map`; `-scope` reads `compliance/<client>/register.md` and turns each control the client picks into a scope item with an acceptance check citing `CTL-nn`. Without a profile, nothing changes (inert) |
| P8 | `ow-build-plan` | `price-book.yaml` gains `controls_readiness: { sizes: { S, M, L }, size_by: { frameworks, processes } }`; `-quote --quick --controls` writes the readiness scope (§5.3) and a fixed-fee quote; `--signed` prints `NEXT: use ow-controls-scope` |
| H6 | `ow-handoff` | When `compliance/<client>/register.md` exists: `-notes` adds an `OP-nn` entry per recurring control test (frequency, how, evidence pointer); the Handoff notes list controls with their evidence pointers and next due dates |
| C1 | `ow-care` | The health checklist lists control tests due in the month from the register; a test performed under care is recorded through `ow-controls-evidence` |
| S3 | `ow-start` | An `offers.md` path may carry `quote: controls-readiness` (same mechanism as S2) |
| R2 | `ow-research` | `-framework` output can be pinned by `ow-controls-pin` from its `frameworks/<id>/<date>/` folder; until then it stays "unpinned — fetched, not a pack" |

## 11. Repo work this implies (for the build re-plan)

`packs/` source tree and `scripts/build-packs.mjs` (shard, digest, validate, delta) · `plugins/ow-packs/` data plugin and its marketplace entry · a pack zip in the build · CI: pack schema validation, the never-delete check, a lint that fails any licensed-class sub-pack containing requirement text · tests pinning the not-a-record and "mapped to identifier only" wordings.

## 12. Open questions

1. **Counsel on licensed text.** The licensed-text path (loading an organisation's own AICPA or ISO text) doesn't ship until a lawyer has read the AICPA and ISO terms. Until then SOC 2 stays identifiers only. Nothing in v2.1.0 depends on it.
2. ~~Where deltas come from~~: settled 2026-10-16 with ow-currency: delta files for open-licence packs ship free in `ow-packs`; the paid feed waits for its prerequisites.
