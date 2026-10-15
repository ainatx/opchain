#!/usr/bin/env bash
# Bundle opchain skills into:
#   public/opchain-skills.zip            — combined bundle (every skill's full directory tree)
#   public/skills/<id>.zip               — per-skill bundle (full skill directory tree)
#
# Per-skill zips power the "Download skill" button on /skills/<id>; the combined
# zip powers the "download all" button on /skills. Both carry the complete skill
# folder so SKILL.md's references/, scripts/, examples/, TRYIT.md, etc. come along.
# Both also carry LICENSE + NOTICE: an OSPO intake reads the artifact it
# downloaded, not the repo, so the terms must be establishable from the zip
# itself (tests/license-artifacts.test.js gates this).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS="${OPCHAIN_SKILLS_DIR:-$ROOT/skills}"
PUBLIC="${OPCHAIN_PUBLIC_DIR:-$ROOT/public}"
# The public zips carry the oc- catalog only (catalogs.json: the ow- catalog's
# zip output is null). Refuse any other tree before the rm -f calls below.
for dir in "$SKILLS"/*/; do
  [[ -f "${dir}SKILL.md" ]] || continue
  case "$(basename "$dir")" in
    oc-*) ;;
    *) echo "make-skills-zip: refusing to zip $SKILLS: $(basename "$dir") is not in the oc- catalog (catalogs.json)" >&2; exit 1 ;;
  esac
done
# Normalize to an absolute path — COMBINED/out are used from subshells that
# cd into $SKILLS / $STAGE, where a relative override would silently point
# the zips somewhere else.
mkdir -p "$PUBLIC"
PUBLIC="$(cd "$PUBLIC" && pwd)"
COMBINED="$PUBLIC/opchain-skills.zip"
PER_SKILL_DIR="$PUBLIC/skills"

mkdir -p "$PER_SKILL_DIR"
rm -f "$COMBINED"
rm -f "$PER_SKILL_DIR"/*.zip

# Staging tree so LICENSE/NOTICE can be zipped *inside* each per-skill folder
# path without copying the whole skill directory.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# ── Combined bundle (every skill's full directory tree) ──────────────
# Zip each skill's whole folder, same as the per-skill bundles below, so
# the "download all" zip carries SKILL.md *plus* its references/, scripts/,
# examples/, TRYIT.md, packs/ — everything Claude Code needs to operate the
# skill once it's unzipped into .claude/skills/. This block used to zip only
# */SKILL.md, which shipped a bundle whose SKILL.md files pointed at sibling
# files (e.g. "read references/orchestrator.md on first invocation") that
# weren't in the download. README.md rides along as the install guide.
(
  cd "$SKILLS" || exit 1
  shopt -s nullglob
  items=()
  for dir in */; do
    [[ -f "${dir}SKILL.md" ]] || continue
    items+=("${dir%/}")
  done
  if [[ ${#items[@]} -eq 0 ]]; then
    echo "make-skills-zip: no SKILL.md files found" >&2
    exit 1
  fi
  [[ -f README.md ]] && items+=(README.md)
  zip -q -9 -r "$COMBINED" "${items[@]}"
)
(
  cd "$ROOT" || exit 1
  zip -q -9 "$COMBINED" LICENSE NOTICE
)
echo "Wrote $COMBINED"

# ── Per-skill bundles (full directory tree per skill) ────────────────
# Each zip contains the skill's full folder so users get SKILL.md plus
# any references/, scripts/, examples/, TRYIT.md, etc. — everything
# Claude Code needs to operate the skill. Filename matches the skill's
# directory name so the URL is /skills/<id>.zip. LICENSE + NOTICE land
# inside the skill folder so a single extracted skill is self-describing.
for dir in "$SKILLS"/*/; do
  id="$(basename "$dir")"
  # Skip anything that doesn't have a SKILL.md (defensive — schema requires it
  # for valid skills, but keeps loose files / scratch dirs out of the build).
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
