import { afterEach, describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { approvalPayload, digest, mergeHistory, normalizeEvent, validateEvaluation } from '../scripts/runtime/core.mjs';
import { handleLearning, switches } from '../scripts/runtime/learning.mjs';
import { scorecard } from '../scripts/runtime/scorecard.mjs';
import { projectName } from '../scripts/runtime/project.mjs';
const roots = [];
const now = Date.parse('2026-09-13T12:00:00Z');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const trustedKeys = { reviewer: publicKey.export({ format: 'pem', type: 'spki' }) };
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
const events = Array.from({ length: 3 }, (_, i) => ({ skill: 'oc-build', rubric: 'quality', score: 4, max: 10, at: `2026-09-0${i + 1}T12:00:00Z`, runId: `run-${i}` }));
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'opchain-learning-')); roots.push(root);
  const put = (name, value) => { writeFileSync(join(root, name), JSON.stringify(value)); return name; };
  const call = (...args) => handleLearning(args, { root, trustedKeys, now });
  return { root, put, call };
}
function candidate(kind = 'lesson') {
  const value = { schemaVersion: 1, kind, skill: 'oc-build', rubric: 'quality', text: 'Verify affected error paths before completion.', proposedAt: '2026-09-10T12:00:00Z', expiresAt: '2026-12-01T12:00:00Z', evidenceEventIds: mergeHistory(events).map(event => event.eventId) };
  if (kind === 'rule') {
    const instructionBundle = { base: 'Complete target tasks using repository instructions.', rule: '' };
    value.contract = { schemaVersion: 1, frozenAt: '2026-09-09T12:00:00Z', minTargetImprovement: 0.1,
      baseline: { mode: 'task', synthetic: false, runId: 'baseline-run', generatedAt: '2026-09-08T12:00:00Z', instructionBundle,
        instructionsHash: digest(instructionBundle), toolPolicyHash: digest('policy'), datasetHash: digest('dataset'), modelConfigHash: digest('model'), outputHash: digest('baseline output'), metrics: { target: 0.5, heldout: 0.8, full: 0.7 } } };
  }
  return value;
}
function evaluation(value) {
  const baseline = value.contract.baseline;
  const instructionBundle = { base: baseline.instructionBundle.base, rule: value.text };
  return { ...baseline, schemaVersion: 1, runId: 'candidate-run', generatedAt: '2026-09-11T12:00:00Z', instructionBundle,
    instructionsHash: digest(instructionBundle), candidateRuleHash: digest(value.text), outputHash: digest('improved task outputs'), candidateDigest: digest(value), contractDigest: digest(value.contract), metrics: { target: 0.7, heldout: 0.8, full: 0.75 } };
}
function receipt(value, staged, evidenceDigest = staged.evidenceDigest, action = 'activate-lesson') {
  const result = { schemaVersion: 1, keyId: 'reviewer', action, projectId: staged.projectId, candidateDigest: digest(value), evidenceDigest,
    approvedAt: '2026-09-12T12:00:00Z', expiresAt: '2026-11-01T12:00:00Z' };
  return { ...result, signature: sign(null, approvalPayload(result), privateKey).toString('base64') };
}
async function prepare(kind = 'lesson') {
  const fixture = setup(), value = candidate(kind);
  await fixture.call('history', 'ingest', fixture.put('events.json', events));
  await fixture.call('config', 'enable');
  const staged = await fixture.call(kind === 'lesson' ? 'hindsight' : 'evolve', 'stage', fixture.put('candidate.json', value));
  return { ...fixture, value, staged };
}
describe('canonical event history', () => {
  it('deduplicates references while preserving distinct verdicts at the same timestamp', () => {
    const a = { ...events[0], sourceRef: 'report.md' };
    const rows = mergeHistory([a], [{ ...a, sourceRef: 'archive/report.md' }], [{ ...a, rubric: 'security' }]);
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.rubric === 'quality').sourceRefs).toHaveLength(2);
  });
  it('rejects contradictions with the same event identity', () => {
    expect(() => mergeHistory(events, [{ ...events[0], score: 9 }])).toThrow('Conflicting event');
    expect(() => mergeHistory([{ ...events[0], dimensions: { quality: 4 } }], [{ ...events[0], dimensions: { quality: 5 } }])).toThrow('Conflicting event');
  });
  it('rejects malformed reference collections, unknown semantic fields, and forged IDs', () => {
    expect(() => normalizeEvent({ ...events[0], sourceRefs: 'report.md' })).toThrow('array');
    expect(() => normalizeEvent({ ...events[0], verdict: 'PASS' })).toThrow('Unsupported event field');
    expect(() => normalizeEvent({ ...events[0], eventId: 'arbitrary' })).toThrow('canonical identity');
  });
  it('keeps scorecard recurrence floor at three distinct weak events', () => {
    expect(scorecard([...events.slice(0, 2), events[0]])[0].recurringWeakness).toBe(false);
    expect(scorecard(events)[0].recurringWeakness).toBe(true);
    const strong = events.map((event, i) => ({ ...event, score: 9, runId: `strong-${i}`, at: `2026-08-0${i + 1}T12:00:00Z` }));
    expect(scorecard([...events, ...strong])[0].decline).toBe(true);
  });
  it('reads archives and live history through the same collision-aware API', async () => {
    const { root, put, call } = setup();
    await call('history', 'ingest', put('events.json', events.slice(0, 1)));
    mkdirSync(join(root, '.opchain/learning/history'));
    writeFileSync(join(root, '.opchain/learning/history/2025.json'), JSON.stringify(events));
    expect((await call('history', 'list')).events).toHaveLength(3);
  });
});
describe('candidate evidence and externally trusted activation', () => {
  it('starts disabled and stages without trusted credentials', async () => {
    const { root, call } = setup();
    expect((await call('hindsight', 'query')).enabled).toBe(false);
    expect(existsSync(join(root, '.opchain'))).toBe(false);
  });
  it('requires actual recurrent rubric failures rather than three arbitrary successes', async () => {
    const { put, call } = setup();
    const successes = events.map(event => ({ ...event, score: 10 }));
    await call('history', 'ingest', put('events.json', successes));
    const value = candidate(); value.evidenceEventIds = mergeHistory(successes).map(event => event.eventId);
    await expect(call('hindsight', 'stage', put('candidate.json', value))).rejects.toThrow('recurring weak rubric');
  });
  it('activates a bound lesson, checks approval each read, respects retirement', async () => {
    const { root, call, put, value, staged } = await prepare();
    await call('hindsight', 'activate', staged.id, put('approval.json', receipt(value, staged)));
    expect((await call('hindsight', 'query')).items[0].text).toBe(value.text);
    expect((await handleLearning(['hindsight', 'query'], { root, now })).items).toHaveLength(0);
    await call('hindsight', 'retire', staged.id);
    expect((await call('hindsight', 'query')).items).toHaveLength(0);
    await expect(call('hindsight', 'activate', staged.id, 'approval.json')).rejects.toThrow('staged');
    expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false);
  });
  it('refuses arbitrary signer, replay to another project, and bad signature', async () => {
    const { root, call, put, value, staged } = await prepare();
    const approved = receipt(value, staged);
    await expect(handleLearning(['hindsight', 'activate', staged.id, put('approval.json', approved)], { root, now, trustedKeys: {} })).rejects.toThrow('not externally trusted');
    await expect(call('hindsight', 'activate', staged.id, put('approval.json', { ...approved, projectId: 'other' }))).rejects.toThrow('another project');
    await expect(call('hindsight', 'activate', staged.id, put('approval.json', { ...approved, signature: 'A'.repeat(86) + '==' }))).rejects.toThrow('Invalid approval signature');
  });
  it('rejects mutated active candidate and expired approvals', async () => {
    const { root, call, put, value, staged } = await prepare();
    await call('hindsight', 'activate', staged.id, put('approval.json', receipt(value, staged)));
    expect((await handleLearning(['hindsight', 'query'], { root, trustedKeys, now: Date.parse('2026-11-02T12:00:00Z') })).items).toHaveLength(0);
    const path = join(root, '.opchain/learning/state.json'), state = JSON.parse(readFileSync(path));
    state.records[staged.id].candidate.text = 'Changed lesson'; writeFileSync(path, JSON.stringify(state));
    const response = await call('hindsight', 'query');
    expect(response.items).toHaveLength(0); expect(response.rejected[0].reason).toContain('mutated');
  });
  it('checks kill switches at read time even with corrupted stored state', async () => {
    const { root, call } = await prepare();
    await call('config', 'disable');
    writeFileSync(join(root, '.opchain/learning/state.json'), 'broken JSON');
    expect((await call('hindsight', 'query')).items).toEqual([]);
    expect(switches({ enabled: true }, { OPCHAIN_HINDSIGHT_OFF: '1' }).hindsight).toBe(false);
    expect(switches({ enabled: true }, { OPCHAIN_SELF_IMPROVEMENT: 'off' }).evolve).toBe(false);
  });
  it('rejects symlinked runtime state and concurrent writes', async () => {
    const { root, call } = setup();
    symlinkSync(join(root, 'missing-target'), join(root, '.opchain'));
    await expect(call('config', 'enable')).rejects.toThrow('symlink');
    rmSync(join(root, '.opchain'));
    mkdirSync(join(root, '.opchain/learning/.write-lock'), { recursive: true });
    await expect(call('config', 'enable')).rejects.toThrow('locked');
  });
});
describe('task-level rule evaluation and lifecycle', () => {
  it('accepts fresh post-proposal task results with pre-contract baseline', () => {
    const value = candidate('rule'); expect(validateEvaluation(value, evaluation(value), now)).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each([
    ['stale candidate', result => { result.generatedAt = '2026-09-09T12:00:00Z'; }, 'follow proposal'],
    ['routing-only', result => { result.mode = 'routing'; }, 'authentic task'],
    ['synthetic fixture', result => { result.synthetic = true; }, 'authentic task'],
    ['no improvement', result => { result.metrics.target = 0.5; }, 'improvement'],
    ['heldout regression', result => { result.metrics.heldout = 0.7; }, 'regression'],
    ['full regression', result => { result.metrics.full = 0.6; }, 'regression'],
    ['different dataset', result => { result.datasetHash = digest('different'); }, 'datasetHash'],
    ['wrong rule treatment', result => { result.candidateRuleHash = digest('different'); }, 'rule hash'],
    ['changed instructions', result => { result.instructionBundle.rule = 'harmful'; result.instructionsHash = digest(result.instructionBundle); }, 'exactly the candidate'],
    ['fake instruction digest', result => { result.instructionsHash = digest('fake'); }, 'bundle bytes'],
  ])('rejects %s', (_label, change, message) => {
    const value = candidate('rule'), result = evaluation(value); change(result);
    expect(() => validateEvaluation(value, result, now)).toThrow(message);
  });
  it('rejects baseline after freeze and candidate mutation after evaluation', () => {
    const value = candidate('rule'), result = evaluation(value);
    value.contract.baseline.generatedAt = '2026-09-10T00:00:00Z';
    expect(() => validateEvaluation(value, result, now)).toThrow('precede contract');
    const changed = candidate('rule'); changed.text += ' changed';
    expect(() => validateEvaluation(changed, result, now)).toThrow('candidate digest');
  });
  it('adopts, verifies every read, requires periodic revalidation and supports retirement', async () => {
    const { root, call, put, value, staged } = await prepare('rule');
    const result = evaluation(value), evidenceDigest = digest({ history: staged.evidenceDigest, evaluation: digest(result) });
    await call('evolve', 'adopt', staged.id, put('evaluation.json', result), put('approval.json', receipt(value, staged, evidenceDigest, 'adopt-rule')));
    expect((await call('evolve', 'query')).items).toHaveLength(1);
    const later = Date.parse('2026-10-15T12:00:00Z');
    expect((await handleLearning(['evolve', 'query'], { root, trustedKeys, now: later })).rejected[0].reason).toContain('revalidation');
    const fresh = { ...result, runId: 'revalidation-run', generatedAt: '2026-10-14T00:00:00Z' };
    const renewed = { ...receipt(value, staged, digest({ history: staged.evidenceDigest, evaluation: digest(fresh) }), 'revalidate-rule'), approvedAt: '2026-10-14T12:00:00Z' };
    renewed.signature = sign(null, approvalPayload(renewed), privateKey).toString('base64');
    await handleLearning(['evolve', 'revalidate', staged.id, put('new-eval.json', fresh), put('new-approval.json', renewed)], { root, trustedKeys, now: later });
    expect((await handleLearning(['evolve', 'query'], { root, trustedKeys, now: later })).items).toHaveLength(1);
    const path = join(root, '.opchain/learning/state.json'), state = JSON.parse(readFileSync(path));
    state.records[staged.id].evaluation.metrics.target = 0.8; writeFileSync(path, JSON.stringify(state));
    expect((await handleLearning(['evolve', 'query'], { root, trustedKeys, now: later })).items).toHaveLength(0);
    await call('evolve', 'retire', staged.id);
    expect((await call('evolve', 'query')).items).toHaveLength(0);
  });
});
it('uses consumer project metadata', () => {
  const { root, put } = setup(); put('package.json', { name: 'consumer-project' }); expect(projectName(root)).toBe('consumer-project');
});
