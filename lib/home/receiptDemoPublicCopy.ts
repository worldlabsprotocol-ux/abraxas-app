// Public copy for homepage receipt example (fixture scenarios — not live verify API).

import type { ReceiptScenario } from "@/lib/home/receiptVerificationDemoModel";

export const RECEIPT_DEMO_CLASSIFICATION = "Example verification result";

export const RECEIPT_DEMO_SHELL_CAPTION =
  "Sample receipt scenarios. Outcomes are preset examples, not live partner verification.";

export const RECEIPT_DEMO_SAMPLE_NOTE =
  "Sample receipt and preset check outcomes. This UI does not call the production verify API.";

export const RECEIPT_DEMO_TECHNICAL_DETAILS =
  "Each scenario selects a fixture. Check rows illustrate how authenticity and authorization are separated in a real verifier. Cryptographic verification against live evidence happens through the verify API and partner integrations—not in this homepage widget.";

export function receiptExampleStatusLabel(scenario: ReceiptScenario): string {
  switch (scenario) {
    case "valid":
      return "Valid example";
    case "expired":
      return "Expired example";
    case "revoked":
      return "Revoked example";
    case "unavailable":
      return "Unavailable example";
  }
}

export const RECEIPT_DEMO_SCENARIO_HINTS: Record<ReceiptScenario, string> = {
  valid: "Authorized now",
  expired: "Past expiration",
  revoked: "Issuer revoked",
  unavailable: "Verifier unreachable",
};
