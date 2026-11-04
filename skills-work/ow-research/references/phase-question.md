# Phase: question (`/ow-research-question <workstream>`)

Frames one research topic and writes `research/<ws>/RS-nn-<slug>/question.md` in the scratch cache. Sends nothing: no search and no page request happens in this phase.

## 1. Read first, and the workstream

1. Read the latest saved versions from the CRM: the deal or account, the client's `briefs` record and client profile document, for the client's names and domains; any earlier `research_findings` document on it. If the CRM is unreachable, read the cache's client files instead and say so.
2. **No workstream given and none is clear:** ask `Which workstream is this for: a client's slug, or business?`. Write nothing until the user answers.
3. **The workstream `frameworks`:** refuse. Say exactly `"frameworks" is reserved for framework texts; nothing was written.` and then `Name the client's slug or business; for a whole framework text, say "use ow-research-framework <id>".` Write nothing.
4. **A whole framework or regulation text** ("get me NIST 800-53", "the HIPAA rules"): this phase does not take it. Say exactly `Whole framework or regulation texts come through /ow-research-framework; nothing was written.` and then `The open list: <ids>. For this one, say "use ow-research-framework <id>".` (`references/framework-sources.md`). Write nothing. A question *about* a rule (what it requires of a 20-person firm) is a `regulations` topic here.
5. The topic id: `RS-01` when the workstream has no topic folder yet, else the next number after the highest `RS-nn` in `research/<ws>/`. The slug is two to four plain words from the question, never the client's name.

## 2. At most three questions, in one message

Ask only what the request and the CRM leave open: **the question**, **the workstream**, and **any keep-out terms beyond the client's own names** (customers and suppliers its files name and it wants kept out). If no record gives the client's names and domains, ask for them in that same third question. For the business workstream, the keep-out terms are your own business name and domains.

## 3. State the rest as assumptions

Write these yourself and list them when you show the result; the user corrects what is wrong:

1. **The decision it serves**: a Build Plan (`serves: build-plan plans/<client>/`), a draft (`draft`), a vendor evaluation (`vendor-eval`), or the user's own decision (`decision`).
2. **The kind**: `background`, `technical-feasibility`, `market` or `regulations` (`references/confidence-rules.md` §3).
3. **Scope** and **what "answered" means**: the facts that would settle it.
4. **Depth**: quick (5 page requests), standard (15) or deep (40). Assume quick unless the question needs more.
5. **The generic description** used in every query: the kind of business, its size band, the tools it uses by product name, its region. Never the client's name, a person, a domain or a quote from the client's files. A size is a band, never an exact count ("10–25 staff"); a region is a state or a country, never a town; and a query carries at most one distinctive detail besides the product names, since a combination can point to one small business. Example: "a ceramics studio with 10–25 staff and a retail shop, using a cloud point-of-sale system and a shared order spreadsheet".
6. **Owners of the facts** (`owners`): the hosts of the vendor and the official publishers whose own pages count as primary sources for this question. Use the narrowest that holds the facts: the exact documentation host (`developer.<vendor>`, `help.<vendor>`), or a host with a path where the owner's pages share a host with others (`github.com/<vendor>/`). Write `*.<host>` only when the user wants every subdomain counted. Never a shared platform's root (`github.com`, or a service host that serves every tenant, such as `raw.githubusercontent.com`; a tenant's own subdomain, such as `<vendor>.readthedocs.io`, is that tenant's and may be used), a support site without the path of its reference pages, or a host where users write (`community.`, `forum.`, `partners.`, `discuss.`). A host not on this list is never primary, whatever its page claims.

People are never listed in `keep_out`: they are kept out by kind (`references/self-checks.md` §2).

**By name** (only if the user asks to search for the client itself, for example its own public website): write each exact query or URL the user approves into `by_name` with its date. A general approval ("search for them as needed") is not an approval: ask for the exact words.

## 4. Write `question.md`

As `references/research-files-schema.md` §1 says. Check the generic description for Query privacy first, and fix what fails. A question may be changed at any time; the next `-run` plans from the changed question as a new run.

Add a plain status line to the cache (`references/research-files-schema.md` §6), then say what you assumed and that `/ow-research-run` is next. Go straight on to it if the user asked for the answer rather than the framing.
