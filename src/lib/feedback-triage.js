// Jev use J5 (docs/plans/2026-10-24-jev-integration-plan.md §3): feedback
// triage before /api/feedback's public path. A roadmap request becomes a
// public GitHub issue the moment it is created, so a vulnerability report sent
// through that form is published. When `platform.security.feedback-triage` is
// on and TYPESAFE_API_KEY is set, Jev reads the title and description first;
// a likely security report goes to the private Linear security path instead.
//
// The question, its options, `positive` and threshold are the registry's
// (scripts/jev-uses.json → plugins/opchain/hooks/jev-questions.json), the same
// wording `route-eval jev J5` scores. The client redacts credential-shaped
// text before anything is sent. Any failure is the caller's to swallow: the
// form's own path is the fallback.
import jevClient from "../../plugins/opchain/hooks/lib/jev-client.cjs";
import jevQuestions from "../../plugins/opchain/hooks/jev-questions.json" with { type: "json" };

export const TRIAGE_FLAG = "platform.security.feedback-triage";
export const TRIAGE_TIMEOUT_MS = 2500;
export const J5 = jevQuestions.uses.J5;

/**
 * { security, choice, pSecurity, model } for one submission. `security` is the
 * J5 rule: the positive option wins whenever its probability reaches the
 * threshold, whatever the top option is. Throws on a transport failure or an
 * answer with no J5 choice.
 */
export async function triageFeedback({ title, description }, { apiKey, transport, fetchImpl, timeoutMs = TRIAGE_TIMEOUT_MS } = {}) {
  const t = transport ?? jevClient.httpTransport({ apiKey, fetchImpl, timeoutMs, retryDelayMs: 250 });
  const out = await jevClient.ask({
    transport: t,
    state: { title: String(title ?? ""), description: String(description ?? "") },
    questions: { J5: J5.question },
  });
  const c = jevClient.choice(out.answers, "J5");
  if (!c) throw new Error("no J5 choice in the answer");
  const p = Number(c.probabilities?.[J5.positive]);
  const pSecurity = Number.isFinite(p) ? p : null;
  return { security: pSecurity !== null && pSecurity >= J5.threshold, choice: c.choice, pSecurity, model: out.model };
}
