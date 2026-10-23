#!/usr/bin/env node
// Run at the release cut after all intended skills have landed. This prepares
// reviewable bytes; it neither commits, signs, tags nor publishes them.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/catalogs.mjs";
import { renderWorkRelease, sha256, WORK_RELEASE_PATH } from "./lib/work-release.mjs";
import { readCatalogVersion } from "./check-release-tag.mjs";
import { checkOwToolsPin } from "./prepare-ow-tools-pin.mjs";

const { version, disagreement } = readCatalogVersion(join(ROOT, "skills"));
if (!version || disagreement) throw new Error(`cannot seal an incomplete lockstep release: ${disagreement ?? "no catalog"}`);
const path = join(ROOT, "release-seal.json");
const seal = JSON.parse(readFileSync(path, "utf8"));
if (seal.catalogVersion !== version) throw new Error("bump release-seal.json and the oc- catalog together before sealing ow-");
const pinError = checkOwToolsPin(ROOT);
if (pinError) throw new Error(pinError);
const manifest = renderWorkRelease(ROOT, version);
writeFileSync(join(ROOT, WORK_RELEASE_PATH), manifest);
writeFileSync(path, `${JSON.stringify({ ...seal, workCatalogSha256: sha256(manifest) }, null, 2)}\n`);
console.log(`Prepared ${WORK_RELEASE_PATH} and its release-seal digest for ${version}; review before signing the release tag.`);
