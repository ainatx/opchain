#!/usr/bin/env bash
# Copy the ow- catalog's reader-facing files from skills-work/ into
# public/docs/work/ for static serving:
#   public/docs/work/<id>/SKILL.md, references/, CHANGELOG.md
#   public/docs/work/ow-protocol.md, README.md
# LICENSE + NOTICE ride along at the docs root like the oc- tree.
#
# The oc- tree (public/docs/<id>/) is untouched: it is what the hosted MCP
# server streams skill bodies from, and it stays oc- only (catalogs.json).
#
# Integrity (REL-01): nothing is written until the ow- catalog passes
# gen-skills-catalog and check-skill-contracts for the exact tree being
# published (both read OPCHAIN_WORK_SKILLS_DIR).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${OPCHAIN_WORK_SKILLS_DIR:-$ROOT/skills-work}"
DEST="${OPCHAIN_WORK_DOCS_DIR:-$ROOT/public/docs/work}"

[[ -d "$SRC" ]] || { echo "sync-work-docs: $SRC is not a directory" >&2; exit 1; }
SRC="$(cd "$SRC" && pwd)"

found=0
for d in "$SRC"/*/; do
  [[ -f "${d}SKILL.md" ]] || continue
  found=1
  case "$(basename "$d")" in
    ow-*) ;;
    *) echo "sync-work-docs: refusing to publish $SRC: $(basename "$d") is not in the ow- catalog (catalogs.json)" >&2; exit 1 ;;
  esac
done
[[ $found -eq 1 ]] || { echo "sync-work-docs: no SKILL.md files found under $SRC" >&2; exit 1; }
[[ -f "$SRC/ow-protocol.md" ]] || { echo "sync-work-docs: $SRC/ow-protocol.md is missing" >&2; exit 1; }

if ! OPCHAIN_WORK_SKILLS_DIR="$SRC" node "$ROOT/scripts/gen-skills-catalog.mjs" >/dev/null; then
  echo "sync-work-docs: refusing to publish $SRC: gen-skills-catalog failed for the ow- catalog (nothing written)" >&2
  exit 1
fi
if ! OPCHAIN_WORK_SKILLS_DIR="$SRC" node "$ROOT/scripts/check-skill-contracts.mjs" >/dev/null; then
  echo "sync-work-docs: refusing to publish $SRC: check-skill-contracts failed for the ow- catalog (nothing written)" >&2
  exit 1
fi

mkdir -p "$DEST"
for d in "$SRC"/*/; do
  [[ -f "${d}SKILL.md" ]] || continue
  name="$(basename "$d")"
  mkdir -p "$DEST/$name"
  cp "${d}SKILL.md" "$DEST/$name/SKILL.md"
  [[ -f "${d}CHANGELOG.md" ]] && cp "${d}CHANGELOG.md" "$DEST/$name/CHANGELOG.md"
  if [[ -d "${d}references" ]]; then
    rm -rf -- "$DEST/$name/references"
    cp -R "${d}references" "$DEST/$name/references"
  fi
done
cp "$SRC/ow-protocol.md" "$DEST/ow-protocol.md"
[[ -f "$SRC/README.md" ]] && cp "$SRC/README.md" "$DEST/README.md"
cp "$ROOT/LICENSE" "$ROOT/NOTICE" "$DEST/"
echo "Synced ow- skill docs to $DEST"
