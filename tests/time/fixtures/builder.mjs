import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

export const CANARY = 'CONFIDENTIAL_PROMPT_CANARY_7a91';
export const stamp = seconds => new Date(Date.UTC(2026, 8, 26, 10, 0, seconds)).toISOString();
export const user = (id, seconds = 0, text = CANARY, extra = {}) => ({ type: 'user', uuid: id, timestamp: stamp(seconds), sessionId: 'session-a', version: '2.1.0', origin: { kind: 'human' }, message: { content: text }, ...extra });
export const assistant = (id, seconds = 1, extra = {}) => ({ type: 'assistant', uuid: id, timestamp: stamp(seconds), sessionId: 'session-a', version: '2.1.0', message: { id: `msg-${id}`, model: 'claude-opus-5', content: [], usage: { input_tokens: 2, output_tokens: 10 } }, ...extra });
export const queue = (id, operation, seconds, text = CANARY) => ({ type: 'queue-operation', operation, queueId: id, sessionId: 'session-a', timestamp: stamp(seconds), version: '2.1.0', content: text });
export function fixture({ git = false } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'opchain-time-'));
  const root = join(home, 'state'), projects = join(home, '.claude', 'projects'), repo = join(home, 'repo');
  mkdirSync(projects, { recursive: true }); mkdirSync(repo);
  const env = { ...process.env, HOME: home, OPCHAIN_TIME_HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const command = (...args) => execFileSync('git', ['-C', repo, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (git) {
    command('init', '-q'); command('config', 'user.name', 'Fixture'); command('config', 'user.email', 'fixture@example.invalid');
    command('-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '-qm', 'fixture');
  }
  function file(name, lines, append = false) {
    const path = join(projects, 'project', name);
    mkdirSync(join(path, '..'), { recursive: true });
    const content = lines.map(line => typeof line === 'string' ? line : JSON.stringify({ cwd: repo, ...line })).join('\n') + '\n';
    (append ? appendFileSync : writeFileSync)(path, content);
    return path;
  }
  return { home, root, repo, projects, env, file, command, cleanup: () => rmSync(home, { recursive: true, force: true }) };
}
