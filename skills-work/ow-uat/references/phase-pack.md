# `/ow-uat-pack`: the tester packs and the results template

Read first, from the CRM: `acceptance_criteria` and the test's documents; cache: `uat.yaml`, `scenarios/`. A basis mismatch is reported (`references/routing-and-resume.md` §1) and the user decides. Formats: `references/scenario-format.md` §2 to §4. Re-pack whenever scenarios or dates change. Before you hand over: `references/self-checks.md`.

1. **Stop** while a production test (`uat.yaml` `environment.production` set) has a scenario with a `side_effect` and neither a test-mode, internal-recipient or test-account line nor the client's dated approval in `uat.yaml` `side_effects`. Name each scenario. Real messages and payments are not sent by a test by accident.
2. **Stop** while a scenario holds pasted record values instead of a pointer: name it and fix it through `-plan`. No client data goes in a pack beyond what the test needs.
3. **Write one pack per tester role**, `uat-pack-<role>.md` (`<role>` in lower case with hyphens): the six sections, the role's scenarios, its sessions, and "your login comes from <client contact role>". Read `brand.yaml` for the HTML styling; absent, neutral styling, and say so.
4. **Exports.** Run `ow-tools export uat/<client>/uat-pack-<role>.md` for each role and keep the command and its output in `pack.yaml`; a preflight refusal naming a line is fixed in the Markdown and run again. If it is not installed, say so once and write `export/uat-pack-<role>.html` yourself.
5. **The results template**, `export/results-template.csv`: the six columns exactly (`tester id,scenario,result,cases passed,note,records created`), one row per scenario with only the scenario filled.
6. **Write `pack.yaml`** and publish.

What comes next: say where the packs are and that they go to the client contact, who hands each tester theirs and their login; the user sends them. After each session, `/ow-uat-run`.
