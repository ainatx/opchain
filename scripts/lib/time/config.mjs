import { readFileSync } from "node:fs";

export class ConfigError extends Error {
  constructor(message, line = 1) { super(`billing.yaml:${line}: ${message}`); this.exitCode = 2; }
}

// Deliberately small YAML subset: mappings, rule sequences, inline collections,
// quoted/plain scalars. Reject aliases/tags/block scalars instead of guessing.
export function parseBillingYaml(source) {
  const locations = new Map();
  const fail = (message, line) => { throw new ConfigError(message, line); };
  function split(text, delimiter, line) {
    let quote = null, depth = 0, start = 0;
    const parts = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === quote && !(quote === '"' && text[i - 1] === "\\")) {
          if (quote === "'" && text[i + 1] === "'") i++; else quote = null;
        }
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === "#" && (i === 0 || /\s/.test(text[i - 1]))) { text = text.slice(0, i); break; }
      else if (ch === delimiter && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
    }
    if (quote || depth !== 0) fail("unclosed quote or collection", line);
    parts.push(text.slice(start).trim());
    return parts;
  }
  function pair(text, line) {
    const match = text.match(/^([A-Za-z_][\w-]*)\s*:\s*([\s\S]*)$/);
    if (!match || ["__proto__", "constructor", "prototype"].includes(match[1])) fail("expected a mapping key", line);
    return [match[1], match[2]];
  }
  function scalar(text, line, path) {
    text = split(text, "\0", line)[0];
    if (text.startsWith("{")) {
      if (!text.endsWith("}")) fail("invalid inline mapping", line);
      const object = {};
      for (const part of split(text.slice(1, -1), ",", line).filter(Boolean)) {
        const [key, value] = pair(part, line);
        if (Object.hasOwn(object, key)) fail("duplicate key", line);
        locations.set(`${path}.${key}`, line);
        object[key] = scalar(value, line, `${path}.${key}`);
      }
      return object;
    }
    if (text.startsWith("[")) return split(text.slice(1, -1), ",", line).filter(Boolean).map((v, i) => scalar(v, line, `${path}.${i}`));
    if (text.startsWith('"')) { try { return JSON.parse(text); } catch { fail("invalid quoted string", line); } }
    if (text.startsWith("'")) return text.slice(1, -1).replaceAll("''", "'");
    if (/^[&*!|>]/.test(text)) fail("YAML aliases, tags and block scalars are unsupported", line);
    if (text === "null" || text === "~") return null;
    if (text === "true" || text === "false") return text === "true";
    if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
    return text;
  }
  const lines = source.split(/\r?\n/).map((raw, i) => {
    if (/^\s*\t/.test(raw)) fail("tabs are unsupported", i + 1);
    return { indent: raw.length - raw.trimStart().length, text: raw.trim(), line: i + 1 };
  }).filter(l => l.text && !l.text.startsWith("#"));
  let index = 0;
  function block(indent, path) {
    const array = lines[index]?.text.startsWith("- ");
    const result = array ? [] : {};
    while (index < lines.length && lines[index].indent === indent) {
      const row = lines[index++];
      if (array) {
        if (!row.text.startsWith("- ")) fail("mixed sequence and mapping", row.line);
        const item = {}, itemPath = `${path}.${result.length}`;
        const [key, value] = pair(row.text.slice(2), row.line);
        locations.set(`${itemPath}.${key}`, row.line);
        item[key] = scalar(value, row.line, `${itemPath}.${key}`);
        if (lines[index]?.indent > indent) {
          const rest = block(lines[index].indent, itemPath);
          if (Array.isArray(rest) || Object.keys(rest).some(k => Object.hasOwn(item, k))) fail("invalid sequence mapping", row.line);
          Object.assign(item, rest);
        }
        result.push(item);
      } else {
        const [key, rawValue] = pair(row.text, row.line), keyPath = path ? `${path}.${key}` : key;
        if (Object.hasOwn(result, key)) fail("duplicate key", row.line);
        locations.set(keyPath, row.line);
        const value = split(rawValue, "\0", row.line)[0];
        result[key] = value ? scalar(value, row.line, keyPath)
          : lines[index]?.indent > indent ? block(lines[index].indent, keyPath) : null;
      }
      if (lines[index]?.indent > indent) fail("unexpected indentation", lines[index].line);
    }
    return result;
  }
  if (lines[0]?.indent) fail("top level must start at column 1", lines[0].line);
  const value = lines.length ? block(0, "") : {};
  if (Array.isArray(value) || index !== lines.length) fail("expected a top-level mapping", 1);
  return { value, locations };
}

const DEFAULTS = { version: 1, increment_hours: 0.25, rounding: "up", rounding_scope: "client-day",
  min_minutes: 3, idle_minutes: 10, agent_tail_cap_minutes: 30, overlap: "last-touch", timezone: "UTC",
  matters: { ticket: "", rules: [], default: "general", max_per_day: 6 },
  ai_cost: { mode: "pass-through", basis: "api-list", markup_pct: 0 } };

export function parseConfig(source) {
  const { value, locations } = parseBillingYaml(source);
  const warnings = [];
  const error = (path, message) => { throw new ConfigError(`${path}: ${message}`, locations.get(path) || locations.get(path.split(".")[0]) || 1); };
  const mapping = (object, path, keys) => {
    if (!object || typeof object !== "object" || Array.isArray(object)) error(path, "expected mapping");
    for (const key of Object.keys(object)) if (!keys.includes(key)) warnings.push(`billing.yaml:${locations.get(path ? `${path}.${key}` : key) || 1}: unknown key`);
  };
  mapping(value, "", [...Object.keys(DEFAULTS), "client", "rate"]);
  const config = { ...structuredClone(DEFAULTS), ...value };
  for (const [key, keys] of Object.entries({ client: ["id", "name"], rate: ["hourly", "currency"],
    matters: ["ticket", "rules", "default", "max_per_day"], ai_cost: ["mode", "basis", "markup_pct"] })) {
    mapping(config[key], key, keys);
    if (DEFAULTS[key]) config[key] = { ...structuredClone(DEFAULTS[key]), ...config[key] };
  }
  const string = (v, path) => { if (typeof v !== "string" || !v.trim()) error(path, "expected nonempty string"); };
  const number = (v, path, minimum, inclusive = true) => {
    if (typeof v !== "number" || !Number.isFinite(v) || (inclusive ? v < minimum : v <= minimum)) error(path, "invalid number");
  };
  const choice = (v, path, choices) => { if (!choices.includes(v)) error(path, "unsupported value"); };
  choice(config.version, "version", [1]);
  string(config.client.id, "client.id");
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(config.client.id) || config.client.id === "internal") error("client.id", "invalid id");
  string(config.client.name, "client.name");
  number(config.rate.hourly, "rate.hourly", 0);
  if (!/^[A-Z]{3}$/.test(config.rate.currency)) error("rate.currency", "expected three-letter currency");
  number(config.increment_hours, "increment_hours", 0, false);
  number(config.min_minutes, "min_minutes", 0);
  number(config.idle_minutes, "idle_minutes", 0, false);
  if (config.agent_tail_cap_minutes !== null) number(config.agent_tail_cap_minutes, "agent_tail_cap_minutes", 0);
  choice(config.rounding, "rounding", ["up", "nearest"]);
  choice(config.rounding_scope, "rounding_scope", ["client-day", "matter-day"]);
  choice(config.overlap, "overlap", ["last-touch", "split-even"]);
  string(config.timezone, "timezone");
  try { new Intl.DateTimeFormat("en", { timeZone: config.timezone }); } catch { error("timezone", "invalid timezone"); }
  string(config.matters.default, "matters.default");
  number(config.matters.max_per_day, "matters.max_per_day", 1);
  if (!Number.isInteger(config.matters.max_per_day)) error("matters.max_per_day", "expected integer");
  function regex(value, path) {
    if (typeof value !== "string" || value.length > 200) error(path, "regex must be a string of at most 200 characters");
    try { new RegExp(value); } catch { error(path, "invalid regex"); }
  }
  regex(config.matters.ticket, "matters.ticket");
  if (!Array.isArray(config.matters.rules)) error("matters.rules", "expected sequence");
  config.matters.rules.forEach((rule, i) => {
    const path = `matters.rules.${i}`;
    mapping(rule, path, ["branch", "matter", "billable"]);
    regex(rule.branch, `${path}.branch`);
    if (rule.matter !== undefined) string(rule.matter, `${path}.matter`);
    if (rule.billable !== undefined && typeof rule.billable !== "boolean") error(`${path}.billable`, "expected boolean");
  });
  choice(config.ai_cost.mode, "ai_cost.mode", ["none", "pass-through", "markup"]);
  choice(config.ai_cost.basis, "ai_cost.basis", ["api-list"]);
  number(config.ai_cost.markup_pct, "ai_cost.markup_pct", 0);
  return { config, warnings };
}

export function loadConfig(path) { return parseConfig(readFileSync(path, "utf8")); }
