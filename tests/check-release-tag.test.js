// The release-tag guard. Companion to the release-surface check: that one asks
// whether the site surfaces agree with each other, this one asks whether git
// has a tag for the release they claim.
//
// Every case below is a way the guard could fail OPEN — pass a release that is
// not really tagged. That is the only interesting direction: a false refusal
// costs one loud message and an escape hatch, a false pass costs another
// untagged release, and the repo already has ten of those.
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkReleaseTag, readCatalogVersion, remediation } from "../scripts/check-release-tag.mjs";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SAFE_PUBLISHER_WORKFLOW = "name: Safe publisher\n# checksum verified and SHA-pinned\n";
const UNSAFE_PUBLISHER_WORKFLOW = "name: Unsafe publisher\n# downloads releases/latest\n";
const SAFE_SERVER_JSON = '{"version":"1.8.3","remotes":[]}\n';
const WRONG_SERVER_JSON = '{"version":"1.8.3","remotes":[{"url":"https://wrong.example"}]}\n';

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** Build a throwaway skills/ tree: { skillId: version }. */
function skillsTree(versions) {
  const dir = mkdtempSync(join(tmpdir(), "oc-skills-"));
  for (const [id, version] of Object.entries(versions)) {
    mkdirSync(join(dir, id), { recursive: true });
    writeFileSync(
      join(dir, id, "SKILL.md"),
      `---\nname: ${id}\nversion: ${version}\n---\n\n# ${id}\n\nSome prose that mentions version: 9.9.9 in the body.\n`,
    );
  }
  return dir;
}

function releaseSeal(
  catalogVersion,
  generation = 1,
  publisherWorkflow = SAFE_PUBLISHER_WORKFLOW,
  serverJson = SAFE_SERVER_JSON,
) {
  return JSON.stringify({
    schemaVersion: 1,
    catalogVersion,
    generation,
    publisherWorkflowSha256: sha256(publisherWorkflow),
    serverJsonSha256: sha256(serverJson),
  });
}

/**
 * A fake git that answers from a table, so tests never touch a real repo.
 *
 * Release tags may be ancestors of later content-only HEADs, but they must
 * inherit the same reviewed release seal. The three commit/seal inputs let the
 * tests distinguish a legitimate content descendant from an unsafe older tag.
 */
function fakeGit({
  tags = [],
  remoteTags = null,
  isRepo = true,
  reachable = true,
  taggedSkills = { "oc-git-ops": "1.8.2" }, // id → version at the tag; null = unreadable
  localCommit = "b".repeat(40),
  localObject = "a".repeat(40),
  remoteCommit = localCommit,
  remoteObject = localObject,
  headSeal = releaseSeal("1.8.2"),
  tagSeal = headSeal,
  headWorkflow = SAFE_PUBLISHER_WORKFLOW,
  tagWorkflow = SAFE_PUBLISHER_WORKFLOW,
  headServer = SAFE_SERVER_JSON,
  tagServer = SAFE_SERVER_JSON,
  tagType = "tag",
  signatureValid = true,
} = {}) {
  return (args) => {
    const [cmd] = args;
    if (cmd === "rev-parse" && args.includes("--git-dir")) return isRepo ? ".git" : null;
    if (cmd === "rev-parse" && args[1]?.endsWith("^{commit}")) return localCommit;
    if (cmd === "rev-parse") {
      const ref = args[args.length - 1].replace("refs/tags/", "");
      return tags.includes(ref) ? localObject : null;
    }
    if (cmd === "cat-file") return tagType;
    if (cmd === "verify-tag") return signatureValid ? "" : null;
    if (cmd === "merge-base") return reachable ? "" : null;
    if (cmd === "show") {
      const spec = args[1] || "";
      const atHead = spec.startsWith("HEAD:");
      if (spec.endsWith("release-seal.json")) return atHead ? headSeal : tagSeal;
      if (spec.endsWith("publish-mcp-registry.yml")) return atHead ? headWorkflow : tagWorkflow;
      if (spec.endsWith("server.json")) return atHead ? headServer : tagServer;
      return null;
    }
    if (cmd === "grep") {
      if (taggedSkills === null) return null;
      const tagRef = args[3] ?? "vTAG";
      return Object.entries(taggedSkills)
        .map(([id, version]) => `${tagRef}:skills/${id}/SKILL.md:version: ${version}`)
        .join("\n");
    }
    if (cmd === "ls-remote") {
      if (remoteTags === null) return null; // network down — unknowable, not empty
      const refArg = args.find((arg) => arg.startsWith("refs/tags/") && !arg.endsWith("^{}"));
      const ref = refArg.replace("refs/tags/", "");
      return remoteTags.includes(ref)
        ? `${remoteObject}\trefs/tags/${ref}\n${remoteCommit}\trefs/tags/${ref}^{}`
        : "";
    }
    if (cmd === "fetch") return "";
    return null;
  };
}

describe("readCatalogVersion", () => {
  it("reads the lockstep version when every skill agrees", () => {
    const dir = skillsTree({ "oc-git-ops": "1.8.2", "oc-release-ops": "1.8.2" });
    expect(readCatalogVersion(dir)).toMatchObject({ version: "1.8.2", disagreement: null, count: 2 });
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads only frontmatter, not a `version:` line in the body", () => {
    const dir = skillsTree({ "oc-git-ops": "1.8.2" });
    expect(readCatalogVersion(dir).version).toBe("1.8.2"); // body says 9.9.9
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports a split catalog instead of picking the majority", () => {
    const dir = skillsTree({ a: "1.8.3", b: "1.8.3", c: "1.8.2" });
    const r = readCatalogVersion(dir);
    expect(r.version).toBeNull();
    expect(r.disagreement).toContain("1.8.3");
    expect(r.disagreement).toContain("1.8.2");
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("checkReleaseTag", () => {
  const withTree = (versions, opts) => {
    const skillsDir = skillsTree(versions);
    try {
      return checkReleaseTag({ skillsDir, fetch: false, ...opts });
    } finally {
      rmSync(skillsDir, { recursive: true, force: true });
    }
  };

  it("passes when the tag carries the release seal, is reachable, and matches origin", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: ["v1.8.2"] }),
    });
    expect(r).toMatchObject({ ok: true, version: "1.8.2", tag: "v1.8.2", reason: "tagged" });
  });

  it("REFUSES when the catalog was bumped but never tagged", () => {
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.2"],
        remoteTags: ["v1.8.2"],
        headSeal: releaseSeal("1.8.3"),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing-tag");
    expect(r.errors.join(" ")).toContain("no v1.8.3 tag exists");
  });

  it("REFUSES the same-version pre-hardening ancestor when it lacks the release seal", () => {
    // Regression: 438ab5f already contains the complete 1.8.3 catalog but lacks
    // both the later publisher hardening and the reviewed release baseline seal.
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.3" },
        headSeal: releaseSeal("1.8.3"),
        tagSeal: null,
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("tag-release-seal-invalid");
  });

  it("REFUSES a copied seal when the tagged publisher workflow is still unsafe", () => {
    const seal = releaseSeal("1.8.3");
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.3" },
        headSeal: seal,
        tagSeal: seal,
        tagWorkflow: UNSAFE_PUBLISHER_WORKFLOW,
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("tag-publisher-workflow-mismatch");
  });

  it("REFUSES a copied seal when the tagged MCP registry payload differs", () => {
    const seal = releaseSeal("1.8.3");
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.3" },
        headSeal: seal,
        tagSeal: seal,
        tagServer: WRONG_SERVER_JSON,
      }),
    });
    expect(r.reason).toBe("tag-server-json-mismatch");
  });

  it("passes a later content-only HEAD that inherits the tagged release seal", () => {
    const seal = releaseSeal("1.8.3");
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.3" },
        headSeal: seal,
        tagSeal: seal,
      }),
    });
    expect(r.ok).toBe(true);
  });

  it("REFUSES a catalog bump whose HEAD release seal was not updated", () => {
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.3" },
        headSeal: releaseSeal("1.8.2"),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("release-seal-invalid");
  });

  it("REFUSES a missing or malformed HEAD release seal", () => {
    for (const headSeal of [null, "{not-json}"]) {
      const r = withTree({ "oc-git-ops": "1.8.3" }, {
        git: fakeGit({ tags: [], headSeal }),
      });
      expect(r.reason).toBe("release-seal-invalid");
    }
  });

  it("REFUSES an unsafe integer release-seal generation", () => {
    const invalid = JSON.stringify({
      schemaVersion: 1,
      catalogVersion: "1.8.3",
      generation: Number.MAX_SAFE_INTEGER + 1,
      publisherWorkflowSha256: sha256(SAFE_PUBLISHER_WORKFLOW),
      serverJsonSha256: sha256(SAFE_SERVER_JSON),
    });
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({ tags: [], headSeal: invalid }),
    });
    expect(r.reason).toBe("release-seal-invalid");
  });

  it("REFUSES a seal that does not digest the pre-tag HEAD publisher workflow", () => {
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: [],
        headSeal: releaseSeal("1.8.3"),
        headWorkflow: UNSAFE_PUBLISHER_WORKFLOW,
      }),
    });
    expect(r.reason).toBe("release-seal-workflow-mismatch");
  });

  it("REFUSES a same-version tag carrying a different seal generation", () => {
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.3" },
        headSeal: releaseSeal("1.8.3", 2),
        tagSeal: releaseSeal("1.8.3", 1),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("tag-release-seal-mismatch");
  });

  it("REFUSES a reachable tag whose tree contains an older catalog", () => {
    const r = withTree({ "oc-git-ops": "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { "oc-git-ops": "1.8.2" },
        headSeal: releaseSeal("1.8.3"),
        tagSeal: releaseSeal("1.8.3"),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("tag-version-mismatch");
    expect(r.countDrift).toBe(false); // versions disagree — a misplaced tag, not the freeze window
  });

  it("REFUSES a tag that is not an ancestor of HEAD", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: ["v1.8.2"], reachable: false }),
    });
    expect(r.reason).toBe("unreachable-tag");
  });

  it("REFUSES a lightweight or unverifiable tag", () => {
    const lightweight = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: ["v1.8.2"], tagType: "commit" }),
    });
    expect(lightweight.reason).toBe("unsigned-tag");

    const badSignature = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: ["v1.8.2"], signatureValid: false }),
    });
    expect(badSignature.reason).toBe("invalid-tag-signature");
  });

  it("REFUSES a tag with fewer skills than the current catalog", () => {
    const r = withTree({ a: "1.8.3", b: "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { a: "1.8.3" },
        headSeal: releaseSeal("1.8.3"),
        tagSeal: releaseSeal("1.8.3"),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("tag-version-mismatch");
    expect(r.countDrift).toBe(true); // the deploy-freeze window: same version, new skills
    expect(r.errors.join(" ")).toContain("NEXT release");
  });

  it("REFUSES a same-count skill swap at the same version (identity, not count)", () => {
    // Remove one skill, add another, lockstep version unchanged: the count and
    // every version string agree with the tag, but the catalog is not the one
    // the tag sealed. The guard must compare identity.
    const r = withTree({ a: "1.8.3", c: "1.8.3" }, {
      git: fakeGit({
        tags: ["v1.8.3"],
        remoteTags: ["v1.8.3"],
        taggedSkills: { a: "1.8.3", b: "1.8.3" },
        headSeal: releaseSeal("1.8.3"),
        tagSeal: releaseSeal("1.8.3"),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("tag-version-mismatch");
    expect(r.countDrift).toBe(true);
    expect(r.errors.join(" ")).toContain("added since the tag: c");
    expect(r.errors.join(" ")).toContain("removed since the tag: b");
  });

  it("REFUSES a tag that exists locally but was never pushed", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: [] }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unpushed-tag");
  });

  it("REFUSES when origin cannot be verified", () => {
    // The guard claims to fail closed. A flaky network is not proof that the
    // tag was pushed, so production waits for an authoritative remote lookup.
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: null }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("remote-unverifiable");
  });

  it("REFUSES when local and origin tags resolve to different commits", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({
        tags: ["v1.8.2"],
        remoteTags: ["v1.8.2"],
        localCommit: "b".repeat(40),
        remoteCommit: "c".repeat(40),
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("remote-tag-mismatch");
  });

  it("REFUSES a different remote tag object even when both peel to the same commit", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      git: fakeGit({
        tags: ["v1.8.2"],
        remoteTags: ["v1.8.2"],
        remoteObject: "d".repeat(40),
      }),
    });
    expect(r.reason).toBe("remote-tag-object-mismatch");
  });

  it("supports a signed local pre-push gate before the tag event can run", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, {
      verifyRemote: false,
      git: fakeGit({ tags: ["v1.8.2"], remoteTags: null }),
    });
    expect(r).toMatchObject({ ok: true, reason: "tagged-local" });
  });

  it("REFUSES a half-applied bump rather than guessing the release", () => {
    const r = withTree({ a: "1.8.3", b: "1.8.2" }, {
      git: fakeGit({ tags: ["v1.8.2", "v1.8.3"], remoteTags: ["v1.8.2", "v1.8.3"] }),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("catalog-split");
  });

  it("REFUSES when git is unavailable — fails closed, like the commit gate", () => {
    const r = withTree({ "oc-git-ops": "1.8.2" }, { git: fakeGit({ isRepo: false }) });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-git");
  });

  it("REFUSES when no SKILL.md is readable at all", () => {
    const empty = mkdtempSync(join(tmpdir(), "oc-empty-"));
    const r = checkReleaseTag({ skillsDir: empty, fetch: false, git: fakeGit({}) });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-catalog");
    rmSync(empty, { recursive: true, force: true });
  });
});

describe("release seal integration", () => {
  it("emits a machine-readable reason for release-sequence consumers", () => {
    const result = spawnSync(process.execPath, ["scripts/check-release-tag.mjs", "--local", "--json"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toMatchObject({ ok: expect.any(Boolean), reason: expect.any(String) });
    expect(result.status).toBe(parsed.ok ? 0 : 1);
  });

  it("has the pre-tag release sequence consume the JSON reason unconditionally", () => {
    const source = readFileSync(join(REPO_ROOT, "scripts/release-sequence.mjs"), "utf8");
    expect(source).toContain('sh("node scripts/check-release-tag.mjs --json")');
    expect(source).toContain('result.reason === "missing-tag"');
    expect(source).toContain("result.version !== requestedVersion");
    expect(source).not.toContain('process.argv.includes("--json") ? " --json"');
  });

  it("keeps the repository seal aligned with the real catalog and publisher workflow", () => {
    const seal = JSON.parse(readFileSync(join(REPO_ROOT, "release-seal.json"), "utf8"));
    const catalog = readCatalogVersion(join(REPO_ROOT, "skills"));
    const workflow = readFileSync(join(REPO_ROOT, ".github/workflows/publish-mcp-registry.yml"), "utf8");
    const serverJson = readFileSync(join(REPO_ROOT, "server.json"), "utf8");
    expect(seal).toMatchObject({ schemaVersion: 1, catalogVersion: catalog.version, generation: 1 });
    expect(seal.publisherWorkflowSha256).toBe(sha256(workflow));
    expect(seal.serverJsonSha256).toBe(sha256(serverJson));
  });

  it("validates without publishing and preserves the established registry identity", () => {
    const workflow = readFileSync(join(REPO_ROOT, ".github/workflows/publish-mcp-registry.yml"), "utf8");
    const server = JSON.parse(readFileSync(join(REPO_ROOT, "server.json"), "utf8"));
    expect(workflow).toContain("run: ./mcp-publisher validate");
    expect(workflow).not.toContain("mcp-publisher publish --dry-run");
    expect(workflow).not.toContain("id-token: write");
    expect(workflow).toContain("MCP_GITHUB_TOKEN: ${{ secrets.MIRROR_TOKEN }}");
    expect(workflow).toContain("validate_only:");
    expect(server.name).toBe("io.github.asfbay-bit/opchain-skills");
  });

  it("rejects a real pre-seal tag and accepts the sealed baseline under a content descendant", () => {
    const repo = mkdtempSync(join(tmpdir(), "oc-release-seal-git-"));
    const run = (args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" });
    const checked = (args) => {
      if (args[0] === "verify-tag") return ""; // Fixture tag is annotated; signature paths are unit-tested above.
      const result = run(args);
      if (result.status !== 0) return null;
      return args[0] === "show" ? (result.stdout || "") : (result.stdout || "").trim();
    };
    try {
      run(["init", "-q"]);
      run(["config", "user.name", "Release Fixture"]);
      run(["config", "user.email", "fixture@example.com"]);
      mkdirSync(join(repo, "skills", "oc-git-ops"), { recursive: true });
      mkdirSync(join(repo, ".github", "workflows"), { recursive: true });
      writeFileSync(join(repo, "skills", "oc-git-ops", "SKILL.md"), "---\nversion: 1.8.3\n---\n");
      writeFileSync(join(repo, ".github", "workflows", "publish-mcp-registry.yml"), UNSAFE_PUBLISHER_WORKFLOW);
      writeFileSync(join(repo, "server.json"), SAFE_SERVER_JSON);
      run(["add", "-A"]);
      run(["commit", "-qm", "pre-seal catalog"]);
      run(["tag", "-a", "v1.8.3", "-m", "unsafe fixture tag"]);

      writeFileSync(join(repo, ".github", "workflows", "publish-mcp-registry.yml"), SAFE_PUBLISHER_WORKFLOW);
      writeFileSync(join(repo, "release-seal.json"), releaseSeal("1.8.3"));
      run(["add", "-A"]);
      run(["commit", "-qm", "sealed release baseline"]);
      writeFileSync(join(repo, "README.md"), "content-only descendant\n");
      run(["add", "README.md"]);
      run(["commit", "-qm", "content update"]);

      const preSeal = checkReleaseTag({
        cwd: repo,
        skillsDir: join(repo, "skills"),
        git: checked,
        fetch: false,
        verifyRemote: false,
      });
      expect(preSeal.reason).toBe("tag-release-seal-invalid");

      run(["tag", "-d", "v1.8.3"]);
      run(["tag", "-a", "v1.8.3", "HEAD~1", "-m", "sealed fixture tag"]);
      const sealed = checkReleaseTag({
        cwd: repo,
        skillsDir: join(repo, "skills"),
        git: checked,
        fetch: false,
        verifyRemote: false,
      });
      expect(sealed).toMatchObject({ ok: true, reason: "tagged-local" });
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  }, 15_000);
});

describe("remediation", () => {
  it("tells you to push a tag you already made", () => {
    expect(remediation({ version: "1.8.3", tag: "v1.8.3", reason: "unpushed-tag" }))
      .toContain("git push origin v1.8.3");
  });

  it("routes the deploy-freeze window to a bump, not a re-tag", () => {
    const text = remediation({
      version: "1.8.3", tag: "v1.8.3", reason: "tag-version-mismatch", countDrift: true,
    });
    expect(text).toContain("do NOT re-tag");
    expect(text).toContain("/oc-release bump");
    expect(text).toContain("/oc-git-release");
    expect(text).toContain("deploy:staging");
  });

  it("stays silent for a mixed-version tag tree (misplaced tag, no scripted fix)", () => {
    expect(remediation({
      version: "1.8.3", tag: "v1.8.3", reason: "tag-version-mismatch", countDrift: false,
    })).toBe("");
  });

  it("names /oc-git-release for a tag that does not exist yet", () => {
    const text = remediation({ version: "1.8.3", tag: "v1.8.3", reason: "missing-tag" });
    expect(text).toContain("git tag -s v1.8.3");
    expect(text).toContain("check-release-tag.mjs --local");
    expect(text).toContain("/oc-git-release 1.8.3");
  });
});
