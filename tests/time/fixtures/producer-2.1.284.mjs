// Synthetic 2.1.284 producer shapes from a metadata-only review (key sets, tag
// skeletons and lengths). No real prompt, transcript text or path is copied here.
import { user, CANARY } from './builder.mjs';

const V = '2.1.284';
const at = (id, seconds, text, extra = {}) => user(id, seconds, text, { version: V, turnOrigin: 'human', promptSource: 'sdk', ...extra });
const reminder = '<system-reminder>fixture</system-reminder>\n';
const view = `<artifact-view-context artifact="fixture">${CANARY}</artifact-view-context>\n`;

// [row, expected class] pairs; each id doubles as the event uuid.
export const PRODUCER_2_1_284 = [
  [at('view-prompt', 0, `${view}${CANARY}`), 'human_prompt'],
  [at('view-reminder-prompt', 1, '', { message: { content: [{ type: 'text', text: reminder }, { type: 'text', text: `${view}${CANARY}` }] } }), 'human_prompt'],
  [at('view-only', 2, view), 'machine'],
  [at('view-peer', 3, `${view}${CANARY}`, { origin: { kind: 'peer' }, turnOrigin: 'peer' }), 'machine'],
  [at('view-machine', 4, `${view}<task-notification>${CANARY}</task-notification>`), 'machine'],
  [at('paste', 5, '', { message: { content: [{ type: 'text', text: reminder }, { type: 'text', text: `\n<pasted_content id="fixture">${CANARY}</pasted_content>\n` }] } }), 'human_prompt'],
  [at('paste-coordinator', 6, `<pasted_content id="fixture">${CANARY}</pasted_content>`, { origin: { kind: 'coordinator' }, turnOrigin: undefined }), 'machine'],
  [at('caveat', 7, `<local-command-caveat>${CANARY}</local-command-caveat>`, { isMeta: true, origin: undefined, turnOrigin: undefined, promptSource: undefined }), 'machine'],
  [at('caveat-no-meta', 8, `<local-command-caveat>${CANARY}</local-command-caveat>`), 'machine'],
  [at('image-only', 9, '', { imagePasteIds: [0], message: { content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } }] } }), 'human_prompt'],
  [at('image-agent', 10, '', { origin: { kind: 'agent' }, message: { content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } }] } }), 'machine'],
  [at('sdk-turn', 11, CANARY, { origin: undefined, turnOrigin: 'sdk' }), 'machine'],
  [at('system-turn', 12, CANARY, { origin: undefined, turnOrigin: 'system', promptSource: 'system' }), 'machine'],
  [at('human-turn-no-origin', 13, CANARY, { origin: undefined }), 'human_prompt'],
  [at('classifier-result', 14, '', { origin: undefined, turnOrigin: undefined, classifierBoundary: true, message: { content: [{ type: 'tool_result', tool_use_id: 'bash-1', content: CANARY }] } }), 'tool_result'],
  [at('server-classifier', 15, '', { origin: undefined, turnOrigin: undefined, serverClassifierContext: { context: CANARY, request: CANARY }, message: { content: [{ type: 'tool_result', tool_use_id: 'bash-2', content: CANARY }] } }), 'tool_result'],
  [at('queue-transcript-only', 16, `<task-notification>${CANARY}</task-notification>`, { origin: { kind: 'task-notification' }, turnOrigin: undefined, queueTranscriptOnly: true }), 'machine'],
];

// Untimestamped session-relocation marker (no version field on the producer).
export const RELOCATED = { type: 'relocated', sessionId: 'session-a', relocatedCwd: `/private/${CANARY}` };
