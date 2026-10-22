# OW-06 CI fixture correction

The Worker job on PR #648 failed twice on head `0706fbb0`, both at the recursive copy of a generated `site/.git/objects` directory in `tests/ow-draft-helpers.mjs`. The runs used Linux, Node 22.23.3 and Git 2.55.0. The 205-test draft acceptance suite passed locally; copying every case also passed on macOS with Node 22.23.3 and 22.23.4. These results locate the failure but do not establish a platform-level root cause.

The fixture cache now holds content only, and each destination initializes its own real repository after copying. This avoids copying Git internals while preserving branch checks and a real commit/object database. A regression check creates two copies of one case, validates both with Git, changes the second branch, and verifies that only the second fails the existing branch guard. No golden output or acceptance criterion changes.

## Local spreadsheet verification portability

The clean release candidate also exercised the installed LibreOffice binary.
Its CSV represents the correct total as `6700.5`, while the original test
searched for the text `6700.50`. The test now checks conversion success, the
exact `Costs!D5` total cell and numeric equality with `ow-tools calc`, retaining
the formula and cell-by-cell checks. The two real-binary C8 tests pass locally.
This fixes test representation assumptions; no calculation behavior changed.
