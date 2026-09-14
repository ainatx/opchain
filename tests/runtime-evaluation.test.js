import { describe, expect, it } from 'vitest';
import { runTaskEvidence } from '../scripts/runtime/evaluation.mjs';
import { digest, validateEvaluation } from '../scripts/runtime/core.mjs';

const dataset = {
  inputs: [{ id: 'target', input: 'target task' }, { id: 'hold', input: 'heldout task' }],
  expected: [{ id: 'target', expect: { mode: 'exact', value: 'ok' } }, { id: 'hold', expect: { mode: 'exact', value: 'ok' } }],
  config: { prompt: 'runtime-bridge', model: 'test-model', grading: { default_mode: 'exact' },
    thresholds: { pass_rate: 1, regression_epsilon: 0 }, cost: { cost_per_eval: null } },
};
const baseTime = Date.parse('2026-09-13T10:00:00Z');
const options = { dataset, adapterIdentity: 'test-only', baseInstructions: 'Complete the task.',
  toolPolicy: { tools: [] }, groups: { target: ['target'], heldout: ['hold'] } };
const adapter = {
  async run({ input }) {
    const request = JSON.parse(input);
    return { output: request.task === 'heldout task' || request.instructions.rule ? 'ok' : 'wrong',
      usage: { input_tokens: 2, output_tokens: 1 } };
  },
};
async function pair() {
  // Explicit fixture marker is false only to test the lifecycle validator. This
  // is local test evidence, never a real provider acceptance run.
  const baseline = await runTaskEvidence({ ...options, adapter, synthetic: false, now: () => baseTime });
  const candidate = { schemaVersion: 1, kind: 'rule', skill: 'oc-build', rubric: 'quality', text: 'Check the result.',
    proposedAt: new Date(baseTime + 2000).toISOString(), expiresAt: new Date(baseTime + 86400000).toISOString(), evidenceEventIds: [],
    contract: { schemaVersion: 1, frozenAt: new Date(baseTime + 1000).toISOString(), minTargetImprovement: 0.1, baseline: baseline.evidence } };
  return { baseline, candidate };
}
describe('task evidence bridge', () => {
  it('executes the existing grader and captures exactly the supplied treatment and results', async () => {
    const { baseline, candidate } = await pair();
    const run = await runTaskEvidence({ ...options, adapter, candidate, synthetic: false, now: () => baseTime + 3000 });
    expect(baseline.evidence.metrics).toEqual({ target: 0, heldout: 1, full: 0.5 });
    expect(run.evidence.metrics).toEqual({ target: 1, heldout: 1, full: 1 });
    expect(run.evidence.outputHash).toBe(digest({ transcript: run.transcript, result: run.result }));
    expect(JSON.parse(run.transcript[0].request.input).instructions.rule).toBe(candidate.text);
    expect(validateEvaluation(candidate, run.evidence, baseTime + 4000)).toBe(digest(run.evidence));
  });
  it('defaults to synthetic evidence and refuses synthetic adoption evidence', async () => {
    expect((await runTaskEvidence({ ...options, adapter })).evidence.synthetic).toBe(true);
    const { candidate } = await pair();
    await expect(runTaskEvidence({ ...options, adapter, candidate, now: () => baseTime + 3000 })).rejects.toThrow('Synthetic');
  });
  it('rejects changed configuration before calling a provider', async () => {
    const { candidate } = await pair(); let calls = 0;
    await expect(runTaskEvidence({ ...options, adapter: { run() { calls++; } }, candidate, synthetic: false,
      toolPolicy: { tools: ['changed'] }, now: () => baseTime + 3000 })).rejects.toThrow('toolPolicyHash changed');
    expect(calls).toBe(0);
  });
  it('refuses missing or overlapping case groups and interrupted providers', async () => {
    await expect(runTaskEvidence({ ...options, adapter, groups: { target: ['target'], heldout: ['target'] } })).rejects.toThrow('partition');
    await expect(runTaskEvidence({ ...options, adapter: { run() { throw new Error('offline'); } } })).rejects.toThrow('offline');
  });
  it('refuses a regression hidden by an unchanged average', async () => {
    const { candidate } = await pair();
    const run = await runTaskEvidence({ ...options, adapter, candidate, synthetic: false, now: () => baseTime + 3000 });
    run.evidence.caseOutcomes.hold = 0;
    expect(() => validateEvaluation(candidate, run.evidence, baseTime + 4000)).toThrow('Task regression');
  });
});
