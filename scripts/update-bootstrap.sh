#!/bin/sh
# Download fully before executing. A partial piped script never runs main().
main() {
  set -eu
  command -v node >/dev/null 2>&1 || { echo 'Opchain needs Node.js 22.13 or newer.' >&2; return 1; }
  command -v curl >/dev/null 2>&1 || { echo 'Opchain needs curl.' >&2; return 1; }
  opchain_update_tmp=$(mktemp -d)
  trap 'rm -rf "$opchain_update_tmp"' EXIT HUP INT TERM
  curl --proto '=https' --tlsv1.2 -fsS --max-time 30 https://opchain.dev/update.mjs -o "$opchain_update_tmp/update.mjs"
  node "$opchain_update_tmp/update.mjs" "$@"
}
main "$@"
