DONE: delivered 2027-02-15 -> docs/larkspur-ceramics/delivered.md
Self-checks (same-session self-check, not an independent review): People by role or id OK · No credentials OK · No private names OK
    NEXT: say "use ow-build to invoice the documentation line"   (where slash commands exist: /ow-build-invoice)
          It will read: delivered.md, ledger.md
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: invoice the documentation line once, by hand, from delivered.md.
    THEN: say "use ow-handoff-notes on handoffs/larkspur-ceramics/"   (where slash commands exist: /ow-handoff-notes)
          It will read: runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log
          [no folder attached: attach them when you say it]
    THEN: say "use ow-documentation-rollout on docs/larkspur-ceramics/"   (where slash commands exist: /ow-documentation-rollout)
          It will read: plan.md, docs.yaml, rollout.yaml
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: the runbook and the handover stand; plan the groups by hand.
