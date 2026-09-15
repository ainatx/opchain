import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MARKER,
  buildComment,
  findExistingComment,
  planComment,
  resolvedComment,
  slugToRoute,
} from "../scripts/axe-comment.cjs";

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "axe-comment-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(rel, contents) {
  const file = join(dir, rel);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, contents);
}

// What a green CI run leaves behind: compare.spec.ts screenshots at the root
// plus Playwright's run marker. This is the directory that produced the
// false "the e2e job failed" comments on #407, #494, #545 and #549.
function writeGreenRunLeftovers() {
  write(".last-run.json", JSON.stringify({ status: "passed", failedTests: [] }));
  for (const width of [375, 768, 1280]) {
    for (const theme of ["dark", "light"]) write(`compare-${width}-${theme}.png`, "png");
  }
}

function writeViolation(slug, violations) {
  write(`routes-Axe-${slug}-chromium/axe-violations-${slug}.json`, JSON.stringify(violations));
}

const botComment = (id, body) => ({ id, body, user: { login: "github-actions[bot]", type: "Bot" } });

describe("buildComment", () => {
  it("returns null for a passing run even when test-results has leftover files", () => {
    writeGreenRunLeftovers();
    expect(buildComment(dir, { outcome: "success" })).toBeNull();
  });

  it("returns null for a passing run with a flaky attempt's violation file", () => {
    writeViolation("skills", [{ id: "color-contrast", impact: "serious", help: "Contrast", nodes: [] }]);
    expect(buildComment(dir, { outcome: "success" })).toBeNull();
  });

  it("returns null when the outcome is cancelled, skipped or missing", () => {
    writeGreenRunLeftovers();
    for (const outcome of ["cancelled", "skipped", undefined]) {
      expect(buildComment(dir, { outcome })).toBeNull();
    }
  });

  it("lists violations per route on a failed run, deduped and node-capped", () => {
    const nodes = Array.from({ length: 7 }, (_, i) => ({ target: [`#n${i}`] }));
    const contrast = [{ id: "color-contrast", impact: "serious", help: "Elements must have sufficient contrast", nodes }];
    writeViolation("skills", contrast);
    // A retry of the same failing test writes the same attachment again.
    write("routes-Axe-skills-chromium-retry1/axe-violations-skills.json", JSON.stringify(contrast));
    writeViolation("root", [{ id: "region", help: "Content should be in landmarks", nodes: [{ target: "main > div" }] }]);

    const out = buildComment(dir, { outcome: "failure", sha: "abcdef1234567" });
    expect(out.startsWith(MARKER)).toBe(true);
    expect(out).toContain("## Axe violations");
    expect(out.indexOf("### `/`")).toBeLessThan(out.indexOf("### `/skills`"));
    expect(out).toContain("`color-contrast` (serious)");
    expect(out).toContain("`region` (unknown impact)");
    expect(out).toContain("`#n4`");
    expect(out).not.toContain("`#n5`");
    expect(out).toContain("…and 2 more node(s)");
    expect(out).toContain("`abcdef1`");
    expect(out.match(/### `\/skills`/g)).toHaveLength(1);
  });

  it("explains a failure outside axe without claiming the axe branch was the cause", () => {
    writeGreenRunLeftovers();
    write(
      "compare-readable-at-375px-chromium/error-context.md",
      "# Error\n\nTimeout\n\n# Page snapshot\n\n```yaml\n- main\n```\n",
    );

    const out = buildComment(dir, { outcome: "failure", runUrl: "https://github.com/o/r/actions/runs/1" });
    expect(out).toContain("## Playwright e2e failed — no axe violations recorded");
    expect(out).not.toMatch(/Axe violations — no attachments found/);
    expect(out).toContain("<code>compare-readable-at-375px-chromium</code>");
    // The embedded ```yaml block must not close the outer fence.
    expect(out).toContain("````\n# Error");
    expect(out).toContain("[run](https://github.com/o/r/actions/runs/1)");
  });

  it("falls back to a directory listing when a failed run has no error-context.md", () => {
    writeGreenRunLeftovers();
    const out = buildComment(dir, { outcome: "failure" });
    expect(out).toContain("No error-context.md found either");
    expect(out).toContain("compare-375-dark.png");
  });

  it("reports missing test results on a failed run", () => {
    const out = buildComment(join(dir, "nope"), { outcome: "failure" });
    expect(out).toContain("## Playwright e2e failed — no test results");
  });
});

describe("findExistingComment", () => {
  it("finds the oldest bot comment with the marker and ignores humans quoting it", () => {
    const comments = [
      { id: 1, body: `quoting ${MARKER}`, user: { login: "someone", type: "User" } },
      botComment(2, "## LHCI scores"),
      botComment(3, `${MARKER}\n## Axe violations`),
      botComment(4, `${MARKER}\n## Axe violations`),
    ];
    expect(findExistingComment(comments).id).toBe(3);
    expect(findExistingComment([])).toBeNull();
    expect(findExistingComment(undefined)).toBeNull();
  });
});

describe("planComment", () => {
  it("does nothing on a green run with no earlier comment", () => {
    writeGreenRunLeftovers();
    const plan = planComment({ dir, outcome: "success", comments: [botComment(9, "## LHCI scores")] });
    expect(plan.action).toBe("none");
  });

  it("creates one marked comment on the first failure", () => {
    writeGreenRunLeftovers();
    const plan = planComment({ dir, outcome: "failure", comments: [] });
    expect(plan.action).toBe("create");
    expect(plan.body.startsWith(MARKER)).toBe(true);
  });

  it("edits the existing comment on a later failure instead of posting again", () => {
    writeGreenRunLeftovers();
    const plan = planComment({ dir, outcome: "failure", comments: [botComment(7, `${MARKER}\nold`)], sha: "1234567890" });
    expect(plan).toMatchObject({ action: "update", commentId: 7 });
    expect(plan.body).toContain("`1234567`");
  });

  it("skips the edit when the existing comment already has this body", () => {
    writeGreenRunLeftovers();
    const body = buildComment(dir, { outcome: "failure", sha: "1234567890" });
    const plan = planComment({ dir, outcome: "failure", comments: [botComment(7, body)], sha: "1234567890" });
    expect(plan.action).toBe("none");
  });

  it("marks an earlier failure comment as passing once the run is green", () => {
    writeGreenRunLeftovers();
    const plan = planComment({ dir, outcome: "success", comments: [botComment(7, `${MARKER}\n## Axe violations`)], sha: "fedcba9876" });
    expect(plan).toMatchObject({ action: "update", commentId: 7 });
    expect(plan.body).toContain("## Playwright e2e passing");
    expect(plan.body).toContain("`fedcba9`");
    expect(plan.body).not.toMatch(/failed —|Axe violations/);

    const again = planComment({ dir, outcome: "success", comments: [botComment(7, plan.body)], sha: "fedcba9876" });
    expect(again.action).toBe("none");
  });

  it("leaves an existing comment alone when the run was cancelled", () => {
    const plan = planComment({ dir, outcome: "cancelled", comments: [botComment(7, `${MARKER}\nold`)] });
    expect(plan.action).toBe("none");
  });
});

describe("resolvedComment / slugToRoute", () => {
  it("carries the marker so the next failure can find it", () => {
    expect(resolvedComment().startsWith(MARKER)).toBe(true);
  });

  it("maps attachment slugs back to routes", () => {
    expect(slugToRoute("root")).toBe("/");
    expect(slugToRoute("skills_oc-git-ops")).toBe("/skills/oc-git-ops");
  });
});
