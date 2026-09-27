export function roundMatters(rows, config) {
  const increment = config.increment_hours * 60;
  const round = n => config.rounding === 'nearest' ? Math.round(n) : Math.ceil(n - 1e-10);
  const result = rows.map(r => ({ ...r, hours: 0, rounding_added_minutes: 0, billable: r.billable !== false }));
  const groups = config.rounding_scope === 'matter-day' ? result.map(r => [r]) : [result.filter(r => r.billable)];
  for (const group of groups) {
    const eligible = group.filter(r => r.billable), total = eligible.reduce((n, r) => n + r.raw_minutes, 0);
    if (!total || total < config.min_minutes) { for (const r of eligible) r.billable = false; continue; }
    const units = round(total / increment);
    const shares = eligible.map(r => ({ r, exact: units * r.raw_minutes / total, units: Math.floor(units * r.raw_minutes / total) }));
    let remainder = units - shares.reduce((n, s) => n + s.units, 0);
    shares.sort((a, b) => (b.exact - b.units) - (a.exact - a.units) || a.r.matter.localeCompare(b.r.matter));
    for (const s of shares) {
      if (remainder-- > 0) s.units++;
      s.r.hours = s.units * config.increment_hours;
      s.r.rounding_added_minutes = s.r.hours * 60 - s.r.raw_minutes;
    }
  }
  return result;
}
