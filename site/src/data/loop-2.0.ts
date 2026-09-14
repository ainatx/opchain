export interface LoopCell { k: string; html: string; }
export interface LoopEntry { cells: LoopCell[]; note: string; }

// Describes the current preview implementation, not the superseded design.
export const LOOP_2_0: Record<string, LoopEntry> = {
  "oc-app-architect": {
    "cells": [
      {
        "k": "reads",
        "html": "Use the explicit context command to read approved lessons before a build."
      },
      {
        "k": "reviews",
        "html": "Grade from the agreed contract and code. A separate model context needs host support."
      },
      {
        "k": "records",
        "html": "Import scored outcomes with stable run IDs and references to the evaluation report."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-code-auditor": {
    "cells": [
      {
        "k": "checks",
        "html": "Audit the code that will be deployed, then record a verdict bound to that code."
      },
      {
        "k": "shares",
        "html": "Use the typed checkpoint handoff for release checks. A saved PASS alone is insufficient."
      },
      {
        "k": "learns",
        "html": "Scored audit outcomes can be imported into shared history for review."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-bug-check": {
    "cells": [
      {
        "k": "runs",
        "html": "Verify the actual staged candidate in an isolated checkout."
      },
      {
        "k": "requires",
        "html": "Explicit repository enrollment installs the Git commit check."
      },
      {
        "k": "records",
        "html": "The verification receipt identifies the code, policy and checks that ran."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-orchestrator": {
    "cells": [
      {
        "k": "reads",
        "html": "Read current checkpoints and approved advisory context."
      },
      {
        "k": "routes",
        "html": "Keep existing routing and handoff rules. A learned rule does not choose the next skill."
      },
      {
        "k": "separates",
        "html": "Learning, tracking and commit enrollment each require their own setup."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-telemetry-ops": {
    "cells": [
      {
        "k": "asks",
        "html": "Tracking starts off. Permission is stored on the local machine."
      },
      {
        "k": "keeps",
        "html": "Copying a checkpoint cannot enable tracking in another project."
      },
      {
        "k": "packages",
        "html": "The tracking command includes its aggregation helper and durable checkpoint store."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-prompt-ops": {
    "cells": [
      {
        "k": "reuses",
        "html": "The shared evaluation command uses the existing dataset runner and grader."
      },
      {
        "k": "captures",
        "html": "Record instructions, task outputs, model settings and case results while each run executes."
      },
      {
        "k": "checks",
        "html": "Evolve compares the target, heldout and full results. Previously passing cases must keep passing."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-cost-ops": {
    "cells": [
      {
        "k": "measures",
        "html": "Use the recorded provider usage and explicit prices to calculate cost."
      },
      {
        "k": "checks",
        "html": "A missing price or usage record remains unavailable, never a guessed amount."
      },
      {
        "k": "separates",
        "html": "Cost checks remain in the existing cost runtime; learning does not invent a second calculator."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-update": {
    "cells": [
      {
        "k": "installs",
        "html": "Install the complete shared runtime from the selected release artifact."
      },
      {
        "k": "preserves",
        "html": "Keep local state and refuse to overwrite edits made after an interrupted update."
      },
      {
        "k": "checks",
        "html": "Validate file digests and required runtime files before installation."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-hindsight": {
    "cells": [
      {
        "k": "reads",
        "html": "Review repeated weak outcomes in shared history."
      },
      {
        "k": "stages",
        "html": "Prepare a source-backed lesson for review. Staging does not activate it."
      },
      {
        "k": "checks",
        "html": "Only return active, unexpired lessons with a valid externally trusted signature."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  },
  "oc-evolve": {
    "cells": [
      {
        "k": "freezes",
        "html": "Record a baseline before proposing a rule."
      },
      {
        "k": "tests",
        "html": "Run the same tasks with the candidate instructions and retain the actual outputs."
      },
      {
        "k": "requires",
        "html": "Better target results, no regressions and an externally trusted reviewer signature are required for adoption."
      }
    ],
    "note": "2.0 staging preview. Real provider acceptance, independent reviewer setup and host checks remain release work."
  }
};
