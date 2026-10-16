// plugins/opchain/hooks/session-state.cjs had no tests. The 2026-09-11 skill-chain
// audit found it printed "[object Object]" for the { text, done_when } next_actions
// form the checkpoint protocol blesses, and picked "next" by alphabetical file
// order (v1.9.1 Sprint 2). The 2026-10-08 effectiveness audit (I-07, I-10, I-11)
// found the same `next:` line served in 17 sessions over 10 days, a merged-PR
// line served for 7h, and no report of a checkout 48 commits behind or an
// unenrolled repo — the cases under "change-triggered next", "PR resolution",
// "install drift" and "release resume" below.
import { describe, it, expect, afterAll } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const HOOK = join(import.meta.dirname, "..", "plugins", "opchain", "hooks", "session-state.cjs");
const scratch = [];
// The hook keeps its per-repo `next:` fingerprint in os.tmpdir(); point the
// child at a private TMPDIR so runs are hermetic and leave nothing behind.
const stateDir = mkdtempSync(join(tmpdir(), "oc-ss-state-"));
afterAll(() => {
  scratch.forEach((d) => rmSync(d, { recursive: true, force: true }));
  rmSync(stateDir, { recursive: true, force: true });
});

function git(root, args) {
  return spawnSync("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd: root, encoding: "utf8" });
}

function writeCheckpoints(root, checkpoints) {
  for (const [skill, data] of Object.entries(checkpoints)) {
    writeFileSync(join(root, ".checkpoints", `${skill}.checkpoint.json`), JSON.stringify({ skill, ...data }));
  }
}

function repo({ checkpoints = {}, files = {}, commits = 1, checkpointsDir = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "oc-ss-"));
  scratch.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "t@t"]);
  git(root, ["config", "user.name", "t"]);
  for (let i = 0; i < commits; i++) git(root, ["commit", "-q", "--allow-empty", "-m", `c${i}`]);
  if (checkpointsDir) {
    mkdirSync(join(root, ".checkpoints"));
    writeCheckpoints(root, checkpoints);
  }
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }
  return root;
}

function runHook(root, { input = {}, env = {} } = {}) {
  const r = spawnSync("node", [HOOK], {
    input: JSON.stringify({ cwd: root, ...input }),
    encoding: "utf8",
    env: { ...process.env, TMPDIR: stateDir, OPCHAIN_GH_BIN: "0", ...env },
  });
  return r.stdout;
}

const project = (checkpoints) => runHook(repo({ checkpoints }));
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

describe("session-state hook", () => {
  it("renders an object-form next action as its text", () => {
    const out = project({
      "oc-app-architect": {
        status: "in_progress",
        updated_at: hoursAgo(1),
        next_actions: [{ text: "Re-run the evaluator on sprint 2", done_when: "npm test" }],
      },
    });
    expect(out).toContain("next: oc-app-architect: Re-run the evaluator on sprint 2");
    expect(out).not.toContain("[object Object]");
  });

  it("leads with the most recently touched in_progress work", () => {
    const out = project({
      "oc-a-older": { status: "in_progress", updated_at: hoursAgo(48), next_actions: ["older work"] },
      "oc-z-newer": { status: "in_progress", updated_at: hoursAgo(1), next_actions: ["newer work"] },
    });
    expect(out).toContain("next: oc-z-newer: newer work");
  });

  it("does not repeat work already awaiting the user as next", () => {
    const out = project({
      "oc-a-waiting": {
        status: "in_progress",
        updated_at: hoursAgo(1),
        next_actions: ["decide"],
        blockers: [{ id: "b1", description: "choose a stack", needs: "user_decision" }],
      },
      "oc-b-working": { status: "in_progress", updated_at: hoursAgo(5), next_actions: ["keep building"] },
    });
    expect(out).toContain("AWAITING YOU: oc-a-waiting: choose a stack");
    expect(out).toContain("next: oc-b-working: keep building");
  });

  it("tags next with an hours-scale age", () => {
    const out = project({
      "oc-app-architect": { status: "in_progress", updated_at: hoursAgo(9), next_actions: ["Re-run the evaluator"] },
    });
    expect(out).toContain("next: oc-app-architect: Re-run the evaluator (updated 9h ago)");
  });
});

// 2.0.1 promised every task begins with a stamp; the 2.0.3 audit found that
// resume and compact re-stamped the same task as a fresh start.
describe("session-state task stamp", () => {
  function stamp(source, { checkpoints = true } = {}) {
    const root = repo({ checkpointsDir: checkpoints });
    return runHook(root, { input: { source }, env: { TZ: "America/Chicago" } }).split("\n")[0];
  }
  const at = String.raw`\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2} [A-Z]{2,5} \(America\/Chicago\)`;

  it.each(["startup", "clear", undefined])("starts the task on source=%s", (source) => {
    expect(stamp(source)).toMatch(new RegExp(`^Task started: ${at}$`));
  });

  it.each(["resume", "compact"])("resumes, not restarts, the task on source=%s", (source) => {
    expect(stamp(source)).toMatch(new RegExp(`^Task resumed: ${at}$`));
  });

  it("stamps a repo with no .checkpoints/ too", () => {
    expect(stamp("startup", { checkpoints: false })).toMatch(new RegExp(`^Task started: ${at}$`));
  });
});

describe("change-triggered next", () => {
  const cp = (text) => ({
    "oc-app-architect": { status: "in_progress", updated_at: hoursAgo(9), next_actions: [text] },
  });
  const FULL = "next: oc-app-architect: Re-run the evaluator on sprint 2 (updated 9h ago)";
  const STUB = /next: \(unchanged since \d{4}-\d{2}-\d{2}; (\d+) sessions\) — run \/oc-ops for detail/;

  it("prints the full line once, a stub on the next session, and the full line again on change", () => {
    const root = repo({ checkpoints: cp("Re-run the evaluator on sprint 2") });
    expect(runHook(root)).toContain(FULL);

    const second = runHook(root);
    expect(second).toMatch(STUB);
    expect(second.match(STUB)[1]).toBe("2");
    expect(second).not.toContain("Re-run the evaluator");

    writeCheckpoints(root, cp("Ship sprint 2 to staging"));
    const third = runHook(root);
    expect(third).toContain("next: oc-app-architect: Ship sprint 2 to staging (updated 9h ago)");
    expect(third).not.toMatch(STUB);
  });

  it("re-emits the full line on every 5th identical session", () => {
    const root = repo({ checkpoints: cp("Re-run the evaluator on sprint 2") });
    const outs = Array.from({ length: 6 }, () => runHook(root));
    expect(outs[0]).toContain(FULL);
    for (const i of [1, 2, 3]) expect(outs[i]).toMatch(STUB);
    expect(outs[4]).toContain(FULL);
    expect(outs[5]).toMatch(STUB);
    expect(outs[5].match(STUB)[1]).toBe("6");
  });

  it("keeps AWAITING YOU and open findings while next is collapsed", () => {
    const root = repo({
      checkpoints: {
        ...cp("Re-run the evaluator on sprint 2"),
        "oc-release-ops": {
          status: "blocked",
          updated_at: hoursAgo(1),
          blockers: [{ id: "b1", description: "patch or minor?", needs: "user_decision" }],
        },
        "oc-code-auditor": {
          status: "complete",
          updated_at: hoursAgo(1),
          findings: [{ id: "f1", severity: "critical", status: "open" }],
        },
      },
    });
    runHook(root);
    const second = runHook(root);
    expect(second).toMatch(STUB);
    expect(second).toContain("AWAITING YOU: oc-release-ops: patch or minor?");
    expect(second).toContain("open findings: oc-code-auditor: 1 critical / 0 high open — but marked complete");
  });

  it("keeps the fingerprint per repo", () => {
    const a = repo({ checkpoints: cp("Re-run the evaluator on sprint 2") });
    const b = repo({ checkpoints: cp("Re-run the evaluator on sprint 2") });
    expect(runHook(a)).toContain(FULL);
    expect(runHook(b)).toContain(FULL);
  });
});

describe("next: PR resolution through gh", () => {
  // A gh stand-in: `gh pr view <n> --json state` → #27 is merged, anything else open.
  const ghStub = join(stateDir, "gh-stub");
  writeFileSync(
    ghStub,
    '#!/bin/sh\ncase "$3" in 27) echo \'{"state":"MERGED"}\';; *) echo \'{"state":"OPEN"}\';; esac\n',
    { mode: 0o755 },
  );
  const cp = (actions) => ({
    "oc-git-ops": { status: "in_progress", updated_at: hoursAgo(8), next_actions: actions },
  });

  it("drops an action whose every PR has merged and uses the next one", () => {
    const out = runHook(repo({ checkpoints: cp(["Merge #27 then tag", "Open the follow-up for the parser"]) }), {
      env: { OPCHAIN_GH_BIN: ghStub },
    });
    expect(out).toContain("next: oc-git-ops: Open the follow-up for the parser (updated 8h ago)");
    expect(out).not.toContain("Merge #27");
  });

  it("annotates a partly merged action instead of dropping it", () => {
    const out = runHook(repo({ checkpoints: cp(["Merge #27 then #31"]) }), { env: { OPCHAIN_GH_BIN: ghStub } });
    expect(out).toContain("next: oc-git-ops: Merge #27 then #31 (merged: #27) (updated 8h ago)");
  });

  it("drops the whole next when the only action is fully merged", () => {
    const out = runHook(repo({ checkpoints: cp(["Merge #27 then tag"]) }), { env: { OPCHAIN_GH_BIN: ghStub } });
    expect(out).not.toContain("next:");
  });

  it.each([
    ["disabled", "0"],
    ["missing binary", join(stateDir, "no-such-gh")],
  ])("keeps the action when gh is %s", (_label, bin) => {
    const out = runHook(repo({ checkpoints: cp(["Merge #27 then tag"]) }), { env: { OPCHAIN_GH_BIN: bin } });
    expect(out).toContain("next: oc-git-ops: Merge #27 then tag (updated 8h ago)");
  });
});

describe("install drift lines", () => {
  it("reports a checkout behind origin/main", () => {
    const root = repo({ commits: 3 });
    git(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    git(root, ["reset", "-q", "--hard", "HEAD~2"]);
    expect(runHook(root)).toContain("checkout: 2 commits behind origin/main");
  });

  it("says nothing when level with origin/main or when there is no origin", () => {
    const level = repo({ commits: 2 });
    git(level, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    expect(runHook(level)).not.toContain("checkout:");
    expect(runHook(repo())).not.toContain("checkout:");
  });

  it("reports an unenrolled repo that has a package.json", () => {
    const root = repo({ files: { "package.json": "{}" } });
    expect(runHook(root)).toContain("enrolled: no — run /oc-enroll");
    mkdirSync(join(root, ".git", "opchain", "commit-gate", "v1"), { recursive: true });
    writeFileSync(join(root, ".git", "opchain", "commit-gate", "v1", "verify-candidate.mjs"), "// runtime\n");
    expect(runHook(root)).not.toContain("enrolled:");
  });

  it("does not nag a repo without a package.json", () => {
    expect(runHook(repo())).not.toContain("enrolled:");
  });

  it("reports plugin cache vs repo version drift in the authoring repo", () => {
    const cache = join(stateDir, "plugin-cache", "2.0.4");
    mkdirSync(join(cache, ".claude-plugin"), { recursive: true });
    writeFileSync(join(cache, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "opchain", version: "2.0.4" }));
    const drifted = repo({ files: { "plugins/opchain/.claude-plugin/plugin.json": JSON.stringify({ version: "2.0.5" }) } });
    expect(runHook(drifted, { env: { CLAUDE_PLUGIN_ROOT: cache } })).toContain("plugin: cache 2.0.4 vs repo 2.0.5");
    const same = repo({ files: { "plugins/opchain/.claude-plugin/plugin.json": JSON.stringify({ version: "2.0.4" }) } });
    expect(runHook(same, { env: { CLAUDE_PLUGIN_ROOT: cache } })).not.toContain("plugin:");
    expect(runHook(drifted)).not.toContain("plugin:"); // consumer repo: no CLAUDE_PLUGIN_ROOT comparison
  });
});

describe("release resume (I-10)", () => {
  // Data + git only (B-06): the lockstep `version:` in skills/*/SKILL.md and a
  // local refs/tags/v<version>. A planted scripts/check-release-tag.mjs that
  // leaves a marker proves no repo code runs.
  const skill = (v) => `---\nname: oc-x\nversion: ${v}\n---\n# x\n`;
  const CATALOG = { "skills/oc-a/SKILL.md": skill("9.9.9"), "skills/oc-b/SKILL.md": skill("9.9.9") };
  const shipping = (phase = "ship") => ({
    "oc-release-ops": {
      status: "in_progress",
      phase,
      step: "v9.9.9-bump-applied",
      updated_at: hoursAgo(2),
      next_actions: ["Release PR merged; owner-signed tag, then staging"],
    },
  });
  const LINE = "Release 9.9.9 is merged but untagged; next: /oc-git-release 9.9.9";
  const PLUGIN = { "plugins/opchain/.claude-plugin/plugin.json": JSON.stringify({ name: "opchain", version: "9.9.9" }) };
  let markerN = 0;
  const planted = () => {
    const marker = join(stateDir, `ran-${process.pid}-${markerN++}`);
    return { marker, files: { "scripts/check-release-tag.mjs": `require("fs").writeFileSync(${JSON.stringify(marker)}, "x");\n` } };
  };
  const authoring = ({ files = {}, origin = "https://github.com/ainatx/opchain.git", ...rest } = {}) => {
    const root = repo({ ...rest, files: { ...PLUGIN, ...CATALOG, ...files } });
    if (origin) git(root, ["remote", "add", "origin", origin]);
    return root;
  };

  it("emits one JSON object whose additionalContext carries the release line and the whole block, without running repo code", () => {
    const { marker, files } = planted();
    const out = runHook(authoring({ checkpoints: shipping(), files }));
    const obj = JSON.parse(out); // the WHOLE stdout must be the one JSON object (plain text before `{` would void it)
    expect(obj.hookSpecificOutput.hookEventName).toBe("SessionStart");
    const ctx = obj.hookSpecificOutput.additionalContext;
    expect(ctx).toMatch(/^Task started: /);
    expect(ctx.split("\n")[1]).toBe(LINE);
    expect(ctx).toContain("<opchain-checkpoint-data>");
    expect(ctx).toContain("next: oc-release-ops: Release PR merged; owner-signed tag, then staging");
    expect(existsSync(marker)).toBe(false);
  });

  it("stays plain text when the local tag exists", () => {
    const root = authoring({ checkpoints: shipping() });
    git(root, ["tag", "v9.9.9"]);
    const out = runHook(root);
    expect(out).toMatch(/^Task started: /);
    expect(() => JSON.parse(out)).toThrow();
    expect(out).not.toContain("untagged");
  });

  it("ignores a release checkpoint that is not shipping, a split catalog, or no catalog", () => {
    for (const root of [
      authoring({ checkpoints: shipping("plan") }),
      authoring({ checkpoints: shipping(), files: { "skills/oc-b/SKILL.md": skill("9.9.8") } }),
      repo({ checkpoints: shipping(), files: PLUGIN }),
    ]) {
      const out = runHook(root);
      expect(out).toMatch(/^Task started: /);
      expect(out).not.toContain("untagged");
    }
  });

  it("does not call an unmerged bump a merged release", () => {
    // origin/main's release seal names another version: the bump is still on a branch.
    const root = authoring({ checkpoints: shipping() });
    writeFileSync(join(root, "release-seal.json"), JSON.stringify({ catalogVersion: "9.9.8" }));
    git(root, ["add", "release-seal.json"]);
    git(root, ["commit", "-q", "-m", "seal"]);
    git(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    const out = runHook(root);
    expect(() => JSON.parse(out)).toThrow();
    expect(out).not.toContain("untagged");
  });

  it("never executes a planted check-release-tag.mjs, even with a spoofed origin (B-06)", () => {
    for (const origin of ["https://github.com/ainatx/opchain.git", "git@github.com:ainatx/opchain.git", "https://github.com/someone/opchain.git", null]) {
      const { marker, files } = planted();
      runHook(authoring({ checkpoints: shipping(), files, origin }));
      expect(existsSync(marker), String(origin)).toBe(false);
    }
    const { marker, files } = planted();
    const out = runHook(repo({ checkpoints: shipping(), files: { ...CATALOG, ...files } })); // no plugin source
    expect(out).not.toContain("untagged");
    expect(existsSync(marker)).toBe(false);
  });
});
