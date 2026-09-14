import type { Walkthrough } from "./types";

// Approved scripted exchange, adapted from the Markdown review draft.
export const hindsightAndEvolve: Walkthrough = {
  "id": "hindsight-and-evolve",
  "title": "Learn from failures with Hindsight and Evolve",
  "tagline": "Remember, test and review",
  "summary": "Scripted 2.0 example: Turn three failures into an approved lesson, reject a regression and test a safer rule before adoption.",
  "description": "A scripted example with illustrative incidents and scores, not release acceptance evidence. The team has separate model contexts, a configured provider and independently controlled reviewer keys. Hindsight stages a lesson; Evolve rejects one rule before a revised candidate earns external approval.",
  "inputs": [
    "Opchain 2.0 installed; learning initially off",
    "Three distinct API review reports scoring below 6/10",
    "Host provides separate planner, generator and evaluator sessions",
    "Configured task provider and independent external reviewer"
  ],
  "skills": [
    "oc-hindsight",
    "oc-evolve"
  ],
  "outputs": [
    {
      "id": "reviewed-lesson",
      "label": "Reviewed lesson and source history",
      "kind": "report.md",
      "body": "Scripted example. These results illustrate the workflow.\n\nThree distinct error-path reviews scored 4/10, 3/10 and 5/10. Repeated imports count once.\n\n**Lesson:** Before handing off an API change, check timeouts, retry safety and the final error shown to the user. Link each check to its result.\n\nThe lesson is staged before approval. Activation requires a real external receipt bound to the exact project, candidate and evidence."
    },
    {
      "id": "rule-evaluation",
      "label": "Rule comparison and adoption record",
      "kind": "report.md",
      "body": "Scripted example. These results illustrate the workflow.\n\n| Run | Target | Other cases | Total | Decision |\n|---|---|---|---|---|\n| Baseline | 8/12 | 8/8 | 16/20 | Frozen comparison |\n| First rule | 11/12 | 7/8 | 18/20 | Rejected: regression |\n| Revised rule | 11/12 | 8/8 | 19/20 | Eligible for external review |\n\nThe revised rule improves target results by 25 percentage points and preserves every previously passing case in this example. Full provider outputs, instructions and grading evidence are retained for the independent reviewer. A genuine signed receipt is required before adoption.\n\nApproved context is retrieved explicitly. No skill or CLAUDE.md is rewritten. Revalidation is due within 30 days of evaluation; expiry still applies."
    }
  ],
  "runtime": "26 steps",
  "steps": [
    {
      "type": "beat",
      "label": "Notice the same problem",
      "skills": [
        "oc-hindsight"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "/oc-hindsight harvest\n\nWe keep missing API error cases. Look at the last three build reviews and help us stop repeating this."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-hindsight",
      "content": "Learning is off for this project. I can prepare lessons for review, but they will not be returned as learned context while it is off."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Enable local learning for this project. Leave tracking as it is."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-hindsight",
      "content": "Learning is enabled. Your tracking setting is unchanged.\n\nI found three distinct evaluations for `oc-app-architect`, all under the `error-paths` rubric:\n\n| Review | Score | What went wrong |\n|---|---:|---|\n| Checkout API | 4/10 | Timeout handling was missing |\n| Invoice API | 3/10 | A retry could create a duplicate request |\n| Export API | 5/10 | The user never saw the final failure |\n\nEach score is below 6/10. The scorecard flags a recurring weakness. Reimporting the same reviews will not make it count as more failures."
    },
    {
      "type": "beat",
      "label": "Turn evidence into a lesson",
      "skills": [
        "oc-hindsight"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "What should we remember from those reviews?"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-hindsight",
      "content": "The planner fixed the source scope to these three reviews. The generator proposed this lesson:\n\n“Before handing off an API change, check timeouts, retry safety and the final error shown to the user. Link each check to its result.”\n\nA separate evaluator checked the lesson against the source reports, checked its usefulness and reviewed it for secrets and harmful instructions. It passed that review.\n\nI staged the lesson with its source event IDs and expiry. It is ready for external approval and is not active yet."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Our reviewer has checked the source reports and supplied the signed approval file. Activate that lesson."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-hindsight",
      "content": "The runtime verified the receipt against the trusted external reviewer key. It matched this project, this exact lesson and its evidence, and it has not expired.\n\nThe lesson is active. A fresh query returns it with its supporting evidence.",
      "artifacts": [
        "reviewed-lesson"
      ]
    },
    {
      "type": "beat",
      "label": "Ask whether a rule would improve the work",
      "skills": [
        "oc-evolve"
      ],
      "phase": "plan"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "/oc-evolve reflect\n\nTest a rule that makes this part of every API handoff."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "I’ll establish the baseline before proposing a rule. The test uses 12 API error cases and 8 separate cases that check whether other behavior gets worse.\n\nWe will keep the task inputs, base instructions, tools, model settings and case groups fixed. A candidate must improve the target score by at least 20 percentage points without making the other group or full suite worse.\n\nThese live runs send the selected task inputs and instructions to your team's configured provider."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Run those cases with the configured provider."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "The baseline passed 8 of 12 target cases and all 8 other cases: 16 of 20 overall. I saved the full instructions, task outputs and grading results, then froze that evidence in the evaluation contract.\n\nThe generator's first rule requires retry checks before every API handoff. It has been staged for a separate evaluator to test against the same contract."
    },
    {
      "type": "beat",
      "label": "Reject a change that improves the total but breaks something",
      "skills": [
        "oc-evolve"
      ],
      "phase": "audit"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "The candidate improved the target cases, but one of the other cases now fails.\n\n| Run | Target cases | Other cases | Total | Decision |\n|---|---:|---:|---:|---|\n| Baseline | 8/12 | 8/8 | 16/20 | Comparison point |\n| First rule | 11/12 | 7/8 | 18/20 | Do not adopt |\n\nThe new rule caused a retry on an operation that was not safe to repeat. A better total does not excuse that regression. The candidate remains unadopted.",
      "artifacts": [
        "rule-evaluation"
      ]
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Make retry safety explicit and test a revised rule."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "The revised rule is:\n\n“Before handing off an API change, show a timeout test, confirm whether retrying the operation is safe, and test the final error shown to the user. Never add retries unless the operation is safe to repeat.”\n\nThis is a new candidate with its own digest. The evaluator used the original frozen baseline and the same tasks.\n\n| Run | Target cases | Other cases | Total | Decision |\n|---|---:|---:|---:|---|\n| Baseline | 8/12 | 8/8 | 16/20 | Comparison point |\n| Revised rule | 11/12 | 8/8 | 19/20 | Ready for review |\n\nThe target score improved by 25 percentage points. The other group and full suite did not regress. The case report also shows that no previously passing case failed in this example.\n\nThe full run file contains the evidence, transcript and results. Passing these checks makes it eligible for review; it does not adopt it."
    },
    {
      "type": "beat",
      "label": "Approve the exact tested rule",
      "skills": [
        "oc-evolve"
      ],
      "phase": "audit"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Our reviewer has inspected the actual provider runs, the revised rule and its sources. Here is the signed adoption receipt. Adopt it."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "The runtime verified the external approval against this project, the revised candidate and its evaluation evidence. The rule is now adopted.\n\nA new query returns the rule while its approval and evidence remain valid. It needs revalidation with fresh task evidence and approval within 30 days of its evaluation, and its own expiry still applies.\n\nI did not change the skill file or `CLAUDE.md`. The rule is available as advisory context through an explicit runtime command."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Use the lesson and rule when we plan the next API change."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "I requested context for `oc-app-architect`. It returned the approved lesson and adopted rule with their evidence.\n\nI’ll include the three API checks in the next plan, subject to your instructions and the project's policies."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "How do I turn this off if it stops helping?"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-evolve",
      "content": "Ask me to disable local learning. Future queries will stop returning learned material. The stored history remains available if you choose to use it again.\n\nStart a new session too if you want to remove learned content that is already in this conversation.",
      "artifacts": [
        "reviewed-lesson",
        "rule-evaluation"
      ]
    }
  ]
};
