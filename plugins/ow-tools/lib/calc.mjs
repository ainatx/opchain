// `ow-tools calc` (design §5.4): dates and arithmetic the ow- skills would
// otherwise have to mark "NOT machine-checked". Exact integer arithmetic in
// minor units; dates as calendar days with no time zone drift.
import { readFileSync } from "node:fs";
import { localDate, nowDate, timeZone, usage } from "./core.mjs";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(s, what = "date") {
  const m = ISO.exec(String(s || ""));
  if (!m) throw usage(`${what} must be YYYY-MM-DD, got: ${s}`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw usage(`${what} is not a real date: ${s}`);
  return d;
}
const fmt = (d) => d.toISOString().slice(0, 10);
const addUTC = (d, n) => new Date(d.getTime() + n * 86400000);
const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

export function today({ tz } = {}) {
  const now = nowDate();
  const zone = tz || timeZone();
  let date;
  try {
    date = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    throw usage(`unknown time zone: ${zone}`);
  }
  return { date: tz ? date : localDate(now), tz: zone, clock: "tool" };
}

// N calendar days, or N business days (Mon-Fri minus the given holidays).
// The start date itself is never counted; N may be negative.
export function addDate({ from, days, businessDays, holidays = [] }) {
  const start = parseDate(from, "--from");
  const hol = new Set(holidays.map((h) => fmt(parseDate(h, "holiday"))));
  if ((days === undefined) === (businessDays === undefined)) throw usage("give exactly one of --days N or --business-days N");
  const n = days ?? businessDays;
  if (!Number.isInteger(n) || Math.abs(n) > 3650) throw usage("the count must be a whole number of at most 3650");
  if (days !== undefined) return { date: fmt(addUTC(start, n)), from: fmt(start), days: n, skipped: [] };
  const step = n < 0 ? -1 : 1;
  const skipped = [];
  let d = start;
  let left = Math.abs(n);
  while (left > 0) {
    d = addUTC(d, step);
    if (isWeekend(d)) continue;
    if (hol.has(fmt(d))) {
      skipped.push(fmt(d));
      continue;
    }
    left--;
  }
  return { date: fmt(d), from: fmt(start), business_days: n, calendar: "Mon-Fri", holidays_skipped: skipped };
}

// Decimal strings → integer minor units, without floating point.
export function toMinor(value, what = "amount") {
  const s = String(value).trim();
  const m = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) throw usage(`${what} must be a number with at most 2 decimals, got: ${value}`);
  const minor = BigInt(m[2]) * 100n + BigInt((m[3] || "0").padEnd(2, "0"));
  return m[1] ? -minor : minor;
}
export function fromMinor(minor) {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  return `${neg ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

// items: [{ label, quantity?, unit_price } | { label, amount }], one currency.
export function total({ items, currency }) {
  if (!Array.isArray(items) || items.length === 0) throw usage("items must be a non-empty JSON array");
  const currencies = new Set(items.map((i) => i.currency || currency).filter(Boolean));
  if (currencies.size > 1) throw usage(`one currency per total, got: ${[...currencies].join(", ")}`);
  let sum = 0n;
  const lines = items.map((it, i) => {
    const label = String(it.label ?? `item ${i + 1}`);
    let amount;
    if (it.amount !== undefined) {
      amount = toMinor(it.amount, `${label} amount`);
    } else {
      const q = it.quantity ?? 1;
      if (!(Number.isInteger(q) && q >= 0)) throw usage(`${label}: quantity must be a whole number`);
      amount = toMinor(it.unit_price, `${label} unit_price`) * BigInt(q);
    }
    sum += amount;
    return { label, amount: fromMinor(amount) };
  });
  return { currency: [...currencies][0] || null, lines, total: fromMinor(sum) };
}

// "40/40/20" of a total: floor each share in minor units, remainder to the last.
export function split({ total: t, schedule }) {
  const parts = String(schedule || "").split("/").map((p) => p.trim());
  if (parts.length < 2 || parts.some((p) => !/^\d+$/.test(p))) throw usage("--schedule looks like 40/40/20 or 50/50");
  const pct = parts.map(Number);
  if (pct.reduce((a, b) => a + b, 0) !== 100) throw usage("the schedule must add up to 100");
  const whole = toMinor(t, "--total");
  const shares = pct.map((p) => (whole * BigInt(p)) / 100n);
  const used = shares.reduce((a, b) => a + b, 0n);
  shares[shares.length - 1] += whole - used;
  return { total: fromMinor(whole), schedule: pct.join("/"), amounts: shares.map(fromMinor) };
}

export function calc(sub, opts) {
  switch (sub) {
    case "today":
      return today(opts);
    case "date":
      return addDate(opts);
    case "total": {
      if (!opts.items) throw usage("usage: ow-tools calc total --items <file.json> [--currency USD]");
      let items;
      try {
        items = JSON.parse(readFileSync(opts.items, "utf8"));
      } catch {
        throw usage(`could not read JSON items from ${opts.items}`);
      }
      return total({ items, currency: opts.currency });
    }
    case "split":
      return split(opts);
    default:
      throw usage("usage: ow-tools calc today | date | total | split (see ow-tools help)");
  }
}
