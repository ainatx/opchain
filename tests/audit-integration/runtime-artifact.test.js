import { it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { packageRuntime } from '../../scripts/package-runtime.mjs';
import { inspectPackage } from '../../scripts/capabilities.mjs';

it('loads packaged runtime dependencies outside the authoring tree and verifies its inventory', { timeout: 30_000 }, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'opchain-artifact-'));
  const out = path.join(temp, 'runtime');
  try {
    const manifest = packageRuntime(out);
    expect(manifest.unreleased).toBe(true);
    expect(inspectPackage(out, 'runtime').errors).toEqual([]);
    for (const file of manifest.files) {
      const bytes = fs.readFileSync(path.join(out, file.path));
      expect(bytes.length, file.path).toBe(file.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), file.path).toBe(file.sha256);
    }
    const imports = ['./scripts/lib/prompt-eval/schema.mjs', './scripts/lib/prompt-eval/io.mjs', './scripts/lib/cost/gate.mjs', './src/lib/mcp/server.js', './src/lib/mcp/local-checkpoint-store.js', './scripts/lib/release-evidence.mjs', './scripts/lib/execution-kits/role-runner.mjs', './scripts/lib/execution-kits/sql-expression-validator.mjs', './scripts/lib/telemetry-aggregate.mjs', './scripts/lib/pm-mcp-checks.mjs'];
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `for (const entry of ${JSON.stringify(imports)}) await import(entry); console.log('artifact-load-ok')`], {
      cwd: out, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: temp, NODE_PATH: '' },
    });
    expect(child.status, child.stderr).toBe(0);
    expect(child.stdout.trim()).toBe('artifact-load-ok');
    const telemetry = spawnSync(process.execPath, ['scripts/telemetry.mjs', 'status'], {
      cwd: out, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: temp, NODE_PATH: '' },
    });
    expect(telemetry.status, telemetry.stderr).toBe(0);
    expect(fs.existsSync(path.join(out, '.checkpoints/usage.sqlite'))).toBe(false);
    expect(() => packageRuntime(out)).toThrow();
    expect(fs.existsSync(path.join(out, 'runtime-manifest.json'))).toBe(true);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
