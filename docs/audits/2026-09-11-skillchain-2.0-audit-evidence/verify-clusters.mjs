// Deterministic verification of the big clusters the finder agents reported.
import { dirname as __dn, resolve as __rs } from 'node:path';
import { fileURLToPath as __fp } from 'node:url';
// Repo root, resolved from this file: docs/audits/<evidence dir>/ -> three levels up.
const __ROOT = __rs(__dn(__fp(import.meta.url)), '../../..');
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { matter } from '../../../scripts/lib/frontmatter.mjs';

const ROOT = __ROOT;
const SK = join(ROOT, 'skills');
const ids = readdirSync(SK).filter((d) => existsSync(join(SK, d, 'SKILL.md'))).sort();
const fm = {}, body = {};
for (const id of ids) {
  const raw = readFileSync(join(SK, id, 'SKILL.md'), 'utf8');
  fm[id] = matter(raw).data;
  body[id] = raw;
}

// Map every declared verb -> owning skill. Track full verbs and root verbs.
const fullVerbs = new Map();   // "/oc-harden verify" -> skill
const rootVerbs = new Map();   // "/oc-harden" -> skill
for (const id of ids) {
  for (const c of fm[id].commands || []) {
    const v = String(c).trim();
    fullVerbs.set(v, id);
    rootVerbs.set(v.split(/\s+/)[0], id);
  }
}

console.log('=== CLUSTER 1: cross-skill handoff verbs that the TARGET skill does not declare ===');
console.log('(a verb written in skill A that belongs to skill B\'s namespace, but is not in B\'s frontmatter commands)\n');
const bad = new Map();
for (const id of ids) {
  const lines = body[id].split('\n');
  lines.forEach((line, i) => {
    // find slash verbs with an optional subcommand
    for (const m of line.matchAll(/`(\/oc-[a-z-]+(?:\s+[a-z-]+)?)`/g)) {
      const verb = m[1].replace(/\s+/g, ' ').trim();
      const root = verb.split(' ')[0];
      const owner = rootVerbs.get(root);
      if (!owner) continue;              // unknown namespace entirely — cluster 2
      if (owner === id) continue;        // own verb
      if (fullVerbs.has(verb)) continue; // declared exactly
      // a bare root verb is fine if the root is declared
      if (!verb.includes(' ')) continue;
      const key = `${verb}|${owner}`;
      if (!bad.has(key)) bad.set(key, []);
      bad.get(key).push(`${id}/SKILL.md:${i + 1}`);
    }
  });
}
for (const [key, where] of [...bad].sort()) {
  const [verb, owner] = key.split('|');
  console.log(`  ${verb.padEnd(28)} not declared by ${owner.padEnd(24)} cited in ${where.slice(0, 3).join(', ')}${where.length > 3 ? ` (+${where.length - 3})` : ''}`);
}

console.log('\n=== CLUSTER 2: slash verbs in skill text whose namespace no skill declares ===');
const unknown = new Map();
for (const id of ids) {
  body[id].split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/`(\/[a-z][a-z0-9-]*)/g)) {
      const root = m[1];
      if (rootVerbs.has(root)) continue;
      if (root === '/checkpoint') { /* known protocol verb */ }
      if (!unknown.has(root)) unknown.set(root, []);
      unknown.get(root).push(`${id}:${i + 1}`);
    }
  });
}
for (const [root, where] of [...unknown].sort((a, b) => b[1].length - a[1].length)) {
  if (where.length < 1) continue;
  console.log(`  ${root.padEnd(22)} ${String(where.length).padStart(3)}× e.g. ${where.slice(0, 3).join(', ')}`);
}

console.log('\n=== CLUSTER 3: "oc-deploy-ops gates prod on my suite" claims vs oc-deploy-ops text ===');
const deployText = body['oc-deploy-ops'];
for (const id of ids) {
  if (id === 'oc-deploy-ops') continue;
  body[id].split('\n').forEach((line, i) => {
    if (/oc-deploy-ops/.test(line) && /gate|gates|blocks|enforces|deploy gate/i.test(line)) {
      const mentioned = new RegExp(id.replace(/[-]/g, '[-]')).test(deployText);
      console.log(`  ${id}:${i + 1}  claims a deploy gate | oc-deploy-ops mentions "${id}": ${mentioned ? 'YES' : 'NO'}`);
    }
  });
}

console.log('\n=== CLUSTER 4: README skill-table row counts ===');
for (const f of ['README.md', 'skills/README.md', 'mirror/README.md', 'plugins/opchain/README.md']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) { console.log(`  ${f}: (absent)`); continue; }
  const t = readFileSync(p, 'utf8');
  const rows = (t.match(/^\| *oc-[a-z-]+/gm) || []).length;
  console.log(`  ${f.padEnd(28)} table rows naming a skill: ${rows}   (catalog has ${ids.length})`);
}

console.log('\n=== CLUSTER 5: MCP intent routing coverage vs orchestrator §4 ===');
const rp = join(ROOT, 'src/lib/mcp/routing.js');
if (existsSync(rp)) {
  const rt = readFileSync(rp, 'utf8');
  const routed = [...new Set([...rt.matchAll(/oc-[a-z-]+/g)].map((m) => m[0]))].filter((s) => ids.includes(s));
  const missing = ids.filter((i) => !routed.includes(i) && i !== 'oc-checkpoint-protocol');
  console.log(`  routing.js references ${routed.length} skills; NOT routable by intent (${missing.length}): ${missing.join(', ')}`);
}

console.log('\n=== CLUSTER 6: plugin command coverage ===');
const pcmds = readdirSync(join(ROOT, 'plugins/opchain/commands')).map((f) => f.replace('.md', ''));
const declaring = ids.filter((i) => (fm[i].commands || []).length);
const totalVerbs = declaring.reduce((n, i) => n + fm[i].commands.length, 0);
const unregistered = declaring.filter((i) => !(fm[i].commands || []).some((c) => pcmds.includes(String(c).split(/\s+/)[0].slice(1))));
console.log(`  plugin registers ${pcmds.length} command files; ${declaring.length} skills declare ${totalVerbs} verbs`);
console.log(`  skills with NO plugin command (${unregistered.length}): ${unregistered.join(', ')}`);
