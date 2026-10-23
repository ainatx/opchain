# Independent review of model retries and format corrections

The reviewer read the frozen retries, governing skill text, grader logic and
source changes without editing captures or implementation. Writers did not
read grading keys or receive corrections after freezing their outputs.

- **Build Plan:** the anchored `output` / `raw output` label correction follows
  the published requirement to record command and raw output. Five added tests
  retain rejection of missing command, missing output and expected-output
  prose. The focused file passed 144 tests; after correcting its synthetic
  positive total to the golden's USD 17,450, the three-file boundary run passed
  169 tests. This grader checks presence, not complete payload integrity.
- **Draft:** the former parser both missed column-0 NEXT extraction and skipped
  validation of those blocks. One normalizer handles only documented 0/6 and
  4/10 indentation across extraction, block validation, closed screens, folder
  no-NEXT and delivery checks. The focused run passed 51 tests; canonical and
  rendered goldens each passed 182 cases. Independent mutations for duplicate
  commands, wrong or blank read lists and fake fallback lines failed.
- **UAT:** the failed retry remains 13/15. The clarification now publishes exact
  signing-step mappings, canonical rec keys, interruption resume and the literal
  `UAT-nn` header. A separate fresh writer then passed 15/15. The version bump
  remains required before these unreleased references are published.
- **UAT to handoff:** strict shared date parsing aligns the consumer with the
  producer's documented header and written dates. Eleven focused tests pass,
  including invalid dates, wrong days, duplicate aliases and wrong identifiers.

No remaining actionable finding was identified in these narrow source changes.
The full candidate gate and remote CI are recorded separately when run. This
review does not establish complete model acceptance, actual customer outcomes,
hosted activation, an immutable public installation, real transcription timing,
observation-window verdicts or release/deployment readiness.

The capture report in `sprints/release-2.1/rel-02/` retains all first-pass and
retry failures, procedural limits, frozen archive hashes and remaining work.
