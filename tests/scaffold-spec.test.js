import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  FALLBACK_DOCUMENTS, STUB_MARKER, isStub, parseSpecTable, parseTemplateSections, scaffoldSpec, specDocuments, stubFiles,
} from '../scripts/scaffold-spec.mjs';

const repo = resolve(import.meta.dirname, '..');
const EXPECTED = [
  '00-project-overview.md', '01-tech-stack.md', '02-architecture.md', '03-security-auth.md', '04-integrations.md',
  '05-monetization.md', '06-testing.md', '07-devops.md', '08-analytics.md', '09-documentation-plan.md', '10-cost-estimate.md',
];

let temp;
beforeAll(() => { temp = mkdtempSync(join(tmpdir(), 'oc-scaffold-spec-')); });
afterAll(() => rmSync(temp, { recursive: true, force: true }));

describe('source parsing', () => {
  it('reads the Spec Documents table from oc-app-architect/SKILL.md and the headings from spec-template.md', () => {
    const rows = parseSpecTable(readFileSync(join(repo, 'skills/oc-app-architect/SKILL.md'), 'utf8'));
    expect(rows.map(r => r.file)).toEqual([...EXPECTED, '11-ai-architecture.md']);
    expect(rows.find(r => r.file === '06-testing.md').producedBy).toBe('/oc-qa pyramid');
    expect(rows.find(r => r.file === '00-project-overview.md').producedBy).toBe('/oc-discover');
    expect(rows.find(r => r.file === '01-tech-stack.md').producedBy).toBe('oc-stack-forge');
    expect(rows.find(r => r.file === '11-ai-architecture.md')).toMatchObject({ aiOnly: true, producedBy: 'oc-claude-api' });
    expect(rows.filter(r => r.aiOnly).map(r => r.file)).toEqual(['11-ai-architecture.md']);

    const sections = parseTemplateSections(readFileSync(join(repo, 'skills/oc-app-architect/references/spec-template.md'), 'utf8'));
    expect(sections['06']).toEqual(['Coverage Targets', 'Critical Flows to E2E Test', 'Test Data Strategy', 'Performance Budget', 'Accessibility Testing']);
    expect(sections['03']).toContain('OWASP Top 10 (This Project)');
    expect(sections['10']).toEqual([]); // the template has no fenced example for 10 — fallback headings apply
  });

  it('keeps the hard-coded fallback in lockstep with the SKILL.md table', () => {
    const rows = parseSpecTable(readFileSync(join(repo, 'skills/oc-app-architect/SKILL.md'), 'utf8'));
    expect(rows.map(r => [r.file, r.producedBy])).toEqual(FALLBACK_DOCUMENTS.map(d => [d.file, d.producedBy]));
    const docs = specDocuments({ root: temp, skillMd: '# no table here', template: null });
    expect(docs.map(d => d.file)).toEqual(FALLBACK_DOCUMENTS.map(d => d.file));
    expect(docs.find(d => d.file === '10-cost-estimate.md').sections).toContain('Total Monthly Estimate');
  });
});

describe('scaffoldSpec', () => {
  it('writes the eleven 00–10 stubs with a producer marker on line one and the template headings', () => {
    const root = join(temp, 'fresh');
    const result = scaffoldSpec({ root });
    expect(result.written).toEqual(EXPECTED.map(f => `spec/${f}`));
    expect(result.skipped).toEqual([]);
    expect(readdirSync(join(root, 'spec')).sort()).toEqual(EXPECTED);
    const testing = readFileSync(join(root, 'spec/06-testing.md'), 'utf8');
    expect(testing.split('\n')[0]).toBe('<!-- opchain:stub produced-by=/oc-qa pyramid; this line is removed by that skill when it writes the file -->');
    expect(testing).toContain('# Testing Strategy');
    expect(testing).toContain('## Coverage Targets');
    expect(testing).toContain('## Accessibility Testing');
    expect(isStub(testing)).toBe(true);
    expect(STUB_MARKER.exec(testing.split('\n')[0])[1]).toBe('/oc-qa pyramid');
    expect(existsSync(join(root, 'spec/11-ai-architecture.md'))).toBe(false);
  });

  it('adds 11-ai-architecture.md only with --ai', () => {
    const root = join(temp, 'ai');
    const result = scaffoldSpec({ root, ai: true });
    expect(result.written).toHaveLength(12);
    expect(readFileSync(join(root, 'spec/11-ai-architecture.md'), 'utf8').split('\n')[0]).toContain('produced-by=oc-claude-api;');
  });

  it('refuses to overwrite a real file without --force, refreshes stubs, and stubFiles() lists only stubs', () => {
    const root = join(temp, 'partial');
    scaffoldSpec({ root });
    const real = '# Architecture Design\n\nReal content written by /oc-spec.\n';
    writeFileSync(join(root, 'spec/02-architecture.md'), real);
    writeFileSync(join(root, 'spec/06-testing.md'), 'hand-edited stub without the marker\n');

    const second = scaffoldSpec({ root });
    expect(second.written).toEqual([]);
    expect(second.skipped).toEqual(['spec/02-architecture.md', 'spec/06-testing.md']);
    expect(second.refreshed).toHaveLength(EXPECTED.length - 2);
    expect(readFileSync(join(root, 'spec/02-architecture.md'), 'utf8')).toBe(real);

    const stubs = stubFiles(root);
    expect(stubs).toHaveLength(EXPECTED.length - 2);
    expect(stubs.map(s => s.path)).not.toContain('spec/02-architecture.md');
    expect(stubs.find(s => s.path === 'spec/00-project-overview.md').producedBy).toBe('/oc-discover');
    expect(stubFiles(join(temp, 'nowhere'))).toEqual([]);

    const forced = scaffoldSpec({ root, force: true });
    expect(forced.refreshed).toContain('spec/02-architecture.md');
    expect(isStub(readFileSync(join(root, 'spec/02-architecture.md'), 'utf8'))).toBe(true);
    expect(stubFiles(root)).toHaveLength(EXPECTED.length);
  });

  it('runs from the CLI and prints what it wrote', () => {
    const root = join(temp, 'cli');
    const first = spawnSync(process.execPath, [join(repo, 'scripts/scaffold-spec.mjs'), '--root', root], { encoding: 'utf8' });
    expect(first.status, first.stderr).toBe(0);
    expect(first.stdout.match(/^wrote {5}spec\//gm)).toHaveLength(EXPECTED.length);
    expect(first.stdout).toContain(`${EXPECTED.length} stub(s) still waiting for their producing skill`);
    writeFileSync(join(root, 'spec/06-testing.md'), '# Testing Strategy\n\nreal\n');
    const second = spawnSync(process.execPath, [join(repo, 'scripts/scaffold-spec.mjs'), `--root=${root}`], { encoding: 'utf8' });
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('kept      spec/06-testing.md (not a stub; pass --force to overwrite)');
    expect(readFileSync(join(root, 'spec/06-testing.md'), 'utf8')).toContain('real');
    const bad = spawnSync(process.execPath, [join(repo, 'scripts/scaffold-spec.mjs'), '--bogus'], { encoding: 'utf8' });
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('Unknown option: --bogus');
  });
});
