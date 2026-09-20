// FILE: lib/partner/integrationStudio/policyFit/match.ts
// Match structured Studio choices to existing packs. No custom policy invention.

import { policyPackIsSandboxOnly, resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { studioPackContract } from "@/lib/partner/integrationStudio/catalog";
import { STARTER_KIT_PLATFORM_MATRIX } from "@/lib/partner/starterKit/contract";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  POLICY_FIT_ACTION_CATEGORIES,
  POLICY_FIT_ACTION_LABELS,
  POLICY_FIT_ALLOWED_KEYS,
  POLICY_FIT_CAPABILITY_LABELS,
  POLICY_FIT_CAPABILITY_TO_PATH,
  POLICY_FIT_CATEGORY_LABELS,
  POLICY_FIT_CATEGORY_TO_PACK,
  POLICY_FIT_DESIGN_PARTNER_HREF,
  POLICY_FIT_ENVIRONMENT_LABELS,
  POLICY_FIT_FORBIDDEN_KEYS,
  POLICY_FIT_GOOGLE,
  POLICY_FIT_NO_FIT,
  POLICY_FIT_REVIEW_NOTICE,
  POLICY_FIT_VERSION,
  isPolicyFitAction,
  isPolicyFitCapability,
  isPolicyFitCategory,
  isPolicyFitEnvironment,
  type PolicyFitAction,
  type PolicyFitCapability,
  type PolicyFitCategory,
  type PolicyFitEnvironment,
} from "./contract";

export interface PolicyFitIntent {
  action: PolicyFitAction;
  category: PolicyFitCategory;
  environment: PolicyFitEnvironment;
  capabilities: PolicyFitCapability[];
}

export interface PolicyFitMatch {
  pack_id: string;
  pack_display_name: string;
  catalog_version: number;
  policy_result: string;
  method_category: string;
  withheld: string[];
  production_path: string;
  sandbox_only: boolean;
  why: string;
  google_is_account_only: string;
  identity_appears_only_when_required: string;
  paths: IntegrationStudioPathId[];
  selected_path: IntegrationStudioPathId;
  starter_kit_platforms: string[];
  score: number;
}

export interface PolicyFitView {
  version: typeof POLICY_FIT_VERSION;
  ok: true;
  fit: boolean;
  intent: PolicyFitIntent;
  recommended: PolicyFitMatch | null;
  alternatives: PolicyFitMatch[];
  no_fit_message: string | null;
  design_partner_href: string;
  copyable_summary: string;
  review_notice: string;
  studio_selection: {
    pack_id: string | null;
    path: IntegrationStudioPathId;
    capabilities: PolicyFitCapability[];
  };
}

export type PolicyFitParseResult =
  | { ok: true; intent: PolicyFitIntent }
  | { ok: false; error: string; status: number };

export function parsePolicyFitInput(body: unknown): PolicyFitParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "unknown_input", status: 400 };
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !(POLICY_FIT_ALLOWED_KEYS as readonly string[]).includes(key))) {
    return { ok: false, error: "unknown_input", status: 400 };
  }
  if (keys.some((key) => (POLICY_FIT_FORBIDDEN_KEYS as readonly string[]).includes(key))) {
    return { ok: false, error: "unknown_input", status: 400 };
  }
  if (typeof record.action !== "string" || !isPolicyFitAction(record.action)) {
    return { ok: false, error: "unknown_action", status: 400 };
  }
  if (typeof record.category !== "string" || !isPolicyFitCategory(record.category)) {
    return { ok: false, error: "unknown_category", status: 400 };
  }
  if (typeof record.environment !== "string" || !isPolicyFitEnvironment(record.environment)) {
    return { ok: false, error: "unknown_environment", status: 400 };
  }
  const rawCaps = record.capabilities ?? ["reusable_result"];
  if (!Array.isArray(rawCaps) || rawCaps.some((item) => typeof item !== "string" || !isPolicyFitCapability(item))) {
    return { ok: false, error: "unknown_capability", status: 400 };
  }
  const capabilities = Array.from(new Set(rawCaps as PolicyFitCapability[]));
  if (!capabilities.includes("reusable_result")) capabilities.unshift("reusable_result");
  return {
    ok: true,
    intent: {
      action: record.action,
      category: record.category,
      environment: record.environment,
      capabilities,
    },
  };
}

function methodCategory(packId: string): string {
  const contract = studioPackContract(packId);
  const primary = contract?.methods.find((method) => method.primary && method.qualifies)
    ?? contract?.methods.find((method) => method.qualifies && method.id !== "account_login");
  return primary?.label ?? "Existing reusable proof";
}

function identityCopy(packId: string): string {
  if (packId === "identity_liveness") {
    return "Identity or liveness appears only because this pack requires it. Google remains account access, not eligibility.";
  }
  return "Google is account access only. Identity or liveness is not the default path for this pack.";
}

function pathsFor(capabilities: PolicyFitCapability[]): IntegrationStudioPathId[] {
  const paths = capabilities.map((cap) => POLICY_FIT_CAPABILITY_TO_PATH[cap]);
  return Array.from(new Set(paths));
}

function platformsFor(paths: IntegrationStudioPathId[]): string[] {
  return STARTER_KIT_PLATFORM_MATRIX
    .filter((platform) => paths.every((path) => (platform.works as readonly string[]).includes(path)))
    .map((platform) => platform.id);
}

function buildMatch(intent: PolicyFitIntent, category: PolicyFitCategory, score: number): PolicyFitMatch | null {
  const packId = POLICY_FIT_CATEGORY_TO_PACK[category];
  const pack = resolvePolicyPack(packId);
  const contract = studioPackContract(packId);
  if (!pack || !contract) return null;
  const sandboxOnly = policyPackIsSandboxOnly(pack);
  if (intent.environment === "future_production" && sandboxOnly) return null;
  const paths = pathsFor(intent.capabilities);
  const selectedPath = intent.capabilities.find((cap) => cap !== "reusable_result")
    ? POLICY_FIT_CAPABILITY_TO_PATH[intent.capabilities.find((cap) => cap !== "reusable_result")!]
    : "hosted_partner_flow";
  return {
    pack_id: pack.id,
    pack_display_name: pack.display_name,
    catalog_version: pack.catalog_version,
    policy_result: pack.partner_receives,
    method_category: methodCategory(pack.id),
    withheld: [...contract.withheld],
    production_path: sandboxOnly
      ? "Sandbox only. Production requires a reviewed pack."
      : "Can follow the reviewed Production upgrade path after sandbox readiness.",
    sandbox_only: sandboxOnly,
    why: `${POLICY_FIT_ACTION_LABELS[intent.action]} with ${POLICY_FIT_CATEGORY_LABELS[category]} maps to ${pack.display_name}, the smallest existing pack that returns ${pack.disclosed_result}.`,
    google_is_account_only: POLICY_FIT_GOOGLE,
    identity_appears_only_when_required: identityCopy(pack.id),
    paths,
    selected_path: selectedPath,
    starter_kit_platforms: platformsFor(paths),
    score,
  };
}

export function designPartnerHandoffHref(intent: PolicyFitIntent): string {
  const params = new URLSearchParams({
    source: "integration-studio-policy-fit",
    action: intent.action,
    category: intent.category,
    environment: intent.environment,
    capabilities: intent.capabilities.join(","),
  });
  return `${POLICY_FIT_DESIGN_PARTNER_HREF}?${params.toString()}`;
}

export function copyablePolicyFitSummary(intent: PolicyFitIntent, packId: string | null): string {
  return [
    "Policy fit summary (not an application and not an approval).",
    `Action: ${POLICY_FIT_ACTION_LABELS[intent.action]}`,
    `Eligibility: ${POLICY_FIT_CATEGORY_LABELS[intent.category]}`,
    `Environment: ${POLICY_FIT_ENVIRONMENT_LABELS[intent.environment]}`,
    `Capabilities: ${intent.capabilities.map((cap) => POLICY_FIT_CAPABILITY_LABELS[cap]).join(", ")}`,
    packId ? `Existing pack: ${packId}` : "No existing pack",
  ].join("\n");
}

export function matchPolicyFit(intent: PolicyFitIntent): PolicyFitView {
  const compatible = POLICY_FIT_ACTION_CATEGORIES[intent.action];
  const recommended = compatible.includes(intent.category)
    ? buildMatch(intent, intent.category, 100)
    : null;
  const alternatives = compatible
    .filter((category) => category !== intent.category)
    .map((category) => buildMatch(intent, category, 40))
    .filter((item): item is PolicyFitMatch => item !== null);

  const fit = recommended !== null;
  return {
    version: POLICY_FIT_VERSION,
    ok: true,
    fit,
    intent,
    recommended,
    alternatives: fit ? alternatives : [],
    no_fit_message: fit ? null : POLICY_FIT_NO_FIT,
    design_partner_href: designPartnerHandoffHref(intent),
    copyable_summary: copyablePolicyFitSummary(intent, recommended?.pack_id ?? null),
    review_notice: POLICY_FIT_REVIEW_NOTICE,
    studio_selection: {
      pack_id: recommended?.pack_id ?? null,
      path: recommended?.selected_path ?? "hosted_partner_flow",
      capabilities: intent.capabilities,
    },
  };
}

export function studioCapsFromFit(caps: PolicyFitCapability[]): string[] {
  const map: Record<PolicyFitCapability, string | null> = {
    reusable_result: null,
    webhook: "webhooks",
    trading_preflight: "trading_venue",
    payment_preflight: "payment_authorization",
    wallet_standard_binding: "wallet_standard_binding",
    solana_gate: "solana_gate",
  };
  return caps.map((cap) => map[cap]).filter((item): item is string => Boolean(item));
}

export function policyFitViewLeaks(view: PolicyFitView): string[] {
  return studioPayloadLeaks(view);
}
