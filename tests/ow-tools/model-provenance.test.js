import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DIARIZATION_MODEL, DIARIZATION_REVISION, diarizationCached } from "../../plugins/ow-tools/lib/core.mjs";
import { fetchCommand } from "../../plugins/ow-tools/lib/doctor.mjs";
import { cleanup, PLUGIN, tempDir, write } from "./helpers.js";

afterAll(cleanup);

describe("model provenance", () => {
  it("checks the exact cached revision, not an arbitrary snapshots directory", () => {
    const home = tempDir();
    const snapshots = join(home, "hf/hub/models--pyannote--speaker-diarization-community-1/snapshots");
    write(join(snapshots, "wrong/config.yaml"), "config");
    expect(diarizationCached({ OW_TOOLS_HOME: home })).toBe(false);
    write(join(snapshots, DIARIZATION_REVISION, "config.yaml"), "config");
    expect(diarizationCached({ OW_TOOLS_HOME: home })).toBe(true);
    expect(fetchCommand({ OW_TOOLS_HOME: home })).toContain(`--revision ${DIARIZATION_REVISION}`);
  });

  it("pins the same publisher revision in Python and refuses a mutable revision argument", () => {
    const helper = join(PLUGIN, "python/diarize.py");
    expect(DIARIZATION_REVISION).toMatch(/^[0-9a-f]{40}$/);
    expect(readFileSync(helper, "utf8")).toContain(`DEFAULT_REVISION = "${DIARIZATION_REVISION}"`);
    const result = spawnSync("python3", [helper, "--fetch", "--revision", "main"], { encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("invalid choice");
  });

  it("passes the revision to pyannote in both fetch and offline run without loading a model", () => {
    const output = join(tempDir(), "turns.json");
    const program = `
import argparse, json, os, runpy, sys, types
calls = []
class Annotation:
    def itertracks(self, yield_label=False): return iter([])
class FakePipeline:
    @staticmethod
    def from_pretrained(model, **kwargs):
        calls.append(dict(model=model, **kwargs))
        return lambda wav, **opts: Annotation()
audio = types.ModuleType('pyannote.audio')
audio.Pipeline = FakePipeline
audio.__version__ = '4.0.7-fixture'
pyannote = types.ModuleType('pyannote')
pyannote.audio = audio
sys.modules['pyannote'] = pyannote
sys.modules['pyannote.audio'] = audio
sys.modules['torch'] = types.ModuleType('torch')
module = runpy.run_path(sys.argv[1])
os.environ['HF_TOKEN'] = 'synthetic-fetch-token'
module['fetch'](module['DEFAULT_MODEL'], module['DEFAULT_REVISION'])
os.environ['HF_HUB_OFFLINE'] = '1'
module['run'].__globals__['load_wav'] = lambda path: {}
module['run'](argparse.Namespace(model=module['DEFAULT_MODEL'], revision=module['DEFAULT_REVISION'], device='cpu', speakers=None, wav='fixture.wav', out=sys.argv[2]))
assert 'HF_TOKEN' not in os.environ
assert calls[0] == {'model': module['DEFAULT_MODEL'], 'revision': module['DEFAULT_REVISION'], 'token': 'synthetic-fetch-token'}
assert calls[1] == {'model': module['DEFAULT_MODEL'], 'revision': module['DEFAULT_REVISION']}
print(json.dumps(calls))
`;
    const result = spawnSync("python3", ["-c", program, join(PLUGIN, "python/diarize.py"), output], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(readFileSync(output, "utf8"))).toMatchObject({ model: DIARIZATION_MODEL, revision: DIARIZATION_REVISION });
  });
});
