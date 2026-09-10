import { arcwellForecastIntegrity } from "./arcwell-forecast-integrity";
import { bloomwireRoutingAgent } from "./bloomwire-routing-agent";
import { cascadiaAiEvaluation } from "./cascadia-ai-evaluation";
import { halyardIntakeGovernance } from "./halyard-intake-governance";
import { halyardSelfImprovement } from "./halyard-self-improvement";
import { harvestlineAiCoe } from "./harvestline-ai-coe";
import { ledgerpointAutomationFleet } from "./ledgerpoint-automation-fleet";
import { northgateConsolidation } from "./northgate-consolidation";
import { runtimePmLoop } from "./runtime-pm-loop";
import { vantorOpportunityToOrder } from "./vantor-opportunity-to-order";
import { wardenInheritedEstate } from "./warden-inherited-estate";
import type { Walkthrough } from "./types";

/**
 * Stable display order — left-to-right on the scenario picker.
 *
 * One scenario per recurring mandate in the captured requisition set, rather
 * than one per pipeline feature. Ordered so the first thing a visitor plays is
 * governed delivery of an inherited estate — which is the job these roles
 * actually describe — and the self-improvement loop sits last, because it only
 * makes sense once you have seen the history it reads.
 *
 * Every scenario that uses oc-git-ops also shows oc-bug-check; that edge is a
 * chain in orchestrator.md and a hook in this repo, and
 * tests/roles-coverage.test.js fails the build if a scenario depicts one
 * without the other.
 */
export const walkthroughs: Walkthrough[] = [
  halyardIntakeGovernance, //    intake, prioritization & roadmap governance
  vantorOpportunityToOrder, //   quote-to-cash
  northgateConsolidation, //     tool consolidation, selection & TCO
  wardenInheritedEstate, //      inherited estate & documentation
  arcwellForecastIntegrity, //   forecasting & funnel integrity
  bloomwireRoutingAgent, //      agentic workflow design in GTM
  harvestlineAiCoe, //           AI governance / Center of Excellence
  cascadiaAiEvaluation, //       AI evaluation & quality standards
  ledgerpointAutomationFleet, // automation CoE, regulated fleet ops
  runtimePmLoop, //              incident & change management
  halyardSelfImprovement, //     continuous improvement — the v2.0 loop
];

export type { Walkthrough } from "./types";
