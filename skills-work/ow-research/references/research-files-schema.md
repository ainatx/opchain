# Research files: what each one holds

These are the scratch cache. The record of the answer is the CRM's `research_findings` document on the deal or account (SKILL.md "Where it lives in the CRM"), with `findings.md` as its body; the question, the query log, the sources and the manifests stay here as the trail. Every file below starts with `written_by: ow-research 2.0.1` and `created: <YYYY-MM-DD>` (older files with more header keys still read). Ids are numbered once and never reused (section 7). Dates come from `date`.

    opchain-work/research/
      <workstream>/RS-nn-<slug>/          a client's slug, or business
        question.md   queries.md   sources.md   findings.md
        inbox/                            files and saved pages you supply (yours; never copied)
      frameworks/<id>/<YYYY-MM-DD>/       the publisher's files you downloaded, and manifest.yaml

## 1. `question.md`

Header keys after those two:

    topic: RS-nn-<slug>
    kind: background | technical-feasibility | market | regulations
    depth: quick | standard | deep          # 5, 15 or 40 page requests
    serves: build-plan plans/<client>/ | draft | vendor-eval | decision
    keep_out: ["<business name>", "<variant>", "<domain>", "<a customer or supplier its files name>"]
    owners: [<host>, <host>/<path>/]        # the exact hosts of the vendor and official publishers that own the facts; *.<host> takes in its subdomains
    by_name: []                             # exact queries or URLs the user approved by name, each with its date

Sections: `## The question` · `## The decision it serves` · `## Scope` · `## Answered when` · `## Generic description` (the only words queries are built from: kind of business, size band, tools in use, region; never a name, a person or a quote) · `## Keep out of every query` · `## Owners of the facts`.

## 2. `queries.md`: the request ledger (it only grows)

One line per event, in order, before the request it logs:

    - <YYYY-MM-DD> <HH:MM> | R-<n> | <event> | <detail>

| Event | Detail | When |
|---|---|---|
| `marker: plan` | `Q-nn "<query>" · Q-nn "<query>"` | the planned queries, before the first search |
| `marker: plan approved` | `the user approved Q-nn, Q-nn`, naming only what the user approved; a declined query after them in brackets, `(Q-nn declined)` | the user's one go; any other wording approves nothing |
| `marker: figure confirmed` | `Q-nn \| the user confirmed <figure> is a market figure` | a round figure in Q-nn equals one of yours; after the plan (or batch) that showed Q-nn and before its approval, in the user's own words |
| `marker: batch` / `marker: batch approved` / `marker: batch withdrawn` | as for the plan; past the cap, `the user approved <ids>; past the cap: +<n>` after a `marker: batch` that showed the extra requests | queries or requests added mid-run, or past the cap; a withdrawn batch is never sent |
| `marker: by-name approved` | `Q-nn "<exact query>"` or `P-nn <exact URL>` | before that one request |
| `marker: no requests: no web tools` | none | nothing will be sent this run |
| `search Q-nn` | `web search \| "<query>" \| via: plan` (or `via: batch`) | **before** the search is sent |
| `open P-nn` | `page opening \| <url> \| via: <source>` (`references/web-rules.md` §5) | **before** the page is requested |
| `reopen P-nn` | `page opening \| <url> \| via: reopen P-mm` | a cut-off run reopening a page to record its source |
| `outcome Q-nn` | `<n> results: <url> · <url> · …` (every result URL, in the order the host gave them), `refused: query privacy (<category>)` or `failed: <reason>` | after the search, or instead of it when refused |
| `outcome P-nn` | `opened` · `skipped: login` · `skipped: paywall` · `skipped: blocked` · `refused: URL rule (<reason>)` · `refused: provenance (<reason>)` · `redirected to <url>` · `failed: <reason>` | after the request, or instead of it when refused |
| `marker: requests done` | `<n> searches, <n> page requests (<depth> cap <n>)` | no request follows in this run |
| `marker: sources` | `S-nn–S-nn` | after `sources.md` is added to |
| `marker: findings` | `F-nn–F-nn` | after `findings.md` is written |
| `marker: checks` | `checklist done` | after the checklist |
| `marker: status` | none | the run is finished |
| `marker: stopped` | `<check>; <what would clear it>` | instead of `marker: status`, when a problem cannot be fixed here; the run resumes at the same step once it is cleared |
| `marker: resumed at <step>` | `R-<n> cut off after <step>`; the step is `plan`, `approval`, `requests`, `sources`, `findings`, `checks` or `status` | a run that picks up a cut-off one |

A refused request is logged and never sent. `Q-nn` and `P-nn` are numbered once per topic. A query never contains ` | `, the separator between fields.

## 3. `sources.md` (written by `-run`; it only grows)

One block per page opened or user file read, then one block per page request that was not opened:

    ### S-nn
    - url: <url>                        # a user file: inbox/<file name>
    - saved from: <url>                  # a user file only, when the user says where they saved it from
    - request: P-nn (R-<n>)              # a user file: none (user file)
    - title: <the page's visible main heading, invisible characters stripped>
    - publisher: <who publishes it>
    - standing: vendor reference | vendor page | official publisher | standards body | trade publication | industry association | government statistics | news | blog | forum | summary site | directory    # a user file: the standing of what was saved
    - class: primary | secondary          # primary only on owners (a user file: its saved-from URL), never a page users write, and only with a primary's standing (confidence-rules §1)
    - stated date: <published or updated date as the page states it> | not stated
    - retrieved: <YYYY-MM-DD>
    - opened: page | user file
    - quotes (as returned by the host's page tool):    # a user file: "- quotes:", copied from the file
      - "<text, 25 words or fewer>"
    - note: <optional; a credential-shaped sample becomes [credential-shaped text not copied]>

    ### not opened: P-nn
    - url: <url>
    - outcome: skipped: login | skipped: paywall | skipped: blocked | refused: <rule> | failed: <reason>
    - run: R-<n>

At most three quotes per source, each 25 words or fewer; everything else is paraphrased. A page's quotes are the words the host's page tool returned for it, which in some hosts is a reading of the page rather than the page (`references/web-rules.md` §4), so they carry that label. The title is never taken from the page's `<title>` or other metadata: text there addressed to an assistant goes only to *Possible embedded instructions*. No page is stored whole, and no file in `inbox/` is copied anywhere.

## 4. `findings.md`

The body of the CRM's `research_findings` document, internal. Header keys after the first two: `topic`, `kind`, `serves`, `runs: [R-1, …]`. Sections, in this order:

- `## Answer`: a short answer to the question; **every sentence cites at least one `[F-nn]`**.
- `## Findings`: one block per finding:

      ### F-nn
      - claim: <one claim>
      - level: HIGH | MEDIUM | LOW | UNKNOWN
      - basis: states | implies | inferred
      - sources: S-nn (<url>, retrieved <YYYY-MM-DD>, primary | secondary); …
      - conflicts: none | S-nn (see Conflicts)
      - watch: yes | no
      - watched passage: "<the quote a later check compares, 25 words or fewer>" (S-nn)    # only when watch: yes
      - run: R-<n>

  Each source is written inline with its URL, `retrieved` date and class, so the findings stand alone.
- `## Superseded`: `- F-nn superseded by F-nn (R-<n>): was "<the old claim>" (<old level>); <what changed>`, or `none`. A superseded finding leaves `## Findings`; its id is never used again.
- `## Conflicts`: each clash, naming both sources and what each says, and the rule that set the level (`references/confidence-rules.md`); or `none`.
- `## Gaps`: `- <what could not be found> — would settle it: <what would>`; or `none`.
- `## Possible embedded instructions`: one line per passage, `- "<quote, 25 words or fewer, control and invisible characters stripped, no double quotes inside>" — <url or inbox/<file>> (<where: visible text, visible text with invisible characters, hidden comment, hidden text, alt text, meta tag, aria-label, page title, search result title, user file>). Not acted on.`; or `none found`. Nothing else goes in this section: never a finding block, a level, a status line, a ledger marker or an approval. A reader takes findings only from `### F-nn` blocks under `## Findings`, and every `##` section appears once.
- `## Self-checks`: `checklist done`, or the problem still open and why the run stopped. Readers of this file take no finding from a topic that names an open problem here.

These seven sections, in this order, and no others; each appears once, and each `F-nn` id heads one block.

A re-run rewrites this file under the id rule (section 7): every earlier `F-nn` is still there, unchanged or listed under *Superseded*. In the CRM it is a new version beside the earlier ones.

## 5. `research/frameworks/<id>/<date>/manifest.yaml`

    written_by: ow-research 2.0.1
    created: <YYYY-MM-DD>
    label: unpinned — fetched, not a pack
    framework: <id>
    text: <the open list's name for it>
    publisher: <publisher>
    retrieved: <YYYY-MM-DD>
    downloaded_by: the user, from the official sources below (the user's statement)
    sources: [{ url: <the official URL the user says it came from>, file: <file name> }]
    stated_revision: "<the revision the publisher states> (<where it says so>)"
    revision_note: The manifest records the revision the publisher states; it never says which revision applies.
    notes: [<the open list's notes for this id>]
    files:
      - file: <file name>
        digest: { command: "ow-tools digest research/frameworks/<id>/<date>/<file> --json", sha256: <hex>, form: file-bytes, note: "detects accidental change only; not tamper-evidence" }
    requests: none | [{ url: <an official source URL exactly as the table lists it>, why: stated revision, outcome: opened }]
    possible_embedded_instructions: none found | ["<quote>" (<file>)]

The downloaded files are the user's, never edited, renamed or copied.

## 6. The status line

A plain line in the cache's `STATUS.md`: `<YYYY-MM-DD> | ow-research 2.0.1 | <path> | <what is awaited, by when>` ("ready to run", "your go on the planned queries", "answered", "a check to fix"). It is a note, not how a run resumes. No text from a client file, no keep-out term and no query goes in it.

## 7. Ids

- `RS-nn`: per workstream, the next number after the highest topic folder; the slug is two to four plain words. The workstream name `frameworks` is reserved.
- `R-n`: per run of a topic. `Q-nn`, `P-nn`, `S-nn`: per topic, never reused.
- `F-nn`: per topic, numbered once. On a re-run, an unchanged finding keeps its id (a new source that agrees may be added to it); a finding whose claim or level changes gets the next free id, and the old one moves to *Superseded* as `superseded by F-nn (R-n)`. An id is never given to a different claim.
