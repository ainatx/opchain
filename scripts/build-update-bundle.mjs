#!/usr/bin/env node
// Build content-addressed consumer assets from the same skill tree as the ZIPs.
import { readFileSync, readdirSync, lstatSync, mkdirSync, writeFileSync, copyFileSync, realpathSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digest, validateBundle } from './update-opchain.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function buildUpdateBundle({ skillsDir = join(ROOT, 'skills'), publicDir = join(ROOT, 'public') } = {}) {
  const skills = readdirSync(skillsDir).filter(id => /^oc-[a-z0-9-]+$/.test(id)).sort();
  const files = [];
  function add(path, bytes, mode = 0o644) {
    files.push({ path, mode, sha256: digest(bytes), content: bytes.toString('base64') });
  }
  function walk(path) {
    const absolute = join(skillsDir, path);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Cannot distribute symlink: ${path}`);
    if (stat.isDirectory()) for (const name of readdirSync(absolute).sort()) walk(`${path}/${name}`);
    else if (stat.isFile()) add(path, readFileSync(absolute), stat.mode & 0o111 ? 0o755 : 0o644);
    else throw new Error(`Cannot distribute special file: ${path}`);
  }
  for (const skill of skills) {
    walk(skill);
    for (const name of ['LICENSE', 'NOTICE']) {
      if (!files.some(file => file.path === `${skill}/${name}`)) add(`${skill}/${name}`, readFileSync(join(ROOT, name)));
    }
  }
  const version = /^version:\s*(\d+\.\d+\.\d+)\s*$/m.exec(readFileSync(join(skillsDir, skills[0], 'SKILL.md'), 'utf8'))?.[1];
  const runtime = JSON.parse(readFileSync(join(ROOT, 'scripts/runtime-manifest.json'), 'utf8'));
  const bundle = { schema: 1, version, skills, runtime, files: files.sort((a, b) => a.path.localeCompare(b.path, 'en')) };
  validateBundle(bundle);
  const bytes = Buffer.from(JSON.stringify(bundle) + '\n');
  if (bytes.length > 20 * 1024 * 1024) throw new Error('Bundle exceeds updater download limit');
  const sha256 = digest(bytes);
  const out = join(publicDir, 'opchain-update');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${sha256}.json`), bytes);
  writeFileSync(join(out, 'latest.json'), JSON.stringify({ schema: 1, version, sha256 }) + '\n');
  copyFileSync(join(ROOT, 'scripts/update-opchain.mjs'), join(publicDir, 'update.mjs'));
  copyFileSync(join(ROOT, 'scripts/update-bootstrap.sh'), join(publicDir, 'update'));
  return { version, sha256, skills: skills.length, files: files.length, bytes: bytes.length };
}

if (process.argv[1] && existsSync(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  console.log(buildUpdateBundle({ skillsDir: process.env.OPCHAIN_SKILLS_DIR, publicDir: process.env.OPCHAIN_PUBLIC_DIR }));
}
