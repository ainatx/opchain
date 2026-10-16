#!/usr/bin/env bash
# .claude/hooks/checkpoint-hygiene.sh
#
# Stop hook: every opchain skill that was invoked this session AND then did work in
# THIS repo must have a current-run .checkpoints/<skill>.checkpoint.json. Read-only
# sessions pass silently, as do sessions whose oc-* skill wrote somewhere else (a
# Deftwright worktree, a design doc in another repo). Built-in / non-opchain skills
# are not enforced, and neither are the oc-* skills that owe no tracked current-run
# checkpoint (oc-orchestrator, oc-checkpoint-protocol, oc-update, oc-telemetry-ops;
# see the exemption list below for why).
#
# Reads stdin JSON: { session_id, transcript_path, cwd, stop_hook_active, ... }
# Outputs JSON on block: { "decision": "block", "reason": "..." }
# Exits 0 silently when nothing is missing.
#
# Behaviour, per the 2026-10-08 effectiveness audit (I-06, Q5-F5, H4-7):
#   - PROJECT_DIR comes from $CLAUDE_PROJECT_DIR (the harness sets it to the checkout
#     whose settings.json registered this hook). Without it we fall back to the git
#     toplevel of the Stop event's cwd and enforce only when that is the checkout this
#     script ships in — a drifted shell cwd must never pull in another checkout
#     (07d5d505 was blocked twice on the main checkout while its checkpoints sat
#     committed in the PR worktree).
#   - Scope: a skill is enforced only when the transcript shows work in this repo
#     AFTER its invocation — a Write/Edit/MultiEdit/NotebookEdit file_path, or a Bash
#     `git -C <dir>` / `cd <dir>` target, resolving under PROJECT_DIR. 36 of 62
#     blocks were Deftwright work done from an opchain worktree.
#   - One-shot decline: the same missing skill set is blocked at most twice per
#     session; the third Stop logs one stderr note and exits 0 (one session was
#     blocked 30 times).
#   - Gate skills (oc-bug-check, oc-docs-forge, oc-repo-ops) are also satisfied by a
#     handoffs[] verification.verdict PASS bound to the current git_tree_projection
#     candidate — what `node scripts/lib/release-evidence.mjs --print-candidate --json`
#     prints and what `node scripts/checkpoint.mjs handoff` writes. If the candidate
#     cannot be computed, a checkpoint file mtime newer than the invocation counts.
#   - Incremental: the transcript is read from the byte offset cached in the
#     per-session marker ($TMPDIR/opchain-hygiene-<session_id>.json) — never re-parsed
#     whole (jq -rs over a 12MB transcript hit the 10s timeout 30 times).
#
# bash 3.2 compatible (macOS). Needs jq + node; a missing jq soft-skips.

set -euo pipefail

# Soft-skip if jq is missing — we'd rather let a session end than wedge
# it on a missing dep. The CI validator (npm run checkpoint:validate)
# is the backstop.
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT="$(cat)"

# A blocked Stop hook is invoked again with this guard. Do not create a loop.
if [[ "$(jq -r '.stop_hook_active // false' <<<"$INPUT")" == "true" ]]; then
  exit 0
fi

TRANSCRIPT_PATH="$(jq -r '.transcript_path // empty' <<<"$INPUT")"
SESSION_ID="$(jq -r '.session_id // empty' <<<"$INPUT")"
EVENT_CWD="$(jq -r '.cwd // empty' <<<"$INPUT")"

# Bail silently if no transcript (ephemeral / SDK / CI). Without a transcript
# we can't tell which skills were invoked, so enforcement would be a guess.
if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
  exit 0
fi

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
HOOK_REPO="$(cd "$HOOK_DIR/../.." && pwd -P)"

real_dir() { (cd "$1" 2>/dev/null && pwd -P) || true; }

# ── Which checkout is "this repo"? ───────────────────────────────────────────
if [[ -n "${CLAUDE_PROJECT_DIR:-}" && -d "$CLAUDE_PROJECT_DIR" ]]; then
  PROJECT_DIR="$CLAUDE_PROJECT_DIR"
else
  base="${EVENT_CWD:-$(pwd)}"
  [[ -d "$base" ]] || exit 0
  PROJECT_DIR="$(git -C "$base" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$PROJECT_DIR" ]] || exit 0
  # The cwd belongs to some other checkout (another repo, or the main checkout while
  # this hook lives in a worktree). Not ours to police.
  [[ "$(real_dir "$PROJECT_DIR")" == "$HOOK_REPO" ]] || exit 0
fi
PROJECT_REAL="$(real_dir "$PROJECT_DIR")"
[[ -n "$PROJECT_REAL" ]] || exit 0
CHECKPOINT_DIR="$PROJECT_DIR/.checkpoints"

# ── Enforced inventory ───────────────────────────────────────────────────────
# Derive the enforced inventory from the shipped skill tree. Skills that owe no
# tracked current-run checkpoint are excluded, because demanding one would contradict
# their contract:
#   - oc-orchestrator is read-only.
#   - oc-checkpoint-protocol owns no project state.
#   - oc-update must not write or reconcile any .checkpoints/ file, its own
#     included (skills/oc-update/SKILL.md). Its install state is the root
#     .opchain-install.json receipt, and source mode never writes checkpoints.
#   - oc-telemetry-ops keeps consent in local SQLite and aggregate metadata in
#     .checkpoints/.local/telemetry/.checkpoints/ (skills/oc-telemetry-ops/SKILL.md).
#     Status and opted-out commands can write nothing, so requiring even a
#     private checkpoint on every invocation would still reject valid sessions.
SKILLS_DIR="${OPCHAIN_SKILLS_DIR:-$PROJECT_DIR/skills}"
ENFORCED_SKILLS=()
if [[ -d "$SKILLS_DIR" ]]; then
  for skill_dir in "$SKILLS_DIR"/oc-*; do
    [[ -f "$skill_dir/SKILL.md" ]] || continue
    skill="$(basename "$skill_dir")"
    [[ "$skill" == "oc-orchestrator" || "$skill" == "oc-checkpoint-protocol" || "$skill" == "oc-update" || "$skill" == "oc-telemetry-ops" ]] && continue
    ENFORCED_SKILLS+=("$skill")
  done
fi
if [[ ${#ENFORCED_SKILLS[@]} -eq 0 ]]; then
  exit 0
fi

# Gate skills: a candidate-bound PASS handoff is the evidence the PR/deploy gates
# actually read, so it satisfies this hook too (audit Q5-F5).
GATE_SKILLS=" oc-bug-check oc-docs-forge oc-repo-ops "

# ── Per-session marker: byte offset + invocation state + block counts ─────────
TMP_ROOT="${TMPDIR:-/tmp}"
TMP_ROOT="${TMP_ROOT%/}"
MARKER="$TMP_ROOT/opchain-hygiene-${SESSION_ID:-$(basename "$TRANSCRIPT_PATH" .jsonl)}.json"
STATE='{}'
if [[ -f "$MARKER" ]]; then
  STATE="$(jq -c '.' "$MARKER" 2>/dev/null || echo '{}')"
fi
OFFSET="$(jq -r '.offset // 0' <<<"$STATE")"
case "$OFFSET" in ''|*[!0-9]*) OFFSET=0 ;; esac
SIZE="$(wc -c <"$TRANSCRIPT_PATH" | tr -d '[:space:]')"
if (( OFFSET > SIZE )); then
  # Transcript was truncated or rotated — start over, forgetting stale invocations.
  OFFSET=0
  STATE="$(jq -c '.skills = {}' <<<"$STATE")"
fi

CHUNK="$(mktemp "$TMP_ROOT/opchain-hygiene-chunk.XXXXXX")"
trap 'rm -f "$CHUNK"' EXIT
tail -c "+$((OFFSET + 1))" "$TRANSCRIPT_PATH" >"$CHUNK"
CHUNK_SIZE="$(wc -c <"$CHUNK" | tr -d '[:space:]')"
# Only complete lines advance the offset; a half-written trailing record is re-read
# next time rather than lost.
PARTIAL=0
if (( CHUNK_SIZE > 0 )) && [[ "$(tail -c 1 "$CHUNK" | LC_ALL=C od -An -c | tr -d ' ')" != '\n' ]]; then
  PARTIAL="$(tail -n 1 "$CHUNK" | wc -c | tr -d '[:space:]')"
fi
NEW_OFFSET=$((OFFSET + CHUNK_SIZE - PARTIAL))

# Pre-filter to lines that can carry a tool_use, then parse each as JSON (a partial
# or non-JSON line is dropped by fromjson?).
EVENTS="$( { grep -F '"tool_use"' "$CHUNK" || true; } | jq -c -R 'fromjson? // empty' | jq -s -c '.')"

# Fold the new events into the session state. Host/plugin namespaces such as
# `opchain:oc-code-auditor` normalize to their trailing catalog id. A skill's
# `touched` flag flips when any later tool call resolves a path under PROJECT_DIR;
# re-invoking the skill resets it, so the LAST invocation governs.
read -r -d '' JQ_FOLD <<'EOF' || true
def under:
  . as $p
  | ($p == $root) or ($p == $real)
    or ($p | startswith($root + "/")) or ($p | startswith($real + "/"));
def absolutize($cwd): if startswith("/") then . else ($cwd + "/" + .) end;
def unquote: sub("^[\"']"; "") | sub("[\"']$"; "");
def paths_of($tu):
  [ (if (($tu.name // "") | test("^(Write|Edit|MultiEdit|NotebookEdit)$"))
       then ($tu.input.file_path // $tu.input.notebook_path // empty) else empty end),
    (if ($tu.name // "") == "Bash" then
       (($tu.input.command // "") as $c
        | ( [$c | scan("git\\s+-C\\s+(\"[^\"]+\"|'[^']+'|[^\\s;&|]+)")] | map(.[0]) ),
          ( [$c | scan("(?:^|&&|\\|\\||;|\\n)\\s*cd\\s+(\"[^\"]+\"|'[^']+'|[^\\s;&|]+)")] | map(.[0]) )
        | .[] | unquote)
     else empty end)
  ] | map(select(type == "string" and length > 0));
reduce (
  .[] | select((.type // "assistant") != "user")
  | {ts: (.timestamp // ""), cwd: (.cwd // ""), tu: (.message.content[]? | select(.type == "tool_use"))}
) as $e (
  ($state | .skills //= {} | .blocks //= {});
  ($e.tu.name // "") as $name
  | if ($name | test("(^|[:/.])skill$"; "i")) then
      ((($e.tu.input.skill // "") | try (capture("(?<s>oc-[a-z0-9-]+)$").s) catch null) // null) as $s
      | if $s then .skills[$s] = {at: $e.ts, touched: false} else . end
    elif ([paths_of($e.tu)[] | absolutize($e.cwd) | under] | any) then
      .skills |= with_entries(.value.touched = true)
    else . end
)
| .offset = $offset
EOF

NEW_STATE="$(jq -c --argjson state "$STATE" --arg root "$PROJECT_DIR" --arg real "$PROJECT_REAL" --argjson offset "$NEW_OFFSET" "$JQ_FOLD" <<<"$EVENTS" 2>/dev/null)" || exit 0

write_marker() {
  local tmp="$MARKER.$$"
  printf '%s\n' "$NEW_STATE" >"$tmp" && mv -f "$tmp" "$MARKER"
}

# Skills invoked this session that then worked in this repo.
TOUCHED_RAW="$(jq -r '.skills | to_entries[] | select(.value.touched == true) | [.key, (.value.at // "")] | @tsv' <<<"$NEW_STATE")"

INVOKED=() # entries are "skill<TAB>invoked_at"
for skill in "${ENFORCED_SKILLS[@]}"; do
  event="$(awk -F $'\t' -v wanted="$skill" '$1 == wanted { print; exit }' <<<"$TOUCHED_RAW")"
  if [[ -n "$event" ]]; then
    INVOKED+=("$event")
  fi
done

if [[ ${#INVOKED[@]} -eq 0 ]]; then
  write_marker
  exit 0  # Read-only / conversational session, or the work went to another repo.
fi

# ── Evidence checks ──────────────────────────────────────────────────────────
CANDIDATE_RESOLVED=0
CANDIDATE_ID=""
candidate_id() {
  if (( CANDIDATE_RESOLVED == 0 )); then
    CANDIDATE_RESOLVED=1
    local script="$PROJECT_DIR/scripts/lib/release-evidence.mjs"
    [[ -f "$script" ]] || script="$HOOK_REPO/scripts/lib/release-evidence.mjs"
    if [[ -f "$script" ]] && command -v node >/dev/null 2>&1; then
      CANDIDATE_ID="$(node "$script" --repo "$PROJECT_DIR" --print-candidate --json 2>/dev/null | jq -r '.candidate_identity.id // empty' 2>/dev/null || true)"
    fi
  fi
  printf '%s' "$CANDIDATE_ID"
}

# checkpoint_at >= invoked_at ?
at_or_after() {
  node -e '
    const invoked = Date.parse(process.argv[1]);
    const checkpoint = Date.parse(process.argv[2]);
    process.exit(Number.isFinite(invoked) && Number.isFinite(checkpoint) && checkpoint >= invoked ? 0 : 1);
  ' "$1" "$2"
}

# file mtime >= invoked_at ?
mtime_at_or_after() {
  node -e '
    const fs = require("fs");
    const [file, at] = process.argv.slice(1);
    const t = Date.parse(at);
    let ok = false;
    try { ok = Number.isFinite(t) && fs.statSync(file).mtimeMs >= t; } catch {}
    process.exit(ok ? 0 : 1);
  ' "$1" "$2"
}

# Each enforced skill must have a checkpoint whose protocol timestamp is at or
# after its invocation. This is current-run evidence; a stale file from an older
# session cannot satisfy it. Gate skills may instead carry a PASS handoff bound to
# the current candidate. This is an accidental-error control, not a security
# boundary against an actor that can edit both files.
MISSING=()
for event in "${INVOKED[@]}"; do
  skill="${event%%$'\t'*}"
  invoked_at="${event#*$'\t'}"
  checkpoint="$CHECKPOINT_DIR/${skill}.checkpoint.json"
  if [[ ! -f "$checkpoint" ]]; then
    MISSING+=("$skill")
    continue
  fi
  checkpoint_at="$(jq -r '.record_updated_at // .updated_at // empty' "$checkpoint" 2>/dev/null || true)"
  if [[ -n "$invoked_at" && -n "$checkpoint_at" ]] && at_or_after "$invoked_at" "$checkpoint_at"; then
    continue
  fi
  if [[ "$GATE_SKILLS" == *" $skill "* ]]; then
    cand="$(candidate_id)"
    if [[ -n "$cand" ]]; then
      if jq -e --arg c "$cand" '[.handoffs[]? | select(.type == "verification.verdict" and .candidate.id == $c and .payload.verdict == "PASS")] | length > 0' "$checkpoint" >/dev/null 2>&1; then
        continue
      fi
    elif [[ -n "$invoked_at" ]] && mtime_at_or_after "$checkpoint" "$invoked_at"; then
      continue
    fi
  fi
  MISSING+=("$skill")
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
  write_marker
  exit 0
fi

# ── One-shot decline ─────────────────────────────────────────────────────────
KEY="$(printf '%s,' "${MISSING[@]}")"
KEY="${KEY%,}"
COUNT="$(jq -r --arg k "$KEY" '.blocks[$k] // 0' <<<"$NEW_STATE")"
case "$COUNT" in ''|*[!0-9]*) COUNT=0 ;; esac
if (( COUNT >= 2 )); then
  write_marker
  printf 'checkpoint-hygiene: already blocked twice this session for %s; not blocking again. Write the checkpoint when convenient: node scripts/checkpoint.mjs update <skill> ... --next_actions:json=%s\n' "$KEY" "'[\"...\"]'" >&2
  exit 0
fi
NEW_STATE="$(jq -c --arg k "$KEY" '.blocks[$k] = ((.blocks[$k] // 0) + 1)' <<<"$NEW_STATE")"
write_marker

# ── Block ────────────────────────────────────────────────────────────────────
# Emit JSON on stdout — the harness shows `reason` to the assistant as a
# system-reminder so it can write the missing checkpoints and try again.
#
# We point at `node scripts/checkpoint.mjs update` (the canonical writer that
# validates + auto-stamps updated_at) and `handoff` (the one evidence binder)
# rather than hand-written JSON.
LIST="$(printf -- '  - %s\n' "${MISSING[@]}")"
GATE_HINT=""
for skill in "${MISSING[@]}"; do
  case "$skill" in
    oc-docs-forge)
      GATE_HINT="$GATE_HINT
  node scripts/checkpoint.mjs handoff oc-docs-forge --policy pr-docs-v1 --verdict PASS --scope \"<what the docs packet covered>\" --evidence <path>" ;;
    oc-repo-ops)
      GATE_HINT="$GATE_HINT
  node scripts/checkpoint.mjs handoff oc-repo-ops --policy pr-readiness-v1 --verdict PASS --scope \"<what was checked>\" --evidence <path>" ;;
    oc-bug-check)
      GATE_HINT="$GATE_HINT
  /oc-bugcheck run   (the verifier writes its own, gitignored checkpoint)" ;;
  esac
done
GATE_SECTION=""
if [[ -n "$GATE_HINT" ]]; then
  GATE_SECTION="

Gate skills are also satisfied by a verification.verdict handoff bound to the current candidate (the same evidence the PR/deploy gates read):${GATE_HINT}"
fi

# Built with `read -d ''` on a plain heredoc, not `$(cat <<EOF)`: macOS bash 3.2
# mis-parses single quotes inside a command substitution's heredoc body, and the
# --next_actions:json line below needs them.
read -r -d '' REASON <<EOF || true
Checkpoint hygiene: these opchain skills were invoked this session and then worked in $PROJECT_DIR, but have no current-run checkpoint at .checkpoints/<skill>.checkpoint.json:

$LIST
Write each one with the canonical CLI (from the repo root; it validates the schema and stamps updated_at):

  node scripts/checkpoint.mjs update <skill> \\
    --status=complete \\
    --phase=<phase> \\
    --step=<step> \\
    --progress_summary="<one paragraph: what this run did and decided>" \\
    --next_actions:json='["<the next concrete action>"]'

--next_actions:json is required when the file does not exist yet, and the scaffold placeholder "Define the first real next action for this skill." is rejected by the validator. The .checkpoints/ directory is tracked in git so the next session resumes from next_actions[0].${GATE_SECTION}

This hook blocks at most twice per session for the same skill set, then logs a note and lets the session end.
EOF

jq -n --arg reason "$REASON" '{decision:"block", reason:$reason}'
