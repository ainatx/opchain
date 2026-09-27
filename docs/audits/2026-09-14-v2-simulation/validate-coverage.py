"""Validate recorded representative coverage, not semantic completeness or success."""
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CANDIDATE = Path('<worktree>/opchain-v2-simulation')
sources = ['root-coverage.json', 's1/coverage.json', 's2/coverage.json',
           's4/coverage.json', 's5/coverage.json', 's6/coverage.json', 's7/coverage.json']
rows, errors = [], []
for source in sources:
    path = HERE / 'evidence' / source
    document = json.loads(path.read_text())
    entries = document if isinstance(document, list) else document['skills']
    for entry in entries:
        invocation = entry.get('invocations', entry.get('declared_invocation', entry.get('invocation')))
        row = dict(
            skill=entry['skill'], scenario=entry['scenario'],
            invocations=invocation if isinstance(invocation, list) else [invocation],
            skill_file=entry.get('skill_file', entry.get('loaded_skill')),
            inputs=entry.get('inputs', entry.get('input_paths')),
            outputs=entry.get('outputs', entry.get('output_paths')),
            expected=entry.get('expected', entry.get('expected_vs_actual')),
            observed=entry.get('observed', entry.get('actual', entry.get('observed_checks'))),
            outcome=entry['outcome'], mode=entry.get('mode', entry.get('implementation_mode')),
            limits=entry.get('limits', entry.get('limitations')), source=str(path),
        )
        for field in ['invocations', 'skill_file', 'inputs', 'outputs', 'expected', 'observed', 'mode', 'limits']:
            if not row[field] or (isinstance(row[field], list) and not all(row[field])):
                errors.append(f"{row['skill']}: missing {field}")
        for evidence in [row['skill_file'], *(row['inputs'] or []), *(row['outputs'] or [])]:
            if not evidence or not Path(evidence).exists():
                errors.append(f"{row['skill']}: missing evidence {evidence}")
        if entry.get('skill_sha256') and hashlib.sha256(Path(row['skill_file']).read_bytes()).hexdigest() != entry['skill_sha256']:
            errors.append(f"{row['skill']}: contract hash mismatch")
        for flag in ['counted', 'exercised', 'counts_as_exercised', 'counts_toward_coverage']:
            if flag in entry and entry[flag] is not True:
                errors.append(f"{row['skill']}: coverage explicitly refused")
        rows.append(row)

catalog = {p.parent.name for p in (CANDIDATE / 'skills').glob('*/SKILL.md')}
counts = collections.Counter(r['skill'] for r in rows)
missing = sorted(catalog - counts.keys())
duplicates = sorted(k for k, v in counts.items() if v != 1)
unexpected = sorted(counts.keys() - catalog)
for name in ['PLAN', 'EXPANSION-PLAN']:
    expected = (HERE / f'{name}.sha256').read_text().split()[0]
    if hashlib.sha256((HERE / f'{name}.md').read_bytes()).hexdigest() != expected:
        errors.append(f'{name}: frozen plan hash mismatch')

report = dict(candidate='63bb189dabb7c98b2fd961f11de144925a6e9519', catalog_count=len(catalog),
              covered_count=len(catalog & counts.keys()), coverage_percent=100 * len(catalog & counts.keys()) / len(catalog),
              missing=missing, duplicates=duplicates, unexpected=unexpected, errors=errors,
              counting_rule='Substantive representative workflow with actual output/refusal; failed/blocked still exercised; not all verbs or production acceptance',
              skills=sorted(rows, key=lambda r: r['skill']))
(HERE / 'coverage.json').write_text(json.dumps(report, indent=2) + '\n')
lines = ['# Skill coverage — 36/36 representative workflows', '',
         'Each skill is counted once. A failed or correctly blocked operation counts as exercised, not passed. This matrix does not certify every command, lifecycle, host or production outcome. Agent-authored fixtures and shipped-runtime execution are distinguished in the linked evidence.', '',
         'The frozen plans contain expected sequences, handoffs, hooks and outputs. Scenario reports compare those expectations with observed results. The JSON matrix preserves exact input/output paths and limitations; the validator checks inventory, required evidence paths and frozen plan hashes, not semantic correctness.', '',
         '| Skill | Scenario | Declared invocation | Recorded outcome | Evidence |',
         '|---|---|---|---|---|']
for row in report['skills']:
    invocation = '; '.join(row['invocations']).replace('|', '\\|')
    scenario_report = 'REPORT.md' if row['scenario'] == 'audit' else row['scenario'] + '.md'
    lines.append(f"| {row['skill']} | {row['scenario']} | {invocation} | {row['outcome']} | [{scenario_report}]({HERE / scenario_report}) |")
lines += ['', 'S3 supplies additional release/hook evidence without double-counting skills assigned to other scenarios.', '',
          'Independent coverage reviews: S4-COVERAGE-REVIEW.md and S7-COVERAGE-REVIEW.md. Full qualifications and the NO-GO decision: REPORT.md.', '']
(HERE / 'COVERAGE.md').write_text('\n'.join(lines))
print(json.dumps({k: v for k, v in report.items() if k != 'skills'}, indent=2))
raise SystemExit(bool(errors or missing or duplicates or unexpected))
