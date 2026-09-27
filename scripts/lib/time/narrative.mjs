export function narrative(matter, activity) {
  const details = [];
  if (activity.commits) details.push(`${activity.commits} commit${activity.commits === 1 ? '' : 's'}`);
  if (activity.prs.length) details.push(`PR ${activity.prs.map(n => `#${n}`).join(', ')}`);
  if (activity.files) details.push(`${activity.files} files touched`);
  if (activity.skills.length) details.push(activity.skills.join(', '));
  return (details.length ? `Work on ${matter}: ${details.join('; ')}.` : `Work on ${matter}.`).replace(/[\r\n\t]/g, ' ').slice(0, 240);
}
