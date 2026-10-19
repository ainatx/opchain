    DONE: refused: agreed/acceptance.md is not refrozen: its check list in plans/larkspur-ceramics/acceptance.md changed since 4 January 2027 (AC-6.1 added). A new check comes in through a change order, with its scenario, its test and its price -> nothing written
    NEXT: once the change order that adds AC-6.1 is signed, say "use ow-uat-plan to add CO-nn to uat/larkspur-ceramics/"   (where slash commands exist: /ow-uat-plan --add-co)
          It will read: CO-nn.md, uat.yaml
          [no folder attached: attach them when you say it]
    IF IT IS NOT AVAILABLE: price AC-6.1 as a change order with the builder, then add its check and scenario by hand once it is signed.
    OR: meanwhile, say "use ow-uat-plan to keep acceptance.md frozen in uat/larkspur-ceramics/"   (where slash commands exist: /ow-uat-plan --keep-frozen)
          It will read: uat.yaml, agreed/
          [no folder attached: attach them when you say it]
