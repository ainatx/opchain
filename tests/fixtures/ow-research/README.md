# ow-research acceptance fixtures

Everything here is **invented**: fictional clients (Larkspur Ceramics, continued from ow-build-plan's `tier2-plan` run; Fernhill Florists, Kestrel Bindery and Mossgate Books, continued from their ow-build-plan runs), a fictional consultant ("Robin" of "Example Studio"), and an invented web. No real client material, no real price and no real site's text belongs in this folder.

These are the acceptance tests from `docs/plans/2026-10-16-ow-research-design.md` §9 and the OW-09 contract (`sprints/release-2.1/ow-09/contract.md`, C1 to C26), written so they can be checked mechanically. ow-research is a text-only skill that sends its requests through the host's own web tools, so a model has to run it; the checker (`scripts/ow-research-acceptance.mjs`) reads what the run wrote, and the screen it printed, and tests them against an answer key and the recorded web. "Real use" (one real technical-feasibility question for a real client) is REL-02's; "Downstream" (ow-draft reading `findings.md`) waits for OW-10, and a field-presence test stands in for it in `tests/ow-research-acceptance.test.js`.

## The recorded web (`web/`)

`web/pages.yaml` maps each search query, word for word, to the result URLs the host returned, and each URL to the page it opens (`file`), its redirect (`redirect`) or why it is not opened (`status: login`). A page may read differently from a later date (`versions`: the vendor's limits page says 120 requests a minute until 2026-10-21 and 60 after). Every host is a subdomain of `example.com`, `example.org` or `example.net`; the one IP literal, from the documentation range, is a search result the URL rule refuses. Every page carries `INVENTED TEST FIXTURE`, and the market pages' prices are invented. `web/pages/injected/` holds the injected variants of the forum page; a case swaps one in with `web_overrides`.

Real publishers' hosts appear only where the skill's own open list names them: `skills-work/ow-research/references/framework-sources.md`, the framework manifests' `sources` (the official URL the user downloaded from), and the URL rule's must-pass controls (`tests/ow-research-controls.mjs`).

## Layout of a case

| Folder | Holds |
|---|---|
| `answer-key.yaml` | The case: `base:` (the case it continues), `extra:` (more cases layered in), `plan_case:` (an ow-build-plan golden run it starts from), `run:` (grade another case's run against this key), the checks, and what each check expects |
| `input/` | Files the case adds to its starting state: a user's `inbox/` files, a framework file the user downloaded, a cut-off ledger, a profile with a handling default |
| `session/` | What the user brings to the session: the answers given, a date, a recorded ow-tools output |
| `expected/opchain-work/` | The hand-written golden run: what ow-research writes |
| `expected/printed/` | The screen the run printed, graded only on prescribed text and structure |

## The cases

| Kind | Cases |
|---|---|
| `/ow-research-question` (C4) | `question-first` (RS-01), `question-further` (RS-02), `question-no-workstream` (ask), `question-business`, `question-handling` (a level set; still written), `question-by-name` (approval per query), `question-framework` (points to `-framework`), `question-reserved` (`frameworks` refused), `question-draft` (not confirmed), `question-profile-default` (the profile's level and banner), `question-regulations` |
| The question NEXT, `/ow-research-run` (C4, C5, C19) | `run-unconfirmed` (refused), `run-awaiting-approval` (O3), `run-approved` (the main run; design §9 Confidence and Snippets), `run-handling-client` and `run-handling-profile` (C6), `run-no-web-tools` (C22), `run-cut-after-requests`, `run-cut-after-sources`, `run-cut-after-findings` (C19), `run-finding-open` (no NEXT; a waiver refused), `run-resume-stopped`, `run-rerun` (already answered; ids kept) |
| A round figure equal to one of ours (C10; O8 as the owner narrowed it) | `run-figure-ask` (the plan screen's figure prompt; nothing sent), `run-figure-confirmed` (the user confirms it after the plan and before the go; the session holds the confirmation) |
| Other topics | `run-business` (a market topic with invented prices; an `http` downgrade refused), `run-regulations` (official text HIGH, a summary site LOW; an IP literal refused; the draft NEXT), `run-by-name` (design §9 Query privacy) |
| ow-currency's and ow-vendor-eval's NEXTs (C4; neither skill is in this release, so each route lands on the plain screens) | `route-currency-changed` (a watched passage changed: F-02 superseded by F-04), `route-vendor-eval` (`use ow-research` lands on the list) |
| Resume at every cut (C19, one rule: send the approved requests not yet logged, never re-send a logged one) | `run-cut-after-approval`, `run-cut-mid-requests`, `run-cut-after-requests`, `run-cut-after-sources`, `run-cut-after-findings`, `run-cut-after-checks`, and `run-resume-stopped` (a stopped run) |
| `/ow-research`, `/ow-research on <path>` (C4) | `list-empty`, `list-states` (every state, with its age, and framework folders), `on-draft`, `on-question-confirmed`, `on-awaiting`, `on-cutoff`, `on-needs-fixing`, `on-answered`, `on-files-only`, `on-framework`, `on-framework-files`, `on-unknown` |
| `/ow-research-framework <id>` (C16) | `framework-files-tools`, `framework-files-no-tools`, `framework-no-files` (prints the official sources), `framework-licensed` (`soc2`), `framework-unknown` (`pci-dss`), `framework-handling`, `framework-exists`, `framework-symlink` |
| Injection (C9) | One case per variant, each equal to its clean twin except for *Suspicious content*: `inj-ignore-email` (the design's case), `inj-exfil-link`, `inj-search-by-name`, `inj-rate-high`, `inj-write-run`, `inj-fake-system`, `inj-hidden-comment`, `inj-hidden-display`, `inj-hidden-alt`, `inj-hidden-meta`, `inj-hidden-aria`, `inj-hidden-chars`, `inj-preapproval`, `inj-official-pose`, and from the security review `sec-inj-next-target` (a NEXT aimed at another client), `sec-inj-primary-hidden` (a hidden comment on the vendor's own reference, a primary page), `sec-inj-title` (a `<title>`: the source's title is the page's visible heading, so the injection goes only to *Suspicious content*) `inj-search-title` (a search result's title, through `search_overrides`), and from the security re-check `sec-r2-inj-link-lure` (a visible lure link) and `sec-r2-inj-quote-mimic` (a page written in the Suspicious content line form) (twin `run-approved`); `inj-user-file` (twin `run-no-web-tools`); `inj-framework-file` (twin `framework-files-tools`) |

`plants/` is not a golden list: it holds the security review's four planted runs (`sec-poc-inj-outside-write`, `sec-poc-inj-fake-finding`, `sec-poc-run-under-profile-level`, `sec-poc-currency-under-profile-level`) and the re-check's `sec-r2-intake-level` (the client's level that ow-start and ow-build-plan record), each a golden run with one slip the checker must catch; `tests/ow-research-plants.test.js` grades them. The second evaluation's handling probes are planted runs too (`r2-h1-plan-only`, `r2-h2-follow-on-plan`, `r2-h3-intake-unparseable`, `r2-h4-handling-key-case`: a level recorded in one other place only); `tests/ow-research-eval-r2.test.js` grades them.

Amendment P5's cases live with ow-build-plan's (`tests/fixtures/ow-build-plan/research-*`): they layer this folder's `run-approved` research files into Larkspur's Build Plan.

## Checking a real run

```bash
node scripts/ow-research-acceptance.mjs --prepare run-approved /path/to/empty-folder
```

That lays out the starting state. Attach the folder in a session where ow-research is installed and run the step the case names ("use ow-research-run on research/larkspur-ceramics/RS-01-pos-sales-api/"). The invented hosts do not exist on the live web, so a real run of a web case is graded on its structure (the ledger, the reconciliation, the URL and provenance rules, the self-checks); its pages are not the recorded ones. Save the screen to `printed/<file>` beside `opchain-work/` (the key's `screen.file`), then:

```bash
node scripts/ow-research-acceptance.mjs run-approved /path/to/empty-folder
```

With no arguments, the script checks every golden run (the same thing `tests/ow-research-acceptance.test.js` does in `npm test`, under the ow-tools network fence). `tests/ow-research-plants.test.js` holds the planted failures; every plant from every evaluation round stays there.
