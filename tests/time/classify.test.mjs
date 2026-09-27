import { describe, it, expect } from 'vitest';
import { classify, contentText, toolCalls, normalizeUsage, maxUsage, MACHINE_ENVELOPES, HUMAN_ENVELOPES } from '../../scripts/lib/time/classify.mjs';
import { emptyCounts, observe, mergeCounts, checkCanary } from '../../scripts/lib/time/canary.mjs';
import { mergePrompts } from '../../scripts/lib/time/prompts-hook.mjs';
import { user, assistant, stamp } from './fixtures/builder.mjs';

describe('fixture #1: conservative classification', () => {
  it.each(MACHINE_ENVELOPES)('machine envelope %s beats human origin', tag => expect(classify(user('u', 0, `<${tag}>secret</${tag}>`)).class).toBe('machine'));
  it.each(HUMAN_ENVELOPES)('user-initiated %s', tag => expect(classify(user('u', 0, `<${tag}>secret</${tag}>`)).class).toBe('human_prompt'));
  it.each(['isMeta', 'isCompactSummary', 'isVisibleInTranscriptOnly'])('ignores %s', key => expect(classify(user('u', 0, 'hello', { [key]: true })).class).toBe('machine'));
  it('handles plain legacy, interruption, reminder-only and unknown XML', () => {
    expect(classify(user('u', 0, 'hello', { origin: undefined })).class).toBe('human_prompt');
    expect(classify(user('u', 0, '[Request interrupted by user]')).class).toBe('human_prompt');
    expect(classify(user('u', 0, '<system-reminder>a</system-reminder>\n<system-reminder>b</system-reminder>')).class).toBe('machine');
    expect(classify(user('u', 0, '<foo>private</foo>'))).toEqual({ class: 'quarantine', envelope: 'unknown:foo' });
    expect(classify(user('u', 0, '', { origin: { kind: 'agent' } })).class).toBe('machine');
    expect(classify({ type: 'new-private-kind' }).class).toBe('unknown');
    expect(classify({ type: 'attachment' }).class).toBe('metadata');
  });
  it('recognizes only explicit answer tools; never grants a subagent a human event', () => {
    const answer = user('a', 0, '', { message: { content: [{ type: 'tool_result', tool_use_id: 'ask', content: 'secret' }] } });
    expect(classify(answer).class).toBe('tool_result');
    for (const name of ['AskUserQuestion', 'ExitPlanMode']) expect(classify(answer, { tools: { ask: name } }).class).toBe('human_answer');
    expect(classify(answer, { tools: { ask: 'Bash' } }).class).toBe('tool_result');
    expect(classify(answer, { tools: { ask: 'AskUserQuestion' }, subagent: true }).class).toBe('machine');
    expect(classify(user('u'), { subagent: true }).class).toBe('machine');
    expect(toolCalls(assistant('a', 0, { message: { content: [{ type: 'tool_use', name: 'AskUserQuestion', id: 'ask' }, { type: 'tool_use', name: 'Bash', id: 'bash' }] } }))).toEqual([['ask', 'AskUserQuestion']]);
    expect(toolCalls(user('u'))).toEqual([]);
  });
  it('allowlists text and numeric usage, including nested cache maxima', () => {
    expect(contentText({ content: [{ type: 'text', text: 'one' }, { type: 'image' }, { type: 'text', text: 'two' }] })).toBe('one\ntwo');
    expect(contentText({})).toBe('');
    expect(normalizeUsage({ input_tokens: -1, output_tokens: 4, secret: 'no', cache_creation: { ephemeral_5m_input_tokens: 8 } })).toEqual({ output_tokens: 4, cache_creation: { ephemeral_5m_input_tokens: 8 } });
    expect(normalizeUsage()).toEqual({});
    expect(maxUsage({ output_tokens: 5, cache_creation: { ephemeral_5m_input_tokens: 8 } }, { output_tokens: 4, cache_creation: { ephemeral_1h_input_tokens: 9 } })).toEqual({ output_tokens: 5, cache_creation: { ephemeral_5m_input_tokens: 8, ephemeral_1h_input_tokens: 9 } });
  });
});
describe('fixture #12: canary', () => {
  it('fails above 1%, including a bad day hidden by a clean day', () => {
    const counts = emptyCounts();
    for (let i = 0; i < 100; i++) { const row = user(`u${i}`, i, i < 2 ? '<foo>x</foo>' : 'hello'); observe(counts, row, classify(row)); }
    expect(checkCanary(counts)).toMatchObject({ pass: false, share: 0.02 });
    counts.quarantine = 1; counts.days['2026-09-26'].quarantine = 1;
    expect(checkCanary(counts).pass).toBe(true);
    const newDay = emptyCounts(), row = user('bad', 86400, '<foo>x</foo>'); observe(newDay, row, classify(row));
    expect(checkCanary(mergeCounts([counts, newDay])).days['2026-09-27'].pass).toBe(false);
  });
  it('compares numeric versions and counts undated / unknown / malformed', () => {
    const counts = emptyCounts();
    for (const version of ['2.1.0', '2.10.0', '2.2.0', '1.9.9', 'not-a-version']) {
      const row = user('u', 0, 'hello', { version }); observe(counts, row, classify(row));
    }
    observe(counts, { type: 'new-kind' }, { class: 'unknown', envelope: 'none' });
    const result = checkCanary(counts);
    expect(result).toMatchObject({ pass: false, version_min: '1.9.9', version_max: '2.10.0', unknown: 1, missing_timestamp: 1, untested_versions: ['2.2.0', '2.10.0'] });
    expect(checkCanary(emptyCounts())).toMatchObject({ pass: true, share: 0, version_min: null });
    const broken = emptyCounts(); broken.malformed = 1; expect(checkCanary(broken).pass).toBe(false);
  });
});
it('fixture #3: hook merge ±5s is authoritative only within the same session', () => {
  const events = [-6, -5, 0, 5, 6].map(n => ({ ts: stamp(n), session: 's', class: 'human_prompt' }));
  events.push({ ts: stamp(0), session: 'other', class: 'human_prompt' }, { ts: stamp(0), session: 's', class: 'assistant' });
  const hook = { ts: stamp(0), session: 's', class: 'human_prompt' };
  expect(mergePrompts(events, [hook]).duplicates).toBe(3);
  expect(mergePrompts(events, []).events).toEqual(events);
});

// Shapes from the owner replay; all payloads are synthetic.
describe('producer 2.1.281 replay regressions', () => {
  it.each(['atis-latch', 'ai-title', 'bridge-session', 'permission-mode', 'cost-state',
    'frame-link', 'artifact-comment-monitor', 'artifact-autoreact-ledger'])('treats %s as metadata', type => {
    const row = { type, sessionId: 'synthetic', version: '2.1.281', title: 'PRIVATE_FIXTURE' };
    expect(classify(row).class).toBe('metadata');
    const counts = emptyCounts(); observe(counts, row, classify(row));
    expect(checkCanary(counts)).toMatchObject({ pass: true, unknown: 0 });
  });
  it('unwraps reminder prefixes without turning machine or unknown payloads into human turns', () => {
    const prefix = '<system-reminder>fixture</system-reminder>\n<system-reminder>fixture</system-reminder>\n';
    for (const [body, kind] of [['hello', 'human_prompt'], ['<ci-monitor-event>fixture</ci-monitor-event>', 'machine'],
      ['<bash-input>fixture</bash-input>', 'human_prompt'], ['<role>fixture</role>', 'quarantine'], ['', 'machine']]) {
      expect(classify(user('u', 0, prefix + body, { version: '2.1.281' })).class).toBe(kind);
      expect(classify(user('u', 0, prefix + body), { subagent: true }).class).toBe(kind.startsWith('human') ? 'machine' : kind);
    }
    expect(classify(user('u', 0, prefix + 'hello', { isMeta: true })).class).toBe('machine');
    expect(classify(user('u', 0, '<system-reminder>unclosed')).class).toBe('quarantine');
    expect(classify(user('u', 0, prefix + 'hello', { origin: { kind: 'agent' } })).class).toBe('machine');
  });
});
