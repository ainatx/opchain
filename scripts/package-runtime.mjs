#!/usr/bin/env node
// Prepare an unreleased, self-contained local runtime for artifact acceptance.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeManifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'scripts/runtime-manifest.json'), 'utf8'));
const declaredEntries = [
  'LICENSE', 'NOTICE', 'skills', 'mcp/local-server.mjs',
  'scripts/checkpoint.mjs', 'scripts/verify-candidate.mjs', 'scripts/install-git-drivers.mjs',
  'scripts/lib/verification-receipt.cjs', 'scripts/gen-mcp-catalog.mjs',
  'scripts/lib/frontmatter.mjs', 'scripts/capabilities.mjs',
  'scripts/prompt-eval.mjs', 'scripts/cost.mjs',
  'scripts/lib/prompt-eval', 'scripts/lib/cost', 'src/lib/mcp',
  'scripts/lib/release-evidence.mjs', 'scripts/lib/execution-kits',
  'scripts/telemetry.mjs', 'scripts/lib/telemetry-aggregate.mjs', 'scripts/lib/pm-mcp-checks.mjs',
];
const entries = [...new Set([...declaredEntries, ...runtimeManifest.files.filter(file => file !== 'package.json')])].filter((file, _, all) => !all.some(parent => parent !== file && file.startsWith(parent + '/')));

function copyTree(source, target) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`runtime package refuses symlink: ${source}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of fs.readdirSync(source).sort()) copyTree(path.join(source, name), path.join(target, name));
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(target, stat.mode & 0o777);
  } else throw new Error(`runtime package requires regular files: ${source}`);
}

function inventory(root, relative = '') {
  return fs.readdirSync(path.join(root, relative)).sort().flatMap(name => {
    const rel = relative ? `${relative}/${name}` : name;
    const file = path.join(root, rel);
    if (fs.statSync(file).isDirectory()) return inventory(root, rel);
    const bytes = fs.readFileSync(file);
    return [{ path: rel, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
  });
}

export function packageRuntime(out, root = sourceRoot) {
  out = path.resolve(out);
  for (const entry of [...entries, 'node_modules']) {
    const source = path.resolve(root, entry);
    if (out === source || out.startsWith(source + path.sep)) throw new Error('output must be outside the packaged input trees');
  }
  // Never replace a caller's directory or publish an artifact implicitly.
  fs.mkdirSync(out);
  try {
    for (const entry of entries) copyTree(path.join(root, entry), path.join(out, entry));
    const dependencies = {};
    const copyDependency = (name) => {
      if (dependencies[name]) return;
      const directory = path.join(root, 'node_modules', name);
      const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
      dependencies[name] = manifest.version;
      copyTree(directory, path.join(out, 'node_modules', name));
      for (const child of Object.keys(manifest.dependencies ?? {})) copyDependency(child);
    };
    for (const name of ['zod', 'js-yaml']) copyDependency(name);
    fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({
      name: 'opchain-local-runtime', private: true, type: 'module', dependencies,
      scripts: {
        checkpoint: 'node scripts/checkpoint.mjs',
        enroll: 'node scripts/install-git-drivers.mjs --enroll',
        telemetry: 'node scripts/telemetry.mjs',
        'verify:candidate': 'node scripts/verify-candidate.mjs run',
        'oc-prompt': 'node scripts/prompt-eval.mjs', 'oc-cost': 'node scripts/cost.mjs',
        mcp: 'node mcp/local-server.mjs',
        'evidence:pr': 'node scripts/lib/release-evidence.mjs --stage pr',
        'evidence:deploy': 'node scripts/lib/release-evidence.mjs --stage deploy',
      },
    }, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'README.md'), '# Local runtime acceptance artifact\n\nUnreleased, private artifact; not a plugin installation or release. Runtime dependencies and their licenses are included. No installation lifecycle scripts or network calls were run. Requires a compatible Node host; durable local MCP requires macOS lockf or Linux flock. Set OPCHAIN_PROJECT_DIR for local MCP state. Instructions live in skills/. Candidate verification requires explicit enrollment in the target repository. Native host execution and protected CI remain separate acceptance boundaries.\n');
    const manifest = { schema: 'opchain.runtime-artifact', version: 1, unreleased: true, dependencies, files: inventory(out) };
    fs.writeFileSync(path.join(out, 'runtime-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return manifest;
  } catch (error) {
    fs.rmSync(out, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--out') throw new Error('usage: package-runtime.mjs --out NEW_DIRECTORY');
    const manifest = packageRuntime(process.argv[3]);
    console.log(JSON.stringify({ output: path.resolve(process.argv[3]), files: manifest.files.length, dependencies: manifest.dependencies }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
