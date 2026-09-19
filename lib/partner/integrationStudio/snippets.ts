// FILE: lib/partner/integrationStudio/snippets.ts
// Safe snippets from the Integration Kit, event delivery, and Solana adapter.

import {
  genericTypescriptExample,
  nextjsRouteHandlerExample,
} from "@/lib/partner/integrationKit/examples";
import { nextjsWebhookHandlerExample } from "@/lib/partner/eventDelivery/examples";
import { solanaServerVerifyExample } from "@/lib/partner/solana/examples";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

const DEMO_OPTS = {
  partnerId: "your-partner-id",
  policyId: "your-policy-v1",
  policyVersion: 1,
  environment: "sandbox" as const,
};

export function studioSnippetForPath(path: IntegrationStudioPathId): { title: string; docs: string; code: string } {
  switch (path) {
    case "hosted_partner_flow":
      return {
        title: "Hosted Partner Flow",
        docs: "/docs/partner-flow",
        code: genericTypescriptExample(DEMO_OPTS),
      };
    case "server_receipt_verify":
      return {
        title: "Server-side receipt verification",
        docs: "/docs/integration-kit",
        code: nextjsRouteHandlerExample(DEMO_OPTS),
      };
    case "webhook_events":
      return {
        title: "Webhook and event delivery",
        docs: "/docs/partner-event-delivery",
        code: nextjsWebhookHandlerExample(DEMO_OPTS),
      };
    case "solana_gate":
      return {
        title: "Solana eligibility gate",
        docs: "/docs/solana",
        code: solanaServerVerifyExample(),
      };
    default: {
      const _never: never = path;
      return _never;
    }
  }
}
