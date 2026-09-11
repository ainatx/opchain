// Liability guardrails for the compliance/security skills (v1.9): the
// not-certification / not-legal-advice / redaction / no-offensive-testing
// lines are load-bearing product text, not prose garnish. Pinned the way
// license-strings.test.js pins the relicense surfaces, so a future edit
// cannot silently drop one. Assertions normalize whitespace because YAML
// folded scalars and reflowed markdown wrap mid-phrase.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const norm = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\s+/g, " ");

const COMPLY = "skills/oc-compliance-ops/SKILL.md";
const PROFILE = "skills/oc-compliance-ops/references/compliance-profile.md";
const HARDEN = "skills/oc-security-hardening/SKILL.md";
const AUDITOR = "skills/oc-security-auditor/SKILL.md";

describe("compliance/security liability guardrails", () => {
  it("oc-compliance-ops disclaims certification and legal advice in its description", () => {
    expect(norm(COMPLY)).toContain("not certification and not legal advice");
  });

  it("the evidence-emission steps require the disclaimer at the point of emission", () => {
    expect(norm(COMPLY)).toContain("it is not a certification and not legal advice");
    expect(norm(PROFILE)).toContain("it is not a certification and not legal advice");
  });

  it("evidence capture requires redaction and refuses secret-store paths", () => {
    const profile = norm(PROFILE);
    expect(profile).toContain("[REDACTED]");
    expect(profile).toContain("capture refused: secret-store path");
    for (const store of [".dev.vars", ".secrets/"]) expect(profile).toContain(store);
    expect(norm(COMPLY)).toContain("[REDACTED]");
  });

  it("policy scaffolds carry the DRAFT banner", () => {
    expect(norm(COMPLY)).toContain("DRAFT — generated scaffold, not reviewed, not adopted, not legal advice");
  });

  it("oc-security-hardening fences off offensive testing", () => {
    expect(norm(HARDEN)).toContain("never runs exploits, scanners, or penetration tests");
  });

  it("oc-security-auditor keeps the readiness-not-certification line", () => {
    expect(norm(AUDITOR)).toContain("readiness *mapping*, not certification");
  });
});
