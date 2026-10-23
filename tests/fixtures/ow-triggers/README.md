# ow- trigger queries

Run `node scripts/ow-trigger-queries.mjs --prompts` to emit every built skill's
description and its positive/negative queries without answer labels. In the
host being evaluated, record whether each query activates that skill. Preserve
the actual host/model and a source pointing to the capture. Do not replace a
host observation with a manually inferred answer.

Store a run outside this fixture directory using this shape:

```json
{"model":"actual-model-id","source":"path/to/routing-capture","results":[{"id":"start-fit","trigger":true}]}
```

Then run `node scripts/ow-trigger-queries.mjs --results <run.json>`. Missing,
duplicate and unknown query IDs fail, as do incorrect activation decisions.
Queries activate only when their owning skill is built. The care and vendor
evaluation rows accompany the October 23 scope restoration; controls and
currency remain deferred and have no active queries. New shipped skills require positive and negative
coverage. Unit tests use `source: synthetic` only to validate this checker; they
are not evidence that a model or host selected the right skill.
