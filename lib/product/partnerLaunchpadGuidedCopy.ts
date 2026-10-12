// Build #518 — five-step partner operator path (labels only; backend stage ids unchanged).

import type { MerchantJourneyStageId } from "@/lib/partner/launchpad/journeyState";

export const LAUNCHPAD_FIVE_STEP: Array<{
  id: MerchantJourneyStageId;
  label: string;
  description: string;
}> = [
  {
    id: "verify",
    label: "Choose policy",
    description: "Choose what holders must verify for your product.",
  },
  {
    id: "test_app",
    label: "Test experience",
    description: "Create a private sandbox app and API key to try flows safely.",
  },
  {
    id: "connect",
    label: "Integrate",
    description: "Connect callbacks or embed the hosted flow in your site.",
  },
  {
    id: "test",
    label: "Review holder view",
    description: "Run a test verification and see exactly what holders experience.",
  },
  {
    id: "go_live",
    label: "Request production",
    description: "Submit for review when sandbox receipts and callbacks look correct.",
  },
];

export const LAUNCHPAD_ADVANCED_DISCLOSURE_LABEL = "Advanced API, webhooks, and diagnostics";
