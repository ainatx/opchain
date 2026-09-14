import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectPackage } from '../../scripts/capabilities.mjs';

describe('artifact capability diagnostics', () => {
  it('does not promote copied instructions into executable hooks', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opchain-skills-'));
    try {
      fs.mkdirSync(path.join(dir, 'oc-example'));
      fs.writeFileSync(path.join(dir, 'oc-example/SKILL.md'), 'Run a commit gate');
      const result = inspectPackage(dir, 'skills');
      expect(result.errors).toEqual([]);
      expect(result.skills).toEqual(['oc-example']);
      expect(result.hooks).toEqual([]);
      expect(result.runtime_files).toEqual({});
      expect(result.assurance).toContain('unverified');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  it('rejects broken or escaping registered hook targets', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opchain-plugin-'));
    try {
      fs.mkdirSync(path.join(dir, 'hooks'));
      fs.mkdirSync(path.join(dir, 'skills/oc-example'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'skills/oc-example/SKILL.md'), 'Instructions');
      fs.writeFileSync(path.join(dir, 'hooks/hooks.json'), JSON.stringify({ hooks: {
        SessionStart: [{ hooks: [{ command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/missing.cjs"' }] }],
        Stop: [{ hooks: [{ command: 'node "${CLAUDE_PLUGIN_ROOT}/../outside.cjs"' }] }],
      } }));
      expect(inspectPackage(dir, 'claude-plugin').errors).toHaveLength(2);
      fs.writeFileSync(path.join(dir, 'hooks/hooks.json'), '{}');
      expect(inspectPackage(dir, 'claude-plugin').errors).toEqual(['hook manifest declares no hooks']);
      fs.writeFileSync(path.join(dir, 'hooks/exists.cjs'), '');
      fs.writeFileSync(path.join(dir, 'hooks/hooks.json'), JSON.stringify({ hooks: {
        SessionStart: [{ hooks: [{ type: 'prompt', command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/exists.cjs"' }] }],
      } }));
      expect(inspectPackage(dir, 'claude-plugin').hooks[0].present).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
