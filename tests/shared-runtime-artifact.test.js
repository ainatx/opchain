import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { buildUpdateBundle } from '../scripts/build-update-bundle.mjs';
import { installBundle, validateBundle } from '../scripts/update-opchain.mjs';
const roots=[];
afterEach(()=>roots.splice(0).forEach(root=>rmSync(root,{recursive:true,force:true})));
async function fixture() {
  const base=mkdtempSync(join(tmpdir(),'opchain-runtime-artifact-')); roots.push(base);
  const pub=join(base,'public'),root=join(base,'consumer');mkdirSync(root);
  writeFileSync(join(root,'package.json'),JSON.stringify({name:'consumer-project'}));
  const release=buildUpdateBundle({publicDir:pub});
  const bundle=JSON.parse(readFileSync(join(pub,'opchain-update',release.sha256+'.json')));
  await installBundle(bundle,{root,target:'codex'});
  const cli=join(root,'.agents/skills/oc-hindsight/scripts/opchain.mjs');
  const run=(args,env={})=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',env:{...process.env,OPCHAIN_ROOT:root,OPCHAIN_PROJECT:'',OPCHAIN_TRUSTED_KEYS:'',...env}});
  return {root,bundle,run};
}
describe('shared runtime consumer package',()=>{
  it('runs every local foundation command from installed files only',async()=>{
    const {root,bundle,run}=await fixture();
    expect(bundle.skills).toHaveLength(36);
    const cap=run(['capabilities']);expect(cap.status,cap.stderr).toBe(0);
    expect(JSON.parse(cap.stdout).runtimeContract).toBe('2.0-preview.2');
    expect(run(['learning','status']).status).toBe(0);
    expect(run(['context']).status).toBe(0);
    expect(existsSync(join(root,'.opchain'))).toBe(false);
    expect(run(['checkpoint','update','oc-app-architect']).status).toBe(0);
    const cp=JSON.parse(readFileSync(join(root,'.checkpoints/oc-app-architect.checkpoint.json')));
    expect(cp.project).toBe('consumer-project');
    expect(run(['telemetry','status']).stdout).toContain('OFF');
    expect(run(['learning','config','enable']).status).toBe(0);
    expect(JSON.parse(run(['learning','status']).stdout).project).toBe('consumer-project');
    expect(existsSync(join(root,'CLAUDE.md'))).toBe(false);
  });
  it('records task evidence from an installed package without authoring dependencies', async () => {
    const { root, run } = await fixture();
    const dataset = join(root, 'dataset'); mkdirSync(dataset);
    writeFileSync(join(dataset, 'inputs.jsonl'), '{"id":"a","input":"first"}\n{"id":"b","input":"second"}\n');
    writeFileSync(join(dataset, 'expected.jsonl'), '{"id":"a","expect":{"mode":"exact","value":"ok"}}\n{"id":"b","expect":{"mode":"exact","value":"ok"}}\n');
    writeFileSync(join(dataset, 'eval.yaml'), 'prompt: package-test\nmodel: fixture-model\ngrading:\n  default_mode: exact\nthresholds:\n  pass_rate: 1\n  regression_epsilon: 0\ncost:\n  cost_per_eval: null\n');
    writeFileSync(join(root, 'instructions.txt'), 'Answer the task.');
    writeFileSync(join(root, 'policy.json'), '{"tools":[]}');
    writeFileSync(join(root, 'groups.json'), '{"target":["a"],"heldout":["b"]}');
    const preload = join(root, 'fixture-transport.mjs');
    writeFileSync(preload, `globalThis.fetch = async () => new Response(JSON.stringify({output:'ok', usage:{input_tokens:1,output_tokens:1}}));`);
    const result = run(['evaluation','run','--dataset','dataset','--instructions','instructions.txt',
      '--policy','policy.json','--groups','groups.json','--endpoint','https://fixture.invalid',
      '--out','run.json'], {NODE_OPTIONS: '--import=' + preload, OPCHAIN_EVAL_API_KEY:'fixture'});
    expect(result.status, result.stderr).toBe(0);
    const saved = JSON.parse(readFileSync(join(root, 'run.json')));
    expect(saved.evidence).toMatchObject({synthetic:true,metrics:{target:1,heldout:1,full:1}});
    expect(saved.transcript).toHaveLength(2);
  });
  it('rejects incomplete runtime closure before installation',async()=>{
    const {bundle}=await fixture();
    const broken={...bundle,files:bundle.files.filter(f=>f.path!=='oc-hindsight/scripts/runtime/scripts/runtime/core.mjs')};
    expect(()=>validateBundle(broken)).toThrow('Missing runtime dependency');
  });
  it('rejects an in-repo caller trust policy',async()=>{
    const {root,run}=await fixture();const trust=join(root,'trust.json');writeFileSync(trust,'{}');
    const result=run(['learning','status'],{OPCHAIN_TRUSTED_KEYS:trust});
    expect(result.status).toBe(1);expect(result.stderr).toContain('outside the consuming repository');
  });
});
