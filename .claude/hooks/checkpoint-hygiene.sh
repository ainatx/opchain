#!/usr/bin/env bash
# .claude/hooks/checkpoint-hygiene.sh
#
# Stop hook: every opchain skill that was invoked this session AND then did work in
# THIS repo must leave current-run evidence: a fresh .checkpoints/<skill>.checkpoint.json
# here or in any other repository it worked in. Read-only sessions pass silently, as
# do sessions whose oc-* skill worked only somewhere else (a Deftwright worktree, a
# design doc in another repo). Built-in / non-opchain skills
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
#   - Scope: each tool call AFTER a skill's invocation is attributed to the git
#     repositories it touched — a Write/Edit/MultiEdit/NotebookEdit file_path, or a
#     Bash `cd`/`pushd <dir>`, `git -C <dir>` or `OPCHAIN_ROOT=<dir>` target (~,
#     $HOME and $PWD expanded; anything else unresolvable is dropped, never pinned
#     on the session cwd). A skill is enforced only when one of those repositories
#     is this checkout. 36 of 62 blocks were Deftwright work done from an opchain
#     worktree; on 2026-10-22 `cd ~/deftwright-site-worktrees/…` still blocked twice
#     because `~` resolved against the session cwd.
#   - Cross-repo evidence: current-run evidence (below) in ANY repository the skill
#     worked in satisfies it, and the hook never asks for a checkpoint in a
#     repository the skill did not touch — following a block must never mean
#     writing another project's state into this one.
#   - Nested checkouts: a path under PROJECT_DIR whose git toplevel is a checkout
#     nested inside it belongs to that checkout, as does anything under
#     PROJECT_DIR/.claude/worktrees/ (the desktop app's worktrees), even once
#     removed. A session whose cwd is a worktree of this repo nested inside
#     PROJECT_DIR is policed against that worktree instead ($CLAUDE_PROJECT_DIR
#     names the outer checkout there; 2026-10-19 a worktree session was blocked
#     twice on the main checkout with its checkpoint current).
#   - One-shot decline: the same missing skill set is blocked at most twice per
#     session; the third Stop logs one stderr note and exits 0 (one session was
#     blocked 30 times).
#   - Gate skills (oc-bug-check, oc-docs-forge, oc-repo-ops) are also satisfied by a
#     handoffs[] verification.verdict PASS bound to that repository's current
#     git_tree_projection candidate — what `node scripts/lib/release-evidence.mjs
#     --repo <dir> --print-candidate --json` prints and what `node
#     scripts/checkpoint.mjs handoff` writes. If the candidate
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

real_dir() { [[ -n "$1" ]] || return 0; (cd "$1" 2>/dev/null && pwd -P) || true; }
git_common_dir() { [[ -n "$1" ]] || return 0; (cd "$1" 2>/dev/null && real_dir "$(git rev-parse --git-common-dir 2>/dev/null)") || true; }

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

# A session in a worktree of this repo nested inside PROJECT_DIR (the desktop app's
# <checkout>/.claude/worktrees/<name>) still gets $CLAUDE_PROJECT_DIR = the outer
# checkout. The worktree is the session's own checkout, so it is "this repo": its
# .checkpoints/ satisfies the hook and the outer checkout is another checkout. The
# worktree keeps PROJECT_DIR's spelling so unresolved transcript paths still match.
if [[ -n "$EVENT_CWD" && -d "$EVENT_CWD" ]]; then
  CWD_TOP="$(real_dir "$(git -C "$EVENT_CWD" rev-parse --show-toplevel 2>/dev/null || true)")"
  if [[ -n "$CWD_TOP" && "$CWD_TOP" == "$PROJECT_REAL"/* ]]; then
    CWD_COMMON="$(git_common_dir "$CWD_TOP")"
    if [[ -n "$CWD_COMMON" && "$CWD_COMMON" == "$(git_common_dir "$PROJECT_REAL")" ]]; then
      PROJECT_DIR="$PROJECT_DIR${CWD_TOP#"$PROJECT_REAL"}"
      PROJECT_REAL="$CWD_TOP"
    fi
  fi
fi

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
# STATE_VERSION 2: .skills[<id>] = {at, repos: [<git toplevel>...]} (v1 kept a single
# `touched` flag for this checkout). A marker from another version is re-read from 0.
STATE_VERSION=2
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
if (( OFFSET > SIZE )) || [[ "$(jq -r '.root // empty' <<<"$STATE")" != "$PROJECT_REAL" ]] \
  || [[ "$(jq -r '.v // 1' <<<"$STATE")" != "$STATE_VERSION" ]]; then
  # Transcript was truncated or rotated, the session's cwd moved to another checkout
  # (the cached repo sets were judged against a different root), or the marker
  # predates this state shape — start over, forgetting stale invocations.
  OFFSET=0
  STATE="$(jq -c '.skills = {}' <<<"$STATE")"
fi

CHUNK="$(mktemp "$TMP_ROOT/opchain-hygiene-chunk.XXXXXX")"
trap 'rm -f "$CHUNK"' EXIT
# BSD tail copies byte by byte (2.7s for an 87MB transcript); a full read needs no tail.
if (( OFFSET == 0 )); then
  cat "$TRANSCRIPT_PATH" >"$CHUNK"
else
  tail -c "+$((OFFSET + 1))" "$TRANSCRIPT_PATH" >"$CHUNK"
fi
CHUNK_SIZE="$(wc -c <"$CHUNK" | tr -d '[:space:]')"
# Only complete lines advance the offset; a half-written trailing record is re-read
# next time rather than lost.
PARTIAL=0
if (( CHUNK_SIZE > 0 )) && [[ "$(tail -c 1 "$CHUNK" | LC_ALL=C od -An -c | tr -d ' ')" != '\n' ]]; then
  PARTIAL="$(tail -n 1 "$CHUNK" | wc -c | tr -d '[:space:]')"
fi
NEW_OFFSET=$((OFFSET + CHUNK_SIZE - PARTIAL))

# Shared jq: the paths each tool call targets, absolutized with . and .. folded.
# `under` = inside PROJECT_DIR by prefix but not in PROJECT_DIR/.claude/worktrees/
# (matched by name so a removed worktree stays out).
#
# A Bash command is walked segment by segment (split on && || ; | and newlines) with
# a running cwd, so `cd ~/other && git -C . status` targets ~/other, not the session
# cwd. Its targets are `cd`/`pushd <dir>`, `git -C <dir>` and `OPCHAIN_ROOT=<dir>`
# (the checkpoint CLI writes <dir>/.checkpoints/). A shell word expands ~, $HOME and
# $PWD/$(pwd); any other variable or substitution, a flag, or a relative word after
# an unresolvable `cd` resolves to nothing. Write/Edit paths are literal (a Remix
# `routes/$slug.tsx` is a file name, not a variable). Before 2026-10-22 `cd ~/deftwright-…`
# was absolutized against the session cwd as `<cwd>/~/deftwright-…`, i.e. "inside
# this repo", and an opchain session blocked twice on Deftwright work.
read -r -d '' JQ_DEFS <<'EOF' || true
def inside($base): . == $base or startswith($base + "/");
def in_worktrees: inside($root + "/.claude/worktrees") or inside($real + "/.claude/worktrees");
def under: (inside($root) or inside($real)) and (in_worktrees | not);
def normpath:
  split("/")
  | reduce .[] as $s ([]; if $s == "" or $s == "." then . elif $s == ".." then .[:-1] else . + [$s] end)
  | "/" + join("/");
def unquote: sub("^[\"']"; "") | sub("[\"']$"; "");
def word: "(\"[^\"]+\"|'[^']+'|[^\\s;&|()]+)";
def resolve_path($cwd):
  if . == "" then null
  elif startswith("/") then normpath
  elif $cwd == null then null
  else ($cwd + "/" + .) | normpath end;
def resolve_word($cwd):
  unquote
  | sub("^~(?=/|$)"; $home)
  | gsub("\\$\\{HOME\\}|\\$HOME(?![A-Za-z0-9_])"; $home)
  | (if $cwd == null then . else gsub("\\$\\{PWD\\}|\\$PWD(?![A-Za-z0-9_])|\\$\\(pwd\\)|`pwd`"; $cwd) end)
  | if startswith("-") or startswith("~") or test("[$`*?]") then null else resolve_path($cwd) end;
def bash_paths($cmd; $cwd0):
  reduce ($cmd | [splits("&&|\\|\\||;|\\n|\\|")] | .[]) as $seg ({cwd: $cwd0, out: []};
    ([$seg | capture("^\\s*(?:(?:then|do|else)\\s+|[({]\\s*)?(?:cd|pushd)\\s+(?<t>" + word + ")") | .t] | first) as $cd
    | (if $cd == null then . else (.cwd as $c | ($cd | resolve_word($c)) as $n | .cwd = $n | .out += [$n]) end)
    | .cwd as $c
    | .out += [$seg | scan("git\\s+-C\\s+" + word) | .[0] | resolve_word($c)]
    | .out += [$seg | scan("(?:^|[\\s(])(?:export\\s+)?OPCHAIN_ROOT=" + word) | .[0] | resolve_word($c)]
  )
  | .out[] | select(. != null);
def tool_events:
  .[] | select((.type // "assistant") != "user")
  | {ts: (.timestamp // ""), cwd: (.cwd // "" | if . == "" then null else . end),
     tu: (.message.content[]? | select(.type == "tool_use"))};
def event_paths($e):
  ($e.tu.name // "") as $name
  | if ($name | test("^(Write|Edit|MultiEdit|NotebookEdit)$")) then
      ($e.tu.input.file_path // $e.tu.input.notebook_path // empty)
      | select(type == "string") | resolve_path($e.cwd) | select(. != null)
    elif $name == "Bash" then bash_paths(($e.tu.input.command // "") | tostring; $e.cwd)
    else empty end;
def compact:
  [tool_events as $e
   | ($e.tu.name // "") as $name
   | if ($name | test("(^|[:/.])skill$"; "i")) then
       ((($e.tu.input.skill // "") | try (capture("(?<s>oc-[a-z0-9-]+)$").s) catch null) // null) as $s
       | if $s then {skill: $s, at: $e.ts} else empty end
     else [event_paths($e)] as $p | if ($p | length) > 0 then {paths: $p} else empty end end];
EOF
JQ_ARGS=(--arg root "$PROJECT_DIR" --arg real "$PROJECT_REAL" --arg home "${HOME:-/nonexistent-home}")

# Pre-filter to lines that can carry a tool_use, parse each as JSON (a partial or
# non-JSON line is dropped by fromjson?) and reduce the chunk, in one pass, to its
# ordered skill invocations ({skill, at}; host/plugin namespaces such as
# `opchain:oc-code-auditor` normalize to their trailing catalog id) and tool-call
# targets ({paths}).
EVENTS="$( { grep -F '"tool_use"' "$CHUNK" || true; } | jq -n -R -c "${JQ_ARGS[@]}" "$JQ_DEFS"'
  [inputs | fromjson? // empty] | compact' 2>/dev/null)" || exit 0

# ── Attribute each target to the repository it touched ──────────────────────
# A target's repository is the git toplevel of its nearest existing directory,
# resolved once per directory:
#   - under PROJECT_DIR by prefix → this checkout, unless that toplevel is a checkout
#     nested inside it (a worktree outside .claude/worktrees/, a nested clone). With
#     no toplevel, or one at or above PROJECT_DIR, the prefix decides.
#   - in PROJECT_DIR/.claude/worktrees/ → that worktree; nothing once it is removed.
#   - anywhere else → its toplevel (this checkout again when only the spelling
#     differs); nothing outside git.
TARGETS="$(jq -r "${JQ_ARGS[@]}" "$JQ_DEFS"'
  [.[].paths[]?] | unique | .[]
  | [., (if under then "under" elif in_worktrees then "worktrees" else "outside" end)] | @tsv' <<<"$EVENTS" 2>/dev/null)" || exit 0
REPO_LINES=""
DIR_TOPS=$'\n' # resolved "<dir><TAB><real toplevel>" lines
while IFS=$'\t' read -r path class; do
  [[ -n "$path" ]] || continue
  dir="$path"
  while [[ -n "$dir" && ! -d "$dir" ]]; do dir="${dir%/*}"; done
  [[ -n "$dir" ]] || dir="/"
  case "$DIR_TOPS" in
    *$'\n'"$dir"$'\t'*)
      top="${DIR_TOPS#*$'\n'"$dir"$'\t'}"
      top="${top%%$'\n'*}" ;;
    *)
      top="$(real_dir "$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)")"
      DIR_TOPS="$DIR_TOPS$dir"$'\t'"$top"$'\n' ;;
  esac
  repo=""
  case "$class" in
    under) if [[ "$top" == "$PROJECT_REAL"/* ]]; then repo="$top"; else repo="$PROJECT_REAL"; fi ;;
    worktrees) if [[ "$top" == "$PROJECT_REAL"/* ]]; then repo="$top"; fi ;;
    *) repo="$top" ;;
  esac
  if [[ -n "$repo" ]]; then
    REPO_LINES="$REPO_LINES$path"$'\t'"$repo"$'\n'
  fi
done <<<"$TARGETS"
REPO_OF="$(printf '%s' "$REPO_LINES" | jq -R -s -c 'split("\n") | map(select(length > 0) | split("\t") | {(.[0]): .[1]}) | add // {}')"

# Fold the new events into the session state. Every later tool call adds the
# repositories it touched to each invoked skill's `repos`; re-invoking a skill resets
# them, so the LAST invocation governs. The transcript cannot say which skill made
# which call, so every skill invoked before a call is credited.
read -r -d '' JQ_FOLD <<'EOF' || true
reduce .[] as $e (
  ($state | .skills //= {} | .blocks //= {});
  if $e.skill then .skills[$e.skill] = {at: $e.at, repos: []}
  else
    ([$e.paths[] | $repo_of[.] // empty] | unique) as $repos
    | if ($repos | length) > 0 then .skills |= map_values(.repos = ((.repos // []) + $repos | unique)) else . end
  end
)
| .offset = $offset
| .root = $real
| .v = $v
EOF

NEW_STATE="$(jq -c --argjson state "$STATE" --arg real "$PROJECT_REAL" --argjson repo_of "$REPO_OF" --argjson offset "$NEW_OFFSET" --argjson v "$STATE_VERSION" "$JQ_FOLD" <<<"$EVENTS" 2>/dev/null)" || exit 0

write_marker() {
  local tmp="$MARKER.$$"
  printf '%s\n' "$NEW_STATE" >"$tmp" && mv -f "$tmp" "$MARKER"
}

# One "skill<TAB>invoked_at<TAB>repo" row per repository each invoked skill worked in.
WORK_ROWS="$(jq -r '.skills | to_entries[] | .key as $k | (.value.at // "") as $at | (.value.repos // [])[] | [$k, $at, .] | @tsv' <<<"$NEW_STATE")"
if [[ -z "$WORK_ROWS" ]]; then
  write_marker
  exit 0  # Read-only / conversational session, or the work touched no repository.
fi

# ── Evidence checks ──────────────────────────────────────────────────────────
RELEASE_EVIDENCE="$PROJECT_DIR/scripts/lib/release-evidence.mjs"
[[ -f "$RELEASE_EVIDENCE" ]] || RELEASE_EVIDENCE="$HOOK_REPO/scripts/lib/release-evidence.mjs"
CAND_CACHE=$'\n' # "<repo><TAB><candidate id>" lines
CAND=""
# Sets CAND to <repo>'s current git_tree_projection candidate id ("" if it cannot be
# computed). Sets a global rather than printing so the cache survives: a $(...)
# subshell would drop it.
resolve_candidate() {
  case "$CAND_CACHE" in
    *$'\n'"$1"$'\t'*)
      CAND="${CAND_CACHE#*$'\n'"$1"$'\t'}"
      CAND="${CAND%%$'\n'*}"
      return 0 ;;
  esac
  CAND=""
  if [[ -f "$RELEASE_EVIDENCE" ]] && command -v node >/dev/null 2>&1; then
    CAND="$(node "$RELEASE_EVIDENCE" --repo "$1" --print-candidate --json 2>/dev/null | jq -r '.candidate_identity.id // empty' 2>/dev/null || true)"
  fi
  CAND_CACHE="$CAND_CACHE$1"$'\t'"$CAND"$'\n'
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

# has_evidence <skill> <invoked_at> <repo dir>: a checkpoint in <repo dir> whose
# protocol timestamp is at or after the invocation. This is current-run evidence; a
# stale file from an older session cannot satisfy it. Gate skills may instead carry a
# PASS handoff bound to that repository's current candidate. This is an
# accidental-error control, not a security boundary against an actor that can edit
# both files.
has_evidence() {
  local skill="$1" invoked_at="$2" checkpoint="$3/.checkpoints/$1.checkpoint.json" checkpoint_at
  [[ -f "$checkpoint" ]] || return 1
  checkpoint_at="$(jq -r '.record_updated_at // .updated_at // empty' "$checkpoint" 2>/dev/null || true)"
  if [[ -n "$invoked_at" && -n "$checkpoint_at" ]] && at_or_after "$invoked_at" "$checkpoint_at"; then
    return 0
  fi
  [[ "$GATE_SKILLS" == *" $skill "* ]] || return 1
  resolve_candidate "$3"
  if [[ -n "$CAND" ]]; then
    jq -e --arg c "$CAND" '[.handoffs[]? | select(.type == "verification.verdict" and .candidate.id == $c and .payload.verdict == "PASS")] | length > 0' "$checkpoint" >/dev/null 2>&1
    return
  fi
  [[ -n "$invoked_at" ]] && mtime_at_or_after "$checkpoint" "$invoked_at"
}

# A skill is satisfied by current-run evidence in ANY repository it worked in: the
# skills write their checkpoint where they worked, and one session cannot tell which
# skill made which call. It is demanded only when it worked in THIS checkout and left
# evidence nowhere; work confined to other repositories is never this hook's to
# police, and it never asks for a checkpoint in a repository the skill did not touch.
MISSING=()
ALSO="" # "skill<TAB>other repos" lines, for the block reason
for skill in "${ENFORCED_SKILLS[@]}"; do
  rows="$(awk -F $'\t' -v wanted="$skill" '$1 == wanted' <<<"$WORK_ROWS")"
  [[ -n "$rows" ]] || continue
  here=0
  others=""
  satisfied=0
  while IFS=$'\t' read -r _ invoked_at repo; do
    dir="$repo"
    if [[ "$repo" == "$PROJECT_REAL" ]]; then
      dir="$PROJECT_DIR"
      here=1
    else
      others="$others${others:+, }$repo"
    fi
    if has_evidence "$skill" "$invoked_at" "$dir"; then
      satisfied=1
      break
    fi
  done <<<"$rows"
  if (( satisfied == 1 || here == 0 )); then
    continue
  fi
  MISSING+=("$skill")
  if [[ -n "$others" ]]; then
    ALSO="$ALSO$skill"$'\t'"$others"$'\n'
  fi
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
LIST=""
for skill in "${MISSING[@]}"; do
  others="$(awk -F $'\t' -v wanted="$skill" '$1 == wanted { print $2; exit }' <<<"$ALSO")"
  if [[ -n "$others" ]]; then
    LIST="$LIST  - $skill (it also worked in $others; a current-run checkpoint there satisfies this too)"$'\n'
  else
    LIST="$LIST  - $skill"$'\n'
  fi
done
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

Record only what the skill did in this repository. Never copy another project's state into these checkpoints; for work in another repository, write that repository's checkpoint (OPCHAIN_ROOT=<its root>).

This hook blocks at most twice per session for the same skill set, then logs a note and lets the session end.
EOF

jq -n --arg reason "$REASON" '{decision:"block", reason:$reason}'
