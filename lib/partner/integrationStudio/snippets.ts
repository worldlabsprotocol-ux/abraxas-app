// FILE: lib/partner/integrationStudio/snippets.ts
// Safe snippets from the Integration Kit, event delivery, and Solana adapter.

import {
  genericTypescriptExample,
  nextjsRouteHandlerExample,
} from "@/lib/partner/integrationKit/examples";
import { nextjsWebhookHandlerExample } from "@/lib/partner/eventDelivery/examples";
import { solanaServerVerifyExample } from "@/lib/partner/solana/examples";
import { tradingVenueProfileExample } from "@/lib/partner/tradingVenue/profiles";
import { walletStandardBindingExample } from "@/lib/partner/walletStandard/examples";
import { paymentAuthorizationServerExample } from "@/lib/partner/paymentAuthorization/examples";
import { portableActionServerExample } from "@/lib/partner/portableActionContract/examples";
import { evmPartnerServerExample } from "@/lib/partner/evm/examples";
import { evmWalletBindingExample } from "@/lib/partner/evmWalletBinding/examples";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

const DEMO_OPTS = {
  partnerId: "your-partner-id",
  policyId: "your-policy-v1",
  policyVersion: 1,
  environment: "sandbox" as const,
};

export function studioSnippetForApplication(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  publicSlug: string;
  returnUrl: string;
}) {
  const opts = {
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    environment: "sandbox" as const,
  };
  return {
    hosted_partner_flow: {
      title: "Hosted Partner Flow",
      docs: "/docs/partner-flow",
      code: genericTypescriptExample(opts),
      hosted_link_hint: `/partner/verify?app=${encodeURIComponent(input.publicSlug)}`,
    },
    server_receipt_verify: {
      title: "Server-side receipt verification",
      docs: "/docs/integration-kit",
      code: nextjsRouteHandlerExample(opts),
    },
    webhook_events: {
      title: "Webhook and event delivery",
      docs: "/docs/partner-event-delivery",
      code: nextjsWebhookHandlerExample(opts),
    },
    solana_gate: {
      title: "Solana eligibility gate",
      docs: "/docs/solana",
      code: solanaServerVerifyExample(),
    },
    trading_venue: {
      title: "Trading venue access",
      docs: "/docs/trading-venue-profiles",
      code: tradingVenueProfileExample("generic_trading_venue"),
    },
    wallet_standard_binding: {
      title: "Wallet Standard binding",
      docs: "/docs/wallet-standard-binding",
      code: walletStandardBindingExample(),
    },
    payment_authorization: {
      title: "Payment and commerce",
      docs: "/docs/payment-authorization",
      code: paymentAuthorizationServerExample(),
    },
    portable_action_contract: {
      title: "Portable action contract",
      docs: "/docs/portable-action-contract",
      code: portableActionServerExample(),
    },
    evm_partner_adapter: {
      title: "EVM partner eligibility",
      docs: "/docs/evm-partner-adapter",
      code: `${evmPartnerServerExample()}\n\n${evmWalletBindingExample()}`,
    },
  };
}

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
    case "trading_venue":
      return {
        title: "Trading venue access",
        docs: "/docs/trading-venue-profiles",
        code: tradingVenueProfileExample("generic_trading_venue"),
      };
    case "wallet_standard_binding":
      return {
        title: "Wallet Standard binding",
        docs: "/docs/wallet-standard-binding",
        code: walletStandardBindingExample(),
      };
    case "payment_authorization":
      return {
        title: "Payment and commerce",
        docs: "/docs/payment-authorization",
        code: paymentAuthorizationServerExample(),
      };
    case "portable_action_contract":
      return {
        title: "Portable action contract",
        docs: "/docs/portable-action-contract",
        code: portableActionServerExample(),
      };
    case "evm_partner_adapter":
      return {
        title: "EVM partner eligibility",
        docs: "/docs/evm-partner-adapter",
        code: `${evmPartnerServerExample()}\n\n${evmWalletBindingExample()}`,
      };
    default: {
      const _never: never = path;
      return _never;
    }
  }
}
