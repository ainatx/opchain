# Evidence for the 2026-09-11 skill-chain audit

Deterministic reproductions behind the upheld CRITICAL and HIGH findings in
[`../2026-09-11-skillchain-2.0-audit.md`](../2026-09-11-skillchain-2.0-audit.md).
Run each from anywhere; paths resolve from the repo root.

| Script | Reproduces |
|---|---|
| `gate-probe.mjs` | Commit-gate execution oracle: the six bypass forms, the tracked-checkpoint tree deadlock, and the verdict-shape schism. Builds its probe strings at runtime so the file itself never trips a commit gate. |
| `verify-clusters.mjs` | Undeclared handoff verbs, phantom deploy-gate claims, README row coverage, MCP intent-routing coverage, plugin command coverage. |
| `verify-ckpt.mjs` | Skills that never cite their bundled checkpoint protocol, `session-state.cjs` rendering object-form next actions, validator acceptance of contradictory lifecycle states and ISO offsets. |

```bash
node docs/audits/2026-09-11-skillchain-2.0-audit-evidence/gate-probe.mjs
```

v1.9.1 Sprint 1 inverts `gate-probe.mjs`: every BYPASS row must become DENY, and the
tracked and SKILL.md-shaped rows must become ALLOW.
