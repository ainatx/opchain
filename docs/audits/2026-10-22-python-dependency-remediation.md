# Python dependency remediation for release preparation

The authenticated GitHub Dependabot snapshot on October 22 reported 40 open
Python alerts in `plugins/ow-tools/python/uv.lock`: 39 for Pillow and one for
certifi, including five critical alerts. The separate six npm alerts are
covered by the JavaScript dependency consolidation. GitHub's default-branch
alert state does not change until the updated locks land and are scanned.

`uv lock --upgrade-package pillow --upgrade-package certifi` changed only two
package records: Pillow 12.3.0 to 13.0.0 and certifi 2026.7.22 to 2026.10.19.
The Python 3.12 requirement, pyannote.audio 4.0.7 and publisher model revision
remain unchanged. `uv lock --check` passed with 117 entries. The new lock's
SHA-256 is `360393190d7b102cfab6ff12ed5a473415688ce2db7efa1e21ebc7fbdbd1c365`.

An independent comparison with `packaging.specifiers.SpecifierSet` confirmed
that all 40 old versions matched their supplied advisory ranges, and all new
versions fall outside those ranges and meet the patched floors. No suppression
was applied. The agent then audited every registry-backed entry with pip-audit
2.10.1, without resolving or installing project dependencies:

```text
uv tool run pip-audit --no-deps --disable-pip --strict --progress-spinner off --format json --output /tmp/opchain-python-pip-audit.json --requirement /tmp/opchain-python-audit-requirements.txt
```

The requirements were generated directly from the lock's exact versions,
including alternate-platform entries. Result: exit 0, 116 dependencies audited,
zero skipped and zero known vulnerabilities. The one local project entry was
excluded. The complete response is saved in
`evidence/2026-10-22-python-pip-audit.json`.

An isolated Python 3.12 smoke test installed only these two small packages:
PNG/JPEG round trips and TLS CA-bundle loading passed. The coordinator inspected
the lock diff and regenerated and checked the ow-tools security manifest.
The final integrated commit gate is recorded separately.

This verifies lock consistency, current advisory responses and basic package
behavior on macOS arm64. It does not prove complete pyannote integration or
all-platform behavior. No model was downloaded, and no transcription runtime
environment was installed or synchronized. A separate doctor check found the
Hugging Face token and pinned speaker model absent, so real transcription timing
still requires the owner's gated-model setup.
