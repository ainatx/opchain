// Execution oracle for the shipped commit gate.
// Builds the probe command strings at runtime so this file's own text does not
// contain the literal trigger (the repo's armed gate reads Bash command text).
import { dirname as __dn, resolve as __rs } from 'node:path';
import { fileURLToPath as __fp } from 'node:url';
// Repo root, resolved from this file: docs/audits/<evidence dir>/ -> three levels up.
const __ROOT = __rs(__dn(__fp(import.meta.url)), '../../..');
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GATE = __rs(__ROOT, 'plugins/opchain/hooks/pre-commit-gate.cjs');
const G = 'g' + 'it';
const CM = 'com' + 'mit';

const dir = mkdtempSync(join(tmpdir(), 'gateprobe-'));
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: dir, encoding: 'utf8' });
sh('git', ['init', '-q', '.']);
sh('git', ['config', 'user.email', 'a@b.c']);
sh('git', ['config', 'user.name', 't']);
writeFileSync(join(dir, 'f.txt'), 'x\n');
sh('git', ['add', '-A']);

function setCheckpoint(skillState, gitignore) {
  mkdirSync(join(dir, '.checkpoints'), { recursive: true });
  if (gitignore !== undefined) writeFileSync(join(dir, '.gitignore'), gitignore);
  writeFileSync(join(dir, '.checkpoints', 'oc-bug-check.checkpoint.json'), JSON.stringify({
    protocol_version: '1.1', skill: 'oc-bug-check', project: 't', project_dir: dir,
    created_at: '2026-09-11T00:00:00Z', updated_at: new Date().toISOString(),
    phase: 'gate', step: 'run', status: 'complete', progress_summary: 'probe',
    skill_state: skillState,
  }, null, 2));
}

function ask(command) {
  const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: dir });
  let out = '';
  try { out = execFileSync('node', [GATE], { input: payload, encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  if (!out.includes('"deny"')) return 'ALLOW';
  try { return 'DENY: ' + JSON.parse(out).hookSpecificOutput.permissionDecisionReason.split('\n')[0]; } catch { return 'DENY'; }
}

// The tree a run records, per oc-bug-check § Commit gate contract. Since v1.9.1
// (GATE-11) the recipe leaves the bug-check checkpoint itself out of the hash;
// with the pre-fix gate that exclusion changes nothing, since the gate still
// counted the file and denied regardless.
function currentTree() {
  const idx = join(tmpdir(), 'probe-index-' + process.pid);
  try { rmSync(idx); } catch {}
  const env = { ...process.env, GIT_INDEX_FILE: idx };
  execFileSync('git', ['add', '-A', '--', '.'], { cwd: dir, env });
  execFileSync('git', ['rm', '--cached', '-f', '-q', '--ignore-unmatch', '--', '.checkpoints/oc-bug-check.checkpoint.json'], { cwd: dir, env });
  return execFileSync('git', ['write-tree'], { cwd: dir, env, encoding: 'utf8' }).trim();
}

console.log('=== PROBE A: prefix / quoting bypass (verdict on file = FAIL, so every row MUST deny) ===');
setCheckpoint({ last_run_verdict: 'FAIL' }, '.checkpoints/\n');
const forms = [
  [`${G} ${CM} -m x`, 'control'],
  [`exec ${G} ${CM} -m x`, 'exec prefix'],
  [`builtin exec ${G} ${CM} -m x`, 'builtin exec'],
  [`\\${G} ${CM} -m x`, 'backslash-escaped git'],
  [`${G} "${CM}" -m x`, 'quoted subcommand'],
  [`${G} c\\ommit -m x`, 'backslash inside subcommand'],
  [`${G} $'${CM}' -m x`, 'ANSI-C quoted'],
];
for (const [cmd, label] of forms) {
  const v = ask(cmd);
  console.log(`  ${v.startsWith('DENY') ? 'DENY ' : 'ALLOW'}  ${label.padEnd(28)} ${JSON.stringify(cmd)}${v === 'ALLOW' ? '   *** BYPASS ***' : ''}`);
}

console.log('\n=== PROBE B: tree-bound PASS when .checkpoints/ is TRACKED (what the shipped docs tell users to do) ===');
// tracked case: no gitignore entry for .checkpoints
writeFileSync(join(dir, '.gitignore'), '');
const treeBefore = currentTree();
setCheckpoint({ last_run_verdict: 'PASS', verified_tree: treeBefore }, '');
console.log(`  hashed tree before writing checkpoint: ${treeBefore.slice(0, 12)}`);
console.log(`  tree after writing checkpoint:         ${currentTree().slice(0, 12)}`);
console.log(`  verdict: ${ask(`${G} ${CM} -m x`)}   <- tracked .checkpoints (per oc-git-ops SKILL.md:550 / protocol :490)`);

// now gitignore just the bug-check checkpoint and redo honestly
writeFileSync(join(dir, '.gitignore'), '.checkpoints/oc-bug-check.checkpoint.json\n');
const t2 = currentTree();
setCheckpoint({ last_run_verdict: 'PASS', verified_tree: t2 }, '.checkpoints/oc-bug-check.checkpoint.json\n');
console.log(`  verdict: ${ask(`${G} ${CM} -m x`)}   <- same run, but the checkpoint file is gitignored`);

console.log('\n=== PROBE C: does the gate accept the schema oc-bug-check SKILL.md documents? ===');
writeFileSync(join(dir, '.gitignore'), '.checkpoints/oc-bug-check.checkpoint.json\n');
const t3 = currentTree();
setCheckpoint({ last_run: { at: new Date().toISOString(), verdict: 'PASS', duration_ms: 1200 }, verified_tree: t3 },
  '.checkpoints/oc-bug-check.checkpoint.json\n');
console.log(`  SKILL.md-shaped (skill_state.last_run.verdict = PASS): ${ask(`${G} ${CM} -m x`)}`);
setCheckpoint({ last_run_verdict: 'PASS', verified_tree: t3 }, '.checkpoints/oc-bug-check.checkpoint.json\n');
console.log(`  plugin-command-shaped (skill_state.last_run_verdict):  ${ask(`${G} ${CM} -m x`)}`);

rmSync(dir, { recursive: true, force: true });
