import { agentTriage } from "./agent-triage";
import { aiSafetyGate } from "./ai-safety-gate";
import { conceptToShipped } from "./concept-to-shipped";
import { dashboardRescue } from "./dashboard-rescue";
import { djangoRenderShipped } from "./django-render-shipped";
import { halyardIntakeGovernance } from "./halyard-intake-governance";
import { halyardSelfImprovement } from "./halyard-self-improvement";
import { legacyRevive } from "./legacy-revive";
import { modelMigration } from "./model-migration";
import { postgresMigration } from "./postgres-migration";
import { ragAnswerBot } from "./rag-answer-bot";
import { runtimePmLoop } from "./runtime-pm-loop";
import { securityHardening } from "./security-hardening";
import { stripeShip } from "./stripe-ship";
import { vantorOpportunityToOrder } from "./vantor-opportunity-to-order";
import type { Walkthrough } from "./types";

/** Stable display order — left-to-right on the scenario picker. */
export const walkthroughs: Walkthrough[] = [
  // v2.0 rebuild — scenarios written to the mandates the target requisitions
  // name, rather than to the pipeline's own feature list. Front-loaded so the
  // first thing a visitor plays is governed delivery, not a greenfield build.
  halyardIntakeGovernance,
  vantorOpportunityToOrder,
  halyardSelfImprovement,
  conceptToShipped,
  // v1.5 AI-native cluster — front-loaded to showcase the "build the AI app" release.
  ragAnswerBot,
  agentTriage,
  modelMigration,
  aiSafetyGate,
  dashboardRescue,
  legacyRevive,
  stripeShip,
  postgresMigration,
  securityHardening,
  runtimePmLoop,
  djangoRenderShipped,
];

export type { Walkthrough } from "./types";
