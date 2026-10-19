    DONE: signed 2027-01-27 by operations manager on request 2 (recorded 2027-01-29; UAT-11 is after sign-off) -> uat/larkspur-ceramics/signoff.md
    NEXT: first, say "use ow-uat-defect on uat/larkspur-ceramics/"   (where slash commands exist: /ow-uat-defect)
          It will read: punch-list.md, defects/
          [no folder attached: attach them when you say it]
    THEN: say "use ow-build to invoice the acceptance payment from uat/larkspur-ceramics/signoff.md"   (where slash commands exist: /ow-build-invoice)
          It will read: signoff.md, uat.yaml
          [no folder attached: attach them when you say it]
    THEN: say "use ow-handoff-start on uat/larkspur-ceramics/"   (where slash commands exist: /ow-handoff-start)
          It will read: signoff.md, acceptance-record.md, punch-list.md, agreed/
          [no folder attached: attach them when you say it]
    THEN: documentation bought, say "use ow-documentation-start on uat/larkspur-ceramics/"   (where slash commands exist: /ow-documentation-start)
          It will read: signoff.md, uat.yaml, scenarios/, defects/, evidence/index.md
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: the scenarios, training gaps and cleared evidence stay in uat/larkspur-ceramics/ for later.
