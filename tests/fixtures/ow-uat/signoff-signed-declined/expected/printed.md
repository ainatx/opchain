    DONE: signed 2027-01-27 by operations manager on request 2 -> uat/larkspur-ceramics/signoff.md
    NEXT: first, say "use ow-uat-defect on uat/larkspur-ceramics/"   (where slash commands exist: /ow-uat-defect)
          It will read: punch-list.md, defects/
          [no folder attached: attach them when you say it]
    THEN: say "use ow-build to invoice the acceptance payment from uat/larkspur-ceramics/signoff.md"   (where slash commands exist: /ow-build-invoice)
          It will read: signoff.md, uat.yaml
          [no folder attached: attach them when you say it]
    THEN: say "use ow-handoff-start on uat/larkspur-ceramics/"   (where slash commands exist: /ow-handoff-start)
          It will read: signoff.md, acceptance-record.md, punch-list.md, agreed/
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: signoff.md, acceptance-record.md, punch-list.md and agreed/ hold what the handoff needs.
