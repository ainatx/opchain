// Synthetic 2.1.286 producer shapes from a metadata-only review (key sets, enum
// values, tag skeletons and lengths). No real prompt, transcript text or path is copied here.
import { user, stamp, CANARY } from './builder.mjs';

const V = '2.1.286';
const at = (id, seconds, text, extra = {}) => user(id, seconds, text, { version: V, turnOrigin: 'human', promptSource: 'sdk', ...extra });
const position = { turnPosition: { promptIndex: 0, turnIndex: 0 } };
const reminder = '<system-reminder>fixture</system-reminder>\n';
const attachment = (id, seconds, type, extra = {}) => ({ type: 'attachment', uuid: id, timestamp: stamp(seconds), sessionId: 'session-a', version: V,
  attachment: { type, content: CANARY }, rendered: [{ type: 'text', text: CANARY }], ...extra });

// [row, expected class] pairs; each id doubles as the event uuid.
export const PRODUCER_2_1_286 = [
  [attachment('rendered-system', 0, 'total_tokens_reminder', { renderedRole: 'system' }), 'metadata'],
  [attachment('rendered-user', 1, 'session_context', { renderedRole: 'user' }), 'metadata'],
  [attachment('rendered-queued', 2, 'queued_command', { renderedRole: 'system', renderedInHumanTurn: { promptIndex: 0 } }), 'metadata'],
  [at('positioned-prompt', 3, CANARY, position), 'human_prompt'],
  [at('positioned-reminder-prompt', 4, `${reminder}${CANARY}`, position), 'human_prompt'],
  [at('positioned-command', 5, `<command-message>${CANARY}</command-message>`, position), 'human_prompt'],
  [at('positioned-notification', 6, `<task-notification>${CANARY}</task-notification>`, { ...position, origin: { kind: 'task-notification' }, turnOrigin: 'task_notification' }), 'machine'],
  [at('positioned-image', 7, '', { ...position, imagePasteIds: [0], message: { content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } }, { type: 'text', text: CANARY }] } }), 'human_prompt'],
  [at('turn-companion', 8, CANARY, { isMeta: true, turnCompanion: true, origin: undefined, turnOrigin: undefined, promptSource: undefined }), 'machine'],
  [at('coordinator', 9, CANARY, { origin: { kind: 'coordinator' }, turnOrigin: undefined }), 'machine'],
  [at('tool-denial', 10, '', { origin: undefined, turnOrigin: undefined, toolDenialKind: 'permission-rule', toolUseResult: CANARY, message: { content: [{ type: 'tool_result', tool_use_id: 'bash-1', content: CANARY, is_error: true }] } }), 'tool_result'],
];
