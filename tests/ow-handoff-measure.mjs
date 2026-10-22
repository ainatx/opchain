// Measures the held-out sets of tests/ow-handoff-sentences.mjs before and after ow-handoff's layering, for the
// sentence file's header and each evaluation report. Not a test file; tests/ow-handoff-acceptance.test.js calls it.
import { approvalProblem, clientSentenceFindings } from "../scripts/ow-handoff-acceptance.mjs";
import { docCredentialFindings, docPeopleFindings } from "../scripts/ow-documentation-acceptance.mjs";
import { otherClientFindings, otherClientMatchers } from "../scripts/ow-documentation-acceptance.mjs";
import * as S from "./ow-handoff-sentences.mjs";

/** The frozen terms of the Larkspur offer golden (after-offer.md), as the checker reads them. */
export const FROZEN = new Set(["3", "1500", "6", "2", "3000", "15", "1", "6000", "0.5", "30", "1000", "1200"]);
const OTHERS = otherClientMatchers([{ slug: "mossgate-books", name: "Mossgate Books" }], { client: "Larkspur Ceramics" });

export function measure() {
  const r = {};
  for (const layered of [false, true]) {
    const k = layered ? "after" : "before";
    r[k] = {
      controls: S.INTERNAL_CONTROLS.filter((s) => !clientSentenceFindings(s, FROZEN, "Robin", { layered }).length).length,
      ours: S.INTERNAL_HELDOUT_OURS.filter((s) => clientSentenceFindings(s, FROZEN, "Robin", { layered }).length).length,
      legit: S.INTERNAL_HELDOUT_LEGIT.filter((s) => !clientSentenceFindings(s, FROZEN, "Robin", { layered }).length).length,
    };
  }
  r.credentials = { caught: S.credentialValues().filter((v) => docCredentialFindings(v).length).length, of: S.credentialValues().length, controls: S.CREDENTIAL_CONTROLS.filter((v) => !docCredentialFindings(v).length).length };
  r.people = { caught: S.PEOPLE_HELDOUT.filter((v) => docPeopleFindings(v, { names: ["Jess Arden", "Tomas Vey", "Lena Okafor", "Priya Natarajan"], user: "Robin", client: "Larkspur Ceramics" }).length).length, controls: S.PEOPLE_CONTROLS.filter((v) => !docPeopleFindings(v, { names: ["Jess Arden", "Tomas Vey", "Lena Okafor", "Priya Natarajan"], user: "Robin", client: "Larkspur Ceramics" }).length).length };
  r.others = { caught: S.OTHER_CLIENT_HELDOUT.filter((v) => otherClientFindings(v, OTHERS).length).length, controls: S.OTHER_CLIENT_CONTROLS.filter((v) => !otherClientFindings(v, OTHERS).length).length };
  r.approvals = { bad: S.APPROVALS.filter(([k, l, ok]) => !ok && approvalProblem(k, l).length).length, good: S.APPROVALS.filter(([k, l, ok]) => ok && !approvalProblem(k, l).length).length };
  return r;
}
if (process.argv[1] && process.argv[1].endsWith("ow-handoff-measure.mjs")) console.log(JSON.stringify(measure(), null, 1));
