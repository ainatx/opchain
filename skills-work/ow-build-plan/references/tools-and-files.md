# The ow-tools add-on, and the scratch cache

Open this file with each phase file.

## The ow-tools add-on

Run the call. If `ow-tools` is not installed, say so once and do the step by hand.

| Need | Call | By hand |
|---|---|---|
| Write to the CRM | `ow-tools dw`, or the `/api/admin/ingest/*` routes with the planning service token; each write carries an `external_ref`, so a re-run adds a version | Keep it in the cache and say it is not published |
| PDF and Word files (`-offer`, `-export`) | `ow-tools export <file.md> --out plans/<client>/export/` | Print the Markdown without its header or anything between the `ow:internal` markers |
| A workshop recording (`-collect`) | `ow-tools transcribe plans/<client>/audio/<file> --out plans/<client>/workshops/W<n>/` | Ask for a transcript or notes (MEDIUM cap) |
| Dates and totals (`-offer`, `-start`, `-quote`) | `ow-tools calc date …`, `calc total --items <file.json>`, `calc split …` | Count by hand and mark it `not machine-checked` |

Record each call's command and raw output where its phase file says; nothing is machine-checked without them. Say a write was published only when the call returned success; a route that does not exist yet means the work stays in the cache, and the output says so.

## The scratch cache

`opchain-work/` is a scratch cache, never the record. Steps work here when the CRM is unreachable, and the goldens grade these files:

    opchain-work/
      price-book.yaml  brand.yaml        fallback prices and branding (copy them from examples/)
      offers.md  handoffs.yaml  profile.md  STATUS.md
      plans/<client>/
        build-plan-offer.md  plan.yaml  collection.md  evidence.md  systems/  map/
        scope.md  acceptance.md  risks.md  quick-scope.md  quote.md  quote-v2.md
        contract-inputs.md  build-request.md  build-plan.md  export/
        inbox/  audio/  workshops/        client material; never committed

In a git repository, `-start` offers to add the client material folders to `.gitignore` (`references/phase-start.md`). A follow-on Build Plan goes in `plans/<client>-<n>/`. This skill never writes your files: copy `examples/price-book.yaml` and `examples/brand.yaml` and fill them in; `offers.md` and `handoffs.yaml` come from ow-start's `/ow-setup`, as `examples/offers.md` and `examples/handoffs.yaml`.
