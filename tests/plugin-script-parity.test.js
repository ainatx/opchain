import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// Every file under plugins/opchain/scripts/ is a copy of scripts/<same path>:
// the plugin ships it to consumers, scripts/ is where it is edited. Nothing
// syncs them, so this test is the only thing that stops the two drifting.
const ROOT = join(import.meta.dirname, '..');
const PLUGIN_SCRIPTS = join(ROOT, 'plugins/opchain/scripts');

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

describe('plugins/opchain/scripts mirrors scripts/', () => {
  const mirrored = files(PLUGIN_SCRIPTS).map(f => relative(PLUGIN_SCRIPTS, f));

  it('has files to compare', () => {
    expect(mirrored.length).toBeGreaterThan(0);
  });

  it.each(mirrored)('%s is byte-identical to scripts/', rel => {
    const source = join(ROOT, 'scripts', rel);
    expect(existsSync(source), `scripts/${rel} is missing`).toBe(true);
    expect(readFileSync(join(PLUGIN_SCRIPTS, rel)).equals(readFileSync(source)), `plugins/opchain/scripts/${rel} differs from scripts/${rel}`).toBe(true);
  });
});
