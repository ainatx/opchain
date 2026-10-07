export const MACHINE_ENVELOPES = ["task-notification", "scheduled-task", "ci-monitor-event",
  "cross-session-message", "local-command-stdout", "local-command-stderr", "local-command-caveat"];
export const HUMAN_ENVELOPES = ["command-name", "command-message", "bash-input", "create-pr-command"];
// Pasted text is human only with human provenance, exactly like plain text.
export const HUMAN_TEXT_ENVELOPES = ["pasted_content"];
// Producer context prepended to a turn. Stripped before classification; it
// never confers human provenance on its own.
export const CONTEXT_PREFIXES = ["system-reminder", "artifact-view-context"];
const CONTEXT = new RegExp(`^(?:<(${CONTEXT_PREFIXES.join("|")})(?:\\s[^>]*)?>[\\s\\S]*?</\\1>\\s*)+`);
export const ANSWER_TOOLS = new Set(["AskUserQuestion", "ExitPlanMode"]);
export const KNOWN_TYPES = new Set(["user", "assistant", "queue-operation", "attachment", "system", "pr-link",
  "file-history-snapshot", "file-history-delta", "summary", "progress", "last-prompt", "custom-title",
  "agent-name", "agent-color", "agent-setting", "tag", "session-agent", "mode", "custom-summary",
  "saved_hook_context", "bridge_status", "microcompact_boundary", "compact_boundary",
  "atis-latch", "ai-title", "bridge-session", "permission-mode", "cost-state", "frame-link",
  "artifact-comment-monitor", "artifact-autoreact-ledger", "relocated"]);

export function contentText(line) {
  const content = line.message?.content ?? line.content;
  return typeof content === "string" ? content : Array.isArray(content)
    ? content.filter(b => b?.type === "text" && typeof b.text === "string").map(b => b.text).join("\n") : "";
}

export function toolCalls(line) {
  const blocks = line.message?.content;
  if (line.type !== "assistant" || !Array.isArray(blocks)) return [];
  return blocks.filter(b => b?.type === "tool_use" && typeof b.id === "string" && ANSWER_TOOLS.has(b.name))
    .map(b => [b.id, b.name]);
}

export function classify(line, { tools = {}, subagent = false } = {}) {
  if (!KNOWN_TYPES.has(line.type)) return { class: "unknown", envelope: "none" };
  if (line.type !== "user") return { class: line.type === "assistant" ? "assistant" : "metadata", envelope: "none" };
  // Producers prepend reminders to both human turns and machine notifications.
  // Classify the remaining payload; a reminder cannot confer human provenance.
  const text = contentText(line).trim().replace(CONTEXT, '');
  const tag = text.match(/^<([a-z][a-z0-9_-]{0,63})(?:\s|>)/)?.[1];
  const envelope = MACHINE_ENVELOPES.includes(tag) || HUMAN_ENVELOPES.includes(tag) || HUMAN_TEXT_ENVELOPES.includes(tag) || tag === "system-reminder"
    ? tag : tag ? `unknown:${tag}` : text.startsWith("<") ? "unknown" : "none";
  const result = kind => ({ class: subagent && kind.startsWith("human_") ? "machine" : kind, envelope });
  // Newer producers omit `origin` on some turns but still state `turnOrigin`;
  // only a producer silent on both keeps the legacy human default.
  const human = line.origin !== undefined ? line.origin?.kind === "human" : line.turnOrigin === undefined || line.turnOrigin === "human";
  if (line.isMeta || line.isCompactSummary || line.isVisibleInTranscriptOnly) return result("machine");
  if (MACHINE_ENVELOPES.includes(tag) || /^(?:<system-reminder>[\s\S]*?<\/system-reminder>\s*)+$/.test(text)) return result("machine");
  if (HUMAN_ENVELOPES.includes(tag) || text.startsWith("[Request interrupted by user")) return result("human_prompt");
  const blocks = line.message?.content;
  if (Array.isArray(blocks) && blocks.some(b => b?.type === "tool_result")) {
    return result(blocks.some(b => b?.type === "tool_result" && ANSWER_TOOLS.has(tools[b.tool_use_id])) ? "human_answer" : "tool_result");
  }
  if (human && ((text && !text.startsWith("<")) || HUMAN_TEXT_ENVELOPES.includes(tag))) return result("human_prompt");
  // An image-only paste carries no text but is still a human-authored turn.
  if (human && !text && Array.isArray(blocks) && blocks.some(b => b?.type === "image")) return result("human_prompt");
  return result(text.startsWith("<") && !HUMAN_TEXT_ENVELOPES.includes(tag) ? "quarantine" : "machine");
}

export function normalizeUsage(usage = {}) {
  const result = {};
  for (const key of ["input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"]) {
    if (Number.isFinite(usage?.[key]) && usage[key] >= 0) result[key] = usage[key];
  }
  const creation = usage?.cache_creation;
  for (const key of ["ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"]) {
    if (Number.isFinite(creation?.[key]) && creation[key] >= 0) (result.cache_creation ??= {})[key] = creation[key];
  }
  return result;
}

export function maxUsage(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = typeof value === "object" ? maxUsage(a[key] || {}, value) : Math.max(a[key] || 0, value);
  }
  return result;
}
