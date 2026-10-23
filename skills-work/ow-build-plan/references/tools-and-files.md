# Tools and file locations

## The ow-tools add-on

**If you can run code here and `ow-tools version` answers, run the call; otherwise take the absent-case.** Never imitate the add-on.

| Need | Call | Without the add-on |
|---|---|---|
| PDF and Word files (`-offer`, `-export`) | `ow-tools export <file.md> --out plans/<client>/export/` | Say the PDF and Word files need the ow-tools add-on, which is not installed here; print the Markdown without its header or anything between the `ow:internal` markers |
| A workshop recording (`-collect`) | `ow-tools transcribe plans/<client>/audio/<file> --out plans/<client>/workshops/W<n>/` | Ask for a transcript or notes (MEDIUM cap) |
| Dates and totals (`-offer`, `-start`, `-quote`) | `ow-tools calc date …`, `calc total --items <file.json>`, `calc split …` | Count by hand and mark it: `not machine-checked`, for the user to verify |


## Where files live

Under `opchain-work/plans/<client>/`: the files the Verbs table names, and `inbox/`, `audio/` and `workshops/` (client material; never committed). The layout: `references/phase-start.md` §0. This skill never writes your files: copy `examples/price-book.yaml` and `examples/brand.yaml` and fill them in; `offers.md` and `handoffs.yaml` come from ow-start's `/ow-setup`, as `examples/offers.md` and `examples/handoffs.yaml`.
