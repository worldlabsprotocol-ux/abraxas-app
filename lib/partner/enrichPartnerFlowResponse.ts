// FILE: lib/partner/enrichPartnerFlowResponse.ts
// Adds authoritative journey presentation fields to partner-flow API responses.

import type { PartnerFlowEvaluateResult } from "@/lib/partner/relyingPartyFlow";
import {
  mapFlowNextStepToJourneyState,
  resolvePartnerJourneyPresentation,
} from "@/lib/partner/partnerJourneyStateMachine";

export function enrichPartnerFlowResponse<T extends PartnerFlowEvaluateResult>(
  result: T,
): T & {
  journey_state: string;
  customer_message: string;
  primary_action: string;
} {
  const journeyState = mapFlowNextStepToJourneyState(result.next);
  const presentation = resolvePartnerJourneyPresentation(journeyState);
  return {
    ...result,
    journey_state: journeyState,
    customer_message: presentation.customer_message,
    primary_action: presentation.primary_action,
  };
}
