// FILE: lib/partner/launchpad/sandboxTestConsole/contract.ts
// Local, non-live integration test console. Lives inside Partner Launchpad.

import { STARTER_KIT_RUNTIMES } from "@/lib/partner/starterKit/contract";

export const SANDBOX_TEST_CONSOLE_PATH = "/developers/launchpad" as const;
export const SANDBOX_TEST_CONSOLE_ENTRY = "Test your sandbox integration" as const;

export const SANDBOX_TEST_CONSOLE_CAPABILITIES = [
  "webhooks",
  "trading_venue",
  "payment_authorization",
  "wallet_standard_binding",
  "solana_gate",
] as const;
export type SandboxTestConsoleCapability = (typeof SANDBOX_TEST_CONSOLE_CAPABILITIES)[number];

export const SANDBOX_TEST_CONSOLE_PLATFORMS = [...STARTER_KIT_RUNTIMES] as const;

export const SANDBOX_TEST_CONSOLE_PRODUCTION = {
  self_issued: false as const,
  deny_code: "production_denied" as const,
  notice:
    "These fixtures do not prove a live integration and do not grant Production access. Production stays on the reviewed Launchpad upgrade path.",
} as const;

export type SandboxTestCheckStatus = "pass" | "action_required" | "not_selected";

export interface SandboxTestCheck {
  id: string;
  label: string;
  status: SandboxTestCheckStatus;
  next_step: string;
}

export interface SandboxTestChecklistItem {
  id: string;
  title: string;
  href: string;
  kit_file: string | null;
  required: boolean;
  capability: SandboxTestConsoleCapability | null;
}

export function sanitizeSandboxTestCapabilities(input?: readonly string[]): SandboxTestConsoleCapability[] {
  return (input ?? []).filter((item): item is SandboxTestConsoleCapability =>
    (SANDBOX_TEST_CONSOLE_CAPABILITIES as readonly string[]).includes(item),
  );
}

export function launchpadSandboxTestHref(applicationId?: string | null): string {
  if (!applicationId) return `${SANDBOX_TEST_CONSOLE_PATH}?view=test`;
  return `${SANDBOX_TEST_CONSOLE_PATH}?app=${encodeURIComponent(applicationId)}&view=test`;
}

export function buildSandboxTestChecklist(
  capabilities: readonly string[] = [],
): SandboxTestChecklistItem[] {
  const selected = new Set(sanitizeSandboxTestCapabilities(capabilities));
  const items: SandboxTestChecklistItem[] = [
    {
      id: "configure_env",
      title: "Configure local environment placeholders",
      href: "/docs/starter-kit",
      kit_file: ".env.example",
      required: true,
      capability: null,
    },
    {
      id: "run_kit",
      title: "Run the generated kit",
      href: "/docs/starter-kit",
      kit_file: "README.md",
      required: true,
      capability: null,
    },
    {
      id: "hosted_redirect",
      title: "Test hosted redirect handling with a fixture",
      href: "/docs/partner-flow",
      kit_file: "README.md",
      required: true,
      capability: null,
    },
    {
      id: "receipt_verify",
      title: "Test server-side receipt verification",
      href: "/verify?mode=receipt",
      kit_file: "tests/public-receipt.fixture.json",
      required: true,
      capability: null,
    },
    {
      id: "webhook_verify",
      title: "Test webhook signature verification",
      href: "/docs/partner-flow",
      kit_file: "README.md",
      required: false,
      capability: "webhooks",
    },
    {
      id: "trading_preflight",
      title: "Test trading preflight adapter",
      href: "/docs/trading-venue",
      kit_file: null,
      required: false,
      capability: "trading_venue",
    },
    {
      id: "payment_preflight",
      title: "Test payment preflight adapter",
      href: "/docs/payment-authorization",
      kit_file: null,
      required: false,
      capability: "payment_authorization",
    },
    {
      id: "wallet_binding",
      title: "Test optional message-only Wallet Standard binding",
      href: "/docs/wallet-standard-binding",
      kit_file: null,
      required: false,
      capability: "wallet_standard_binding",
    },
    {
      id: "request_production",
      title: "Return to Launchpad and request Production only after the sandbox checklist is complete",
      href: "/developers/launchpad",
      kit_file: null,
      required: true,
      capability: null,
    },
  ];
  return items.filter((item) => item.required || (item.capability && selected.has(item.capability)));
}
