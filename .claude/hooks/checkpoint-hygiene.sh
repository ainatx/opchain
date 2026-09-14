#!/usr/bin/env bash
# .claude/hooks/checkpoint-hygiene.sh
#
# Stop hook: enforces that any opchain skill invoked this session has a
# matching .checkpoints/<skill>.checkpoint.json file. Read-only sessions
# (no opchain skill activity) pass silently. Built-in / non-opchain skills
# (e.g. update-config, oc-orchestrator, oc-checkpoint-protocol) are not enforced.
#
# Reads stdin JSON: { session_id, transcript_path, cwd, ... }
# Outputs JSON on block: { "decision": "block", "reason": "..." }
# Exits 0 silently when nothing is missing.

set -euo pipefail

# Soft-skip if jq is missing — we'd rather let a session end than wedge
# it on a missing dep. The CI validator (npm run checkpoint:validate)
# is the backstop.
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT="$(cat)"
TRANSCRIPT_PATH="$(jq -r '.transcript_path // empty' <<<"$INPUT")"
PROJECT_DIR="$(jq -r '.cwd // empty' <<<"$INPUT")"
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"

# A blocked Stop hook is invoked again with this guard. Do not create a loop.
if [[ "$(jq -r '.stop_hook_active // false' <<<"$INPUT")" == "true" ]]; then
  exit 0
fi

# Bail silently if no transcript (ephemeral / SDK / CI). Without a transcript
# we can't tell which skills were invoked, so enforcement would be a guess.
if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
  exit 0
fi

CHECKPOINT_DIR="$PROJECT_DIR/.checkpoints"

# Derive the enforced inventory from the shipped skill tree. The two foundation
# protocols are intentionally excluded: oc-orchestrator is read-only and
# oc-checkpoint-protocol owns no project state.
SKILLS_DIR="${OPCHAIN_SKILLS_DIR:-$PROJECT_DIR/skills}"
ENFORCED_SKILLS=()
if [[ -d "$SKILLS_DIR" ]]; then
  for skill_dir in "$SKILLS_DIR"/oc-*; do
    [[ -f "$skill_dir/SKILL.md" ]] || continue
    skill="$(basename "$skill_dir")"
    [[ "$skill" == "oc-orchestrator" || "$skill" == "oc-checkpoint-protocol" ]] && continue
    ENFORCED_SKILLS+=("$skill")
  done
fi
if [[ ${#ENFORCED_SKILLS[@]} -eq 0 ]]; then
  exit 0
fi

# Find skills invoked in this session's transcript. Use jq to parse each
# JSONL line as a structured object. Host/plugin namespaces such as
# `opchain:oc-code-auditor` normalize to their trailing catalog id.
# Substring matching on raw lines was brittle:
# any prose containing both '"name":"Skill"' and '"skill":"<name>"' would
# false-positive.
#
# Empty/unparseable lines are tolerated via `?` in the path expressions.
INVOKED_RAW=$(jq -rs '
  [ .[] as $event
    | $event.message.content[]?
    | select(.type == "tool_use")
    | select((.name // "") | test("(^|[:/.])skill$"; "i"))
    | (.input.skill // "") as $raw
    | ($raw | try capture("(?<skill>oc-[a-z0-9-]+)$").skill catch empty) as $skill
    | { skill: $skill, at: ($event.timestamp // $event.message.timestamp // "") }
  ]
  | sort_by(.skill, .at)
  | group_by(.skill)
  | map(last)
  | .[]
  | [.skill, .at]
  | @tsv
' "$TRANSCRIPT_PATH" 2>/dev/null || true)

INVOKED=() # entries are "skill<TAB>invoked_at"
for skill in "${ENFORCED_SKILLS[@]}"; do
  event="$(awk -F $'\t' -v wanted="$skill" '$1 == wanted { print; exit }' <<<"$INVOKED_RAW")"
  if [[ -n "$event" ]]; then
    INVOKED+=("$event")
  fi
done

if [[ ${#INVOKED[@]} -eq 0 ]]; then
  exit 0  # Read-only / conversational session.
fi

# Each invoked skill must have a checkpoint whose protocol timestamp is at or
# after that invocation event. This is current-run evidence; a stale file from
# an older session cannot satisfy it. This is an accidental-error control, not
# a security boundary against an actor that can edit both files.
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
  if [[ -z "$invoked_at" || -z "$checkpoint_at" ]] || ! node -e '
    const invoked = Date.parse(process.argv[1]);
    const checkpoint = Date.parse(process.argv[2]);
    process.exit(Number.isFinite(invoked) && Number.isFinite(checkpoint) && checkpoint >= invoked ? 0 : 1);
  ' "$invoked_at" "$checkpoint_at"; then
    MISSING+=("$skill")
  fi
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
  exit 0
fi

# Block the stop. Emit JSON on stdout — the harness shows `reason` to the
# assistant as a system-reminder so it can write the missing checkpoints
# and try again.
#
# We point at `node scripts/checkpoint.mjs update` (the canonical writer
# that validates + auto-stamps updated_at) rather than the per-skill
# .sh writers, which do shallow merges with no schema validation and
# can produce checkpoints that CI's validator then rejects.
LIST=$(printf -- "  - %s\n" "${MISSING[@]}")
# Heredoc body intentionally avoids apostrophes — macOS ships bash 3.2,
# which has a parser bug where unbalanced single-quotes inside a `$()`
# command substitution's heredoc body trigger a spurious EOF error
# (e.g. `--progress_summary='<one paragraph>'` would break parsing even
# though the quotes are balanced in the literal body).
REASON=$(cat <<EOF
Checkpoint hygiene: the following opchain skills were invoked this session but did not write a current-run checkpoint at .checkpoints/<skill>.checkpoint.json:

${LIST}
Write each checkpoint with the canonical CLI before ending the session:

  node scripts/checkpoint.mjs update <skill> \\
    --status=complete \\
    --phase=<phase> \\
    --step=<step> \\
    --progress_summary="<one paragraph>"

This validates the schema, stamps updated_at, and is the same tool CI runs in npm run checkpoint:validate. The .checkpoints/ directory is tracked in git so the next session can resume from the prior session next_actions[0].
EOF
)

jq -n --arg reason "$REASON" '{decision:"block", reason:$reason}'
