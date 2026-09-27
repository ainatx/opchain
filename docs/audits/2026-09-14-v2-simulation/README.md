# v2.0 simulation audit — 2026-09-14 (historical record)

A seven-scenario simulation of the v2.0 catalog (S1–S7) that exercised all 36 skills against a candidate build before the 2.0.0 cut. It found one HIGH and three MEDIUM defects; all four were fixed on main in `9176f02` before 2.0.0 shipped. Start with `REPORT.md`, then `COVERAGE.md` for the per-skill verdicts and `REMEDIATION.md` for the fixes.

**What was left out when this record was committed (2026-09-27):**

- **Raw evidence.** The `evidence/` directory (about 400 files and 4 MB of logs, JSON snapshots and helper scripts) and a nested `.checkpoints/` copy were not committed. Reports still cite `evidence/...` paths; those files are not in the repository.
- **Integrity hashes.** `PLAN.sha256` and `EXPANSION-PLAN.sha256` were dropped: local filesystem paths in these documents were redacted to `<repo>`, `<worktree>`, `<codex-worktree>`, `<tmp>` and `~`, so the files no longer match their original hashes byte for byte.

`validate-coverage.py` is kept for reference; its candidate path is a placeholder and it will not run as committed.

The companion work plan for fixing the 1.9.0 audit's findings is in `docs/plans/opchain-audit-remediation/`; its code is on main.
