// FILE: lib/partner/launchpad/goLiveReadiness/evaluate.ts
// Server-derived go-live readiness. Client flags are never authority.

import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { isVerifiedDomainForCallbacks } from "@/lib/partner/launchpad/domainVerification";
import { policyPackIsSandboxOnly, resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";
import { buildSandboxTestConsoleView } from "@/lib/partner/launchpad/sandboxTestConsole/view";
import { sanitizeSandboxTestCapabilities } from "@/lib/partner/launchpad/sandboxTestConsole/contract";
import type { ProductionAccessRequestStatus } from "@/lib/partner/launchpad/types";
import {
  GO_LIVE_ITEM_HREF,
  GO_LIVE_LIFECYCLE_LABEL,
  GO_LIVE_NOTE_MAX_CHARS,
  GO_LIVE_PRODUCTION,
  type GoLiveCapability,
  type GoLiveItemId,
  type GoLiveLifecycle,
} from "./contract";

export interface GoLiveEvidence {
  applicationId: string;
  partnerId: string;
  status: string;
  environment: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  allowedReturnUrls: string[];
  activeSandboxKey: boolean;
  webhookConfigured: boolean;
  webhookEnabled: boolean;
  latestDeliveryStatus: string | null;
  verifiedHostnames: string[];
  starterKitEvidenced: boolean;
  starterKitRuntime: string | null;
  request: {
    id: string;
    status: ProductionAccessRequestStatus;
    created_at: string;
    reviewed_at: string | null;
  } | null;
}

export interface GoLiveCheck {
  id: GoLiveItemId;
  label: string;
  status: "pass" | "action_required" | "not_selected" | "not_evidenced";
  required: boolean;
  next_step: string;
  href: string;
}

export interface GoLiveReadinessView {
  ok: true;
  application_id: string;
  policy_id: string;
  policy_version: number;
  selected_capabilities: GoLiveCapability[];
  lifecycle: GoLiveLifecycle;
  lifecycle_label: string;
  can_request_review: boolean;
  issues_production_key: false;
  activates_production: false;
  changes_policy: false;
  production: typeof GO_LIVE_PRODUCTION;
  checks: GoLiveCheck[];
  next_steps: Array<{ id: GoLiveItemId; detail: string; href: string }>;
  request: {
    id: string;
    status: ProductionAccessRequestStatus;
    created_at: string;
    reviewed_at: string | null;
  } | null;
  sandbox_key_configured: boolean;
}

export function callbackHostClass(urls: string[]): "https_allowlisted" | "localhost_sandbox" | "missing" | "invalid" {
  if (!urls.length) return "missing";
  const valid = urls.filter((url) => isLaunchpadReturnUrlAllowlisted(urls, url));
  if (!valid.length) return "invalid";
  const https = hasProductionLaunchpadCallback(urls);
  return https ? "https_allowlisted" : "localhost_sandbox";
}

export function deriveSelectedCapabilities(evidence: Pick<GoLiveEvidence, "webhookConfigured">): GoLiveCapability[] {
  const selected: GoLiveCapability[] = ["hosted_partner_flow", "receipt_verify"];
  if (evidence.webhookConfigured) selected.push("webhooks");
  return selected;
}

export function sanitizeDisplayedCapabilities(input?: readonly string[]): string[] {
  return sanitizeSandboxTestCapabilities(input);
}

export function validateGoLiveNote(raw: unknown): { ok: true; note: string | null } | { ok: false; code: "go_live_note_invalid" } {
  if (raw == null || raw === "") return { ok: true, note: null };
  if (typeof raw !== "string") return { ok: false, code: "go_live_note_invalid" };
  const note = raw.trim();
  if (!note) return { ok: true, note: null };
  if (note.length > GO_LIVE_NOTE_MAX_CHARS) return { ok: false, code: "go_live_note_invalid" };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(note)) return { ok: false, code: "go_live_note_invalid" };
  if (/abx_(test|live|whsec)_/i.test(note)) return { ok: false, code: "go_live_note_invalid" };
  if (/receipt[_-]?id|wallet|0x[a-f0-9]{20,}|https?:\/\//i.test(note)) return { ok: false, code: "go_live_note_invalid" };
  return { ok: true, note };
}

export function clientOverrideRejected(body: Record<string, unknown>): boolean {
  return [
    "partner_id",
    "readiness_status",
    "lifecycle",
    "status",
    "approval",
    "approved",
    "activate_production",
    "environment",
    "production_api_key",
    "production_key",
    "api_key",
    "key_prefix",
    "issues_production_key",
  ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

function starterKitCheck(evidence: GoLiveEvidence): GoLiveCheck {
  if (evidence.starterKitEvidenced) {
    return {
      id: "starter_kit",
      label: "Starter Kit selected",
      status: "pass",
      required: false,
      next_step: evidence.starterKitRuntime
        ? `Kit runtime ${evidence.starterKitRuntime} is recorded. Raw files are not stored here.`
        : "Starter Kit generation is recorded. Raw files are not stored here.",
      href: GO_LIVE_ITEM_HREF.starter_kit,
    };
  }
  return {
    id: "starter_kit",
    label: "Starter Kit selected",
    status: "not_evidenced",
    required: false,
    next_step: "Generate a kit in Integration Studio when you need copyable placeholders. This item is not marked complete without server evidence.",
    href: GO_LIVE_ITEM_HREF.starter_kit,
  };
}

function optionalCapabilityCheck(
  id: Extract<GoLiveItemId, "webhooks" | "trading_venue" | "payment_authorization" | "wallet_standard_binding" | "solana_gate">,
  label: string,
  selected: boolean,
  pass: boolean,
  nextWhenSelected: string,
): GoLiveCheck {
  if (!selected) {
    return {
      id,
      label,
      status: "not_selected",
      required: false,
      next_step: "Shown only when this capability is selected from server evidence or the test console.",
      href: GO_LIVE_ITEM_HREF[id],
    };
  }
  return {
    id,
    label,
    status: pass ? "pass" : "action_required",
    required: id === "webhooks",
    next_step: pass ? nextWhenSelected : `Finish ${label.toLowerCase()} in Launchpad, then refresh readiness.`,
    href: GO_LIVE_ITEM_HREF[id],
  };
}

export function buildGoLiveReadinessView(
  evidence: GoLiveEvidence,
  displayedCapabilities: readonly string[] = [],
): GoLiveReadinessView {
  const displayCaps = new Set(sanitizeDisplayedCapabilities(displayedCapabilities));
  const selected = deriveSelectedCapabilities(evidence);
  const consoleView = buildSandboxTestConsoleView({
    application_id: evidence.applicationId,
    status: evidence.status,
    environment: evidence.environment,
    policy_version: evidence.policyVersion,
    policy_template_id: evidence.policyTemplateId,
    allowed_return_urls: evidence.allowedReturnUrls,
    has_sandbox_key: evidence.activeSandboxKey,
    webhook_configured: evidence.webhookConfigured,
  }, selected.filter((item) => item === "webhooks"));

  const coreConsole = consoleView.checks.filter((check) =>
    ["sandbox_app", "policy_pin", "callback", "sandbox_key"].includes(check.id),
  );
  const consolePass = coreConsole.every((check) => check.status === "pass");
  const callbackClass = callbackHostClass(evidence.allowedReturnUrls);
  const callbackPass = callbackClass === "https_allowlisted" || callbackClass === "localhost_sandbox";
  const productionCallback = hasProductionLaunchpadCallback(evidence.allowedReturnUrls);
  const domainVerified = isVerifiedDomainForCallbacks({
    allowedReturnUrls: evidence.allowedReturnUrls,
    verifiedHostnames: evidence.verifiedHostnames,
  });
  const pack = resolvePolicyPack(evidence.policyTemplateId);
  const custom = evidence.policyTemplateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID;
  const sandboxOnlyPack = custom || (pack ? policyPackIsSandboxOnly(pack) : true);
  const approved = evidence.request?.status === "approved" || evidence.environment === "production";
  const pending = evidence.request?.status === "pending";

  const checks: GoLiveCheck[] = [
    {
      id: "sandbox_app",
      label: "Active sandbox app",
      status: evidence.status === "active" && evidence.environment === "sandbox" ? "pass" : "action_required",
      required: true,
      next_step: evidence.status === "active"
        ? "This sandbox app is active."
        : "Create or resume an active sandbox app in Launchpad.",
      href: GO_LIVE_ITEM_HREF.sandbox_app,
    },
    {
      id: "policy_pin",
      label: "Pinned policy and version",
      status: evidence.policyId && evidence.policyVersion > 0 ? "pass" : "action_required",
      required: true,
      next_step: evidence.policyId
        ? `Policy ${evidence.policyId} v${evidence.policyVersion} is pinned by the server.`
        : "Select a policy pack in Integration Studio or Launchpad.",
      href: GO_LIVE_ITEM_HREF.policy_pin,
    },
    {
      id: "callback",
      label: "Allowlisted callback",
      status: callbackPass ? "pass" : "action_required",
      required: true,
      next_step: callbackPass
        ? (callbackClass === "localhost_sandbox"
          ? "Localhost is allowlisted for sandbox. Add and verify an HTTPS callback before review."
          : "An allowlisted callback is configured. The full URL is not shown here.")
        : "Add a localhost or HTTPS allowlisted callback in Destinations.",
      href: GO_LIVE_ITEM_HREF.callback,
    },
    {
      id: "sandbox_key",
      label: "Sandbox key configured",
      status: evidence.activeSandboxKey ? "pass" : "action_required",
      required: true,
      next_step: evidence.activeSandboxKey
        ? "A sandbox key is configured. The secret is not shown."
        : "Create or rotate a sandbox key in Launchpad. The raw key is shown once.",
      href: GO_LIVE_ITEM_HREF.sandbox_key,
    },
    starterKitCheck(evidence),
    {
      id: "test_console",
      label: "Sandbox test-console checklist",
      status: consolePass ? "pass" : "action_required",
      required: true,
      next_step: consolePass
        ? "Core test-console checks passed from server evidence."
        : "Open the sandbox test console and finish the required items.",
      href: GO_LIVE_ITEM_HREF.test_console,
    },
    optionalCapabilityCheck(
      "webhooks",
      "Webhook configuration",
      selected.includes("webhooks") || displayCaps.has("webhooks"),
      evidence.webhookConfigured,
      evidence.latestDeliveryStatus
        ? `Webhook is configured. Latest delivery class: ${evidence.latestDeliveryStatus}.`
        : "Webhook endpoint is configured. Live delivery is not sent from this card.",
    ),
    optionalCapabilityCheck(
      "trading_venue",
      "Trading preflight",
      displayCaps.has("trading_venue"),
      false,
      "Use local fixtures only. Abraxas does not execute trades.",
    ),
    optionalCapabilityCheck(
      "payment_authorization",
      "Payment preflight",
      displayCaps.has("payment_authorization"),
      false,
      "Use local fixtures only. Abraxas does not move money.",
    ),
    optionalCapabilityCheck(
      "wallet_standard_binding",
      "Wallet Standard binding",
      displayCaps.has("wallet_standard_binding"),
      false,
      "Binding is optional and message-only.",
    ),
    optionalCapabilityCheck(
      "solana_gate",
      "Solana eligibility gate",
      displayCaps.has("solana_gate"),
      false,
      "Use the Solana starter path. No funds movement.",
    ),
  ];

  const requiredPass = checks.filter((check) => check.required).every((check) => check.status === "pass");
  const reviewGates = requiredPass && productionCallback && domainVerified && !sandboxOnlyPack && !approved && !pending;

  let lifecycle: GoLiveLifecycle = "needs_setup";
  if (approved) lifecycle = "approved_for_production";
  else if (pending) lifecycle = "under_review";
  else if (reviewGates) lifecycle = "ready_to_request_review";

  const next_steps = checks
    .filter((check) => check.status === "action_required")
    .map((check) => ({ id: check.id, detail: check.next_step, href: check.href }));
  if (!productionCallback && lifecycle === "needs_setup") {
    next_steps.push({
      id: "callback",
      detail: "Add an HTTPS allowlisted callback. Localhost stays sandbox-only.",
      href: GO_LIVE_ITEM_HREF.callback,
    });
  } else if (productionCallback && !domainVerified && lifecycle === "needs_setup") {
    next_steps.push({
      id: "callback",
      detail: "Verify the callback domain before requesting review.",
      href: GO_LIVE_ITEM_HREF.callback,
    });
  }
  if (sandboxOnlyPack && lifecycle === "needs_setup") {
    next_steps.push({
      id: "policy_pin",
      detail: "This pack is sandbox-only. Choose a production-eligible pack.",
      href: GO_LIVE_ITEM_HREF.policy_pin,
    });
  }

  return {
    ok: true,
    application_id: evidence.applicationId,
    policy_id: evidence.policyId,
    policy_version: evidence.policyVersion,
    selected_capabilities: selected,
    lifecycle,
    lifecycle_label: GO_LIVE_LIFECYCLE_LABEL[lifecycle],
    can_request_review: lifecycle === "ready_to_request_review",
    issues_production_key: false,
    activates_production: false,
    changes_policy: false,
    production: GO_LIVE_PRODUCTION,
    checks,
    next_steps,
    request: evidence.request,
    sandbox_key_configured: evidence.activeSandboxKey,
  };
}

export function goLiveViewLeaks(view: GoLiveReadinessView): string[] {
  const blob = JSON.stringify(view);
  const leaks: string[] = [];
  if (/abx_(test|live|whsec)_/i.test(blob)) leaks.push("api_key");
  if (/https?:\/\/(?!developers\.|docs\.|localhost)/i.test(blob) && /callback/.test(blob) && /https:\/\/[a-z0-9.-]+\//i.test(blob)) {
    if (view.checks.some((check) => /https:\/\//.test(check.next_step))) leaks.push("callback_url");
  }
  return leaks;
}
