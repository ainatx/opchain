import { execFileSync } from 'node:child_process';

const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], {
  encoding: 'utf8', timeout: 2000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
}).trim();
export function gitActivity(repo, branch, start, end) {
  try {
    const email = git(repo, ['config', 'user.email']);
    if (!email || !branch || branch === 'HEAD' || branch.startsWith('-')) return [];
    const ref = `refs/heads/${branch}`;
    git(repo, ['check-ref-format', ref]);
    const log = git(repo, ['log', ref, `--since=${new Date(start).toISOString()}`, `--until=${new Date(end).toISOString()}`,
      '--format=%H%x09%ae%x09%aI%x09%s', '--']);
    return log.split('\n').filter(Boolean).flatMap(line => {
      const [hash, author, at, ...subject] = line.split('\t');
      if (author !== email || Date.parse(at) < start || Date.parse(at) >= end) return [];
      // Subjects are inspected for PR numbers, never copied into stored narrative.
      const prs = [...subject.join('\t').matchAll(/#(\d+)/g)].map(m => Number(m[1]));
      const files = git(repo, ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', hash, '--']).split('\n').filter(Boolean);
      return [{ hash, at, prs, files }];
    });
  } catch { return []; }
}
export function summarizeActivity(events, commits = []) {
  const unique = [...new Map(commits.map(c => [c.hash, c])).values()];
  return {
    sessions: new Set(events.map(e => e.parent_session || e.session)).size,
    commits: unique.length,
    prs: [...new Set([...events.map(e => e.pr).filter(Number.isSafeInteger), ...unique.flatMap(c => c.prs)])].sort((a, b) => a - b),
    skills: [...new Set(events.map(e => e.skill).filter(s => typeof s === 'string' && /^oc-[a-z0-9-]+$/.test(s)))].sort(),
    files: new Set(unique.flatMap(c => c.files)).size,
  };
}

// Optional metadata enrichment; no transcript content or remote mutation.
export function prMetadata(repo, number, { run = execFileSync } = {}) {
  if (!Number.isSafeInteger(number) || number < 1) return {};
  try {
    const data = JSON.parse(run('gh', ['pr', 'view', String(number), '--json', 'headRefName,title'], {
      cwd: repo, encoding: 'utf8', timeout: 2000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'ignore'],
    }));
    return { branch: typeof data.headRefName === 'string' ? data.headRefName.slice(0, 256) : null,
      title: typeof data.title === 'string' ? data.title.slice(0, 512) : null };
  } catch { return {}; }
}
