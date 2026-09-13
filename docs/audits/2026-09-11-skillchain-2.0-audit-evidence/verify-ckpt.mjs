import { dirname as __dn, resolve as __rs } from 'node:path';
import { fileURLToPath as __fp } from 'node:url';
// Repo root, resolved from this file: docs/audits/<evidence dir>/ -> three levels up.
const __ROOT = __rs(__dn(__fp(import.meta.url)), '../../..');
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = __ROOT;
const SK = join(ROOT, 'skills');
const ids = readdirSync(SK).filter((d) => existsSync(join(SK, d, 'SKILL.md'))).sort();

console.log('=== V1: do skills route the reader to the bundled references/checkpoint-protocol.md? ===');
const noPointer = ids.filter((id) => !/references\/checkpoint-protocol\.md/.test(readFileSync(join(SK, id, 'SKILL.md'), 'utf8')));
console.log(`  bundle exists for ${ids.filter((i) => existsSync(join(SK, i, 'references/checkpoint-protocol.md'))).length} skills`);
console.log(`  SKILL.md never names it in ${noPointer.length}/${ids.length}: ${noPointer.join(', ')}`);

console.log('\n=== V2: session-state.cjs rendering of object-form next_actions ===');
const dir = mkdtempSync(join(tmpdir(), 'ss-'));
mkdirSync(join(dir, '.checkpoints'), { recursive: true });
execFileSync('git', ['init', '-q', '.'], { cwd: dir });
writeFileSync(join(dir, '.checkpoints', 'oc-app-architect.checkpoint.json'), JSON.stringify({
  protocol_version: '1.1', skill: 'oc-app-architect', project: 'p', project_dir: dir,
  created_at: '2026-09-01T00:00:00Z', updated_at: new Date().toISOString(),
  phase: 'build', step: 's', status: 'in_progress', progress_summary: 'x',
  // object form is explicitly blessed by the protocol (SKILL.md:154-158) and the validator
  next_actions: [{ text: 'Re-run evaluator on sprint 2', done_when: 'npm test' }],
}));
let out = '';
try {
  out = execFileSync('node', [join(ROOT, 'plugins/opchain/hooks/session-state.cjs')],
    { input: JSON.stringify({ cwd: dir, hook_event_name: 'SessionStart' }), encoding: 'utf8' });
} catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
console.log('  hook output:');
console.log(out.split('\n').filter((l) => l.trim()).map((l) => '    ' + l.slice(0, 160)).join('\n'));
console.log(`  contains "[object Object]": ${out.includes('[object Object]') ? 'YES  *** BUG ***' : 'no'}`);

console.log('\n=== V3: validator vs ISO-8601 offset timestamps ===');
const mk = (extra) => JSON.stringify({
  protocol_version: '1.1', skill: 'oc-scale-ops', project: 'p', project_dir: dir,
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  phase: 'p', step: 's', status: 'complete', progress_summary: 'x', ...extra,
});
const run = (json, label) => {
  writeFileSync(join(dir, '.checkpoints', 'oc-scale-ops.checkpoint.json'), json);
  try {
    const r = execFileSync('node', [join(ROOT, 'scripts/checkpoint.mjs'), 'validate'], { cwd: dir, encoding: 'utf8' });
    console.log(`  ${label}: ACCEPTED  ${/⚠/.test(r) ? '(with warnings)' : ''}`);
  } catch (e) {
    const t = ((e.stdout || '') + (e.stderr || '')).split('\n').filter((l) => /✗|error|must|invalid/i.test(l))[0] || 'rejected';
    console.log(`  ${label}: REJECTED  ${t.trim().slice(0, 110)}`);
  }
};
run(mk({ updated_at: '2026-09-01T00:00:00+00:00' }), 'updated_at with +00:00 offset (valid ISO-8601)');
run(mk({ updated_at: '2026-09-01T00:00:00Z' }), 'updated_at with Z                          ');

console.log('\n=== V4: validator vs contradictory lifecycle states ===');
run(mk({ status: 'blocked' }), 'status=blocked with NO blockers array       ');
run(mk({ status: 'complete', blockers: [{ id: 'b1', description: 'needs a human decision', blocking: 'ship', needs: 'user_decision' }] }),
  'status=complete with an OPEN user_decision  ');
rmSync(dir, { recursive: true, force: true });
