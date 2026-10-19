    DONE: UAT-01 logged (a report by shop manager, arrived 24 November 2026; not qualifying: no failing check and no steps) -> uat/mossgate-books/defects/UAT-01.md; triage waits for the basis mismatch: agreed/contract-terms.md was frozen on 10 November 2026, and its clause TEST-1 in plans/mossgate-books/contract-inputs.md has changed since (compared as text, not machine-checked)
    NEXT: say "use ow-uat-plan to keep contract-terms.md frozen in uat/mossgate-books/"   (where slash commands exist: /ow-uat-plan --keep-frozen)
          It will read: uat.yaml, agreed/
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: note the decision, dated, beside agreed/.
    OR: say "use ow-uat-plan to refreeze contract-terms.md in uat/mossgate-books/"   (where slash commands exist: /ow-uat-plan --refreeze)
          It will read: uat.yaml, the upstream file
          [no folder attached: attach them when you say it]
