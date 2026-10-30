#!/usr/bin/env bash
# Bundle the ow- catalog (skills-work/) into:
#   public/opchain-work-skills.zip       — combined bundle: every ow- skill's full
#                                          directory tree, ow-protocol.md, README.md
#   public/work/<id>.zip                 — per-skill bundle (full skill directory tree)
#   public/work/ow-tools-security-manifest.sha256
#                                        — the SHA-256 of plugins/ow-tools/SECURITY-MANIFEST.md,
#                                          published here, apart from the mirror that carries
#                                          the manifest itself (ow-tools posture SA-001)
#
# The ow- catalog is the oc- catalog's sibling with its own protocol and
# per-skill versions (catalogs.json), so it gets its own zips: the public
# opchain-skills.zip stays oc- only, and /skills.json catalogVersion (the
# lockstep oc- semver the install update-check hook reads) is untouched.
#
# Integrity (REL-01, audit G20): nothing here is removed or written until the
# ow- catalog passes `gen-skills-catalog` and `check-skill-contracts` for the
# exact tree being zipped. Both scripts read OPCHAIN_WORK_SKILLS_DIR, so a
# planted tree is checked, not the repo's. A failed check exits 1 with the
# checker's own message and leaves any previous zips in place.
#
# LICENSE + NOTICE ride along like the oc- zips (tests/license-artifacts.test.js
# gates those; tests/work-distribution.test.js gates these).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS="${OPCHAIN_WORK_SKILLS_DIR:-$ROOT/skills-work}"
PUBLIC="${OPCHAIN_PUBLIC_DIR:-$ROOT/public}"
PLUGIN="$ROOT/plugins/ow-tools"

[[ -d "$SKILLS" ]] || { echo "make-work-skills-zip: $SKILLS is not a directory" >&2; exit 1; }
SKILLS="$(cd "$SKILLS" && pwd)"

# The work zips carry the ow- catalog only (catalogs.json). Refuse any other
# tree before the catalog checks and the rm -f calls below.
found=0
for dir in "$SKILLS"/*/; do
  [[ -f "${dir}SKILL.md" ]] || continue
  found=1
  case "$(basename "$dir")" in
    ow-*) ;;
    *) echo "make-work-skills-zip: refusing to zip $SKILLS: $(basename "$dir") is not in the ow- catalog (catalogs.json)" >&2; exit 1 ;;
  esac
done
if [[ $found -eq 0 ]]; then
  echo "make-work-skills-zip: no SKILL.md files found under $SKILLS" >&2
  exit 1
fi
[[ -f "$SKILLS/ow-protocol.md" ]] || { echo "make-work-skills-zip: $SKILLS/ow-protocol.md is missing; the ow- zips ship the protocol" >&2; exit 1; }

# The catalog gate. Both checkers iterate catalogs.json and take this catalog's
# directory from OPCHAIN_WORK_SKILLS_DIR; the oc- catalog is checked from the
# repo as usual (it must pass too, which it does on any buildable tree).
if ! OPCHAIN_WORK_SKILLS_DIR="$SKILLS" node "$ROOT/scripts/gen-skills-catalog.mjs" >/dev/null; then
  echo "make-work-skills-zip: refusing to zip $SKILLS: gen-skills-catalog failed for the ow- catalog (nothing written)" >&2
  exit 1
fi
if ! OPCHAIN_WORK_SKILLS_DIR="$SKILLS" node "$ROOT/scripts/check-skill-contracts.mjs" >/dev/null; then
  echo "make-work-skills-zip: refusing to zip $SKILLS: check-skill-contracts failed for the ow- catalog (nothing written)" >&2
  exit 1
fi

mkdir -p "$PUBLIC"
PUBLIC="$(cd "$PUBLIC" && pwd)"
COMBINED="$PUBLIC/opchain-work-skills.zip"
PER_SKILL_DIR="$PUBLIC/work"

mkdir -p "$PER_SKILL_DIR"
rm -f "$COMBINED"
rm -f "$PER_SKILL_DIR"/*.zip "$PER_SKILL_DIR"/*.sha256

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# ── Combined bundle ──────────────────────────────────────────────────
# Every skill's whole folder (SKILL.md, references/ with its ow-protocol.md
# copy, examples/, skill.edges.yaml, CHANGELOG.md), plus the protocol source
# and the family README as the install guide. Unzipped into .claude/skills/,
# each ow-<id>/ folder is a complete skill.
(
  cd "$SKILLS" || exit 1
  shopt -s nullglob
  items=()
  for dir in */; do
    [[ -f "${dir}SKILL.md" ]] || continue
    items+=("${dir%/}")
  done
  items+=(ow-protocol.md)
  [[ -f README.md ]] && items+=(README.md)
  zip -q -9 -r "$COMBINED" "${items[@]}"
)
(
  cd "$ROOT" || exit 1
  zip -q -9 "$COMBINED" LICENSE NOTICE
)
echo "Wrote $COMBINED"

# ── Per-skill bundles ────────────────────────────────────────────────
for dir in "$SKILLS"/*/; do
  id="$(basename "$dir")"
  [[ -f "$dir/SKILL.md" ]] || continue
  out="$PER_SKILL_DIR/$id.zip"
  (
    cd "$SKILLS" || exit 1
    zip -q -9 -r "$out" "$id"
  )
  mkdir -p "$STAGE/$id"
  cp "$ROOT/LICENSE" "$ROOT/NOTICE" "$STAGE/$id/"
  (
    cd "$STAGE" || exit 1
    zip -q -9 "$out" "$id/LICENSE" "$id/NOTICE"
  )
  echo "Wrote $out"
done

# ── ow-tools manifest hash, out of band ──────────────────────────────
# SECURITY-MANIFEST.md travels in the mirror tree it attests, so a reader
# needs a second channel to compare it against. opchain.dev is built from
# this repository and deployed by hand, never from the mirror, so the hash
# served here is that channel. shasum -c format, one line.
if [[ -f "$PLUGIN/SECURITY-MANIFEST.md" ]]; then
  hash="$(shasum -a 256 "$PLUGIN/SECURITY-MANIFEST.md" | cut -d' ' -f1)"
  printf '%s  SECURITY-MANIFEST.md\n' "$hash" > "$PER_SKILL_DIR/ow-tools-security-manifest.sha256"
  echo "Wrote $PER_SKILL_DIR/ow-tools-security-manifest.sha256"
fi
