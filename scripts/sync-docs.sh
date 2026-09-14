#!/usr/bin/env bash
# Copy opchain SKILL.md files from skills/ into public/docs/ for static serving.
# LICENSE + NOTICE ride along at the docs root so the served doc tree states
# its terms (tests/license-artifacts.test.js gates this).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${OPCHAIN_SKILLS_DIR:-$ROOT/skills}"
DEST="${OPCHAIN_DOCS_DIR:-$ROOT/public/docs}"
mkdir -p "$DEST"
for d in "$SRC"/*/; do
  [[ -f "${d}SKILL.md" ]] || continue
  name="$(basename "$d")"
  mkdir -p "$DEST/$name"
  cp "${d}SKILL.md" "$DEST/$name/SKILL.md"
  if [[ -d "${d}references" ]]; then
    rm -rf -- "$DEST/$name/references"
    cp -R "${d}references" "$DEST/$name/references"
  fi
done
cp "$ROOT/LICENSE" "$ROOT/NOTICE" "$DEST/"
echo "Synced skill docs to $DEST"
